import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { evaluateAchievements, type AchievementTier } from '@/lib/achievements';
import { iconFor, type AchievementIcon } from '@/lib/achievementIcons';
import { buildAchievementSnapshot } from '@/lib/snapshotProgress';
import { useProgressStore } from '@/store/useProgressStore';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

const TIER_STYLE: Record<AchievementTier, string> = {
  bronze: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-100',
  silver: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/50 dark:text-secondary-100',
  gold: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-100',
};

const TIER_LABEL: Record<AchievementTier, { zh: string; en: string }> = {
  bronze: { zh: '銅', en: 'Bronze' },
  silver: { zh: '銀', en: 'Silver' },
  gold: { zh: '金', en: 'Gold' },
};

function AchievementBadgeIcon({ name, className }: { name: AchievementIcon; className?: string }) {
  const Icon = iconFor(name);
  return <Icon aria-hidden="true" className={className} />;
}

export function AchievementsPage() {
  const { t, L, locale } = useT();
  // 訂閱這些讓解鎖狀態即時更新
  const cards = useProgressStore((s) => s.cards);
  const lessons = useProgressStore((s) => s.lessons);
  const totalXp = useProgressStore((s) => s.totalXp);

  const statuses = useMemo(
    () => evaluateAchievements(buildAchievementSnapshot()),
    [cards, lessons, totalXp],
  );

  const unlocked = statuses.filter((s) => s.unlocked).length;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-body">
          {t('achievementsTitle')}
        </h1>
        <p className="text-sm text-muted">
          {t('achievementsProgress', { done: unlocked, total: statuses.length })}
        </p>
        <Progress value={(unlocked / statuses.length) * 100} className="mt-2" />
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {statuses.map(({ achievement, value, target, ratio, unlocked: got }) => (
          <li
            key={achievement.id}
            className={cn(
              'rounded-3xl border p-4 transition-all duration-200',
              got
                ? 'border-line/70 bg-surface shadow-soft'
                : 'border-dashed border-line bg-surface/50',
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-2xl',
                  got ? TIER_STYLE[achievement.tier] : 'bg-surface-2 text-muted/60',
                )}
              >
                <AchievementBadgeIcon name={achievement.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className={cn('font-extrabold', got ? 'text-body' : 'text-muted')}>
                    {L(achievement.name)}
                  </p>
                  <Badge variant={got ? 'accent' : 'outline'}>
                    {TIER_LABEL[achievement.tier][locale]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {L(achievement.description)}
                </p>
                {got ? null : (
                  <div className="mt-2 space-y-1">
                    <Progress value={ratio * 100} flow={false} className="h-1.5" />
                    <p className="text-right font-mono text-[11px] text-muted">
                      {Math.min(value, target)} / {target}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
