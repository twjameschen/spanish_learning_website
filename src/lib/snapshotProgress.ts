import { useProgressStore } from '@/store/useProgressStore';
import { deserializeCard, stabilityToStars, isWordKey } from './fsrs';
import { allLessons, journey } from '@/content';
import type { AchievementSnapshot } from './achievements';
import type { Level } from '@/content/schema';

/**
 * 把 store 裡的原始進度整理成成就判定用的扁平快照。
 *
 * 刻意獨立成一個函式而不是散在各處：成就、儀表板、旅程地圖都需要
 * 「哪些課完成了、哪些城市通關了」這類推導值，集中在這裡才不會各算各的。
 */
export function buildAchievementSnapshot(): AchievementSnapshot {
  const { cards, dailyStats, lessons, totalXp, streak, recentLog } = useProgressStore.getState();

  let wordsLearned = 0;
  let wordsMastered = 0;
  for (const [key, stored] of Object.entries(cards)) {
    if (!isWordKey(key)) continue;
    const stars = stabilityToStars(deserializeCard(stored));
    if (stars >= 1) wordsLearned += 1;
    if (stars >= 5) wordsMastered += 1;
  }

  const days = Object.values(dailyStats);
  const totalAnswered = days.reduce((n, d) => n + d.answered, 0);
  const totalCorrect = days.reduce((n, d) => n + d.correct, 0);
  const bestDayXp = days.reduce((m, d) => Math.max(m, d.xp), 0);

  const completedIds = new Set(Object.keys(lessons));
  const perfectLessons = Object.values(lessons).filter((l) => l.bestAccuracy >= 1).length;

  const citiesCleared = journey.filter(
    (stop) => stop.lessonIds.length > 0 && stop.lessonIds.every((id) => completedIds.has(id)),
  ).length;

  const levelsCleared: string[] = [];
  for (const level of ['A0', 'A1', 'A2', 'B1'] as Level[]) {
    const inLevel = allLessons.filter((l) => l.level === level);
    if (inLevel.length > 0 && inLevel.every((l) => completedIds.has(l.id))) {
      levelsCleared.push(level);
    }
  }

  // 最長連對：從明細往回掃，找最長的連續答對段
  let bestCombo = 0;
  let run = 0;
  for (const record of recentLog) {
    if (record.correct) {
      run += 1;
      bestCombo = Math.max(bestCombo, run);
    } else {
      run = 0;
    }
  }

  return {
    totalXp,
    totalAnswered,
    totalCorrect,
    wordsLearned,
    wordsMastered,
    lessonsCompleted: completedIds.size,
    perfectLessons,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    bestDayXp,
    activeDays: days.length,
    citiesCleared,
    levelsCleared,
    bestCombo,
  };
}

/** 今天累積的練習秒數是否已達每日目標（分鐘） */
export function metDailyGoal(goalMinutes: number, day: string): boolean {
  const stat = useProgressStore.getState().dailyStats[day];
  if (!stat) return false;
  return stat.seconds >= goalMinutes * 60;
}
