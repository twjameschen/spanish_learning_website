import { useState, useEffect, useRef } from 'react';
import { Volume2, CornerDownLeft, VolumeX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Prompt } from './Shared';
import { matchesAnswer } from '@/lib/normalize';
import { speak } from '@/lib/speech';
import { useSpeech } from '@/hooks/useSpeech';
import { useT } from '@/i18n';
import type { ExerciseProps } from './types';
import type { Exercise } from '@/content/schema';

type ListeningEx = Extract<Exercise, { type: 'listening' }>;

/**
 * 聽力題。
 *
 * 規格明訂：偵測不到 es 語音時要隱藏發音按鈕並提示。
 * 這裡更進一步 —— 沒有語音時整題**改成看著西班牙文抄寫**，
 * 而不是留一個聽不到的題目卡住流程。
 * 一個按了沒反應的按鈕比沒有按鈕更糟，一道做不了的題比跳過更糟。
 */
export function Listening({ exercise, answered, onAnswer }: ExerciseProps<ListeningEx>) {
  const { t, L } = useT();
  const speech = useSpeech();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    inputRef.current?.focus();
    if (speech.available) speak(exercise.es);
  }, [exercise.id, exercise.es, speech.available]);

  const submit = () => {
    if (answered || !value.trim()) return;
    onAnswer({ correct: matchesAnswer(value, [...exercise.accept]), given: value.trim() });
  };

  return (
    <div className="space-y-5">
      <Prompt>{t(speech.available ? 'listeningPrompt' : 'listeningFallbackPrompt')}</Prompt>

      {speech.available ? (
        <div className="grid place-items-center gap-3 rounded-3xl bg-surface-2 px-5 py-8">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => speak(exercise.es)}
            aria-label={t('playAudio')}
            className="size-20 rounded-full p-0"
          >
            <Volume2 aria-hidden="true" className="size-8" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => speak(exercise.es, { rate: 0.6 })}>
            {t('playSlower')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-3xl bg-surface-2 px-5 py-6 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
            <VolumeX aria-hidden="true" className="size-4" />
            {t('noSpanishVoice')}
          </p>
          <p lang="es" className="text-2xl font-extrabold text-body">{exercise.es}</p>
        </div>
      )}

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
          placeholder={t('typeWhatYouHear')}
          lang="es"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={t('typeWhatYouHear')}
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
          <p lang="es" className="mt-0.5 text-lg font-extrabold text-body">{exercise.es}</p>
          <p className="mt-0.5 text-sm text-muted">{L(exercise.gloss)}</p>
        </div>
      ) : null}
    </div>
  );
}
