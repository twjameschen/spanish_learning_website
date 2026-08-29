import { fsrs, createEmptyCard, Rating, State, type Card, type FSRS } from 'ts-fsrs';

/**
 * ts-fsrs 包裝層。
 *
 * 存在的兩個理由：
 *
 * 1. **序列化。** `Card.due` 與 `last_review` 是 `Date` 物件。
 *    存進 StorageAdapter 會被 JSON 序列化成字串，讀回來若直接當 Date 用
 *    （呼叫 `.getTime()`）就會炸。所以進出儲存層一律走
 *    `serializeCard` / `deserializeCard`，型別上也分成 Card 與 StoredCard 兩種，
 *    避免不小心把字串當 Date 傳下去。
 *
 * 2. **卡片粒度。** 同一副牌裡放兩種 key：
 *    `w:<wordId>` 單字卡（掌握度星等由它的 stability 算出來）
 *    `x:<exerciseId>` 文法題卡（四選一、語序重組這類不對應單一單字的題目）
 */

export { Rating, State } from 'ts-fsrs';
export type { Card } from 'ts-fsrs';

/** 存進儲存層的形狀：Date 換成 ISO 字串 */
export interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: string;
}

export type CardKey = `w:${string}` | `x:${string}`;

export const wordKey = (wordId: string): CardKey => `w:${wordId}`;
export const exerciseKey = (exerciseId: string): CardKey => `x:${exerciseId}`;
export const isWordKey = (key: string): boolean => key.startsWith('w:');
export const keyId = (key: string): string => key.slice(2);

let scheduler: FSRS | null = null;
function getScheduler(): FSRS {
  // 用預設參數。使用者自訂保留率之類的調校不在規格範圍內。
  scheduler ??= fsrs();
  return scheduler;
}

export function newCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function serializeCard(card: Card): StoredCard {
  const out: StoredCard = {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
  };
  if (card.last_review) out.last_review = card.last_review.toISOString();
  return out;
}

export function deserializeCard(stored: StoredCard): Card {
  const card: Card = {
    due: new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsed_days,
    scheduled_days: stored.scheduled_days,
    learning_steps: stored.learning_steps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
  };
  if (stored.last_review) card.last_review = new Date(stored.last_review);
  return card;
}

/** 送出一次評分，回傳排程後的新卡片 */
export function reviewCard(card: Card, rating: Rating, now: Date = new Date()): Card {
  // Rating.Manual 不是使用者能給的評分，擋掉避免排程器收到無效輸入
  if (rating === Rating.Manual) throw new Error('Rating.Manual 不能用於作答評分');
  return getScheduler().next(card, now, rating, (r) => r.card);
}

/** 這張卡現在到期了嗎 */
export const isDue = (card: Card, now: Date = new Date()): boolean =>
  card.due.getTime() <= now.getTime();

/** 從一組卡片中挑出到期的，最久沒複習的排前面 */
export function dueCards<T extends { card: Card }>(items: T[], now: Date = new Date()): T[] {
  return items
    .filter((it) => isDue(it.card, now))
    .sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
}

/**
 * stability（天）→ 0–5 顆星。
 *
 * 門檻取自間隔複習的實務手感：撐得過一天算 1 星，撐過兩個月算滿星。
 * 沒複習過的卡片（reps 為 0）一律 0 星，不管 stability 的初始值是多少 ——
 * 否則新卡片一出現就顯示 2 星會誤導。
 */
export function stabilityToStars(card: Card): number {
  if (card.reps === 0) return 0;
  const s = card.stability;
  if (s < 1) return 0;
  if (s < 3) return 1;
  if (s < 7) return 2;
  if (s < 21) return 3;
  if (s < 60) return 4;
  return 5;
}

/** 答對／答錯轉成 FSRS 評分。難度較高的題型答對時給 Good，簡單題型給 Easy。 */
export function ratingFor(correct: boolean, opts?: { hesitant?: boolean }): Rating {
  if (!correct) return Rating.Again;
  return opts?.hesitant ? Rating.Hard : Rating.Good;
}

export const MAX_STARS = 5;
