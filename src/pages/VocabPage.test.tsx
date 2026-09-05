import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VocabPage } from './VocabPage';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 單字表。
 *
 * 這一組不是為了測功能才寫的，是為了**先把行為釘住再動渲染** ——
 * 接下來要加 `React.memo`、要把清單 key 的 locale 前綴拿掉、
 * 要開 `content-visibility`，這三件事都有可能把「搜尋篩得動」
 * 或「切語言內容跟著換」弄壞，而且弄壞了畫面還是看起來好好的。
 */

const search = (value: string) => {
  const input = screen.getByRole('textbox', { name: /搜尋|Search/ });
  fireEvent.change(input, { target: { value } });
};

/** 卡片的標題就是西班牙文的字 */
const headings = () =>
  // query 版本：篩到零筆時要回空陣列，不是丟例外
  screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('單字表', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
  });

  it('搜尋會篩掉不符合的卡片', () => {
    render(<VocabPage />);
    const all = headings().length;
    expect(all).toBeGreaterThan(100);

    search('café');
    const found = headings();
    expect(found.length).toBeLessThan(all);
    expect(found).toContain('café');
    expect(found).not.toContain('hola');
  });

  it('搜尋忽略重音，打 cafe 也找得到 café', () => {
    render(<VocabPage />);
    search('cafe');
    expect(headings()).toContain('café');
  });

  it('中文字義也搜得到', () => {
    render(<VocabPage />);
    search('咖啡');
    expect(headings()).toContain('café');
  });

  it('切換語言之後卡片內容跟著換', () => {
    const { rerender } = render(<VocabPage />);
    search('café');
    // 中文模式：字義是中文
    expect(screen.getByText('咖啡')).toBeTruthy();

    useSettingsStore.setState({ locale: 'en' });
    rerender(<VocabPage />);

    // 英文模式：同一張卡的字義換成英文，而且搜尋條件沒有被重置
    expect(headings()).toContain('café');
    // coffee 會同時出現在字義與例句翻譯，用 All 版本
    expect(screen.getAllByText(/coffee/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('咖啡')).toBeNull();
  });

  it('找不到東西時給空狀態，不是一片空白', () => {
    render(<VocabPage />);
    search('zzzzzz');
    expect(headings()).toHaveLength(0);
    expect(screen.getByText(/沒有符合的單字|No matching words/)).toBeTruthy();
  });
});
