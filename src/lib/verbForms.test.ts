import { describe, it, expect } from 'vitest';
import { formIndex, lookupForm, verbsForForm, hitsForVerb, formLabel } from './verbForms';
import { allVerbs, getVerb } from '@/content';
import { PERSONS } from '@/content/schema';

/**
 * 變位形式反查。
 *
 * 存在的理由：學習者讀到 `fui`、`tuve`、`hice` 這種已經變過位的形式時，
 * 單字表的搜尋完全找不到 —— 它只比對原形、字義與例句。
 * 但資料裡其實知道 `fui` 同時屬於 `ser` 和 `ir`。
 */

describe('變位形式反查', () => {
  it('fui 同時查得到 ser 與 ir —— 這正是最需要幫忙的歧義', () => {
    expect(verbsForForm('fui').sort()).toEqual(['ir', 'ser']);

    const ser = hitsForVerb('fui', 'ser');
    expect(ser).toHaveLength(1);
    expect(ser[0]!.what).toEqual({
      kind: 'tense',
      tense: 'preteritoIndefinido',
      person: 'yo',
    });
  });

  it('折重音：打 seria 也找得到 sería', () => {
    expect(verbsForForm('seria')).toContain('ser');
    expect(verbsForForm('sería')).toContain('ser');
  });

  it('大小寫與前後空白不影響', () => {
    expect(verbsForForm('  FUI ')).toEqual(verbsForForm('fui'));
  });

  /*
   * 反身動詞在 JSON 裡存的是連代名詞的完整形式（llamarse 的 yo 是
   * "me llamo"）。只索引完整形式的話，使用者打 llamo 會找不到 ——
   * 而他在課文裡看到的往往就是不帶代名詞的那半。
   */
  it('反身動詞：me llamo 與 llamo 都找得到 llamarse', () => {
    expect(verbsForForm('me llamo')).toContain('llamarse');
    expect(verbsForForm('llamo')).toContain('llamarse');
  });

  it('命令式與兩個分詞也在索引裡', () => {
    // llamarse 的命令式 tú 是 llámate（代名詞黏在後面、重音要補）
    const imp = hitsForVerb('llámate', 'llamarse');
    expect(imp).toHaveLength(1);
    expect(imp[0]!.what).toEqual({ kind: 'imperativo', person: 'tu' });

    expect(hitsForVerb('sido', 'ser')[0]!.what).toEqual({ kind: 'participio' });
    expect(hitsForVerb('siendo', 'ser')[0]!.what).toEqual({ kind: 'gerundio' });
  });

  it('查不到的字回空陣列，不是丟錯', () => {
    expect(lookupForm('zzzzz')).toEqual([]);
    expect(lookupForm('')).toEqual([]);
    expect(verbsForForm('zzzzz')).toEqual([]);
  });

  /*
   * 完整性：資料裡每一格都要進得了索引。
   * 這條才是真正防止「加了新動詞但反查漏掉」的那一條。
   */
  it('每個動詞的每一格都進得了索引，一格都不漏', () => {
    const missing: string[] = [];
    let counted = 0;

    for (const verb of allVerbs) {
      for (const [tense, set] of Object.entries(verb.conjugations)) {
        if (!set) continue;
        for (const person of PERSONS) {
          const form = set[person];
          if (!form) continue;
          counted += 1;
          const hit = hitsForVerb(form, verb.id).find(
            (h) => h.what.kind === 'tense' && h.what.tense === tense && h.what.person === person,
          );
          if (!hit) missing.push(`${verb.id} ${tense} ${person} = ${form}`);
        }
      }
      for (const [person, form] of Object.entries(verb.imperativo ?? {})) {
        if (!form) continue;
        counted += 1;
        const hit = hitsForVerb(form, verb.id).find(
          (h) => h.what.kind === 'imperativo' && h.what.person === person,
        );
        if (!hit) missing.push(`${verb.id} imperativo ${person} = ${form}`);
      }
    }

    expect(missing).toEqual([]);
    // 105 動詞 × 7 時態 × 5 人稱 = 3675，加上 102 個動詞的 4 個命令式
    expect(counted).toBe(3675 + 408);
  });

  it('索引裡的每一筆都指得回真的存在的動詞', () => {
    const bad: string[] = [];
    for (const [k, hits] of formIndex()) {
      for (const h of hits) {
        if (!getVerb(h.verbId)) bad.push(`${k} → ${h.verbId}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('說明是雙語的，而且照時態與人稱組出來', () => {
    const zh = formLabel({ kind: 'tense', tense: 'preteritoIndefinido', person: 'yo' });
    expect(zh.zh).toBe('簡單過去式・我');
    expect(zh.en).toBe('preterite · I');

    expect(formLabel({ kind: 'participio' }).zh).toBe('過去分詞');
    expect(formLabel({ kind: 'imperativo', person: 'tu' }).zh).toBe('命令式・你');
  });
});
