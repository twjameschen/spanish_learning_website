import { allVerbs } from '@/content';
import {
  PERSONS,
  PERSON_LABEL,
  TENSE_LABEL,
  type Localized,
  type Person,
  type Tense,
} from '@/content/schema';
import { foldAccents } from './normalize';

/**
 * 變位形式反查。
 *
 * 學習者讀到 `fui`、`tuve`、`hice` 這種**已經變過位**的形式時，
 * 單字表的搜尋完全找不到 —— 它只比對原形、字義與例句。
 * 但資料裡其實知道 `fui` 同時屬於 `ser` 和 `ir`，
 * 而那正是最需要有人告訴你的那種歧義。
 *
 * 這裡在模組載入時掃一次 `allVerbs`，把每一個形式（7 個時態 × 5 人稱、
 * 命令式、過去分詞、現在分詞）建成反查表。
 */

/** 命令式沒有 yo —— 不能對自己下令 */
export type ImperativePerson = Exclude<Person, 'yo'>;

export type FormKind =
  | { kind: 'tense'; tense: Tense; person: Person }
  | { kind: 'imperativo'; person: ImperativePerson }
  | { kind: 'participio' }
  | { kind: 'gerundio' };

export interface FormHit {
  verbId: string;
  /** 帶正確重音的原始形式，例如 `sería` */
  form: string;
  what: FormKind;
}

/**
 * 命令式與兩個分詞不屬於 `SIMPLE_TENSES`，`TENSE_LABEL` 裡沒有它們，
 * 所以在這裡補。兩種語言都要有 —— `i18n.test.ts` 會把這一份一起檢查。
 */
export const EXTRA_FORM_LABEL: Record<'imperativo' | 'participio' | 'gerundio', Localized> = {
  imperativo: { zh: '命令式', en: 'imperative' },
  participio: { zh: '過去分詞', en: 'past participle' },
  gerundio: { zh: '現在分詞', en: 'gerund' },
};

/** 一個形式要怎麼說給使用者聽，例如「簡單過去式・我」 */
export function formLabel(what: FormKind): Localized {
  switch (what.kind) {
    case 'tense':
      return {
        zh: `${TENSE_LABEL[what.tense].label.zh}・${PERSON_LABEL[what.person].label.zh}`,
        en: `${TENSE_LABEL[what.tense].label.en} · ${PERSON_LABEL[what.person].label.en}`,
      };
    case 'imperativo':
      return {
        zh: `${EXTRA_FORM_LABEL.imperativo.zh}・${PERSON_LABEL[what.person].label.zh}`,
        en: `${EXTRA_FORM_LABEL.imperativo.en} · ${PERSON_LABEL[what.person].label.en}`,
      };
    case 'participio':
      return EXTRA_FORM_LABEL.participio;
    case 'gerundio':
      return EXTRA_FORM_LABEL.gerundio;
  }
}

/** 索引用的 key：折掉重音再轉小寫。ñ 不折（año ≠ ano 是既有的規則） */
const key = (form: string): string => foldAccents(form).toLowerCase().trim();

/**
 * 反身動詞在 JSON 裡存的是**連代名詞的完整形式**（`llamarse` 的 yo 是
 * `"me llamo"`）。只索引完整形式的話，使用者打 `llamo` 會找不到 ——
 * 而他在課文裡看到的往往就是不帶代名詞的那半。所以兩種都索引。
 */
const REFLEXIVE_PRONOUNS = new Set(['me', 'te', 'se', 'nos']);

function keysFor(form: string): string[] {
  const full = key(form);
  const out = [full];
  const [head, ...rest] = full.split(' ');
  if (rest.length > 0 && head !== undefined && REFLEXIVE_PRONOUNS.has(head)) {
    out.push(rest.join(' '));
  }
  return out;
}

function build(): Map<string, FormHit[]> {
  const index = new Map<string, FormHit[]>();

  const add = (form: string, verbId: string, what: FormKind) => {
    for (const k of keysFor(form)) {
      const hits = index.get(k);
      const hit: FormHit = { verbId, form, what };
      if (hits) hits.push(hit);
      else index.set(k, [hit]);
    }
  };

  for (const verb of allVerbs) {
    for (const [tense, set] of Object.entries(verb.conjugations)) {
      if (!set) continue;
      for (const person of PERSONS) {
        const form = set[person];
        if (form) add(form, verb.id, { kind: 'tense', tense: tense as Tense, person });
      }
    }
    if (verb.imperativo) {
      for (const [person, form] of Object.entries(verb.imperativo)) {
        if (form) add(form, verb.id, { kind: 'imperativo', person: person as ImperativePerson });
      }
    }
    if (verb.participio) add(verb.participio, verb.id, { kind: 'participio' });
    if (verb.gerundio) add(verb.gerundio, verb.id, { kind: 'gerundio' });
  }

  return index;
}

let cached: Map<string, FormHit[]> | null = null;

/** 反查表本身。第一次用到才建，之後共用同一份。 */
export function formIndex(): Map<string, FormHit[]> {
  cached ??= build();
  return cached;
}

/**
 * 查一個（可能已經變過位的）字。
 * 完全沒中就回空陣列 —— 呼叫端據此決定要不要顯示「這是 X 的變位」。
 */
export function lookupForm(query: string): FormHit[] {
  const q = key(query);
  if (!q) return [];
  return formIndex().get(q) ?? [];
}

/** 這個查詢命中了哪些動詞（去重，保持原順序） */
export function verbsForForm(query: string): string[] {
  const seen = new Set<string>();
  for (const hit of lookupForm(query)) seen.add(hit.verbId);
  return [...seen];
}

/**
 * 某個動詞底下，這個查詢對應到的形式說明。
 * 一個形式在同一個動詞裡可能有多個身分（例如 `imperfecto` 的 yo 與
 * él 同形），全部回傳，由畫面決定要顯示幾個。
 */
export function hitsForVerb(query: string, verbId: string): FormHit[] {
  return lookupForm(query).filter((h) => h.verbId === verbId);
}
