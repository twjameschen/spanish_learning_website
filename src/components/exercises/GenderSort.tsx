import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Prompt } from './Shared';
import { getWord } from '@/content';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ExerciseProps } from './types';
import type { Exercise } from '@/content/schema';

type GenderSortEx = Extract<Exercise, { type: 'genderSort' }>;

/**
 * 陰陽性快速分類（限時）。
 *
 * 限時是刻意的：性別必須變成反射，停下來想就代表還沒記熟。
 * 時間到就以當下的成績結算，不會卡住流程。
 */
export function GenderSort({ exercise, answered, onAnswer }: ExerciseProps<GenderSortEx>) {
  const { t } = useT();
  const words = exercise.wordIds.map((id) => getWord(id)).filter((w) => w !== undefined);
  const [index, setIndex] = useState(0);
  const [hits, setHits] = useState<boolean[]>([]);
  const [left, setLeft] = useState(exercise.seconds);
  const finishedRef = useRef(false);

  const finish = useCallback(
    (results: boolean[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const right = results.filter(Boolean).length;
      // 全部答對才算這一題對 —— 分類題的目標是「不出錯」，不是「大致答對」
      onAnswer({
        correct: right === words.length,
        given: `${right}/${words.length}`,
      });
    },
    [onAnswer, words.length],
  );

  useEffect(() => {
    setIndex(0);
    setHits([]);
    setLeft(exercise.seconds);
    finishedRef.current = false;
  }, [exercise.id, exercise.seconds]);

  /*
   * 倒數與「時間到就結算」刻意拆成兩個 effect。
   *
   * 以前是同一個，而且依賴裡有 `hits`；`pick()` 每次作答都產生新陣列，
   * 於是每按一下就 clearTimeout 掉還沒到期的那一秒再重排一個新的，
   * 已經走掉的那部分被丟掉。按得比一秒一次快的人會看到時間卡住不動，
   * 八個字的 75 秒題最多可以賺到約 8 秒。
   *
   * `hits` 只有結算那一支要讀，改放 ref，倒數就不必跟著它重跑。
   */
  const hitsRef = useRef(hits);
  hitsRef.current = hits;

  useEffect(() => {
    if (answered || finishedRef.current || left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, answered]);

  useEffect(() => {
    if (answered || finishedRef.current || left > 0) return;
    finish(hitsRef.current);
  }, [left, answered, finish]);

  const current = words[index];

  const pick = (gender: 'm' | 'f') => {
    if (answered || !current || finishedRef.current) return;
    const next = [...hits, current.gender === gender];
    setHits(next);
    if (index + 1 >= words.length) finish(next);
    else setIndex(index + 1);
  };

  const done = answered || finishedRef.current || !current;

  return (
    <div className="space-y-5">
      <Prompt>{t('genderSortPrompt')}</Prompt>

      <div className="flex items-center gap-3">
        <Timer aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <Progress
          value={(left / exercise.seconds) * 100}
          flow={false}
          className={cn('h-2', left <= 5 && 'ring-2 ring-error-400')}
        />
        <span className="w-10 shrink-0 text-right font-mono text-sm font-bold text-body">
          {Math.max(0, left)}s
        </span>
      </div>

      <p className="text-center text-sm font-semibold text-muted">
        {t('genderSortProgress', { done: hits.length, total: words.length })}
      </p>

      {done ? (
        <div className="grid place-items-center rounded-3xl bg-surface-2 px-5 py-10 text-center">
          <p className="text-3xl font-extrabold text-body">
            {hits.filter(Boolean).length} / {words.length}
          </p>
          <p className="mt-1 text-sm text-muted">{t('genderSortDone')}</p>
        </div>
      ) : (
        <>
          <div className="grid min-h-28 place-items-center rounded-3xl bg-surface-2 px-5 py-8">
            <p lang="es" className="text-3xl font-extrabold text-body">{current.es}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => pick('m')}
              className="rounded-3xl bg-primary-500 py-6 text-2xl font-extrabold text-white shadow-soft transition-transform hover:scale-[1.03] active:scale-95"
            >
              <span lang="es">el</span>
            </button>
            <button
              type="button"
              onClick={() => pick('f')}
              className="rounded-3xl bg-secondary-500 py-6 text-2xl font-extrabold text-ink-900 shadow-soft transition-transform hover:scale-[1.03] active:scale-95"
            >
              <span lang="es">la</span>
            </button>
          </div>
        </>
      )}

      {/* 作答後把整組正解列出來，答錯的那幾個要看得到 */}
      {done && hits.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {words.map((w, i) => (
            <li
              key={w.id}
              lang="es"
              className={cn(
                'rounded-2xl px-2.5 py-1 text-sm font-bold',
                hits[i] === undefined
                  ? 'bg-surface-2 text-muted'
                  : hits[i]
                    ? 'bg-success-100 text-success-800 dark:bg-success-700/30 dark:text-success-50'
                    : 'bg-error-100 text-error-700 dark:bg-error-700/30 dark:text-error-50',
              )}
            >
              {w.gender === 'm' ? 'el' : 'la'} {w.es}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
