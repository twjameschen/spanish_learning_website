import { describe, it, expect } from 'vitest';
import {
  initialStreak, advanceStreak, grantWeeklyFreeze, weekStart, isCountedToday,
  MAX_FREEZES, type StreakState,
} from './streak';

/** 從初始狀態依序走過幾天，回傳最後狀態 */
function run(days: [day: string, metGoal: boolean][], from = initialStreak()): StreakState {
  return days.reduce((s, [day, met]) => advanceStreak(s, day, met).state, from);
}

describe('週次判定', () => {
  it('同一週的不同天算同一週', () => {
    // 2026-08-26 是週三
    expect(weekStart('2026-08-26')).toBe(weekStart('2026-08-24')); // 週一
    expect(weekStart('2026-08-26')).toBe(weekStart('2026-08-30')); // 週日
  });
  it('跨週就不同', () => {
    expect(weekStart('2026-08-30')).not.toBe(weekStart('2026-08-31')); // 週日 vs 下週一
  });
  it('週一本身回傳自己', () => {
    expect(weekStart('2026-08-24')).toBe('2026-08-24');
  });
});

describe('每週發 freeze', () => {
  it('同一週只發一次', () => {
    let s = grantWeeklyFreeze(initialStreak(), '2026-08-24');
    expect(s.freezes).toBe(1);
    s = grantWeeklyFreeze(s, '2026-08-26');
    expect(s.freezes).toBe(1);
  });

  it('跨週再發一張', () => {
    let s = grantWeeklyFreeze(initialStreak(), '2026-08-24');
    s = grantWeeklyFreeze(s, '2026-08-31');
    expect(s.freezes).toBe(2);
  });

  it(`最多囤 ${MAX_FREEZES} 張，不會無限累積`, () => {
    let s = initialStreak();
    for (const day of ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']) {
      s = grantWeeklyFreeze(s, day);
    }
    expect(s.freezes).toBe(MAX_FREEZES);
  });
});

describe('連續天數推進', () => {
  it('第一次達標從 1 開始', () => {
    const { state, event } = advanceStreak(initialStreak(), '2026-08-24', true);
    expect(state.current).toBe(1);
    expect(event).toBe('started');
  });

  it('沒達標時不起算', () => {
    const { state, event } = advanceStreak(initialStreak(), '2026-08-24', false);
    expect(state.current).toBe(0);
    expect(event).toBe('idle');
  });

  it('連續三天累積成 3', () => {
    const s = run([['2026-08-24', true], ['2026-08-25', true], ['2026-08-26', true]]);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('同一天重複達標不重複計算', () => {
    let s = advanceStreak(initialStreak(), '2026-08-24', true).state;
    const again = advanceStreak(s, '2026-08-24', true);
    expect(again.state.current).toBe(1);
    expect(again.event).toBe('already-counted');
  });

  it('最長紀錄不會因為中斷而倒退', () => {
    // 連 3 天 → 中斷很久 → 重新開始
    const s = run([
      ['2026-08-03', true], ['2026-08-04', true], ['2026-08-05', true],
      ['2026-08-20', true],
    ]);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(3);
  });
});

describe('freeze 補洞', () => {
  it('漏一天但有 freeze，連續不中斷且扣一張', () => {
    // 週一起算，跨週會再發一張，所以刻意都在同一週內
    let s = advanceStreak(initialStreak(), '2026-08-24', true).state; // 週一，發 1 張
    expect(s.freezes).toBe(1);

    // 跳過 8/25，直接到 8/26
    const out = advanceStreak(s, '2026-08-26', true);
    expect(out.event).toBe('frozen');
    expect(out.freezesUsed).toBe(1);
    expect(out.state.current).toBe(2);
    expect(out.state.freezes).toBe(0);
  });

  it('漏兩天但只有一張 freeze 就補不起來，連續中斷', () => {
    const s = advanceStreak(initialStreak(), '2026-08-24', true).state;
    const out = advanceStreak(s, '2026-08-27', true); // 漏了 25、26 兩天
    expect(out.event).toBe('broken');
    expect(out.state.current).toBe(1);
    // 補不起來就不該白白扣掉 freeze
    expect(out.state.freezes).toBe(s.freezes);
  });

  it('漏兩天且有兩張 freeze 就補得起來', () => {
    let s = advanceStreak(initialStreak(), '2026-08-24', true).state;
    s = { ...s, freezes: 2 };
    const out = advanceStreak(s, '2026-08-27', true);
    expect(out.event).toBe('frozen');
    expect(out.freezesUsed).toBe(2);
    expect(out.state.current).toBe(2);
    expect(out.state.freezes).toBe(0);
  });

  /**
   * 這條很重要：使用者今天還沒達標時，不該先把 freeze 花掉。
   * 他今天還有機會補救，提早消耗等於平白損失一張。
   */
  it('今天還沒達標時不動用 freeze', () => {
    const s = advanceStreak(initialStreak(), '2026-08-24', true).state;
    const out = advanceStreak(s, '2026-08-26', false);
    expect(out.event).toBe('idle');
    expect(out.freezesUsed).toBe(0);
    expect(out.state.freezes).toBe(s.freezes);
    // 連續天數也還沒被判定中斷
    expect(out.state.current).toBe(1);
  });

  it('中斷後當天沒達標，連續歸零但保留最後活動日', () => {
    const s = advanceStreak(initialStreak(), '2026-08-01', true).state;
    const out = advanceStreak(s, '2026-08-20', false);
    expect(out.event).toBe('broken');
    expect(out.state.current).toBe(0);
  });
});

describe('今日是否已計入', () => {
  it('達標當天回傳 true', () => {
    const s = advanceStreak(initialStreak(), '2026-08-24', true).state;
    expect(isCountedToday(s, '2026-08-24')).toBe(true);
    expect(isCountedToday(s, '2026-08-25')).toBe(false);
  });
});

describe('長期模擬', () => {
  it('每週規律使用時 freeze 不會被無謂消耗', () => {
    const days: [string, boolean][] = [];
    // 2026-08-03 是週一，連續 21 天全部達標
    for (let i = 0; i < 21; i += 1) {
      const d = new Date(Date.UTC(2026, 7, 3 + i));
      days.push([d.toISOString().slice(0, 10), true]);
    }
    const s = run(days);
    expect(s.current).toBe(21);
    // 三週各發一張，但上限是 MAX_FREEZES
    expect(s.freezes).toBe(MAX_FREEZES);
  });
});
