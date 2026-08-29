import { AppShell } from '@/components/layout/AppShell';
import { SideNav, BottomNav } from '@/components/layout/SideNav';
import { HomePage } from '@/pages/HomePage';
import { VocabPage } from '@/pages/VocabPage';
import { LessonListPage, LessonPage } from '@/pages/LessonPage';
import { PracticePage } from '@/pages/PracticePage';
import { ReviewPage } from '@/pages/ReviewPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { CompassLoading } from '@/components/decor/Illustrations';
import { useRoute } from '@/lib/router';
import { useStreakSync } from '@/hooks/useStreakSync';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/i18n';

export default function App() {
  const { route } = useRoute();
  const { t } = useT();
  const hydrated = useSettingsStore((s) => s.hydrated);

  // hook 不能放在 early return 之後，所以在這裡呼叫；內部自己等補水
  useStreakSync();

  if (!hydrated) {
    return (
      <AppShell>
        <div className="grid place-items-center gap-4 py-24 text-center">
          <CompassLoading />
          <p className="text-sm font-semibold text-muted">{t('loadingProgress')}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell sidebar={<SideNav current={route} />}>
        {route.name === 'home' ? <HomePage /> : null}
        {route.name === 'vocab' ? <VocabPage /> : null}
        {route.name === 'lessons' ? <LessonListPage /> : null}
        {route.name === 'lesson' ? <LessonPage id={route.id} /> : null}
        {route.name === 'practice' ? <PracticePage lessonId={route.id} /> : null}
        {route.name === 'review' ? <ReviewPage /> : null}
        {route.name === 'achievements' ? <AchievementsPage /> : null}
      </AppShell>
      <BottomNav current={route} />
      <CelebrationOverlay />
    </>
  );
}
