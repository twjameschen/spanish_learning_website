import { describe, it, expect, beforeEach } from 'vitest';
import {
  takeSnapshot,
  listSnapshots,
  restoreSnapshot,
  MAX_SNAPSHOTS,
  SNAPSHOT_PREFIX,
} from './snapshot';
import { storage, initStorage, __resetStorageForTests } from './storage';

describe('開站自動快照', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
  });

  it('沒有任何資料時不留空快照', async () => {
    expect(await takeSnapshot()).toBeNull();
    expect(await listSnapshots()).toEqual([]);
  });

  it('有資料時拍一份，key 以日期為準', async () => {
    await storage.set('progress', { xp: 5 });
    const id = await takeSnapshot(new Date(2026, 7, 26));
    expect(id).toBe(`${SNAPSHOT_PREFIX}2026-08-26`);
  });

  it('同一天重複開站只覆蓋當天那份，不會累積', async () => {
    await storage.set('progress', { xp: 5 });
    await takeSnapshot(new Date(2026, 7, 26));
    await storage.set('progress', { xp: 9 });
    await takeSnapshot(new Date(2026, 7, 26));

    const metas = await listSnapshots();
    expect(metas).toHaveLength(1);
    await storage.set('progress', { xp: 0 });
    await restoreSnapshot(metas[0]!.id);
    expect(await storage.get('progress')).toEqual({ xp: 9 });
  });

  it(`跨天只保留最近 ${MAX_SNAPSHOTS} 天，最舊的被刪掉`, async () => {
    for (const day of [20, 21, 22, 23, 24]) {
      await storage.set('progress', { xp: day });
      await takeSnapshot(new Date(2026, 7, day));
    }
    const metas = await listSnapshots();
    expect(metas).toHaveLength(MAX_SNAPSHOTS);
    expect(metas.map((m) => m.day)).toEqual(['2026-08-24', '2026-08-23', '2026-08-22']);
  });

  it('快照本身不會被寫進下一份快照', async () => {
    await storage.set('progress', { xp: 1 });
    await takeSnapshot(new Date(2026, 7, 26));
    await takeSnapshot(new Date(2026, 7, 27));

    const metas = await listSnapshots();
    // 每份都只含 progress 這一個 key
    expect(metas.every((m) => m.entries === 1)).toBe(true);
  });

  it('還原不存在的快照會丟出可讀的錯誤', async () => {
    await expect(restoreSnapshot('snapshot:1999-01-01')).rejects.toThrow('找不到快照');
  });
});
