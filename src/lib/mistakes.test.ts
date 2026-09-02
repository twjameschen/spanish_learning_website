import { describe, it, expect, beforeEach } from 'vitest';
import { mistakeKeys, mistakeCount, buildMistakeDrill } from './mistakes';
import { useProgressStore } from '@/store/useProgressStore';
import { initStorage, __resetStorageForTests } from './storage';
import { allLessons } from '@/content';
import type { CardKey } from './fsrs';

/**
 * 錯題本。
 *
 * 判定只看**最近一次**作答，所以「後來答對了就自動消失」那一條是核心 ——
 * 少了它就得另外記一份「已訂正」狀態，兩份資料遲早會對不起來。
 */

const exercises = allLessons.flatMap((l) => l.exercises);
const q = (i: number) => exercises[i]!;

const answer = (key: CardKey, correct: boolean) =>
  useProgressStore.getState().recordAnswer({
    key, exerciseType: 'mcq', correct, ms: 1000,
  });

describe('錯題本', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    useProgressStore.getState().reset();
  });

  it('沒答錯過的時候是空的', () => {
    answer(`x:${q(0).id}`, true);
    expect(mistakeKeys()).toEqual([]);
    expect(mistakeCount()).toBe(0);
    expect(buildMistakeDrill()).toEqual([]);
  });

  it('最近一次答錯的才進清單', () => {
    answer(`x:${q(0).id}`, false);
    answer(`x:${q(1).id}`, true);
    expect(mistakeKeys()).toEqual([`x:${q(0).id}`]);
    expect(buildMistakeDrill().map((e) => e.id)).toEqual([q(0).id]);
  });

  it('後來答對了就自動消失', () => {
    answer(`x:${q(0).id}`, false);
    expect(mistakeCount()).toBe(1);
    answer(`x:${q(0).id}`, true);
    expect(mistakeCount()).toBe(0);
  });

  it('答對之後又答錯，還是會回到清單裡', () => {
    answer(`x:${q(0).id}`, false);
    answer(`x:${q(0).id}`, true);
    answer(`x:${q(0).id}`, false);
    expect(mistakeCount()).toBe(1);
  });

  it('同一題錯很多次只出現一次', () => {
    for (let i = 0; i < 5; i += 1) answer(`x:${q(0).id}`, false);
    expect(mistakeKeys()).toHaveLength(1);
    expect(buildMistakeDrill()).toHaveLength(1);
  });

  it('錯得最近的排前面', () => {
    answer(`x:${q(0).id}`, false);
    answer(`x:${q(1).id}`, false);
    answer(`x:${q(2).id}`, false);
    expect(buildMistakeDrill().map((e) => e.id)).toEqual([q(2).id, q(1).id, q(0).id]);
  });

  it('解析不到的孤兒卡片跳過，不會讓整個清單開不起來', () => {
    answer('x:內容改版後不存在的題目', false);
    answer(`x:${q(0).id}`, false);
    expect(mistakeKeys()).toHaveLength(2);      // key 還在
    expect(buildMistakeDrill()).toHaveLength(1); // 但只出得了一題
    expect(mistakeCount()).toBe(1);              // 數字跟實際練得到的一致
  });

  it('limit 有效', () => {
    for (let i = 0; i < 8; i += 1) answer(`x:${q(i).id}`, false);
    expect(buildMistakeDrill(3)).toHaveLength(3);
    expect(mistakeCount()).toBe(8);
  });

  it('單字閃卡答錯也進得了錯題本', () => {
    // w: 卡片是單字閃卡練習建立的，內容裡沒有對應的手寫題目
    answer('w:mesa', false);
    const drill = buildMistakeDrill();
    expect(drill).toHaveLength(1);
    expect(drill[0]!.type).toBe('flashcard');
  });
});
