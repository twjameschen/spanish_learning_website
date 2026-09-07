import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { VocabPage } from './VocabPage';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProgressStore, wordKey } from '@/store/useProgressStore';

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

  /*
   * 讀到已經變過位的形式想查原形。
   *
   * 搜尋以前只比對原形、字義與例句，所以打 fui 完全找不到 ——
   * 但資料裡知道 fui 同時屬於 ser 和 ir，正是最需要幫忙的那種歧義。
   */
  it('打 fui 會找到 ser 與 ir，而且卡上標出是哪個時態哪個人稱', () => {
    render(<VocabPage />);
    search('fui');

    const found = headings();
    expect(found).toContain('ser');
    expect(found).toContain('ir');
    expect(screen.getAllByText(/fui＝簡單過去式・我/).length).toBeGreaterThanOrEqual(2);
  });

  it('反身動詞：打 llamo 找得到 llamarse，而且看得出它是反身', () => {
    render(<VocabPage />);
    search('llamo');
    expect(headings()).toContain('llamarse');
    expect(screen.getAllByText('反身').length).toBeGreaterThan(0);
  });

  it('動詞卡連得到完整變位表 —— 卡上只印得下現在式', () => {
    render(<VocabPage />);
    search('ser');
    const link = screen.getAllByRole('link', { name: /看全部 7 個時態/ })[0]!;
    expect(link.getAttribute('href')).toMatch(/^#\/verbs\//);
  });

  /*
   * 熟練度要真的接到卡片上，而且答完題回來會變。
   * 光有 MasteryStars 元件不算數 —— Phase 10／14 的教訓就是
   * 「元件寫好了但沒有畫面到得了」。
   */
  it('學過的字卡片上看得到星等，沒學過的不顯示', async () => {
    useProgressStore.getState().reset();
    render(<VocabPage />);
    search('café');
    expect(screen.queryAllByLabelText(/熟練度/)).toHaveLength(0);

    // 答對一次之後，這個字就有卡片了
    act(() => {
      useProgressStore.getState().recordAnswer({
        key: wordKey('cafe-bebida'), exerciseType: 'flashcard', correct: true, ms: 1200, xp: 2,
      });
    });

    await waitFor(() => {
      expect(screen.queryAllByLabelText(/熟練度/).length).toBeGreaterThan(0);
    });
  });
});
