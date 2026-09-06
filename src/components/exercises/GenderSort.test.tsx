import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GenderSort } from './GenderSort';
import type { Exercise } from '@/content/schema';
import type { ExerciseOutcome } from './types';

/**
 * 陰陽性分類的倒數計時。
 *
 * 倒數與作答以前擠在同一個 effect 裡，而依賴陣列有 `hits` ——
 * `pick()` 每次作答都產生新陣列，於是每按一下就 clearTimeout 掉
 * 還沒到期的那一秒再重排一個新的，已經走掉的那部分被丟掉。
 * 按得比一秒一次快的人會看到時間卡住不動，八個字最多可以賺到約 8 秒。
 */

const ex: Extract<Exercise, { type: 'genderSort' }> = {
  id: 'ex-gen-1',
  type: 'genderSort',
  difficulty: 'easy',
  explain: { zh: '通用解釋', en: 'general explanation' },
  wordIds: ['libro', 'mesa', 'casa', 'mercado'],
  seconds: 60,
};

function setup() {
  const outcomes: ExerciseOutcome[] = [];
  render(
    <GenderSort
      exercise={ex}
      answered={false}
      outcome={null}
      onAnswer={(o) => outcomes.push(o)}
    />,
  );
  return outcomes;
}

/** 畫面上顯示的剩餘秒數（畫的是「60s」） */
const secondsLeft = () => Number(screen.getByText(/^\d+s$/).textContent!.replace('s', ''));

/**
 * 一秒一秒推進。
 *
 * 不能一次 advanceTimersByTime(60000)：下一個 setTimeout 是在 React
 * 重新 render 之後的 effect 裡才排的，一次跳完不會排到後面那些。
 */
const tick = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) {
    act(() => { vi.advanceTimersByTime(1000); });
  }
};

describe('陰陽性分類的倒數', () => {
  afterEach(() => vi.useRealTimers());

  it('作答不會把倒數重新計時', () => {
    vi.useFakeTimers();
    setup();
    expect(secondsLeft()).toBe(60);

    // 走掉 2 秒
    tick(2);
    expect(secondsLeft()).toBe(58);

    // 在同一秒內連答三題 —— 以前每一次都會把當下那一秒重排
    fireEvent.click(screen.getByRole('button', { name: /^el$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^la$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^la$/ }));

    // 再走 1 秒就該掉到 57，而不是因為被重排而停在 58
    tick(1);
    expect(secondsLeft()).toBe(57);
  });

  it('時間到會結算，而且用的是已經答過的結果', () => {
    vi.useFakeTimers();
    const outcomes = setup();

    fireEvent.click(screen.getByRole('button', { name: /^el$/ }));   // libro 陽性，對
    tick(60);

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.given).toBe('1/4');
    // 沒有全部答對，所以這一題算錯
    expect(outcomes[0]!.correct).toBe(false);
  });

  it('全部答完就立刻結算，不必等時間到', () => {
    vi.useFakeTimers();
    const outcomes = setup();

    fireEvent.click(screen.getByRole('button', { name: /^el$/ }));   // libro
    fireEvent.click(screen.getByRole('button', { name: /^la$/ }));   // mesa
    fireEvent.click(screen.getByRole('button', { name: /^la$/ }));   // casa
    fireEvent.click(screen.getByRole('button', { name: /^el$/ }));   // mercado

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.given).toBe('4/4');
    expect(outcomes[0]!.correct).toBe(true);
  });

  it('結算之後倒數就停下來，不會繼續往下跑', () => {
    vi.useFakeTimers();
    const outcomes = setup();
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getAllByRole('button', { name: /^el$|^la$/ })[0]!);
    }
    expect(outcomes).toHaveLength(1);

    tick(30);
    // 只結算一次，不會因為時間繼續跑而再送一次
    expect(outcomes).toHaveLength(1);
  });
});
