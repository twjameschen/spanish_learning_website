import { AppShell } from '@/components/layout/AppShell';
import { SideNav, BottomNav } from '@/components/layout/SideNav';
import { HomePage } from '@/pages/HomePage';
import { VocabPage } from '@/pages/VocabPage';
import { VerbListPage, VerbPage } from '@/pages/VerbPage';
import { LessonListPage, LessonPage } from '@/pages/LessonPage';
import { PracticePage } from '@/pages/PracticePage';
import { ReviewPage } from '@/pages/ReviewPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DrillPage } from '@/pages/DrillPage';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { CompassLoading } from '@/components/decor/Illustrations';
import { useEffect } from 'react';
import { useRoute } from '@/lib/router';
import { stopSpeaking } from '@/lib/speech';
import { useStreakSync } from '@/hooks/useStreakSync';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/i18n';

export default function App() {
  const { route } = useRoute();
  const { t } = useT();
  const hydrated = useSettingsStore((s) => s.hydrated);

  // hook 不能放在 early return 之後，所以在這裡呼叫；內部自己等補水
  useStreakSync();

  // 分頁標題與 <html lang> —— 兩個都要跟著路由與語言走，不能寫死在 index.html
  useDocumentMeta(route);

  /*
   * 換頁就停止發音。
   *
   * 沒有這一段的話，單字表點了喇叭之後切走，那一句會繼續唸完蓋在新畫面上
   * （`SpeakButton` 自己沒有 cleanup，而 `speak()` 只在**再按一次**時取消）。
   * 聽力題自己的 cleanup 只管得到它自己卸載的情況。
   */
  useEffect(() => stopSpeaking, [route]);

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
        {route.name === 'verbs' ? <VerbListPage /> : null}
        {route.name === 'verb' ? <VerbPage id={route.id} /> : null}
        {route.name === 'lessons' ? <LessonListPage /> : null}
        {route.name === 'lesson' ? <LessonPage id={route.id} /> : null}
        {route.name === 'practice' ? <PracticePage lessonId={route.id} /> : null}
        {route.name === 'review' ? <ReviewPage /> : null}
        {route.name === 'achievements' ? <AchievementsPage /> : null}
        {route.name === 'dashboard' ? <DashboardPage /> : null}
        {route.name === 'drill' ? <DrillPage id={route.id} /> : null}
      </AppShell>
      <BottomNav current={route} />
      <CelebrationOverlay />
      <ShortcutsHelp />
    </>
  );
}
