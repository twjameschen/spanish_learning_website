import { describe, it, expect } from 'vitest';
import { UI } from './ui';
import { LOCALES, localizedSchema } from '@/content/schema';
import { allWords, allLessons, journey, TOPIC_LABEL, POS_LABEL } from '@/content';
import { EXERCISE_TYPE_LABEL, PERSON_LABEL, TENSE_LABEL } from '@/content/schema';

/**
 * 雙語完整性。
 *
 * 這一組測試的價值在於：切到英文時如果有任何欄位漏翻，
 * 使用者會看到一半中文一半英文 —— 那比整頁中文還糟。
 * 與其在執行期 fallback，不如在這裡擋下來。
 */

function collect(): { where: string; value: unknown }[] {
  const out: { where: string; value: unknown }[] = [];
  const add = (where: string, value: unknown) => out.push({ where, value });

  for (const [key, value] of Object.entries(UI)) add(`UI.${key}`, value);
  for (const [key, value] of Object.entries(TOPIC_LABEL)) add(`TOPIC_LABEL.${key}`, value);
  for (const [key, value] of Object.entries(POS_LABEL)) add(`POS_LABEL.${key}`, value);
  for (const [key, value] of Object.entries(EXERCISE_TYPE_LABEL)) add(`EXERCISE.${key}`, value);
  for (const [key, v] of Object.entries(PERSON_LABEL)) add(`PERSON.${key}`, v.label);
  for (const [key, v] of Object.entries(TENSE_LABEL)) add(`TENSE.${key}`, v.label);

  for (const w of allWords) {
    add(`word:${w.id}.gloss`, w.gloss);
    add(`word:${w.id}.exampleGloss`, w.exampleGloss);
    if (w.genderNote) add(`word:${w.id}.genderNote`, w.genderNote);
    if (w.regional) add(`word:${w.id}.regional.note`, w.regional.note);
  }

  for (const l of allLessons) {
    add(`${l.id}.title`, l.title);
    add(`${l.id}.intro`, l.intro);
    if (l.pitfalls) add(`${l.id}.pitfalls`, l.pitfalls);
    if (l.regional) add(`${l.id}.regional.note`, l.regional.note);
    l.rules.forEach((r, i) => {
      add(`${l.id}.rules[${i}].rule`, r.rule);
      r.examples.forEach((e, j) => {
        add(`${l.id}.rules[${i}].examples[${j}].gloss`, e.gloss);
        if (e.note) add(`${l.id}.rules[${i}].examples[${j}].note`, e.note);
      });
    });
    l.pronunciation?.forEach((p, i) => add(`${l.id}.pronunciation[${i}].note`, p.note));
    for (const ex of l.exercises) {
      add(`${l.id}/${ex.id}.explain`, ex.explain);
      if (ex.type === 'mcq') {
        add(`${l.id}/${ex.id}.prompt`, ex.prompt);
        ex.options.forEach((o, i) => add(`${l.id}/${ex.id}.options[${i}]`, o));
        ex.optionExplains.forEach((o, i) => add(`${l.id}/${ex.id}.optionExplains[${i}]`, o));
      }
      if (ex.type === 'translate' || ex.type === 'wordOrder') {
        add(`${l.id}/${ex.id}.prompt`, ex.prompt);
      }
      if (ex.type === 'listening') add(`${l.id}/${ex.id}.gloss`, ex.gloss);
    }
  }

  for (const s of journey) {
    add(`journey.${s.city}.name`, s.name);
    add(`journey.${s.city}.country`, s.country);
    add(`journey.${s.city}.blurb`, s.blurb);
  }

  return out;
}

describe('中英雙語完整性', () => {
  const all = collect();

  it('有可觀數量的可翻譯欄位被納入檢查', () => {
    expect(all.length).toBeGreaterThan(1000);
  });

  it('每一個 Localized 欄位的兩種語言都存在且非空', () => {
    const broken: string[] = [];
    for (const { where, value } of all) {
      const parsed = localizedSchema.safeParse(value);
      if (!parsed.success) {
        broken.push(`  [${where}] ${parsed.error.issues[0]?.message ?? '格式不符'}`);
      }
    }
    expect(broken, `有 ${broken.length} 個欄位缺翻譯：\n${broken.slice(0, 20).join('\n')}`)
      .toEqual([]);
  });

  it('英文欄位不會偷懶直接放中文', () => {
    const hasHan = /[一-鿿]/;
    const lazy = all
      .filter(({ value }) => {
        const p = localizedSchema.safeParse(value);
        return p.success && hasHan.test(p.data.en);
      })
      .map(({ where }) => `  [${where}]`);
    expect(lazy, `這些欄位的英文含中文字：\n${lazy.slice(0, 20).join('\n')}`).toEqual([]);
  });

  it('該翻譯的欄位不會兩版一模一樣', () => {
    // 兩版相同**有時是對的**：注音式的重音標記（CA-sa、ha-BLAR）、
    // 音標（/k/）、純數字（0–5、99）本來就沒有語言之分。
    // 判準：中文版裡完全沒有漢字，就代表它從來不是中文散文，兩版相同很正常。
    // 反過來，中文版有漢字卻和英文版一字不差，那一定是漏翻。
    const ALLOWED_SAME = new Set(['UI.appName', 'UI.heroTitle']);
    const hasHan = /[一-鿿]/;
    const identical = all
      .filter(({ where, value }) => {
        if (ALLOWED_SAME.has(where)) return false;
        const p = localizedSchema.safeParse(value);
        if (!p.success || p.data.zh !== p.data.en) return false;
        return hasHan.test(p.data.zh);
      })
      .map(({ where }) => `  [${where}]`);
    expect(identical, `這些欄位中英文一模一樣：\n${identical.slice(0, 20).join('\n')}`).toEqual([]);
  });

  it('每個語言代碼都被 UI 表完整覆蓋', () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(UI)) {
        expect(value[locale], `UI.${key} 缺 ${locale}`).toBeTruthy();
      }
    }
  });
});
