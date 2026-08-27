import { z } from 'zod';

/**
 * 內容層的單一真相來源。
 * TypeScript 型別一律由 z.infer 反推，不另外手寫 interface，
 * 避免 schema 與型別各改各的而失去同步。
 */

/* ------------------------------------------------------------------ *
 * 語言與在地化
 * ------------------------------------------------------------------ */

export const LOCALES = ['zh', 'en'] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

/**
 * 所有給人看的文字都走這個型別，兩種語言都必填。
 * 刻意不允許只填一邊 —— 缺一邊就代表切到那個語言時會開天窗，
 * 與其在執行期 fallback 回另一種語言（使用者會看到一半中文一半英文），
 * 不如在驗證階段就擋下來。
 */
export const localizedSchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
}).strict();
export type Localized = z.infer<typeof localizedSchema>;

/** 依目前語言取字 */
export const pick = (value: Localized, locale: Locale): string => value[locale];

/* ------------------------------------------------------------------ *
 * 基礎列舉
 * ------------------------------------------------------------------ */

export const LEVELS = ['A0', 'A1', 'A2', 'B1'] as const;
export const levelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof levelSchema>;

export const POS = [
  'noun', 'verb', 'adj', 'adv', 'prep', 'conj', 'pron', 'phrase',
] as const;
export const posSchema = z.enum(POS);
export type Pos = z.infer<typeof posSchema>;

export const genderSchema = z.enum(['m', 'f']);
export type Gender = z.infer<typeof genderSchema>;

/**
 * 人稱只有 5 個 —— 拉美西語沒有 vosotros。
 * JSON key 刻意用 ASCII，顯示文字查 PERSON_LABEL，
 * 這樣 no-vosotros 測試可以直接比對 key 集合是否「恰好」等於這 5 個。
 */
export const PERSONS = [
  'yo', 'tu', 'el_ella_usted', 'nosotros', 'ellos_ustedes',
] as const;
export const personSchema = z.enum(PERSONS);
export type Person = z.infer<typeof personSchema>;

export const PERSON_LABEL: Record<Person, { es: string; label: Localized }> = {
  yo: { es: 'yo', label: { zh: '我', en: 'I' } },
  tu: { es: 'tú', label: { zh: '你', en: 'you (informal)' } },
  el_ella_usted: {
    es: 'él / ella / usted',
    label: { zh: '他／她／您', en: 'he / she / you (formal)' },
  },
  nosotros: { es: 'nosotros / nosotras', label: { zh: '我們', en: 'we' } },
  // 注意：「你們」在拉美一律是 ustedes，不是 vosotros。
  ellos_ustedes: {
    es: 'ellos / ellas / ustedes',
    label: { zh: '他們／她們／你們', en: 'they / you all' },
  },
};

/** 簡單時態（單一動詞形，不含 haber + 分詞這類複合時態） */
export const SIMPLE_TENSES = [
  'presente',
  'preteritoIndefinido',
  'imperfecto',
  'futuro',
  'condicional',
  'presenteSubjuntivo',
  'imperfectoSubjuntivo',
] as const;
export const tenseSchema = z.enum(SIMPLE_TENSES);
export type Tense = z.infer<typeof tenseSchema>;

export const TENSE_LABEL: Record<Tense, { es: string; label: Localized }> = {
  presente: { es: 'presente', label: { zh: '現在式', en: 'present' } },
  preteritoIndefinido: {
    es: 'pretérito indefinido',
    label: { zh: '簡單過去式', en: 'preterite' },
  },
  imperfecto: {
    es: 'pretérito imperfecto',
    label: { zh: '未完成過去式', en: 'imperfect' },
  },
  futuro: { es: 'futuro simple', label: { zh: '未來式', en: 'future' } },
  condicional: { es: 'condicional simple', label: { zh: '條件式', en: 'conditional' } },
  presenteSubjuntivo: {
    es: 'presente de subjuntivo',
    label: { zh: '現在虛擬式', en: 'present subjunctive' },
  },
  imperfectoSubjuntivo: {
    es: 'imperfecto de subjuntivo',
    label: { zh: '過去虛擬式', en: 'imperfect subjunctive' },
  },
};

/** 完整的一組人稱變化 —— 五個都必填，缺一不可 */
export const personSetSchema = z.object({
  yo: z.string().min(1),
  tu: z.string().min(1),
  el_ella_usted: z.string().min(1),
  nosotros: z.string().min(1),
  ellos_ustedes: z.string().min(1),
}).strict(); // strict：多出 vosotros 之類的 key 會直接驗證失敗

export type PersonSet = z.infer<typeof personSetSchema>;

/* ------------------------------------------------------------------ *
 * 區域用法
 * ------------------------------------------------------------------ */

export const REGIONS = ['Ecuador', 'Andes', 'LatAm', 'Quito', 'Costa'] as const;

export const regionalSchema = z.object({
  region: z.enum(REGIONS),
  note: localizedSchema,
  /** 不是百分之百確定的一律 true，UI 上顯示「待母語者確認」 */
  needsVerify: z.boolean(),
});
export type Regional = z.infer<typeof regionalSchema>;

/* ------------------------------------------------------------------ *
 * Word
 * ------------------------------------------------------------------ */

const idSchema = z.string().regex(/^[a-z0-9-]+$/, 'id 只能用小寫字母、數字與連字號');

const wordBaseSchema = z.object({
  id: idSchema,
  /** 西班牙文本身，不隨介面語言改變 */
  es: z.string().min(1),
  /** 字義（雙語） */
  gloss: localizedSchema,
  pos: posSchema,
  gender: genderSchema.optional(),
  /** 陰陽同形或例外時的說明，例如 el/la estudiante */
  genderNote: localizedSchema.optional(),
  level: levelSchema,
  topic: z.string().min(1),
  exampleEs: z.string().min(1),
  /** 例句翻譯（雙語） */
  exampleGloss: localizedSchema,
  regional: regionalSchema.optional(),
});

/** 名詞必須有性別、非名詞不得有性別 —— 雙向檢查 */
function checkGender(
  val: { pos: Pos; gender?: Gender | undefined },
  ctx: z.RefinementCtx,
): void {
  if (val.pos === 'noun' && val.gender === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gender'],
      message: '名詞必須標註 gender（中文沒有性別，這是母語者最容易漏掉的欄位）',
    });
  }
  if (val.pos !== 'noun' && val.gender !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gender'],
      message: `pos 是 ${val.pos} 不該有 gender，只有名詞才標性別`,
    });
  }
}

export const wordSchema = wordBaseSchema.superRefine(checkGender);
export type Word = z.infer<typeof wordSchema>;

/* ------------------------------------------------------------------ *
 * Verb
 * ------------------------------------------------------------------ */

export const verbSchema = wordBaseSchema.extend({
  pos: z.literal('verb'),
  gender: z.undefined().optional(),
  infinitive: z.string().min(1),
  irregular: z.boolean(),
  reflexive: z.boolean().default(false),
  /** 過去分詞，複合時態用 haber + participio 組出來，不另存表 */
  participio: z.string().min(1),
  /** 現在分詞，進行式用 estar + gerundio */
  gerundio: z.string().min(1),
  /**
   * presente 必填，其餘時態選填（A0 階段只教現在式，Phase 5 再補齊）。
   * schema 現在就定義完整，之後補資料不必改 schema。
   */
  conjugations: z.object({
    presente: personSetSchema,
    preteritoIndefinido: personSetSchema.optional(),
    imperfecto: personSetSchema.optional(),
    futuro: personSetSchema.optional(),
    condicional: personSetSchema.optional(),
    presenteSubjuntivo: personSetSchema.optional(),
    imperfectoSubjuntivo: personSetSchema.optional(),
  }).strict(),
  /**
   * 命令式獨立於 conjugations 之外，因為它沒有 yo 形式。
   * 硬塞進 Record<Tense, Record<Person, string>> 只會逼出假資料。
   */
  imperativo: z.object({
    tu: z.string().min(1),
    el_ella_usted: z.string().min(1),
    nosotros: z.string().min(1),
    ellos_ustedes: z.string().min(1),
  }).strict().partial().optional(),
});
export type Verb = z.infer<typeof verbSchema>;

/* ------------------------------------------------------------------ *
 * Exercise（7 種題型的 discriminated union）
 * ------------------------------------------------------------------ */

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof difficultySchema>;

const exerciseBase = {
  id: idSchema,
  /** 答錯時顯示的解釋（雙語）。規格要求「不是只說錯了」，所以必填非空。 */
  explain: localizedSchema,
  difficulty: difficultySchema.default('medium'),
};

export const flashcardExerciseSchema = z.object({
  ...exerciseBase,
  type: z.literal('flashcard'),
  wordId: idSchema,
  direction: z.enum(['es-zh', 'zh-es']),
});

export const mcqExerciseSchema = z.object({
  ...exerciseBase,
  type: z.literal('mcq'),
  prompt: localizedSchema,
  promptEs: z.string().min(1).optional(),
  /**
   * 選項也要雙語。有些題目的選項是西班牙文形式（兩版內容相同），
   * 但有一半的題目選項是概念敘述（「因為位置一律用 estar」），
   * 那種切到英文時必須跟著換，否則會中英夾雜。
   */
  options: z.array(localizedSchema).length(4),
  answerIndex: z.number().int().min(0).max(3),
  /**
   * 每個選項各自的說明 —— 解釋綁在選項而非題目上，
   * 才能針對使用者「選錯的那一個」回答為什麼不對。
   */
  optionExplains: z.array(localizedSchema).length(4),
});

export const conjugationExerciseSchema = z.object({
  ...exerciseBase,
  type: z.literal('conjugation'),
  verbId: idSchema,
  person: personSchema,
  tense: tenseSchema,
  answer: z.string().min(1),
});

export const translateExerciseSchema = z.object({
  ...exerciseBase,
  type: z.literal('translate'),
  /** 要翻成西班牙文的題目（雙語） */
  prompt: localizedSchema,
  /** 可接受的多種答法（比對時會忽略大小寫與重音差異） */
  accept: z.array(z.string().min(1)).min(1),
  /** 標準答案，帶正確重音，答對後顯示給使用者對照 */
  canonical: z.string().min(1),
});

export const wordOrderExerciseSchema = z.object({
  ...exerciseBase,
  type: z.literal('wordOrder'),
  prompt: localizedSchema,
  /** 提供的字塊，執行期會打亂順序 */
  tokens: z.array(z.string().min(1)).min(2),
  answer: z.array(z.string().min(1)).min(2),
});

export const listeningExerciseSchema = z.object({
  ...exerciseBase,
  type: z.literal('listening'),
  /** 要用 speechSynthesis 唸出來的西班牙文 */
  es: z.string().min(1),
  gloss: localizedSchema,
  accept: z.array(z.string().min(1)).min(1),
});

export const genderSortExerciseSchema = z.object({
  ...exerciseBase,
  type: z.literal('genderSort'),
  /** 每個都必須是名詞，由 integrity 測試把關 */
  wordIds: z.array(idSchema).min(2),
  /** 限時秒數 */
  seconds: z.number().int().min(10).max(180).default(60),
});

export const exerciseSchema = z.discriminatedUnion('type', [
  flashcardExerciseSchema,
  mcqExerciseSchema,
  conjugationExerciseSchema,
  translateExerciseSchema,
  wordOrderExerciseSchema,
  listeningExerciseSchema,
  genderSortExerciseSchema,
]);
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = Exercise['type'];

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, Localized> = {
  flashcard: { zh: '閃卡', en: 'Flashcard' },
  mcq: { zh: '四選一', en: 'Multiple choice' },
  conjugation: { zh: '動詞變位', en: 'Conjugation' },
  translate: { zh: '翻譯', en: 'Translate' },
  wordOrder: { zh: '語序重組', en: 'Word order' },
  listening: { zh: '聽力', en: 'Listening' },
  genderSort: { zh: '陰陽性分類', en: 'Gender sort' },
};

/* ------------------------------------------------------------------ *
 * GrammarLesson
 * ------------------------------------------------------------------ */

export const CITIES = ['taipei', 'miami', 'quito', 'cuenca', 'galapagos'] as const;
export const citySchema = z.enum(CITIES);
export type City = z.infer<typeof citySchema>;

export const ruleSchema = z.object({
  rule: localizedSchema,
  examples: z.array(z.object({
    es: z.string().min(1),
    gloss: localizedSchema,
    /** 選填的補充說明，例如指出這句的重音落點 */
    note: localizedSchema.optional(),
  })).min(1),
});
export type Rule = z.infer<typeof ruleSchema>;

/** 發音課專用的補充區塊 */
export const pronunciationNoteSchema = z.object({
  letter: z.string().min(1),
  ipa: z.string().min(1),
  note: localizedSchema,
  examples: z.array(z.string().min(1)).min(1),
});

export const grammarLessonSchema = z.object({
  id: idSchema,
  level: levelSchema,
  city: citySchema,
  order: z.number().int().min(1),
  title: localizedSchema,
  intro: localizedSchema,
  rules: z.array(ruleSchema).min(1),
  /**
   * 最容易犯的錯，直接點破。規格 §6 的核心資產。
   * 原本叫 chineseTrap，內容改寫成不拿其他語言作參照後改名為 pitfalls —— 
   * 現在它對任何母語的學習者都成立。
   */
  pitfalls: localizedSchema.optional(),
  pronunciation: z.array(pronunciationNoteSchema).optional(),
  regional: regionalSchema.optional(),
  exercises: z.array(exerciseSchema).min(1),
  /** 前置 lesson id，用於技能樹解鎖 */
  prerequisites: z.array(idSchema),
  /** 本課關聯的單字 id */
  vocabIds: z.array(idSchema),
  /**
   * 自我聲明：本課示範文法規則的例句只用了本課與前置課教過的文法。
   * （單字表的 exampleEs 不受此限，那邊實用優先。）
   */
  usesOnlyTaughtGrammar: z.boolean(),
});
export type GrammarLesson = z.infer<typeof grammarLessonSchema>;

/* ------------------------------------------------------------------ *
 * Journey
 * ------------------------------------------------------------------ */

export const journeyStopSchema = z.object({
  city: citySchema,
  name: localizedSchema,
  nameEs: z.string().min(1),
  country: localizedSchema,
  blurb: localizedSchema,
  /**
   * 允許為空：基多以後的城市要等 Phase 5 的 A1–B1 內容才有課程，
   * 但地圖從一開始就要能畫出完整五站（後面的顯示為未解鎖）。
   */
  lessonIds: z.array(idSchema),
});
export type JourneyStop = z.infer<typeof journeyStopSchema>;

export const journeySchema = z.array(journeyStopSchema).min(1);

/* ------------------------------------------------------------------ *
 * 陣列 schema
 * ------------------------------------------------------------------ */

export const wordArraySchema = z.array(wordSchema);
export const verbArraySchema = z.array(verbSchema);
export const lessonArraySchema = z.array(grammarLessonSchema);
