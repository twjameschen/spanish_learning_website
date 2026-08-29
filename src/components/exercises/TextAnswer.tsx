import { useState, useEffect, useRef } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Prompt, SpanishDisplay } from './Shared';
import { matchesAnswer, isAccentImperfect } from '@/lib/normalize';
import { getVerb } from '@/content';
import { PERSON_LABEL, TENSE_LABEL } from '@/content/schema';
import { useT } from '@/i18n';
import type { ExerciseProps } from './types';
import type { Exercise } from '@/content/schema';

type Translate = Extract<Exercise, { type: 'translate' }>;
type Conjugation = Extract<Exercise, { type: 'conjugation' }>;

/**
 * 文字輸入的共用內裡。翻譯題與變位填空的差別只在題面，
 * 判定邏輯（忽略大小寫與重音、答對後顯示正確重音）完全一樣。
 */
function TextInputCore({
  accepted, canonical, answered, onAnswer, children, placeholder,
}: {
  accepted: string[];
  canonical: string;
  answered: boolean;
  onAnswer: ExerciseProps['onAnswer'];
  children: React.ReactNode;
  placeholder: string;
}) {
  const { t } = useT();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    inputRef.current?.focus();
  }, [canonical]);

  const submit = () => {
    if (answered || !value.trim()) return;
    const correct = matchesAnswer(value, accepted);
    // 答對但漏了重音符號：仍算對，但提示正確寫法，且 FSRS 給 Hard 而非 Good
    const imperfect = correct && isAccentImperfect(value, canonical);
    onAnswer({
      correct,
      given: value.trim(),
      ...(imperfect ? { note: t('accentImperfect', { answer: canonical }), hesitant: true } : {}),
    });
  };

  return (
    <div className="space-y-5">
      {children}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            /*
             * 一定要 preventDefault。Enter 的預設行為是在所有 handler 跑完之後
             * 才執行，而那時 ExercisePlayer 已經把焦點移到「下一題」按鈕上，
             * 於是同一次按鍵會直接啟用它，使用者根本看不到答題回饋。
             */
            e.preventDefault();
            submit();
          }}
          disabled={answered}
          placeholder={placeholder}
          lang="es"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={placeholder}
        />
        <Button onClick={submit} disabled={answered || !value.trim()} aria-label={t('submitAnswer')}>
          <CornerDownLeft aria-hidden="true" />
        </Button>
      </div>
      {answered ? (
        <div className="rounded-2xl bg-surface-2 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            {t('correctAnswer')}
          </p>
          <p lang="es" className="mt-0.5 text-lg font-extrabold text-body">{canonical}</p>
        </div>
      ) : null}
    </div>
  );
}

export function TranslateExercise({ exercise, answered, onAnswer }: ExerciseProps<Translate>) {
  const { t, L } = useT();
  return (
    <TextInputCore
      accepted={[...exercise.accept]}
      canonical={exercise.canonical}
      answered={answered}
      onAnswer={onAnswer}
      placeholder={t('typeInSpanish')}
    >
      <Prompt>{t('translateToSpanish')}</Prompt>
      <div className="rounded-3xl bg-surface-2 px-5 py-6 text-center">
        <p className="text-xl font-extrabold text-body">{L(exercise.prompt)}</p>
      </div>
    </TextInputCore>
  );
}

export function ConjugationExercise({ exercise, answered, onAnswer }: ExerciseProps<Conjugation>) {
  const { t, L } = useT();
  const verb = getVerb(exercise.verbId);
  if (!verb) return null;

  return (
    <TextInputCore
      accepted={[exercise.answer]}
      canonical={exercise.answer}
      answered={answered}
      onAnswer={onAnswer}
      placeholder={t('typeTheForm')}
    >
      <Prompt>{t('conjugatePrompt')}</Prompt>
      <div className="space-y-3 rounded-3xl bg-surface-2 px-5 py-5 text-center">
        <SpanishDisplay text={verb.infinitive} />
        <p className="text-sm text-muted">{L(verb.gloss)}</p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="rounded-2xl bg-primary-500 px-3 py-1 text-sm font-extrabold text-white">
            {PERSON_LABEL[exercise.person].es}
          </span>
          <span className="rounded-2xl bg-secondary-500 px-3 py-1 text-sm font-extrabold text-ink-900">
            {L(TENSE_LABEL[exercise.tense].label)}
          </span>
        </div>
      </div>
    </TextInputCore>
  );
}
