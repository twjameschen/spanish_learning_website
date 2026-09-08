import { describe, it, expect } from 'vitest';
import {
  allLessons,
  journey,
  orderedLessons,
  lessonNeighbours,
  firstUnfinishedLesson,
} from './index';

/**
 * 課程順序。
 *
 * 這一組是為了一個活了很多階段沒被發現的 bug 寫的：
 * `lesson.order` 是**每個城市各自從 1 開始編**的（41 課只有 13 個相異值），
 * 但 `LessonPage` 一直拿它 `sort` 全部 41 課來算上一課／下一課。
 * 結果「A0 第 1 課」的下一課是 A1 的反身動詞、上一課是 B1 的過去虛擬式 ——
 * 初學者照著按就直接掉出 A0。
 *
 * 正確的順序是 journey 各站的 lessonIds 接起來。
 */

describe('課程順序', () => {
  it('order 是每個城市各自編號的，不能拿來排全部課程', () => {
    const orders = allLessons.map((l) => l.order);
    // 這一條不是在測功能，是把「為什麼不能用 order」釘在測試裡
    expect(new Set(orders).size).toBeLessThan(orders.length);
    expect(Math.max(...orders)).toBeLessThan(allLessons.length);
  });

  it('正式順序涵蓋全部 41 課，沒有重複也沒有漏掉', () => {
    expect(orderedLessons).toHaveLength(allLessons.length);
    expect(new Set(orderedLessons.map((l) => l.id)).size).toBe(allLessons.length);
  });

  it('正式順序就是 journey 的站別順序', () => {
    expect(orderedLessons.map((l) => l.id)).toEqual(journey.flatMap((s) => s.lessonIds));
  });

  it('等級只會往前走，不會從 A0 跳到 A1 再跳回來', () => {
    const rank = { A0: 0, A1: 1, A2: 2, B1: 3 } as const;
    const levels = orderedLessons.map((l) => rank[l.level]);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]!).toBeGreaterThanOrEqual(levels[i - 1]!);
    }
  });

  it('第一課沒有上一課，最後一課沒有下一課', () => {
    const first = orderedLessons[0]!;
    const last = orderedLessons[orderedLessons.length - 1]!;
    expect(lessonNeighbours(first.id).prev).toBeUndefined();
    expect(lessonNeighbours(last.id).next).toBeUndefined();
  });

  /*
   * 這一條就是那個 bug 本身：以前 a0-saludos 的下一課是 a1-reflexivos。
   */
  it('A0 的課的鄰居還是 A0 的課', () => {
    const { prev, next } = lessonNeighbours('a0-saludos');
    expect(prev?.id).toBe('a0-seseo-yeismo');
    expect(next?.id).toBe('a0-numeros');
    expect(prev?.level).toBe('A0');
    expect(next?.level).toBe('A0');
  });

  it('每一課的下一課，其上一課就是自己 —— 前後要對得起來', () => {
    for (const l of orderedLessons) {
      const { next } = lessonNeighbours(l.id);
      if (next) expect(lessonNeighbours(next.id).prev?.id).toBe(l.id);
    }
  });

  it('不存在的 id 兩邊都回 undefined，不是丟錯', () => {
    expect(lessonNeighbours('zzzzz')).toEqual({});
  });

  describe('下一堂還沒做的課', () => {
    it('全新使用者從第一課開始', () => {
      expect(firstUnfinishedLesson({})?.id).toBe(orderedLessons[0]!.id);
    });

    it('做完前三課就指到第四課', () => {
      const done = new Set(orderedLessons.slice(0, 3).map((l) => l.id));
      expect(firstUnfinishedLesson(done)?.id).toBe(orderedLessons[3]!.id);
    });

    it('中間跳著做，指的是最前面那一堂沒做的', () => {
      const done = new Set([orderedLessons[0]!.id, orderedLessons[5]!.id]);
      expect(firstUnfinishedLesson(done)?.id).toBe(orderedLessons[1]!.id);
    });

    it('全部做完回 undefined，呼叫端才能改成建議複習', () => {
      const done = new Set(orderedLessons.map((l) => l.id));
      expect(firstUnfinishedLesson(done)).toBeUndefined();
    });

    it('吃得下 store 的物件形狀（progress.lessons），不是只吃 Set', () => {
      const lessons = { [orderedLessons[0]!.id]: { completedAt: 'x', bestAccuracy: 1, attempts: 1 } };
      expect(firstUnfinishedLesson(lessons)?.id).toBe(orderedLessons[1]!.id);
    });
  });
});
