import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useStorageTier } from '@/hooks/useStorageTier';
import { BackupControls } from '@/components/BackupControls';

/**
 * memory 層警示條。
 *
 * 只有在 IndexedDB 與 localStorage **實測都寫不進去**時才顯示，
 * 常見原因是無痕模式、瀏覽器停用網站資料、配額用盡，或 Firefox 在 file:// 下擋 IndexedDB。
 * （實測 Chrome/Edge 在 file:// 下兩者都可用，所以雙擊開啟通常不會看到這條。）
 *
 * 這件事必須明講，而不是讓使用者練了一小時才發現白費。
 */
export function StorageBanner() {
  const tier = useStorageTier();
  const ephemeral = tier === 'memory';

  useEffect(() => {
    if (!ephemeral) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 現代瀏覽器只認 preventDefault / returnValue，訊息內容不會顯示
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [ephemeral]);

  if (!ephemeral) return null;

  const isFile = typeof location !== 'undefined' && location.protocol === 'file:';

  return (
    <div
      role="alert"
      className="border-b-2 border-accent-500/60 bg-accent-100 px-4 py-3 dark:bg-accent-900/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-800 dark:text-accent-100">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-accent-700 dark:text-accent-300"
          />
          <span>
            <strong className="font-extrabold">這個瀏覽器不讓本頁儲存資料，進度不會自動保存。</strong>
            {' '}常見原因是無痕／隱私模式、瀏覽器停用了網站資料，或儲存配額已滿。
            離開前請按「匯出進度」，下次再用「匯入進度」接回來。
            {isFile ? (
              <>
                <br />
                你是直接開啟本機檔案（
                <code className="rounded bg-black/10 px-1 font-mono text-xs">file://</code>
                ）。改用{' '}
                <code className="rounded bg-black/10 px-1 font-mono text-xs">
                  python -m http.server 8000
                </code>{' '}
                開啟通常就能正常保存（見 README）。
              </>
            ) : null}
          </span>
        </p>
        <div className="shrink-0">
          <BackupControls compact />
        </div>
      </div>
    </div>
  );
}
