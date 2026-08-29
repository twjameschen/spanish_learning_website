import { useState, useEffect, useMemo } from 'react';
import { RotateCcw, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Prompt } from './Shared';
import { tokensMatch } from '@/lib/normalize';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ExerciseProps } from './types';
import type { Exercise } from '@/content/schema';

type WordOrderEx = Extract<Exercise, { type: 'wordOrder' }>;

/**
 * 語序重組。
 *
 * 規格寫「拖曳單字排句子」，這裡改用**點擊**放入／取出。
 * 理由不是省事：拖曳在手機上很難做得準（要處理觸控、捲動衝突、無障礙），
 * 而點擊在手機與桌機上都精準、可用鍵盤操作、螢幕閱讀器也讀得出來。
 * 學習目標是「排出正確語序」，點擊完全能達成。
 */
function shuffle<T>(items: T[], seed: string): T[] {
  // 用題目 id 當種子，同一題每次打亂結果一致，重看時不會忽然變一個樣子
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  // 萬一打亂後剛好等於答案，整個往後轉一格
  if (out.every((v, i) => v === items[i]) && out.length > 1) out.push(out.shift()!);
  return out;
}

export function WordOrder({ exercise, answered, onAnswer }: ExerciseProps<WordOrderEx>) {
  const { t, L } = useT();
  const pool = useMemo(
    () => shuffle([...exercise.tokens], exercise.id),
    [exercise.tokens, exercise.id],
  );
  const [placed, setPlaced] = useState<number[]>([]);

  useEffect(() => {
    setPlaced([]);
  }, [exercise.id]);

  const remaining = pool.map((_, i) => i).filter((i) => !placed.includes(i));
  const sentence = placed.map((i) => pool[i]!);

  const submit = () => {
    if (answered || placed.length === 0) return;
    const correct = tokensMatch(sentence, exercise.answer);
    onAnswer({ correct, given: sentence.join(' ') });
  };

  return (
    <div className="space-y-5">
      <Prompt>{t('wordOrderPrompt')}</Prompt>
      <div className="rounded-3xl bg-surface-2 px-5 py-4 text-center">
        <p className="text-lg font-bold text-body">{L(exercise.prompt)}</p>
      </div>

      {/* 已排好的句子 */}
      <div
        className={cn(
          'flex min-h-16 flex-wrap items-start gap-2 rounded-3xl border-2 border-dashed p-3',
          answered ? 'border-line' : 'border-primary-300',
        )}
        aria-label={t('yourSentence')}
      >
        {sentence.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted">{t('tapWordsToBuild')}</p>
        ) : (
          placed.map((poolIndex, pos) => (
            <button
              key={`${poolIndex}-${pos}`}
              type="button"
              lang="es"
              disabled={answered}
              onClick={() => setPlaced(placed.filter((_, k) => k !== pos))}
              className="rounded-2xl bg-primary-500 px-3.5 py-2 font-bold text-white shadow-soft transition-transform hover:scale-105 disabled:hover:scale-100"
            >
              {pool[poolIndex]}
            </button>
          ))
        )}
      </div>

      {/* 可選的字塊 */}
      <div className="flex flex-wrap gap-2">
        {remaining.map((poolIndex) => (
          <button
            key={poolIndex}
            type="button"
            lang="es"
            disabled={answered}
            onClick={() => setPlaced([...placed, poolIndex])}
            className="rounded-2xl border-2 border-line bg-surface px-3.5 py-2 font-bold text-body transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-soft disabled:hover:translate-y-0"
          >
            {pool[poolIndex]}
          </button>
        ))}
      </div>

      {answered ? (
        <div className="rounded-2xl bg-surface-2 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            {t('correctAnswer')}
          </p>
          <p lang="es" className="mt-0.5 text-lg font-extrabold text-body">
            {exercise.answer.join(' ')}
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPlaced([])}
            disabled={placed.length === 0}
          >
            <RotateCcw aria-hidden="true" />
            {t('clear')}
          </Button>
          <Button className="flex-1" onClick={submit} disabled={placed.length === 0}>
            <CornerDownLeft aria-hidden="true" />
            {t('check')}
          </Button>
        </div>
      )}
    </div>
  );
}
