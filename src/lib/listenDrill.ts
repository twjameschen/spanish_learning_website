import type { Exercise, GrammarLesson, Localized } from '@/content/schema';
import { allLessons, journey } from '@/content';
import { shuffleSeeded, todaySeed } from './shuffle';

/**
 * 連續聽寫模式：一次連聽十幾句，不佔課內的題數額度。
 *
 * 為什麼需要這個：規格訂每課 6–10 題，41 課裡已有 30 課滿 10 題。
 * 聽力再想加就得換掉四選一或放寬上限，兩個都有代價。
 * 改成課外的專門模式之後，聽力練習量不再受每課題數限制。
 *
 * 題庫不另外寫句子，而是從**已經審過的內容**組起來：
 * 課內的聽力題（手寫的 accept 與說明）＋ 課文規則裡的例句。
 * 例句本來就是雙語、標了等級與城市，而且在課文裡已經以
 * 「示範這條規則」的身分出現過 —— 不是為了填滿題庫而生出來的句子。
 */

export const LISTEN_DRILL_PREFIX = 'listen';
/** 產生出來的題目 id 前綴，跟課文裡手寫的題目分得開 */
const ITEM_PREFIX = 'listen-ex-';

/** 一場幾句。太少不成「連續」，太多一次做不完。 */
export const SESSION_SIZE = 12;
/** 至少要有幾句才給入口 —— 湊不滿一場就不顯示，按了沒用的按鈕比沒有按鈕更糟 */
const MIN_POOL = SESSION_SIZE;

/** 一句可以拿來聽寫的句子 */
interface Sentence {
  id: string;
  es: string;
  gloss: Localized;
  explain: Localized;
  accept: string[];
  city: string;
}

/**
 * 打得出來的變體。
 *
 * `normalizeAnswer()` 已經會折疊重音、去掉 `¿¡`、去掉**句尾**的 `.!?;:`，
 * 那些不用列。剩下三種字元它不處理，而聽的人也沒辦法從聲音判斷要不要打：
 *
 * - `ñ` 刻意不被折成 n（año ≠ ano），沒有西文鍵盤的人根本打不出來
 * - 逗號不在去除清單裡，聽寫時漏打逗號是常態
 * - **句子中間**的 `?` 與 `!`（¿El libro? Lo leo cada noche.）只有句尾那個會被去掉
 *
 * 三種各自可選，所以取交叉組合。少了任何一種，那一句對某些人就是無解。
 */
function acceptVariants(es: string): string[] {
  const simplify = [
    (s: string) => s.replace(/ñ/g, 'n').replace(/Ñ/g, 'N'),
    (s: string) => s.replace(/,/g, ''),
    (s: string) => s.replace(/[?!]/g, ''),
  ];
  let out = [es];
  for (const f of simplify) out = out.flatMap((s) => [s, f(s)]);
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
}

const wordCount = (es: string): number => es.trim().split(/\s+/).length;

const difficultyFor = (es: string): Exercise['difficulty'] => {
  const n = wordCount(es);
  if (n <= 4) return 'easy';
  return n <= 7 ? 'medium' : 'hard';
};

/**
 * 這一句站得住腳嗎。
 *
 * 課文例句裡混了不少不是句子的東西：`hablar → hablando` 這種變化展示、
 * `el libro / los libros` 這種對照、單獨的名詞片語。
 * 聽寫題要的是完整的一句話，所以只收有句末標點（或問號驚嘆號開頭）、
 * 沒有箭頭與斜線、而且長度像句子的。
 */
function isDictatable(es: string): boolean {
  const s = es.trim();
  if (s.includes('→') || s.includes('/')) return false;
  // 破折號、刪節號、引號 = 對話或省略，不是一句話。
  // Gracias. — De nada. 是兩個人各講一句，聽的人打不出中間那個破折號。
  if (/[—–…"“”]/.test(s)) return false;
  if (wordCount(s) < 4) return false;
  return /[.!?]$/.test(s) || /^[¿¡]/.test(s);
}

/**
 * 課內聽力題：手寫的 accept 與說明都比產生的好，直接沿用，id 也保留。
 * 但發音課裡有幾題考的是單字或片語（mañana、Buenos días、el día y la mano），
 * 那些在課內是對的，放進「連續聽寫整句」就不對了，一樣要過 isDictatable。
 */
function fromLessonExercises(lesson: GrammarLesson): Sentence[] {
  const out: Sentence[] = [];
  for (const ex of lesson.exercises) {
    if (ex.type !== 'listening' || !isDictatable(ex.es)) continue;
    out.push({
      id: ex.id,
      es: ex.es,
      gloss: ex.gloss,
      explain: ex.explain,
      // 手寫的 accept 保留（有些列了額外的說法），再補上機械變體 ——
      // 手寫時漏掉一種變體，那一句對某些人就是無解
      accept: [...new Set([...ex.accept, ...acceptVariants(ex.es)])],
      city: lesson.city,
    });
  }
  return out;
}

/** 課文規則裡的例句 */
function fromRuleExamples(lesson: GrammarLesson): Sentence[] {
  const out: Sentence[] = [];
  lesson.rules.forEach((rule, ri) => {
    rule.examples.forEach((example, ei) => {
      if (!isDictatable(example.es)) return;
      out.push({
        id: `${ITEM_PREFIX}${lesson.id}-r${ri}e${ei}`,
        es: example.es,
        gloss: example.gloss,
        // 例句自己的註解最貼切；沒有註解就講這句在示範哪條規則
        explain: example.note ?? {
          zh: `這句在示範：${rule.rule.zh}`,
          en: `This sentence shows: ${rule.rule.en}`,
        },
        accept: acceptVariants(example.es),
        city: lesson.city,
      });
    });
  });
  return out;
}

/**
 * 全部題庫，依課程順序、同一句只留一份。
 *
 * **課內聽力題整批排在例句前面**（而不是逐課交錯）：同一句話常常
 * 先在某一課當例句出現、後來才在另一課被寫成聽力題。逐課處理的話
 * 先出現的例句會贏，等於丟掉手寫的說明，FSRS 也會記到另一張卡片上。
 */
function buildPool(): Sentence[] {
  const seen = new Set<string>();
  const out: Sentence[] = [];
  const take = (list: Sentence[]) => {
    for (const s of list) {
      if (seen.has(s.es)) continue;
      seen.add(s.es);
      out.push(s);
    }
  };
  for (const lesson of allLessons) take(fromLessonExercises(lesson));
  for (const lesson of allLessons) take(fromRuleExamples(lesson));
  return out;
}

/** 題庫只跟內容有關，算一次就好 */
let pool: Sentence[] | null = null;
const getPool = (): Sentence[] => (pool ??= buildPool());

/** 全部題庫的句數 */
export const listenPoolSize = (): number => getPool().length;

/** 整個題庫（測試用來驗每一句，不只驗抽出來的那 12 題） */
export const listenPool = (): Exercise[] => getPool().map(toExercise);

/** `all` 或某個城市 */
export type ListenScope = 'all' | string;

const inScope = (s: Sentence, scope: ListenScope): boolean =>
  scope === 'all' || s.city === scope;

/** 某個範圍底下有幾句 */
export const listenPoolSizeFor = (scope: ListenScope): number =>
  getPool().filter((s) => inScope(s, scope)).length;

/** 這個範圍湊得出一場嗎 */
export const canListenDrill = (scope: ListenScope): boolean =>
  listenPoolSizeFor(scope) >= MIN_POOL;

/** 所有出得了題的範圍：all ＋ 旅程上的城市（依旅程順序） */
export function listenDrillScopes(): ListenScope[] {
  return ['all', ...journey.map((s) => s.city)].filter(canListenDrill);
}

const toExercise = (s: Sentence): Exercise => ({
  id: s.id,
  type: 'listening',
  difficulty: difficultyFor(s.es),
  explain: s.explain,
  es: s.es,
  gloss: s.gloss,
  accept: s.accept,
});

/**
 * 產生一場聽寫。
 *
 * 用日期當種子：同一天進來是同一組，隔天才換。
 * 一天之內重整就換一批的話，答錯的那幾句永遠沒機會再遇到。
 */
export function buildListenDrill(scope: ListenScope, now: Date = new Date()): Exercise[] {
  const items = getPool().filter((s) => inScope(s, scope));
  if (items.length < MIN_POOL) return [];
  // 範圍不必進種子：每個範圍的題庫本來就不一樣，洗出來自然不同
  return shuffleSeeded(items, todaySeed(now)).slice(0, SESSION_SIZE).map(toExercise);
}

/** 這個 drill id 是不是連續聽寫（DrillPage 用來分流） */
export const isListenDrillId = (id: string): boolean =>
  id === LISTEN_DRILL_PREFIX || id.startsWith(`${LISTEN_DRILL_PREFIX}-`);

/** 從 drill id 取回範圍 */
export const scopeFromDrillId = (id: string): ListenScope =>
  id === LISTEN_DRILL_PREFIX ? 'all' : id.slice(LISTEN_DRILL_PREFIX.length + 1);

/** 由範圍組出 drill id */
export const listenDrillId = (scope: ListenScope): string =>
  scope === 'all' ? LISTEN_DRILL_PREFIX : `${LISTEN_DRILL_PREFIX}-${scope}`;
