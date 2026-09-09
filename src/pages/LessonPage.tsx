import { ArrowLeft, ArrowRight, TriangleAlert, Volume2, BookOpen, Lock, Play, Layers, Headphones, Check, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Markish, Inline } from '@/components/Markish';
import { RegionalNote } from '@/components/NeedsVerifyBadge';
import { SpeakButton } from '@/components/SpeakButton';
import { EmptyState, BrokenSignpost } from '@/components/decor/Illustrations';
import { AndeanBand } from '@/components/decor/Patterns';
import {
  allLessons, getLesson, getWord, getVerb, journey, lessonNeighbours, orderedLessons,
} from '@/content';
import {
  EXERCISE_TYPE_LABEL, PERSON_LABEL, TENSE_LABEL,
  type Exercise, type GrammarLesson,
} from '@/content/schema';
import { hrefFor } from '@/lib/router';
import { canListenDrill, listenDrillId } from '@/lib/listenDrill';
import { useProgressStore } from '@/store/useProgressStore';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------- *
 * 課程列表
 * -------------------------------------------------------------- */

export function LessonListPage() {
  const { t, L } = useT();
  /*
   * 每一課做過沒有、最好幾分。
   *
   * `completedAt` 與 `bestAccuracy` 從 Phase 4 就寫進去了，但**沒有任何畫面
   * 讀它們** —— 41 課的列表上完全看不出哪些做過、哪些全對。
   * 偏偏有兩個成就就是「在 N 課中全部答對」：app 要你達到一個數字，
   * 卻從來不告訴你單項進度。
   */
  const lessonProgress = useProgressStore((s) => s.lessons);
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-body">{t('lessonsTitle')}</h1>
        <p className="text-sm text-muted">{t('lessonsSubtitle', { n: allLessons.length })}</p>
      </header>

      {journey.map((stop) => {
        const lessons = stop.lessonIds
          .map((id) => getLesson(id))
          .filter((l): l is GrammarLesson => Boolean(l));
        const locked = lessons.length === 0;
        const doneHere = lessons.filter((l) => lessonProgress[l.id]).length;

        return (
          <section
            key={stop.city}
            className="overflow-hidden rounded-3xl border border-line/70 bg-surface shadow-card"
          >
            <AndeanBand className={locked ? 'text-ink-300/40' : 'text-primary-500/50'} />
            <div className="p-5">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-extrabold text-body">{L(stop.name)}</h2>
                <span lang="es" className="text-sm font-semibold text-muted">
                  {stop.nameEs}
                </span>
                <span className="text-xs text-muted">· {L(stop.country)}</span>
                {locked ? (
                  <Badge variant="neutral" className="ml-auto">
                    <Lock aria-hidden="true" />
                    {t('notOpenYet')}
                  </Badge>
                ) : (
                  <Badge
                    variant={doneHere === lessons.length ? 'success' : 'neutral'}
                    className="ml-auto"
                  >
                    {doneHere === lessons.length ? <Check aria-hidden="true" /> : null}
                    {t('lessonsDoneOf', { done: doneHere, n: lessons.length })}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{L(stop.blurb)}</p>

              {/* 這一段的整句聽寫入口。句子湊不滿一場就不顯示 ——
                  台北那六課教的是字母與發音，例句多半是單字與片語 */}
              {!locked && canListenDrill(stop.city) ? (
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <a href={hrefFor({ name: 'drill', id: listenDrillId(stop.city) })}>
                    <Headphones aria-hidden="true" />
                    {t('listenDrillSectionCta')}
                  </a>
                </Button>
              ) : null}

              {locked ? null : (
                <ol className="mt-4 space-y-2">
                  {lessons.map((lesson) => {
                    const progress = lessonProgress[lesson.id];
                    const done = Boolean(progress);
                    return (
                    <li key={lesson.id}>
                      <a
                        href={hrefFor({ name: 'lesson', id: lesson.id })}
                        className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                      >
                        {/* 做過的課用打勾取代序號 —— 一眼看得出還剩哪幾課 */}
                        <span
                          className={cn(
                            'grid size-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold',
                            // 深墨字配淺底 —— 跟隔壁沒做過的序號同一個作法。
                            // success-600 上的白字只有 2.74:1，連圖示的 3:1 都不到
                            done
                              ? 'bg-success-600 text-ink-900'
                              : 'bg-primary-500 text-ink-900',
                          )}
                          title={done ? t('lessonDone') : undefined}
                        >
                          {done ? (
                            <>
                              <Check aria-hidden="true" className="size-4" />
                              <span className="sr-only">{t('lessonDone')}</span>
                            </>
                          ) : (
                            lesson.order
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-body">
                            {L(lesson.title)}
                          </span>
                          <span className="block text-xs text-muted">
                            {t('rulesAndExercises', {
                              r: lesson.rules.length,
                              e: lesson.exercises.length,
                            })}
                          </span>
                        </span>
                        {/* 全對過的課另外標出來 —— 有兩個成就就是在數這個 */}
                        {progress && progress.bestAccuracy >= 1 ? (
                          <Badge variant="accent" className="ml-auto shrink-0">
                            <Target aria-hidden="true" />
                            {t('lessonPerfect')}
                          </Badge>
                        ) : progress ? (
                          <span className="ml-auto shrink-0 text-xs font-bold text-muted">
                            {t('lessonBest', { p: Math.round(progress.bestAccuracy * 100) })}
                          </span>
                        ) : null}
                        <ArrowRight
                          aria-hidden="true"
                          className={cn('size-4 shrink-0 text-muted', done ? '' : 'ml-auto')}
                        />
                      </a>
                    </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- *
 * 單一課程
 * -------------------------------------------------------------- */

function ExamplePair({ es, gloss, note }: { es: string; gloss: string; note?: string | undefined }) {
  return (
    <li className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
      <p lang="es" className="break-es font-bold text-body">
        {es}
        <SpeakButton text={es} className="ml-1.5" />
      </p>
      <p className="mt-0.5 text-sm text-muted">{gloss}</p>
      {note ? (
        <p className="mt-1 text-xs leading-relaxed text-secondary-800 dark:text-secondary-300">
          {note}
        </p>
      ) : null}
    </li>
  );
}

/** 題目在這一頁只列出來給你看，不作答 —— 答題流程屬於 Phase 3 */
function ExercisePreview({ ex }: { ex: Exercise }) {
  const { t, L } = useT();

  const body = (() => {
    switch (ex.type) {
      case 'flashcard': {
        const w = getWord(ex.wordId);
        return (
          <p className="text-sm text-body">
            {ex.direction === 'es-zh' ? (
              <>
                <span lang="es" className="font-bold">{w?.es}</span>
                {' → '}
                {w ? L(w.gloss) : ''}
              </>
            ) : (
              <>
                {w ? L(w.gloss) : ''} → <span lang="es" className="font-bold">{w?.es}</span>
              </>
            )}
          </p>
        );
      }
      case 'mcq':
        return (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-body">
              <Inline text={L(ex.prompt)} />
            </p>
            <ol className="space-y-1">
              {ex.options.map((opt, i) => (
                <li
                  key={i}
                  className={
                    i === ex.answerIndex
                      ? 'rounded-xl bg-success-100 px-2.5 py-1 text-sm font-bold text-success-800 dark:bg-success-700/30 dark:text-success-100'
                      : 'px-2.5 py-1 text-sm text-muted'
                  }
                >
                  {L(opt)}
                </li>
              ))}
            </ol>
          </div>
        );
      case 'conjugation': {
        const v = getVerb(ex.verbId);
        return (
          <p className="text-sm text-body">
            <span lang="es" className="font-bold">{v?.es}</span>
            {' · '}
            {PERSON_LABEL[ex.person].es}
            {' · '}
            {L(TENSE_LABEL[ex.tense].label)}
            {' → '}
            <span lang="es" className="font-bold text-success-800 dark:text-success-200">
              {ex.answer}
            </span>
          </p>
        );
      }
      case 'translate':
        return (
          <p className="text-sm text-body">
            <Inline text={L(ex.prompt)} /> →{' '}
            <span lang="es" className="font-bold text-success-800 dark:text-success-200">
              {ex.canonical}
            </span>
          </p>
        );
      case 'wordOrder':
        return (
          <p className="text-sm text-body">
            <Inline text={L(ex.prompt)} /> →{' '}
            <span lang="es" className="font-bold">{ex.answer.join(' ')}</span>
          </p>
        );
      case 'listening':
        return (
          <p className="flex flex-wrap items-center gap-2 text-sm text-body">
            <Volume2 aria-hidden="true" className="size-4 shrink-0 text-secondary-600" />
            <span lang="es" className="font-bold">{ex.es}</span>
            <span className="text-muted">／ {L(ex.gloss)}</span>
          </p>
        );
      case 'genderSort':
        return (
          <p className="flex flex-wrap gap-1.5">
            {ex.wordIds.map((id) => {
              const w = getWord(id);
              return (
                <Badge key={id} variant={w?.gender === 'm' ? 'primary' : 'secondary'}>
                  <span lang="es">
                    {w?.gender === 'm' ? 'el' : 'la'} {w?.es}
                  </span>
                </Badge>
              );
            })}
          </p>
        );
    }
  })();

  const diffKey =
    ex.difficulty === 'hard' ? 'difficultyHard'
    : ex.difficulty === 'easy' ? 'difficultyEasy'
    : 'difficultyMedium';

  return (
    <li className="rounded-2xl border border-line/60 bg-surface p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline">{L(EXERCISE_TYPE_LABEL[ex.type])}</Badge>
        <Badge
          variant={
            ex.difficulty === 'hard' ? 'error' : ex.difficulty === 'easy' ? 'success' : 'neutral'
          }
        >
          {t(diffKey)}
        </Badge>
      </div>
      {body}
      <details className="mt-2.5">
        <summary className="cursor-pointer text-xs font-bold text-primary-800 dark:text-primary-300 hover:underline">
          {t('wrongAnswerExplain')}
        </summary>
        <div className="mt-1.5 text-sm text-muted">
          <Markish text={L(ex.explain)} />
        </div>
      </details>
    </li>
  );
}

export function LessonPage({ id }: { id: string }) {
  const { t, L, Lo } = useT();
  const lesson = getLesson(id);

  if (!lesson) {
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

  /*
   * 用 journey 的順序，不是 lesson.order。
   *
   * order 是每個城市各自從 1 開始編的（41 課只有 13 個相異值），
   * 拿它排全部課程會把五個城市的第 1 課排在一起 ——
   * 於是「A0 第 1 課」的下一課變成 A1 的反身動詞、
   * 上一課變成 B1 的過去虛擬式。初學者照著按就直接掉出 A0。
   */
  const { prev, next } = lessonNeighbours(lesson.id);
  const lessonNo = orderedLessons.findIndex((l) => l.id === lesson.id) + 1;
  const pitfalls = Lo(lesson.pitfalls);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <a
          href={hrefFor({ name: 'lessons' })}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-800 dark:text-primary-300 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('backToLessons')}
        </a>
        <div className="flex flex-wrap items-center gap-2">
          {/*
            * 正式順序的位置，不是 `lesson.order`。
            *
            * order 是每個城市各自從 1 開始編的。課程列表印它沒問題 ——
            * 那裡的課排在城市標題底下 —— 但這顆徽章旁邊沒有城市，
            * 只寫「第 13 課」會跟首頁的「繼續：第 25 課」對不起來，
            * 同一課在兩個畫面上有兩個編號。
            */}
          <Badge variant="primary">
            {t('lessonNoOf', { n: lessonNo, total: orderedLessons.length })}
          </Badge>
          <Badge variant="neutral">{lesson.level}</Badge>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-body sm:text-3xl">
          {L(lesson.title)}
        </h1>
      </header>

      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-card">
        <Markish text={L(lesson.intro)} />
      </section>

      {/* 最容易犯的錯是全站最重要的教學資產，給它最搶眼的處理 */}
      {pitfalls ? (
        <section className="overflow-hidden rounded-3xl border-2 border-error-300 bg-error-50 shadow-card dark:border-error-700/60 dark:bg-error-700/15">
          <div className="flex items-center gap-2 border-b-2 border-error-200 bg-error-100 px-5 py-3 dark:border-error-700/60 dark:bg-error-700/25">
            <TriangleAlert
              aria-hidden="true"
              className="size-5 shrink-0 text-error-600 dark:text-error-200"
            />
            <h2 className="text-base font-extrabold text-error-700 dark:text-error-100">
              {t('pitfallsHeading')}
            </h2>
          </div>
          <div className="px-5 py-4 text-body">
            <Markish text={pitfalls} />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-body">
          <BookOpen aria-hidden="true" className="size-5 text-primary-500" />
          {t('rulesHeading')}
        </h2>
        <ol className="space-y-3">
          {lesson.rules.map((r, i) => (
            <li key={i} className="rounded-3xl border border-line/70 bg-surface p-5 shadow-soft">
              <div className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-secondary-500 text-sm font-extrabold text-ink-900">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <Markish text={L(r.rule)} />
                  <ul className="space-y-2">
                    {r.examples.map((exm, j) => (
                      <ExamplePair
                        key={j}
                        es={exm.es}
                        gloss={L(exm.gloss)}
                        note={Lo(exm.note)}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {lesson.pronunciation?.length ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-body">
            <Volume2 aria-hidden="true" className="size-5 text-secondary-600" />
            {t('pronHeading')}
          </h2>
          <ul className="space-y-2">
            {lesson.pronunciation.map((p, i) => (
              <li key={i} className="rounded-3xl border border-line/70 bg-surface p-4 shadow-soft">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span lang="es" className="text-lg font-extrabold text-primary-800 dark:text-primary-300">
                    {p.letter}
                  </span>
                  <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-sm text-muted">
                    {p.ipa}
                  </code>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-body">{L(p.note)}</p>
                <p lang="es" className="mt-1.5 text-sm font-semibold text-muted">
                  {p.examples.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.regional ? (
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-body">{t('regionalHeading')}</h2>
          <RegionalNote regional={lesson.regional} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-body">
          {t('exercisesHeading')}{' '}
          <span className="text-sm font-semibold text-muted">
            {t('exercisesCount', { n: lesson.exercises.length })}
          </span>
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" variant="primary" className="w-full sm:w-auto">
            <a href={hrefFor({ name: 'practice', id: lesson.id })}>
              <Play aria-hidden="true" />
              {t('startPractice')}
            </a>
          </Button>
          {lesson.vocabIds.length > 0 ? (
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <a href={hrefFor({ name: 'drill', id: lesson.id })}>
                <Layers aria-hidden="true" />
                {t('drillCta')}
              </a>
            </Button>
          ) : null}
        </div>
        <p className="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted">
          {t('previewNote')}
        </p>
        <ul className="space-y-2">
          {lesson.exercises.map((ex) => (
            <ExercisePreview key={ex.id} ex={ex} />
          ))}
        </ul>
      </section>

      <nav className="flex flex-wrap gap-3 border-t border-line pt-5">
        {prev ? (
          <Button asChild variant="outline">
            <a href={hrefFor({ name: 'lesson', id: prev.id })}>
              <ArrowLeft aria-hidden="true" />
              {L(prev.title)}
            </a>
          </Button>
        ) : null}
        {next ? (
          <Button asChild variant="primary" className="ml-auto">
            <a href={hrefFor({ name: 'lesson', id: next.id })}>
              {L(next.title)}
              <ArrowRight aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </nav>
    </article>
  );
}
