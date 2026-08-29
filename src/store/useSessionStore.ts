import { create } from 'zustand';

/**
 * 當前答題 session 的暫時狀態，不持久化。
 *
 * 目前只有一件事：作答中不要讓慶祝視窗蓋掉答題回饋。
 * Phase 3 修過一個「按 Enter 直接跳過回饋」的 bug，成因不同但結果一樣 ——
 * 學習者沒看到為什麼對／為什麼錯。慶祝視窗是全螢幕 modal，
 * 在答完第一題就跳出來會蓋住解釋，所以作答期間先收著，
 * 等這一輪結束再一次播完（佇列不會掉，只是延後）。
 */
interface SessionState {
  /** 正在一輪練習／複習之中（還沒走到結算畫面） */
  answering: boolean;
  setAnswering: (answering: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  answering: false,
  setAnswering: (answering) => set({ answering }),
}));
