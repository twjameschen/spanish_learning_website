import type { Localized } from '@/content/schema';
import { levelForXp } from './xp';
import type { AchievementIcon } from './achievementIcons';

/**
 * 成就。
 *
 * 每一個成就都是「純函式 + 門檻」：`progress(snapshot)` 回傳 0–1 的完成度，
 * 這樣同一份定義既能算「解鎖了沒」，也能畫進度條，不必寫兩套邏輯。
 *
 * 名稱與說明是給人看的文字，一律 Localized（i18n 測試會掃）。
 */

export type AchievementId = string;

/** 判定成就所需的進度快照 —— 刻意收斂成一個扁平物件，方便測試 */
export interface AchievementSnapshot {
  totalXp: number;
  totalAnswered: number;
  totalCorrect: number;
  /** 掌握度 ≥ 1 星的單字數 */
  wordsLearned: number;
  /** 掌握度 5 星的單字數 */
  wordsMastered: number;
  lessonsCompleted: number;
  /** 拿到滿分（100%）的課程數 */
  perfectLessons: number;
  currentStreak: number;
  longestStreak: number;
  /** 單日最高 XP */
  bestDayXp: number;
  /** 有練習紀錄的天數 */
  activeDays: number;
  /** 已完成的城市數（該站所有課程都完成） */
  citiesCleared: number;
  /** 已完成的等級代碼，例如 ['A0'] */
  levelsCleared: string[];
  /** 最長連對題數 */
  bestCombo: number;
}

export const emptySnapshot = (): AchievementSnapshot => ({
  totalXp: 0, totalAnswered: 0, totalCorrect: 0,
  wordsLearned: 0, wordsMastered: 0,
  lessonsCompleted: 0, perfectLessons: 0,
  currentStreak: 0, longestStreak: 0,
  bestDayXp: 0, activeDays: 0, citiesCleared: 0,
  levelsCleared: [], bestCombo: 0,
});

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface Achievement {
  id: AchievementId;
  name: Localized;
  description: Localized;
  tier: AchievementTier;
  /** lucide 圖示名稱；限定在註冊表內，打錯字會是編譯錯誤 */
  icon: AchievementIcon;
  /** 目前值 / 門檻 */
  measure: (s: AchievementSnapshot) => { value: number; target: number };
}

const counter = (
  id: string, name: Localized, description: Localized,
  tier: AchievementTier, icon: AchievementIcon,
  pick: (s: AchievementSnapshot) => number, target: number,
): Achievement => ({
  id, name, description, tier, icon,
  measure: (s) => ({ value: pick(s), target }),
});

export const ACHIEVEMENTS: Achievement[] = [
  // ---- 起步 ----
  counter('first-answer',
    { zh: '踏出第一步', en: 'First Step' },
    { zh: '回答第一道題目', en: 'Answer your first question' },
    'bronze', 'Footprints', (s) => s.totalAnswered, 1),
  counter('first-lesson',
    { zh: '完成第一課', en: 'First Lesson' },
    { zh: '完成任何一課的練習', en: 'Finish the practice for any lesson' },
    'bronze', 'BookOpen', (s) => s.lessonsCompleted, 1),
  counter('first-perfect',
    { zh: '首次滿分', en: 'Flawless' },
    { zh: '在一課中全部答對', en: 'Get every question right in a lesson' },
    'silver', 'Target', (s) => s.perfectLessons, 1),

  // ---- 單字量 ----
  counter('words-25',
    { zh: '起步的 25 個字', en: '25 Words In' },
    { zh: '學過 25 個單字', en: 'Encounter 25 words' },
    'bronze', 'BookMarked', (s) => s.wordsLearned, 25),
  counter('words-100',
    { zh: '掌握 100 個單字', en: 'Hundred Club' },
    { zh: '學過 100 個單字', en: 'Encounter 100 words' },
    'silver', 'Library', (s) => s.wordsLearned, 100),
  counter('words-250',
    { zh: '單字庫破 250', en: 'Word Hoard' },
    { zh: '學過 250 個單字', en: 'Encounter 250 words' },
    'gold', 'Boxes', (s) => s.wordsLearned, 250),
  counter('mastered-25',
    { zh: '25 個字滾瓜爛熟', en: '25 Mastered' },
    { zh: '有 25 個單字達到 5 星掌握度', en: 'Reach 5-star mastery on 25 words' },
    'gold', 'Star', (s) => s.wordsMastered, 25),

  // ---- 連續天數 ----
  counter('streak-3',
    { zh: '三天不斷', en: '3-Day Streak' },
    { zh: '連續 3 天達成每日目標', en: 'Hit your daily goal 3 days running' },
    'bronze', 'Flame', (s) => s.longestStreak, 3),
  counter('streak-7',
    { zh: '一週不斷', en: 'Week Warrior' },
    { zh: '連續 7 天達成每日目標', en: 'Hit your daily goal 7 days running' },
    'silver', 'Flame', (s) => s.longestStreak, 7),
  counter('streak-30',
    { zh: '一個月不斷', en: 'Month Strong' },
    { zh: '連續 30 天達成每日目標', en: 'Hit your daily goal 30 days running' },
    'gold', 'Flame', (s) => s.longestStreak, 30),
  counter('active-50',
    { zh: '練了 50 天', en: '50 Days In' },
    { zh: '累積 50 個有練習的日子', en: 'Practise on 50 separate days' },
    'silver', 'CalendarDays', (s) => s.activeDays, 50),

  // ---- XP 與等級 ----
  counter('xp-500',
    { zh: '累積 500 XP', en: '500 XP' },
    { zh: '總共賺到 500 XP', en: 'Earn 500 XP in total' },
    'bronze', 'Zap', (s) => s.totalXp, 500),
  counter('xp-5000',
    { zh: '累積 5000 XP', en: '5000 XP' },
    { zh: '總共賺到 5000 XP', en: 'Earn 5000 XP in total' },
    'gold', 'Zap', (s) => s.totalXp, 5000),
  counter('day-500',
    { zh: '單日 500 XP', en: 'Big Day' },
    { zh: '一天之內賺到 500 XP', en: 'Earn 500 XP in a single day' },
    'gold', 'Rocket', (s) => s.bestDayXp, 500),
  counter('level-10',
    { zh: '升到 10 級', en: 'Level 10' },
    { zh: '達到等級 10', en: 'Reach level 10' },
    'silver', 'TrendingUp', (s) => levelForXp(s.totalXp), 10),

  // ---- 準確度與連對 ----
  counter('combo-10',
    { zh: '連對 10 題', en: '10 in a Row' },
    { zh: '一口氣連續答對 10 題', en: 'Answer 10 questions correctly in a row' },
    'bronze', 'Flame', (s) => s.bestCombo, 10),
  counter('combo-25',
    { zh: '連對 25 題', en: '25 in a Row' },
    { zh: '一口氣連續答對 25 題', en: 'Answer 25 questions correctly in a row' },
    'gold', 'Sparkles', (s) => s.bestCombo, 25),
  counter('answered-500',
    { zh: '答了 500 題', en: '500 Questions' },
    { zh: '累積作答 500 題', en: 'Answer 500 questions in total' },
    'silver', 'ListChecks', (s) => s.totalAnswered, 500),

  // ---- 課程與旅程 ----
  counter('lessons-10',
    { zh: '完成 10 課', en: '10 Lessons' },
    { zh: '完成 10 課的練習', en: 'Finish practice for 10 lessons' },
    'silver', 'GraduationCap', (s) => s.lessonsCompleted, 10),
  counter('perfect-5',
    { zh: '五次滿分', en: 'Five Flawless' },
    { zh: '在 5 課中全部答對', en: 'Get a perfect score in 5 lessons' },
    'gold', 'Award', (s) => s.perfectLessons, 5),
  counter('city-1',
    { zh: '離開台北', en: 'Leaving Taipei' },
    { zh: '完成第一站的所有課程', en: 'Complete every lesson at the first stop' },
    'silver', 'Plane', (s) => s.citiesCleared, 1),
  counter('city-all',
    { zh: '抵達加拉巴哥', en: 'Reached the Galápagos' },
    { zh: '走完旅程上的五個城市', en: 'Complete all five stops on the journey' },
    'gold', 'MapPin', (s) => s.citiesCleared, 5),

  // ---- 里程碑 ----
  {
    id: 'level-a0',
    name: { zh: '生存包到手', en: 'Survival Kit' },
    description: { zh: '完成 A0 的全部課程', en: 'Complete every A0 lesson' },
    tier: 'silver', icon: 'PackageCheck',
    measure: (s) => ({ value: s.levelsCleared.includes('A0') ? 1 : 0, target: 1 }),
  },
  {
    id: 'level-a1',
    name: { zh: '應付日常', en: 'Everyday Spanish' },
    description: { zh: '完成 A1 的全部課程', en: 'Complete every A1 lesson' },
    tier: 'gold', icon: 'MessagesSquare',
    measure: (s) => ({ value: s.levelsCleared.includes('A1') ? 1 : 0, target: 1 }),
  },
  {
    id: 'level-a2',
    name: { zh: '說得出過去', en: 'Past Tense Pro' },
    description: { zh: '完成 A2 的全部課程', en: 'Complete every A2 lesson' },
    tier: 'gold', icon: 'History',
    measure: (s) => ({ value: s.levelsCleared.includes('A2') ? 1 : 0, target: 1 }),
  },
  {
    id: 'level-b1',
    name: { zh: '攻克虛擬式', en: 'Subjunctive Slayer' },
    description: { zh: '完成 B1 的全部課程', en: 'Complete every B1 lesson' },
    tier: 'gold', icon: 'Crown',
    measure: (s) => ({ value: s.levelsCleared.includes('B1') ? 1 : 0, target: 1 }),
  },
];

export interface AchievementStatus {
  achievement: Achievement;
  value: number;
  target: number;
  ratio: number;
  unlocked: boolean;
}

export function evaluateAchievements(snapshot: AchievementSnapshot): AchievementStatus[] {
  return ACHIEVEMENTS.map((achievement) => {
    const { value, target } = achievement.measure(snapshot);
    return {
      achievement,
      value,
      target,
      ratio: target > 0 ? Math.min(1, value / target) : 0,
      unlocked: value >= target,
    };
  });
}

/** 比較前後兩個快照，找出這次新解鎖的成就（用於慶祝動畫） */
export function newlyUnlocked(
  before: AchievementSnapshot,
  after: AchievementSnapshot,
): Achievement[] {
  const wasUnlocked = new Set(
    evaluateAchievements(before).filter((a) => a.unlocked).map((a) => a.achievement.id),
  );
  return evaluateAchievements(after)
    .filter((a) => a.unlocked && !wasUnlocked.has(a.achievement.id))
    .map((a) => a.achievement);
}
