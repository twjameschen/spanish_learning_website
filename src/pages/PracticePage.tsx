import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExercisePlayer, type PlayerResult } from '@/components/exercises/ExercisePlayer';
import { EmptyState, BrokenSignpost } from '@/components/decor/Illustrations';
import { getLesson } from '@/content';
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

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <a
          href={hrefFor({ name: 'lesson', id: lesson.id })}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {L(lesson.title)}
        </a>
        <h1 className="text-xl font-extrabold tracking-tight text-body">
          {t('practiceTitle')}
        </h1>
      </header>

      <ExercisePlayer
        exercises={lesson.exercises}
        lessonId={lesson.id}
        onFinish={finish}
        onExit={() => {
          location.hash = hrefFor({ name: 'lesson', id: lesson.id });
        }}
      />
    </div>
  );
}
