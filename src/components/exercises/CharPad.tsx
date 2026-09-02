import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useT } from '@/i18n';

/**
 * 西文字元列。
 *
 * Windows 沒有西文鍵盤佈局時 á é í ó ú ü ñ ¿ ¡ 很難打。重音可以不打
 * （`normalizeAnswer` 會折掉），但 **ñ 刻意不折** —— año 與 ano 是兩個字，
 * 所以少了這一列，有些答案在沒有西文鍵盤的機器上根本打不出來。
 */
const CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'] as const;

/**
 * 把字元插在游標位置，並把游標留在插入的字元之後。
 *
 * 不能只做 `value + ch`：那樣每點一個字元游標就跳到最後，
 * 想在句子中間補一個重音字母就得重打後半段。
 */
export function insertAtCursor(
  input: HTMLInputElement | null,
  value: string,
  ch: string,
): { value: string; caret: number } {
  const start = input?.selectionStart ?? value.length;
  const end = input?.selectionEnd ?? value.length;
  return { value: value.slice(0, start) + ch + value.slice(end), caret: start + ch.length };
}

export function CharPad({
  inputRef, value, onChange, disabled = false,
}: {
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  const caretRef = useRef<number | null>(null);

  /*
   * 插入之後把游標放回插入點之後。
   *
   * 一定要用 useLayoutEffect，不能用 requestAnimationFrame ——
   * 受控元件的新 value 套上去時瀏覽器會把游標移到最後，而 rAF 要等到下一幀才跑。
   * 連點兩個字元時第二次會讀到還沒修好的游標位置，字就跑到最後面去了
   * （實測 añío 會變成 añoí）。useLayoutEffect 在 DOM 更新後同步執行，沒有這個空窗。
   */
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || caretRef.current === null) return;
    el.focus();
    el.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  }, [value, inputRef]);

  if (disabled) return null;

  const insert = (ch: string) => {
    const next = insertAtCursor(inputRef.current, value, ch);
    caretRef.current = next.caret;
    onChange(next.value);
  };

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={t('charPadLabel')}>
      {CHARS.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => insert(ch)}
          aria-label={t('charPadInsert', { ch })}
          lang="es"
          className="h-8 min-w-8 rounded-xl border border-line bg-surface px-2 text-[15px] font-bold text-body transition-colors hover:border-primary-400 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 dark:hover:text-primary-300"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
