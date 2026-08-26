import { openDB, type IDBPDatabase } from 'idb';

/**
 * StorageAdapter — 三層儲存抽象。
 *
 *   IndexedDB  →  localStorage  →  in-memory
 *
 * 為什麼要有第三層（規格只寫兩層）：
 * 儲存 API 可用與否不是靠 protocol 就能推斷的，實測（Chromium 140 / file://）
 * localStorage 與 IndexedDB 在 file:// 下其實**都能用**，但下列情況仍會整組失效：
 *   - Firefox 在 file:// 下擋 IndexedDB
 *   - 無痕／隱私模式配額為 0，open 成功但寫入失敗
 *   - 企業原則或瀏覽器設定停用網站資料
 *   - 配額用盡
 * 這些情況下若沒有 in-memory 退路，app 會在啟動時直接炸掉。有了第三層，
 * 最差情況也只是「這次的進度不會自動保存」，功能仍完整可用。
 *
 * 因此偵測一律用**實際寫一次**來判斷，而不是看 location.protocol。
 * memory 層時 `tier === 'memory'`，UI 依此顯示常駐警示條並在離開前提醒匯出。
 */

export type StorageTier = 'idb' | 'local' | 'memory';

export interface StorageAdapter {
  /** 目前實際生效的層級，UI 依此決定是否顯示「進度不會自動保存」警示 */
  readonly tier: StorageTier;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  exportAll(): Promise<Record<string, unknown>>;
  importAll(data: Record<string, unknown>): Promise<void>;
  clear(): Promise<void>;
}

export const DB_NAME = 'camino-a-quito';
export const STORE_NAME = 'kv';
/** 所有 key 一律加此前綴，避免跟同 origin 的其他東西打架 */
export const KEY_PREFIX = 'camino:';
const PROBE_KEY = `${KEY_PREFIX}__probe__`;
const PROBE_TIMEOUT_MS = 3000;

const withPrefix = (key: string) => (key.startsWith(KEY_PREFIX) ? key : KEY_PREFIX + key);
const stripPrefix = (key: string) => (key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : key);

/* ------------------------------------------------------------------ *
 * 層級 1：IndexedDB
 * ------------------------------------------------------------------ */

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('storage probe timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function openIdb(): Promise<IDBPDatabase | null> {
  try {
    // 連 `indexedDB` 這個 getter 本身在某些環境都會丟，所以整段包起來
    if (typeof indexedDB === 'undefined' || indexedDB === null) return null;
    const db = await timeout(
      openDB(DB_NAME, 1, {
        upgrade(database) {
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME);
          }
        },
      }),
      PROBE_TIMEOUT_MS,
    );
    // 開得起來不代表寫得進去（無痕模式／配額 0），實際寫一次才算數
    await db.put(STORE_NAME, 1, PROBE_KEY);
    await db.delete(STORE_NAME, PROBE_KEY);
    return db;
  } catch {
    return null;
  }
}

function idbAdapter(db: IDBPDatabase): StorageAdapter {
  return {
    tier: 'idb',
    async get<T>(key: string) {
      const v = await db.get(STORE_NAME, withPrefix(key));
      return (v ?? null) as T | null;
    },
    async set<T>(key: string, value: T) {
      await db.put(STORE_NAME, value, withPrefix(key));
    },
    async delete(key: string) {
      await db.delete(STORE_NAME, withPrefix(key));
    },
    async keys() {
      const raw = (await db.getAllKeys(STORE_NAME)) as IDBValidKey[];
      return raw
        .filter((k): k is string => typeof k === 'string' && k.startsWith(KEY_PREFIX))
        .map(stripPrefix);
    },
    async exportAll() {
      const out: Record<string, unknown> = {};
      for (const key of await this.keys()) {
        out[key] = await this.get(key);
      }
      return out;
    },
    async importAll(data: Record<string, unknown>) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await Promise.all(
        Object.entries(data).map(([k, v]) => tx.store.put(v, withPrefix(k))),
      );
      await tx.done;
    },
    async clear() {
      for (const key of await this.keys()) await this.delete(key);
    },
  };
}

/* ------------------------------------------------------------------ *
 * 層級 2：localStorage
 * ------------------------------------------------------------------ */

function probeLocalStorage(): boolean {
  try {
    // 某些環境光是碰 localStorage 就會丟 SecurityError，所以連存取都要包在 try 內
    localStorage.setItem(PROBE_KEY, '1');
    const ok = localStorage.getItem(PROBE_KEY) === '1';
    localStorage.removeItem(PROBE_KEY);
    return ok;
  } catch {
    return false;
  }
}

function localAdapter(): StorageAdapter {
  const listKeys = () => {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX) && k !== PROBE_KEY) out.push(stripPrefix(k));
    }
    return out;
  };

  return {
    tier: 'local',
    async get<T>(key: string) {
      const raw = localStorage.getItem(withPrefix(key));
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        // 舊資料或被外部寫壞：當作沒有，不要讓整個 app 掛掉
        return null;
      }
    },
    async set<T>(key: string, value: T) {
      localStorage.setItem(withPrefix(key), JSON.stringify(value));
    },
    async delete(key: string) {
      localStorage.removeItem(withPrefix(key));
    },
    async keys() {
      return listKeys();
    },
    async exportAll() {
      const out: Record<string, unknown> = {};
      for (const key of listKeys()) out[key] = await this.get(key);
      return out;
    },
    async importAll(data: Record<string, unknown>) {
      for (const [k, v] of Object.entries(data)) await this.set(k, v);
    },
    async clear() {
      for (const key of listKeys()) await this.delete(key);
    },
  };
}

/* ------------------------------------------------------------------ *
 * 層級 3：記憶體（前兩層都不可用時的唯一退路）
 * ------------------------------------------------------------------ */

function memoryAdapter(): StorageAdapter {
  const map = new Map<string, unknown>();
  return {
    tier: 'memory',
    async get<T>(key: string) {
      const v = map.get(withPrefix(key));
      // 存進去時已深拷貝，取出時再拷一次避免外部改動污染
      return v === undefined ? null : (structuredClone(v) as T);
    },
    async set<T>(key: string, value: T) {
      map.set(withPrefix(key), structuredClone(value));
    },
    async delete(key: string) {
      map.delete(withPrefix(key));
    },
    async keys() {
      return [...map.keys()].map(stripPrefix);
    },
    async exportAll() {
      const out: Record<string, unknown> = {};
      for (const [k, v] of map) out[stripPrefix(k)] = structuredClone(v);
      return out;
    },
    async importAll(data: Record<string, unknown>) {
      for (const [k, v] of Object.entries(data)) map.set(withPrefix(k), structuredClone(v));
    },
    async clear() {
      map.clear();
    },
  };
}

/* ------------------------------------------------------------------ *
 * 偵測與對外入口
 * ------------------------------------------------------------------ */

let readyPromise: Promise<StorageAdapter> | null = null;
let resolvedTier: StorageTier | null = null;

async function detect(): Promise<StorageAdapter> {
  const db = await openIdb();
  if (db) {
    resolvedTier = 'idb';
    return idbAdapter(db);
  }
  if (probeLocalStorage()) {
    resolvedTier = 'local';
    return localAdapter();
  }
  resolvedTier = 'memory';
  return memoryAdapter();
}

/** 取得（並在首次呼叫時偵測）儲存層。結果會被記憶，重複呼叫不會重新偵測。 */
export function initStorage(): Promise<StorageAdapter> {
  readyPromise ??= detect();
  return readyPromise;
}

/** 已偵測完成回傳層級，尚未完成回傳 null（供同步 render 判斷用） */
export function currentTier(): StorageTier | null {
  return resolvedTier;
}

/** 測試用：清掉記憶的偵測結果 */
export function __resetStorageForTests(): void {
  readyPromise = null;
  resolvedTier = null;
}

/**
 * 對外唯一介面。方法內部自行等待偵測完成，呼叫端不必先 await init。
 */
export const storage = {
  get<T>(key: string): Promise<T | null> {
    return initStorage().then((s) => s.get<T>(key));
  },
  set<T>(key: string, value: T): Promise<void> {
    return initStorage().then((s) => s.set(key, value));
  },
  delete(key: string): Promise<void> {
    return initStorage().then((s) => s.delete(key));
  },
  keys(): Promise<string[]> {
    return initStorage().then((s) => s.keys());
  },
  exportAll(): Promise<Record<string, unknown>> {
    return initStorage().then((s) => s.exportAll());
  },
  importAll(data: Record<string, unknown>): Promise<void> {
    return initStorage().then((s) => s.importAll(data));
  },
  clear(): Promise<void> {
    return initStorage().then((s) => s.clear());
  },
  tier(): Promise<StorageTier> {
    return initStorage().then((s) => s.tier);
  },
};

/** zustand persist 用的 StateStorage 橋接（persist 支援 async） */
export const zustandStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const v = await storage.get<unknown>(name);
    if (v === null) return null;
    // idb 存的是物件、localStorage 存的是字串，這裡統一回字串給 persist
    return typeof v === 'string' ? v : JSON.stringify(v);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await storage.set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await storage.delete(name);
  },
};
