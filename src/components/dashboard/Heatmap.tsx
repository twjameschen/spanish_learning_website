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

      {/*
        直行是一週，橫列是星期幾；窄畫面就左右捲。

        每一格是 button 而不是 div：以前只有 onMouseEnter，
        手機上**沒有任何辦法**看到某一天的 XP 與題數（下面那個 tooltip 欄位
        永遠是空的），鍵盤也到不了任何一格。

        容器刻意**不再**是 `role="img"` —— 那個 role 會讓子元素完全不暴露給
        輔助技術，格子改成 button 之後仍然讀不到，等於白做。
        整體摘要留在上面那行文字裡，本來就讀得到。
      */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1" role="group">
          {cells.map((cell) =>
            // 未來的日期只是把最後一週補滿，不該可以聚焦也沒有東西可看
            cell.future ? (
              <div key={cell.day} className="size-3 rounded-[3px] bg-transparent" />
            ) : (
              <button
                key={cell.day}
                type="button"
                // title 讓桌機的原生 tooltip 也能用；aria-label 給螢幕閱讀器
                title={t('heatmapTooltip', { day: cell.day, xp: cell.xp, n: cell.answered })}
                aria-label={t('heatmapTooltip', { day: cell.day, xp: cell.xp, n: cell.answered })}
                onMouseEnter={() => setHover(cell)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(cell)}
                onBlur={() => setHover(null)}
                // 觸控只有 click，沒有 hover
                onClick={() => setHover(cell)}
                className={cn(
                  'size-3 rounded-[3px] transition-colors',
                  LEVEL_CLASS[cell.level],
                  'hover:ring-2 hover:ring-primary-400',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                )}
              />
            ),
          )}
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
