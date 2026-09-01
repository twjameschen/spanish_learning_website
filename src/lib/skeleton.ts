/**
 * 答案的骨架提示。
 *
 * 翻譯題與變位填空的送出鍵在沒打字時是停用的，想不出來就整題卡死，
 * 只能亂打一通讓它判錯。這是求助的第一階：把答案的**形狀**給你，
 * 內容還是要自己填。
 *
 * 聽力題的第一階給的是中文意思，但這兩種題型意思本來就在畫面上
 * （翻譯題的題面就是意思，變位題有原形＋人稱＋時態），所以改給骨架。
 */

/** U+00B7 middle dot —— 比句點高、比底線輕，一眼數得出幾個字母 */
const DOT = '·';

/** 一個字母（含重音字母與 ñ）。用 Unicode 屬性而不是 a-z，否則 á／ñ 會被當標點留著 */
const LETTER = /\p{L}/u;

/**
 * 把答案變成骨架：每個字只留第一個字母，其餘字母換成 `·`。
 *
 * - 標點與空白**原樣保留** —— `¿Dónde está el baño?` → `¿D···· e··· e· b···?`
 *   問號與 `¿` 本來就看得出來，藏起來沒有意義，而字數與斷句才是提示的重點
 * - 首字母的重音保留（`Éramos` → `É·····`）—— 提示要誠實，
 *   給了一個沒有重音的 E 會讓人以為那個字不帶重音
 */
export function answerSkeleton(answer: string): string {
  let started = false;   // 這個字的第一個字母出現過了嗎
  let out = '';
  for (const ch of answer) {
    if (!LETTER.test(ch)) {
      // 空白斷字；其他標點（撇號、連字號…）不斷字，跟著原樣輸出
      if (/\s/.test(ch)) started = false;
      out += ch;
      continue;
    }
    out += started ? DOT : ch;
    started = true;
  }
  return out;
}

/** 骨架裡剩下幾個要自己填的字母 —— 拿來寫測試與說明用 */
export const skeletonHoles = (skeleton: string): number =>
  [...skeleton].filter((c) => c === DOT).length;
