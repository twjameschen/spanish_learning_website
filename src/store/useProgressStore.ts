import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import { localDayKey, endOfLocalDay } from '@/lib/utils';
import {
  newCard, reviewCard, serializeCard, deserializeCard, ratingFor,
  stabilityToStars, wordKey, exerciseKey, isWordKey, keyId,
  type StoredCard, type CardKey, type Card,
} from '@/lib/fsrs';
import type { ExerciseType } from '@/content/schema';

/**
 * 學習進度。
 *
 * 兩種資料刻意分開存：
 *
 * - `dailyStats` 是**聚合**，每天一筆，熱力圖與折線圖讀這個。
 *   它的大小只隨天數成長，一年 365 筆，永遠不會爆。
 * - `recentLog` 是**明細**，只保留最近 2000 筆供「最近活動」用。
 *   全量保存的話一年會累積上萬筆，在 localStorage 層（約 5MB）會撐不住。
 *
 * 如果只留明細再即時聚合，資料量會隨使用時間無上限成長；
 * 如果只留聚合，就查不到個別題目的答題狀況。兩個都留但各自設界限。
 */

export interface AnswerRecord {
  at: string;
  day: string;
  key: CardKey;
  lessonId?: string;
  exerciseType: ExerciseType;
  correct: boolean;
  /** 作答耗時（毫秒） */
  ms: number;
}

export interface DailyStat {
  answered: number;
  correct: number;
  /** 累計作答秒數，用於每日目標 */
  seconds: number;
  xp: number;
}

export interface LessonProgress {
  completedAt: string;
  /** 歷來最佳正確率 0–1 */
  bestAccuracy: number;
  attempts: number;
}

const MAX_RECENT_LOG = 2000;

interface ProgressState {
  cards: Record<string, StoredCard>;
  dailyStats: Record<string, DailyStat>;
  recentLog: AnswerRecord[];
  lessons: Record<string, LessonProgress>;
  /** 累計 XP。等級與 combo 的計算在 Phase 4 接上。 */
  totalXp: number;
  hydrated: boolean;

  recordAnswer: (input: {
    key: CardKey;
    exerciseType: ExerciseType;
    correct: boolean;
    ms: number;
    lessonId?: string;
    hesitant?: boolean;
    xp?: number;
  }) => void;
  completeLesson: (lessonId: string, accuracy: number) => void;
  reset: () => void;
}

export const PROGRESS_KEY = 'progress';

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      cards: {},
      dailyStats: {},
      recentLog: [],
      lessons: {},
      totalXp: 0,
      hydrated: false,

      recordAnswer: ({ key, exerciseType, correct, ms, lessonId, hesitant, xp = 0 }) => {
        const now = new Date();
        const day = localDayKey(now);
        const state = get();

        const existing = state.cards[key];
        const card: Card = existing ? deserializeCard(existing) : newCard(now);
        const scheduled = reviewCard(card, ratingFor(correct, { hesitant: hesitant ?? false }), now);

        const prevDay = state.dailyStats[day] ?? { answered: 0, correct: 0, seconds: 0, xp: 0 };
        const record: AnswerRecord = {
          at: now.toISOString(),
          day,
          key,
          exerciseType,
          correct,
          ms,
          ...(lessonId ? { lessonId } : {}),
        };

        set({
          cards: { ...state.cards, [key]: serializeCard(scheduled) },
          dailyStats: {
            ...state.dailyStats,
            [day]: {
              answered: prevDay.answered + 1,
              correct: prevDay.correct + (correct ? 1 : 0),
              seconds: prevDay.seconds + Math.round(ms / 1000),
              xp: prevDay.xp + xp,
            },
          },
          // 新的放前面，超過上限就砍尾巴
          recentLog: [record, ...state.recentLog].slice(0, MAX_RECENT_LOG),
          totalXp: state.totalXp + xp,
        });
      },

      completeLesson: (lessonId, accuracy) => {
        const state = get();
        const prev = state.lessons[lessonId];
        set({
          lessons: {
            ...state.lessons,
            [lessonId]: {
              completedAt: new Date().toISOString(),
              bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
              attempts: (prev?.attempts ?? 0) + 1,
            },
          },
        });
      },

      reset: () => set({ cards: {}, dailyStats: {}, recentLog: [], lessons: {}, totalXp: 0 }),
    }),
    {
      name: PROGRESS_KEY,
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
    },
  ),
);

useProgressStore.persist.onFinishHydration(() => {
  useProgressStore.setState({ hydrated: true });
});
if (useProgressStore.persist.hasHydrated()) {
  useProgressStore.setState({ hydrated: true });
}

/* ------------------------------------------------------------------ *
 * 讀取用的輔助函式（元件不必自己處理反序列化）
 * ------------------------------------------------------------------ */

export function getCard(key: CardKey): Card | null {
  const stored = useProgressStore.getState().cards[key];
  return stored ? deserializeCard(stored) : null;
}

/** 某個單字的掌握度 0–5 星；沒學過回傳 0 */
export function starsForWord(wordId: string): number {
  const card = getCard(wordKey(wordId));
  return card ? stabilityToStars(card) : 0;
}

export interface DueEntry {
  key: CardKey;
  card: Card;
  id: string;
  isWord: boolean;
}

/**
 * 到期的卡片，最久沒複習的排前面。
 *
 * `through` 決定「到期」的界線：
 * - 預設是**當天結束**。FSRS 的學習階段會把剛答過的卡片排在 1–10 分鐘後，
 *   若用「此刻」當界線，剛練完一輪就會顯示「今天要複習 0 張」，
 *   然後過十分鐘又跳回 9 張 —— 那個數字對使用者沒有意義。
 * - 傳入 `new Date()` 則是嚴格的「現在就到期」。
 */
export function dueEntries(through: Date = endOfLocalDay()): DueEntry[] {
  const { cards } = useProgressStore.getState();
  const limit = through.getTime();
  return Object.entries(cards)
    .map(([key, stored]) => ({
      key: key as CardKey,
      card: deserializeCard(stored),
      id: keyId(key),
      isWord: isWordKey(key),
    }))
    .filter((e) => e.card.due.getTime() <= limit)
    .sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
}

/** 首頁的「今天要複習 N 張」 */
export const dueTodayCount = (now: Date = new Date()): number =>
  dueEntries(endOfLocalDay(now)).length;

export { wordKey, exerciseKey };
