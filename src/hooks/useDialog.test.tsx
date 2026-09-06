import { describe, it, expect } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDialog } from './useDialog';

/**
 * 對話框的鍵盤行為。
 *
 * 這三條都是實際會擋到鍵盤使用者的：
 * `ShortcutsHelp` 以前開啟時根本沒把焦點移進來，按完 `?` 的第一個 Tab
 * 會落到遮罩**後面**；兩個對話框的 Tab 都會一路走進背後的頁面 ——
 * 看不到、但仍然可以 focus、仍然可以按 Enter 觸發；
 * 關掉之後焦點掉到 `<body>`，開啟它的那顆按鈕不會被重新 focus。
 */

function Harness() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, open);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        開啟
      </button>
      <button type="button">背後的按鈕</button>
      {open ? (
        <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true">
          <button type="button">面板第一顆</button>
          <button type="button">面板最後一顆</button>
          <button type="button" onClick={() => setOpen(false)}>
            關閉
          </button>
        </div>
      ) : null}
    </div>
  );
}

const btn = (name: string) => screen.getByRole('button', { name });

describe('useDialog', () => {
  it('開啟時焦點收進對話框，不會留在外面', () => {
    render(<Harness />);
    fireEvent.click(btn('開啟'));
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('Tab 走到最後一顆再按，會回到第一顆，不會跑到背後的頁面', () => {
    render(<Harness />);
    fireEvent.click(btn('開啟'));

    btn('關閉').focus();                       // 面板裡最後一個可聚焦元素
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(btn('面板第一顆'));
  });

  it('Shift+Tab 從第一顆往回會到最後一顆', () => {
    render(<Harness />);
    fireEvent.click(btn('開啟'));

    btn('面板第一顆').focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(btn('關閉'));
  });

  it('焦點意外跑到面板外面時，Tab 會把它抓回來', () => {
    render(<Harness />);
    fireEvent.click(btn('開啟'));

    btn('背後的按鈕').focus();                  // 模擬背後那一頁把焦點搶走
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('關閉之後焦點回到開啟它的那顆按鈕', () => {
    render(<Harness />);
    const opener = btn('開啟');
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement).not.toBe(opener);

    fireEvent.click(btn('關閉'));
    expect(document.activeElement).toBe(opener);
  });

  it('沒開的時候完全不插手鍵盤', () => {
    render(<Harness />);
    btn('背後的按鈕').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(btn('背後的按鈕'));
  });
});
