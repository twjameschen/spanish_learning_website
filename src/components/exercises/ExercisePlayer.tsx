import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Flame, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Markish } from '@/components/Markish';
import { ResultMark } from './Shared';
import { Flashcard } from './Flashcard';
import { MultipleChoice } from './MultipleChoice';
import { TranslateExercise, ConjugationExercise } from './TextAnswer';
import { WordOrder } from './WordOrder';
import { Listening } from './Listening';
import { GenderSort } from './GenderSort';
import type { ExerciseOutcome } from './types';
import { xpForAnswer } from '@/lib/xp';
import { useProgressStore, wordKey, exerciseKey } from '@/store/useProgressStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/content/schema';

/**
 * 統一的答題流程。
 *
 * 每個題型元件只管「呈現題目、收作答、判對錯」；
 * 計分、combo、FSRS 排程、下一題、結算都在這裡，
 * 這樣新增題型時不必重複實作這些。
 */

export interface PlayerResult {
  answered: number;
  correct: number;
  xp: number;
  accuracy: number;
}

/** 這一題要更新哪一張 FSRS 卡片 */
const SPRING = { type: 'spring', stiffness: 300, damping: 20 } as const;

function cardKeyFor(ex: Exercise) {
  // 閃卡與陰陽性分類直接對應單字；其餘題目自成一張卡
  if (ex.type === 'flashcard') return wordKey(ex.wordId);
  return exerciseKey(ex.id);
}

export function ExercisePlayer({
  exercises, lessonId, onFinish, onExit,
}: {
  exercises: Exercise[];
  lessonId?: string;
  onFinish?: (result: PlayerResult) => void;
  onExit?: () => void;
}) {
  const { t, L } = useT();
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const setAnswering = useSessionStore((s) => s.setAnswering);

  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<ExerciseOutcome | null>(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [tally, setTally] = useState({ answered: 0, correct: 0, xp: 0 });
  const [finished, setFinished] = useState(false);
  // 規格指定的 spring 參數；使用者若開了「減少動態效果」就整個關掉
  const reduceMotion = useReducedMotion();
  const startedAt = useRef(Date.now());
  const nextRef = useRef<HTMLButtonElement>(null);

  const current = exercises[index];

  useEffect(() => {
    startedAt.current = Date.now();
    setOutcome(null);
  }, [index]);

  // 作答後把焦點移到「下一題」，鍵盤操作才連得起來
  useEffect(() => {
    if (outcome) nextRef.current?.focus();
  }, [outcome]);

  // 作答期間先壓住慶祝視窗，免得蓋掉答題回饋；離開這一頁也要記得放開
  useEffect(() => {
    setAnswering(!finished);
  }, [finished, setAnswering]);
  useEffect(() => () => setAnswering(false), [setAnswering]);

  const handleAnswer = useCallback(
    (result: ExerciseOutcome) => {
      if (!current || outcome) return;
      const ms = Date.now() - startedAt.current;
      const nextCombo = result.correct ? combo + 1 : 0;
      const xp = xpForAnswer({
        correct: result.correct,
        combo,
        difficulty: current.difficulty,
      });

      recordAnswer({
        key: cardKeyFor(current),
        exerciseType: current.type,
        correct: result.correct,
        ms,
        xp,
        hesitant: result.hesitant ?? false,
        ...(lessonId ? { lessonId } : {}),
      });

      setOutcome(result);
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setTally((prev) => ({
        answered: prev.answered + 1,
        correct: prev.correct + (result.correct ? 1 : 0),
        xp: prev.xp + xp,
      }));
    },
    [current, outcome, combo, lessonId, recordAnswer],
  );

  const advance = useCallback(() => {
    if (index + 1 >= exercises.length) {
      setFinished(true);
      const accuracy = tally.answered > 0 ? tally.correct / tally.answered : 0;
      onFinish?.({ ...tally, accuracy });
    } else {
      setIndex(index + 1);
    }
  }, [index, exercises.length, tally, onFinish]);

  /*
   * 這裡刻意**不**掛 window 層級的 Enter 監聽。
   *
   * React 18 對 keydown 這類 discrete event 是同步 flush 的：
   * 在輸入框按 Enter 送出答案後，state 更新與重新 render 會在同一個事件
   * 還在向上冒泡時就完成，於是新註冊的 window 監聽器會接到**同一次**按鍵，
   * 立刻把畫面推到下一題 —— 使用者根本來不及看到答錯的解釋。
   *
   * 改成單純把焦點移到「下一題」按鈕（見上面的 effect），
   * 再按一次 Enter 自然會觸發那顆按鈕。沒有競態，也符合鍵盤操作慣例。
   */

  const body = useMemo(() => {
    if (!current) return null;
    const props = { answered: Boolean(outcome), outcome, onAnswer: handleAnswer };
    switch (current.type) {
      case 'flashcard': return <Flashcard exercise={current} {...props} />;
      case 'mcq': return <MultipleChoice exercise={current} {...props} />;
      case 'translate': return <TranslateExercise exercise={current} {...props} />;
      case 'conjugation': return <ConjugationExercise exercise={current} {...props} />;
      case 'wordOrder': return <WordOrder exercise={current} {...props} />;
      case 'listening': return <Listening exercise={current} {...props} />;
      case 'genderSort': return <GenderSort exercise={current} {...props} />;
    }
  }, [current, outcome, handleAnswer]);

  if (finished) {
    const accuracy = tally.answered > 0 ? Math.round((tally.correct / tally.answered) * 100) : 0;
    return (
      <div className="space-y-6 rounded-3xl border border-line/70 bg-surface p-6 text-center shadow-card sm:p-10">
        <Trophy aria-hidden="true" className="mx-auto size-14 text-accent-500" />
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-body">{t('sessionDone')}</h2>
          <p className="text-sm text-muted">
            {t('sessionSummary', { correct: tally.correct, total: tally.answered })}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: t('accuracy'), value: `${accuracy}%` },
            { label: t('xpEarned'), value: `+${tally.xp}` },
            { label: t('bestCombo'), value: String(bestCombo) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-surface-2 px-3 py-4">
              <dd className="text-2xl font-extrabold text-body">{s.value}</dd>
              <dt className="mt-0.5 text-xs font-semibold text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIndex(0);
              setFinished(false);
              setTally({ answered: 0, correct: 0, xp: 0 });
              setCombo(0);
              setBestCombo(0);
            }}
          >
            <RotateCcw aria-hidden="true" />
            {t('practiceAgain')}
          </Button>
          {onExit ? <Button onClick={onExit}>{t('backToLesson')}</Button> : null}
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-5">
      {/* 進度與連擊 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Progress value={(index / exercises.length) * 100} className="h-2.5" />
          <span className="shrink-0 font-mono text-sm font-bold text-muted">
            {index + 1}/{exercises.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {combo >= 2 ? (
            <Badge variant="accent" className="animate-pop">
              <Flame aria-hidden="true" />
              {t('comboCount', { n: combo })}
            </Badge>
          ) : null}
          {tally.xp > 0 ? (
            <span className="ml-auto text-xs font-bold text-muted">+{tally.xp} XP</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-line/70 bg-surface p-5 shadow-card sm:p-6">
        {body}
      </div>

      {/* 回饋：答錯一定要說明為什麼，不是只說「錯了」 */}
      {/* 刻意不用 AnimatePresence：離場動畫期間舊面板還留在 DOM 裡，
          它的「下一題」按鈕仍然可以點，連按兩下就會跳過一題。
          這裡只需要進場動畫，換題時直接卸載才是對的。 */}
      {outcome ? (
        <motion.div
          key={`fb-${index}`}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className={cn(
            'space-y-3 rounded-3xl border-2 p-5',
            outcome.correct
              ? 'border-success-300 bg-success-50 dark:border-success-700/60 dark:bg-success-700/15'
              : 'border-error-300 bg-error-50 dark:border-error-700/60 dark:bg-error-700/15',
          )}
          role="status"
        >
          <div className="flex items-center gap-3">
            <ResultMark correct={outcome.correct} />
            <p className="text-lg font-extrabold text-body">
              {t(outcome.correct ? 'correctLabel' : 'wrongLabel')}
            </p>
          </div>

          {outcome.note ? (
            <div className="text-sm text-body">
              <Markish text={outcome.note} />
            </div>
          ) : null}

          <div className="text-sm text-body">
            <Markish text={L(current.explain)} />
          </div>

          <Button ref={nextRef} className="w-full" size="lg" onClick={advance}>
            {index + 1 >= exercises.length ? t('finish') : t('nextQuestion')}
            <ArrowRight aria-hidden="true" />
          </Button>
        </motion.div>
      ) : null}
    </div>
  );
}
