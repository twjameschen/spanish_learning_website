import { useState } from 'react';
import { CalendarCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { EmptyState } from '@/components/decor/Illustrations';
import { dueEntries } from '@/store/useProgressStore';
import { resolveCardKeys } from '@/lib/cardResolve';
import { hrefFor } from '@/lib/router';
import { useT } from '@/i18n';
import type { Exercise } from '@/content/schema';

/**
 * 每日複習：由 FSRS 排程決定今天要練什麼，跨課程混在一起。
 *
 * 解析交給 `resolveCardKey`。這裡原本就地寫了一段簡化版，只認得課文裡
 * 手寫的題目與手寫的閃卡 —— 但內容裡只有 5 題手寫閃卡，而單字閃卡練習
 * 會為**任何**單字建立 `w:` 卡片，於是首頁說「今天要複習 20 張」、
 * 點進來卻只剩幾張。四種來源現在都對得回去了。
 */
const buildQueue = (): Exercise[] => resolveCardKeys(dueEntries().map((e) => e.key));

export function ReviewPage() {
  const { t } = useT();
  /*
   * 佇列在進入頁面時**拍一次快照**就固定下來。
   * 若跟著 cards 變動重算，每答完一題剛排進學習階段的卡片就會立刻補回佇列尾巴，
   * 這一輪永遠練不完。答完之後重新進入這一頁才會拿到新的佇列。
   */
  const [queue] = useState(() => buildQueue());

  if (queue.length === 0) {
    return (
      <div className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-body">{t('reviewTitle')}</h1>
        </header>
        <EmptyState
          title={t('reviewEmpty')}
          hint={t('reviewEmptyHint')}
          action={
            <Button asChild variant="primary">
              <a href={hrefFor({ name: 'lessons' })}>
                <Sparkles aria-hidden="true" />
                {t('goToLessons')}
              </a>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-body">
          <CalendarCheck aria-hidden="true" className="size-6 text-secondary-600" />
          {t('reviewTitle')}
        </h1>
        <p className="text-sm text-muted">{t('reviewSubtitle', { n: queue.length })}</p>
      </header>

      <ExercisePlayer
        exercises={queue}
        onExit={() => {
          location.hash = hrefFor({ name: 'home' });
        }}
      />
    </div>
  );
}
