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
import { advanceStreak, initialStreak, type StreakState } from '@/lib/streak';

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

/**
 * 單題最多能記多少秒到「今天練習時間」。
 *
 * ms 是「題目出現 → 送出答案」的實際間隔，沒有上限：使用者中途離開座位，
 * 一題就能記進去半小時，每日目標瞬間達成、儀表板的平均作答時間也被帶歪。
 * 一題想超過兩分鐘實務上就是離開了，不是在想，所以在這裡截斷。
 * 只截斷計入每日統計的部分，recentLog 仍存原始 ms（分析時看得到離開的痕跡）。
 */
const MAX_ANSWER_SECONDS = 120;

interface ProgressState {
  cards: Record<string, StoredCard>;
  dailyStats: Record<string, DailyStat>;
  recentLog: AnswerRecord[];
  lessons: Record<string, LessonProgress>;
  /** 累計 XP */
  totalXp: number;
  streak: StreakState;
  /** 已看過（慶祝過）的成就 id，避免重複跳慶祝 */
  seenAchievements: string[];
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
  /** 依今天是否達成每日目標推進連續天數。每次開站與每次作答後呼叫。 */
  syncStreak: (metGoal: boolean) => void;
  markAchievementsSeen: (ids: string[]) => void;
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
      streak: initialStreak(),
      seenAchievements: [],
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
              seconds: prevDay.seconds + Math.min(MAX_ANSWER_SECONDS, Math.round(ms / 1000)),
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

      syncStreak: (metGoal) => {
        const state = get();
        const { state: next } = advanceStreak(state.streak, localDayKey(), metGoal);
        // 只有真的變了才 set，避免每次開站都寫一次儲存層
        if (
          next.current !== state.streak.current ||
          next.freezes !== state.streak.freezes ||
          next.lastActiveDay !== state.streak.lastActiveDay ||
          next.lastFreezeGrantWeek !== state.streak.lastFreezeGrantWeek
        ) {
          set({ streak: next });
        }
      },

      markAchievementsSeen: (ids) => {
        const state = get();
        const merged = new Set([...state.seenAchievements, ...ids]);
        if (merged.size !== state.seenAchievements.length) {
          set({ seenAchievements: [...merged] });
        }
      },

      reset: () => set({
        cards: {}, dailyStats: {}, recentLog: [], lessons: {}, totalXp: 0,
        streak: initialStreak(), seenAchievements: [],
      }),
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
