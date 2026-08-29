import {
  wordArraySchema, verbArraySchema, lessonArraySchema, journeySchema,
  type Word, type Verb, type GrammarLesson, type JourneyStop, type Exercise,
  type Localized,
} from './schema';

import rawWordsA0 from './words/a0.json';
import rawWordsA1 from './words/a1.json';
import rawWordsA2 from './words/a2.json';
import rawVerbsA0 from './verbs/a0.json';
import rawVerbsA1 from './verbs/a1.json';
import rawVerbsA2 from './verbs/a2.json';
import rawLessonsA0 from './lessons/a0.json';
import rawLessonsA1 from './lessons/a1.json';
import rawLessonsA2 from './lessons/a2.json';
import rawJourney from './journey.json';

/**
 * 內容載入與驗證。
 *
 * zod 驗證在 module init 就執行 —— 資料壞掉會在 app 啟動的第一瞬間爆出可讀的錯誤，
 * 而不是等到某個元件 render 到那筆資料才出現莫名其妙的 undefined。
 * `npm run build` 也會先跑 `validate:content`，所以壞資料進不了 build 產物。
 */

function parseOrThrow<T>(
  schema: { parse: (v: unknown) => T },
  raw: unknown,
  label: string,
): T {
  try {
    return schema.parse(raw);
  } catch (err) {
    // zod 的錯誤訊息很長，前面加上檔案名稱才知道要去哪裡改
    throw new Error(
      `內容驗證失敗（${label}）：\n${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export const wordsA0: Word[] = parseOrThrow(wordArraySchema, rawWordsA0, 'words/a0.json');
export const wordsA1: Word[] = parseOrThrow(wordArraySchema, rawWordsA1, 'words/a1.json');
export const wordsA2: Word[] = parseOrThrow(wordArraySchema, rawWordsA2, 'words/a2.json');
export const verbsA0: Verb[] = parseOrThrow(verbArraySchema, rawVerbsA0, 'verbs/a0.json');
export const verbsA1: Verb[] = parseOrThrow(verbArraySchema, rawVerbsA1, 'verbs/a1.json');
export const verbsA2: Verb[] = parseOrThrow(verbArraySchema, rawVerbsA2, 'verbs/a2.json');
export const lessonsA0: GrammarLesson[] = parseOrThrow(
  lessonArraySchema, rawLessonsA0, 'lessons/a0.json',
);
export const lessonsA1: GrammarLesson[] = parseOrThrow(
  lessonArraySchema, rawLessonsA1, 'lessons/a1.json',
);
export const lessonsA2: GrammarLesson[] = parseOrThrow(
  lessonArraySchema, rawLessonsA2, 'lessons/a2.json',
);
export const journey: JourneyStop[] = parseOrThrow(journeySchema, rawJourney, 'journey.json');

/** 所有單字（含動詞）。動詞也是 Word 的子型別，可以混在一起查。 */
export const allWords: Word[] = [...wordsA0, ...wordsA1, ...wordsA2, ...verbsA0, ...verbsA1, ...verbsA2];
export const allVerbs: Verb[] = [...verbsA0, ...verbsA1, ...verbsA2];
export const allLessons: GrammarLesson[] = [...lessonsA0, ...lessonsA1, ...lessonsA2];

const wordIndex = new Map<string, Word>(allWords.map((w) => [w.id, w]));
const verbIndex = new Map<string, Verb>(allVerbs.map((v) => [v.id, v]));
const lessonIndex = new Map<string, GrammarLesson>(allLessons.map((l) => [l.id, l]));

export const getWord = (id: string): Word | undefined => wordIndex.get(id);
export const getVerb = (id: string): Verb | undefined => verbIndex.get(id);
export const getLesson = (id: string): GrammarLesson | undefined => lessonIndex.get(id);

/** 所有出現過的主題，依單字數量由多到少 */
export function allTopics(): { topic: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const w of allWords) counts.set(w.topic, (counts.get(w.topic) ?? 0) + 1);
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}

export const TOPIC_LABEL: Record<string, Localized> = {
  saludos: { zh: '問候與禮貌', en: 'Greetings & courtesy' },
  clase: { zh: '課堂與求助', en: 'Classroom & asking for help' },
  personas: { zh: '人稱與家庭', en: 'People & family' },
  numeros: { zh: '數字', en: 'Numbers' },
  colores: { zh: '顏色', en: 'Colours' },
  tiempo: { zh: '時間與星期', en: 'Time & days' },
  comida: { zh: '食物與飲料', en: 'Food & drink' },
  lugares: { zh: '地點與物件', en: 'Places & objects' },
  adjetivos: { zh: '形容詞', en: 'Adjectives' },
  verbos: { zh: '動詞', en: 'Verbs' },
  conectores: { zh: '介系詞與連接詞', en: 'Prepositions & conjunctions' },
  preguntas: { zh: '疑問詞', en: 'Question words' },
  comunes: { zh: '常用副詞', en: 'Common adverbs' },
  animales: { zh: '動物', en: 'Animals' },
  ecuador: { zh: '厄瓜多特色詞', en: 'Ecuadorian usage' },
  casa: { zh: '家與家具', en: 'Home & furniture' },
  ciudad: { zh: '城市與交通', en: 'City & transport' },
  cuerpo: { zh: '身體與健康', en: 'Body & health' },
  ropa: { zh: '衣物', en: 'Clothing' },
  trabajo: { zh: '工作與職業', en: 'Work & jobs' },
  rutina: { zh: '作息與時間', en: 'Routine & time' },
  gramatica: { zh: '代名詞與指示詞', en: 'Pronouns & determiners' },
  viajes: { zh: '旅行與住宿', en: 'Travel & lodging' },
  naturaleza: { zh: '自然與環境', en: 'Nature & environment' },
  narrar: { zh: '敘事與過去時間', en: 'Narrating & past time' },
  emociones: { zh: '情緒與個性', en: 'Feelings & character' },
  estudio: { zh: '學習與溝通', en: 'Study & communication' },
  compras: { zh: '購物與金錢', en: 'Shopping & money' },
};

export const topicLabel = (topic: string): Localized =>
  TOPIC_LABEL[topic] ?? { zh: topic, en: topic };

export const POS_LABEL: Record<Word['pos'], Localized> = {
  noun: { zh: '名詞', en: 'noun' },
  verb: { zh: '動詞', en: 'verb' },
  adj: { zh: '形容詞', en: 'adjective' },
  adv: { zh: '副詞', en: 'adverb' },
  prep: { zh: '介系詞', en: 'preposition' },
  conj: { zh: '連接詞', en: 'conjunction' },
  pron: { zh: '代名詞', en: 'pronoun' },
  phrase: { zh: '片語', en: 'phrase' },
};

/* ------------------------------------------------------------------ *
 * 完整性檢查：zod 只能驗單一檔案內的形狀，跨檔的引用要另外查
 * ------------------------------------------------------------------ */

export interface IntegrityIssue {
  where: string;
  message: string;
}

/** 找出所有跨檔引用問題。回傳空陣列代表內容一致。 */
export function findIntegrityIssues(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const push = (where: string, message: string) => issues.push({ where, message });

  const exerciseRefs = (lessonId: string, ex: Exercise): void => {
    const at = `${lessonId} / ${ex.id}`;
    switch (ex.type) {
      case 'flashcard':
        if (!wordIndex.has(ex.wordId)) push(at, `flashcard 指向不存在的單字 ${ex.wordId}`);
        break;
      case 'conjugation': {
        const verb = verbIndex.get(ex.verbId);
        if (!verb) {
          push(at, `conjugation 指向不存在的動詞 ${ex.verbId}`);
          break;
        }
        const table = verb.conjugations[ex.tense];
        if (!table) {
          push(at, `動詞 ${ex.verbId} 沒有 ${ex.tense} 的變化表`);
          break;
        }
        if (table[ex.person] !== ex.answer) {
          push(at, `答案 "${ex.answer}" 與變化表的 "${table[ex.person]}" 不一致`);
        }
        break;
      }
      case 'genderSort':
        for (const id of ex.wordIds) {
          const word = wordIndex.get(id);
          if (!word) push(at, `genderSort 指向不存在的單字 ${id}`);
          else if (word.pos !== 'noun') push(at, `genderSort 只能用名詞，但 ${id} 是 ${word.pos}`);
          else if (!word.gender) push(at, `genderSort 的 ${id} 沒有標註性別`);
        }
        break;
      case 'wordOrder':
        if ([...ex.tokens].sort().join('|') !== [...ex.answer].sort().join('|')) {
          push(at, 'wordOrder 的 tokens 與 answer 內容不一致');
        }
        break;
      case 'mcq':
        if (!ex.options[ex.answerIndex]) push(at, `answerIndex ${ex.answerIndex} 超出選項範圍`);
        break;
      case 'translate':
        if (!ex.accept.some((a) => a.trim().length > 0)) push(at, 'translate 沒有可接受的答案');
        break;
      case 'listening':
        if (!ex.accept.some((a) => a.trim().length > 0)) push(at, 'listening 沒有可接受的答案');
        break;
    }
  };

  for (const lesson of allLessons) {
    for (const id of lesson.prerequisites) {
      if (!lessonIndex.has(id)) push(lesson.id, `前置課程 ${id} 不存在`);
    }
    for (const id of lesson.vocabIds) {
      if (!wordIndex.has(id)) push(lesson.id, `vocabIds 指向不存在的單字 ${id}`);
    }
    for (const ex of lesson.exercises) exerciseRefs(lesson.id, ex);
  }

  for (const stop of journey) {
    for (const id of stop.lessonIds) {
      if (!lessonIndex.has(id)) push(`journey/${stop.city}`, `課程 ${id} 不存在`);
    }
  }

  // 前置關係不得成環，否則技能樹會永遠解不開
  const state = new Map<string, 'visiting' | 'done'>();
  const walk = (id: string, trail: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      push(id, `前置課程出現循環：${[...trail, id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    for (const dep of lessonIndex.get(id)?.prerequisites ?? []) walk(dep, [...trail, id]);
    state.set(id, 'done');
  };
  for (const lesson of allLessons) walk(lesson.id, []);

  return issues;
}
