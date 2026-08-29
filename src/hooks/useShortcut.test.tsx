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
});
