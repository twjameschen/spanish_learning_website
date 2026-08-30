import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { EmptyState, BrokenSignpost } from '@/components/decor/Illustrations';
import { getLesson, allWords, topicLabel, journey } from '@/content';
import { buildVocabDrill } from '@/lib/vocabDrill';
import { buildGenderDrill, isGenderDrillId, topicFromDrillId } from '@/lib/genderDrill';
import { buildListenDrill, isListenDrillId, scopeFromDrillId } from '@/lib/listenDrill';
import { shuffleSeeded, todaySeed } from '@/lib/shuffle';
import { hrefFor } from '@/lib/router';
import { useT, UI } from '@/i18n';

/**
 * 單字練習（閃卡與陰陽性分類共用這一頁）。
 *
 * `id` 的四種形態：
 * - 課程 id —— 練那一課的 vocabIds
 * - `all` —— 從整個單字表隨機抽
 * - `gender-<主題>` —— 那個主題的一組陰陽性分類
 * - `listen` / `listen-<城市>` —— 連續聽寫，整段或某一段
 *
 * 四種都刻意**不**傳 lessonId 給 ExercisePlayer —— 這不是課程練習，
 * 不該把它算成「完成了這一課」。
 */
const DRILL_SIZE = 20;

/** 用當天日期當種子，同一天抽到的是同一組，隔天才換 —— 每次重整都換一組會學不起來 */
const pickDaily = <T,>(items: T[], n: number): T[] => shuffleSeeded(items, todaySeed()).slice(0, n);

export function DrillPage({ id }: { id: string }) {
  const { t, L } = useT();
  const isAll = id === 'all';
  const genderTopic = isGenderDrillId(id) ? topicFromDrillId(id) : null;
  const listenScope = isListenDrillId(id) ? scopeFromDrillId(id) : null;
  const lesson = isAll || genderTopic || listenScope ? undefined : getLesson(id);

  const exercises = useMemo(() => {
    if (listenScope) return buildListenDrill(listenScope);
    if (genderTopic) {
      const drill = buildGenderDrill(genderTopic);
      return drill ? [drill] : [];
    }
    if (isAll) return buildVocabDrill(pickDaily(allWords.map((w) => w.id), DRILL_SIZE / 2), DRILL_SIZE);
    return lesson ? buildVocabDrill(lesson.vocabIds, DRILL_SIZE) : [];
  }, [genderTopic, listenScope, isAll, lesson]);

  if (!isAll && !genderTopic && !listenScope && !lesson) {
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

  const title = genderTopic
    ? UI.genderDrillTitle
    : listenScope
      ? UI.listenDrillTitle
      : UI.drillTitle;
  const cityName = listenScope
    ? journey.find((stop) => stop.city === listenScope)?.name
    : undefined;
  const description = genderTopic
    ? t('genderDrillDesc', { topic: L(topicLabel(genderTopic)) })
    : listenScope
      ? (cityName
        ? t('listenDrillDescCity', { city: L(cityName), n: exercises.length })
        : t('listenDrillDescAll', { n: exercises.length }))
      : t('drillDesc', { n: exercises.length });

  /*
   * 回上一頁要回到「進來的地方」，不是統一回單字表：
   * 連續聽寫是從首頁（整段）或課程頁（某一段）進來的，
   * 回到單字表對不上使用者剛剛的動線。
   */
  const backRoute: Parameters<typeof hrefFor>[0] = lesson
    ? { name: 'lesson', id: lesson.id }
    : listenScope
      ? (cityName ? { name: 'lessons' } : { name: 'home' })
      : { name: 'vocab' };
  const back = hrefFor(backRoute);
  const backLabel = lesson
    ? L(lesson.title)
    : t(backRoute.name === 'lessons' ? 'navLessons' : backRoute.name === 'home' ? 'navHome' : 'navVocab');

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <a
          href={back}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-800 dark:text-primary-300 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel}
        </a>
        <h1 className="text-xl font-extrabold tracking-tight text-body">{L(title)}</h1>
        <p className="text-sm text-muted">{description}</p>
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
