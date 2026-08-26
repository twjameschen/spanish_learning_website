import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportBackup,
  parseBackup,
  importBackup,
  backupFileName,
  BACKUP_APP_ID,
  BACKUP_VERSION,
} from './backup';
import { storage, initStorage, __resetStorageForTests } from './storage';
import { SNAPSHOT_PREFIX } from './snapshot';

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
