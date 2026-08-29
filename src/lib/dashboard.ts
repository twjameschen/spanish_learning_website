import { deserializeCard, stabilityToStars, isWordKey, keyId, MAX_STARS } from './fsrs';
import type { StoredCard } from './fsrs';
import type { DailyStat, AnswerRecord } from '@/store/useProgressStore';
import { localDayKey } from './utils';
import { getWord } from '@/content';
import type { Pos, Word } from '@/content/schema';

/**
 * 儀表板的資料推導。
 *
 * 全部寫成**吃參數的純函式**，不直接讀 store —— 這樣才測得動：
 * 熱力圖要驗跨月與時區邊界、雷達要驗只有一兩筆資料時不會除以零，
 * 這些用假資料餵進來最快。元件那邊再把 store 的狀態接上。
 */

/* ------------------------------------------------------------------ *
 * 熱力圖
 * ------------------------------------------------------------------ */

export interface HeatCell {
  day: string;
  xp: number;
  answered: number;
  /** 0–4 的深淺等級，0 代表當天沒有練習 */
  level: 0 | 1 | 2 | 3 | 4;
  /** 是否為未來的日期（補滿最後一週用），不畫顏色也不算進統計 */
  future: boolean;
}

/** 以「當天賺到的 XP」決定深淺。門檻刻意用固定值而非相對值，
 *  否則第一天練習就會是最深的顏色，看起來像已經很熟練。 */
export function heatLevel(xp: number): 0 | 1 | 2 | 3 | 4 {
  if (xp <= 0) return 0;
  if (xp < 50) return 1;
  if (xp < 150) return 2;
  if (xp < 300) return 3;
  return 4;
}

const addDays = (d: Date, n: number): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/**
 * 產生熱力圖用的格子，最後一格是今天所在的那一週。
 * 起點對齊到週一，讓每一直行都是完整的一週。
 */
export function heatmapCells(
  stats: Record<string, DailyStat>,
  weeks = 26,
  today: Date = new Date(),
): HeatCell[] {
  // 先退到今天所在週的週一，再往前推 weeks-1 週
  const offsetToMonday = (today.getDay() + 6) % 7;
  const start = addDays(today, -offsetToMonday - (weeks - 1) * 7);
  const cells: HeatCell[] = [];
  for (let i = 0; i < weeks * 7; i += 1) {
    const date = addDays(start, i);
    const day = localDayKey(date);
    const stat = stats[day];
    const future = date > today;
    cells.push({
      day,
      xp: stat?.xp ?? 0,
      answered: stat?.answered ?? 0,
      level: future ? 0 : heatLevel(stat?.xp ?? 0),
      future,
    });
  }
  return cells;
}

/* ------------------------------------------------------------------ *
 * XP 折線
 * ------------------------------------------------------------------ */

export interface XpPoint {
  day: string;
  /** 當天賺到的 XP */
  xp: number;
  /** 到當天為止的累計 XP */
  total: number;
}

/** 最近 n 天的 XP，沒練習的日子補 0（折線才不會跳過空白日） */
export function xpSeries(
  stats: Record<string, DailyStat>,
  days = 30,
  today: Date = new Date(),
): XpPoint[] {
  // 累計要從「所有歷史」算起，不能只從視窗第一天算，否則折線會從 0 重新開始
  const windowStart = localDayKey(addDays(today, -(days - 1)));
  let total = Object.entries(stats)
    .filter(([day]) => day < windowStart)
    .reduce((n, [, s]) => n + s.xp, 0);

  const out: XpPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = localDayKey(addDays(today, -i));
    const xp = stats[day]?.xp ?? 0;
    total += xp;
    out.push({ day, xp, total });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 詞性雷達
 * ------------------------------------------------------------------ */

export interface PosStat {
  pos: Pos;
  /** 平均掌握度，0–5 */
  stars: number;
  /** 這個詞性有幾張卡片 */
  count: number;
}

/**
 * 各詞性的平均掌握度。
 * 只算**已經練過**的單字卡；沒練過的不該把平均拉低到 0，
 * 那會讓雷達圖在剛開始學的時候一片空白，看不出強弱。
 */
export function masteryByPos(cards: Record<string, StoredCard>): PosStat[] {
  const acc = new Map<Pos, { sum: number; count: number }>();
  for (const [key, stored] of Object.entries(cards)) {
    if (!isWordKey(key)) continue;
    const word = getWord(keyId(key));
    if (!word) continue;
    const card = deserializeCard(stored);
    if (card.reps === 0) continue;
    const bucket = acc.get(word.pos) ?? { sum: 0, count: 0 };
    bucket.sum += stabilityToStars(card);
    bucket.count += 1;
    acc.set(word.pos, bucket);
  }
  return [...acc.entries()]
    .map(([pos, { sum, count }]) => ({ pos, stars: sum / count, count }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ *
 * 最弱的單字
 * ------------------------------------------------------------------ */

export interface WeakWord {
  word: Word;
  stars: number;
  lapses: number;
  reps: number;
  due: Date;
}

/**
 * 掌握度最低的單字。
 * 排序先看星等，同星等再看**失誤次數多的排前面** ——
 * 兩個字都是 1 星，錯過五次的那個顯然更該優先複習。
 */
export function weakestWords(cards: Record<string, StoredCard>, limit = 10): WeakWord[] {
  const out: WeakWord[] = [];
  for (const [key, stored] of Object.entries(cards)) {
    if (!isWordKey(key)) continue;
    const word = getWord(keyId(key));
    if (!word) continue;
    const card = deserializeCard(stored);
    if (card.reps === 0) continue;
    out.push({
      word,
      stars: stabilityToStars(card),
      lapses: card.lapses,
      reps: card.reps,
      due: card.due,
    });
  }
  out.sort((a, b) => a.stars - b.stars || b.lapses - a.lapses || a.word.id.localeCompare(b.word.id));
  return out.slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * 題型正確率
 * ------------------------------------------------------------------ */

export interface TypeStat {
  type: AnswerRecord['exerciseType'];
  correct: number;
  total: number;
  accuracy: number;
}

/** 各題型的正確率，用來看自己哪一種題目最常錯 */
export function accuracyByType(log: AnswerRecord[]): TypeStat[] {
  const acc = new Map<AnswerRecord['exerciseType'], { correct: number; total: number }>();
  for (const r of log) {
    const bucket = acc.get(r.exerciseType) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (r.correct) bucket.correct += 1;
    acc.set(r.exerciseType, bucket);
  }
  return [...acc.entries()]
    .map(([type, { correct, total }]) => ({ type, correct, total, accuracy: correct / total }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/* ------------------------------------------------------------------ *
 * 概況數字
 * ------------------------------------------------------------------ */

export interface Overview {
  activeDays: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  /** 練習時間（分鐘） */
  minutes: number;
  wordsSeen: number;
  wordsMastered: number;
}

export function overview(
  stats: Record<string, DailyStat>,
  cards: Record<string, StoredCard>,
): Overview {
  const days = Object.values(stats);
  const totalAnswered = days.reduce((n, d) => n + d.answered, 0);
  const totalCorrect = days.reduce((n, d) => n + d.correct, 0);
  let wordsSeen = 0;
  let wordsMastered = 0;
  for (const [key, stored] of Object.entries(cards)) {
    if (!isWordKey(key)) continue;
    const card = deserializeCard(stored);
    if (card.reps === 0) continue;
    wordsSeen += 1;
    if (stabilityToStars(card) >= MAX_STARS) wordsMastered += 1;
  }
  return {
    activeDays: days.length,
    totalAnswered,
    totalCorrect,
    accuracy: totalAnswered > 0 ? totalCorrect / totalAnswered : 0,
    minutes: Math.round(days.reduce((n, d) => n + d.seconds, 0) / 60),
    wordsSeen,
    wordsMastered,
  };
}
