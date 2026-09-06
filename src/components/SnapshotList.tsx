import { useEffect, useState } from 'react';
import { Camera, RotateCcw, Check, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/decor/Illustrations';
import { takeSnapshot, listSnapshots, restoreSnapshot, type SnapshotMeta } from '@/lib/snapshot';
import { refreshStoresAfterImport } from '@/lib/backup';
import { useT } from '@/i18n';

/**
 * 每天自動存一份的快照清單，附「還原」。
 *
 * 還原是破壞性的（會蓋掉現在的進度），所以走兩段式確認：
 * 點「還原」→ 該列就地換成「確定要還原到這一天？」＋確定／取消。
 * 不另外開對話框 —— 首頁的層級已經夠多了，而且就地確認看得到自己按的是哪一列。
 */
export function SnapshotList() {
  const { t } = useT();
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  /** 正在等待確認的那一列 */
  const [confirming, setConfirming] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);
  /** 還原進行中 —— 破壞性操作不能連按兩下 */
  const [busy, setBusy] = useState(false);
  /**
   * 拍快照本身失敗了。
   *
   * 這個要跟「還沒有快照」分開：`takeSnapshot` 會把所有 key 完整複製一份
   * 並保留 3 份，在 localStorage 那一層（約 5MB）很有機會 QuotaExceededError。
   * 以前這條鏈沒有 `.catch`，一 reject 就無聲中斷、`snapshots` 留在空的，
   * 畫面顯示「還沒有任何快照」—— 在備份最重要的那一層，
   * 使用者被告知的是「還沒開始存」，事實卻是「一直存不進去」。
   */
  const [snapshotFailed, setSnapshotFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void takeSnapshot()
      .then(() => listSnapshots())
      .then((m) => { if (alive) setSnapshots(m); })
      .catch(() => { if (alive) setSnapshotFailed(true); });
    return () => { alive = false; };
  }, []);

  async function handleRestore(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const keys = await restoreSnapshot(id);
      // 走跟匯入同一條補水路徑，否則畫面停在舊數字、下次作答又把舊進度寫回去。
      // merge：快照沒有的 key 保持現狀，不是整個資料區清掉
      await refreshStoresAfterImport(keys, 'merge');
      setConfirming(null);
      setStatus({ kind: 'ok', message: t('snapshotRestoreOk', { n: keys.length }) });
    } catch (e) {
      setConfirming(null);
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : t('snapshotRestoreFailed'),
      });
    } finally {
      setBusy(false);
    }
  }

  if (snapshotFailed) {
    return <EmptyState title={t('snapshotFailed')} hint={t('snapshotFailedHint')} />;
  }

  if (snapshots.length === 0) {
    return <EmptyState title={t('snapshotEmpty')} hint={t('snapshotEmptyHint')} />;
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {snapshots.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-2 px-4 py-2.5"
          >
            {confirming === s.id ? (
              <>
                <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-error-600" />
                <span className="text-sm font-semibold text-body">
                  {t('snapshotRestoreConfirm', { d: s.day })}
                </span>
                <div className="ml-auto flex gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy}
                    onClick={() => void handleRestore(s.id)}
                  >
                    {t(busy ? 'snapshotRestoring' : 'snapshotRestoreYes')}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                    {t('snapshotRestoreNo')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Camera aria-hidden="true" className="size-4 shrink-0 text-secondary-600" />
                <span className="font-mono text-sm font-semibold text-body">{s.day}</span>
                <span className="ml-auto text-xs text-muted">{t('entries', { n: s.entries })}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setStatus(null); setConfirming(s.id); }}
                  title={t('snapshotRestoreTitle')}
                >
                  <RotateCcw aria-hidden="true" />
                  {t('snapshotRestore')}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {status ? (
        <p
          className={
            status.kind === 'ok'
              ? 'flex items-start gap-1.5 text-sm font-semibold text-success-800 dark:text-success-200'
              : 'flex items-start gap-1.5 text-sm font-semibold text-error-700 dark:text-error-300'
          }
        >
          {status.kind === 'ok' ? (
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ) : (
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          )}
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
