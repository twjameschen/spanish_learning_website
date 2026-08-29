import { Home, BookMarked, GraduationCap, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrefFor, type Route } from '@/lib/router';
import { useT } from '@/i18n';
import type { UIKey } from '@/i18n';

const ITEMS: { route: Route; labelKey: UIKey; icon: typeof Home }[] = [
  { route: { name: 'home' }, labelKey: 'navHome', icon: Home },
  { route: { name: 'vocab' }, labelKey: 'navVocab', icon: BookMarked },
  { route: { name: 'lessons' }, labelKey: 'navLessons', icon: GraduationCap },
  { route: { name: 'review' }, labelKey: 'navReview', icon: CalendarCheck },
];

const isActive = (route: Route, current: Route): boolean =>
  route.name === current.name ||
  (route.name === 'lessons' && (current.name === 'lesson' || current.name === 'practice'));

export function SideNav({ current }: { current: Route }) {
  const { t } = useT();
  return (
    <ul className="sticky top-24 space-y-1.5">
      {ITEMS.map(({ route, labelKey, icon: Icon }) => {
        const active = isActive(route, current);
        return (
          <li key={route.name}>
            <a
              href={hrefFor(route)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-[15px] font-bold transition-all duration-200',
                active
                  ? 'bg-primary-500 text-white shadow-soft'
                  : 'text-muted hover:bg-surface-2 hover:text-body',
              )}
            >
              <Icon aria-hidden="true" className="size-[18px]" />
              {t(labelKey)}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** 手機版：底部固定列 */
export function BottomNav({ current }: { current: Route }) {
  const { t } = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ route, labelKey, icon: Icon }) => {
          const active = isActive(route, current);
          return (
            <li key={route.name} className="flex-1">
              <a
                href={hrefFor(route)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition-colors',
                  active ? 'text-primary-600' : 'text-muted',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {t(labelKey)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
