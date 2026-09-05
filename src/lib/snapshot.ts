import { storage } from './storage';
import { localDayKey } from './utils';

/**
 * 開站自動快照。
 *
 * 粒度刻意選「每天一份、保留最近 3 天」而不是「每次開啟一份、保留最近 3 次」：
 * 後者在連續重整 3 次之後就把所有歷史沖掉了，等於沒有保護。
 * 每天一份的話同一天內最後一次開啟的狀態會覆蓋當天那份，跨天則往前保留 3 天。
 */

export const SNAPSHOT_PREFIX = 'snapshot:';
export const MAX_SNAPSHOTS = 3;

export interface SnapshotMeta {
  /** 完整 key，例如 `snapshot:2026-08-26` */
  id: string;
  /** YYYY-MM-DD */
  day: string;
  /** 這份快照包含幾個 key */
  entries: number;
}

interface SnapshotBody {
  savedAt: string;
  data: Record<string, unknown>;
}

const isSnapshotKey = (k: string) => k.startsWith(SNAPSHOT_PREFIX);

/** 列出現有快照，新的在前 */
export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const keys = (await storage.keys()).filter(isSnapshotKey);
  const metas: SnapshotMeta[] = [];
  for (const id of keys) {
    const body = await storage.get<SnapshotBody>(id);
    metas.push({
      id,
      day: id.slice(SNAPSHOT_PREFIX.length),
      entries: body ? Object.keys(body.data).length : 0,
    });
  }
  return metas.sort((a, b) => (a.day < b.day ? 1 : -1));
}

/**
 * 拍一份快照。回傳快照 id；若沒有任何實際資料可存則回傳 null
 * （全新使用者第一次開站，不需要留空快照）。
 */
export async function takeSnapshot(now: Date = new Date()): Promise<string | null> {
  const all = await storage.exportAll();
  // 快照本身不入快照，否則會指數成長
  const data = Object.fromEntries(
    Object.entries(all).filter(([k]) => !isSnapshotKey(k)),
  );
  if (Object.keys(data).length === 0) return null;

  const id = SNAPSHOT_PREFIX + localDayKey(now);
  const body: SnapshotBody = { savedAt: now.toISOString(), data };
  await storage.set(id, body);
  await pruneSnapshots();
  return id;
}

/** 保留最近 MAX_SNAPSHOTS 份，其餘刪掉 */
export async function pruneSnapshots(): Promise<void> {
  const metas = await listSnapshots();
  for (const meta of metas.slice(MAX_SNAPSHOTS)) {
    await storage.delete(meta.id);
  }
}

/**
 * 把某份快照寫回主要資料區。回傳寫回了哪些 key ——
 * 呼叫端要靠這份名單決定補水時該不該先把進度清成預設值。
 */
export async function restoreSnapshot(id: string): Promise<string[]> {
  const body = await storage.get<SnapshotBody>(id);
  if (!body) throw new Error(`找不到快照：${id}`);
  await storage.importAll(body.data);
  return Object.keys(body.data);
}
