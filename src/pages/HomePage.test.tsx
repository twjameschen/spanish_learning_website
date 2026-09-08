import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';
import { orderedLessons, allLessons } from '@/content';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 首頁的「從哪裡接下去」。
 *
 * 首頁在此之前只有分類入口（單字、課程、練習、成就…），沒有一條路
 * 直接把人送回上次卡住的地方 —— 隔一天回來的人得先點進課程列表、
 * 再自己回想上次做到哪一課。
 *
 * 順序走的是 journey，不是 `lesson.order`（那個欄位是每個城市各自
 * 從 1 開始編的，拿來排全部 41 課會跳級）。
 */

const markDone = (ids: string[]) => {
  useProgressStore.setState({
    lessons: Object.fromEntries(
      ids.map((id) => [id, { completedAt: '2026-09-01T00:00:00.000Z', bestAccuracy: 1, attempts: 1 }]),
    ),
  });
};

const continueLink = () => screen.queryByRole('link', { name: /繼續：第 \d+ 課/ });

describe('首頁的繼續入口', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
    useProgressStore.getState().reset();
  });

  it('全新使用者被指到第 1 課，連結指的是那一課的課文', () => {
    render(<HomePage />);
    const link = continueLink()!;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('繼續：第 1 課');
    expect(link.getAttribute('href')).toBe(`#/lessons/${orderedLessons[0]!.id}`);
    // 課名也要印出來 —— 只說「第 1 課」等於還是沒說要學什麼
    expect(link.textContent).toContain(orderedLessons[0]!.title.zh);
  });

  it('做完前三課就指到第 4 課', () => {
    markDone(orderedLessons.slice(0, 3).map((l) => l.id));
    render(<HomePage />);
    const link = continueLink()!;
    expect(link.textContent).toContain('繼續：第 4 課');
    expect(link.getAttribute('href')).toBe(`#/lessons/${orderedLessons[3]!.id}`);
  });

  /*
   * 跳著做的人要被帶回最前面那一堂沒做的，不是接在最後做過的那一堂後面 ——
   * 洞留在那裡就永遠補不回來了。
   */
  it('中間跳著做，指的是最前面那一堂沒做的', () => {
    markDone([orderedLessons[0]!.id, orderedLessons[5]!.id]);
    render(<HomePage />);
    expect(continueLink()!.getAttribute('href')).toBe(`#/lessons/${orderedLessons[1]!.id}`);
  });

  it('全部做完就不再叫人往前，改成講複習', () => {
    markDone(orderedLessons.map((l) => l.id));
    render(<HomePage />);
    expect(continueLink()).toBeNull();
    expect(screen.getByText(new RegExp(`${allLessons.length} 課全部做完了`))).toBeTruthy();
    expect(screen.getByText(/用複習把字留住/)).toBeTruthy();
  });

  it('切成英文時這一塊也跟著換', () => {
    useSettingsStore.setState({ locale: 'en' });
    render(<HomePage />);
    const link = screen.getByRole('link', { name: /Continue: lesson 1/ });
    expect(link.textContent).toContain(orderedLessons[0]!.title.en);
  });
});
