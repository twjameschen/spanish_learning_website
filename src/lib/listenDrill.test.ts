import { describe, it, expect } from 'vitest';
import {
  buildListenDrill, canListenDrill, listenDrillScopes, listenPoolSize, listenPoolSizeFor,
  isListenDrillId, scopeFromDrillId, listenDrillId, listenPool,
  SESSION_SIZE, LISTEN_DRILL_PREFIX,
} from './listenDrill';
import { allLessons, journey } from '@/content';

const DAY = new Date('2026-03-14T08:00:00Z');
const scopes = listenDrillScopes();
const everySession = () => scopes.map((s) => ({ scope: s, items: buildListenDrill(s, DAY) }));
/** 內容類的斷言掃整個題庫，不能只掃某一天抽出來的那 60 題 */
const wholePool = () => [{ scope: 'pool', items: listenPool() }];

describe('連續聽寫的題庫', () => {
  it('湊得出來的句子夠多 —— 每天 12 句要能撐一段時間', () => {
    expect(listenPoolSize()).toBeGreaterThanOrEqual(300);
  });

  it('底下的內容斷言掃的是整個題庫，不是某一天抽出來的那幾題', () => {
    // 只驗抽樣的話，題庫裡有問題的句子要等到剛好被抽中那天才會爆
    expect(wholePool()[0]!.items).toHaveLength(listenPoolSize());
    expect(wholePool()[0]!.items.length).toBeGreaterThan(scopes.length * SESSION_SIZE);
  });

  it('台北以外的每一段都出得了題', () => {
    // 台北那六課教的是字母、發音、重音、seseo、招呼語與數字 —— 例句多半是
    // 單字與片語，湊不滿一場整句聽寫。與其硬湊，不如那一段就不給入口。
    for (const stop of journey.filter((s) => s.city !== 'taipei')) {
      expect(canListenDrill(stop.city), `${stop.city} 只有 ${listenPoolSizeFor(stop.city)} 句`)
        .toBe(true);
    }
    expect(canListenDrill('taipei')).toBe(false);
    expect(scopes).toEqual(['all', 'miami', 'quito', 'cuenca', 'galapagos']);
  });

  it('都是完整的句子，沒有變化表或片語混進來', () => {
    // hablar → hablando、el libro / los libros 這種是展示用的，不是句子
    for (const { scope, items } of wholePool()) {
      for (const ex of items) {
        if (ex.type !== 'listening') throw new Error('should be listening');
        expect(ex.es, `${scope}/${ex.id}`).not.toMatch(/[→/]/);
        expect(ex.es.trim(), `${scope}/${ex.id}`).toMatch(/([.!?]$)|(^[¿¡])/);
        expect(ex.es.trim().split(/\s+/).length, `${scope}/${ex.id}`).toBeGreaterThanOrEqual(4);
      }
    }
  });
});

describe('產生出來的題目本身答得出來', () => {
  it('一場剛好 12 題', () => {
    for (const { scope, items } of everySession()) expect(items, scope).toHaveLength(SESSION_SIZE);
  });

  it('句子含 ñ 時，accept 一定有無 ñ 的版本', () => {
    // ñ 刻意不被折成 n（año ≠ ano），沒有西文鍵盤的人打不出來
    const bad: string[] = [];
    for (const { scope, items } of wholePool()) {
      for (const ex of items) {
        if (ex.type !== 'listening' || !/ñ/i.test(ex.es)) continue;
        if (!ex.accept.some((a) => !/ñ/i.test(a))) bad.push(`${scope}/${ex.id}: ${ex.es}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('句子中間有 ? 或 ! 時，accept 一定有去掉它的版本', () => {
    // normalizeAnswer 只去掉**句尾**的標點；¿El libro? Lo leo cada noche.
    // 中間那個問號留著，而聽的人沒辦法從聲音判斷要不要打
    const bad: string[] = [];
    for (const { scope, items } of wholePool()) {
      for (const ex of items) {
        if (ex.type !== 'listening') continue;
        if (!/[?!].*\S/.test(ex.es.trim())) continue;
        if (!ex.accept.some((a) => !/[?!]/.test(a))) bad.push(`${scope}/${ex.id}: ${ex.es}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('題庫裡沒有對話或省略號 —— 那些打不出來', () => {
    // Gracias. — De nada. 是兩個人各講一句，中間的破折號聽不出來也打不出來
    for (const { scope, items } of wholePool()) {
      for (const ex of items) {
        if (ex.type !== 'listening') continue;
        expect(ex.es, `${scope}/${ex.id}`).not.toMatch(/[—–…"“”]/);
      }
    }
  });

  it('句子含逗號時，accept 一定有無逗號的版本', () => {
    // 逗號不在 normalizeAnswer 的去除清單裡，聽寫時漏打逗號很正常
    const bad: string[] = [];
    for (const { scope, items } of wholePool()) {
      for (const ex of items) {
        if (ex.type !== 'listening' || !ex.es.includes(',')) continue;
        if (!ex.accept.some((a) => !a.includes(','))) bad.push(`${scope}/${ex.id}: ${ex.es}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('每一題都有西文、兩種語言的翻譯與說明', () => {
    for (const { scope, items } of wholePool()) {
      for (const ex of items) {
        if (ex.type !== 'listening') continue;
        expect(ex.es.trim().length, `${scope}/${ex.id}`).toBeGreaterThan(0);
        expect(ex.gloss.zh.trim().length, `${scope}/${ex.id}`).toBeGreaterThan(0);
        expect(ex.gloss.en.trim().length, `${scope}/${ex.id}`).toBeGreaterThan(0);
        expect(ex.explain.zh.trim().length, `${scope}/${ex.id}`).toBeGreaterThan(0);
        expect(ex.explain.en.trim().length, `${scope}/${ex.id}`).toBeGreaterThan(0);
        expect(ex.accept.length, `${scope}/${ex.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('英文說明裡不能有中文字', () => {
    for (const { scope, items } of wholePool()) {
      for (const ex of items) expect(ex.explain.en, `${scope}/${ex.id}`).not.toMatch(/[一-鿿]/);
    }
  });

  it('一場裡沒有重複的句子，id 也不重複', () => {
    for (const { scope, items } of everySession()) {
      expect(new Set(items.map((e) => e.id)).size, scope).toBe(items.length);
      const es = items.map((e) => (e.type === 'listening' ? e.es : ''));
      expect(new Set(es).size, scope).toBe(items.length);
    }
  });

  it('同一句話在課內有手寫版本時，題庫用手寫的那一版', () => {
    // 手寫版本有針對發音寫的說明，id 也對得回課內那一題（FSRS 才記在同一張卡上）
    const written = new Map(
      allLessons.flatMap((l) => l.exercises)
        .filter((e) => e.type === 'listening')
        .map((e) => [e.es, e.id] as const),
    );
    const bad: string[] = [];
    for (const ex of listenPool()) {
      if (ex.type !== 'listening') continue;
      const id = written.get(ex.es);
      if (id && ex.id !== id) bad.push(`${ex.es}：用了 ${ex.id}，應該用 ${id}`);
    }
    expect(bad).toEqual([]);
  });

  it('產生的 id 不會撞到課文裡真正的題目', () => {
    // 撞到的話 FSRS 卡片會記到別題上；沿用課內聽力題的 id 是刻意的，那本來就是同一題
    const real = new Map(allLessons.flatMap((l) => l.exercises.map((e) => [e.id, e] as const)));
    for (const { scope, items } of everySession()) {
      for (const ex of items) {
        const hit = real.get(ex.id);
        if (hit) expect(hit.type, `${scope}/${ex.id}`).toBe('listening');
      }
    }
  });
});

describe('每天換一批，但同一天固定', () => {
  it('同一天同一個範圍抽到的是同一組', () => {
    expect(buildListenDrill('quito', DAY)).toEqual(buildListenDrill('quito', DAY));
  });

  it('隔天換一批', () => {
    const a = buildListenDrill('quito', DAY).map((e) => e.id);
    const b = buildListenDrill('quito', new Date('2026-03-15T08:00:00Z')).map((e) => e.id);
    expect(a).not.toEqual(b);
  });

  it('不同的段落練到的是不同的句子', () => {
    const a = buildListenDrill('quito', DAY).map((e) => e.id);
    const b = buildListenDrill('cuenca', DAY).map((e) => e.id);
    expect(a).not.toEqual(b);
  });

  it('句子不夠的範圍回傳空陣列，不會硬湊', () => {
    expect(canListenDrill('這個城市不存在')).toBe(false);
    expect(buildListenDrill('這個城市不存在', DAY)).toEqual([]);
  });
});

describe('drill id 的來回轉換', () => {
  it('認得出自己的 id，也不會誤認別的 drill', () => {
    expect(isListenDrillId(LISTEN_DRILL_PREFIX)).toBe(true);
    expect(isListenDrillId('listen-quito')).toBe(true);
    expect(isListenDrillId('gender-comida')).toBe(false);
    expect(isListenDrillId('all')).toBe(false);
    expect(isListenDrillId('a0-genero')).toBe(false);
  });

  it('id 與範圍互轉得回來', () => {
    for (const scope of scopes) expect(scopeFromDrillId(listenDrillId(scope))).toBe(scope);
  });
});
