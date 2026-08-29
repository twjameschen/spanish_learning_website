import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markish, Inline } from './Markish';

/**
 * 自寫的極簡 markdown 渲染。
 * 內容裡實際用到的語法都要有測試 —— 不支援的語法會原樣露出星號或管線，
 * 學習者看到的就是一堆符號。
 */
describe('Markish', () => {
  it('**粗體** 會變成 <strong>，不會露出星號', () => {
    const { container } = render(<Markish text="這裡有**重點**要看" />);
    expect(container.querySelector('strong')?.textContent).toBe('重點');
    expect(container.textContent).not.toContain('**');
  });

  it('管線表格會渲染成真的 table', () => {
    render(<Markish text={'| 類型 | 用法 |\n|---|---|\n| 甲 | 乙 |\n| 丙 | 丁 |'} />);
    const table = screen.getByRole('table');
    expect(table).toBeDefined();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['類型', '用法']);
    expect(screen.getAllByRole('row')).toHaveLength(3); // 標題 + 兩列
    expect(screen.getByText('丁')).toBeDefined();
  });

  it('表格的儲存格也吃行內格式', () => {
    render(<Markish text={'| a | b |\n|---|---|\n| **粗** | 普通 |'} />);
    expect(screen.getByText('粗').tagName).toBe('STRONG');
  });

  it('沒有分隔線的管線行不會被當成表格', () => {
    // 內容裡如果只是句子含管線符號，不該被誤判
    const { container } = render(<Markish text="| 這不是表格 |" />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('清單、引言、程式碼區塊都還在', () => {
    const { container } = render(
      <Markish text={'- 第一項\n- 第二項\n\n> 重點提示\n\n```\nes ✗ / ✓\n```'} />,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelector('pre')).not.toBeNull();
  });
});

describe('Inline', () => {
  it('只做行內格式，不包區塊元素', () => {
    const { container } = render(<Inline text="哪一句**錯了**？" />);
    expect(container.querySelector('strong')?.textContent).toBe('錯了');
    expect(container.querySelector('p')).toBeNull();
    expect(container.textContent).toBe('哪一句錯了？');
  });
});
