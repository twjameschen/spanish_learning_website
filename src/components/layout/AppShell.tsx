import type { ReactNode } from 'react';
import { Moon, Sun, MonitorSmartphone, Mountain, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsPanel } from '@/components/SettingsPanel';
import { cn } from '@/lib/utils';
import { PageDecor } from '@/components/decor/Patterns';
import { StorageBanner } from './StorageBanner';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/i18n';

const THEME_META = {
  light: { icon: Sun, labelKey: 'themeLight' },
  dark: { icon: Moon, labelKey: 'themeDark' },
  system: { icon: MonitorSmartphone, labelKey: 'themeSystem' },
} as const;

/**
 * 側欄實際存在時才配欄位。
 * 否則 <main> 會被塞進為側欄保留的 13rem 欄位裡，內容被壓成一條。
 * 這四個 class 字串刻意寫成靜態字面量，Tailwind 的 content 掃描才看得到。
 */
function gridCols(hasSidebar: boolean, hasAside: boolean): string {
  if (hasSidebar && hasAside) {
    return 'lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_15rem]';
  }
  if (hasSidebar) return 'lg:grid-cols-[13rem_minmax(0,1fr)]';
  if (hasAside) return 'xl:grid-cols-[minmax(0,1fr)_15rem]';
  return 'grid-cols-1';
}

/**
 * 手機優先的外框。桌機（lg 以上）走三欄：側邊導覽 / 主內容 / 進度面板。
 * Phase 1 先把外框與主題切換立起來，導覽與進度面板在後續 Phase 填內容。
 */
export function AppShell({
  children,
  sidebar,
  aside,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
  aside?: ReactNode;
}) {
  const { theme, cycleTheme } = useTheme();
  const { t, locale, toggleLocale } = useT();
  const meta = THEME_META[theme];
  const ThemeIcon = meta.icon;
  const themeLabel = t(meta.labelKey);

  return (
    <div className="min-h-dvh">
      <PageDecor />
      <StorageBanner />

      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary-500 text-ink-900 shadow-soft">
              <Mountain aria-hidden="true" className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight text-body">
                {t('appName')}
              </p>
              <p className="text-[11px] font-semibold text-muted">{t('appTagline')}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* 一個開關切全部：介面與解說語言一起換 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              aria-label={`${t('langToggle')}（${t('langCurrent')}）`}
              title={t('langToggle')}
              className="gap-1.5 font-extrabold"
            >
              <Languages aria-hidden="true" />
              {locale === 'zh' ? '中' : 'EN'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              aria-label={`${t('themeToggle')}（${t('themeCurrent')}: ${themeLabel}）`}
              title={themeLabel}
            >
              <ThemeIcon aria-hidden="true" />
            </Button>
            {/* 主題與語言留在 header 當快捷鍵，其餘設定在面板裡 */}
            <SettingsPanel />
          </div>
        </div>
      </header>

      <div className={cn('mx-auto grid max-w-6xl gap-6 px-4 py-6', gridCols(!!sidebar, !!aside))}>
        {sidebar ? <nav className="hidden lg:block">{sidebar}</nav> : null}
        <main className={cn('min-w-0 pb-20 lg:pb-0', !sidebar && !aside && 'mx-auto w-full max-w-3xl')}>
          {children}
        </main>
        {aside ? <aside className="hidden xl:block">{aside}</aside> : null}
      </div>
    </div>
  );
}
