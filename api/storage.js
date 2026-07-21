const namespace = process.env.STORAGE_NAMESPACE || "ai-drama";

const json = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const { op, key, value, prefix } = req.body || {};
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return json(res, 501, { error: "Remote storage is not configured" });
  }

  try {
    if (op === "get") {
      if (!key) return json(res, 400, { error: "Missing key" });
      const result = await redis(["GET", scoped(key)], { redisUrl, redisToken });
      return json(res, 200, { value: result ?? null });
    }

    if (op === "set") {
      if (!key || typeof value !== "string") return json(res, 400, { error: "Missing key or value" });
      await redis(["SET", scoped(key), value], { redisUrl, redisToken });
      return json(res, 200, { ok: true });
    }

    if (op === "delete") {
      if (!key) return json(res, 400, { error: "Missing key" });
      await redis(["DEL", scoped(key)], { redisUrl, redisToken });
      return json(res, 200, { ok: true });
    }

    if (op === "list") {
      const matchPrefix = scoped(prefix || "");
      const keys = await scanKeys(matchPrefix, { redisUrl, redisToken });
      return json(res, 200, { keys: keys.map(unscoped) });
    }

    return json(res, 400, { error: "Unknown storage operation" });
  } catch (error) {
    return json(res, 500, { error: "Remote storage error", detail: error.message });
  }
}

function scoped(key) {
  return `${namespace}:${key}`;
}

function unscoped(key) {
  const marker = `${namespace}:`;
  return key.startsWith(marker) ? key.slice(marker.length) : key;
}

async function redis(command, { redisUrl, redisToken }) {
  const response = await fetch(redisUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Redis command failed with ${response.status}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function scanKeys(prefix, credentials) {
  let cursor = "0";
  const keys = [];
  do {
    const result = await redis(["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", "100"], credentials);
    cursor = String(result?.[0] || "0");
    keys.push(...(result?.[1] || []));
  } while (cursor !== "0" && keys.length < 1000);
  return keys;
}
