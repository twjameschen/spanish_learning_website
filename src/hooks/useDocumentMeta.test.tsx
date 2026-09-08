import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useDocumentMeta } from './useDocumentMeta';
import type { Route } from '@/lib/router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { orderedLessons, getLesson } from '@/content';

/**
 * 分頁標題與 `<html lang>`。
 *
 * 兩件事在此之前都寫死在 `index.html`：16 條路由共用同一個標題
 * （桌機開一排分頁完全分不出誰是誰，瀏覽記錄與書籤也全部同名），
 * 而 `lang="zh-Hant"` 不跟著語言開關走 —— 切成英文之後讀屏仍用中文語音
 * 唸英文介面，等於 WCAG 3.1.1 不合格。
 */

function Probe({ route }: { route: Route }) {
  useDocumentMeta(route);
  return null;
}
const show = (route: Route) => { render(<Probe route={route} />); return document.title; };

describe('分頁標題', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
    document.title = '';
    document.documentElement.lang = '';
  });

  it('首頁是品牌加標語', () => {
    expect(show({ name: 'home' })).toBe('Camino a Quito · 西班牙文之路 · 拉美變體');
  });

  it('每一條路由的標題都不一樣 —— 這正是寫死時壞掉的地方', () => {
    const lessonId = orderedLessons[0]!.id;
    const routes: Route[] = [
      { name: 'home' }, { name: 'vocab' }, { name: 'verbs' },
      { name: 'verb', id: 'ser' }, { name: 'lessons' },
      { name: 'lesson', id: lessonId }, { name: 'practice', id: lessonId },
      { name: 'review' }, { name: 'achievements' }, { name: 'dashboard' },
      { name: 'drill', id: 'all' }, { name: 'drill', id: 'mistakes' },
      { name: 'drill', id: 'listen' },
    ];
    const titles = routes.map(show);
    expect(new Set(titles).size).toBe(routes.length);
  });

  it('辨識用的字放最前面，品牌放後面 —— 分頁一窄是從尾巴開始截', () => {
    const id = orderedLessons[0]!.id;
    const title = show({ name: 'lesson', id });
    expect(title.startsWith(getLesson(id)!.title.zh)).toBe(true);
    expect(title.endsWith('Camino a Quito')).toBe(true);
  });

  it('動詞頁用原形當標題', () => {
    expect(show({ name: 'verb', id: 'ser' })).toBe('ser · Camino a Quito');
  });

  it('練習頁標出是哪一課的練習', () => {
    const id = orderedLessons[0]!.id;
    expect(show({ name: 'practice', id })).toContain(getLesson(id)!.title.zh);
    expect(show({ name: 'practice', id })).toContain('練習');
  });

  it('找不到的 id 退回分類名稱，不會印出 undefined', () => {
    expect(show({ name: 'lesson', id: 'zzz' })).toBe('課程 · Camino a Quito');
    expect(show({ name: 'verb', id: 'zzz' })).toBe('動詞 · Camino a Quito');
    expect(show({ name: 'drill', id: 'zzz' })).not.toMatch(/undefined/);
  });

  it('切成英文之後標題跟著換', () => {
    const id = orderedLessons[0]!.id;
    useSettingsStore.setState({ locale: 'en' });
    const title = show({ name: 'lesson', id });
    expect(title.startsWith(getLesson(id)!.title.en)).toBe(true);
    expect(show({ name: 'vocab' })).toBe('Vocabulary · Camino a Quito');
  });
});

describe('html lang', () => {
  beforeEach(() => {
    document.documentElement.lang = '';
  });

  it('中文模式是 zh-Hant', () => {
    useSettingsStore.setState({ locale: 'zh' });
    render(<Probe route={{ name: 'home' }} />);
    expect(document.documentElement.lang).toBe('zh-Hant');
  });

  /*
   * 這一條就是那個 bug：切成英文之後 lang 還停在 zh-Hant，
   * 讀屏會用中文語音唸英文。
   */
  it('切成英文之後變成 en', () => {
    useSettingsStore.setState({ locale: 'en' });
    render(<Probe route={{ name: 'home' }} />);
    expect(document.documentElement.lang).toBe('en');
  });
});
