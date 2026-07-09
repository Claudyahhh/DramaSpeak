export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const provider = (
    process.env.IMAGE_PROVIDER ||
    (process.env.GLM_IMAGE_API_KEY || process.env.GLM_API_KEY ? "glm" : "") ||
    (process.env.IMAGE_API_KEY ? "openai-compatible" : "")
  ).toLowerCase();

  if (!provider || provider === "none") {
    return res.status(200).json({ imageUrl: null, demo: true });
  }

  try {
    const imageUrl =
      provider === "glm"
        ? await callOpenAICompatibleImage(prompt, {
            apiKey: process.env.GLM_IMAGE_API_KEY || process.env.GLM_API_KEY || process.env.IMAGE_API_KEY,
            baseUrl: process.env.GLM_IMAGE_BASE_URL || process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
            model: process.env.GLM_IMAGE_MODEL || process.env.IMAGE_MODEL || "cogview-3-flash",
            size: process.env.IMAGE_SIZE || "1024x1024",
            label: "GLM image",
          })
        : await callOpenAICompatibleImage(prompt, {
            apiKey: process.env.IMAGE_API_KEY,
            baseUrl: process.env.IMAGE_BASE_URL,
            model: process.env.IMAGE_MODEL,
            size: process.env.IMAGE_SIZE || "1024x1024",
            label: "OpenAI-compatible image",
          });

    return res.status(200).json({ imageUrl, provider });
  } catch (error) {
    return res.status(500).json({ error: "Image model API error", detail: error.message });
  }
}

async function callOpenAICompatibleImage(prompt, { apiKey, baseUrl, model, size, label }) {
  if (!apiKey) throw new Error(`Missing API key for ${label}`);
  if (!baseUrl) throw new Error(`Missing base URL for ${label}`);
  if (!model) throw new Error(`Missing model for ${label}`);

  const endpoint = `${baseUrl.replace(/\/$/, "")}/images/generations`;
  const imageRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n: 1,
    }),
  });

  if (!imageRes.ok) {
    const detail = await imageRes.text();
    throw new Error(`${label} request failed: ${detail}`);
  }

  const data = await imageRes.json();
  const first = data.data?.[0] || data.images?.[0] || {};
  const url = first.url || first.image_url || first.imageUrl;
  if (url) return url;

  const b64 = first.b64_json || first.base64 || first.image;
  if (b64) return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;

  throw new Error(`${label} response did not include an image URL or base64 payload`);
}
