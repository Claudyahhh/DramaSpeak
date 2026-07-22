const memoryStore = new Map();
const ROOM_TOKEN_PREFIX = "dramaspeak:room-token:";

const storeKey = (key, shared) => `${shared ? "shared" : "private"}:${key}`;

const getBackingStore = () => {
  try {
    const probe = "__dramaspeak_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

const readValue = (key) => {
  const storage = getBackingStore();
  if (storage) return storage.getItem(key);
  return memoryStore.has(key) ? memoryStore.get(key) : null;
};

const writeValue = (key, value) => {
  const storage = getBackingStore();
  if (storage) storage.setItem(key, value);
  else memoryStore.set(key, value);
};

const deleteValue = (key) => {
  const storage = getBackingStore();
  if (storage) storage.removeItem(key);
  memoryStore.delete(key);
};

const listKeys = (prefix) => {
  const storage = getBackingStore();
  const keys = [];
  if (storage) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix) && !keys.includes(key)) keys.push(key);
  }
  return keys;
};

const roomCodeFromKey = (value) => {
  const match = String(value || "").match(/^room:([A-HJ-NP-Z2-9]{6}):/);
  return match?.[1] || null;
};

const getRoomToken = (roomCode) => readValue(`${ROOM_TOKEN_PREFIX}${roomCode}`);
const setRoomToken = (roomCode, token) => writeValue(`${ROOM_TOKEN_PREFIX}${roomCode}`, token);
const deleteRoomToken = (roomCode) => deleteValue(`${ROOM_TOKEN_PREFIX}${roomCode}`);

if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async createRoom({ code, userId, name }) {
      const remote = await requestStorage({ op: "createRoom", roomCode: code, userId, name });
      if (!remote.ok) return remote;
      setRoomToken(code, remote.token);
      return remote;
    },
    async joinRoom({ code, userId, name }) {
      const remote = await requestStorage({
        op: "joinRoom",
        roomCode: code,
        userId,
        name,
        token: getRoomToken(code),
      });
      if (!remote.ok) return remote;
      setRoomToken(code, remote.token);
      return remote;
    },
    clearRoom(roomCode) {
      deleteRoomToken(roomCode);
    },
    async get(key, shared = true) {
      if (shared) {
        const roomCode = roomCodeFromKey(key);
        if (!roomCode) return null;
        const remote = await requestRoomStorage({ op: "get", key }, roomCode);
        return remote.ok && remote.value != null ? { key, value: remote.value } : null;
      }
      const value = readValue(storeKey(key, false));
      return value == null ? null : { key, value };
    },
    async set(key, value, shared = true) {
      if (shared) {
        const roomCode = roomCodeFromKey(key);
        if (!roomCode) throw new Error("Only room-scoped remote storage is allowed");
        const remote = await requestRoomStorage({ op: "set", key, value }, roomCode);
        if (!remote.ok) throw new Error(remote.error || "Remote storage failed");
        return { key, value };
      }
      writeValue(storeKey(key, false), value);
      return { key, value };
    },
    async delete(key, shared = true) {
      if (shared) {
        const roomCode = roomCodeFromKey(key);
        if (!roomCode) throw new Error("Only room-scoped remote storage is allowed");
        const remote = await requestRoomStorage({ op: "delete", key }, roomCode);
        if (!remote.ok) throw new Error(remote.error || "Remote storage failed");
        return;
      }
      deleteValue(storeKey(key, false));
    },
    async list(prefix, shared = true) {
      if (shared) {
        const roomCode = roomCodeFromKey(prefix);
        if (!roomCode) return { keys: [] };
        const remote = await requestRoomStorage({ op: "list", prefix }, roomCode);
        return { keys: remote.ok ? remote.keys || [] : [] };
      }
      const scopedPrefix = storeKey(prefix, false);
      const keys = listKeys(scopedPrefix).map((key) => key.replace(/^private:/, ""));
      return { keys };
    },
  };
}

async function requestRoomStorage(payload, roomCode) {
  const token = getRoomToken(roomCode);
  if (!token) return { ok: false, error: "Missing room token" };
  return requestStorage({ ...payload, roomCode, token });
}

async function requestStorage(payload) {
  try {
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...data };
  } catch {
    return { ok: false, error: "Storage request failed" };
  }
}
