import { useCallback } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { UI, type UIKey } from './ui';
import type { Locale, Localized } from '@/content/schema';

export { UI } from './ui';
export type { UIKey } from './ui';

/** 把 {n} 這類佔位符換掉。刻意保持極簡 —— 不需要複數規則或日期格式化。 */
function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

export interface Translator {
  locale: Locale;
  /** 介面字串 */
  t: (key: UIKey, vars?: Record<string, string | number>) => string;
  /** 內容裡的 Localized 欄位 */
  L: (value: Localized) => string;
  /** Localized 但可能不存在 */
  Lo: (value: Localized | undefined) => string | undefined;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
}

export function useT(): Translator {
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  const t = useCallback(
    (key: UIKey, vars?: Record<string, string | number>) => fill(UI[key][locale], vars),
    [locale],
  );
  const L = useCallback((value: Localized) => value[locale], [locale]);
  const Lo = useCallback(
    (value: Localized | undefined) => (value ? value[locale] : undefined),
    [locale],
  );

  return {
    locale, t, L, Lo, setLocale,
    toggleLocale: () => setLocale(locale === 'zh' ? 'en' : 'zh'),
  };
}

/** 非元件環境（例如排序、搜尋）用的取字函式 */
export const pickLocale = (value: Localized, locale: Locale): string => value[locale];
