import type { Exercise, Word } from '@/content/schema';
import { getWord } from '@/content';

/**
 * 由單字表即時產生閃卡。
 *
 * 為什麼需要這個：掌握度星等（規格 §9）掛在 `w:<wordId>` 這種卡片上，
 * 而只有閃卡題會建立那種卡。實際內容裡 41 課只有 5 題閃卡，
 * 等於掌握度、詞性雷達、最弱十個字全部沒有資料可用。
 *
 * 與其在 41 課的 JSON 裡塞幾百題閃卡（內容會變得又臭又長，
 * 而且每次改單字表都要同步改題目），不如在執行期依 vocabIds 生成。
 * 題目本身是機械的「看字想意思」，沒有教學內容要手寫。
 */

/** 產生出來的題目 id 前綴，方便和 JSON 裡的手寫題目區分 */
export const DRILL_PREFIX = 'drill-';

const flashcardFor = (word: Word, direction: 'es-zh' | 'zh-es'): Exercise => ({
  id: `${DRILL_PREFIX}${direction}-${word.id}`,
  type: 'flashcard',
  wordId: word.id,
  direction,
  difficulty: 'easy',
  // 閃卡是自評，explain 是翻面後的補充說明，這裡放例句最有用
  explain: {
    zh: `${word.es} —— ${word.gloss.zh}。例句：${word.exampleEs}（${word.exampleGloss.zh}）`,
    en: `${word.es} — ${word.gloss.en}. Example: ${word.exampleEs} (${word.exampleGloss.en})`,
  },
});

/**
 * 依單字 id 產生閃卡。
 * 兩個方向都出：看西文想意思，以及看意思想西文 —— 後者難得多，
 * 但那才是真的會用。順序交錯排，避免同一個字連續出現兩次。
 */
export function buildVocabDrill(wordIds: string[], limit = 20): Exercise[] {
  const words = wordIds.map((id) => getWord(id)).filter((w): w is Word => Boolean(w));
  const esZh = words.map((w) => flashcardFor(w, 'es-zh'));
  const zhEs = words.map((w) => flashcardFor(w, 'zh-es'));

  // 交錯：a(es-zh), b(es-zh), … 然後 a(zh-es), b(zh-es), …
  // 不用 a(es-zh), a(zh-es) 相鄰，否則第二題直接看到第一題的答案
  const out = [...esZh, ...zhEs];
  return out.slice(0, limit);
}

/** 這張卡是不是即時產生的（用來判斷要不要回頭查 JSON 題目） */
export const isDrillExercise = (id: string): boolean => id.startsWith(DRILL_PREFIX);
