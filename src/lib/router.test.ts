import { describe, it, expect } from 'vitest';
import { parseHash, hrefFor, type Route } from './router';

const ROUTES: Route[] = [
  { name: 'home' },
  { name: 'vocab' },
  { name: 'verbs' },
  { name: 'verb', id: 'ser' },
  { name: 'lessons' },
  { name: 'lesson', id: 'a0-11-ser-estar' },
  { name: 'practice', id: 'a0-11-ser-estar' },
  { name: 'review' },
  { name: 'achievements' },
  { name: 'dashboard' },
  // drill 以前漏在這張表外面，順手補上
  { name: 'drill', id: 'all' },
];

describe('hash 路由', () => {
  it('每個 route 都能 hrefFor 之後 parseHash 還原回來', () => {
    for (const route of ROUTES) {
      expect(parseHash(hrefFor(route))).toEqual(route);
    }
  });

  it('無法辨識的 hash 退回首頁，不是丟錯', () => {
    expect(parseHash('#/nope')).toEqual({ name: 'home' });
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#')).toEqual({ name: 'home' });
  });

  it('少了 id 的課程與練習路徑退回課程列表', () => {
    expect(parseHash('#/lessons')).toEqual({ name: 'lessons' });
    expect(parseHash('#/practice')).toEqual({ name: 'lessons' });
  });

  it('少了 id 的動詞路徑退回動詞列表', () => {
    expect(parseHash('#/verbs')).toEqual({ name: 'verbs' });
    expect(parseHash('#/verbs/')).toEqual({ name: 'verbs' });
  });

  it('帶 id 的動詞路徑解析得出來', () => {
    expect(parseHash('#/verbs/llamarse')).toEqual({ name: 'verb', id: 'llamarse' });
    expect(parseHash('#/verbs/ser?from=vocab')).toEqual({ name: 'verb', id: 'ser' });
  });

  it('忽略 query string', () => {
    expect(parseHash('#/achievements?from=home')).toEqual({ name: 'achievements' });
  });
});
