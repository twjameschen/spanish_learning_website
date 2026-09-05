import { storage, type StorageTier } from './storage';
import { SNAPSHOT_PREFIX } from './snapshot';
import { useProgressStore, PROGRESS_KEY } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 進度的 JSON 匯出／匯入。
 * 這在單檔（file://）模式下不是選配而是**唯一**的保存手段，
 * 所以格式要穩定、要有版本號、要能自我驗證。
 */

export const BACKUP_APP_ID = 'camino-a-quito';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  tier: StorageTier;
  data: Record<string, unknown>;
}

export interface ImportSummary {
  keys: number;
  exportedAt: string;
}

/** 匯出目前全部進度（含快照，這樣還原後歷史也在） */
export async function exportBackup(includeSnapshots = false): Promise<BackupFile> {
  const all = await storage.exportAll();
  const data = includeSnapshots
    ? all
    : Object.fromEntries(Object.entries(all).filter(([k]) => !k.startsWith(SNAPSHOT_PREFIX)));
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tier: await storage.tier(),
    data,
  };
}

export function backupFileName(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `camino-progress-${stamp}.json`;
}

/** 解析並驗證一份備份檔。格式不對就丟出中文錯誤訊息給 UI 直接顯示。 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('這不是有效的 JSON 檔案。');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('備份檔內容不是物件。');
  }
  const obj = raw as Partial<BackupFile>;
  if (obj.app !== BACKUP_APP_ID) {
    throw new Error('這不是 Camino a Quito 的備份檔。');
  }
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    throw new Error(`備份檔版本 ${String(obj.version)} 比目前的 app 還新，請先更新 app。`);
  }
  if (typeof obj.data !== 'object' || obj.data === null) {
    throw new Error('備份檔缺少 data 欄位。');
  }
  return {
    app: BACKUP_APP_ID,
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '(未知時間)',
    tier: (obj.tier ?? 'memory') as StorageTier,
    data: obj.data as Record<string, unknown>,
  };
}

/**
 * 匯入備份。預設 replace：先清空再寫入，避免舊資料殘留造成半新半舊的狀態。
 * merge 模式只覆蓋備份檔裡有的 key。
 */
export async function importBackup(
  backup: BackupFile,
  mode: 'replace' | 'merge' = 'replace',
): Promise<ImportSummary> {
  if (mode === 'replace') await storage.clear();
  await storage.importAll(backup.data);
  return { keys: Object.keys(backup.data).length, exportedAt: backup.exportedAt };
}

/**
 * 觸發瀏覽器下載。
 * 回傳 false 代表下載被環境擋掉（部分瀏覽器在 file:// 下會擋），
 * 呼叫端應改為顯示 JSON 文字讓使用者自己複製。
 */
export function downloadJson(fileName: string, payload: unknown): boolean {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // 立刻 revoke 有機會讓下載中斷，延後回收
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}

/**
 * 匯入（或還原快照）之後把記憶體裡的 store 補水。
 *
 * 沒有這一步的話會有兩層後果，第二層才會吃掉資料：
 * 1. 畫面顯示「匯入成功」但 XP、連續天數、複習張數全是舊的
 * 2. **舊的 store 還活著**，下一次作答就把整份舊進度寫回儲存層，
 *    把剛匯入的資料悄悄蓋掉
 *
 * `replace` 模式下若備份檔沒有某個 store 的 key，要先 `reset()` 再補水 ——
 * zustand 讀不到東西時會維持現有 state，舊進度會因為「沒有東西可以覆蓋」而留下來。
 */
export async function refreshStoresAfterImport(
  keys: Iterable<string> = [],
  mode: 'replace' | 'merge' = 'replace',
): Promise<void> {
  const present = new Set(keys);
  if (mode === 'replace' && !present.has(PROGRESS_KEY)) {
    useProgressStore.getState().reset();
  }
  await Promise.all([
    useProgressStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
  ]);
}
