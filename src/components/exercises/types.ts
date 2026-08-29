import type { Exercise } from '@/content/schema';

/**
 * 七種題型共用的契約。
 * 每個題型元件只負責「呈現題目、收集作答、判定對錯」，
 * 計分、FSRS 排程、下一題由 ExercisePlayer 統一處理。
 */
export interface ExerciseOutcome {
  correct: boolean;
  /** 使用者實際填/選了什麼，用於回饋畫面 */
  given?: string;
  /**
   * 針對這次作答的補充說明。
   * 例如四選一要說「你選的這個為什麼錯」，翻譯題要說「答對了但重音沒打完整」。
   * 題目本身的通用解釋由 Player 從 exercise.explain 取，這裡只放個別化的部分。
   */
  note?: string;
  /** 答對但不夠漂亮（例如漏重音），FSRS 給 Hard 而不是 Good */
  hesitant?: boolean;
}

export interface ExerciseProps<T extends Exercise = Exercise> {
  exercise: T;
  /** 已作答後為 true，元件要進入唯讀狀態並顯示對錯 */
  answered: boolean;
  outcome: ExerciseOutcome | null;
  onAnswer: (outcome: ExerciseOutcome) => void;
}

/** 題型難度 → XP 權重（規格 §9：難題加權） */
export const DIFFICULTY_WEIGHT = { easy: 1, medium: 1.25, hard: 1.5 } as const;
