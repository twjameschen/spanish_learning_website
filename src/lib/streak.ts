import { localDayKey, daysBetween } from './utils';

/**
 * 連續天數與 streak freeze。
 *
 * 規格 §9：連續天數 + 每週 1 次 streak freeze（漏一天不斷）。
 *
 * 設計上刻意把「狀態推進」寫成純函式 `advanceStreak(state, today, metGoal)`：
 * 連續天數這種東西最容易在跨日、補簽、時區上出錯，
 * 純函式才能用假日期把每個邊界都測過。
 */

export interface StreakState {
  /** 目前連續天數 */
  current: number;
  /** 歷來最長 */
  longest: number;
  /** 最後一個達成每日目標的日子，YYYY-MM-DD；沒有就是 null */
  lastActiveDay: string | null;
  /** 手上還有幾張 freeze */
  freezes: number;
  /** 上次發 freeze 的那一週（以該週的週一為代表），YYYY-MM-DD */
  lastFreezeGrantWeek: string | null;
}

export const MAX_FREEZES = 2;

export const initialStreak = (): StreakState => ({
  current: 0,
  longest: 0,
  lastActiveDay: null,
  freezes: 0,
  lastFreezeGrantWeek: null,
});

/** 該日所屬那一週的週一（ISO 週，週一為首日） */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 週日 = 0，轉成週一 = 0
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return localDayKey(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** 每週發一張 freeze，上限 MAX_FREEZES 張 */
export function grantWeeklyFreeze(state: StreakState, today: string): StreakState {
  const week = weekStart(today);
  if (state.lastFreezeGrantWeek === week) return state;
  return {
    ...state,
    freezes: Math.min(MAX_FREEZES, state.freezes + 1),
    lastFreezeGrantWeek: week,
  };
}

export interface StreakOutcome {
  state: StreakState;
  /** 這次推進發生了什麼，UI 可據此決定要不要慶祝或提醒 */
  event: 'started' | 'continued' | 'already-counted' | 'frozen' | 'broken' | 'idle';
  /** 這次消耗掉的 freeze 張數 */
  freezesUsed: number;
}

/**
 * 推進 streak。
 *
 * @param metGoal 今天是否達成每日目標。false 時只做「檢查有沒有斷」，不增加天數。
 */
export function advanceStreak(
  state: StreakState,
  today: string,
  metGoal: boolean,
): StreakOutcome {
  const granted = grantWeeklyFreeze(state, today);

  if (granted.lastActiveDay === null) {
    if (!metGoal) return { state: granted, event: 'idle', freezesUsed: 0 };
    return {
      state: { ...granted, current: 1, longest: Math.max(granted.longest, 1), lastActiveDay: today },
      event: 'started',
      freezesUsed: 0,
    };
  }

  const gap = daysBetween(granted.lastActiveDay, today);

  // 同一天重複達標：不重複計算，也不算斷
  if (gap <= 0) {
    return { state: granted, event: 'already-counted', freezesUsed: 0 };
  }

  // 昨天才活動過，今天達標就直接續上
  if (gap === 1) {
    if (!metGoal) return { state: granted, event: 'idle', freezesUsed: 0 };
    const current = granted.current + 1;
    return {
      state: { ...granted, current, longest: Math.max(granted.longest, current), lastActiveDay: today },
      event: 'continued',
      freezesUsed: 0,
    };
  }

  // 中間漏了 gap - 1 天，看 freeze 夠不夠補
  const missed = gap - 1;
  if (missed <= granted.freezes) {
    if (!metGoal) {
      // 還沒達標就先不動用 freeze —— 今天還有機會補救
      return { state: granted, event: 'idle', freezesUsed: 0 };
    }
    const current = granted.current + 1;
    return {
      state: {
        ...granted,
        current,
        longest: Math.max(granted.longest, current),
        lastActiveDay: today,
        freezes: granted.freezes - missed,
      },
      event: 'frozen',
      freezesUsed: missed,
    };
  }

  // freeze 不夠，連續中斷
  return {
    state: {
      ...granted,
      current: metGoal ? 1 : 0,
      lastActiveDay: metGoal ? today : granted.lastActiveDay,
    },
    event: 'broken',
    freezesUsed: 0,
  };
}

/** 今天是否已經計入連續天數 */
export const isCountedToday = (state: StreakState, today = localDayKey()): boolean =>
  state.lastActiveDay === today;
