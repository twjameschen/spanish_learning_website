import { useCallback, useEffect, useState } from 'react';

/**
 * 極簡 hash 路由（約 40 行），刻意不引入 react-router。
 *
 * 理由：
 * 1. 規格的技術棧是固定清單，沒有 router，不該自己加依賴。
 * 2. hash 路由在 `file://` 下也能運作 —— history API 在 file:// 會被擋，
 *    但改 location.hash 不會。單檔版是規格要求的交付物，這點很關鍵。
 * 3. 上一頁／下一頁與重新整理都能正常運作。
 */

export type Route =
  | { name: 'home' }
  | { name: 'vocab' }
  | { name: 'lessons' }
  | { name: 'lesson'; id: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const [head, param] = path.split('/');
  switch (head) {
    case 'vocab':
      return { name: 'vocab' };
    case 'lessons':
      return param ? { name: 'lesson', id: param } : { name: 'lessons' };
    default:
      return { name: 'home' };
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'vocab': return '#/vocab';
    case 'lessons': return '#/lessons';
    case 'lesson': return `#/lessons/${route.id}`;
    case 'home': return '#/';
  }
}

export function useRoute(): { route: Route; navigate: (to: Route) => void } {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(typeof location === 'undefined' ? '' : location.hash),
  );

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(location.hash));
      // 換頁後捲回頂端，否則從長課文點進另一課會停在半路
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: Route) => {
    location.hash = hrefFor(to);
  }, []);

  return { route, navigate };
}
