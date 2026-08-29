import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { xpSeries, masteryByPos, accuracyByType } from '@/lib/dashboard';
import { useProgressStore } from '@/store/useProgressStore';
import { POS_LABEL } from '@/content';
import { EXERCISE_TYPE_LABEL, MAX_STARS_DISPLAY } from './constants';
import { useT } from '@/i18n';
import { EmptyState } from '@/components/decor/Illustrations';

/**
 * recharts 的圖表。
 *
 * 座標軸與提示框的文字一律走 useT()，切語言時要跟著換；
 * 顏色用 CSS 變數取不到（recharts 需要實際色值），所以這裡寫死品牌色，
 * 並各自準備深色模式的對比色。
 */
const PRIMARY = '#FF8A5B';
const SECONDARY = '#4ECDC4';

/** 圖表沒有資料時，畫空狀態而不是一張空座標軸 */
function useHasData(n: number): boolean {
  return n > 0;
}

export function XpChart({ days = 30 }: { days?: number }) {
  const { t } = useT();
  const dailyStats = useProgressStore((s) => s.dailyStats);
  const data = useMemo(() => xpSeries(dailyStats, days), [dailyStats, days]);
  const has = useHasData(data.reduce((n, p) => n + p.xp, 0));

  if (!has) return <EmptyState title={t('chartNoData')} hint={t('chartNoDataHint')} />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-line" />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-muted"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted" width={44} />
          <Tooltip
            contentStyle={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.08)', fontSize: 13 }}
            labelFormatter={(d) => String(d)}
            formatter={(v: number, name) => [
              v, name === 'total' ? t('chartCumulativeXp') : t('chartDailyXp'),
            ]}
          />
          <Line type="monotone" dataKey="total" stroke={PRIMARY} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="xp" stroke={SECONDARY} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PosRadar() {
  const { t, L } = useT();
  const cards = useProgressStore((s) => s.cards);
  const stats = useMemo(() => masteryByPos(cards), [cards]);

  if (stats.length < 3) {
    // 少於三個軸畫不成雷達（會退化成線段），改提示繼續練
    return <EmptyState title={t('radarNeedsMore')} hint={t('radarNeedsMoreHint')} />;
  }

  const data = stats.map((s) => ({
    label: L(POS_LABEL[s.pos]),
    stars: Number(s.stars.toFixed(2)),
    count: s.count,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="currentColor" className="text-line" />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted" />
          <PolarRadiusAxis domain={[0, MAX_STARS_DISPLAY]} tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted" />
          <Tooltip
            contentStyle={{ borderRadius: 16, border: '1px solid rgba(0,0,0,.08)', fontSize: 13 }}
            formatter={(v: number, _n, item) => [
              t('radarTooltip', { stars: v, n: (item?.payload as { count: number }).count }), '',
            ]}
          />
          <Radar dataKey="stars" stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TypeAccuracy() {
  const { t, L } = useT();
  const recentLog = useProgressStore((s) => s.recentLog);
  const stats = useMemo(() => accuracyByType(recentLog), [recentLog]);

  if (stats.length === 0) return <EmptyState title={t('chartNoData')} hint={t('chartNoDataHint')} />;

  return (
    <ul className="space-y-2.5">
      {stats.map((s) => (
        <li key={s.type} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-bold text-body">{L(EXERCISE_TYPE_LABEL[s.type])}</span>
            <span className="font-mono text-xs text-muted">
              {s.correct}/{s.total} · {Math.round(s.accuracy * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary-500 transition-[width] duration-500"
              style={{ width: `${Math.round(s.accuracy * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
