import { describe, it, expect } from 'vitest';
import {
  xpForAnswer, comboMultiplier, xpThreshold, levelForXp, levelProgress,
  BASE_XP, MAX_COMBO_MULTIPLIER,
} from './xp';

describe('combo 倍率', () => {
  it('沒有連擊時是 1 倍', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
  });
  it('每 5 連加 0.25', () => {
    expect(comboMultiplier(5)).toBe(1.25);
    expect(comboMultiplier(10)).toBe(1.5);
    expect(comboMultiplier(15)).toBe(1.75);
  });
  it('上限 2 倍 —— 長連擊不該把單題價值拉到失真', () => {
    expect(comboMultiplier(20)).toBe(MAX_COMBO_MULTIPLIER);
    expect(comboMultiplier(100)).toBe(MAX_COMBO_MULTIPLIER);
    expect(comboMultiplier(9999)).toBe(MAX_COMBO_MULTIPLIER);
  });
});

describe('單題 XP', () => {
  it('答錯是 0，不扣分', () => {
    expect(xpForAnswer({ correct: false, combo: 30, difficulty: 'hard' })).toBe(0);
  });
  it('答對的基礎值', () => {
    expect(xpForAnswer({ correct: true, combo: 0, difficulty: 'easy' })).toBe(BASE_XP);
  });
  it('難題加權', () => {
    expect(xpForAnswer({ correct: true, combo: 0, difficulty: 'medium' })).toBe(13);
    expect(xpForAnswer({ correct: true, combo: 0, difficulty: 'hard' })).toBe(15);
  });
  it('連擊與難度會相乘', () => {
    // 10 × 1.5（連 10）× 1.5（難）= 22.5 → 23
    expect(xpForAnswer({ correct: true, combo: 10, difficulty: 'hard' })).toBe(23);
  });
  it('永遠是非負整數', () => {
    for (const combo of [0, 3, 7, 25, 200]) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const xp = xpForAnswer({ correct: true, combo, difficulty });
        expect(Number.isInteger(xp)).toBe(true);
        expect(xp).toBeGreaterThan(0);
      }
    }
  });
});

describe('等級曲線', () => {
  it('第 1 級的門檻是 0', () => {
    expect(xpThreshold(1)).toBe(0);
    expect(levelForXp(0)).toBe(1);
  });

  it('照 100 × level^1.5 成長', () => {
    expect(xpThreshold(2)).toBe(100);
    expect(xpThreshold(3)).toBe(283);
    expect(xpThreshold(5)).toBe(800);
  });

  it('門檻嚴格遞增 —— 不能出現升級後反而倒退', () => {
    for (let l = 1; l < 60; l += 1) {
      expect(xpThreshold(l + 1)).toBeGreaterThan(xpThreshold(l));
    }
  });

  it('累計 XP 對應到正確等級', () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(282)).toBe(2);
    expect(levelForXp(283)).toBe(3);
  });

  it('等級與門檻互為反函式', () => {
    for (let l = 1; l <= 40; l += 1) {
      expect(levelForXp(xpThreshold(l))).toBe(l);
      if (l > 1) expect(levelForXp(xpThreshold(l) - 1)).toBe(l - 1);
    }
  });
});

describe('等級進度', () => {
  it('剛升級時比例是 0', () => {
    const p = levelProgress(100);
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(0);
    expect(p.ratio).toBe(0);
  });

  it('距離下一級的差額正確', () => {
    const p = levelProgress(150);
    expect(p.level).toBe(2);
    expect(p.toNext).toBe(xpThreshold(3) - 150);
  });

  it('比例永遠落在 0–1', () => {
    for (const xp of [0, 1, 99, 100, 500, 5000, 100_000]) {
      const p = levelProgress(xp);
      expect(p.ratio).toBeGreaterThanOrEqual(0);
      expect(p.ratio).toBeLessThanOrEqual(1);
    }
  });
});
