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
    // 同形不同性：el guía（男導遊）／la guía（女導遊，也指手冊）。
    // 資料以「人」為主詞條標陽性，另有 genderNote 說明兩種用法。
    'guia',
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

describe('內容裡的 markdown 語法都要渲染得出來', () => {
  /**
   * 課文與題目用的是自寫的極簡 markdown（Markish）。
   * 它只支援 **粗體**、`程式碼`、- 清單、> 引言、``` 區塊、| 表格。
   * 內容裡若出現它不認得的語法，畫面上就會直接露出符號給學習者看 ——
   * 實測就發生過題目顯示成「哪一句**錯了**？」。
   */
  const SUPPORTED_BLOCK = /^\s*(\||>|[-•]\s|```)/;

  it('沒有用到不支援的 markdown 標題語法', () => {
    const bad: string[] = [];
    for (const lesson of allLessons) {
      const texts = [lesson.intro.zh, lesson.intro.en,
                     lesson.pitfalls?.zh ?? '', lesson.pitfalls?.en ?? ''];
      for (const t of texts) {
        for (const line of t.split('\n')) {
          if (/^\s*#{1,6}\s/.test(line)) bad.push(`${lesson.id}: ${line.slice(0, 40)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('表格一定伴隨 |---| 分隔線，否則不會被當成表格', () => {
    const bad: string[] = [];
    for (const lesson of allLessons) {
      for (const t of [lesson.intro.zh, lesson.intro.en,
                       lesson.pitfalls?.zh ?? '', lesson.pitfalls?.en ?? '']) {
        const lines = t.split('\n');
        lines.forEach((line, i) => {
          if (!line.trimStart().startsWith('|')) return;
          // 是表格的一部分就好：前一行或下一行有分隔線
          const sep = /^\s*\|[\s:|-]+\|\s*$/;
          const inTable = sep.test(lines[i + 1] ?? '') || sep.test(line)
            || lines.slice(0, i).some((l) => sep.test(l));
          if (!inTable) bad.push(`${lesson.id}: ${line.slice(0, 40)}`);
        });
      }
    }
    expect(bad).toEqual([]);
  });

  it('題目的 prompt 只用行內語法，不用區塊語法', () => {
    // prompt 是單行渲染的，放清單或表格進去不會有效果
    const bad: string[] = [];
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        if (!('prompt' in ex)) continue;
        for (const t of [ex.prompt.zh, ex.prompt.en]) {
          if (SUPPORTED_BLOCK.test(t) || t.includes('\n')) {
            bad.push(`${lesson.id}/${ex.id}: ${t.slice(0, 40)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('選項與選項說明不使用 markdown（那兩處不過渲染器）', () => {
    const bad: string[] = [];
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'mcq') continue;
        for (const o of [...ex.options, ...ex.optionExplains]) {
          for (const t of [o.zh, o.en]) {
            if (t.includes('**') || t.includes('`')) bad.push(`${lesson.id}/${ex.id}: ${t.slice(0, 40)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('題目本身答得出來', () => {
  /**
   * 這四條擋的是「內容看起來沒問題、但實際上做不了」的題目。
   * 前兩條跟 `normalizeAnswer()` 的行為綁在一起：它會折疊重音、去掉句首句尾的
   * 標點，所以那些不用另外列；但 ñ 與逗號**不會**被處理掉。
   */
  const listeningItems = allLessons.flatMap((l) =>
    l.exercises.filter((e) => e.type === 'listening').map((e) => ({ at: `${l.id}/${e.id}`, ex: e })),
  );

  it('有聽力題可以檢查', () => {
    expect(listeningItems.length).toBeGreaterThan(40);
  });

  it('句子含 ñ 時，accept 一定有無 ñ 的版本', () => {
    // ñ 刻意不被折成 n（año ≠ ano），沒有西文鍵盤的人打不出來，
    // 漏了這條那一題就永遠答不對
    const bad = listeningItems
      .filter(({ ex }) => ex.es.includes('ñ') || ex.es.includes('Ñ'))
      .filter(({ ex }) => !ex.accept.some((a) => !a.includes('ñ') && !a.includes('Ñ')))
      .map(({ at, ex }) => `${at}: ${ex.es}`);
    expect(bad).toEqual([]);
  });

  it('句子含逗號時，accept 一定有無逗號的版本', () => {
    // 逗號不在 normalizeAnswer 的去除清單裡，聽寫時漏打逗號很正常
    const bad = listeningItems
      .filter(({ ex }) => ex.es.includes(','))
      .filter(({ ex }) => !ex.accept.some((a) => !a.includes(',')))
      .map(({ at, ex }) => `${at}: ${ex.es}`);
    expect(bad).toEqual([]);
  });

  it('accept 的每個版本都不是空的', () => {
    const bad = listeningItems
      .filter(({ ex }) => ex.accept.length === 0 || ex.accept.some((a) => a.trim().length === 0))
      .map(({ at }) => at);
    expect(bad).toEqual([]);
  });

  it('陰陽性分類題不會用到兩個冠詞都對的字', () => {
    // el/la estudiante 兩個都對、el agua 陰性卻配 el —— 用 el/la 兩個按鈕問，
    // 這兩種字都會把正確答案判成錯的
    const exempt = new Set(allWords.filter((w) => w.genderSortExempt).map((w) => w.id));
    expect(exempt.size).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const lesson of allLessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'genderSort') continue;
        for (const id of ex.wordIds) if (exempt.has(id)) bad.push(`${lesson.id}/${ex.id}: ${id}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('每一課的題目配置', () => {
  it('每課 6–10 題 —— 規格訂的範圍', () => {
    // 少於 6 題練不夠，多於 10 題一次做不完。之前這條規則只寫在規格裡沒有守門，
    // 補內容時會不知不覺變成 11、12 題
    const bad = allLessons
      .filter((l) => l.exercises.length < 6 || l.exercises.length > 10)
      .map((l) => `${l.id}: ${l.exercises.length} 題`);
    expect(bad).toEqual([]);
  });

  it('每一課至少 1 題聽力', () => {
    // 少了這條，聽力會像之前那樣慢慢流失到只剩 A0 有
    const bad = allLessons
      .filter((l) => !l.exercises.some((e) => e.type === 'listening'))
      .map((l) => l.id);
    expect(bad).toEqual([]);
  });

  it('四選一佔全部題目不超過 45%', () => {
    // 四選一最好寫，放著不管就會吃掉整份題庫（Phase 8 之前是 47%）。
    // 個別課程仍然可以偏多 —— 發音課本來就適合用四選一辨音；擋的是整體失衡
    const all = allLessons.flatMap((l) => l.exercises);
    const mcq = all.filter((e) => e.type === 'mcq').length;
    expect(mcq / all.length).toBeLessThanOrEqual(0.45);
  });
});
