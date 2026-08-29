import { useEffect, useRef } from 'react';

/**
 * 全域鍵盤快捷鍵。
 *
 * 三個刻意的防護，都是為了不要重演 Phase 3 那個「按 Enter 跳過答題回饋」的 bug：
 *
 * 1. **焦點在輸入元素時完全不接手。** 使用者正在打字，鍵盤是他的，不是我們的。
 * 2. **有修飾鍵就不接手。** Ctrl+1 是瀏覽器換分頁，攔下來會很討厭。
 * 3. **handler 放在 ref 裡。** 否則每次 render 都重新掛監聽，
 *    在答題頁那種每按一次就重繪的地方會反覆註冊。
 *
 * 這裡刻意不碰 Enter —— Enter 的預設行為會啟用當前焦點的按鈕，
 * 那條路徑已經由各元件自己處理，全域再插一手只會打架。
 */
export function useShortcut(
  handler: (key: string, event: KeyboardEvent) => void,
  enabled = true,
): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      ref.current(e.key, e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
