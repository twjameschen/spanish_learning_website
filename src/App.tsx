import { AppShell } from '@/components/layout/AppShell';
import { SideNav, BottomNav } from '@/components/layout/SideNav';
import { HomePage } from '@/pages/HomePage';
import { VocabPage } from '@/pages/VocabPage';
import { LessonListPage, LessonPage } from '@/pages/LessonPage';
import { PracticePage } from '@/pages/PracticePage';
import { ReviewPage } from '@/pages/ReviewPage';
import { CompassLoading } from '@/components/decor/Illustrations';
import { useRoute } from '@/lib/router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/i18n';

export default function App() {
  const { route } = useRoute();
  const { t } = useT();
  const hydrated = useSettingsStore((s) => s.hydrated);

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
      </AppShell>
      <BottomNav current={route} />
    </>
  );
}
