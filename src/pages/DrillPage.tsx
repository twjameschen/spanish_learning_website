import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { EmptyState, BrokenSignpost } from '@/components/decor/Illustrations';
import { getLesson, allWords, topicLabel } from '@/content';
import { buildVocabDrill } from '@/lib/vocabDrill';
import { buildGenderDrill, isGenderDrillId, topicFromDrillId } from '@/lib/genderDrill';
import { hrefFor } from '@/lib/router';
import { useT } from '@/i18n';

/**
 * 單字練習（閃卡與陰陽性分類共用這一頁）。
 *
 * `id` 的三種形態：
 * - 課程 id —— 練那一課的 vocabIds
 * - `all` —— 從整個單字表隨機抽
 * - `gender-<主題>` —— 那個主題的一組陰陽性分類
 *
 * 三種都刻意**不**傳 lessonId 給 ExercisePlayer —— 這不是課程練習，
 * 不該把它算成「完成了這一課」。
 */
const DRILL_SIZE = 20;

/** 用當天日期當種子，同一天抽到的是同一組，隔天才換 —— 每次重整都換一組會學不起來 */
function pickDaily<T>(items: T[], n: number): T[] {
  const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.slice(0, n);
}

export function DrillPage({ id }: { id: string }) {
  const { t, L } = useT();
  const isAll = id === 'all';
  const genderTopic = isGenderDrillId(id) ? topicFromDrillId(id) : null;
  const lesson = isAll || genderTopic ? undefined : getLesson(id);

  const exercises = useMemo(() => {
    if (genderTopic) {
      const drill = buildGenderDrill(genderTopic);
      return drill ? [drill] : [];
    }
    if (isAll) return buildVocabDrill(pickDaily(allWords.map((w) => w.id), DRILL_SIZE / 2), DRILL_SIZE);
    return lesson ? buildVocabDrill(lesson.vocabIds, DRILL_SIZE) : [];
  }, [genderTopic, isAll, lesson]);

  if (!isAll && !genderTopic && !lesson) {
    return (
      <EmptyState
        icon={<BrokenSignpost />}
        title={t('lessonNotFound')}
        hint={t('lessonNotFoundHint', { id })}
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

  if (exercises.length === 0) {
    return <EmptyState title={t('drillEmpty')} hint={t('drillEmptyHint')} />;
  }

  const back = lesson ? hrefFor({ name: 'lesson', id: lesson.id }) : hrefFor({ name: 'vocab' });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <a
          href={back}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-800 dark:text-primary-300 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {lesson ? L(lesson.title) : t('navVocab')}
        </a>
        <h1 className="text-xl font-extrabold tracking-tight text-body">
          {t(genderTopic ? 'genderDrillTitle' : 'drillTitle')}
        </h1>
        <p className="text-sm text-muted">
          {genderTopic
            ? t('genderDrillDesc', { topic: L(topicLabel(genderTopic)) })
            : t('drillDesc', { n: exercises.length })}
        </p>
      </header>

      {/* key 換掉整組狀態：#/drill/gender-comida 跳到 #/drill/gender-ciudad 要從第一題開始 */}
      <ExercisePlayer
        key={id}
        exercises={exercises}
        onExit={() => { location.hash = back; }}
      />
    </div>
  );
}
