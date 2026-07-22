import { createHash } from "node:crypto";

export const MAX_PROMPT_CHARS = 100_000;
export const MAX_IMAGE_PROMPT_CHARS = 20_000;

const memoryBuckets = new Map();

export function validatePrompt(prompt, maxChars = MAX_PROMPT_CHARS) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    return { ok: false, error: "Missing prompt" };
  }
  if (prompt.length > maxChars) {
    return {
      ok: false,
      error: `Prompt exceeds the ${maxChars} character limit`,
    };
  }
  return { ok: true };
}

export function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "").split(",")[0];
  return first.trim() || req.socket?.remoteAddress || "unknown";
}

export async function checkRateLimit(req, { scope, limit, windowSeconds }) {
  const identity = createHash("sha256").update(getClientIp(req)).digest("hex").slice(0, 24);
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${process.env.STORAGE_NAMESPACE || "ai-drama"}:rate:${scope}:${identity}:${bucket}`;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const count = Number(await redis(["INCR", key], { redisUrl, redisToken }));
      if (count === 1) await redis(["EXPIRE", key, String(windowSeconds + 5)], { redisUrl, redisToken });
      return rateResult(count, limit, windowSeconds);
    } catch (error) {
      console.error("Rate limit backend unavailable", error instanceof Error ? error.message : "unknown");
    }
  }

  const now = Date.now();
  const memoryKey = `${scope}:${identity}`;
  const current = memoryBuckets.get(memoryKey);
  const next = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowSeconds * 1000 }
    : { count: current.count + 1, resetAt: current.resetAt };
  memoryBuckets.set(memoryKey, next);
  return rateResult(next.count, limit, Math.max(1, Math.ceil((next.resetAt - now) / 1000)));
}

export function applyRateLimitHeaders(res, result) {
  res.setHeader("RateLimit-Limit", String(result.limit));
  res.setHeader("RateLimit-Remaining", String(result.remaining));
  if (!result.allowed) res.setHeader("Retry-After", String(result.retryAfter));
}

function rateResult(count, limit, retryAfter) {
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfter,
  };
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
  if (!response.ok) throw new Error(`Redis request failed (${response.status})`);
  const data = await response.json();
  if (data.error) throw new Error("Redis command failed");
  return data.result;
}
