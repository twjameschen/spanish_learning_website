import { useMemo } from 'react';
import { Star, RotateCcw } from 'lucide-react';
import { weakestWords } from '@/lib/dashboard';
import { useProgressStore } from '@/store/useProgressStore';
import { EmptyState } from '@/components/decor/Illustrations';
import { NeedsVerifyBadge } from '@/components/NeedsVerifyBadge';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import { MAX_STARS_DISPLAY } from './constants';

/** 掌握度最低的單字，直接列出來當複習清單 */
export function WeakestWords({ limit = 10 }: { limit?: number }) {
  const { t, L } = useT();
  const cards = useProgressStore((s) => s.cards);
  const showNeedsVerify = useSettingsStore((s) => s.showNeedsVerify);
  const weak = useMemo(() => weakestWords(cards, limit), [cards, limit]);

  if (weak.length === 0) {
    return <EmptyState title={t('weakestEmpty')} hint={t('weakestEmptyHint')} />;
  }

  return (
    <ol className="space-y-2">
      {weak.map(({ word, stars, lapses }) => (
        <li
          key={word.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-surface-2 px-4 py-2.5"
        >
          <span lang="es" className="break-es font-extrabold text-body">{word.es}</span>
          <span className="text-sm text-muted">{L(word.gloss)}</span>
          {word.regional?.needsVerify && showNeedsVerify ? <NeedsVerifyBadge /> : null}

          <span className="ml-auto flex shrink-0 items-center gap-2">
            {lapses > 0 ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-error-700 dark:text-error-300">
                <RotateCcw aria-hidden="true" className="size-3.5" />
                {t('weakestLapses', { n: lapses })}
              </span>
            ) : null}
            <span className="flex" aria-label={`${stars} / ${MAX_STARS_DISPLAY}`}>
              {Array.from({ length: MAX_STARS_DISPLAY }, (_, i) => (
                <Star
                  key={i}
                  aria-hidden="true"
                  className={cn(
                    'size-3.5',
                    i < stars ? 'fill-accent-400 text-accent-400' : 'text-ink-300 dark:text-ink-600',
                  )}
                />
              ))}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
