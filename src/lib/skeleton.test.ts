import { describe, it, expect } from 'vitest';
import { answerSkeleton, skeletonHoles } from './skeleton';
import { allLessons } from '@/content';

/**
 * 骨架提示是求助的第一階：形狀給你、內容自己填。
 * 這一組最重要的是最後一條 —— 骨架不能洩漏第一個字母以外的內容，
 * 否則第一階就等於直接給答案了。
 */

describe('答案骨架', () => {
  it('每個字只留第一個字母，其餘變成點', () => {
    expect(answerSkeleton('Quiero que vengas')).toBe('Q····· q·· v·····');
  });

  it('單字答案也對', () => {
    expect(answerSkeleton('tuve')).toBe('t···');
    expect(answerSkeleton('sea')).toBe('s··');
  });

  it('長度跟原答案一模一樣 —— 字數與每個字幾個字母都看得出來', () => {
    for (const s of ['Voy a la playa.', 'tengo', '¿Dónde está el baño?']) {
      expect(answerSkeleton(s)).toHaveLength(s.length);
    }
  });

  it('標點原樣保留 —— 問號跟 ¿ 藏起來沒有意義', () => {
    expect(answerSkeleton('¿Dónde está el baño?')).toBe('¿D···· e··· e· b···?');
    expect(answerSkeleton('Quiero que vengas mañana.')).toBe('Q····· q·· v····· m·····.');
  });

  it('首字母的重音要留著 —— 給一個沒重音的字母會誤導', () => {
    expect(answerSkeleton('Éramos amigos')).toBe('É····· a·····');
    expect(answerSkeleton('Ñ')).toBe('Ñ');
  });

  it('重音字母與 ñ 在字中間時要被蓋掉，不能當成標點留著', () => {
    // 用 a-z 寫 regex 就會漏掉這些，那等於把答案洩漏出去
    expect(answerSkeleton('mañana')).toBe('m·····');
    expect(answerSkeleton('está')).toBe('e···');
  });

  it('空字串與純標點不會爆', () => {
    expect(answerSkeleton('')).toBe('');
    expect(answerSkeleton('¿?')).toBe('¿?');
  });

  it('數得出還要填幾個字母', () => {
    expect(skeletonHoles(answerSkeleton('tuve'))).toBe(3);
    // Voy=2 · a=0 · la=1 · playa=4
    expect(skeletonHoles(answerSkeleton('Voy a la playa'))).toBe(7);
  });

  it('全部 141 題翻譯與變位的答案，骨架都只洩漏首字母', () => {
    const answers = allLessons.flatMap((l) => l.exercises).flatMap((e) =>
      e.type === 'translate' ? [e.canonical] : e.type === 'conjugation' ? [e.answer] : [],
    );
    expect(answers.length).toBeGreaterThan(130);

    for (const answer of answers) {
      const sk = answerSkeleton(answer);
      expect(sk, answer).toHaveLength(answer.length);
      // 骨架裡剩下的字母，必須每一個都是某個字的第一個字母
      const firsts = new Set<number>();
      let started = false;
      [...answer].forEach((ch, i) => {
        if (!/\p{L}/u.test(ch)) { if (/\s/.test(ch)) started = false; return; }
        if (!started) firsts.add(i);
        started = true;
      });
      [...sk].forEach((ch, i) => {
        if (/\p{L}/u.test(ch)) {
          expect(firsts.has(i), `${answer} 的第 ${i} 個字元洩漏了「${ch}」`).toBe(true);
        }
      });
    }
  });
});
