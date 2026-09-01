import { useState, useEffect, useRef } from 'react';
import { Volume2, CornerDownLeft, VolumeX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Prompt, HelpRow, HintBox } from './Shared';
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
 *
 * 求助階梯（有語音時才有意義）：
 * 完全聽不出來的時候，送出鍵是停用的（沒打字不能送），等於整題卡死，
 * 只能亂打一通讓它判錯才過得去。所以給兩階出口：
 *
 * 1. **看中文意思** —— 只翻出意思，西文還是要自己拼。知道在講什麼之後
 *    很多句子就聽得出來了。用了之後即使答對也記 `hesitant`（FSRS Hard），
 *    因為那不是自己聽出來的。
 * 2. **直接看答案** —— 算答錯，跟閃卡的「想不起來」同一個意思。
 *    整句西文與翻譯由 Player 的回饋面板印出來。
 */
export function Listening({ exercise, answered, onAnswer }: ExerciseProps<ListeningEx>) {
  const { t, L } = useT();
  const speech = useSpeech();
  const [value, setValue] = useState('');
  const [hinted, setHinted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    setHinted(false);
    inputRef.current?.focus();
    if (speech.available) speak(exercise.es);
  }, [exercise.id, exercise.es, speech.available]);

  const submit = () => {
    if (answered || !value.trim()) return;
    const correct = matchesAnswer(value, [...exercise.accept]);
    onAnswer({
      correct,
      given: value.trim(),
      // 看過意思才寫對的，不算真的聽出來 —— FSRS 記 Hard，會比較快再遇到
      ...(correct && hinted ? { note: t('listenHintUsedNote'), hesitant: true } : {}),
    });
  };

  /*
   * 沒有語音時整句已經印在畫面上，求助按鈕沒有任何東西可以揭曉，
   * 兩顆都不顯示 —— 按了沒反應的按鈕比沒有按鈕更糟。
   */
  const canAskForHelp = speech.available && !answered;

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

      {/* 看了意思之後，翻譯留在畫面上，西文還是要自己拼 */}
      {hinted && !answered ? <HintBox>{L(exercise.gloss)}</HintBox> : null}

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
          /* 沒有語音時題目變成抄寫，提示語也要跟著換 —— 螢幕上根本沒有東西可以「聽」 */
          placeholder={t(speech.available ? 'typeWhatYouHear' : 'typeWhatYouSee')}
          lang="es"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={t(speech.available ? 'typeWhatYouHear' : 'typeWhatYouSee')}
        />
        <Button onClick={submit} disabled={answered || !value.trim()} aria-label={t('submitAnswer')}>
          <CornerDownLeft aria-hidden="true" />
        </Button>
      </div>

      {canAskForHelp ? (
        <HelpRow
          hinted={hinted}
          onHint={() => setHinted(true)}
          onGiveUp={() => onAnswer({ correct: false, note: t('listenGaveUpNote') })}
          hintLabelKey="listenShowMeaning"
        />
      ) : null}

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
