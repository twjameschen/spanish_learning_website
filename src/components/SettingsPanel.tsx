import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShortcut } from '@/hooks/useShortcut';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore, type DailyGoal, type ThemeMode } from '@/store/useSettingsStore';
import { useT } from '@/i18n';
import type { UIKey } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * 設定面板。
 *
 * 為什麼需要它：`useSettingsStore` 有五個設定，但畫面上只有主題與語言有入口。
 * 每日目標永遠鎖在 5 分鐘、語音關不掉、「未經確認的區域用法」那個開關
 * 甚至沒有任何地方在讀 —— 三個設定存在資料層卻改不了。
 *
 * 主題與語言在 header 已經各有一顆快捷鍵，這裡仍然列出來：
 * 一個叫「設定」的面板卻找不到主題與語言會很奇怪。兩邊共用同一個 store。
 *
 * 對話框一定要 portal 到 body。這顆按鈕掛在 header 裡，而 header 有
 * `backdrop-blur-md` —— 只要祖先有 backdrop-filter，它就會變成
 * `position: fixed` 的包含塊，於是 `inset-0` 量的是 header 那 64px 的高度，
 * 面板會被裁掉大半。ShortcutsHelp 沒事是因為它掛在 App 根層。
 */
const SPRING = { type: 'spring', stiffness: 300, damping: 20 } as const;
/** 離場用短 tween —— spring 的收斂尾巴很長，關閉拖到一秒會很鈍 */
const EXIT = { duration: 0.15 } as const;

const THEMES: { value: ThemeMode; labelKey: UIKey; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'themeLight', icon: Sun },
  { value: 'dark', labelKey: 'themeDark', icon: Moon },
  { value: 'system', labelKey: 'themeSystem', icon: MonitorSmartphone },
];

const GOALS: DailyGoal[] = [5, 10, 15];

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 border-t border-line/70 pt-4 first:border-0 first:pt-0">
      <p className="text-sm font-extrabold text-body">{label}</p>
      {hint ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5 pt-0.5">{children}</div>
    </div>
  );
}

/** 一組互斥選項。用按鈕而不是 select —— 選項都很少，攤開來比較好按 */
function Choice({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={active ? 'primary' : 'outline'}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}

export function SettingsPanel() {
  const { t, locale, setLocale } = useT();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const dailyGoal = useSettingsStore((s) => s.dailyGoal);
  const setDailyGoal = useSettingsStore((s) => s.setDailyGoal);
  const speechEnabled = useSettingsStore((s) => s.speechEnabled);
  const setSpeechEnabled = useSettingsStore((s) => s.setSpeechEnabled);
  const showNeedsVerify = useSettingsStore((s) => s.showNeedsVerify);
  const setShowNeedsVerify = useSettingsStore((s) => s.setShowNeedsVerify);

  useShortcut((key) => {
    if (key === 'Escape') setOpen(false);
  });

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t('settingsTitle')}
        title={t('settingsTitle')}
      >
        <Settings aria-hidden="true" />
      </Button>

      {createPortal(
        <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-900/50 px-5 py-8 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={EXIT}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t('settingsTitle')}
          >
            <motion.div
              className={cn('w-full max-w-md rounded-3xl bg-surface p-6 shadow-lift')}
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, transition: EXIT }}
              transition={SPRING}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-body">{t('settingsTitle')}</h2>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t('shortcutClose')}>
                  <X aria-hidden="true" />
                </Button>
              </div>

              <div className="space-y-4">
                <Row label={t('settingsDailyGoal')} hint={t('settingsDailyGoalHint')}>
                  {GOALS.map((g) => (
                    <Choice key={g} active={dailyGoal === g} onClick={() => setDailyGoal(g)}>
                      {t('settingsMinutes', { n: g })}
                    </Choice>
                  ))}
                </Row>

                <Row label={t('settingsSpeech')} hint={t('settingsSpeechHint')}>
                  <Choice active={speechEnabled} onClick={() => setSpeechEnabled(true)}>
                    {t('settingsOn')}
                  </Choice>
                  <Choice active={!speechEnabled} onClick={() => setSpeechEnabled(false)}>
                    {t('settingsOff')}
                  </Choice>
                </Row>

                <Row label={t('settingsNeedsVerify')} hint={t('settingsNeedsVerifyHint')}>
                  <Choice active={showNeedsVerify} onClick={() => setShowNeedsVerify(true)}>
                    {t('settingsShow')}
                  </Choice>
                  <Choice active={!showNeedsVerify} onClick={() => setShowNeedsVerify(false)}>
                    {t('settingsHide')}
                  </Choice>
                </Row>

                <Row label={t('settingsLanguage')}>
                  <Choice active={locale === 'zh'} onClick={() => setLocale('zh')}>中文</Choice>
                  <Choice active={locale === 'en'} onClick={() => setLocale('en')}>English</Choice>
                </Row>

                <Row label={t('settingsTheme')}>
                  {THEMES.map(({ value, labelKey, icon: Icon }) => (
                    <Choice key={value} active={theme === value} onClick={() => setTheme(value)}>
                      <Icon aria-hidden="true" />
                      {t(labelKey)}
                    </Choice>
                  ))}
                </Row>
              </div>

              <p className="mt-4 text-xs text-muted">{t('settingsNote')}</p>
            </motion.div>
          </motion.div>
        ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
