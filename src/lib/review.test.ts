import { describe, it, expect, beforeEach } from 'vitest';
import { buildReviewQueue, reviewQueueCount } from './review';
import { useProgressStore, dueTodayCount } from '@/store/useProgressStore';
import { initStorage, __resetStorageForTests } from './storage';
import { allLessons } from '@/content';
import type { CardKey } from './fsrs';

/**
 * 首頁的「今天要複習 N 張」與複習頁排出來的題目必須是同一個數字。
 *
 * 原本首頁數的是到期卡片的**原始張數**，但孤兒卡片（內容改版後留下的
 * `x:` 指向已不存在的題目）解析不回題目，於是首頁說 8 張、點進去只有 6 張。
 */

const exercises = allLessons.flatMap((l) => l.exercises);
const q = (i: number) => exercises[i]!;

const answer = (key: CardKey) =>
  useProgressStore.getState().recordAnswer({
    key, exerciseType: 'mcq', correct: true, ms: 1000,
  });

describe('複習佇列', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    useProgressStore.getState().reset();
  });

  it('沒有卡片時是空的', () => {
    expect(buildReviewQueue()).toEqual([]);
    expect(reviewQueueCount()).toBe(0);
  });

  it('數字就是佇列長度', () => {
    answer(`x:${q(0).id}`);
    answer(`x:${q(1).id}`);
    expect(reviewQueueCount()).toBe(buildReviewQueue().length);
  });

  it('孤兒卡片不算進去 —— 這正是首頁對不上的情況', () => {
    answer(`x:${q(0).id}`);
    answer('x:內容改版後不存在的題目');

    // 到期卡片有兩張，但只有一張排得出題目
    expect(dueTodayCount()).toBe(2);
    expect(buildReviewQueue()).toHaveLength(1);
    expect(reviewQueueCount()).toBe(1);
    expect(reviewQueueCount()).toBeLessThan(dueTodayCount());
  });

  it('沒有孤兒卡片時，張數與題數一致', () => {
    answer(`x:${q(0).id}`);
    answer(`x:${q(1).id}`);
    expect(reviewQueueCount()).toBe(dueTodayCount());
  });

  it('單字閃卡建立的 w: 卡片算得進去', () => {
    // 內容裡只有 5 題手寫閃卡，但單字閃卡練習會為任何單字建卡片
    answer('w:mesa');
    expect(reviewQueueCount()).toBe(1);
    expect(buildReviewQueue()[0]!.type).toBe('flashcard');
  });
});
