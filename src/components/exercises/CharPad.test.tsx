import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef, useState } from 'react';
import { CharPad, insertAtCursor } from './CharPad';
import { SpeakButton } from '@/components/SpeakButton';

/**
 * 西文字元列。
 *
 * 重點是「插在游標位置」而不是接在最後 —— 想在句子中間補一個重音字母時，
 * 接在最後等於要重打後半段。
 */

function Harness({ initial = '' }: { initial?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  return (
    <>
      <CharPad inputRef={ref} value={value} onChange={setValue} />
      <input ref={ref} aria-label="答案" value={value} onChange={(e) => setValue(e.target.value)} />
    </>
  );
}

const input = () => screen.getByLabelText('答案') as HTMLInputElement;
const press = (ch: string) => fireEvent.click(screen.getByRole('button', { name: `插入 ${ch}` }));

describe('插入位置的算法', () => {
  it('插在游標位置，不是接在最後', () => {
    const el = document.createElement('input');
    el.value = 'ano';
    el.setSelectionRange(2, 2);        // a n | o
    expect(insertAtCursor(el, 'ano', '~')).toEqual({ value: 'an~o', caret: 3 });
  });

  it('有選取範圍時取代選取的部分', () => {
    const el = document.createElement('input');
    el.value = 'abc';
    el.setSelectionRange(0, 2);
    expect(insertAtCursor(el, 'abc', 'ñ')).toEqual({ value: 'ñc', caret: 1 });
  });

  it('拿不到輸入框時接在最後（不會爆）', () => {
    expect(insertAtCursor(null, 'hola', 'ñ')).toEqual({ value: 'holañ', caret: 5 });
  });
});

describe('字元列', () => {
  it('九個字元都在', () => {
    render(<Harness />);
    for (const ch of ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡']) {
      expect(screen.getByRole('button', { name: `插入 ${ch}` })).toBeTruthy();
    }
  });

  it('點一下就插進輸入框', () => {
    render(<Harness />);
    press('ñ');
    expect(input().value).toBe('ñ');
  });

  it('插在游標位置 —— 這是整個元件的重點', () => {
    render(<Harness initial="ano" />);
    input().setSelectionRange(2, 2);   // a n | o
    press('ñ');
    expect(input().value).toBe('anño');
  });

  it('連點兩個字元不會錯位', () => {
    render(<Harness initial="ao" />);
    input().setSelectionRange(1, 1);   // a | o
    press('ñ');
    press('í');
    // 第二次要接在第一次插入的字元之後，不是又插回原本的位置
    expect(input().value).toBe('añío');
  });

  it('作答後整列收起來', () => {
    const ref = { current: null };
    render(<CharPad inputRef={ref} value="" onChange={() => {}} disabled />);
    expect(screen.queryByRole('button', { name: /插入/ })).toBeNull();
  });
});

describe('朗讀按鈕', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('沒有西班牙文語音時整顆不顯示', () => {
    // jsdom 沒有 speechSynthesis，走的就是「偵測不到」那條路
    render(<SpeakButton text="hola" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
