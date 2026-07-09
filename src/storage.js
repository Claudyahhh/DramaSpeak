const memoryStore = new Map();

const storeKey = (key, shared) => `${shared ? "shared" : "private"}:${key}`;

const getBackingStore = () => {
  try {
    const probe = "__duo_stage_probe__";
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

if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key, shared = true) {
      if (shared) {
        const remote = await remoteStorage({ op: "get", key });
        if (remote.ok) return remote.value == null ? null : { key, value: remote.value };
      }
      const value = readValue(storeKey(key, shared));
      return value == null ? null : { key, value };
    },
    async set(key, value, shared = true) {
      if (shared) {
        const remote = await remoteStorage({ op: "set", key, value });
        if (remote.ok) return { key, value };
      }
      writeValue(storeKey(key, shared), value);
      return { key, value };
    },
    async delete(key, shared = true) {
      if (shared) {
        const remote = await remoteStorage({ op: "delete", key });
        if (remote.ok) return;
      }
      deleteValue(storeKey(key, shared));
    },
    async list(prefix, shared = true) {
      if (shared) {
        const remote = await remoteStorage({ op: "list", prefix });
        if (remote.ok) return { keys: remote.keys || [] };
      }
      const scopedPrefix = storeKey(prefix, shared);
      const keys = listKeys(scopedPrefix).map((key) =>
        key.replace(/^(shared|private):/, "")
      );
      return { keys };
    },
  };
}

async function remoteStorage(payload) {
  try {
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, ...data };
  } catch {
    return { ok: false };
  }
}
