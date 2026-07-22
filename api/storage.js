import { createHmac, timingSafeEqual } from "node:crypto";
import { applyRateLimitHeaders, checkRateLimit } from "../lib/server-security.js";

const namespace = process.env.STORAGE_NAMESPACE || "ai-drama";
const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const ROOM_TTL_SECONDS = boundedNumber(process.env.ROOM_TTL_SECONDS, 3600, 604800, 86400);
const MAX_VALUE_BYTES = 256 * 1024;

const json = (res, status, body) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return json(res, 503, { error: "Remote storage is not configured" });

  const credentials = { redisUrl, redisToken };
  const secret = process.env.ROOM_TOKEN_SECRET || redisToken;
  const { op, roomCode, userId, name, token, key, value, prefix } = req.body || {};

  try {
    if (op === "createRoom" || op === "joinRoom") {
      const rate = await checkRateLimit(req, { scope: `room-${op}`, limit: 30, windowSeconds: 600 });
      applyRateLimitHeaders(res, rate);
      if (!rate.allowed) return json(res, 429, { error: "Too many room attempts" });
    }

    if (op === "createRoom") {
      if (!validRoomCode(roomCode) || !validId(userId) || !validName(name)) {
        return json(res, 400, { error: "Invalid room or profile" });
      }
      const meta = { hostId: userId, createdAt: Date.now(), packId: null };
      const created = await redis(
        ["SET", scoped(`room:${roomCode}:meta`), JSON.stringify(meta), "NX", "EX", String(ROOM_TTL_SECONDS)],
        credentials
      );
      if (created !== "OK") return json(res, 409, { error: "Room code collision" });

      await setMember(roomCode, userId, name, credentials);
      const roomToken = issueRoomToken({ roomCode, userId, isHost: true }, secret);
      return json(res, 201, { token: roomToken, meta });
    }

    if (op === "joinRoom") {
      if (!validRoomCode(roomCode) || !validId(userId) || !validName(name)) {
        return json(res, 400, { error: "Invalid room or profile" });
      }
      const metaRaw = await redis(["GET", scoped(`room:${roomCode}:meta`)], credentials);
      if (!metaRaw) return json(res, 404, { error: "Room not found or expired" });
      const meta = JSON.parse(metaRaw);
      await redis(["EXPIRE", scoped(`room:${roomCode}:meta`), String(ROOM_TTL_SECONDS)], credentials);

      const existingToken = verifyRoomToken(token, secret, roomCode);
      const memberKey = `room:${roomCode}:member:${userId}`;
      const memberExists = Number(await redis(["EXISTS", scoped(memberKey)], credentials)) === 1;
      if (memberExists) {
        if (existingToken?.userId === userId) {
          await redis(["EXPIRE", scoped(memberKey), String(ROOM_TTL_SECONDS)], credentials);
          return json(res, 200, { token, meta });
        }

        // One-time compatibility path for rooms created before signed tokens existed.
        // The opaque local user id plus the saved display name act as the migration proof.
        const memberRaw = await redis(["GET", scoped(memberKey)], credentials);
        const savedMember = memberRaw ? JSON.parse(memberRaw) : null;
        if (savedMember?.userId !== userId || savedMember?.name !== name.trim()) {
          return json(res, 409, { error: "This profile is already active in the room" });
        }
        await redis(["EXPIRE", scoped(memberKey), String(ROOM_TTL_SECONDS)], credentials);
        const migratedToken = issueRoomToken({ roomCode, userId, isHost: meta.hostId === userId }, secret);
        return json(res, 200, { token: migratedToken, meta });
      }

      const members = await scanKeys(scoped(`room:${roomCode}:member:`), credentials, 3);
      if (members.length >= 2) return json(res, 409, { error: "Room is full" });

      await setMember(roomCode, userId, name, credentials);
      const roomToken = issueRoomToken({ roomCode, userId, isHost: meta.hostId === userId }, secret);
      return json(res, 200, { token: roomToken, meta });
    }

    const authorization = await authorizeRequest({ token, roomCode, key, prefix, op }, secret, credentials);
    if (!authorization.ok) return json(res, authorization.status, { error: authorization.error });
    const parsed = authorization.parsed;

    if (op === "get") {
      const result = await redis(["GET", scoped(key)], credentials);
      if (result != null) await redis(["EXPIRE", scoped(key), String(ROOM_TTL_SECONDS)], credentials);
      return json(res, 200, { value: result ?? null });
    }

    if (op === "set") {
      if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > MAX_VALUE_BYTES) {
        return json(res, 413, { error: "Storage value is too large" });
      }
      try {
        JSON.parse(value);
      } catch {
        return json(res, 400, { error: "Storage value must be valid JSON" });
      }
      await redis(["SET", scoped(key), value, "EX", String(ROOM_TTL_SECONDS)], credentials);
      return json(res, 200, { ok: true });
    }

    if (op === "delete") {
      await redis(["DEL", scoped(key)], credentials);
      return json(res, 200, { ok: true });
    }

    if (op === "list") {
      const keys = await scanKeys(scoped(prefix), credentials, 3);
      await Promise.all(keys.map((item) => redis(["EXPIRE", item, String(ROOM_TTL_SECONDS)], credentials)));
      return json(res, 200, { keys: keys.map(unscoped) });
    }

    return json(res, 400, { error: "Unknown storage operation" });
  } catch (error) {
    console.error("Remote storage failure", error instanceof Error ? error.message : "unknown");
    return json(res, 500, { error: "Remote storage error" });
  }
}

async function authorizeRequest(request, secret, credentials) {
  const payload = verifyRoomToken(request.token, secret, request.roomCode);
  if (!payload) return { ok: false, status: 401, error: "Invalid or expired room token" };

  const memberExists = Number(
    await redis(["EXISTS", scoped(`room:${payload.roomCode}:member:${payload.userId}`)], credentials)
  ) === 1;
  if (!memberExists) return { ok: false, status: 403, error: "Room membership is no longer active" };
  await Promise.all([
    redis(["EXPIRE", scoped(`room:${payload.roomCode}:member:${payload.userId}`), String(ROOM_TTL_SECONDS)], credentials),
    redis(["EXPIRE", scoped(`room:${payload.roomCode}:meta`), String(ROOM_TTL_SECONDS)], credentials),
  ]);

  if (request.op === "list") {
    const expected = `room:${payload.roomCode}:member:`;
    if (request.prefix !== expected) return { ok: false, status: 403, error: "List scope is not allowed" };
    return { ok: true, parsed: { roomCode: payload.roomCode, kind: "member-list" }, payload };
  }

  const parsed = parseRoomKey(request.key);
  if (!parsed || parsed.roomCode !== payload.roomCode || request.roomCode !== payload.roomCode) {
    return { ok: false, status: 403, error: "Storage key is outside this room" };
  }
  if (!canAccessRoomKey(payload, parsed, request.op)) {
    return { ok: false, status: 403, error: "Operation is not allowed for this room member" };
  }
  return { ok: true, parsed, payload };
}

export function parseRoomKey(value) {
  const parts = String(value || "").split(":");
  if (parts[0] !== "room" || !validRoomCode(parts[1])) return null;
  if (parts.length === 3 && ["meta", "state", "review"].includes(parts[2])) {
    return { roomCode: parts[1], kind: parts[2] };
  }
  if (parts.length === 4 && parts[2] === "member" && validId(parts[3])) {
    return { roomCode: parts[1], kind: "member", userId: parts[3] };
  }
  if (parts.length === 5 && parts[2] === "lines" && validId(parts[3]) && validId(parts[4])) {
    return { roomCode: parts[1], kind: "lines", sessionId: parts[3], userId: parts[4] };
  }
  return null;
}

export function canAccessRoomKey(payload, parsed, op) {
  if (op === "get") return true;
  if (!["set", "delete"].includes(op)) return false;
  if (["meta", "state", "review"].includes(parsed.kind)) return payload.isHost;
  if (parsed.kind === "member" || parsed.kind === "lines") return parsed.userId === payload.userId;
  return false;
}

export function issueRoomToken({ roomCode, userId, isHost }, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    roomCode,
    userId,
    isHost: Boolean(isHost),
    expiresAt: now + ROOM_TTL_SECONDS * 1000,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyRoomToken(token, secret, expectedRoomCode, now = Date.now()) {
  if (typeof token !== "string" || !secret) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      decoded.version !== 1 ||
      !validRoomCode(decoded.roomCode) ||
      !validId(decoded.userId) ||
      decoded.roomCode !== expectedRoomCode ||
      !Number.isFinite(decoded.expiresAt) ||
      decoded.expiresAt <= now
    ) return null;
    return decoded;
  } catch {
    return null;
  }
}

async function setMember(roomCode, userId, name, credentials) {
  const member = {
    userId,
    name: name.trim(),
    ready: false,
    headphones: false,
    role: null,
    prepDone: false,
    joinedAt: Date.now(),
  };
  await redis(
    ["SET", scoped(`room:${roomCode}:member:${userId}`), JSON.stringify(member), "EX", String(ROOM_TTL_SECONDS)],
    credentials
  );
}

function validRoomCode(value) {
  return ROOM_CODE_RE.test(String(value || ""));
}

function validId(value) {
  return ID_RE.test(String(value || ""));
}

function validName(value) {
  return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 40;
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
  if (!response.ok) throw new Error(`Redis request failed (${response.status})`);
  const data = await response.json();
  if (data.error) throw new Error("Redis command failed");
  return data.result;
}

async function scanKeys(prefix, credentials, limit) {
  let cursor = "0";
  const keys = [];
  do {
    const result = await redis(["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", "20"], credentials);
    cursor = String(result?.[0] || "0");
    keys.push(...(result?.[1] || []));
  } while (cursor !== "0" && keys.length < limit);
  return keys.slice(0, limit);
}

function boundedNumber(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
