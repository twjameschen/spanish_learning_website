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

  it('每個單字都有非空的中西文例句', () => {
    for (const w of allWords) {
      expect(w.exampleEs.trim().length, `${w.id} 缺西文例句`).toBeGreaterThan(0);
      expect(w.exampleZh.trim().length, `${w.id} 缺中文例句`).toBeGreaterThan(0);
    }
  });

  it('每一題都有答錯時的解釋，不能只說「錯了」', () => {
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        expect(ex.explain.trim().length, `${lesson.id}/${ex.id} 缺 explain`).toBeGreaterThan(10);
      }
    }
  });

  it('四選一的每個選項都有各自的說明（干擾項要有意義）', () => {
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'mcq') continue;
        expect(ex.optionExplains).toHaveLength(4);
        for (const t of ex.optionExplains) expect(t.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('schema 會擋掉沒有性別的名詞', () => {
    expect(() => wordSchema.parse({
      id: 'x', es: 'mesa', zh: '桌子', pos: 'noun', level: 'A0', topic: 't',
      exampleEs: 'a', exampleZh: 'b',
    })).toThrow();
  });

  it('schema 會擋掉 id 格式錯誤', () => {
    expect(() => wordSchema.parse({
      id: 'Bad_ID', es: 'x', zh: 'x', pos: 'adv', level: 'A0', topic: 't',
      exampleEs: 'a', exampleZh: 'b',
    })).toThrow();
  });

  it('schema 會擋掉缺少現在式變化的動詞', () => {
    expect(() => verbSchema.parse({
      id: 'x', es: 'hablar', zh: '說', pos: 'verb', level: 'A0', topic: 'verbos',
      exampleEs: 'a', exampleZh: 'b', infinitive: 'hablar', irregular: false,
      participio: 'hablado', gerundio: 'hablando', conjugations: {},
    })).toThrow();
  });

  it('schema 會擋掉沒有題目的課程', () => {
    expect(() => grammarLessonSchema.parse({
      id: 'x', level: 'A0', city: 'taipei', order: 1, title: 't', intro: 'i',
      rules: [{ rule: 'r', examples: [{ es: 'a', zh: 'b' }] }],
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
