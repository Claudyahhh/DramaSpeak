import {
  applyRateLimitHeaders,
  checkRateLimit,
  MAX_IMAGE_PROMPT_CHARS,
  validatePrompt,
} from "../lib/server-security.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");
  const { prompt, config } = req.body || {};
  const promptCheck = validatePrompt(prompt, MAX_IMAGE_PROMPT_CHARS);
  if (!promptCheck.ok) return res.status(400).json({ error: promptCheck.error });

  const rate = await checkRateLimit(req, { scope: "image-model", limit: 12, windowSeconds: 600 });
  applyRateLimitHeaders(res, rate);
  if (!rate.allowed) return res.status(429).json({ error: "Too many image requests" });

  const runtime = config ? resolveClientImageRuntime(config) : resolveServerImageRuntime();
  if (!runtime) {
    return res.status(200).json({ imageUrl: null, demo: true, reason: "image-model-unavailable" });
  }

  try {
    const imageUrl = await callOpenAICompatibleImage(prompt, runtime);

    return res.status(200).json({ imageUrl, provider: runtime.provider, model: runtime.model });
  } catch (error) {
    console.error("Image model request failed", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "Image model API error" });
  }
}

function resolveClientImageRuntime(value) {
  if (!value || typeof value !== "object") return null;
  const provider = String(value.provider || "").toLowerCase();
  const apiKey = String(value.apiKey || "").trim();
  if (!apiKey || apiKey.length > 512) return null;
  if (provider === "glm" && apiKey.startsWith("sk-code")) return null;

  if (provider === "glm") {
    return {
      provider,
      apiKey,
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      model: "cogview-3-flash",
      size: "1344x768",
      label: "GLM image",
    };
  }

  if (provider === "openai-compatible") {
    return {
      provider,
      apiKey,
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-image-2",
      size: "1536x1024",
      label: "OpenAI image",
    };
  }

  return null;
}

function resolveServerImageRuntime() {
  if (process.env.ALLOW_SERVER_MODEL !== "true") return null;
  const provider = (
    process.env.IMAGE_PROVIDER ||
    (process.env.GLM_IMAGE_API_KEY || process.env.GLM_API_KEY ? "glm" : "") ||
    (process.env.IMAGE_API_KEY ? "openai-compatible" : "")
  ).toLowerCase();

  if (!provider || provider === "none") return null;
  if (provider === "glm") {
    return {
      provider,
      apiKey: process.env.GLM_IMAGE_API_KEY || process.env.GLM_API_KEY || process.env.IMAGE_API_KEY,
      baseUrl:
        process.env.GLM_IMAGE_BASE_URL ||
        process.env.GLM_BASE_URL ||
        "https://open.bigmodel.cn/api/paas/v4",
      model: process.env.GLM_IMAGE_MODEL || process.env.IMAGE_MODEL || "cogview-3-flash",
      size: process.env.IMAGE_SIZE || "1344x768",
      label: "GLM image",
    };
  }

  return {
    provider: "openai-compatible",
    apiKey: process.env.IMAGE_API_KEY,
    baseUrl: process.env.IMAGE_BASE_URL || "https://api.openai.com/v1",
    model: process.env.IMAGE_MODEL || "gpt-image-2",
    size: process.env.IMAGE_SIZE || "1536x1024",
    label: "OpenAI-compatible image",
  };
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
    throw new Error(`${label} request failed (${imageRes.status})`);
  }

  const data = await imageRes.json();
  const first = data.data?.[0] || data.images?.[0] || {};
  const url = first.url || first.image_url || first.imageUrl;
  if (url) return url;

  const b64 = first.b64_json || first.base64 || first.image;
  if (b64) return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;

  throw new Error(`${label} response did not include an image URL or base64 payload`);
}
