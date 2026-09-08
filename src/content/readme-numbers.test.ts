import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allWords, allVerbs, allLessons, allTopics } from './index';
import { canDrillTopic } from '@/lib/genderDrill';
import { listenPoolSize } from '@/lib/listenDrill';
import { ACHIEVEMENTS } from '@/lib/achievements';

/**
 * README 的統計數字。
 *
 * 那張表全靠手維護，而且**已經漂移過**：Phase 16 之前它寫著
 * 「105 個，其中 15 個高頻不規則動詞補齊 7 個簡單時態」——
 * 實際上 105 個全部都有 7 個時態，不規則的是 49 個不是 15 個。
 * 錯的數字比沒有數字更糟，因為它讀起來像已經查證過。
 *
 * 這一組把每個數字接回真正的來源。改內容之後 README 忘了改就會紅，
 * 錯誤訊息直接說出該填多少。
 */

// vitest 從專案根目錄跑；`import.meta.url` 在這個測試環境下不是 file: scheme
const README = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

/**
 * 抓 README 表格裡某一列出現的所有數字。
 * 等級代號（A0／A1／A2／B1）裡的數字要先拿掉，否則會被當成統計數字。
 */
const numbersInRow = (label: string): number[] => {
  const row = README.split('\n').find((l) => l.startsWith(`| ${label} `));
  if (!row) throw new Error(`README 裡找不到「${label}」那一列`);
  return [...row.replace(/\b[AB][012]\b/g, '').matchAll(/\d+/g)].map((m) => Number(m[0]));
};

describe('README 的數字對得上內容', () => {
  // `allWords` 已經包含 105 個動詞，不要再把 allVerbs 加一次
  it('詞條總數與各級距', () => {
    const byLevel = (lv: string) => allWords.filter((w) => w.level === lv).length;
    expect(numbersInRow('詞條（含動詞）')).toEqual([
      allWords.length, byLevel('A0'), byLevel('A1'), byLevel('A2'), byLevel('B1'),
    ]);
  });

  it('動詞數、時態數、變位形式數、不規則數、命令式數', () => {
    const tenses = Object.keys(allVerbs[0]!.conjugations).length;
    const forms = allVerbs.reduce(
      (n, v) => n + Object.values(v.conjugations).reduce((m, t) => m + Object.keys(t).length, 0), 0,
    );
    const irregular = allVerbs.filter((v) => v.irregular).length;
    const imperativo = allVerbs.filter((v) => v.imperativo).length;
    expect(numbersInRow('動詞變位表')).toEqual([
      allVerbs.length, tenses, forms, irregular, imperativo,
    ]);
  });

  it('課程數與各級距', () => {
    const byLevel = (lv: string) => allLessons.filter((l) => l.level === lv).length;
    expect(numbersInRow('課程')).toEqual([
      allLessons.length, byLevel('A0'), byLevel('A1'), byLevel('A2'), byLevel('B1'),
    ]);
  });

  it('練習題總數、題型數，以及每一種題型各幾題', () => {
    const ex = allLessons.flatMap((l) => l.exercises);
    const count = (t: string) => ex.filter((e) => e.type === t).length;
    // README 的順序：總數、題型種類、四選一、變位、翻譯、聽力、排序、分類、閃卡
    expect(numbersInRow('練習題')).toEqual([
      ex.length, 7,
      count('mcq'), count('conjugation'), count('translate'),
      count('listening'), count('wordOrder'), count('genderSort'), count('flashcard'),
    ]);
  });

  it('課外練習：可出分類題的主題數、聽寫題庫句數、每場句數', () => {
    const drillable = allTopics().filter((t) => canDrillTopic(t.topic)).length;
    expect(numbersInRow('課外練習')).toEqual([drillable, listenPoolSize(), 12]);
  });

  it('成就數', () => {
    // 「銅／銀／金三階」的「三」是中文數字，抓不到，所以只比對總數
    expect(numbersInRow('成就')).toEqual([ACHIEVEMENTS.length]);
  });

  it('標了區域用法與其中待確認的筆數', () => {
    const reg = allWords.filter((o) => o.regional);
    const nv = reg.filter((o) => o.regional!.needsVerify);
    expect(numbersInRow('標註區域用法')).toEqual([reg.length, nv.length]);
  });
});
