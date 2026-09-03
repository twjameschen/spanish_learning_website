import type { Exercise } from '@/content/schema';
import { dueEntries } from '@/store/useProgressStore';
import { resolveCardKeys } from './cardResolve';

/**
 * 今天的複習佇列。
 *
 * 為什麼要獨立一支：首頁的「今天要複習 N 張」與複習頁實際排出來的題目
 * 原本是兩段各自算的程式。首頁數的是**到期卡片的原始張數**，
 * 但內容改版後留下的孤兒卡片（`x:` 指向已經不存在的題目）解析不回題目，
 * 於是首頁說 8 張、點進去只有 6 張。
 *
 * 數字就是佇列長度，同一個來源算出來的，不可能再對不上。
 * 錯題本的 `mistakeCount()` 也是同樣的做法。
 */
export const buildReviewQueue = (): Exercise[] =>
  resolveCardKeys(dueEntries().map((e) => e.key));

/** 首頁顯示用。跟 `buildReviewQueue().length` 是同一件事，命名只是為了讀起來清楚 */
export const reviewQueueCount = (): number => buildReviewQueue().length;
