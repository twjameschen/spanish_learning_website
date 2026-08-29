import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore, dueEntries, dueTodayCount, starsForWord, wordKey, exerciseKey } from './useProgressStore';
import { deserializeCard } from '@/lib/fsrs';
import { initStorage, __resetStorageForTests } from '@/lib/storage';
import { endOfLocalDay } from '@/lib/utils';

const reset = () => useProgressStore.getState().reset();

describe('作答紀錄', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    reset();
  });

  it('第一次作答會建立卡片並排程', () => {
    useProgressStore.getState().recordAnswer({
      key: exerciseKey('ex-hay-1'), exerciseType: 'mcq', correct: true, ms: 4000, xp: 10,
    });
    const stored = useProgressStore.getState().cards['x:ex-hay-1'];
    expect(stored).toBeDefined();
    const card = deserializeCard(stored!);
    expect(card.reps).toBe(1);
    // 答對後應該排到未來，不是立刻再問一次
    expect(card.due.getTime()).toBeGreaterThan(Date.now());
  });

  it('累計每日統計與總 XP', () => {
    const s = useProgressStore.getState();
    s.recordAnswer({ key: exerciseKey('a'), exerciseType: 'mcq', correct: true, ms: 3000, xp: 10 });
    s.recordAnswer({ key: exerciseKey('b'), exerciseType: 'mcq', correct: false, ms: 5000, xp: 0 });

    const state = useProgressStore.getState();
    const today = Object.values(state.dailyStats)[0]!;
    expect(today.answered).toBe(2);
    expect(today.correct).toBe(1);
    expect(today.seconds).toBe(8);
    expect(state.totalXp).toBe(10);
  });

  it('明細有上限，滿了之後砍掉最舊的', () => {
    // 直接把 log 灌到上限，再記一筆 —— 不用真的跑兩千次排程
    const filler = Array.from({ length: 2000 }, (_, i) => ({
      at: new Date(Date.now() - i * 1000).toISOString(),
      day: '2026-08-01',
      key: exerciseKey(`old${i}`),
      exerciseType: 'mcq' as const,
      correct: true,
      ms: 100,
    }));
    useProgressStore.setState({ recentLog: filler });

    useProgressStore.getState().recordAnswer({
      key: exerciseKey('newest'), exerciseType: 'mcq', correct: true, ms: 100,
    });

    const log = useProgressStore.getState().recentLog;
    expect(log.length).toBe(2000);
    expect(log[0]?.key).toBe('x:newest');
    // 最舊的那一筆被擠掉了
    expect(log.some((r) => r.key === 'x:old1999')).toBe(false);
  });

  it('每日聚合不受明細上限影響，會如實累加', () => {
    const s = useProgressStore.getState();
    for (let i = 0; i < 30; i += 1) {
      s.recordAnswer({ key: exerciseKey(`e${i}`), exerciseType: 'mcq', correct: i % 2 === 0, ms: 1000 });
    }
    const today = Object.values(useProgressStore.getState().dailyStats)[0]!;
    expect(today.answered).toBe(30);
    expect(today.correct).toBe(15);
  });

  it('明細最新的排在最前面', () => {
    const s = useProgressStore.getState();
    s.recordAnswer({ key: exerciseKey('first'), exerciseType: 'mcq', correct: true, ms: 10 });
    s.recordAnswer({ key: exerciseKey('second'), exerciseType: 'mcq', correct: true, ms: 10 });
    expect(useProgressStore.getState().recentLog[0]?.key).toBe('x:second');
  });

  it('同一張卡重複作答會累積 reps 而不是新建', () => {
    const s = useProgressStore.getState();
    s.recordAnswer({ key: wordKey('mesa'), exerciseType: 'flashcard', correct: true, ms: 1000 });
    s.recordAnswer({ key: wordKey('mesa'), exerciseType: 'flashcard', correct: true, ms: 1000 });
    expect(deserializeCard(useProgressStore.getState().cards['w:mesa']!).reps).toBe(2);
    expect(Object.keys(useProgressStore.getState().cards)).toHaveLength(1);
  });
});

describe('到期佇列', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    reset();
  });

  it('沒有任何卡片時是空的', () => {
    expect(dueEntries()).toEqual([]);
    expect(dueTodayCount()).toBe(0);
  });

  /**
   * 這是「今天要複習 N 張」語意的關鍵測試。
   * FSRS 的學習階段會把剛答過的卡排在 1–10 分鐘後；
   * 若用「此刻」當界線，剛練完就顯示 0 張，過十分鐘又跳回來，數字沒有意義。
   */
  it('剛答完的卡片仍算在「今天」的份額裡', () => {
    useProgressStore.getState().recordAnswer({
      key: exerciseKey('ex-1'), exerciseType: 'mcq', correct: true, ms: 1000,
    });
    // 嚴格的「現在就到期」會是 0
    expect(dueEntries(new Date()).length).toBe(0);
    // 但「今天之內到期」應該算進去
    expect(dueTodayCount()).toBe(1);
  });

  it('排在明天以後的卡片不算今天', () => {
    const s = useProgressStore.getState();
    s.recordAnswer({ key: exerciseKey('ex-1'), exerciseType: 'mcq', correct: true, ms: 1000 });
    const cards = useProgressStore.getState().cards;
    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString();
    useProgressStore.setState({
      cards: { ...cards, 'x:ex-1': { ...cards['x:ex-1']!, due: nextWeek } },
    });
    expect(dueTodayCount()).toBe(0);
  });

  it('最久沒複習的排前面', () => {
    const base = {
      stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1,
      learning_steps: 0, reps: 1, lapses: 0, state: 2 as const,
    };
    useProgressStore.setState({
      cards: {
        'x:new': { ...base, due: new Date(Date.now() - 1000).toISOString() },
        'x:old': { ...base, due: new Date(Date.now() - 9 * 86_400_000).toISOString() },
      },
    });
    expect(dueEntries(endOfLocalDay()).map((e) => e.id)).toEqual(['old', 'new']);
  });

  it('分得出單字卡與題目卡', () => {
    const s = useProgressStore.getState();
    s.recordAnswer({ key: wordKey('mesa'), exerciseType: 'flashcard', correct: true, ms: 100 });
    s.recordAnswer({ key: exerciseKey('ex-1'), exerciseType: 'mcq', correct: true, ms: 100 });
    const entries = dueEntries(endOfLocalDay());
    expect(entries.find((e) => e.id === 'mesa')?.isWord).toBe(true);
    expect(entries.find((e) => e.id === 'ex-1')?.isWord).toBe(false);
  });
});

describe('掌握度星等', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    reset();
  });

  it('沒學過的字是 0 星', () => {
    expect(starsForWord('mesa')).toBe(0);
  });

  it('學過之後有星等', () => {
    useProgressStore.getState().recordAnswer({
      key: wordKey('mesa'), exerciseType: 'flashcard', correct: true, ms: 1000,
    });
    expect(starsForWord('mesa')).toBeGreaterThanOrEqual(0);
    expect(starsForWord('mesa')).toBeLessThanOrEqual(5);
  });
});

describe('課程完成度', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    reset();
  });

  it('記錄最佳正確率與嘗試次數', () => {
    const s = useProgressStore.getState();
    s.completeLesson('a0-hay', 0.6);
    s.completeLesson('a0-hay', 0.9);
    s.completeLesson('a0-hay', 0.7);
    const p = useProgressStore.getState().lessons['a0-hay']!;
    expect(p.attempts).toBe(3);
    expect(p.bestAccuracy).toBe(0.9);
  });
});
