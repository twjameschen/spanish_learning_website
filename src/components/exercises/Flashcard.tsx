import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Prompt, SpanishDisplay } from './Shared';
import { getWord } from '@/content';
import { useT } from '@/i18n';
import type { ExerciseProps } from './types';
import type { Exercise } from '@/content/schema';

type Card = Extract<Exercise, { type: 'flashcard' }>;

/**
 * 閃卡。使用者自評，所以沒有「正確答案」可以比對 ——
 * 翻開後由使用者說「記得／不記得」，那個回答直接餵給 FSRS。
 * 這是間隔複習的標準做法：自評比機器判分更貼近真實記憶狀態。
 */
export function Flashcard({ exercise, answered, onAnswer }: ExerciseProps<Card>) {
  const { t, L } = useT();
  const [revealed, setRevealed] = useState(false);
  const word = getWord(exercise.wordId);

  useEffect(() => {
    setRevealed(false);
  }, [exercise.id]);

  if (!word) return null;
  const front = exercise.direction === 'es-zh' ? word.es : L(word.gloss);
  const back = exercise.direction === 'es-zh' ? L(word.gloss) : word.es;
  const frontIsSpanish = exercise.direction === 'es-zh';

  return (
    <div className="space-y-5">
      <Prompt>{t(frontIsSpanish ? 'flashcardToMeaning' : 'flashcardToSpanish')}</Prompt>

      <div className="grid min-h-32 place-items-center rounded-3xl bg-surface-2 px-5 py-8 text-center">
        {frontIsSpanish ? (
          <SpanishDisplay text={front} size="xl" />
        ) : (
          <p className="text-2xl font-extrabold text-body">{front}</p>
        )}
      </div>

      {revealed || answered ? (
        <div className="space-y-4">
          <div className="rounded-3xl border-2 border-secondary-300 bg-secondary-50 px-5 py-4 text-center dark:border-secondary-800 dark:bg-secondary-900/30">
            {frontIsSpanish ? (
              <p className="text-xl font-extrabold text-body">{back}</p>
            ) : (
              <SpanishDisplay text={back} />
            )}
            <p lang="es" className="mt-2 text-sm text-muted">{word.exampleEs}</p>
            <p className="text-sm text-muted">{L(word.exampleGloss)}</p>
          </div>

          {answered ? null : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onAnswer({ correct: false })}
              >
                {t('flashcardForgot')}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => onAnswer({ correct: true })}
              >
                {t('flashcardKnew')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setRevealed(true)}>
          <Eye aria-hidden="true" />
          {t('flashcardReveal')}
        </Button>
      )}
    </div>
  );
}
