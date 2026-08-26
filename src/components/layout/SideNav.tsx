import { Home, BookMarked, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrefFor, type Route } from '@/lib/router';

const ITEMS: { route: Route; label: string; icon: typeof Home }[] = [
  { route: { name: 'home' }, label: '首頁', icon: Home },
  { route: { name: 'vocab' }, label: '單字表', icon: BookMarked },
  { route: { name: 'lessons' }, label: '課程', icon: GraduationCap },
];

export function SideNav({ current }: { current: Route }) {
  return (
    <ul className="sticky top-24 space-y-1.5">
      {ITEMS.map(({ route, label, icon: Icon }) => {
        const active =
          route.name === current.name ||
          (route.name === 'lessons' && current.name === 'lesson');
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
              {label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** 手機版：底部固定列 */
export function BottomNav({ current }: { current: Route }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ route, label, icon: Icon }) => {
          const active =
            route.name === current.name ||
            (route.name === 'lessons' && current.name === 'lesson');
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
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
