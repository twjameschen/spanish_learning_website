import { useEffect } from 'react';
import type { Route } from '@/lib/router';
import { getLesson, getVerb, topicLabel, journey } from '@/content';
import { isGenderDrillId, topicFromDrillId } from '@/lib/genderDrill';
import { isListenDrillId, scopeFromDrillId } from '@/lib/listenDrill';
import { useT } from '@/i18n';
import type { Locale } from '@/content/schema';

/**
 * 分頁標題與 `<html lang>`。
 *
 * 兩件事在此之前都是**寫死在 `index.html` 裡**的：
 *
 * 1. 16 條路由共用同一個 `<title>`。桌機開一排分頁時每一個都長一樣，
 *    分不出哪個是單字表哪個是練習；瀏覽記錄與書籤也全部同名。
 * 2. `lang="zh-Hant"` 不會跟著語言開關走。切成英文之後，讀屏仍然用
 *    中文語音唸英文介面，瀏覽器也會誤判要不要提供翻譯 ——
 *    英文模式下等於 WCAG 3.1.1（Language of Page）不合格。
 *
 * 標題把**最能辨識的部分放在最前面**（課名、動詞原形），品牌放後面：
 * 分頁一窄就從尾巴開始截，放前面才留得住。
 */

/** 語言碼：西班牙文內容自己在元素上標 `lang="es"`，這裡只管介面語言 */
const HTML_LANG: Record<Locale, string> = { zh: 'zh-Hant', en: 'en' };

export function useDocumentMeta(route: Route): void {
  const { t, L, locale } = useT();

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  useEffect(() => {
    const brand = t('appName');
    const name = pageName(route, { t, L });
    document.title = name ? `${name} · ${brand}` : `${brand} · ${t('appTagline')}`;
  }, [route, locale, t, L]);
}

type Fmt = Pick<ReturnType<typeof useT>, 't' | 'L'>;

/** 這一頁在分頁上該叫什麼；首頁回 undefined，用品牌加標語 */
function pageName(route: Route, { t, L }: Fmt): string | undefined {
  switch (route.name) {
    case 'home':
      return undefined;
    case 'vocab':
      return t('navVocab');
    case 'verbs':
      return t('navVerbs');
    // 動詞原形本身就是最好認的名字，不必再加「動詞」兩個字
    case 'verb':
      return getVerb(route.id)?.infinitive ?? t('navVerbs');
    case 'lessons':
      return t('navLessons');
    case 'lesson': {
      const lesson = getLesson(route.id);
      return lesson ? L(lesson.title) : t('navLessons');
    }
    case 'practice': {
      const lesson = getLesson(route.id);
      return lesson
        ? `${t('practiceTitle')}：${L(lesson.title)}`
        : t('practiceTitle');
    }
    case 'review':
      return t('reviewTitle');
    case 'achievements':
      return t('navAchievements');
    case 'dashboard':
      return t('navDashboard');
    case 'drill':
      return drillName(route.id, { t, L });
  }
}

/** 練習頁的 id 有四種形狀，標題要跟畫面上那一行對得起來 */
function drillName(id: string, { t, L }: Fmt): string {
  if (id === 'mistakes') return t('mistakesTitle');
  if (isGenderDrillId(id)) {
    const topic = topicFromDrillId(id);
    return topic ? `${t('genderDrillTitle')}：${L(topicLabel(topic))}` : t('genderDrillTitle');
  }
  if (isListenDrillId(id)) {
    const scope = scopeFromDrillId(id);
    const city = scope ? journey.find((stop) => stop.city === scope)?.name : undefined;
    return city ? `${t('listenDrillTitle')}：${L(city)}` : t('listenDrillTitle');
  }
  const lesson = getLesson(id);
  return lesson ? `${t('drillTitle')}：${L(lesson.title)}` : t('drillTitle');
}
