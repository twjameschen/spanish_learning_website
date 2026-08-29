import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExercisePlayer } from './ExercisePlayer';
import { useProgressStore } from '@/store/useProgressStore';
import { initStorage, __resetStorageForTests } from '@/lib/storage';
import type { Exercise } from '@/content/schema';

/**
 * ExercisePlayer 的互動測試。
 *
 * 這一層測的是**流程**：答錯要看到解釋、答對要累計 XP、
 * combo 斷掉要歸零、走完要結算。個別題型的判分邏輯在各自的模組測試裡。
 */

const mcq = (id: string, answerIndex: number): Exercise => ({
  id,
  type: 'mcq',
  difficulty: 'easy',
  explain: { zh: `${id} 的通用解釋`, en: `general explanation for ${id}` },
  prompt: { zh: `題目 ${id}`, en: `question ${id}` },
  options: [0, 1, 2, 3].map((i) => ({ zh: `選項${i}`, en: `option${i}` })),
  answerIndex,
  optionExplains: [0, 1, 2, 3].map((i) => ({
    zh: `選項${i}的說明`,
    en: `why option${i}`,
  })),
});

const pick = (i: number) => fireEvent.click(screen.getByText(`選項${i}`));
const next = () => fireEvent.click(screen.getByRole('button', { name: /下一題|完成/ }));

describe('ExercisePlayer', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    useProgressStore.getState().reset();
  });

  it('答錯時同時顯示「所選選項為何錯」與題目通用解釋', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(2);

    expect(screen.getByText('答錯了')).toBeTruthy();
    // 針對選錯的那一個
    expect(screen.getAllByText('選項2的說明').length).toBeGreaterThan(0);
    // 題目本身的解釋
    expect(screen.getByText('q1 的通用解釋')).toBeTruthy();
  });

  it('答錯不會前進，要按下一題才走', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    expect(screen.getByText('1/2')).toBeTruthy();
    pick(3);
    expect(screen.getByText('1/2')).toBeTruthy();
    next();
    expect(screen.getByText('2/2')).toBeTruthy();
  });

  it('答對累計 XP，答錯不加分也不扣分', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0), mcq('q3', 0)]} />);
    pick(0); // 對
    expect(screen.getByText('+10 XP')).toBeTruthy();
    next();
    pick(1); // 錯
    expect(screen.getByText('+10 XP')).toBeTruthy();
  });

  it('連對兩題以上才顯示 combo 標記，答錯就消失', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0), mcq('q3', 0)]} />);
    pick(0);
    expect(screen.queryByText(/連對/)).toBeNull(); // 才 1 連，不顯示
    next();
    pick(0);
    expect(screen.getByText(/連對 2/)).toBeTruthy();
    next();
    pick(1); // 答錯，連擊斷掉
    expect(screen.queryByText(/連對/)).toBeNull();
  });

  it('走完全部題目後顯示結算，正確率算得對', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    pick(0); next();  // 對
    pick(1); next();  // 錯

    expect(screen.getByText('這一輪完成了')).toBeTruthy();
    expect(screen.getByText('答對 1 / 2 題')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('結算後可以重來，計數歸零', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(1); next();
    expect(screen.getByText('這一輪完成了')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /再練一次/ }));
    expect(screen.getByText('1/1')).toBeTruthy();
    expect(screen.queryByText('這一輪完成了')).toBeNull();
  });

  it('每一題都會寫進進度，答錯的卡片也要排程', async () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    pick(3); next();
    pick(0);

    await waitFor(() => {
      const { cards, dailyStats } = useProgressStore.getState();
      expect(Object.keys(cards).sort()).toEqual(['x:q1', 'x:q2']);
      const today = Object.values(dailyStats)[0]!;
      expect(today.answered).toBe(2);
      expect(today.correct).toBe(1);
    });
  });

  it('作答完成後會呼叫 onFinish 並帶上正確率', () => {
    let result: { accuracy: number; correct: number } | null = null;
    render(
      <ExercisePlayer
        exercises={[mcq('q1', 0), mcq('q2', 0)]}
        onFinish={(r) => { result = r; }}
      />,
    );
    pick(0); next();
    pick(0); next();
    expect(result).not.toBeNull();
    expect(result!.correct).toBe(2);
    expect(result!.accuracy).toBe(1);
  });

  it('同一題不能重複作答', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(2);
    pick(0); // 再點正解，不該改變結果
    expect(screen.getByText('答錯了')).toBeTruthy();
    expect(useProgressStore.getState().recentLog).toHaveLength(1);
  });
});
