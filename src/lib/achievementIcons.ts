import {
  Award, BookMarked, BookOpen, Boxes, CalendarDays, Crown, Flame, Footprints,
  GraduationCap, History, Library, ListChecks, MapPin, MessagesSquare,
  PackageCheck, Plane, Rocket, Sparkles, Star, Target, TrendingUp, Trophy, Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * 成就圖示註冊表。
 *
 * 為什麼不直接 `import * as Icons from 'lucide-react'` 再用名稱查表：
 * 那樣寫 Vite 無法搖掉沒用到的圖示，整套約 1500 個 icon 會全部進 bundle
 * —— 實測讓主檔從 544 KB 漲到 1452 KB。單檔版是要雙擊開啟的交付物，
 * 為了 22 個圖示背 900 KB 不划算。
 *
 * 另一個好處是型別安全：icon 名稱被收斂成 AchievementIcon 這個字面值聯集，
 * 打錯字是編譯錯誤，不會靜靜退回獎盃圖示。
 */
export const ACHIEVEMENT_ICONS = {
  Award, BookMarked, BookOpen, Boxes, CalendarDays, Crown, Flame, Footprints,
  GraduationCap, History, Library, ListChecks, MapPin, MessagesSquare,
  PackageCheck, Plane, Rocket, Sparkles, Star, Target, TrendingUp, Trophy, Zap,
} satisfies Record<string, LucideIcon>;

export type AchievementIcon = keyof typeof ACHIEVEMENT_ICONS;

export const iconFor = (name: AchievementIcon): LucideIcon => ACHIEVEMENT_ICONS[name];
