import { PERSONS, SIMPLE_TENSES, type Person, type Tense } from '@/content/schema';

/**
 * 規則動詞變位引擎。
 *
 * 為什麼要有這個：15 個不規則動詞 × 7 時態 × 5 人稱 = 525 個形式，
 * 全部手寫 JSON 出錯率高又難維護。這裡把「照規則就能算出來」的部分交給程式，
 * JSON 只手寫**真正不規則**的形式，再由 `mergeConjugations` 蓋上去。
 *
 * 涵蓋範圍：-ar / -er / -ir 三類 × 7 個簡單時態 + 命令式，
 * 外加西班牙文正字法要求的拼寫調整（-car/-gar/-zar、母音間的 i→y）。
 * 這些拼寫調整**不是不規則**，是規則動詞為了保住發音而必須改的拼法，
 * 漏掉會教出錯的形式（例如 *buscé 而非 busqué）。
 */

export type VerbClass = 'ar' | 'er' | 'ir';
export type PersonSet = Record<Person, string>;
export type ConjugationTable = Partial<Record<Tense, PersonSet>>;

export interface ImperativeSet {
  tu: string;
  el_ella_usted: string;
  nosotros: string;
  ellos_ustedes: string;
}

const ENDINGS: Record<VerbClass, Record<Tense, [string, string, string, string, string]>> = {
  ar: {
    presente: ['o', 'as', 'a', 'amos', 'an'],
    preteritoIndefinido: ['é', 'aste', 'ó', 'amos', 'aron'],
    imperfecto: ['aba', 'abas', 'aba', 'ábamos', 'aban'],
    // 未來式與條件式接在**完整不定式**後面，不是字根 —— 見 buildStem 的處理
    futuro: ['é', 'ás', 'á', 'emos', 'án'],
    condicional: ['ía', 'ías', 'ía', 'íamos', 'ían'],
    presenteSubjuntivo: ['e', 'es', 'e', 'emos', 'en'],
    imperfectoSubjuntivo: ['ara', 'aras', 'ara', 'áramos', 'aran'],
  },
  er: {
    presente: ['o', 'es', 'e', 'emos', 'en'],
    preteritoIndefinido: ['í', 'iste', 'ió', 'imos', 'ieron'],
    imperfecto: ['ía', 'ías', 'ía', 'íamos', 'ían'],
    futuro: ['é', 'ás', 'á', 'emos', 'án'],
    condicional: ['ía', 'ías', 'ía', 'íamos', 'ían'],
    presenteSubjuntivo: ['a', 'as', 'a', 'amos', 'an'],
    imperfectoSubjuntivo: ['iera', 'ieras', 'iera', 'iéramos', 'ieran'],
  },
  ir: {
    presente: ['o', 'es', 'e', 'imos', 'en'],
    preteritoIndefinido: ['í', 'iste', 'ió', 'imos', 'ieron'],
    imperfecto: ['ía', 'ías', 'ía', 'íamos', 'ían'],
    futuro: ['é', 'ás', 'á', 'emos', 'án'],
    condicional: ['ía', 'ías', 'ía', 'íamos', 'ían'],
    presenteSubjuntivo: ['a', 'as', 'a', 'amos', 'an'],
    imperfectoSubjuntivo: ['iera', 'ieras', 'iera', 'iéramos', 'ieran'],
  },
};

/** 未來式與條件式的字根是完整的不定式，其餘時態是去掉字尾的字根 */
const INFINITIVE_STEM_TENSES = new Set<Tense>(['futuro', 'condicional']);

export interface ParsedVerb {
  /** 去掉 -se 之後的不定式，例如 llamarse → llamar */
  infinitive: string;
  stem: string;
  cls: VerbClass;
  reflexive: boolean;
}

export function parseVerb(raw: string): ParsedVerb {
  const reflexive = raw.endsWith('se');
  const infinitive = reflexive ? raw.slice(0, -2) : raw;
  const suffix = infinitive.slice(-2);
  if (suffix !== 'ar' && suffix !== 'er' && suffix !== 'ir') {
    throw new Error(`不是有效的西班牙文不定式：${raw}`);
  }
  return { infinitive, stem: infinitive.slice(0, -2), cls: suffix, reflexive };
}

const REFLEXIVE_PRONOUN: Record<Person, string> = {
  yo: 'me',
  tu: 'te',
  el_ella_usted: 'se',
  nosotros: 'nos',
  ellos_ustedes: 'se',
};

/**
 * 正字法調整：這些是為了保住字根發音而必須改的拼法，不是不規則。
 * 例如 buscar 的 yo 若寫成 *buscé，c 在 e 前會唸成 /s/，跟原本的 /k/ 不一樣。
 */
function applyOrthography(stem: string, ending: string, cls: VerbClass): string {
  const startsWithFrontVowel = /^[eé]/.test(ending);
  const startsWithA = /^[aáo]/.test(ending);

  if (cls === 'ar' && startsWithFrontVowel) {
    if (stem.endsWith('c')) return `${stem.slice(0, -1)}qu${ending}`;   // buscar → busqué
    if (stem.endsWith('g')) return `${stem.slice(0, -1)}gu${ending}`;   // llegar → llegué
    if (stem.endsWith('z')) return `${stem.slice(0, -1)}c${ending}`;    // empezar → empecé
  }
  if (cls !== 'ar' && startsWithA) {
    if (stem.endsWith('g')) return `${stem.slice(0, -1)}j${ending}`;    // coger → cojo
    if (stem.endsWith('c')) return `${stem.slice(0, -1)}z${ending}`;    // vencer → venzo
  }
  // 字根以母音結尾的 -er/-ir 動詞（leer、creer、oír…）有兩種連寫調整。
  // gu / qu 結尾要排除：那裡的 u 不發音，是二合字母的一部分（seguir 不是 *seguyó）。
  if (cls !== 'ar' && /[aeiouáéíóú]$/.test(stem) && !/[gq]u$/.test(stem)) {
    // ① i 夾在兩個母音之間要寫成 y：leyó、leyeron、leyera
    if (/^i[aeouáéóú]/.test(ending)) {
      return `${stem}y${ending.slice(1)}`;
    }
    // ② i 後面接子音時要加重音符號拆開母音連續：leíste、leímos
    if (/^i[^aeiouáéíóú]/.test(ending)) {
      return `${stem}í${ending.slice(1)}`;
    }
  }
  return stem + ending;
}

/** 產生單一時態的完整五個人稱 */
export function conjugateTense(raw: string, tense: Tense): PersonSet {
  const { infinitive, stem, cls, reflexive } = parseVerb(raw);
  const endings = ENDINGS[cls][tense];
  const base = INFINITIVE_STEM_TENSES.has(tense) ? infinitive : stem;
  const useOrthography = !INFINITIVE_STEM_TENSES.has(tense);

  const out = {} as PersonSet;
  PERSONS.forEach((person, i) => {
    const ending = endings[i] ?? '';
    const form = useOrthography ? applyOrthography(base, ending, cls) : base + ending;
    out[person] = reflexive ? `${REFLEXIVE_PRONOUN[person]} ${form}` : form;
  });
  return out;
}

/** 產生全部 7 個簡單時態 */
export function conjugateAll(raw: string): Record<Tense, PersonSet> {
  const out = {} as Record<Tense, PersonSet>;
  for (const tense of SIMPLE_TENSES) out[tense] = conjugateTense(raw, tense);
  return out;
}

/**
 * 肯定命令式。
 * tú 用現在式第三人稱單數；usted / nosotros / ustedes 用現在虛擬式對應人稱。
 * 沒有 yo —— 命令式本來就不能對自己下令。
 */
export function conjugateImperative(raw: string): ImperativeSet {
  const presente = conjugateTense(raw, 'presente');
  const subj = conjugateTense(raw, 'presenteSubjuntivo');
  return {
    tu: presente.el_ella_usted,
    el_ella_usted: subj.el_ella_usted,
    nosotros: subj.nosotros,
    ellos_ustedes: subj.ellos_ustedes,
  };
}

export function participio(raw: string): string {
  const { stem, cls } = parseVerb(raw);
  return `${stem}${cls === 'ar' ? 'ado' : 'ido'}`;
}

export function gerundio(raw: string): string {
  const { stem, cls } = parseVerb(raw);
  if (cls === 'ar') return `${stem}ando`;
  // 母音結尾的字根：leer → leyendo
  if (/[aeiouáéíóú]$/.test(stem)) return `${stem}yendo`;
  return `${stem}iendo`;
}

/**
 * 把手寫的不規則形式蓋在引擎產生的表上。
 * JSON 只需要列出真正不規則的那幾格，其餘由引擎補齊。
 */
export function mergeConjugations(
  raw: string,
  overrides: ConjugationTable,
): Record<Tense, PersonSet> {
  const base = conjugateAll(raw);
  for (const tense of SIMPLE_TENSES) {
    const override = overrides[tense];
    if (!override) continue;
    base[tense] = { ...base[tense], ...override };
  }
  return base;
}
