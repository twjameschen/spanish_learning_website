import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShortcut } from '@/hooks/useShortcut';
import { useT } from '@/i18n';
import type { UIKey } from '@/i18n';

/**
 * 鍵盤快捷鍵說明。按 ? 開啟，Esc 或點外面關閉。
 * 快捷鍵這種東西不寫出來沒人會知道，所以放一顆常駐的小按鈕在右下角。
 */
const SPRING = { type: 'spring', stiffness: 300, damping: 20 } as const;
/** 離場用短 tween —— spring 的收斂尾巴很長，關閉拖到一秒會很鈍 */
const EXIT = { duration: 0.15 } as const;

const ROWS: { keys: string[]; descKey: UIKey }[] = [
  { keys: ['1', '2', '3', '4'], descKey: 'shortcutChoose' },
  { keys: ['Space'], descKey: 'shortcutReveal' },
  { keys: ['1', '2'], descKey: 'shortcutSelfRate' },
  { keys: ['Enter'], descKey: 'shortcutNext' },
  { keys: ['?'], descKey: 'shortcutHelp' },
  { keys: ['Esc'], descKey: 'shortcutClose' },
];

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded-lg border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-bold text-body shadow-sm">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp() {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  useShortcut((key) => {
    if (key === '?') setOpen(true);
    if (key === 'Escape') setOpen(false);
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('shortcutsTitle')}
        title={t('shortcutsTitle')}
        className="fixed bottom-20 right-4 z-20 hidden size-10 place-items-center rounded-2xl border border-line bg-surface text-muted shadow-soft transition-colors hover:text-body lg:grid lg:bottom-5"
      >
        <Keyboard aria-hidden="true" className="size-[18px]" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 px-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={EXIT}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t('shortcutsTitle')}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-lift"
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, transition: EXIT }}
              transition={SPRING}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-body">{t('shortcutsTitle')}</h2>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t('shortcutClose')}>
                  <X aria-hidden="true" />
                </Button>
              </div>
              <dl className="space-y-2.5">
                {ROWS.map((row) => (
                  <div key={row.descKey} className="flex items-center justify-between gap-4">
                    <dd className="text-sm text-body">{t(row.descKey)}</dd>
                    <dt className="flex shrink-0 gap-1">
                      {row.keys.map((k) => <Key key={k}>{k}</Key>)}
                    </dt>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-muted">{t('shortcutsNote')}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
