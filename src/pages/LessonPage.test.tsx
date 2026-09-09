import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonPage } from './LessonPage';
import { HomePage } from './HomePage';
import { orderedLessons, allLessons, journey, getLesson } from '@/content';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProgressStore } from '@/store/useProgressStore';

/**
 * 課文頁的課程編號。
 *
 * Phase 18 給首頁加了「繼續：第 N 課」，用的是 journey 的**正式順序**。
 * 但課文頁的徽章一直印 `lesson.order` —— 那是**每個城市各自從 1 開始編**的。
 * 於是同一課在兩個畫面上有兩個編號：首頁說「繼續：第 41 課」，
 * 點進去卻寫「第 6 課」。
 *
 * 課程列表印 order 沒問題（課排在城市標題底下，讀得出是那一站的第幾課），
 * 壞的是課文頁 —— 那顆徽章旁邊沒有城市可以當 context。
 */

/** 每一站的最後一課：city 內編號小、全域編號大，兩套編號差最多 */
const lastOfEachCity = journey
  .filter((s) => s.lessonIds.length > 0)
  .map((s) => s.lessonIds[s.lessonIds.length - 1]!);

describe('課文頁的課程編號', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
    useProgressStore.getState().reset();
  });

  it('印的是正式順序的位置與總數，不是城市內的編號', () => {
    for (const id of lastOfEachCity) {
      const { unmount } = render(<LessonPage id={id} />);
      const no = orderedLessons.findIndex((l) => l.id === id) + 1;
      expect(
        screen.getByText(`第 ${no} / ${allLessons.length} 課`),
        `${id} 應該印第 ${no} 課`,
      ).toBeTruthy();
      unmount();
    }
  });

  /*
   * 這一條就是那個不一致本身：加拉巴哥的最後一課在城市內是第 6 課、
   * 在正式順序裡是第 41 課，首頁與課文頁必須說同一個數字。
   */
  it('首頁的「繼續」與課文頁講的是同一個編號', () => {
    const id = orderedLessons[orderedLessons.length - 1]!.id;
    const cityOrder = getLesson(id)!.order;
    const globalNo = orderedLessons.length;
    expect(cityOrder).not.toBe(globalNo); // 前提：這一課的兩套編號確實不同

    // 除了最後一課，全部標成做完 → 首頁的「繼續」就會指到它
    useProgressStore.setState({
      lessons: Object.fromEntries(
        orderedLessons.slice(0, -1).map((l) => [
          l.id, { completedAt: '2026-09-01T00:00:00.000Z', bestAccuracy: 1, attempts: 1 },
        ]),
      ),
    });
    const home = render(<HomePage />);
    expect(screen.getByRole('link', { name: new RegExp(`繼續：第 ${globalNo} 課`) })).toBeTruthy();
    home.unmount();

    render(<LessonPage id={id} />);
    expect(screen.getByText(`第 ${globalNo} / ${allLessons.length} 課`)).toBeTruthy();
    expect(screen.queryByText(`第 ${cityOrder} / ${allLessons.length} 課`)).toBeNull();
  });

  it('第一課是第 1 課，最後一課是第 41 課', () => {
    const first = render(<LessonPage id={orderedLessons[0]!.id} />);
    expect(screen.getByText(`第 1 / ${allLessons.length} 課`)).toBeTruthy();
    first.unmount();
    render(<LessonPage id={orderedLessons[orderedLessons.length - 1]!.id} />);
    expect(screen.getByText(`第 ${allLessons.length} / ${allLessons.length} 課`)).toBeTruthy();
  });

  /*
   * 那顆綠色徽章 41 課全部都亮（`usesOnlyTaughtGrammar` 沒有一課是 false），
   * 分辨不出任何東西，而且把一個沒有東西查核的作者自述畫成已驗證的屬性。
   */
  it('不再顯示無條件的「例句嚴格分級」徽章', () => {
    expect(allLessons.every((l) => l.usesOnlyTaughtGrammar)).toBe(true);
    render(<LessonPage id={orderedLessons[0]!.id} />);
    expect(screen.queryByText(/例句嚴格分級|Strictly staged/)).toBeNull();
  });
});
