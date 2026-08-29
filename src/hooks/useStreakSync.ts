import { useEffect } from 'react';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { metDailyGoal } from '@/lib/snapshotProgress';
import { localDayKey } from '@/lib/utils';

/**
 * 把連續天數跟今天的練習量對齊。
 *
 * 為什麼要在「開站」與「每次作答後」都跑：
 * - 開站時要處理**昨天沒來**的情況（該斷的斷、該用 freeze 的用掉、該發的 freeze 發掉），
 *   這件事沒有作答也必須發生，否則斷掉的連續天數會一直顯示舊數字。
 * - 作答後要處理今天**剛好跨過門檻**的情況。
 *
 * dailyStats 每答一題就換一個物件，所以放進依賴陣列就等於「每次作答後」。
 * syncStreak 內部會比對前後狀態，沒變就不寫入，不會每題都打一次儲存層。
 *
 * 兩個 store 都要等補水完成才動：settings 沒補水好會拿到預設目標值，
 * progress 沒補水好會拿到空的 streak，兩者都會算出錯的結果並覆蓋掉真的進度。
 */
export function useStreakSync(): void {
  const progressHydrated = useProgressStore((s) => s.hydrated);
  const dailyStats = useProgressStore((s) => s.dailyStats);
  const syncStreak = useProgressStore((s) => s.syncStreak);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const goal = useSettingsStore((s) => s.dailyGoal);

  useEffect(() => {
    if (!progressHydrated || !settingsHydrated) return;
    syncStreak(metDailyGoal(goal, localDayKey()));
  }, [progressHydrated, settingsHydrated, dailyStats, goal, syncStreak]);
}
