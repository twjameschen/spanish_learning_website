import { describe, it, expect } from 'vitest';
import { buildVocabDrill, isDrillExercise, DRILL_PREFIX } from './vocabDrill';
import { getWord } from '@/content';

describe('單字閃卡即時產生', () => {
  it('每個字兩個方向都出', () => {
    const ex = buildVocabDrill(['hola', 'casa'], 100);
    expect(ex).toHaveLength(4);
    expect(ex.filter((e) => e.type === 'flashcard' && e.direction === 'es-zh')).toHaveLength(2);
    expect(ex.filter((e) => e.type === 'flashcard' && e.direction === 'zh-es')).toHaveLength(2);
  });

  it('同一個字的兩個方向不相鄰 —— 否則第二題等於直接看到答案', () => {
    const ex = buildVocabDrill(['hola', 'casa', 'agua'], 100);
    for (let i = 1; i < ex.length; i += 1) {
      const a = ex[i - 1]!;
      const b = ex[i]!;
      if (a.type === 'flashcard' && b.type === 'flashcard') {
        expect(a.wordId === b.wordId).toBe(false);
      }
    }
  });

  it('會建立 w: 開頭的單字卡（掌握度星等靠這個）', () => {
    const ex = buildVocabDrill(['hola'], 10);
    expect(ex.every((e) => e.type === 'flashcard')).toBe(true);
    // flashcard 的 wordId 就是 ExercisePlayer 拿去組 wordKey 的來源
    expect(ex[0]!.type === 'flashcard' && ex[0]!.wordId).toBe('hola');
  });

  it('不存在的單字 id 會被略過，不會產生壞題目', () => {
    const ex = buildVocabDrill(['hola', '不存在的字'], 100);
    expect(ex).toHaveLength(2);
  });

  it('題目 id 唯一，而且看得出是即時產生的', () => {
    const ex = buildVocabDrill(['hola', 'casa', 'agua'], 100);
    const ids = ex.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith(DRILL_PREFIX))).toBe(true);
    expect(ids.every(isDrillExercise)).toBe(true);
  });

  it('explain 帶著例句，翻面後看得到用法', () => {
    const ex = buildVocabDrill(['hola'], 1);
    const word = getWord('hola')!;
    expect(ex[0]!.explain.zh).toContain(word.exampleEs);
    expect(ex[0]!.explain.en).toContain(word.exampleEs);
    expect(ex[0]!.explain.zh.length).toBeGreaterThan(10);
    expect(ex[0]!.explain.en.length).toBeGreaterThan(10);
  });

  it('limit 生效', () => {
    expect(buildVocabDrill(['hola', 'casa', 'agua'], 3)).toHaveLength(3);
  });

  it('空清單回傳空陣列', () => {
    expect(buildVocabDrill([], 10)).toEqual([]);
  });
});
