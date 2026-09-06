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
 *
 * 4. **有對話框開著時不接手。** 快捷鍵說明面板上就列著「1～4 選答案」，
 *    照著按下去以前會替使用者回答**背後那一題**、寫進 FSRS、然後跳下一題，
 *    全部發生在他正在讀的面板後面。閃卡按 Space 更慘：在沒看到的情況下
 *    被判「忘記」。用 DOM 查詢而不是另外拉一份「有沒有對話框」的狀態，
 *    是因為狀態總有一天會跟實際 DOM 不同步，而三個對話框都已經正確標了
 *    `aria-modal`。需要在對話框開著時仍然作用的（`?` 與 Escape）走 `inDialog`。
 */

/** 畫面上有沒有開著的強制回應對話框 */
export function isDialogOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

export interface ShortcutOptions {
  /**
   * 對話框開著時也要作用。只給「開關對話框本身」的快捷鍵用
   * —— 否則會變成打得開卻關不掉。
   */
  inDialog?: boolean;
}

export function useShortcut(
  handler: (key: string, event: KeyboardEvent) => void,
  enabled = true,
  options: ShortcutOptions = {},
): void {
  const ref = useRef(handler);
  ref.current = handler;
  const { inDialog = false } = options;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (!inDialog && isDialogOpen()) return;
      ref.current(e.key, e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, inDialog]);
}
