import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';
import type { Locale } from '@/content/schema';

export type ThemeMode = 'light' | 'dark' | 'system';
/**
 * 每日目標（分鐘）。
 *
 * 這裡的「分鐘」是 dailyStats.seconds，也就是**實際作答的思考時間**加總，
 * 不是開著分頁的時間。A0 全部 99 題就算每題想 15 秒也只有約 25 分鐘，
 * 所以目標值必須小 —— 20 分鐘的日目標等於要求一天做完 8 成的課程，
 * 連續天數會永遠開不了張。5 分鐘約等於 20 題、兩課，才是能天天達成的習慣。
 */
export type DailyGoal = 5 | 10 | 15;

interface SettingsState {
  theme: ThemeMode;
  /** 介面與解說的語言。一個開關切全部，不分開設定。 */
  locale: Locale;
  dailyGoal: DailyGoal;
  /** 關掉之後聽力題不出現（沒有 es 語音時也會自動失效） */
  speechEnabled: boolean;
  /** 顯示「待母語者確認」標記 */
  showNeedsVerify: boolean;
  /** 是否已從儲存層補水完成，避免 hydration 前就渲染錯誤狀態 */
  hydrated: boolean;

  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  setDailyGoal: (goal: DailyGoal) => void;
  setSpeechEnabled: (on: boolean) => void;
  setShowNeedsVerify: (on: boolean) => void;
}

export const SETTINGS_KEY = 'settings';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: 'zh',
      dailyGoal: 5,
      speechEnabled: true,
      showNeedsVerify: true,
      hydrated: false,

      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
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
