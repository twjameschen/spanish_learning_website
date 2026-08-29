import { describe, it, expect, beforeEach } from 'vitest';
import { buildAchievementSnapshot, metDailyGoal } from './snapshotProgress';
import { useProgressStore, wordKey, exerciseKey } from '@/store/useProgressStore';
import { initStorage, __resetStorageForTests } from '@/lib/storage';
import { localDayKey } from '@/lib/utils';
import { journey, allLessons } from '@/content';

const reset = () => useProgressStore.getState().reset();

/** 直接把課程標成完成，不必真的答完題 */
function completeLessons(ids: string[], accuracy = 0.8) {
  for (const id of ids) useProgressStore.getState().completeLesson(id, accuracy);
}

describe('buildAchievementSnapshot', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    reset();
  });

  it('空進度回傳全 0 的快照', () => {
    const s = buildAchievementSnapshot();
    expect(s.totalXp).toBe(0);
    expect(s.totalAnswered).toBe(0);
    expect(s.wordsLearned).toBe(0);
    expect(s.lessonsCompleted).toBe(0);
    expect(s.citiesCleared).toBe(0);
    expect(s.levelsCleared).toEqual([]);
    expect(s.bestCombo).toBe(0);
  });

  it('累計作答數、答對數與 XP', () => {
    const store = useProgressStore.getState();
    store.recordAnswer({ key: exerciseKey('a'), exerciseType: 'mcq', correct: true, ms: 3000, xp: 10 });
    store.recordAnswer({ key: exerciseKey('b'), exerciseType: 'mcq', correct: false, ms: 3000, xp: 0 });
    store.recordAnswer({ key: exerciseKey('c'), exerciseType: 'mcq', correct: true, ms: 3000, xp: 12 });

    const s = buildAchievementSnapshot();
    expect(s.totalAnswered).toBe(3);
    expect(s.totalCorrect).toBe(2);
    expect(s.totalXp).toBe(22);
    expect(s.activeDays).toBe(1);
    expect(s.bestDayXp).toBe(22);
  });

  it('只把單字卡算進 wordsLearned，文法題卡不算', () => {
    const store = useProgressStore.getState();
    store.recordAnswer({ key: wordKey('hola'), exerciseType: 'flashcard', correct: true, ms: 2000, xp: 10 });
    store.recordAnswer({ key: exerciseKey('ex-1'), exerciseType: 'mcq', correct: true, ms: 2000, xp: 10 });

    const s = buildAchievementSnapshot();
    // 兩張卡都建立了，但只有 w: 開頭的算單字
    expect(Object.keys(useProgressStore.getState().cards)).toHaveLength(2);
    expect(s.wordsLearned).toBe(1);
  });

  it('最長連對取整段紀錄裡最長的一段，不是目前這段', () => {
    const store = useProgressStore.getState();
    const answer = (correct: boolean, i: number) =>
      store.recordAnswer({ key: exerciseKey(`e${i}`), exerciseType: 'mcq', correct, ms: 1000, xp: 0 });

    // 對對對 → 錯 → 對對：最長是 3
    [true, true, true, false, true, true].forEach((c, i) => answer(c, i));
    expect(buildAchievementSnapshot().bestCombo).toBe(3);
  });

  it('滿分課程才算 perfectLessons', () => {
    const [a, b] = allLessons;
    completeLessons([a!.id], 1);
    completeLessons([b!.id], 0.9);
    const s = buildAchievementSnapshot();
    expect(s.lessonsCompleted).toBe(2);
    expect(s.perfectLessons).toBe(1);
  });

  it('一站的課全部完成才算通關城市', () => {
    const stop = journey.find((s) => s.lessonIds.length > 0)!;
    completeLessons(stop.lessonIds.slice(0, -1));
    expect(buildAchievementSnapshot().citiesCleared).toBe(0);

    completeLessons(stop.lessonIds);
    expect(buildAchievementSnapshot().citiesCleared).toBe(1);
  });

  it('等級全部課程完成才列入 levelsCleared', () => {
    const a0 = allLessons.filter((l) => l.level === 'A0');
    completeLessons(a0.slice(0, -1).map((l) => l.id));
    expect(buildAchievementSnapshot().levelsCleared).toEqual([]);

    completeLessons(a0.map((l) => l.id));
    expect(buildAchievementSnapshot().levelsCleared).toContain('A0');
  });

  it('沒有任何課程的等級不會被誤判成已通關', () => {
    // A1–B1 在 Phase 5 才有內容；空集合不能算「全部完成」
    const levels = buildAchievementSnapshot().levelsCleared;
    for (const level of ['A1', 'A2', 'B1']) {
      if (allLessons.some((l) => l.level === level)) continue;
      expect(levels).not.toContain(level);
    }
  });
});

describe('metDailyGoal', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    reset();
  });

  it('今天沒有紀錄就是沒達標', () => {
    expect(metDailyGoal(5, localDayKey())).toBe(false);
  });

  it('累積秒數達到目標分鐘數才算達標', () => {
    const store = useProgressStore.getState();
    // 每題 100 秒（未超過 120 秒上限），兩題 = 200 秒，還不到 5 分鐘
    for (let i = 0; i < 2; i += 1) {
      store.recordAnswer({ key: exerciseKey(`e${i}`), exerciseType: 'mcq', correct: true, ms: 100_000, xp: 0 });
    }
    expect(useProgressStore.getState().dailyStats[localDayKey()]!.seconds).toBe(200);
    expect(metDailyGoal(5, localDayKey())).toBe(false);

    // 再加 100 秒剛好 300 秒 = 5 分鐘，門檻是 >=，所以算達標
    store.recordAnswer({ key: exerciseKey('e2'), exerciseType: 'mcq', correct: true, ms: 100_000, xp: 0 });
    expect(metDailyGoal(5, localDayKey())).toBe(true);
  });

  it('單題時間有上限，離開座位不會一題就把目標刷滿', () => {
    const store = useProgressStore.getState();
    // 一題掛在畫面上一小時：只能記 120 秒，不是 3600 秒
    store.recordAnswer({ key: exerciseKey('afk'), exerciseType: 'mcq', correct: true, ms: 3_600_000, xp: 0 });

    expect(useProgressStore.getState().dailyStats[localDayKey()]!.seconds).toBe(120);
    expect(metDailyGoal(5, localDayKey())).toBe(false);
    // 原始 ms 仍完整保留在明細裡，之後分析看得到這個離開的痕跡
    expect(useProgressStore.getState().recentLog[0]!.ms).toBe(3_600_000);
  });

  it('查的是指定那一天，不是全部加總', () => {
    const store = useProgressStore.getState();
    store.recordAnswer({ key: exerciseKey('e'), exerciseType: 'mcq', correct: true, ms: 100_000, xp: 0 });
    expect(metDailyGoal(1, '2020-01-01')).toBe(false);
    expect(metDailyGoal(1, localDayKey())).toBe(true);
  });
});
