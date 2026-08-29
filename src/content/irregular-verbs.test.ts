import { describe, it, expect } from 'vitest';
import { getVerb, allVerbs } from './index';
import { PERSONS, SIMPLE_TENSES, type Person, type Tense } from './schema';

/**
 * 15 個高頻不規則動詞的變位表。
 *
 * 規格要求驗「現在式 + 簡單過去式 × 5 人稱 = 150 條斷言」，這裡照做；
 * 其餘 5 個時態改用**結構規則**驗（見下方 describe），
 * 因為逐格手寫 15 × 5 × 5 = 375 條斷言只是把同一份資料抄第二遍，
 * 抄錯的機率跟原始資料一樣高，測不出東西。結構規則不同 ——
 * 它是西班牙文本身的規律，資料打錯字才會違反。
 */

const VERBS = [
  'ser', 'estar', 'tener', 'ir', 'hacer', 'poder', 'querer', 'decir',
  'ver', 'dar', 'saber', 'venir', 'poner', 'salir', 'haber',
] as const;

/** 規格指定要逐格驗的兩個時態 */
const PRESENTE: Record<string, string[]> = {
  ser:    ['soy', 'eres', 'es', 'somos', 'son'],
  estar:  ['estoy', 'estás', 'está', 'estamos', 'están'],
  tener:  ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen'],
  ir:     ['voy', 'vas', 'va', 'vamos', 'van'],
  hacer:  ['hago', 'haces', 'hace', 'hacemos', 'hacen'],
  poder:  ['puedo', 'puedes', 'puede', 'podemos', 'pueden'],
  querer: ['quiero', 'quieres', 'quiere', 'queremos', 'quieren'],
  decir:  ['digo', 'dices', 'dice', 'decimos', 'dicen'],
  ver:    ['veo', 'ves', 've', 'vemos', 'ven'],
  dar:    ['doy', 'das', 'da', 'damos', 'dan'],
  saber:  ['sé', 'sabes', 'sabe', 'sabemos', 'saben'],
  venir:  ['vengo', 'vienes', 'viene', 'venimos', 'vienen'],
  poner:  ['pongo', 'pones', 'pone', 'ponemos', 'ponen'],
  salir:  ['salgo', 'sales', 'sale', 'salimos', 'salen'],
  haber:  ['he', 'has', 'ha', 'hemos', 'han'],
};

const PRETERITO: Record<string, string[]> = {
  ser:    ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'],
  estar:  ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvieron'],
  tener:  ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvieron'],
  ir:     ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'],
  hacer:  ['hice', 'hiciste', 'hizo', 'hicimos', 'hicieron'],
  poder:  ['pude', 'pudiste', 'pudo', 'pudimos', 'pudieron'],
  querer: ['quise', 'quisiste', 'quiso', 'quisimos', 'quisieron'],
  decir:  ['dije', 'dijiste', 'dijo', 'dijimos', 'dijeron'],
  ver:    ['vi', 'viste', 'vio', 'vimos', 'vieron'],
  dar:    ['di', 'diste', 'dio', 'dimos', 'dieron'],
  saber:  ['supe', 'supiste', 'supo', 'supimos', 'supieron'],
  venir:  ['vine', 'viniste', 'vino', 'vinimos', 'vinieron'],
  poner:  ['puse', 'pusiste', 'puso', 'pusimos', 'pusieron'],
  salir:  ['salí', 'saliste', 'salió', 'salimos', 'salieron'],
  haber:  ['hube', 'hubiste', 'hubo', 'hubimos', 'hubieron'],
};

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const form = (verbId: string, tense: Tense, person: Person): string | undefined =>
  getVerb(verbId)?.conjugations[tense]?.[person];

describe('15 個不規則動詞：現在式與簡單過去式（規格要求的 150 條）', () => {
  it.each(VERBS)('%s 有完整的 7 個簡單時態', (id) => {
    const verb = getVerb(id);
    expect(verb, `${id} 不存在`).toBeDefined();
    for (const tense of SIMPLE_TENSES) {
      expect(verb!.conjugations[tense], `${id} 缺 ${tense}`).toBeDefined();
    }
  });

  for (const id of VERBS) {
    for (const [i, person] of PERSONS.entries()) {
      it(`${id} 現在式 ${person}`, () => {
        expect(form(id, 'presente', person)).toBe(PRESENTE[id]![i]);
      });
      it(`${id} 簡單過去式 ${person}`, () => {
        expect(form(id, 'preteritoIndefinido', person)).toBe(PRETERITO[id]![i]);
      });
    }
  }
});

describe('其餘時態：用西班牙文本身的結構規律驗，抓打字錯誤', () => {
  const FUT_END = ['é', 'ás', 'á', 'emos', 'án'];
  const CON_END = ['ía', 'ías', 'ía', 'íamos', 'ían'];

  it.each(VERBS)('%s 的未來式與條件式共用同一個字根', (id) => {
    const futStems = new Set<string>();
    const conStems = new Set<string>();
    for (const [i, person] of PERSONS.entries()) {
      const f = form(id, 'futuro', person)!;
      const c = form(id, 'condicional', person)!;
      expect(f.endsWith(FUT_END[i]!), `${id} 未來式 ${person}=${f}`).toBe(true);
      expect(c.endsWith(CON_END[i]!), `${id} 條件式 ${person}=${c}`).toBe(true);
      futStems.add(f.slice(0, -FUT_END[i]!.length));
      conStems.add(c.slice(0, -CON_END[i]!.length));
    }
    expect(futStems.size, `${id} 未來式字根不一致：${[...futStems]}`).toBe(1);
    expect([...conStems]).toEqual([...futStems]);
  });

  it.each(VERBS)('%s 的過去虛擬式由簡單過去式第三人稱複數推出', (id) => {
    const third = form(id, 'preteritoIndefinido', 'ellos_ustedes')!;
    expect(third.endsWith('ron'), `${id} 第三人稱複數 ${third}`).toBe(true);
    const stem = third.slice(0, -3);
    expect(form(id, 'imperfectoSubjuntivo', 'yo')).toBe(`${stem}ra`);
    expect(form(id, 'imperfectoSubjuntivo', 'tu')).toBe(`${stem}ras`);
    expect(form(id, 'imperfectoSubjuntivo', 'el_ella_usted')).toBe(`${stem}ra`);
    expect(form(id, 'imperfectoSubjuntivo', 'ellos_ustedes')).toBe(`${stem}ran`);
    // nosotros 是倒數第三音節重音，一定要有重音符號
    const nos = form(id, 'imperfectoSubjuntivo', 'nosotros')!;
    expect(stripAccents(nos)).toBe(stripAccents(`${stem}ramos`));
    expect(nos, `${id} 過去虛擬式 nosotros 少了重音符號`).not.toBe(stripAccents(nos));
  });

  // ser / ir / ver 是西班牙文僅有的三個未完成過去式不規則動詞
  const IMPERFECT_IRREGULAR = new Set(['ser', 'ir', 'ver']);
  it.each(VERBS.filter((v) => !IMPERFECT_IRREGULAR.has(v)))(
    '%s 的未完成過去式是規則的', (id) => {
      const stem = id.slice(0, -2);
      const endings = id.endsWith('ar')
        ? ['aba', 'abas', 'aba', 'ábamos', 'aban']
        : ['ía', 'ías', 'ía', 'íamos', 'ían'];
      for (const [i, person] of PERSONS.entries()) {
        expect(form(id, 'imperfecto', person)).toBe(stem + endings[i]!);
      }
    },
  );

  it('ser / ir / ver 的未完成過去式是那三個著名的例外', () => {
    expect(PERSONS.map((p) => form('ser', 'imperfecto', p)))
      .toEqual(['era', 'eras', 'era', 'éramos', 'eran']);
    expect(PERSONS.map((p) => form('ir', 'imperfecto', p)))
      .toEqual(['iba', 'ibas', 'iba', 'íbamos', 'iban']);
    expect(PERSONS.map((p) => form('ver', 'imperfecto', p)))
      .toEqual(['veía', 'veías', 'veía', 'veíamos', 'veían']);
  });

  // 現在虛擬式由現在式 yo 去掉 -o 推出，六個古典例外除外
  const SUBJ_EXCEPTIONS = new Set(['ser', 'ir', 'saber', 'dar', 'haber', 'estar']);
  it.each(VERBS.filter((v) => !SUBJ_EXCEPTIONS.has(v)))(
    '%s 的現在虛擬式由現在式 yo 推出', (id) => {
      const yo = form(id, 'presente', 'yo')!;
      expect(yo.endsWith('o'), `${id} 現在式 yo=${yo}`).toBe(true);
      const stem = yo.slice(0, -1);
      const v = id.endsWith('ar') ? 'e' : 'a';
      expect(form(id, 'presenteSubjuntivo', 'yo')).toBe(stem + v);
      expect(form(id, 'presenteSubjuntivo', 'tu')).toBe(`${stem}${v}s`);
      expect(form(id, 'presenteSubjuntivo', 'el_ella_usted')).toBe(stem + v);
      expect(form(id, 'presenteSubjuntivo', 'ellos_ustedes')).toBe(`${stem}${v}n`);
    },
  );
});

describe('命令式', () => {
  // 這些是初學者最常聽到的單數命令式，形狀完全不規則，逐個驗
  const TU_IMPERATIVE: Record<string, string> = {
    tener: 'ten', hacer: 'haz', decir: 'di', venir: 'ven',
    poner: 'pon', salir: 'sal', ser: 'sé', ir: 've',
  };
  it.each(Object.entries(TU_IMPERATIVE))('%s 的 tú 命令式是 %s', (id, expected) => {
    expect(getVerb(id)?.imperativo?.tu).toBe(expected);
  });

  it('usted 命令式與現在虛擬式的第三人稱單數同形', () => {
    for (const id of VERBS) {
      const imp = getVerb(id)?.imperativo?.el_ella_usted;
      if (!imp) continue; // haber / poder 實務上不用命令式
      expect(imp, `${id}`).toBe(form(id, 'presenteSubjuntivo', 'el_ella_usted'));
    }
  });

  it('命令式沒有 yo 形式（schema 層面就不允許）', () => {
    for (const verb of allVerbs) {
      expect(Object.keys(verb.imperativo ?? {})).not.toContain('yo');
    }
  });
});
