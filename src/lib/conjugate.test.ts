import { describe, it, expect } from 'vitest';
import {
  conjugateTense, conjugateAll, conjugateImperative, participio, gerundio,
  parseVerb, mergeConjugations,
} from './conjugate';
import { PERSONS, SIMPLE_TENSES } from '@/content/schema';

const forms = (raw: string, tense: Parameters<typeof conjugateTense>[1]) =>
  PERSONS.map((p) => conjugateTense(raw, tense)[p]);

describe('不定式解析', () => {
  it('辨認三種字尾', () => {
    expect(parseVerb('hablar').cls).toBe('ar');
    expect(parseVerb('comer').cls).toBe('er');
    expect(parseVerb('vivir').cls).toBe('ir');
  });

  it('辨認反身動詞並剝掉 -se', () => {
    const v = parseVerb('llamarse');
    expect(v.reflexive).toBe(true);
    expect(v.infinitive).toBe('llamar');
    expect(v.stem).toBe('llam');
  });

  it('拒絕不是不定式的字', () => {
    expect(() => parseVerb('mesa')).toThrow();
  });
});

describe('規則 -ar 動詞：hablar', () => {
  it('現在式', () => {
    expect(forms('hablar', 'presente'))
      .toEqual(['hablo', 'hablas', 'habla', 'hablamos', 'hablan']);
  });
  it('簡單過去式', () => {
    expect(forms('hablar', 'preteritoIndefinido'))
      .toEqual(['hablé', 'hablaste', 'habló', 'hablamos', 'hablaron']);
  });
  it('未完成過去式', () => {
    expect(forms('hablar', 'imperfecto'))
      .toEqual(['hablaba', 'hablabas', 'hablaba', 'hablábamos', 'hablaban']);
  });
  it('未來式接在完整不定式後面', () => {
    expect(forms('hablar', 'futuro'))
      .toEqual(['hablaré', 'hablarás', 'hablará', 'hablaremos', 'hablarán']);
  });
  it('條件式', () => {
    expect(forms('hablar', 'condicional'))
      .toEqual(['hablaría', 'hablarías', 'hablaría', 'hablaríamos', 'hablarían']);
  });
  it('現在虛擬式', () => {
    expect(forms('hablar', 'presenteSubjuntivo'))
      .toEqual(['hable', 'hables', 'hable', 'hablemos', 'hablen']);
  });
  it('過去虛擬式', () => {
    expect(forms('hablar', 'imperfectoSubjuntivo'))
      .toEqual(['hablara', 'hablaras', 'hablara', 'habláramos', 'hablaran']);
  });
});

describe('規則 -er 動詞：comer', () => {
  it('現在式', () => {
    expect(forms('comer', 'presente')).toEqual(['como', 'comes', 'come', 'comemos', 'comen']);
  });
  it('簡單過去式', () => {
    expect(forms('comer', 'preteritoIndefinido'))
      .toEqual(['comí', 'comiste', 'comió', 'comimos', 'comieron']);
  });
  it('未完成過去式', () => {
    expect(forms('comer', 'imperfecto'))
      .toEqual(['comía', 'comías', 'comía', 'comíamos', 'comían']);
  });
  it('現在虛擬式', () => {
    expect(forms('comer', 'presenteSubjuntivo'))
      .toEqual(['coma', 'comas', 'coma', 'comamos', 'coman']);
  });
  it('過去虛擬式', () => {
    expect(forms('comer', 'imperfectoSubjuntivo'))
      .toEqual(['comiera', 'comieras', 'comiera', 'comiéramos', 'comieran']);
  });
});

describe('規則 -ir 動詞：vivir', () => {
  it('現在式的 nosotros 是 -imos，跟 -er 的 -emos 不同', () => {
    expect(forms('vivir', 'presente')).toEqual(['vivo', 'vives', 'vive', 'vivimos', 'viven']);
  });
  it('簡單過去式與 -er 同形', () => {
    expect(forms('vivir', 'preteritoIndefinido'))
      .toEqual(['viví', 'viviste', 'vivió', 'vivimos', 'vivieron']);
  });
  it('未來式', () => {
    expect(forms('vivir', 'futuro'))
      .toEqual(['viviré', 'vivirás', 'vivirá', 'viviremos', 'vivirán']);
  });
});

describe('反身動詞：llamarse', () => {
  it('現在式帶反身代名詞', () => {
    expect(forms('llamarse', 'presente'))
      .toEqual(['me llamo', 'te llamas', 'se llama', 'nos llamamos', 'se llaman']);
  });
  it('簡單過去式也帶', () => {
    expect(forms('llamarse', 'preteritoIndefinido')[0]).toBe('me llamé');
  });
});

/**
 * 這些不是不規則，是為了保住字根發音而必須改的拼法。
 * 漏掉會產出 *buscé 這種錯形式，等於教錯。
 */
describe('正字法調整', () => {
  it('-car 的 yo 過去式改成 -qué', () => {
    expect(conjugateTense('buscar', 'preteritoIndefinido').yo).toBe('busqué');
    expect(conjugateTense('buscar', 'presenteSubjuntivo').yo).toBe('busque');
  });
  it('-gar 的 yo 過去式改成 -gué', () => {
    expect(conjugateTense('llegar', 'preteritoIndefinido').yo).toBe('llegué');
    expect(conjugateTense('llegar', 'presenteSubjuntivo').nosotros).toBe('lleguemos');
  });
  it('-zar 的 yo 過去式改成 -cé', () => {
    expect(conjugateTense('empezar', 'preteritoIndefinido').yo).toBe('empecé');
  });
  it('母音字根的 leer：i 夾在母音間寫成 y，接子音時加重音符號', () => {
    const p = conjugateTense('leer', 'preteritoIndefinido');
    // leí, leíste, leyó, leímos, leyeron
    expect([p.yo, p.tu, p.el_ella_usted, p.nosotros, p.ellos_ustedes])
      .toEqual(['leí', 'leíste', 'leyó', 'leímos', 'leyeron']);
  });

  it('母音字根的過去虛擬式也套用 i→y', () => {
    expect(conjugateTense('leer', 'imperfectoSubjuntivo').yo).toBe('leyera');
  });

  it('gu 結尾的字根不套用 i→y（u 不發音，是二合字母）', () => {
    // seguir 的字根 segu 結尾看似母音，但 u 屬於 gu 二合字母，不是獨立母音
    expect(conjugateTense('seguir', 'preteritoIndefinido').el_ella_usted).not.toBe('seguyó');
  });
  it('未來式不套用正字法調整（字根是完整不定式）', () => {
    expect(conjugateTense('buscar', 'futuro').yo).toBe('buscaré');
  });
});

describe('命令式', () => {
  it('沒有 yo —— 命令式不能對自己下令', () => {
    expect(Object.keys(conjugateImperative('hablar'))).not.toContain('yo');
  });
  it('hablar', () => {
    expect(conjugateImperative('hablar'))
      .toEqual({ tu: 'habla', el_ella_usted: 'hable', nosotros: 'hablemos', ellos_ustedes: 'hablen' });
  });
  it('comer', () => {
    expect(conjugateImperative('comer'))
      .toEqual({ tu: 'come', el_ella_usted: 'coma', nosotros: 'comamos', ellos_ustedes: 'coman' });
  });
  it('vivir', () => {
    expect(conjugateImperative('vivir'))
      .toEqual({ tu: 'vive', el_ella_usted: 'viva', nosotros: 'vivamos', ellos_ustedes: 'vivan' });
  });
});

describe('分詞', () => {
  it('過去分詞', () => {
    expect(participio('hablar')).toBe('hablado');
    expect(participio('comer')).toBe('comido');
    expect(participio('vivir')).toBe('vivido');
  });
  it('現在分詞', () => {
    expect(gerundio('hablar')).toBe('hablando');
    expect(gerundio('comer')).toBe('comiendo');
    expect(gerundio('vivir')).toBe('viviendo');
  });
  it('母音結尾字根的現在分詞用 -yendo', () => {
    expect(gerundio('leer')).toBe('leyendo');
  });
});

describe('產生完整表格', () => {
  it('七個時態全部有，且每個都有五個人稱', () => {
    const all = conjugateAll('hablar');
    expect(Object.keys(all).sort()).toEqual([...SIMPLE_TENSES].sort());
    for (const tense of SIMPLE_TENSES) {
      expect(Object.keys(all[tense]).sort()).toEqual([...PERSONS].sort());
    }
  });

  it('絕不產出 vosotros 形式', () => {
    for (const verb of ['hablar', 'comer', 'vivir', 'llamarse', 'buscar']) {
      const all = conjugateAll(verb);
      for (const tense of SIMPLE_TENSES) {
        for (const form of Object.values(all[tense])) {
          expect(/(áis|éis)$/.test(form), `${verb}/${tense}: ${form}`).toBe(false);
        }
      }
    }
  });
});

describe('合併手寫的不規則形式', () => {
  it('只覆蓋指定的那幾格，其餘沿用引擎產生的', () => {
    // tener：yo 完全不規則，tú/él 有 e→ie 字根變化，nosotros 則是規則的
    const merged = mergeConjugations('tener', {
      presente: {
        yo: 'tengo', tu: 'tienes', el_ella_usted: 'tiene',
        nosotros: 'tenemos', ellos_ustedes: 'tienen',
      },
    });
    expect(merged.presente.yo).toBe('tengo');
    expect(merged.presente.nosotros).toBe('tenemos');
    // 沒有覆蓋的時態仍由引擎產生
    expect(merged.imperfecto.yo).toBe('tenía');
  });
});
