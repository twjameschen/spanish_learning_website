import { useMemo, useState } from 'react';
import { heatmapCells, type HeatCell } from '@/lib/dashboard';
import { useProgressStore } from '@/store/useProgressStore';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * GitHub 風格的練習熱力圖。
 *
 * 用 CSS grid 而不是 SVG：格子是固定尺寸的方塊，不需要跟著容器縮放，
 * 這樣在窄畫面上只會少看到幾週，而不是把每個方塊壓成一條線。
 */
const LEVEL_CLASS: Record<HeatCell['level'], string> = {
  0: 'bg-surface-2',
  1: 'bg-primary-200 dark:bg-primary-900',
  2: 'bg-primary-300 dark:bg-primary-700',
  3: 'bg-primary-400 dark:bg-primary-500',
  4: 'bg-primary-600',
};

export function Heatmap({ weeks = 26 }: { weeks?: number }) {
  const { t } = useT();
  const dailyStats = useProgressStore((s) => s.dailyStats);
  const [hover, setHover] = useState<HeatCell | null>(null);
  const cells = useMemo(() => heatmapCells(dailyStats, weeks), [dailyStats, weeks]);

  const activeCount = cells.filter((c) => !c.future && c.level > 0).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('heatmapActiveDays', { n: activeCount })}</p>

      {/* 直行是一週，橫列是星期幾；窄畫面就左右捲 */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-1"
          role="img"
          aria-label={t('heatmapActiveDays', { n: activeCount })}
        >
          {cells.map((cell) => (
            <div
              key={cell.day}
              onMouseEnter={() => setHover(cell)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                'size-3 rounded-[3px] transition-colors',
                cell.future ? 'bg-transparent' : LEVEL_CLASS[cell.level],
                !cell.future && 'hover:ring-2 hover:ring-primary-400',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="min-h-4 font-mono">
          {hover && !hover.future
            ? t('heatmapTooltip', { day: hover.day, xp: hover.xp, n: hover.answered })
            : ''}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {t('heatmapLess')}
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={cn('size-3 rounded-[3px]', LEVEL_CLASS[l])} />
          ))}
          {t('heatmapMore')}
        </span>
      </div>
    </div>
  );
}
