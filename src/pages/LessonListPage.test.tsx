import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LessonListPage } from './LessonPage';
import { allLessons, journey, getLesson } from '@/content';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 課程列表的完成標記。
 *
 * `completedAt` 與 `bestAccuracy` 從 Phase 4 就寫進 store，
 * 但**沒有任何畫面讀它們** —— 41 課的列表上完全看不出哪些做過、哪些全對。
 * 偏偏有兩個成就就是「在 N 課中全部答對」：
 * app 要你達到一個數字，卻從來不告訴你單項進度。
 */

/** 基多那一站的第一課，用來當受測對象 */
const quito = journey.find((s) => s.city === 'quito')!;
const firstId = quito.lessonIds[0]!;
const secondId = quito.lessonIds[1]!;

const markDone = (id: string, bestAccuracy: number) => {
  useProgressStore.setState({
    lessons: {
      ...useProgressStore.getState().lessons,
      [id]: { completedAt: '2026-09-01T00:00:00.000Z', bestAccuracy, attempts: 1 },
    },
  });
};

/** 某一課那一列 */
const rowFor = (id: string) => {
  const title = getLesson(id)!.title.zh;
  return screen.getAllByRole('listitem').find((li) => li.textContent?.includes(title))!;
};

describe('課程列表的完成標記', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
    useProgressStore.getState().reset();
  });

  it('一課都沒做時，沒有任何完成標記', () => {
    render(<LessonListPage />);
    expect(screen.queryAllByTitle('這一課做過了')).toHaveLength(0);
    expect(screen.queryByText('全對')).toBeNull();
  });

  it('做過的課會標成完成，沒做過的維持序號', () => {
    markDone(firstId, 0.8);
    render(<LessonListPage />);

    expect(within(rowFor(firstId)).getByTitle('這一課做過了')).toBeTruthy();
    // 沒做過的那一課不該被標到
    expect(within(rowFor(secondId)).queryByTitle('這一課做過了')).toBeNull();
  });

  it('做過但沒全對，顯示最佳正確率', () => {
    markDone(firstId, 0.75);
    render(<LessonListPage />);
    expect(within(rowFor(firstId)).getByText('最佳 75%')).toBeTruthy();
    expect(within(rowFor(firstId)).queryByText('全對')).toBeNull();
  });

  it('全對過的課另外標「全對」—— 那正是兩個成就在數的東西', () => {
    markDone(firstId, 1);
    render(<LessonListPage />);
    expect(within(rowFor(firstId)).getByText('全對')).toBeTruthy();
    expect(within(rowFor(firstId)).queryByText(/最佳/)).toBeNull();
  });

  it('城市標題顯示這一站做完幾課', () => {
    markDone(firstId, 1);
    markDone(secondId, 0.5);
    render(<LessonListPage />);
    expect(screen.getByText(`做完 2 / ${quito.lessonIds.length} 課`)).toBeTruthy();
  });

  it('整站做完時城市標題變成成功樣式', () => {
    const galapagos = journey.find((s) => s.city === 'galapagos')!;
    for (const id of galapagos.lessonIds) markDone(id, 1);
    render(<LessonListPage />);
    const badge = screen.getByText(`做完 ${galapagos.lessonIds.length} / ${galapagos.lessonIds.length} 課`);
    expect(badge).toBeTruthy();
  });

  it('切成英文時標記跟著換', () => {
    markDone(firstId, 1);
    const { rerender } = render(<LessonListPage />);
    expect(screen.getByText('全對')).toBeTruthy();

    useSettingsStore.setState({ locale: 'en' });
    rerender(<LessonListPage />);
    expect(screen.getByText('Perfect')).toBeTruthy();
    expect(screen.queryByText('全對')).toBeNull();
  });

  it('全部 41 課都列得出來', () => {
    render(<LessonListPage />);
    // 有內容的城市才會列課；台北到加拉巴哥全部都有
    expect(screen.getAllByRole('listitem').length).toBe(allLessons.length);
  });
});
