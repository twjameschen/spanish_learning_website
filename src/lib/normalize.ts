/**
 * 答案比對用的正規化。
 *
 * 規格要求「忽略大小寫與重音符號差異，但答對後顯示正確重音」。
 *
 * ⚠️ 最關鍵的一點：**ñ 不是加了記號的 n**，它是獨立字母。
 * 天真的 `s.normalize('NFD').replace(/\p{M}/gu, '')` 會把 ñ 折成 n，
 * 於是 `ano` 會被判定等於 `año` —— 對初學者來說這是災難等級的錯誤回饋。
 * 所以折疊前先把 ñ/Ñ 換成一個絕不會出現在西班牙文裡的 sentinel，折完再換回。
 */

/** 私有使用區的碼位，正常文本不可能出現 */
const N_TILDE = '';
const N_TILDE_UPPER = '';

/** 只折疊母音上的銳音符與 ü 的分音符 —— 這些在西班牙文裡不區分字母身分 */
export function foldAccents(input: string): string {
  return input
    .replace(/ñ/g, N_TILDE)
    .replace(/Ñ/g, N_TILDE_UPPER)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(new RegExp(N_TILDE, 'g'), 'ñ')
    .replace(new RegExp(N_TILDE_UPPER, 'g'), 'Ñ');
}

/**
 * 完整正規化：折重音、轉小寫、拿掉頭尾與重複空白、
 * 拿掉句末標點與西班牙文的前置問號驚嘆號。
 *
 * 刻意**不**拿掉句中的逗號 —— 逗號會影響語意（呼語、並列），
 * 初學階段不必嚴格要求，但也不該把它從答案裡抹掉後再比對。
 */
export function normalizeAnswer(input: string): string {
  return foldAccents(input)
    .toLowerCase()
    .replace(/[¿¡]/g, '')
    .replace(/[.!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 使用者的輸入是否命中任一個可接受答案 */
export function matchesAnswer(input: string, accepted: readonly string[]): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return accepted.some((a) => normalizeAnswer(a) === normalized);
}

/**
 * 答對了但重音符號打得不完整時回傳 true，
 * UI 可據此提示「答對了，不過正確寫法是 …」而不是直接放過。
 */
export function isAccentImperfect(input: string, canonical: string): boolean {
  const a = input.toLowerCase().replace(/\s+/g, ' ').trim();
  const b = canonical.toLowerCase().replace(/\s+/g, ' ').trim();
  if (a === b) return false;
  return normalizeAnswer(input) === normalizeAnswer(canonical);
}

/** 語序重組題：比對兩個字串陣列是否一致（同樣忽略大小寫與重音） */
export function tokensMatch(input: readonly string[], answer: readonly string[]): boolean {
  if (input.length !== answer.length) return false;
  return input.every((tk, i) => normalizeAnswer(tk) === normalizeAnswer(answer[i] ?? ''));
}
