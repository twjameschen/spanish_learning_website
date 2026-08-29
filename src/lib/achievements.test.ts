import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS, evaluateAchievements, newlyUnlocked, emptySnapshot,
  type AchievementSnapshot,
} from './achievements';
import { localizedSchema } from '@/content/schema';

const snap = (over: Partial<AchievementSnapshot> = {}): AchievementSnapshot =>
  ({ ...emptySnapshot(), ...over });

describe('成就定義', () => {
  it('至少 20 個（規格要求）', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
  });

  it('id 不重複', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('名稱與說明都是完整雙語', () => {
    for (const a of ACHIEVEMENTS) {
      expect(localizedSchema.safeParse(a.name).success, `${a.id} 的 name`).toBe(true);
      expect(localizedSchema.safeParse(a.description).success, `${a.id} 的 description`).toBe(true);
    }
  });

  it('英文欄位不含中文字', () => {
    const han = /[一-鿿]/;
    for (const a of ACHIEVEMENTS) {
      expect(han.test(a.name.en), `${a.id} 的英文名稱`).toBe(false);
      expect(han.test(a.description.en), `${a.id} 的英文說明`).toBe(false);
    }
  });

  it('門檻都是正數', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.measure(emptySnapshot()).target, a.id).toBeGreaterThan(0);
    }
  });
});

describe('成就判定', () => {
  it('全新使用者一個都沒解鎖', () => {
    const unlocked = evaluateAchievements(emptySnapshot()).filter((a) => a.unlocked);
    expect(unlocked).toEqual([]);
  });

  it('答第一題就解鎖「踏出第一步」', () => {
    const r = evaluateAchievements(snap({ totalAnswered: 1 }));
    expect(r.find((a) => a.achievement.id === 'first-answer')?.unlocked).toBe(true);
  });

  it('進度比例正確且不超過 1', () => {
    const r = evaluateAchievements(snap({ wordsLearned: 50 }));
    const words100 = r.find((a) => a.achievement.id === 'words-100')!;
    expect(words100.ratio).toBe(0.5);

    const over = evaluateAchievements(snap({ wordsLearned: 9999 }));
    expect(over.find((a) => a.achievement.id === 'words-100')!.ratio).toBe(1);
  });

  it('等級成就是用累計 XP 換算的，不用另外傳等級', () => {
    // level 10 的門檻是 100 × 9^1.5 = 2700
    const r = evaluateAchievements(snap({ totalXp: 2700 }));
    expect(r.find((a) => a.achievement.id === 'level-10')?.unlocked).toBe(true);
    const below = evaluateAchievements(snap({ totalXp: 2699 }));
    expect(below.find((a) => a.achievement.id === 'level-10')?.unlocked).toBe(false);
  });

  it('等級里程碑是布林式的', () => {
    const r = evaluateAchievements(snap({ levelsCleared: ['A0'] }));
    expect(r.find((a) => a.achievement.id === 'level-a0')?.unlocked).toBe(true);
    expect(r.find((a) => a.achievement.id === 'level-a1')?.unlocked).toBe(false);
  });

  it('連續天數用歷來最長判定，不會因為今天中斷就掉成就', () => {
    const r = evaluateAchievements(snap({ currentStreak: 0, longestStreak: 30 }));
    expect(r.find((a) => a.achievement.id === 'streak-30')?.unlocked).toBe(true);
  });
});

describe('新解鎖偵測', () => {
  it('找出這次跨過門檻的成就', () => {
    const before = snap({ totalAnswered: 0 });
    const after = snap({ totalAnswered: 1 });
    const fresh = newlyUnlocked(before, after);
    expect(fresh.map((a) => a.id)).toContain('first-answer');
  });

  it('已經解鎖過的不會重複回報', () => {
    const before = snap({ totalAnswered: 5 });
    const after = snap({ totalAnswered: 6 });
    expect(newlyUnlocked(before, after).map((a) => a.id)).not.toContain('first-answer');
  });

  it('一次跨過多個門檻時全部回報', () => {
    const fresh = newlyUnlocked(emptySnapshot(), snap({ totalAnswered: 500, totalXp: 500 }));
    const ids = fresh.map((a) => a.id);
    expect(ids).toContain('first-answer');
    expect(ids).toContain('answered-500');
    expect(ids).toContain('xp-500');
  });

  it('沒有任何進展時回傳空陣列', () => {
    const s = snap({ totalAnswered: 3 });
    expect(newlyUnlocked(s, s)).toEqual([]);
  });
});
