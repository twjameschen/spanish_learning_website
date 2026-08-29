import { useEffect, useMemo, useState } from 'react';
import { BookMarked, GraduationCap, Sparkles, Camera, ArrowRight, CalendarCheck, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BackupControls } from '@/components/BackupControls';
import { StreakCard } from '@/components/StreakCard';
import { JourneyMap } from '@/components/journey/JourneyMap';
import { EmptyState } from '@/components/decor/Illustrations';
import { SunMotif } from '@/components/decor/Patterns';
import { useStorageTier } from '@/hooks/useStorageTier';
import { takeSnapshot, listSnapshots, type SnapshotMeta } from '@/lib/snapshot';
import { useProgressStore, dueTodayCount } from '@/store/useProgressStore';
import { levelProgress } from '@/lib/xp';
import { evaluateAchievements } from '@/lib/achievements';
import { buildAchievementSnapshot } from '@/lib/snapshotProgress';
import { hrefFor } from '@/lib/router';
import { useT } from '@/i18n';
import type { UIKey } from '@/i18n';
import { allWords, allLessons, journey } from '@/content';
import type { StorageTier } from '@/lib/storage';

const TIER_TEXT: Record<
  StorageTier,
  { labelKey?: UIKey; label?: string; noteKey: UIKey; variant: 'success' | 'accent' | 'error' }
> = {
  idb: { label: 'IndexedDB', noteKey: 'storageIdb', variant: 'success' },
  local: { label: 'localStorage', noteKey: 'storageLocal', variant: 'accent' },
  memory: { labelKey: 'memoryLabel', noteKey: 'storageMemory', variant: 'error' },
};

export function HomePage() {
  const { t } = useT();
  const tier = useStorageTier();
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const cards = useProgressStore((s) => s.cards);
  const totalXp = useProgressStore((s) => s.totalXp);
  const lessonProgress = useProgressStore((s) => s.lessons);
  const dueCount = useMemo(() => dueTodayCount(), [cards]);
  const level = levelProgress(totalXp);

  const achievements = useMemo(
    () => evaluateAchievements(buildAchievementSnapshot()),
    [cards, lessonProgress, totalXp],
  );
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalAchievements = achievements.length;

  useEffect(() => {
    let alive = true;
    void takeSnapshot()
      .then(() => listSnapshots())
      .then((m) => { if (alive) setSnapshots(m); });
    return () => { alive = false; };
  }, []);

  const openStops = journey.filter((s) => s.lessonIds.length > 0);
  const exerciseCount = allLessons.reduce((n, l) => n + l.exercises.length, 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-400 to-accent-400 p-6 text-white shadow-lift sm:p-9">
        <SunMotif className="absolute -right-10 -top-10 size-64 text-white/25" />
        <div className="relative space-y-3">
          <Badge variant="accent" className="bg-white/25 text-white">
            <Sparkles aria-hidden="true" />
            Phase 4 · A0
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('heroTitle')}
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-white/90 sm:text-base">
            {t('heroBody')}
          </p>
          <div className="max-w-sm pt-2">
            <div className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-white/90">
              <span>{t('progress')}</span>
              <span>Phase 4 / 7</span>
            </div>
            <Progress value={(4 / 7) * 100} className="bg-white/25" />
          </div>
        </div>
      </section>

      {/* 今日複習：有到期卡片時才顯示，沒有就不佔版面 */}
      {dueCount > 0 ? (
        <a href={hrefFor({ name: 'review' })} className="group block">
          <Card className="border-secondary-300 bg-secondary-50 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift dark:border-secondary-800 dark:bg-secondary-900/25">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary-500 text-ink-900">
                  <CalendarCheck aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>{t('dueToday', { n: dueCount })}</CardTitle>
                <ArrowRight aria-hidden="true" className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-1" />
              </div>
            </CardHeader>
          </Card>
        </a>
      ) : null}

      {/* 連續天數與等級：連續天數一律顯示（第 0 天也要看得到目標），等級有 XP 才顯示。
          還沒有 XP 時等級卡不存在，streak 卡就整列鋪滿，避免右半邊空一塊。 */}
      <div className={totalXp > 0 ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
        <StreakCard />
        {totalXp > 0 ? (
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-extrabold text-body">Lv. {level.level}</span>
                <span className="font-semibold text-muted">
                  {level.intoLevel} / {level.levelSpan} XP
                </span>
              </div>
              <Progress value={level.ratio * 100} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a href={hrefFor({ name: 'vocab' })} className="group">
          <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary-500 text-ink-900">
                  <BookMarked aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>{t('navVocab')}</CardTitle>
                <ArrowRight aria-hidden="true" className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>{t('vocabCardDesc', { n: allWords.length })}</CardDescription>
            </CardHeader>
          </Card>
        </a>

        <a href={hrefFor({ name: 'lessons' })} className="group">
          <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary-500 text-white">
                  <GraduationCap aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>{t('navLessons')}</CardTitle>
                <ArrowRight aria-hidden="true" className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                {t('lessonsCardDesc', { l: allLessons.length, e: exerciseCount })}
              </CardDescription>
            </CardHeader>
          </Card>
        </a>

        <a href={hrefFor({ name: 'achievements' })} className="group sm:col-span-2 lg:col-span-1">
          <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-accent-400 text-ink-900">
                  <Trophy aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>{t('achievementsTitle')}</CardTitle>
                <ArrowRight aria-hidden="true" className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                {t('achievementsProgress', { done: unlockedCount, total: totalAchievements })}
              </CardDescription>
            </CardHeader>
          </Card>
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('journeyMapTitle')}</CardTitle>
          <CardDescription>{t('journeyDesc', { n: openStops.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <JourneyMap />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t('storageTitle')}</CardTitle>
            {tier ? (
              <Badge variant={TIER_TEXT[tier].variant}>
                {TIER_TEXT[tier].label ?? t(TIER_TEXT[tier].labelKey!)}
              </Badge>
            ) : null}
          </div>
          <CardDescription>
            {tier ? t(TIER_TEXT[tier].noteKey) : t('storageDetecting')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BackupControls />
          {snapshots.length === 0 ? (
            <EmptyState title={t('snapshotEmpty')} hint={t('snapshotEmptyHint')} />
          ) : (
            <ul className="space-y-2">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5">
                  <Camera aria-hidden="true" className="size-4 text-secondary-600" />
                  <span className="font-mono text-sm font-semibold text-body">{s.day}</span>
                  <span className="ml-auto text-xs text-muted">
                    {t('entries', { n: s.entries })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
