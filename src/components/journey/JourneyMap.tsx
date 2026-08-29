import { Lock, Check, MapPin } from 'lucide-react';
import { journey, getLesson } from '@/content';
import { useProgressStore } from '@/store/useProgressStore';
import { useT } from '@/i18n';
import { hrefFor } from '@/lib/router';
import { cn } from '@/lib/utils';

/**
 * 旅程地圖：台北 → 邁阿密 → 基多 → 昆卡 → 加拉巴哥。
 *
 * 手繪風的做法是用虛線航線 + 微微偏移的城市節點，
 * 而不是把五個圓點排成一條直線 —— 直線看起來像進度條，不像地圖。
 * 座標刻意寫死：這是一張特定的旅程圖，不是通用的地圖元件。
 *
 * 為什麼節點與城市名是 HTML 而不是 SVG 的 <circle>／<text>：
 * viewBox 會把裡面的東西連同文字一起縮放，容器一寬字就跟著爆大
 * （實測 860px 寬時 3.6 單位的字被放成 31px）。
 * 只有航線留在 SVG 裡（弧線用 HTML 畫不出來），並加 non-scaling-stroke
 * 讓線寬不受非等比縮放影響；其餘一律用百分比定位的 HTML，
 * 字級與節點大小就跟容器寬度無關了。
 */

interface StopVisual {
  /** 容器寬度的百分比 */
  x: number;
  /** 容器高度的百分比 */
  y: number;
}

const LAYOUT: Record<string, StopVisual> = {
  taipei: { x: 10, y: 32 },
  miami: { x: 32, y: 14 },
  quito: { x: 54, y: 44 },
  cuenca: { x: 73, y: 70 },
  galapagos: { x: 91, y: 40 },
};

/** 兩點之間的弧線（航線感），控制點往上拱 */
function arc(from: StopVisual, to: StopVisual): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - Math.abs(to.x - from.x) * 0.5;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export function JourneyMap() {
  const { t, L } = useT();
  const lessons = useProgressStore((s) => s.lessons);
  const completed = new Set(Object.keys(lessons));

  const stops = journey.map((stop) => {
    const total = stop.lessonIds.length;
    const done = stop.lessonIds.filter((id) => completed.has(id)).length;
    return { stop, total, done, cleared: total > 0 && done === total, open: total > 0 };
  });

  // 前一站通關才解鎖下一站
  const unlocked = stops.map((s, i) => (i === 0 ? s.open : stops[i - 1]!.cleared && s.open));

  return (
    <div className="space-y-4">
      <div className="relative h-52 w-full sm:h-60" role="img" aria-label={t('journeyTitle')}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          {stops.slice(0, -1).map((s, i) => {
            const from = LAYOUT[s.stop.city]!;
            const to = LAYOUT[stops[i + 1]!.stop.city]!;
            const travelled = s.cleared;
            return (
              <path
                key={s.stop.city}
                d={arc(from, to)}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth={travelled ? 2.5 : 2}
                strokeLinecap="round"
                strokeDasharray={travelled ? undefined : '5 6'}
                className={travelled ? 'stroke-primary-500' : 'stroke-ink-300 dark:stroke-ink-600'}
              />
            );
          })}
        </svg>

        {stops.map(({ stop, done, total, cleared }, i) => {
          const pos = LAYOUT[stop.city]!;
          const isOpen = unlocked[i]!;
          return (
            <div
              key={stop.city}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <span
                className={cn(
                  'grid size-10 place-items-center rounded-full border-2 text-[11px] font-extrabold tabular-nums transition-colors',
                  cleared
                    ? 'border-primary-500 bg-primary-500 text-ink-900'
                    : isOpen
                      ? 'border-primary-400 bg-surface text-primary-800 dark:text-primary-300'
                      : 'border-ink-300 bg-surface-2 text-muted dark:border-ink-600',
                )}
              >
                {cleared ? <Check aria-hidden="true" className="size-5" /> : total > 0 ? `${done}/${total}` : '—'}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-[11px] font-extrabold sm:text-xs',
                  isOpen ? 'text-body' : 'text-muted',
                )}
              >
                {L(stop.name)}
              </span>
            </div>
          );
        })}
      </div>

      <ol className="space-y-2">
        {stops.map(({ stop, done, total, cleared }, i) => {
          const isOpen = unlocked[i]!;
          const firstUndone = stop.lessonIds.find((id) => !completed.has(id) && getLesson(id));
          const href = isOpen && firstUndone
            ? hrefFor({ name: 'lesson', id: firstUndone })
            : hrefFor({ name: 'lessons' });

          return (
            <li key={stop.city}>
              <a
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200',
                  isOpen
                    ? 'bg-surface-2 hover:-translate-y-0.5 hover:shadow-soft'
                    : 'pointer-events-none bg-surface-2/50',
                )}
                aria-disabled={!isOpen}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-xl',
                    cleared ? 'bg-primary-500 text-ink-900'
                      : isOpen ? 'bg-secondary-500 text-ink-900'
                      : 'bg-ink-200 text-ink-400 dark:bg-ink-700',
                  )}
                >
                  {cleared ? <Check aria-hidden="true" className="size-4" />
                    : isOpen ? <MapPin aria-hidden="true" className="size-4" />
                    : <Lock aria-hidden="true" className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block font-bold', isOpen ? 'text-body' : 'text-muted')}>
                    {L(stop.name)}
                    <span lang="es" className="ml-2 text-xs font-semibold text-muted">
                      {stop.nameEs}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted">{L(stop.blurb)}</span>
                </span>
                <span className="shrink-0 text-xs font-bold text-muted">
                  {total > 0 ? `${done}/${total}` : t('notOpenYet')}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
