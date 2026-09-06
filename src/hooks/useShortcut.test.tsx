import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShortcut } from './useShortcut';

const press = (key: string, target?: HTMLElement, mods: Partial<KeyboardEventInit> = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, ...mods });
  (target ?? document.body).dispatchEvent(e);
  return e;
};

describe('useShortcut', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('一般按鍵會傳給 handler', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn));
    press('1');
    expect(fn).toHaveBeenCalledWith('1', expect.anything());
  });

  it('焦點在輸入框時完全不接手 —— 使用者正在打字', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn));
    const input = document.createElement('input');
    document.body.append(input);
    press('1', input);
    expect(fn).not.toHaveBeenCalled();
  });

  it('textarea 與 contenteditable 也一樣不接手', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn));
    const ta = document.createElement('textarea');
    const ce = document.createElement('div');
    ce.contentEditable = 'true';
    Object.defineProperty(ce, 'isContentEditable', { value: true });
    document.body.append(ta, ce);
    press('a', ta);
    press('a', ce);
    expect(fn).not.toHaveBeenCalled();
  });

  it('帶修飾鍵不接手，不要跟瀏覽器快捷鍵打架', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn));
    press('1', undefined, { ctrlKey: true });
    press('1', undefined, { metaKey: true });
    press('1', undefined, { altKey: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it('enabled=false 時不掛監聽', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn, false));
    press('1');
    expect(fn).not.toHaveBeenCalled();
  });

  it('卸載後不再觸發', () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useShortcut(fn));
    unmount();
    press('1');
    expect(fn).not.toHaveBeenCalled();
  });

  it('handler 換掉時用最新的，而且不重複註冊', () => {
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = renderHook(({ h }) => useShortcut(h), { initialProps: { h: a } });
    rerender({ h: b });
    press('1');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  /*
   * 對話框開著時不接手。
   *
   * 最諷刺的路徑：練習中點開快捷鍵說明，面板上就列著「1～4 選答案」，
   * 照著按下去以前會替使用者回答背後那一題並寫進記錄。
   */
  it('有對話框開著時不派發', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn));

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    try {
      press('1');
      expect(fn).not.toHaveBeenCalled();
    } finally {
      dialog.remove();
    }
  });

  it('對話框關掉之後又恢復', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn));

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    press('1');
    dialog.remove();

    press('1');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('inDialog 的 handler 在對話框開著時仍然作用 —— 否則會打得開關不掉', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn, true, { inDialog: true }));

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    try {
      press('Escape');
      expect(fn).toHaveBeenCalledWith('Escape', expect.anything());
    } finally {
      dialog.remove();
    }
  });

  it('沒有 aria-modal 的 role=dialog 不算 —— 非強制回應的面板不該癱瘓快捷鍵', () => {
    const fn = vi.fn();
    renderHook(() => useShortcut(fn));

    const panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    document.body.appendChild(panel);
    try {
      press('1');
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      panel.remove();
    }
  });
});
