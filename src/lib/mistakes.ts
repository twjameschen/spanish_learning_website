import type { Exercise } from '@/content/schema';
import { useProgressStore } from '@/store/useProgressStore';
import { resolveCardKey } from './cardResolve';

/**
 * 錯題本：還沒答對過的題目。
 *
 * 資料本來就在手上 —— `recentLog` 存了最近 2000 筆含對錯的作答明細，
 * 但先前只拿去算「各題型正確率」。答錯的題目沒有任何地方看得到、也沒辦法重練。
 *
 * 判定方式刻意只看**最近一次**作答：後來答對了就自動從清單消失，
 * 不必另外記一份「已訂正」的狀態，也不會有兩份資料對不起來的問題。
 */

/** 一場錯題重練幾題。跟連續聽寫同一個量級，一次做得完。 */
export const MISTAKE_DRILL_SIZE = 15;

/** 最近一次答錯的卡片 key，錯得最近的排前面 */
export function mistakeKeys(): string[] {
  const { recentLog } = useProgressStore.getState();
  const latest = new Map<string, boolean>();
  // recentLog 是新到舊，所以第一次遇到的那筆就是最近一次
  for (const record of recentLog) {
    if (!latest.has(record.key)) latest.set(record.key, record.correct);
  }
  return [...latest.entries()].filter(([, correct]) => !correct).map(([key]) => key);
}

/**
 * 錯題數。
 * 用解析得到的題數而不是 key 數 —— 首頁顯示 12 題、進去卻只有 8 題會很怪。
 */
export const mistakeCount = (): number => buildMistakeDrill(Number.MAX_SAFE_INTEGER).length;

/** 產生一場錯題重練 */
export function buildMistakeDrill(limit = MISTAKE_DRILL_SIZE): Exercise[] {
  const out: Exercise[] = [];
  const seen = new Set<string>();
  for (const key of mistakeKeys()) {
    if (out.length >= limit) break;
    const ex = resolveCardKey(key);
    // 解析不到就跳過：內容改版後留下的孤兒卡片不該讓整個清單開不起來
    if (!ex || seen.has(ex.id)) continue;
    seen.add(ex.id);
    out.push(ex);
  }
  return out;
}
