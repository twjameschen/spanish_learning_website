import type { ReactNode } from 'react';
import { Check, X, Lightbulb, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Inline } from '@/components/Markish';
import { useT } from '@/i18n';
import type { UIKey } from '@/i18n';

/**
 * 題目的提示文字（中／英，隨語言切換）。
 * 傳字串時會過一次行內格式，題目裡的 **粗體** 才不會露出星號。
 */
export function Prompt({ children }: { children: ReactNode }) {
  return (
    <p className="text-lg font-bold leading-relaxed text-body">
      {typeof children === 'string' ? <Inline text={children} /> : children}
    </p>
  );
}

/** 要唸／要看的西班牙文，放大顯示 */
export function SpanishDisplay({ text, size = 'lg' }: { text: string; size?: 'lg' | 'xl' }) {
  return (
    <p
      lang="es"
      className={cn(
        'break-es font-extrabold tracking-tight text-body',
        size === 'xl' ? 'text-3xl sm:text-4xl' : 'text-2xl',
      )}
    >
      {text}
    </p>
  );
}

/** 作答後的對錯標記 */
export function ResultMark({ correct }: { correct: boolean }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-2xl text-white',
        correct ? 'bg-success-500' : 'bg-error-500',
      )}
    >
      {correct ? <Check aria-hidden="true" className="size-5" /> : <X aria-hidden="true" className="size-5" />}
    </span>
  );
}

/** 選項／字塊的通用按鈕外觀 */
export function ChoiceButton({
  children, state = 'idle', onClick, disabled, className, lang,
}: {
  children: ReactNode;
  state?: 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  lang?: string;
}) {
  return (
    <button
      type="button"
      lang={lang}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-semibold',
        'transition-all duration-200 ease-spring',
        'disabled:cursor-default',
        state === 'idle' &&
          'border-line bg-surface text-body hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-soft',
        state === 'selected' && 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100',
        state === 'correct' && 'border-success-500 bg-success-100 text-success-800 dark:bg-success-700/30 dark:text-success-50',
        state === 'wrong' && 'border-error-500 bg-error-100 text-error-700 dark:bg-error-700/30 dark:text-error-50',
        state === 'muted' && 'border-line bg-surface-2 text-muted',
        className,
      )}
    >
      {children}
    </button>
  );
}


/**
 * 求助列：想不出來時的兩階出口。
 *
 * 為什麼一定要有：聽力題、翻譯題、變位填空的送出鍵在沒打字時是停用的，
 * 完全想不出來就整題卡死 —— 只能亂打一通讓它判錯才過得去。
 *
 * 兩階分別是：
 * 1. **提示** —— 給一點線索但不給答案（聽力給中文意思，文字題給答案的骨架）。
 *    用了之後即使答對也記 `hesitant`，FSRS 會排得比較近。
 * 2. **看答案** —— 算答錯，跟閃卡的「想不起來」同一個意思。
 *
 * 按過提示之後第一顆自己收起來，只留「看答案」。
 */
export function HelpRow({
  hinted, onHint, onGiveUp, hintLabelKey,
}: {
  hinted: boolean;
  onHint: () => void;
  onGiveUp: () => void;
  /** 第一階按鈕的字：聽力是「看中文意思」，文字題是「看提示」 */
  hintLabelKey: UIKey;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-muted">{t('helpLabel')}</span>
      {hinted ? null : (
        <Button variant="outline" size="sm" onClick={onHint}>
          <Lightbulb aria-hidden="true" />
          {t(hintLabelKey)}
        </Button>
      )}
      <Button variant="ghost" size="sm" className="border border-line" onClick={onGiveUp}>
        <Eye aria-hidden="true" />
        {t('helpShowAnswer')}
      </Button>
    </div>
  );
}

/** 提示區塊：黃底的一行，聽力放中文意思，文字題放骨架 */
export function HintBox({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border-2 border-accent-300 bg-accent-50 px-4 py-3 dark:border-accent-700/60 dark:bg-accent-900/25">
      <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-700 dark:text-accent-200" />
      <p className={cn('text-sm font-semibold text-body', mono && 'font-mono tracking-wider')}>
        {children}
      </p>
    </div>
  );
}
