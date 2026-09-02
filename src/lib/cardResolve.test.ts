import { describe, it, expect } from 'vitest';
import { resolveCardKey, resolveCardKeys } from './cardResolve';
import { allLessons, allWords } from '@/content';
import { listenPool } from './listenDrill';
import { drillableTopics } from './genderDrill';

/**
 * 卡片 key → 題目。
 *
 * 這一組的重點是第二條：內容裡只有 5 題手寫閃卡，而單字閃卡練習會為
 * **任何**單字建立 `w:` 卡片。舊的解析只認得那 5 個，於是首頁說
 * 「今天要複習 20 張」、點進去卻只剩幾張。
 */

describe('卡片 key 解得回題目', () => {
  it('課文裡手寫的題目', () => {
    const ex = allLessons[0]!.exercises[0]!;
    expect(resolveCardKey(`x:${ex.id}`)?.id).toBe(ex.id);
  });

  it('沒有手寫閃卡的單字，w: 也解析得到 —— 這是舊版漏掉的', () => {
    const written = new Set(
      allLessons.flatMap((l) => l.exercises)
        .filter((e) => e.type === 'flashcard')
        .map((e) => (e.type === 'flashcard' ? e.wordId : '')),
    );
    expect(written.size).toBeLessThan(10);   // 手寫的就是只有那幾個

    const plain = allWords.find((w) => !written.has(w.id))!;
    const ex = resolveCardKey(`w:${plain.id}`);
    expect(ex, `${plain.id} 解析不到`).toBeDefined();
    expect(ex!.type).toBe('flashcard');
    if (ex!.type === 'flashcard') expect(ex!.wordId).toBe(plain.id);
  });

  it('有手寫閃卡時優先用手寫的（explain 是特地寫的）', () => {
    const written = allLessons.flatMap((l) => l.exercises).find((e) => e.type === 'flashcard');
    if (written?.type !== 'flashcard') throw new Error('內容裡應該要有手寫閃卡');
    expect(resolveCardKey(`w:${written.wordId}`)?.id).toBe(written.id);
  });

  it('連續聽寫產生的句子', () => {
    const generated = listenPool().find((e) => e.id.startsWith('listen-ex-'))!;
    expect(resolveCardKey(`x:${generated.id}`)?.id).toBe(generated.id);
  });

  it('主題陰陽性分類', () => {
    const topic = drillableTopics()[0]!;
    const ex = resolveCardKey(`x:gender-${topic}`);
    expect(ex?.type).toBe('genderSort');
  });

  it('對不回去時回 undefined，不丟例外', () => {
    expect(resolveCardKey('x:這題不存在')).toBeUndefined();
    expect(resolveCardKey('w:這個字不存在')).toBeUndefined();
    expect(resolveCardKey('x:gender:主題不存在')).toBeUndefined();
  });

  it('批次解析會去重，也會跳過解不到的', () => {
    const ex = allLessons[0]!.exercises[0]!;
    const out = resolveCardKeys([`x:${ex.id}`, `x:${ex.id}`, 'x:不存在']);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe(ex.id);
  });
});
