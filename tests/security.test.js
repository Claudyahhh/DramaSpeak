import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_IMAGE_PROMPT_CHARS,
  MAX_PROMPT_CHARS,
  validatePrompt,
} from "../lib/server-security.js";
import {
  canAccessRoomKey,
  issueRoomToken,
  parseRoomKey,
  verifyRoomToken,
} from "../api/storage.js";
import storageHandler from "../api/storage.js";
import textHandler from "../api/claude.js";

const roomCode = "ABC234";
const host = { roomCode, userId: "u_host", isHost: true };
const member = { roomCode, userId: "u_member", isHost: false };

test("text and image prompts enforce their documented hard limits", () => {
  assert.equal(validatePrompt("hello").ok, true);
  assert.equal(validatePrompt("x".repeat(MAX_PROMPT_CHARS)).ok, true);
  assert.equal(validatePrompt("x".repeat(MAX_PROMPT_CHARS + 1)).ok, false);
  assert.equal(validatePrompt("x".repeat(MAX_IMAGE_PROMPT_CHARS), MAX_IMAGE_PROMPT_CHARS).ok, true);
  assert.equal(validatePrompt("x".repeat(MAX_IMAGE_PROMPT_CHARS + 1), MAX_IMAGE_PROMPT_CHARS).ok, false);
  assert.equal(validatePrompt("   ").ok, false);
});

test("room storage accepts only the explicit room key schema", () => {
  assert.deepEqual(parseRoomKey(`room:${roomCode}:meta`), { roomCode, kind: "meta" });
  assert.deepEqual(parseRoomKey(`room:${roomCode}:member:u_member`), {
    roomCode,
    kind: "member",
    userId: "u_member",
  });
  assert.deepEqual(parseRoomKey(`room:${roomCode}:lines:1700000000000:u_member`), {
    roomCode,
    kind: "lines",
    sessionId: "1700000000000",
    userId: "u_member",
  });
  assert.equal(parseRoomKey("cscript:c_123"), null);
  assert.equal(parseRoomKey(`room:${roomCode}:unknown`), null);
  assert.equal(parseRoomKey("room:IIIIII:meta"), null);
});

test("host and member write permissions are separated", () => {
  const meta = parseRoomKey(`room:${roomCode}:meta`);
  const ownMember = parseRoomKey(`room:${roomCode}:member:u_member`);
  const otherMember = parseRoomKey(`room:${roomCode}:member:u_other`);
  const ownLines = parseRoomKey(`room:${roomCode}:lines:1700000000000:u_member`);

  assert.equal(canAccessRoomKey(host, meta, "set"), true);
  assert.equal(canAccessRoomKey(member, meta, "set"), false);
  assert.equal(canAccessRoomKey(member, ownMember, "set"), true);
  assert.equal(canAccessRoomKey(member, otherMember, "delete"), false);
  assert.equal(canAccessRoomKey(member, ownLines, "set"), true);
  assert.equal(canAccessRoomKey(member, meta, "get"), true);
});

test("room tokens are signed, room-bound, and expiring", () => {
  const secret = "test-secret-with-at-least-thirty-two-bytes";
  const now = Date.UTC(2026, 6, 22);
  const token = issueRoomToken(host, secret, now);
  const verified = verifyRoomToken(token, secret, roomCode, now + 1000);

  assert.equal(verified.userId, host.userId);
  assert.equal(verified.isHost, true);
  assert.equal(verifyRoomToken(`${token}x`, secret, roomCode, now + 1000), null);
  assert.equal(verifyRoomToken(token, secret, "XYZ789", now + 1000), null);
  assert.equal(verifyRoomToken(token, secret, roomCode, now + 8 * 24 * 3600 * 1000), null);
});

test("the production storage handler rejects anonymous global scans", async (t) => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = global.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "redis-secret";
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Redis must not be reached for an unauthenticated scan");
  };
  t.after(() => {
    restoreEnv("UPSTASH_REDIS_REST_URL", originalUrl);
    restoreEnv("UPSTASH_REDIS_REST_TOKEN", originalToken);
    global.fetch = originalFetch;
  });

  const res = responseRecorder();
  await storageHandler(
    { method: "POST", headers: {}, body: { op: "list", prefix: "" } },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(fetchCalls, 0);
  assert.match(res.body.error, /token/i);
});

test("room creation, joining, and host/member permissions work together", async (t) => {
  const names = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "ROOM_TOKEN_SECRET"];
  const originalEnv = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalFetch = global.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "redis-secret";
  process.env.ROOM_TOKEN_SECRET = "room-secret-with-at-least-thirty-two-bytes";
  global.fetch = fakeRedisFetch();
  t.after(() => {
    names.forEach((name) => restoreEnv(name, originalEnv[name]));
    global.fetch = originalFetch;
  });

  const created = responseRecorder();
  await storageHandler(
    {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.10" },
      body: { op: "createRoom", roomCode, userId: host.userId, name: "Host" },
    },
    created
  );
  assert.equal(created.statusCode, 201);
  assert.ok(created.body.token);

  const joined = responseRecorder();
  await storageHandler(
    {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.11" },
      body: { op: "joinRoom", roomCode, userId: member.userId, name: "Member" },
    },
    joined
  );
  assert.equal(joined.statusCode, 200);
  assert.ok(joined.body.token);

  const hostSet = responseRecorder();
  await storageHandler(roomRequest(created.body.token, host.userId, {
    op: "set",
    key: `room:${roomCode}:meta`,
    value: JSON.stringify({ ...created.body.meta, packId: "last-flight" }),
  }), hostSet);
  assert.equal(hostSet.statusCode, 200);

  const memberSetMeta = responseRecorder();
  await storageHandler(roomRequest(joined.body.token, member.userId, {
    op: "set",
    key: `room:${roomCode}:meta`,
    value: JSON.stringify({ packId: "wedding" }),
  }), memberSetMeta);
  assert.equal(memberSetMeta.statusCode, 403);

  const memberSetLines = responseRecorder();
  await storageHandler(roomRequest(joined.body.token, member.userId, {
    op: "set",
    key: `room:${roomCode}:lines:1700000000000:${member.userId}`,
    value: JSON.stringify([{ ts: 1700000000000, text: "I need the truth." }]),
  }), memberSetLines);
  assert.equal(memberSetLines.statusCode, 200);

  const memberList = responseRecorder();
  await storageHandler(roomRequest(joined.body.token, member.userId, {
    op: "list",
    prefix: `room:${roomCode}:member:`,
  }), memberList);
  assert.equal(memberList.statusCode, 200);
  assert.equal(memberList.body.keys.length, 2);

  const globalList = responseRecorder();
  await storageHandler(roomRequest(created.body.token, host.userId, { op: "list", prefix: "" }), globalList);
  assert.equal(globalList.statusCode, 403);
});

test("the text API rejects oversized prompts before any provider call", async (t) => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Provider must not be reached");
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const res = responseRecorder();
  await textHandler(
    {
      method: "POST",
      headers: {},
      body: { prompt: "x".repeat(MAX_PROMPT_CHARS + 1) },
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(fetchCalls, 0);
  assert.match(res.body.error, /limit/i);
});

test("server-funded model keys are ignored unless explicitly enabled", async (t) => {
  const names = [
    "ALLOW_SERVER_MODEL",
    "TEXT_API_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];
  const originalEnv = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalFetch = global.fetch;
  delete process.env.ALLOW_SERVER_MODEL;
  process.env.TEXT_API_KEY = "server-key-that-must-not-be-used";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Provider must not be reached");
  };
  t.after(() => {
    names.forEach((name) => restoreEnv(name, originalEnv[name]));
    global.fetch = originalFetch;
  });

  const res = responseRecorder();
  await textHandler(
    { method: "POST", headers: {}, body: { prompt: "whisper-coach" } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.provider, "fallback");
  assert.equal(fetchCalls, 0);
});

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function roomRequest(token, userId, body) {
  return {
    method: "POST",
    headers: { "x-forwarded-for": `198.51.100.${userId === host.userId ? "10" : "11"}` },
    body: { ...body, roomCode, token },
  };
}

function fakeRedisFetch() {
  const values = new Map();
  return async (_url, options) => {
    const command = JSON.parse(options.body);
    const [op, key, value, ...args] = command;
    let result;

    if (op === "INCR") {
      result = Number(values.get(key) || 0) + 1;
      values.set(key, String(result));
    } else if (op === "EXPIRE") {
      result = values.has(key) ? 1 : 0;
    } else if (op === "SET") {
      const nx = args.includes("NX");
      if (nx && values.has(key)) result = null;
      else {
        values.set(key, value);
        result = "OK";
      }
    } else if (op === "GET") {
      result = values.get(key) ?? null;
    } else if (op === "EXISTS") {
      result = values.has(key) ? 1 : 0;
    } else if (op === "DEL") {
      result = values.delete(key) ? 1 : 0;
    } else if (op === "SCAN") {
      const pattern = command[command.indexOf("MATCH") + 1];
      const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
      result = ["0", [...values.keys()].filter((item) => item.startsWith(prefix))];
    } else {
      throw new Error(`Unsupported fake Redis command: ${op}`);
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return { result };
      },
    };
  };
}
