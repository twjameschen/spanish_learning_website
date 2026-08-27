import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useStorageTier } from '@/hooks/useStorageTier';
import { BackupControls } from '@/components/BackupControls';
import { useT } from '@/i18n';

/**
 * memory 層警示條。
 *
 * 只有在 IndexedDB 與 localStorage **實測都寫不進去**時才顯示，
 * 常見原因是無痕模式、瀏覽器停用網站資料、配額用盡，或 Firefox 在 file:// 下擋 IndexedDB。
 * （實測 Chrome/Edge 在 file:// 下兩者都可用，所以雙擊開啟通常不會看到這條。）
 */
export function StorageBanner() {
  const tier = useStorageTier();
  const { t } = useT();
  const ephemeral = tier === 'memory';

  useEffect(() => {
    if (!ephemeral) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
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
            <strong className="font-extrabold">{t('bannerTitle')}</strong>{' '}
            {t('bannerBody')}
            {isFile ? (
              <>
                <br />
                {t('bannerFile')}
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
