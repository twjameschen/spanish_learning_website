import { Flame, Snowflake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { localDayKey } from '@/lib/utils';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/** 連續天數 + 今日目標進度 */
export function StreakCard() {
  const { t } = useT();
  const streak = useProgressStore((s) => s.streak);
  const dailyStats = useProgressStore((s) => s.dailyStats);
  const goal = useSettingsStore((s) => s.dailyGoal);

  const today = dailyStats[localDayKey()];
  const minutesDone = Math.floor((today?.seconds ?? 0) / 60);
  const ratio = Math.min(1, minutesDone / goal);
  const met = minutesDone >= goal;

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-2xl',
              streak.current > 0
                ? 'bg-primary-500 text-white'
                : 'bg-surface-2 text-muted',
            )}
          >
            <Flame aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-body">
              {streak.current > 0 ? t('streakDays', { n: streak.current }) : t('streakNone')}
            </p>
            <p className="text-xs text-muted">
              {met ? t('dailyGoalMet') : t('dailyGoalProgress', { done: minutesDone, goal })}
            </p>
          </div>
          {streak.freezes > 0 ? (
            <span
              className="flex shrink-0 items-center gap-1 rounded-2xl bg-secondary-100 px-2.5 py-1 text-xs font-bold text-secondary-800 dark:bg-secondary-900/50 dark:text-secondary-100"
              title={t('freezeExplain')}
            >
              <Snowflake aria-hidden="true" className="size-3.5" />
              {streak.freezes}
            </span>
          ) : null}
        </div>
        <Progress value={ratio * 100} flow={met} />
      </CardContent>
    </Card>
  );
}
