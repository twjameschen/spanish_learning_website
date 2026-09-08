import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExercisePlayer, type PlayerResult } from '@/components/exercises/ExercisePlayer';
import { EmptyState, BrokenSignpost } from '@/components/decor/Illustrations';
import { getLesson, lessonNeighbours } from '@/content';
import { useProgressStore } from '@/store/useProgressStore';
import { hrefFor } from '@/lib/router';
import { useT } from '@/i18n';

export function PracticePage({ lessonId }: { lessonId: string }) {
  const { t, L } = useT();
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const lesson = getLesson(lessonId);

  if (!lesson) {
    return (
      <EmptyState
        icon={<BrokenSignpost />}
        title={t('lessonNotFound')}
        hint={t('lessonNotFoundHint', { id: lessonId })}
        action={
          <Button asChild variant="outline">
            <a href={hrefFor({ name: 'lessons' })}>
              <ArrowLeft aria-hidden="true" />
              {t('backToLessons')}
            </a>
          </Button>
        }
      />
    );
  }

  const finish = (result: PlayerResult) => {
    completeLesson(lesson.id, result.accuracy);
  };

  /*
   * 練完之後往哪裡去。走 journey 的順序，不是 `lesson.order`
   * —— order 是每個城市各自從 1 開始編的，拿來排全部 41 課會跳級。
   *
   * 連到課文而不是直接連到下一課的練習：新的一課要先讀過文法與陷阱，
   * 直接丟進題目裡只會變成猜。
   */
  const { next } = lessonNeighbours(lesson.id);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <a
          href={hrefFor({ name: 'lesson', id: lesson.id })}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-800 dark:text-primary-300 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {L(lesson.title)}
        </a>
        <h1 className="text-xl font-extrabold tracking-tight text-body">
          {t('practiceTitle')}
        </h1>
      </header>

      {/* key 換掉整組狀態：直接改網址跳到另一課時，index 與作答結果不能留著 */}
      <ExercisePlayer
        key={lesson.id}
        exercises={lesson.exercises}
        lessonId={lesson.id}
        onFinish={finish}
        onExit={() => {
          location.hash = hrefFor({ name: 'lesson', id: lesson.id });
        }}
        {...(next
          ? { nextUp: { title: L(next.title), href: hrefFor({ name: 'lesson', id: next.id }) } }
          : { courseDone: true })}
      />
    </div>
  );
}
