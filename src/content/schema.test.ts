import { describe, it, expect } from 'vitest';
import {
  wordsA0, verbsA0, lessonsA0, journey, allWords, allLessons, findIntegrityIssues,
} from './index';
import { wordSchema, verbSchema, grammarLessonSchema, PERSONS } from './schema';

describe('內容通過 zod schema', () => {
  it('載入時就完成驗證，沒有 throw 代表全部合法', () => {
    expect(wordsA0.length).toBeGreaterThan(0);
    expect(verbsA0.length).toBeGreaterThan(0);
    expect(lessonsA0.length).toBeGreaterThan(0);
    expect(journey.length).toBe(5);
  });

  it('所有 id 全域唯一', () => {
    const ids = allWords.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);

    const lessonIds = allLessons.map((l) => l.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);

    const exIds = allLessons.flatMap((l) => l.exercises.map((e) => e.id));
    expect(new Set(exIds).size).toBe(exIds.length);
  });

  it('每個名詞都有性別 —— 中文沒有性別，這是最容易漏的欄位', () => {
    for (const w of allWords) {
      if (w.pos === 'noun') {
        expect(w.gender, `${w.id} (${w.es}) 缺少 gender`).toBeDefined();
      }
    }
  });

  it('非名詞不得標性別', () => {
    for (const w of allWords) {
      if (w.pos !== 'noun') {
        expect(w.gender, `${w.id} 是 ${w.pos} 卻標了 gender`).toBeUndefined();
      }
    }
  });

  it('每個單字都有西文例句，且中英翻譯都不缺', () => {
    for (const w of allWords) {
      expect(w.exampleEs.trim().length, `${w.id} 缺西文例句`).toBeGreaterThan(0);
      expect(w.exampleGloss.zh.trim().length, `${w.id} 缺例句中譯`).toBeGreaterThan(0);
      expect(w.exampleGloss.en.trim().length, `${w.id} 缺例句英譯`).toBeGreaterThan(0);
      expect(w.gloss.zh.trim().length, `${w.id} 缺中文字義`).toBeGreaterThan(0);
      expect(w.gloss.en.trim().length, `${w.id} 缺英文字義`).toBeGreaterThan(0);
    }
  });

  it('每一題都有答錯時的解釋，不能只說「錯了」', () => {
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        expect(ex.explain.zh.trim().length, `${lesson.id}/${ex.id} 缺中文 explain`).toBeGreaterThan(10);
        expect(ex.explain.en.trim().length, `${lesson.id}/${ex.id} 缺英文 explain`).toBeGreaterThan(10);
      }
    }
  });

  it('四選一的每個選項都有各自的說明（干擾項要有意義）', () => {
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'mcq') continue;
        expect(ex.optionExplains).toHaveLength(4);
        for (const t of ex.optionExplains) {
          expect(t.zh.trim().length).toBeGreaterThan(0);
          expect(t.en.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('schema 會擋掉沒有性別的名詞', () => {
    expect(() => wordSchema.parse({
      id: 'x', es: 'mesa', gloss: { zh: '桌子', en: 'table' }, pos: 'noun',
      level: 'A0', topic: 't', exampleEs: 'a', exampleGloss: { zh: 'b', en: 'c' },
    })).toThrow();
  });

  it('schema 會擋掉 id 格式錯誤', () => {
    expect(() => wordSchema.parse({
      id: 'Bad_ID', es: 'x', gloss: { zh: 'x', en: 'x' }, pos: 'adv',
      level: 'A0', topic: 't', exampleEs: 'a', exampleGloss: { zh: 'b', en: 'c' },
    })).toThrow();
  });

  it('schema 會擋掉缺少現在式變化的動詞', () => {
    expect(() => verbSchema.parse({
      id: 'x', es: 'hablar', gloss: { zh: '說', en: 'to speak' }, pos: 'verb',
      level: 'A0', topic: 'verbos', exampleEs: 'a', exampleGloss: { zh: 'b', en: 'c' },
      infinitive: 'hablar', irregular: false,
      participio: 'hablado', gerundio: 'hablando', conjugations: {},
    })).toThrow();
  });

  it('schema 會擋掉沒有題目的課程', () => {
    expect(() => grammarLessonSchema.parse({
      id: 'x', level: 'A0', city: 'taipei', order: 1,
      title: { zh: 't', en: 't' }, intro: { zh: 'i', en: 'i' },
      rules: [{ rule: { zh: 'r', en: 'r' },
                examples: [{ es: 'a', gloss: { zh: 'b', en: 'c' } }] }],
      exercises: [], prerequisites: [], vocabIds: [], usesOnlyTaughtGrammar: true,
    })).toThrow();
  });

  it('每張變化表的人稱恰好是五個，多一個少一個都不行', () => {
    for (const v of verbsA0) {
      for (const [tense, table] of Object.entries(v.conjugations)) {
        expect(Object.keys(table).sort(), `${v.id}/${tense}`).toEqual([...PERSONS].sort());
      }
    }
  });
});

describe('內容完整性（跨檔引用）', () => {
  it('沒有任何斷掉的引用、缺漏或循環', () => {
    const issues = findIntegrityIssues();
    const report = issues.map((i) => `  [${i.where}] ${i.message}`).join('\n');
    expect(issues, `發現 ${issues.length} 個問題：\n${report}`).toEqual([]);
  });
});

describe('名詞性別的字尾規則', () => {
  /**
   * 性別標錯對學習者的傷害很直接 —— 冠詞、形容詞、代名詞會跟著一路錯下去。
   * 西班牙文的字尾規則涵蓋大部分名詞，例外是有限且可以列舉的，
   * 所以這裡用「規則 + 明列例外」把關：新增內容時標錯字尾規則的字會立刻變紅。
   */
  const FEMININE_ENDINGS = /(ción|sión|dad|tad|tud|umbre|ez)$/;
  const MASCULINE_ENDINGS = /(aje|ambre|or)$/;

  /** 字尾規則不適用的字。加進來要有理由，不是拿來讓測試變綠的。 */
  const EXCEPTIONS = new Set([
    // -a 結尾但陽性（多數源自希臘文的 -ma，以及 día / mapa）
    'dia', 'mapa', 'problema', 'idioma', 'sistema', 'clima', 'programa', 'tema', 'planeta',
    // -o 結尾但陰性
    'mano', 'foto', 'moto', 'radio',
    // -or 結尾但陰性
    'flor', 'labor',
    // -ambre 一般是陽性（alambre、enjambre），hambre 是那個著名的陰性例外
    'hambre',
    // -umbre 之外的 -e 結尾字不受規則管，不需列入
  ]);

  it('名詞的性別符合字尾規則（或在明列的例外表裡）', () => {
    const wrong: string[] = [];
    for (const w of allWords) {
      if (w.pos !== 'noun' || !w.gender || EXCEPTIONS.has(w.id)) continue;
      let expected: 'm' | 'f' | null = null;
      if (FEMININE_ENDINGS.test(w.es)) expected = 'f';
      else if (MASCULINE_ENDINGS.test(w.es)) expected = 'm';
      else if (w.es.endsWith('a')) expected = 'f';
      else if (w.es.endsWith('o')) expected = 'm';
      if (expected && expected !== w.gender) {
        wrong.push(`${w.id} (${w.es})：標了 ${w.gender}，字尾規則說是 ${expected}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('例外表裡的字真的都存在，沒有留下過期的項目', () => {
    const ids = new Set(allWords.map((w) => w.id));
    const stale = [...EXCEPTIONS].filter((id) => !ids.has(id));
    // 例外表可以先寫好之後才加字，所以只在「字存在但其實不是例外」時才算問題
    for (const id of EXCEPTIONS) {
      if (!ids.has(id)) continue;
      const w = allWords.find((x) => x.id === id)!;
      const byRule = w.es.endsWith('a') ? 'f' : w.es.endsWith('o') ? 'm' : null;
      expect(byRule === null || byRule !== w.gender,
        `${id} 其實符合字尾規則，不該列在例外表裡`).toBe(true);
    }
    expect(stale.length).toBeLessThanOrEqual(EXCEPTIONS.size);
  });

  it('陰性但單數配 el 的名詞（重音 a- 開頭）都有 genderNote', () => {
    // el agua / el hambre 這種字沒有說明的話，學習者會以為自己看到的是陽性名詞
    const needsNote = allWords.filter(
      (w) => w.pos === 'noun' && w.gender === 'f' && /^(a|ha)/.test(w.es) && /^[aá]|^ha/.test(w.es),
    );
    const missing = needsNote
      .filter((w) => ['agua', 'hambre', 'aula', 'alma', 'area'].includes(w.id) && !w.genderNote)
      .map((w) => w.id);
    expect(missing).toEqual([]);
  });
});
