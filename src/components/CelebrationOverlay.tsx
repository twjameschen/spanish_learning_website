import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SunMotif } from '@/components/decor/Patterns';
import { iconFor, type AchievementIcon } from '@/lib/achievementIcons';
import { useCelebration } from '@/hooks/useCelebration';
import { useT } from '@/i18n';

/**
 * 升級與解鎖成就的全螢幕慶祝。
 * spring 參數照規格：{ stiffness: 300, damping: 20 }。
 */
const SPRING = { type: 'spring', stiffness: 300, damping: 20 } as const;
/** 離場用短 tween —— spring 的收斂尾巴很長，關閉拖到一秒會很鈍 */
const EXIT = { duration: 0.15 } as const;

export function CelebrationOverlay() {
  const { t, L } = useT();
  const { current, dismiss } = useCelebration();

  return (
    <AnimatePresence>
      {current ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-900/55 px-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={EXIT}
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-surface p-8 text-center shadow-lift"
            initial={{ scale: 0.8, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, transition: EXIT }}
            transition={SPRING}
            onClick={(e) => e.stopPropagation()}
          >
            <SunMotif className="pointer-events-none absolute -right-14 -top-14 size-48 text-accent-500/30" />
            {current.kind === 'level' ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...SPRING, delay: 0.1 }}
                  className="mx-auto grid size-20 place-items-center rounded-3xl bg-primary-500 text-ink-900"
                >
                  <TrendingUp aria-hidden="true" className="size-10" />
                </motion.div>
                <h2 className="mt-4 text-2xl font-extrabold text-body">{t('levelUp')}</h2>
                <p className="mt-1 text-sm text-muted">
                  {t('levelUpTo', { n: current.level ?? 0 })}
                </p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...SPRING, delay: 0.1 }}
                  className="mx-auto grid size-20 place-items-center rounded-3xl bg-accent-500 text-ink-900"
                >
                  <AchievementIcon name={current.achievement?.icon ?? 'Trophy'} />
                </motion.div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">
                  {t('achievementUnlocked')}
                </p>
                <h2 className="mt-0.5 text-2xl font-extrabold text-body">
                  {current.achievement ? L(current.achievement.name) : ''}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {current.achievement ? L(current.achievement.description) : ''}
                </p>
              </>
            )}
            <Button className="mt-6 w-full" size="lg" onClick={dismiss} autoFocus>
              {t('nice')}
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AchievementIcon({ name }: { name: AchievementIcon }) {
  const Icon = iconFor(name);
  return <Icon aria-hidden="true" className="size-10" />;
}
