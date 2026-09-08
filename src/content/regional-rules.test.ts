import { describe, it, expect } from 'vitest';
import { allWords, allVerbs, allLessons, getLesson } from './index';

/**
 * 規格裡兩條硬性規則，在此之前**沒有任何測試把關**。
 *
 * 1. **不使用 `-ito/-ita` 指小詞。** 教材常把 `casita`、`cafecito` 當一般
 *    詞彙教，學習者會以為那是中性說法。在 Sierra 它其實是**語氣軟化**的
 *    手段，不是在講尺寸 —— 這件事只要沒說清楚就會教錯。
 * 2. **`ahorita` 的時間是模糊的。** 直接當成「立刻」會在基多等很久。
 *
 * 兩條的作法都不是「禁止出現」—— 那反而會讓教材躲開最該講的東西。
 * 規則是：**出現就必須解釋**，而且不確定的區域用法要標「待母語者確認」。
 */

/** `es` 欄位裡看起來像指小詞的字。字尾規則會誤傷一批本來就長這樣的字。 */
const NOT_DIMINUTIVE = new Set([
  'éxito', 'cita', 'señorita', 'bonito', 'humita', // humita 是安地斯玉米糕，不是 huma 的指小詞
]);

const diminutiveWords = allWords.filter(
  (w) => /(?:ito|ita)s?$/.test(w.es.split(' ').at(-1) ?? '') && !NOT_DIMINUTIVE.has(w.es),
);

describe('指小詞 -ito/-ita', () => {
  /*
   * 釘住目前這一組。多一個字就會紅 —— 逼下一個人做一次有意識的決定：
   * 這個字是真的要教的軟化用法（那就補 regional 說明），
   * 還是不小心把指小詞當成中性詞彙寫進去了。
   */
  it('單字表裡的指小詞就是這幾個，多一個就要重新想過', () => {
    expect(diminutiveWords.map((w) => w.es).sort()).toEqual(['ahorita', 'un ratito']);
  });

  it('每一個指小詞都附了說明，不能當成中性詞彙就丟出去', () => {
    for (const w of diminutiveWords) {
      expect(w.regional, `${w.es} 沒有 regional 說明`).toBeTruthy();
      expect(w.regional!.note.zh.trim().length, `${w.es} 的中文說明是空的`).toBeGreaterThan(0);
      expect(w.regional!.note.en.trim().length, `${w.es} 的英文說明是空的`).toBeGreaterThan(0);
    }
  });

  it('說明講的是「軟化語氣」而不是「比較小」—— 講成尺寸就是教錯', () => {
    const ratito = allWords.find((w) => w.es === 'un ratito')!;
    expect(ratito.regional!.note.zh).toMatch(/語氣|禮貌|柔和|軟化/);
    expect(ratito.regional!.note.en).toMatch(/soften|polite|tone/i);
  });

  it('有一整課明講 -ito 不是在講尺寸', () => {
    const lesson = getLesson('a1-cortesia-sierra')!;
    const text = JSON.stringify(lesson);
    expect(text).toMatch(/-ito/);
    // 課文裡直接舉了反例：un cafecito 不是「小杯咖啡」
    expect(text).toMatch(/cafecito/);
    // pitfalls 在 schema 上是選填的，但 no-vosotros.test.ts 要求每一課都要有
    expect(lesson.pitfalls?.zh).toMatch(/尺寸|大小|小杯/);
  });
});

describe('ahorita 的時間模糊性', () => {
  const word = allWords.find((w) => w.id === 'ahorita');

  it('單字表收了 ahorita，而且標了「待母語者確認」', () => {
    expect(word).toBeTruthy();
    expect(word!.regional?.needsVerify).toBe(true);
  });

  it('說明同時講到「立刻」與「等一下」兩種可能，不是只給一個翻譯', () => {
    const zh = word!.regional!.note.zh;
    const en = word!.regional!.note.en;
    expect(zh).toMatch(/立刻|馬上/);
    expect(zh).toMatch(/等一下|待會|一會/);
    expect(en).toMatch(/right now|immediately/i);
    expect(en).toMatch(/little while|in a while|later/i);
  });

  it('課文把「把 ahorita 當成立刻」列成會犯的錯', () => {
    const lesson = getLesson('a1-cortesia-sierra')!;
    expect(lesson.pitfalls?.zh).toMatch(/ahorita/);
    expect(lesson.pitfalls?.en).toMatch(/ahorita/i);
  });
});

describe('區域用法的誠實標註（規格：不確定就標，不要編）', () => {
  /*
   * `no-vosotros.test.ts` 已經用 id 釘住 guagua 與 nano 兩個字。
   * 這一條改成**看內容**：任何說明裡提到 Kichwa 的詞條都必須標 needsVerify，
   * 所以之後再加第三個 Kichwa 借詞也擋得到 —— 釘 id 的版本擋不到。
   *
   * （REGIONS 列舉裡沒有 'Kichwa'，來源是寫在 note 裡的。）
   */
  it('說明裡提到 Kichwa 的詞條一律標 needsVerify', () => {
    const kichwa = [...allWords, ...allVerbs].filter(
      (o) => /kichwa|quichua|quechua/i.test(`${o.regional?.note.zh ?? ''}${o.regional?.note.en ?? ''}`),
    );
    expect(kichwa.length, '一個 Kichwa 借詞都沒有，偵測條件可能失效了').toBeGreaterThan(0);
    for (const w of kichwa) {
      expect(w.regional!.needsVerify, `${w.es} 是 Kichwa 借詞，必須標 needsVerify`).toBe(true);
    }
  });

  it('課程層的區域註記也要中英雙語且非空', () => {
    const flagged = allLessons.filter((l) => l.regional);
    expect(flagged.length).toBeGreaterThan(0);
    for (const l of flagged) {
      expect(l.regional!.note.zh.trim().length, l.id).toBeGreaterThan(0);
      expect(l.regional!.note.en.trim().length, l.id).toBeGreaterThan(0);
    }
  });

  it('Sierra 禮貌專課標了「待母語者確認」—— 世代與場合都會影響這一課的內容', () => {
    expect(getLesson('a1-cortesia-sierra')!.regional?.needsVerify).toBe(true);
  });
});
