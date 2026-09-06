import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Heatmap } from './Heatmap';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { localDayKey } from '@/lib/utils';

/**
 * 熱力圖的觸控與鍵盤。
 *
 * 格子以前是 12px 的 `<div>`，只有 onMouseEnter／onMouseLeave。
 * 手機上**沒有任何辦法**看到某一天的 XP 與題數（下面那個 tooltip 欄位
 * 永遠是空的），鍵盤也到不了任何一格。
 *
 * 另外一個容易做白工的地方：容器原本是 `role="img"`，
 * 那個 role 會讓子元素完全不暴露給輔助技術 ——
 * 只把格子改成 button 而沒拿掉它的話，螢幕閱讀器仍然一格都讀不到。
 */

const today = localDayKey();

describe('熱力圖', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
    useProgressStore.getState().reset();
    useProgressStore.setState({
      dailyStats: { [today]: { answered: 7, correct: 5, seconds: 90, xp: 42 } },
    });
  });

  it('有練習的那一天是可以聚焦的按鈕，而且標籤帶著日期與數字', () => {
    render(<Heatmap />);
    const cell = screen.getByRole('button', { name: new RegExp(today) });
    expect(cell.getAttribute('aria-label')).toContain('42');
    expect(cell.getAttribute('aria-label')).toContain('7');
    // 桌機的原生 tooltip 也要有
    expect(cell.getAttribute('title')).toContain(today);
  });

  it('鍵盤聚焦就看得到那天的數字，不是只有滑鼠', () => {
    render(<Heatmap />);
    fireEvent.focus(screen.getByRole('button', { name: new RegExp(today) }));
    expect(screen.getByText(new RegExp(`${today}：42 XP、7 題`))).toBeTruthy();
  });

  it('點一下（手機唯一的操作）也看得到', () => {
    render(<Heatmap />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(today) }));
    expect(screen.getByText(new RegExp(`${today}：42 XP、7 題`))).toBeTruthy();
  });

  it('沒練習的日子也讀得到，不會只有有顏色的那幾格可以按', () => {
    render(<Heatmap weeks={4} />);
    // 四週 28 格扣掉未來的補格，剩下的每一格都該是 button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(20);
    for (const b of buttons) {
      expect(b.getAttribute('aria-label')).toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });

  it('容器不是 role="img" —— 否則格子改成 button 也讀不到', () => {
    const { container } = render(<Heatmap />);
    expect(container.querySelector('[role="img"]')).toBeNull();
  });

  it('未來的補格不是按鈕，Tab 不會停在上面', () => {
    render(<Heatmap weeks={1} />);
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label')!);
    // 補滿當週用的未來日期不該出現在可聚焦的名單裡
    expect(labels.every((l) => l.slice(0, 10) <= today)).toBe(true);
  });
});
