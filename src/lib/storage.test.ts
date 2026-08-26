import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initStorage,
  storage,
  currentTier,
  __resetStorageForTests,
  KEY_PREFIX,
} from './storage';

/**
 * jsdom 沒有 IndexedDB，所以這裡預設會落到 localStorage 層 —— 剛好能驗證降級路徑。
 * 另外用 stub 模擬 file:// 下 localStorage 也丟 SecurityError 的情況，驗證 memory 層。
 */

describe('StorageAdapter 層級偵測', () => {
  beforeEach(() => {
    __resetStorageForTests();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetStorageForTests();
  });

  it('沒有 IndexedDB 時降級到 localStorage', async () => {
    const adapter = await initStorage();
    expect(adapter.tier).toBe('local');
    expect(currentTier()).toBe('local');
  });

  it('localStorage 也不可用時（模擬 file://）降級到記憶體', async () => {
    // Chrome 在 file:// 下光是碰 localStorage 就丟 SecurityError
    vi.stubGlobal('localStorage', {
      get length(): number {
        throw new DOMException('denied', 'SecurityError');
      },
      getItem() {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem() {
        throw new DOMException('denied', 'SecurityError');
      },
      removeItem() {
        throw new DOMException('denied', 'SecurityError');
      },
      key() {
        throw new DOMException('denied', 'SecurityError');
      },
      clear() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    const adapter = await initStorage();
    expect(adapter.tier).toBe('memory');
  });

  it('偵測結果會被記憶，重複呼叫回傳同一個 adapter', async () => {
    const a = await initStorage();
    const b = await initStorage();
    expect(a).toBe(b);
  });
});

describe('StorageAdapter 讀寫行為', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
  });

  it('set / get 往返保留型別', async () => {
    await storage.set('deck', { cards: 3, due: ['hola'], nested: { ok: true } });
    expect(await storage.get('deck')).toEqual({
      cards: 3,
      due: ['hola'],
      nested: { ok: true },
    });
  });

  it('讀取不存在的 key 回傳 null 而不是 undefined', async () => {
    expect(await storage.get('nope')).toBeNull();
  });

  it('delete 之後讀不到', async () => {
    await storage.set('tmp', 1);
    await storage.delete('tmp');
    expect(await storage.get('tmp')).toBeNull();
  });

  it('所有 key 都加上 camino: 前綴，且 keys() 回傳去前綴的名稱', async () => {
    await storage.set('progress', { xp: 10 });
    expect(localStorage.getItem(`${KEY_PREFIX}progress`)).not.toBeNull();
    expect(await storage.keys()).toContain('progress');
  });

  it('keys() 不會撈到同 origin 底下不屬於本 app 的資料', async () => {
    localStorage.setItem('someone-elses-key', 'x');
    await storage.set('mine', 1);
    expect(await storage.keys()).toEqual(['mine']);
  });

  it('exportAll / importAll 往返一致', async () => {
    await storage.set('a', { n: 1 });
    await storage.set('b', ['x', 'y']);
    const dump = await storage.exportAll();
    expect(dump).toEqual({ a: { n: 1 }, b: ['x', 'y'] });

    await storage.clear();
    expect(await storage.keys()).toEqual([]);

    await storage.importAll(dump);
    expect(await storage.exportAll()).toEqual(dump);
  });

  it('localStorage 內容被外部寫壞時回傳 null，不讓 app 整個掛掉', async () => {
    localStorage.setItem(`${KEY_PREFIX}broken`, '{not json');
    expect(await storage.get('broken')).toBeNull();
  });
});
