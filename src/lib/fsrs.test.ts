import { describe, it, expect } from 'vitest';
import {
  newCard, serializeCard, deserializeCard, reviewCard, isDue, dueCards,
  stabilityToStars, ratingFor, wordKey, exerciseKey, isWordKey, keyId,
  Rating, State, type Card,
} from './fsrs';

const AT = new Date('2026-08-26T09:00:00.000Z');

describe('卡片 key', () => {
  it('區分單字卡與題目卡', () => {
    expect(wordKey('mesa')).toBe('w:mesa');
    expect(exerciseKey('ex-hay-1')).toBe('x:ex-hay-1');
    expect(isWordKey(wordKey('mesa'))).toBe(true);
    expect(isWordKey(exerciseKey('ex-hay-1'))).toBe(false);
  });
  it('取得原始 id', () => {
    expect(keyId(wordKey('mesa'))).toBe('mesa');
    expect(keyId(exerciseKey('ex-hay-1'))).toBe('ex-hay-1');
  });
});

/**
 * 這一組是整個包裝層最重要的測試：Card.due 是 Date，
 * 存進 storage 會變成字串，讀回來若沒還原就會在呼叫 .getTime() 時炸掉。
 */
describe('序列化往返（Date ↔ ISO 字串）', () => {
  it('新卡片往返後 due 仍是可用的 Date', () => {
    const card = newCard(AT);
    const restored = deserializeCard(serializeCard(card));
    expect(restored.due).toBeInstanceOf(Date);
    expect(restored.due.getTime()).toBe(card.due.getTime());
  });

  it('實際走一趟 JSON.stringify / parse 也不會壞', () => {
    const card = reviewCard(newCard(AT), Rating.Good, AT);
    const roundTrip = deserializeCard(
      JSON.parse(JSON.stringify(serializeCard(card))) as ReturnType<typeof serializeCard>,
    );
    expect(roundTrip.due.getTime()).toBe(card.due.getTime());
    expect(roundTrip.last_review).toBeInstanceOf(Date);
    expect(roundTrip.stability).toBeCloseTo(card.stability, 6);
    expect(roundTrip.state).toBe(card.state);
  });

  it('沒複習過的卡片沒有 last_review，往返後仍然沒有', () => {
    const stored = serializeCard(newCard(AT));
    expect(stored.last_review).toBeUndefined();
    expect(deserializeCard(stored).last_review).toBeUndefined();
  });

  it('序列化後的 due 是字串，不是 Date', () => {
    expect(typeof serializeCard(newCard(AT)).due).toBe('string');
  });
});

describe('排程', () => {
  it('新卡片一建立就是到期的，會出現在今天的佇列', () => {
    expect(isDue(newCard(AT), AT)).toBe(true);
  });

  it('答對後到期日往後推', () => {
    const card = reviewCard(newCard(AT), Rating.Good, AT);
    expect(card.due.getTime()).toBeGreaterThan(AT.getTime());
    expect(card.reps).toBe(1);
  });

  it('答錯會記一次 lapse，且很快就要再複習', () => {
    const learned = reviewCard(reviewCard(newCard(AT), Rating.Easy, AT), Rating.Easy,
      new Date(AT.getTime() + 5 * 86_400_000));
    const failed = reviewCard(learned, Rating.Again,
      new Date(AT.getTime() + 30 * 86_400_000));
    expect(failed.lapses).toBeGreaterThan(learned.lapses);
  });

  it('Easy 排得比 Good 遠', () => {
    const good = reviewCard(newCard(AT), Rating.Good, AT);
    const easy = reviewCard(newCard(AT), Rating.Easy, AT);
    expect(easy.due.getTime()).toBeGreaterThanOrEqual(good.due.getTime());
  });

  it('擋掉 Rating.Manual —— 那不是使用者能給的評分', () => {
    expect(() => reviewCard(newCard(AT), Rating.Manual, AT)).toThrow('Manual');
  });

  it('到期佇列只收到期的卡，且最久沒複習的排前面', () => {
    const soon: Card = { ...newCard(AT), due: new Date(AT.getTime() - 2 * 86_400_000) };
    const older: Card = { ...newCard(AT), due: new Date(AT.getTime() - 9 * 86_400_000) };
    const future: Card = { ...newCard(AT), due: new Date(AT.getTime() + 5 * 86_400_000) };
    const queue = dueCards(
      [{ id: 'soon', card: soon }, { id: 'future', card: future }, { id: 'older', card: older }],
      AT,
    );
    expect(queue.map((q) => q.id)).toEqual(['older', 'soon']);
  });
});

describe('掌握度星等', () => {
  const withStability = (stability: number, reps = 3): Card =>
    ({ ...newCard(AT), stability, reps, state: State.Review });

  it('沒複習過的卡片是 0 星，不受初始 stability 影響', () => {
    expect(stabilityToStars({ ...newCard(AT), stability: 40, reps: 0 })).toBe(0);
  });

  it('隨 stability 遞增', () => {
    expect(stabilityToStars(withStability(0.5))).toBe(0);
    expect(stabilityToStars(withStability(2))).toBe(1);
    expect(stabilityToStars(withStability(5))).toBe(2);
    expect(stabilityToStars(withStability(14))).toBe(3);
    expect(stabilityToStars(withStability(40))).toBe(4);
    expect(stabilityToStars(withStability(120))).toBe(5);
  });

  it('永遠落在 0–5 之間', () => {
    for (const s of [0, 0.1, 1, 3, 7, 21, 60, 500, 10_000]) {
      const stars = stabilityToStars(withStability(s));
      expect(stars).toBeGreaterThanOrEqual(0);
      expect(stars).toBeLessThanOrEqual(5);
    }
  });
});

describe('答題結果轉評分', () => {
  it('答錯是 Again', () => {
    expect(ratingFor(false)).toBe(Rating.Again);
  });
  it('答對是 Good，猶豫過的話是 Hard', () => {
    expect(ratingFor(true)).toBe(Rating.Good);
    expect(ratingFor(true, { hesitant: true })).toBe(Rating.Hard);
  });
});
