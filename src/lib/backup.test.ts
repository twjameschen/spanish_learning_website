import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportBackup,
  parseBackup,
  importBackup,
  backupFileName,
  refreshStoresAfterImport,
  BACKUP_APP_ID,
  BACKUP_VERSION,
} from './backup';
import { storage, initStorage, __resetStorageForTests } from './storage';
import { SNAPSHOT_PREFIX } from './snapshot';
import { useProgressStore, PROGRESS_KEY } from '@/store/useProgressStore';
import { useSettingsStore, SETTINGS_KEY } from '@/store/useSettingsStore';

/** persist 的寫入是非同步的，讓它跑完再讀儲存層 */
const flushPersist = () => new Promise((r) => setTimeout(r, 0));

/** 一份 partialize 之後的空進度，用來手工組備份檔 */
const blankProgress = {
  cards: {},
  dailyStats: {},
  recentLog: [],
  lessons: {},
  totalXp: 0,
  streak: { current: 0, best: 0, freezes: 0, lastActiveDay: null, lastFreezeGrantWeek: null },
  seenAchievements: [],
};

describe('備份匯出匯入', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
  });

  it('匯出的檔案帶 app id 與版本號', async () => {
    await storage.set('progress', { xp: 42 });
    const backup = await exportBackup();
    expect(backup.app).toBe(BACKUP_APP_ID);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.data).toEqual({ progress: { xp: 42 } });
  });

  it('預設不匯出快照，避免備份檔膨脹', async () => {
    await storage.set('progress', { xp: 1 });
    await storage.set(`${SNAPSHOT_PREFIX}2026-08-26`, { savedAt: 'x', data: {} });
    expect(Object.keys((await exportBackup()).data)).toEqual(['progress']);
    expect(Object.keys((await exportBackup(true)).data)).toHaveLength(2);
  });

  it('完整往返：匯出 → 清空 → 匯入', async () => {
    await storage.set('progress', { xp: 999, words: ['hola'] });
    const text = JSON.stringify(await exportBackup());

    await storage.clear();
    expect(await storage.get('progress')).toBeNull();

    const summary = await importBackup(parseBackup(text));
    expect(summary.keys).toBe(1);
    expect(await storage.get('progress')).toEqual({ xp: 999, words: ['hola'] });
  });

  it('replace 模式會清掉備份檔裡沒有的舊 key', async () => {
    await storage.set('keep', 1);
    const text = JSON.stringify(await exportBackup());
    await storage.set('stale', 2);

    await importBackup(parseBackup(text), 'replace');
    expect(await storage.get('stale')).toBeNull();
    expect(await storage.get('keep')).toBe(1);
  });

  it('merge 模式保留備份檔裡沒有的舊 key', async () => {
    await storage.set('keep', 1);
    const text = JSON.stringify(await exportBackup());
    await storage.set('stale', 2);

    await importBackup(parseBackup(text), 'merge');
    expect(await storage.get('stale')).toBe(2);
  });

  it('拒絕不是 JSON 的檔案', () => {
    expect(() => parseBackup('<html>')).toThrow('有效的 JSON');
  });

  it('拒絕別的 app 的備份檔', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'duolingo', data: {} }))).toThrow(
      'Camino a Quito',
    );
  });

  it('拒絕版本號比 app 新的備份檔', () => {
    expect(() =>
      parseBackup(JSON.stringify({ app: BACKUP_APP_ID, version: 99, data: {} })),
    ).toThrow('請先更新');
  });

  it('檔名不含冒號，Windows 才存得下來', () => {
    const name = backupFileName(new Date('2026-08-26T13:45:07.123Z'));
    expect(name).not.toMatch(/[:]/);
    expect(name).toMatch(/^camino-progress-.*\.json$/);
  });
});

describe('匯入之後 store 要立刻反映新資料', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    useProgressStore.getState().reset();
    useSettingsStore.getState().setDailyGoal(5);
  });

  /** 做出一份「XP 為 xp、每日目標為 goal」的備份檔文字 */
  async function backupWith(xp: number, goal: 5 | 10 | 15): Promise<string> {
    await storage.clear();
    await storage.set(PROGRESS_KEY, JSON.stringify({ state: { ...blankProgress, totalXp: xp }, version: 0 }));
    await storage.set(SETTINGS_KEY, JSON.stringify({ state: { theme: 'system', locale: 'zh', dailyGoal: goal, speechEnabled: true, showNeedsVerify: true }, version: 0 }));
    return JSON.stringify(await exportBackup());
  }

  it('匯入之後不必重新整理，store 就是備份檔裡的值', async () => {
    const text = await backupWith(777, 15);
    await storage.clear();
    useProgressStore.getState().reset();

    const backup = parseBackup(text);
    await importBackup(backup, 'replace');
    await refreshStoresAfterImport(Object.keys(backup.data), 'replace');

    expect(useProgressStore.getState().totalXp).toBe(777);
    expect(useSettingsStore.getState().dailyGoal).toBe(15);
  });

  it('匯入之後再作答一次，寫回儲存層的是新資料而不是舊的', async () => {
    const text = await backupWith(777, 5);

    // 使用者在匯入前又賺了一些 XP —— 這份舊 state 就是會吃掉匯入資料的那一份
    await storage.clear();
    useProgressStore.getState().reset();
    useProgressStore.getState().recordAnswer({
      key: 'w:old', exerciseType: 'mcq', correct: true, ms: 1000, xp: 5,
    });
    expect(useProgressStore.getState().totalXp).toBe(5);

    const backup = parseBackup(text);
    await importBackup(backup, 'replace');
    await refreshStoresAfterImport(Object.keys(backup.data), 'replace');

    // 再作答一次，這一次的寫入必須疊在 777 上，而不是疊在舊的 5 上
    useProgressStore.getState().recordAnswer({
      key: 'w:new', exerciseType: 'mcq', correct: true, ms: 1000, xp: 3,
    });
    expect(useProgressStore.getState().totalXp).toBe(780);

    await flushPersist();
    const written = JSON.parse((await storage.get<string>(PROGRESS_KEY)) ?? '{}') as {
      state: { totalXp: number; cards: Record<string, unknown> };
    };
    expect(written.state.totalXp).toBe(780);
    // 舊的那張卡不該復活
    expect(Object.keys(written.state.cards)).toEqual(['w:new']);
  });

  it('備份檔沒有 progress 時，replace 模式把進度清成預設值', async () => {
    useProgressStore.getState().recordAnswer({
      key: 'w:old', exerciseType: 'mcq', correct: true, ms: 1000, xp: 42,
    });
    expect(useProgressStore.getState().totalXp).toBe(42);

    // 只有 settings、沒有 progress 的備份檔
    await storage.clear();
    await storage.set(SETTINGS_KEY, JSON.stringify({ state: { theme: 'dark', locale: 'zh', dailyGoal: 10, speechEnabled: true, showNeedsVerify: true }, version: 0 }));
    const backup = parseBackup(JSON.stringify(await exportBackup()));
    expect(Object.keys(backup.data)).not.toContain(PROGRESS_KEY);

    await importBackup(backup, 'replace');
    await refreshStoresAfterImport(Object.keys(backup.data), 'replace');

    expect(useProgressStore.getState().totalXp).toBe(0);
    expect(useProgressStore.getState().cards).toEqual({});
    expect(useSettingsStore.getState().dailyGoal).toBe(10);
  });
});
