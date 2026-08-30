/**
 * 種子洗牌。
 *
 * 三個即時產生的練習（單字閃卡、陰陽性分類、連續聽寫）都需要
 * 「同一個種子每次抽到同一組」—— 每次重整都換一批的話等於一直在看新東西，
 * 記不起來。原本三處各寫一份幾乎一樣的實作，收攏到這裡。
 */

/** 把字串折成一個整數種子（同一個字串永遠得到同一個值） */
export function seedFromText(text: string): number {
  let s = 0;
  for (const ch of text) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  return s || 1;
}

/** 今天的日期當種子。跨日才換一批，同一天內重整不會變。 */
export function todaySeed(now: Date = new Date()): number {
  return Number(now.toISOString().slice(0, 10).replace(/-/g, ''));
}

/**
 * 以種子洗牌。不改動傳入的陣列。
 * 用的是 glibc 的線性同餘參數 —— 不需要密碼學強度，只要每次結果一樣。
 */
export function shuffleSeeded<T>(items: readonly T[], seed: number | string): T[] {
  let s = typeof seed === 'string' ? seedFromText(seed) : seed;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
