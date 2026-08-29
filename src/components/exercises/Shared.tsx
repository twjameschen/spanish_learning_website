import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Inline } from '@/components/Markish';

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
