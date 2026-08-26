import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system';
/** 每日目標（分鐘） */
export type DailyGoal = 10 | 20 | 30;

interface SettingsState {
  theme: ThemeMode;
  dailyGoal: DailyGoal;
  /** 關掉之後聽力題不出現（沒有 es 語音時也會自動失效） */
  speechEnabled: boolean;
  /** 顯示「待母語者確認」標記 */
  showNeedsVerify: boolean;
  /** 是否已從儲存層補水完成，避免 hydration 前就渲染錯誤狀態 */
  hydrated: boolean;

  setTheme: (theme: ThemeMode) => void;
  setDailyGoal: (goal: DailyGoal) => void;
  setSpeechEnabled: (on: boolean) => void;
  setShowNeedsVerify: (on: boolean) => void;
}

export const SETTINGS_KEY = 'settings';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      dailyGoal: 20,
      speechEnabled: true,
      showNeedsVerify: true,
      hydrated: false,

      setTheme: (theme) => set({ theme }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setSpeechEnabled: (speechEnabled) => set({ speechEnabled }),
      setShowNeedsVerify: (showNeedsVerify) => set({ showNeedsVerify }),
    }),
    {
      name: SETTINGS_KEY,
      storage: createJSONStorage(() => zustandStorage),
      // hydrated 是執行期狀態，不要存進去
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
    },
  ),
);

// 儲存層是非同步的，補水完成後才把 hydrated 立起來，避免 UI 先閃過預設值
useSettingsStore.persist.onFinishHydration(() => {
  useSettingsStore.setState({ hydrated: true });
});
if (useSettingsStore.persist.hasHydrated()) {
  useSettingsStore.setState({ hydrated: true });
}
