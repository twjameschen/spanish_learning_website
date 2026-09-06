import { useEffect, type RefObject } from 'react';

/**
 * 對話框的鍵盤行為，三個對話框共用一份。
 *
 * 三件事，每一件都是實際會擋到鍵盤使用者的：
 *
 * 1. **開啟時把焦點收進對話框。** 沒有這一步的話（`ShortcutsHelp` 以前就是），
 *    按完 `?` 之後第一個 Tab 會落到遮罩**後面**的頁面。
 * 2. **Tab 關在對話框裡。** 沒有的話 Tab 會一路走進標題列與背後的頁面 ——
 *    看不到、但仍然可以 focus、仍然可以按 Enter 觸發。
 * 3. **關閉時把焦點還回去。** 沒有的話對話框卸載後焦點掉到 `<body>`，
 *    開啟它的那顆按鈕不會被重新 focus，鍵盤使用者得從文件最上面重新 Tab 回來。
 *
 * Escape 不在這裡處理 —— 各對話框的關法不同（有的要走 `useShortcut` 的
 * `inDialog`，有的因為背後那一頁會搶焦點而必須自己掛監聽），
 * 硬統一只會多一層轉接。
 */

/** 對話框裡目前可以被 Tab 到的元素，依 DOM 順序 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // 刻意不看 offsetParent／getClientRects：jsdom 不做版面，那兩個永遠是
    // 「看不見」，測試裡整個名單會變空的。只排除明確標了隱藏的元素 ——
    // 這個判斷在 jsdom 與瀏覽器裡的結果一致。
    (el) => !el.hasAttribute('hidden') && el.closest('[hidden],[aria-hidden="true"]') === null,
  );
}

export function useDialog(ref: RefObject<HTMLElement | null>, open: boolean): void {
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const root = ref.current;
    // 面板本身帶 tabIndex={-1}，先收在容器上，Tab 才會從裡面第一個元素開始
    root?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !root) return;
      const items = focusableIn(root);
      if (items.length === 0) {
        // 沒有任何可聚焦元素時，Tab 不該把人送出去
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === root || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      // 還原焦點。元素可能已經不在畫面上（例如整頁換掉），所以要先確認
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, ref]);
}
