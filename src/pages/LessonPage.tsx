import { ArrowLeft, ArrowRight, TriangleAlert, Volume2, BookOpen, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Markish } from '@/components/Markish';
import { RegionalNote } from '@/components/NeedsVerifyBadge';
import { EmptyState } from '@/components/decor/Illustrations';
import { BrokenSignpost } from '@/components/decor/Illustrations';
import { AndeanBand } from '@/components/decor/Patterns';
import { allLessons, getLesson, getWord, getVerb, journey } from '@/content';
import {
  EXERCISE_TYPE_LABEL, PERSON_LABEL, TENSE_LABEL,
  type Exercise, type GrammarLesson,
} from '@/content/schema';
import { hrefFor } from '@/lib/router';

/* -------------------------------------------------------------- *
 * 課程列表
 * -------------------------------------------------------------- */

export function LessonListPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-body">課程</h1>
        <p className="text-sm text-muted">
          目前開放 A0 共 {allLessons.length} 課。基多之後的城市要等 A1–B1 內容完成。
        </p>
      </header>

      {journey.map((stop) => {
        const lessons = stop.lessonIds
          .map((id) => getLesson(id))
          .filter((l): l is GrammarLesson => Boolean(l));
        const locked = lessons.length === 0;

        return (
          <section key={stop.city} className="overflow-hidden rounded-3xl border border-line/70 bg-surface shadow-card">
            <AndeanBand className={locked ? 'text-ink-300/40' : 'text-primary-500/50'} />
            <div className="p-5">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-extrabold text-body">{stop.nameZh}</h2>
                <span lang="es" className="text-sm font-semibold text-muted">
                  {stop.nameEs}
                </span>
                <span className="text-xs text-muted">· {stop.country}</span>
                {locked ? (
                  <Badge variant="neutral" className="ml-auto">
                    <Lock aria-hidden="true" />
                    尚未開放
                  </Badge>
                ) : (
                  <Badge variant="success" className="ml-auto">{lessons.length} 課</Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{stop.blurb}</p>

              {locked ? null : (
                <ol className="mt-4 space-y-2">
                  {lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <a
                        href={hrefFor({ name: 'lesson', id: lesson.id })}
                        className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-500 text-sm font-extrabold text-white">
                          {lesson.order}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-body">{lesson.title}</span>
                          <span className="block text-xs text-muted">
                            {lesson.rules.length} 條規則 · {lesson.exercises.length} 題
                          </span>
                        </span>
                        <ArrowRight aria-hidden="true" className="ml-auto size-4 shrink-0 text-muted" />
                      </a>
                    </li>
                  ))}
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

function ExamplePair({ es, zh, note }: { es: string; zh: string; note?: string | undefined }) {
  return (
    <li className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
      <p lang="es" className="break-es font-bold text-body">{es}</p>
      <p className="mt-0.5 text-sm text-muted">{zh}</p>
      {note ? (
        <p className="mt-1 text-xs leading-relaxed text-secondary-700 dark:text-secondary-300">
          {note}
        </p>
      ) : null}
    </li>
  );
}

/** 題目在這一頁只列出來給你看，不作答 —— 答題流程屬於 Phase 3 */
function ExercisePreview({ ex }: { ex: Exercise }) {
  const body = (() => {
    switch (ex.type) {
      case 'flashcard': {
        const w = getWord(ex.wordId);
        return (
          <p className="text-sm text-body">
            {ex.direction === 'es-zh' ? (
              <><span lang="es" className="font-bold">{w?.es}</span> → 中文</>
            ) : (
              <>{w?.zh} → <span lang="es" className="font-bold">西班牙文</span></>
            )}
          </p>
        );
      }
      case 'mcq':
        return (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-body">{ex.promptZh}</p>
            <ol className="space-y-1">
              {ex.options.map((opt, i) => (
                <li
                  key={i}
                  lang="es"
                  className={
                    i === ex.answerIndex
                      ? 'rounded-xl bg-success-100 px-2.5 py-1 text-sm font-bold text-success-700 dark:bg-success-700/30 dark:text-success-100'
                      : 'px-2.5 py-1 text-sm text-muted'
                  }
                >
                  {opt}
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
            {TENSE_LABEL[ex.tense].zh}
            {' → '}
            <span lang="es" className="font-bold text-success-700 dark:text-success-200">{ex.answer}</span>
          </p>
        );
      }
      case 'translate':
        return (
          <p className="text-sm text-body">
            {ex.zh} → <span lang="es" className="font-bold text-success-700 dark:text-success-200">{ex.canonical}</span>
          </p>
        );
      case 'wordOrder':
        return (
          <p lang="es" className="text-sm text-body">
            {ex.zh} → <span className="font-bold">{ex.answer.join(' ')}</span>
          </p>
        );
      case 'listening':
        return (
          <p className="flex items-center gap-2 text-sm text-body">
            <Volume2 aria-hidden="true" className="size-4 shrink-0 text-secondary-600" />
            <span lang="es" className="font-bold">{ex.es}</span>
            <span className="text-muted">／ {ex.zh}</span>
          </p>
        );
      case 'genderSort':
        return (
          <p className="flex flex-wrap gap-1.5">
            {ex.wordIds.map((id) => {
              const w = getWord(id);
              return (
                <Badge key={id} variant={w?.gender === 'm' ? 'primary' : 'secondary'}>
                  <span lang="es">{w?.gender === 'm' ? 'el' : 'la'} {w?.es}</span>
                </Badge>
              );
            })}
          </p>
        );
    }
  })();

  return (
    <li className="rounded-2xl border border-line/60 bg-surface p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline">{EXERCISE_TYPE_LABEL[ex.type]}</Badge>
        <Badge
          variant={ex.difficulty === 'hard' ? 'error' : ex.difficulty === 'easy' ? 'success' : 'neutral'}
        >
          {ex.difficulty === 'hard' ? '難' : ex.difficulty === 'easy' ? '易' : '中'}
        </Badge>
      </div>
      {body}
      <details className="mt-2.5">
        <summary className="cursor-pointer text-xs font-bold text-primary-600 hover:underline">
          答錯時會看到的解釋
        </summary>
        <div className="mt-1.5 text-sm text-muted">
          <Markish text={ex.explain} />
        </div>
      </details>
    </li>
  );
}

export function LessonPage({ id }: { id: string }) {
  const lesson = getLesson(id);

  if (!lesson) {
    return (
      <EmptyState
        icon={<BrokenSignpost />}
        title="找不到這一課"
        hint={`課程代碼「${id}」不存在。可能是網址打錯了，或這一課還沒開放。`}
        action={
          <Button asChild variant="outline">
            <a href={hrefFor({ name: 'lessons' })}>
              <ArrowLeft aria-hidden="true" />
              回到課程列表
            </a>
          </Button>
        }
      />
    );
  }

  const ordered = [...allLessons].sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? ordered[idx - 1] : undefined;
  const next = idx < ordered.length - 1 ? ordered[idx + 1] : undefined;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <a
          href={hrefFor({ name: 'lessons' })}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          課程列表
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">第 {lesson.order} 課</Badge>
          <Badge variant="neutral">{lesson.level}</Badge>
          {lesson.usesOnlyTaughtGrammar ? (
            <Badge variant="success" title="本課示範規則的例句只使用了本課與前置課教過的文法">
              例句嚴格分級
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-body sm:text-3xl">
          {lesson.title}
        </h1>
      </header>

      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-card">
        <Markish text={lesson.intro} />
      </section>

      {/* chineseTrap 是全站最重要的教學資產，給它最搶眼的處理 */}
      {lesson.chineseTrap ? (
        <section className="overflow-hidden rounded-3xl border-2 border-error-300 bg-error-50 shadow-card dark:border-error-700/60 dark:bg-error-700/15">
          <div className="flex items-center gap-2 border-b-2 border-error-200 bg-error-100 px-5 py-3 dark:border-error-700/60 dark:bg-error-700/25">
            <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-error-600 dark:text-error-200" />
            <h2 className="text-base font-extrabold text-error-700 dark:text-error-100">
              中文母語者的坑
            </h2>
          </div>
          <div className="px-5 py-4 text-body">
            <Markish text={lesson.chineseTrap} />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-body">
          <BookOpen aria-hidden="true" className="size-5 text-primary-500" />
          規則與例句
        </h2>
        <ol className="space-y-3">
          {lesson.rules.map((r, i) => (
            <li key={i} className="rounded-3xl border border-line/70 bg-surface p-5 shadow-soft">
              <div className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-secondary-500 text-sm font-extrabold text-ink-900">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <Markish text={r.rule} />
                  <ul className="space-y-2">
                    {r.examples.map((exm, j) => (
                      <ExamplePair key={j} es={exm.es} zh={exm.zh} note={exm.note} />
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
            發音重點
          </h2>
          <ul className="space-y-2">
            {lesson.pronunciation.map((p, i) => (
              <li key={i} className="rounded-3xl border border-line/70 bg-surface p-4 shadow-soft">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span lang="es" className="text-lg font-extrabold text-primary-600">{p.letter}</span>
                  <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-sm text-muted">
                    {p.ipa}
                  </code>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-body">{p.zh}</p>
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
          <h2 className="text-lg font-extrabold text-body">區域用法</h2>
          <RegionalNote regional={lesson.regional} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-body">
          練習題 <span className="text-sm font-semibold text-muted">（{lesson.exercises.length} 題）</span>
        </h2>
        <p className="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted">
          目前是唯讀預覽，正確答案直接標示出來。實際作答、計分與間隔複習屬於 Phase 3。
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
              {prev.title}
            </a>
          </Button>
        ) : null}
        {next ? (
          <Button asChild variant="primary" className="ml-auto">
            <a href={hrefFor({ name: 'lesson', id: next.id })}>
              {next.title}
              <ArrowRight aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </nav>
    </article>
  );
}
