/**
 * XP 與等級。
 *
 * 規格 §9：答對基礎 10 XP、連續答對有 combo 加成、難題加權、
 * `nextLevelXp = 100 * level^1.5`。
 */

export const BASE_XP = 10;
export const MAX_COMBO_MULTIPLIER = 2;

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.25,
  hard: 1.5,
};

/**
 * 連續答對的倍率：每 5 連加 0.25，上限 2 倍。
 * 設上限是為了避免長連擊把單題 XP 拉到失真 ——
 * 連對 50 題不該比連對 20 題值錢五倍。
 */
export function comboMultiplier(combo: number): number {
  if (combo <= 0) return 1;
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(combo / 5) * 0.25);
}

export interface XpInput {
  correct: boolean;
  /** 這一題之前已經連對幾題 */
  combo: number;
  difficulty: Difficulty;
}

/** 答錯不給 XP，但也不扣 —— 扣分會讓人不敢作答 */
export function xpForAnswer({ correct, combo, difficulty }: XpInput): number {
  if (!correct) return 0;
  return Math.round(BASE_XP * comboMultiplier(combo) * DIFFICULTY_WEIGHT[difficulty]);
}

/** 升到下一級所需的**累計** XP 門檻 */
export function xpThreshold(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * (level - 1) ** 1.5);
}

/** 由累計 XP 算出目前等級（從 1 開始） */
export function levelForXp(totalXp: number): number {
  let level = 1;
  while (xpThreshold(level + 1) <= totalXp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** 本級已累積 */
  intoLevel: number;
  /** 本級總共需要 */
  levelSpan: number;
  /** 0–1 */
  ratio: number;
  toNext: number;
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp);
  const floor = xpThreshold(level);
  const ceiling = xpThreshold(level + 1);
  const levelSpan = Math.max(1, ceiling - floor);
  const intoLevel = totalXp - floor;
  return {
    level,
    intoLevel,
    levelSpan,
    ratio: Math.min(1, intoLevel / levelSpan),
    toNext: Math.max(0, ceiling - totalXp),
  };
}
