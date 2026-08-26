import { describe, it, expect } from 'vitest';
import { verbsA0, allWords, allLessons } from './index';
import { PERSONS } from './schema';


/**
 * 語言變體的守門測試。
 *
 * 規格的硬性要求：拉丁美洲西班牙文，絕不出現 vosotros，厄瓜多不使用 voseo。
 * 這支測試綁進 `npm run build`，違反就直接 build 失敗，
 * 避免之後補內容時不小心從西班牙教材抄進 vosotros 形式。
 */

/**
 * 關鍵區分：**「教學內容裡使用了 vosotros」是違規，「明講我們不用 vosotros」是必要的教學。**
 * 所以不掃全文，只蒐集「學習者被期待要產出或視為正確」的西班牙文欄位。
 * 敘述性欄位（intro、chineseTrap、explain、note、title）刻意排除 ——
 * 那裡本來就該點名 vosotros 並說明拉美不用它。
 */
function taughtSpanish(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, text: string) => out.push({ where, text });

  for (const w of allWords) {
    add(`word:${w.id}.es`, w.es);
    add(`word:${w.id}.exampleEs`, w.exampleEs);
  }
  for (const v of verbsA0) {
    add(`verb:${v.id}.infinitive`, v.infinitive);
    add(`verb:${v.id}.participio`, v.participio);
    add(`verb:${v.id}.gerundio`, v.gerundio);
    for (const [tense, table] of Object.entries(v.conjugations)) {
      for (const [person, form] of Object.entries(table)) {
        add(`verb:${v.id}.${tense}.${person}`, form);
      }
    }
    for (const [person, form] of Object.entries(v.imperativo ?? {})) {
      if (form) add(`verb:${v.id}.imperativo.${person}`, form);
    }
  }
  for (const lesson of allLessons) {
    for (const [ri, rule] of lesson.rules.entries()) {
      for (const [ei, exm] of rule.examples.entries()) {
        add(`${lesson.id}.rules[${ri}].examples[${ei}].es`, exm.es);
      }
    }
    for (const ex of lesson.exercises) {
      const at = `${lesson.id}/${ex.id}`;
      switch (ex.type) {
        case 'conjugation': add(`${at}.answer`, ex.answer); break;
        case 'translate':
          add(`${at}.canonical`, ex.canonical);
          ex.accept.forEach((a, i) => add(`${at}.accept[${i}]`, a));
          break;
        case 'listening':
          add(`${at}.es`, ex.es);
          ex.accept.forEach((a, i) => add(`${at}.accept[${i}]`, a));
          break;
        case 'wordOrder':
          add(`${at}.answer`, ex.answer.join(' '));
          ex.tokens.forEach((t, i) => add(`${at}.tokens[${i}]`, t));
          break;
        case 'mcq':
          // 干擾項可以是 vosotros（那正是要教學生辨認的錯誤選項），
          // 但**正解**絕不能是 vosotros 形式。
          add(`${at}.correctOption`, ex.options[ex.answerIndex] ?? '');
          if (ex.promptEs) add(`${at}.promptEs`, ex.promptEs);
          break;
        case 'flashcard':
        case 'genderSort':
          break;
      }
    }
  }
  return out;
}

describe('拉美變體守則：絕不出現 vosotros', () => {
  it('沒有任何「要學習者產出的西班牙文」使用 vosotros 或 vuestro', () => {
    const hits = taughtSpanish()
      .filter(({ text }) => /\bvosotros\b|\bvuestr[oa]s?\b/i.test(text))
      .map(({ where, text }) => `  [${where}] ${text}`);
    expect(hits, `出現 vosotros：\n${hits.join('\n')}`).toEqual([]);
  });

  it('沒有任何動詞形式帶 vosotros 的 -áis / -éis 字尾', () => {
    // 只掃**動詞形式**。dieciséis、veintiséis、país 這些名詞本來就以 -éis/-ís 結尾，
    // 拿字尾去掃全文一定會誤判，所以範圍必須限定在變化表與變位題的答案上。
    const verbForms: { where: string; form: string }[] = [];
    for (const v of verbsA0) {
      for (const [tense, table] of Object.entries(v.conjugations)) {
        for (const [person, form] of Object.entries(table)) {
          verbForms.push({ where: `${v.id}/${tense}/${person}`, form });
        }
      }
      for (const [person, form] of Object.entries(v.imperativo ?? {})) {
        if (form) verbForms.push({ where: `${v.id}/imperativo/${person}`, form });
      }
    }
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type === 'conjugation') {
          verbForms.push({ where: `${lesson.id}/${ex.id}`, form: ex.answer });
        }
      }
    }

    const hits = verbForms
      .filter(({ form }) => /(áis|éis)$/.test(form.trim()))
      .map(({ where, form }) => `  [${where}] ${form}`);
    expect(hits, `疑似 vosotros 動詞形式：\n${hits.join('\n')}`).toEqual([]);
  });

  it('正面確認：教材確實有明講「不使用 vosotros」', () => {
    const lesson = allLessons.find((l) => l.id === 'a0-pronombres');
    expect(JSON.stringify(lesson)).toMatch(/vosotros/);
  });

  it('變化表的人稱集合恰好是那五個，不多不少', () => {
    for (const v of verbsA0) {
      for (const [tense, table] of Object.entries(v.conjugations)) {
        const keys = Object.keys(table).sort();
        expect(keys, `${v.id} 的 ${tense}`).toEqual([...PERSONS].sort());
      }
      if (v.imperativo) {
        // 命令式沒有 yo，但也絕不能有 vosotros
        expect(Object.keys(v.imperativo)).not.toContain('yo');
        for (const k of Object.keys(v.imperativo)) {
          expect(PERSONS as readonly string[]).toContain(k);
        }
      }
    }
  });

  it('沒有任何變化形是 vosotros 的 -áis / -éis / -ís 字尾', () => {
    // 只掃變化表的值，不掃全文 —— país、seis 這類正常字不該被誤判
    for (const v of verbsA0) {
      for (const [tense, table] of Object.entries(v.conjugations)) {
        for (const [person, form] of Object.entries(table)) {
          expect(
            /(áis|éis)$/.test(form),
            `${v.id}/${tense}/${person} = "${form}" 看起來像 vosotros 形式`,
          ).toBe(false);
        }
      }
    }
  });

  it('沒有 voseo 形式（厄瓜多不使用 vos）', () => {
    const VOSEO = /\b(sos|tenés|podés|querés|hablás|comés|vivís|andá|vení)\b/;
    for (const v of verbsA0) {
      for (const table of Object.values(v.conjugations)) {
        for (const form of Object.values(table)) {
          expect(VOSEO.test(form), `${v.id} 出現 voseo 形式 "${form}"`).toBe(false);
        }
      }
    }
  });

  it('第二人稱複數的中文標示是「你們＝ustedes」，不會誤導成 vosotros', () => {
    const ustedes = allWords.find((w) => w.id === 'ustedes');
    expect(ustedes).toBeDefined();
    expect(ustedes?.zh).toContain('你們');
  });
});

describe('拉美發音變體', () => {
  it('有教到 seseo 與 yeísmo，且標明拉美沒有 /θ/', () => {
    const lesson = allLessons.find((l) => l.id === 'a0-seseo-yeismo');
    expect(lesson, '缺少 seseo/yeísmo 課程').toBeDefined();
    const text = JSON.stringify(lesson);
    expect(text).toMatch(/seseo/i);
    expect(text).toMatch(/yeísmo/i);
    expect(text).toMatch(/θ|th/);
  });

  it('每一課都寫了 chineseTrap，明講中文母語者的難點', () => {
    for (const lesson of allLessons) {
      expect(lesson.chineseTrap, `${lesson.id} 缺 chineseTrap`).toBeTruthy();
      expect(lesson.chineseTrap!.length).toBeGreaterThan(30);
    }
  });
});

describe('區域用法的誠實標註', () => {
  it('Kichwa 借詞一律標 needsVerify，不憑印象當定論', () => {
    for (const id of ['guagua', 'nano']) {
      const w = allWords.find((x) => x.id === id);
      expect(w?.regional, `${id} 應該有 regional 標註`).toBeDefined();
      expect(w?.regional?.needsVerify, `${id} 的 Kichwa 來源說明應標 needsVerify`).toBe(true);
    }
  });

  it('所有 regional 註記都有非空說明', () => {
    for (const w of allWords) {
      if (!w.regional) continue;
      expect(w.regional.note.trim().length, `${w.id} 的 regional.note 是空的`).toBeGreaterThan(5);
    }
  });
});
