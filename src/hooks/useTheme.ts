import { useEffect } from 'react';
import { useSettingsStore, type ThemeMode } from '@/store/useSettingsStore';

const MEDIA = '(prefers-color-scheme: dark)';

function resolve(theme: ThemeMode): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia(MEDIA).matches;
}

/** 把 theme 設定同步到 <html class="dark">，並在 system 模式下跟著系統偏好變動 */
export function useTheme(): {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (t: ThemeMode) => void;
  cycleTheme: () => void;
} {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle('dark', resolve(theme));
    };
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia(MEDIA);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const order: ThemeMode[] = ['light', 'dark', 'system'];
  return {
    theme,
    isDark: resolve(theme),
    setTheme,
    cycleTheme: () => setTheme(order[(order.indexOf(theme) + 1) % order.length]!),
  };
}
