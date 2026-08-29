import { describe, it, expect } from 'vitest';
import {
  heatLevel, heatmapCells, xpSeries, masteryByPos, weakestWords,
  accuracyByType, overview,
} from './dashboard';
import { serializeCard, newCard, reviewCard, Rating, wordKey, exerciseKey } from './fsrs';
import type { StoredCard } from './fsrs';
import type { DailyStat, AnswerRecord } from '@/store/useProgressStore';
import { localDayKey } from './utils';

const day = (offset: number, base = new Date('2026-06-15T12:00:00')) => {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return localDayKey(d);
};
const stat = (xp: number, answered = 5): DailyStat =>
  ({ answered, correct: Math.round(answered * 0.8), seconds: 120, xp });

/** 把一張卡練 n 次，全部答對，拿到比較高的 stability */
function trained(reps: number, rating: Rating = Rating.Good): StoredCard {
  let card = newCard(new Date('2026-01-01T00:00:00'));
  let when = new Date('2026-01-01T00:00:00');
  for (let i = 0; i < reps; i += 1) {
    card = reviewCard(card, rating, when);
    when = new Date(card.due);
  }
  return serializeCard(card);
}

describe('熱力圖', () => {
  it('XP 越多顏色越深，沒練習是 0', () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(10)).toBe(1);
    expect(heatLevel(80)).toBe(2);
    expect(heatLevel(200)).toBe(3);
    expect(heatLevel(500)).toBe(4);
  });

  it('格子數是週數 × 7，且每一直行都是完整的一週', () => {
    const cells = heatmapCells({}, 26, new Date('2026-06-15T12:00:00'));
    expect(cells).toHaveLength(26 * 7);
    // 第一格必定是週一
    const [y, m, d] = cells[0]!.day.split('-').map(Number) as [number, number, number];
    expect(new Date(y, m - 1, d).getDay()).toBe(1);
  });

  it('今天以後的格子標成 future，不上色', () => {
    const today = new Date('2026-06-17T12:00:00'); // 週三
    const cells = heatmapCells({ [localDayKey(today)]: stat(500) }, 4, today);
    const futures = cells.filter((c) => c.future);
    // 該週剩下的週四到週日共 4 天
    expect(futures).toHaveLength(4);
    expect(futures.every((c) => c.level === 0)).toBe(true);
    expect(cells.find((c) => c.day === localDayKey(today))!.level).toBe(4);
  });

  it('把每日 XP 對應到正確的格子', () => {
    const today = new Date('2026-06-15T12:00:00');
    const cells = heatmapCells({ [day(-3, today)]: stat(120) }, 4, today);
    const hit = cells.find((c) => c.day === day(-3, today))!;
    expect(hit.xp).toBe(120);
    expect(hit.level).toBe(2);
  });
});

describe('XP 折線', () => {
  it('沒練習的日子補 0，長度等於天數', () => {
    const today = new Date('2026-06-15T12:00:00');
    const s = xpSeries({ [day(-2, today)]: stat(30) }, 7, today);
    expect(s).toHaveLength(7);
    expect(s.filter((p) => p.xp === 0)).toHaveLength(6);
    expect(s.find((p) => p.day === day(-2, today))!.xp).toBe(30);
  });

  it('累計值從視窗之前的歷史接續，不從 0 重來', () => {
    const today = new Date('2026-06-15T12:00:00');
    const stats = { [day(-60, today)]: stat(500), [day(-1, today)]: stat(40) };
    const s = xpSeries(stats, 7, today);
    // 視窗外那 500 要算進起始累計
    expect(s[0]!.total).toBe(500);
    expect(s[s.length - 1]!.total).toBe(540);
  });

  it('累計值單調不減', () => {
    const today = new Date('2026-06-15T12:00:00');
    const s = xpSeries({ [day(-3, today)]: stat(20), [day(-1, today)]: stat(50) }, 10, today);
    for (let i = 1; i < s.length; i += 1) {
      expect(s[i]!.total).toBeGreaterThanOrEqual(s[i - 1]!.total);
    }
  });
});

describe('詞性雷達', () => {
  it('沒練過的卡片不計入，不會把平均拉到 0', () => {
    const cards = {
      [wordKey('hola')]: serializeCard(newCard()),        // reps = 0
      [wordKey('casa')]: trained(3),
    };
    const stats = masteryByPos(cards);
    const total = stats.reduce((n, s) => n + s.count, 0);
    expect(total).toBe(1);
    expect(stats.every((s) => s.stars > 0)).toBe(true);
  });

  it('文法題的卡片不算進詞性統計', () => {
    const cards = {
      [exerciseKey('ex-hay-1')]: trained(3),
      [wordKey('casa')]: trained(3),
    };
    expect(masteryByPos(cards).reduce((n, s) => n + s.count, 0)).toBe(1);
  });

  it('對應不到單字的卡片會被略過，不會丟錯', () => {
    const cards = { [wordKey('這個字不存在')]: trained(2) };
    expect(masteryByPos(cards)).toEqual([]);
  });

  it('空資料回傳空陣列，不會除以零', () => {
    expect(masteryByPos({})).toEqual([]);
    expect(masteryByPos({}).every((s) => Number.isFinite(s.stars))).toBe(true);
  });
});

describe('最弱的單字', () => {
  it('星等低的排前面', () => {
    const cards = {
      [wordKey('casa')]: trained(6),
      [wordKey('hola')]: trained(1),
    };
    const weak = weakestWords(cards);
    expect(weak[0]!.word.id).toBe('hola');
  });

  it('同星等時失誤多的排前面', () => {
    // 兩張都只練一次，一張答錯過
    let a = newCard(new Date('2026-01-01'));
    a = reviewCard(a, Rating.Good, new Date('2026-01-01'));
    let b = newCard(new Date('2026-01-01'));
    b = reviewCard(b, Rating.Good, new Date('2026-01-01'));
    b = reviewCard(b, Rating.Again, new Date('2026-01-02'));
    const cards = { [wordKey('casa')]: serializeCard(a), [wordKey('hola')]: serializeCard(b) };
    const weak = weakestWords(cards);
    expect(weak[0]!.lapses).toBeGreaterThanOrEqual(weak[1]!.lapses);
  });

  it('沒練過的不列入', () => {
    expect(weakestWords({ [wordKey('casa')]: serializeCard(newCard()) })).toEqual([]);
  });

  it('數量受 limit 限制', () => {
    const cards: Record<string, ReturnType<typeof trained>> = {};
    for (const id of ['casa', 'hola', 'agua', 'pan', 'leche', 'mesa']) {
      cards[wordKey(id)] = trained(1);
    }
    expect(weakestWords(cards, 3)).toHaveLength(3);
  });
});

describe('題型正確率', () => {
  const rec = (type: AnswerRecord['exerciseType'], correct: boolean): AnswerRecord =>
    ({ at: '2026-06-15T00:00:00.000Z', day: '2026-06-15', key: exerciseKey('x'), exerciseType: type, correct, ms: 1000 });

  it('依正確率由低到高排序', () => {
    const log = [
      rec('mcq', true), rec('mcq', true), rec('mcq', true), rec('mcq', false),
      rec('translate', false), rec('translate', false),
    ];
    const stats = accuracyByType(log);
    expect(stats[0]!.type).toBe('translate');
    expect(stats[0]!.accuracy).toBe(0);
    expect(stats[1]!.accuracy).toBeCloseTo(0.75);
  });

  it('空紀錄回傳空陣列', () => {
    expect(accuracyByType([])).toEqual([]);
  });
});

describe('概況', () => {
  it('沒有任何紀錄時正確率是 0，不是 NaN', () => {
    const o = overview({}, {});
    expect(o.accuracy).toBe(0);
    expect(Number.isNaN(o.accuracy)).toBe(false);
    expect(o.activeDays).toBe(0);
  });

  it('加總天數、題數與時間', () => {
    const o = overview({ '2026-06-14': stat(10, 10), '2026-06-15': stat(20, 10) }, {});
    expect(o.activeDays).toBe(2);
    expect(o.totalAnswered).toBe(20);
    expect(o.minutes).toBe(4); // 240 秒
    expect(o.accuracy).toBeCloseTo(0.8);
  });
});
