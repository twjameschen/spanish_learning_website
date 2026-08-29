import { useState, useEffect } from 'react';
import { Prompt, ChoiceButton } from './Shared';
import { useT } from '@/i18n';
import type { ExerciseProps } from './types';
import type { Exercise } from '@/content/schema';

type Mcq = Extract<Exercise, { type: 'mcq' }>;

/**
 * 四選一。
 *
 * 關鍵設計：解釋綁在**選項**上而不是題目上。
 * 使用者選錯時，回饋的是「你選的**這一個**為什麼錯」，
 * 而不是一段對所有錯誤選項都適用的通用說明。
 */
export function MultipleChoice({ exercise, answered, outcome, onAnswer }: ExerciseProps<Mcq>) {
  const { L } = useT();
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [exercise.id]);

  const choose = (index: number) => {
    if (answered) return;
    setPicked(index);
    const correct = index === exercise.answerIndex;
    onAnswer({
      correct,
      given: L(exercise.options[index]!),
      // 答錯時附上那個選項自己的說明
      ...(correct ? {} : { note: L(exercise.optionExplains[index]!) }),
    });
  };

  const stateFor = (i: number) => {
    if (!answered) return picked === i ? 'selected' : 'idle';
    if (i === exercise.answerIndex) return 'correct';
    if (i === picked) return 'wrong';
    return 'muted';
  };

  return (
    <div className="space-y-5">
      <Prompt>{L(exercise.prompt)}</Prompt>
      {exercise.promptEs ? (
        <p lang="es" className="rounded-2xl bg-surface-2 px-4 py-3 text-lg font-bold text-body">
          {exercise.promptEs}
        </p>
      ) : null}

      <ol className="space-y-2">
        {exercise.options.map((opt, i) => (
          <li key={i}>
            <ChoiceButton
              state={stateFor(i)}
              disabled={answered}
              onClick={() => choose(i)}
            >
              <span className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-black/5 text-xs font-extrabold dark:bg-white/10">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 break-es">{L(opt)}</span>
              </span>
            </ChoiceButton>
            {/* 作答後，把每個選項的說明攤開來——包含你沒選的那些 */}
            {answered ? (
              <p
                className={
                  i === exercise.answerIndex
                    ? 'mt-1 px-4 text-sm font-semibold text-success-700 dark:text-success-200'
                    : 'mt-1 px-4 text-sm text-muted'
                }
              >
                {L(exercise.optionExplains[i]!)}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      {answered && outcome && !outcome.correct ? null : null}
    </div>
  );
}
