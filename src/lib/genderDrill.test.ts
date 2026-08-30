import { describe, it, expect } from 'vitest';
import {
  buildGenderDrill, buildAllGenderDrills, drillableTopics, canDrillTopic,
  nounsForTopic, isGenderDrillId, topicFromDrillId, GENDER_DRILL_PREFIX,
} from './genderDrill';
import { getWord } from '@/content';

describe('依主題產生陰陽性分類題', () => {
  it('出得出一組的主題至少有 15 個', () => {
    // 主題不夠多的話「每個主題都來一組」就沒有意義
    expect(drillableTopics().length).toBeGreaterThanOrEqual(15);
  });

  it('每一組都是 8 個字', () => {
    for (const ex of buildAllGenderDrills()) {
      expect(ex.type).toBe('genderSort');
      if (ex.type !== 'genderSort') continue;
      expect(ex.wordIds).toHaveLength(8);
    }
  });

  it('每一組的兩種性別各至少 2 個 —— 全同一性別就不叫分類了', () => {
    for (const ex of buildAllGenderDrills()) {
      if (ex.type !== 'genderSort') continue;
      const genders = ex.wordIds.map((id) => getWord(id)?.gender);
      const m = genders.filter((g) => g === 'm').length;
      const f = genders.filter((g) => g === 'f').length;
      expect(m, `${ex.id} 陽性只有 ${m} 個`).toBeGreaterThanOrEqual(2);
      expect(f, `${ex.id} 陰性只有 ${f} 個`).toBeGreaterThanOrEqual(2);
    }
  });

  it('每個字都真的是有標性別的名詞（integrity 的要求）', () => {
    for (const ex of buildAllGenderDrills()) {
      if (ex.type !== 'genderSort') continue;
      for (const id of ex.wordIds) {
        const w = getWord(id);
        expect(w, `${ex.id} 指向不存在的字 ${id}`).toBeDefined();
        expect(w!.pos, `${id} 不是名詞`).toBe('noun');
        expect(w!.gender, `${id} 沒有標性別`).toBeDefined();
      }
    }
  });

  it('一組裡沒有重複的字', () => {
    for (const ex of buildAllGenderDrills()) {
      if (ex.type !== 'genderSort') continue;
      expect(new Set(ex.wordIds).size).toBe(ex.wordIds.length);
    }
  });

  it('同一個主題每次產生的都一樣 —— 換一批就記不起來了', () => {
    const a = buildGenderDrill('comida');
    const b = buildGenderDrill('comida');
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });

  it('不同主題產生不同的字', () => {
    const a = buildGenderDrill('comida');
    const b = buildGenderDrill('ciudad');
    if (a?.type !== 'genderSort' || b?.type !== 'genderSort') throw new Error('should exist');
    expect(a.wordIds).not.toEqual(b.wordIds);
  });

  it('字不夠的主題回傳 null，不會硬湊', () => {
    // emociones 只有 3 個名詞，湊不出 8 個
    expect(canDrillTopic('emociones')).toBe(false);
    expect(buildGenderDrill('emociones')).toBeNull();
    expect(buildGenderDrill('這個主題不存在')).toBeNull();
  });

  it('題目 id 唯一且看得出是產生的', () => {
    const ids = buildAllGenderDrills().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith(GENDER_DRILL_PREFIX))).toBe(true);
    expect(ids.every(isGenderDrillId)).toBe(true);
  });

  it('id 轉得回主題名稱', () => {
    expect(topicFromDrillId(`${GENDER_DRILL_PREFIX}comida`)).toBe('comida');
    expect(nounsForTopic(topicFromDrillId(`${GENDER_DRILL_PREFIX}comida`)).length)
      .toBeGreaterThan(8);
  });

  it('explain 兩種語言都有，而且說明了「跟冠詞一起背」', () => {
    for (const ex of buildAllGenderDrills()) {
      expect(ex.explain.zh.length).toBeGreaterThan(10);
      expect(ex.explain.en.length).toBeGreaterThan(10);
      expect(ex.explain.zh).toContain('冠詞');
      expect(ex.explain.en).toContain('article');
    }
  });

  it('英文說明裡不能有中文字', () => {
    for (const ex of buildAllGenderDrills()) {
      expect(ex.explain.en, ex.id).not.toMatch(/[一-鿿]/);
    }
  });

  it('限時在 schema 允許的範圍內（10–180 秒）', () => {
    for (const ex of buildAllGenderDrills()) {
      if (ex.type !== 'genderSort') continue;
      expect(ex.seconds).toBeGreaterThanOrEqual(10);
      expect(ex.seconds).toBeLessThanOrEqual(180);
    }
  });
});
