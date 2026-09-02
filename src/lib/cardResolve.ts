import type { Exercise } from '@/content/schema';
import { allLessons, getWord } from '@/content';
import { isWordKey, keyId, type CardKey } from './fsrs';
import { buildVocabDrill } from './vocabDrill';
import { buildGenderDrill, isGenderDrillId } from './genderDrill';
import { listenPool } from './listenDrill';

/**
 * 把一張 FSRS 卡片的 key 對回它當初那道題目。
 *
 * 為什麼要獨立一支：複習頁原本就地寫了一段簡化版的解析，只認得
 * 「課文裡手寫的題目」與「手寫的閃卡」。但實際上 app 建立卡片的來源有四種，
 * 其中三種它都對不回去 —— 尤其 `w:<wordId>`：內容裡只有 5 題手寫閃卡，
 * 而單字閃卡練習會為**任何**單字建立 `w:` 卡片。
 * 結果就是首頁說「今天要複習 20 張」，點進去只剩幾張甚至空狀態。
 *
 * 這裡把四種來源全部補齊：
 *
 * | key | 來源 |
 * |---|---|
 * | `x:<課文題目 id>`   | 課程練習 |
 * | `x:listen-ex-…`     | 連續聽寫產生的句子 |
 * | `x:gender-<主題>`   | 主題陰陽性分類 |
 * | `w:<wordId>`        | 單字閃卡（手寫的，或 vocabDrill 產生的） |
 */

/** 課文裡手寫的題目，依 id 索引。內容是靜態的，算一次就好。 */
let lessonIndex: Map<string, Exercise> | null = null;
/** 有手寫閃卡的單字（只有 5 個），優先用手寫的 —— 它的 explain 是特地寫的 */
let flashcardIndex: Map<string, Exercise> | null = null;

function buildIndexes(): void {
  lessonIndex = new Map();
  flashcardIndex = new Map();
  for (const lesson of allLessons) {
    for (const ex of lesson.exercises) {
      lessonIndex.set(ex.id, ex);
      if (ex.type === 'flashcard') flashcardIndex.set(ex.wordId, ex);
    }
  }
}

/** 連續聽寫的題庫，依 id 索引 */
let listenIndex: Map<string, Exercise> | null = null;
const getListenIndex = (): Map<string, Exercise> =>
  (listenIndex ??= new Map(listenPool().map((e) => [e.id, e])));

/** 由單字 id 生一張閃卡（手寫的優先） */
function flashcardForWord(wordId: string): Exercise | undefined {
  if (!flashcardIndex) buildIndexes();
  const written = flashcardIndex!.get(wordId);
  if (written) return written;
  if (!getWord(wordId)) return undefined;
  return buildVocabDrill([wordId], 1)[0];
}

/** 解析一張卡片的 key；對不回去時回 undefined（不丟例外，佇列不該被一張孤兒卡片卡住） */
export function resolveCardKey(key: CardKey | string): Exercise | undefined {
  const id = keyId(key);
  if (isWordKey(key)) return flashcardForWord(id);

  if (!lessonIndex) buildIndexes();
  const written = lessonIndex!.get(id);
  if (written) return written;

  if (isGenderDrillId(id)) {
    const drill = buildGenderDrill(id.slice('gender-'.length));
    return drill ?? undefined;
  }
  return getListenIndex().get(id);
}

/** 一次解析一串 key，去重並跳過解析不到的 */
export function resolveCardKeys(keys: readonly (CardKey | string)[]): Exercise[] {
  const out: Exercise[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    const ex = resolveCardKey(key);
    if (!ex || seen.has(ex.id)) continue;
    seen.add(ex.id);
    out.push(ex);
  }
  return out;
}
