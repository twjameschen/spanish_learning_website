import { useState } from 'react';
import { CalendarCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { EmptyState } from '@/components/decor/Illustrations';
import { allLessons } from '@/content';
import { dueEntries } from '@/store/useProgressStore';
import { hrefFor } from '@/lib/router';
import { useT } from '@/i18n';
import type { Exercise } from '@/content/schema';

/**
 * 每日複習：由 FSRS 排程決定今天要練什麼，跨課程混在一起。
 *
 * 卡片 key 分兩種：`x:<exerciseId>` 直接對回題目；
 * `w:<wordId>` 是單字卡，對回**該單字出現過的閃卡題**。
 * 找不到對應題目的卡片就跳過 —— 那通常是內容改版後留下的孤兒卡片，
 * 不該讓它把整個佇列卡住。
 */
function buildQueue(): Exercise[] {
  const byExerciseId = new Map<string, Exercise>();
  const flashcardByWord = new Map<string, Exercise>();
  for (const lesson of allLessons) {
    for (const ex of lesson.exercises) {
      byExerciseId.set(ex.id, ex);
      if (ex.type === 'flashcard') flashcardByWord.set(ex.wordId, ex);
    }
  }

  const queue: Exercise[] = [];
  const seen = new Set<string>();
  for (const entry of dueEntries()) {
    const ex = entry.isWord ? flashcardByWord.get(entry.id) : byExerciseId.get(entry.id);
    if (!ex || seen.has(ex.id)) continue;
    seen.add(ex.id);
    queue.push(ex);
  }
  return queue;
}

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
