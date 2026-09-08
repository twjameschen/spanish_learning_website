import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExercisePlayer } from './ExercisePlayer';
import { useProgressStore } from '@/store/useProgressStore';
import { initStorage, __resetStorageForTests } from '@/lib/storage';
import type { Exercise } from '@/content/schema';

/**
 * ExercisePlayer 的互動測試。
 *
 * 這一層測的是**流程**：答錯要看到解釋、答對要累計 XP、
 * combo 斷掉要歸零、走完要結算。個別題型的判分邏輯在各自的模組測試裡。
 */

const mcq = (id: string, answerIndex: number): Exercise => ({
  id,
  type: 'mcq',
  difficulty: 'easy',
  explain: { zh: `${id} 的通用解釋`, en: `general explanation for ${id}` },
  prompt: { zh: `題目 ${id}`, en: `question ${id}` },
  options: [0, 1, 2, 3].map((i) => ({ zh: `選項${i}`, en: `option${i}` })),
  answerIndex,
  optionExplains: [0, 1, 2, 3].map((i) => ({
    zh: `選項${i}的說明`,
    en: `why option${i}`,
  })),
});

const pick = (i: number) => fireEvent.click(screen.getByText(`選項${i}`));
const next = () => fireEvent.click(screen.getByRole('button', { name: /下一題|完成/ }));

describe('ExercisePlayer', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    useProgressStore.getState().reset();
  });

  it('答錯時同時顯示「所選選項為何錯」與題目通用解釋', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(2);

    expect(screen.getByText('答錯了')).toBeTruthy();
    // 針對選錯的那一個
    expect(screen.getAllByText('選項2的說明').length).toBeGreaterThan(0);
    // 題目本身的解釋
    expect(screen.getByText('q1 的通用解釋')).toBeTruthy();
  });

  it('答錯不會前進，要按下一題才走', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    expect(screen.getByText('1/2')).toBeTruthy();
    pick(3);
    expect(screen.getByText('1/2')).toBeTruthy();
    next();
    expect(screen.getByText('2/2')).toBeTruthy();
  });

  it('答對累計 XP，答錯不加分也不扣分', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0), mcq('q3', 0)]} />);
    pick(0); // 對
    expect(screen.getByText('+10 XP')).toBeTruthy();
    next();
    pick(1); // 錯
    expect(screen.getByText('+10 XP')).toBeTruthy();
  });

  it('連對兩題以上才顯示 combo 標記，答錯就消失', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0), mcq('q3', 0)]} />);
    pick(0);
    expect(screen.queryByText(/連對/)).toBeNull(); // 才 1 連，不顯示
    next();
    pick(0);
    expect(screen.getByText(/連對 2/)).toBeTruthy();
    next();
    pick(1); // 答錯，連擊斷掉
    expect(screen.queryByText(/連對/)).toBeNull();
  });

  it('走完全部題目後顯示結算，正確率算得對', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    pick(0); next();  // 對
    pick(1); next();  // 錯

    expect(screen.getByText('這一輪完成了')).toBeTruthy();
    expect(screen.getByText('答對 1 / 2 題')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('結算後可以重來，計數歸零', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(1); next();
    expect(screen.getByText('這一輪完成了')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /再練一次/ }));
    expect(screen.getByText('1/1')).toBeTruthy();
    expect(screen.queryByText('這一輪完成了')).toBeNull();
  });

  /*
   * 只有一題的練習重來會卡死。
   *
   * 重來時 setIndex(0) 在只有一題的情況下是 no-op，掛在 [index] 的重設
   * effect 不會再跑，outcome 活了下來 —— 題目整個攤開、不能作答，
   * 回饋區又跟著出現一顆「完成」，按下去回到結算。使用者出不去。
   *
   * 每一組陰陽性分類都恰好是一題，所以這條路徑一定會被踩到。
   * 上面那條舊測試用的正好也是一題，卻過關 —— 它只看了 1/1 與結算消失，
   * 從來沒有問過「那一題還能不能作答」。
   */
  it('只有一題時重來，那一題要能重新作答（不是攤開的死題目）', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(1); next();
    fireEvent.click(screen.getByRole('button', { name: /再練一次/ }));

    // 回饋區不該還在 —— 它在的話代表 outcome 沒被清掉
    expect(screen.queryByRole('button', { name: /下一題|完成/ })).toBeNull();
    expect(screen.queryByText('選項1的說明')).toBeNull();

    // 而且真的按得下去，按完又回到「已作答」
    pick(0);
    expect(screen.getByRole('button', { name: /下一題|完成/ })).toBeTruthy();
  });

  it('重來之後再答一次會重新計分，不是沿用上一輪的結果', async () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(1); next();                                   // 第一輪答錯
    fireEvent.click(screen.getByRole('button', { name: /再練一次/ }));
    pick(0); next();                                   // 第二輪答對

    expect(screen.getByText('答對 1 / 1 題')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    await waitFor(() => {
      expect(useProgressStore.getState().recentLog[0]?.correct).toBe(true);
    });
  });

  it('多題的練習重來也一樣回到第一題且可作答', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    pick(0); next(); pick(0); next();
    expect(screen.getByText('這一輪完成了')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /再練一次/ }));
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /下一題|完成/ })).toBeNull();
    pick(0);
    expect(screen.getByRole('button', { name: /下一題|完成/ })).toBeTruthy();
  });

  it('每一題都會寫進進度，答錯的卡片也要排程', async () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    pick(3); next();
    pick(0);

    await waitFor(() => {
      const { cards, dailyStats } = useProgressStore.getState();
      expect(Object.keys(cards).sort()).toEqual(['x:q1', 'x:q2']);
      const today = Object.values(dailyStats)[0]!;
      expect(today.answered).toBe(2);
      expect(today.correct).toBe(1);
    });
  });

  it('作答完成後會呼叫 onFinish 並帶上正確率', () => {
    let result: { accuracy: number; correct: number } | null = null;
    render(
      <ExercisePlayer
        exercises={[mcq('q1', 0), mcq('q2', 0)]}
        onFinish={(r) => { result = r; }}
      />,
    );
    pick(0); next();
    pick(0); next();
    expect(result).not.toBeNull();
    expect(result!.correct).toBe(2);
    expect(result!.accuracy).toBe(1);
  });

  it('同一題不能重複作答', () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
    pick(2);
    pick(0); // 再點正解，不該改變結果
    expect(screen.getByText('答錯了')).toBeTruthy();
    expect(useProgressStore.getState().recentLog).toHaveLength(1);
  });

  /*
   * 對話框開著時的按鍵不可以流到背後的題目。
   *
   * 快捷鍵說明面板上就列著「1～4 選答案」，照著按下去以前會替使用者
   * 回答背後那一題、recordAnswer 執行、FSRS 寫入一次複習、然後跳下一題，
   * 全部發生在他正在讀的面板後面。
   */
  it('有對話框開著時，數字鍵不會替你回答背後那一題', async () => {
    render(<ExercisePlayer exercises={[mcq('q1', 0), mcq('q2', 0)]} />);
    expect(screen.getByText('1/2')).toBeTruthy();

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    try {
      fireEvent.keyDown(document.body, { key: '1' });
      fireEvent.keyDown(document.body, { key: '2' });

      // 沒有作答、沒有前進、沒有寫進記錄
      expect(screen.queryByRole('button', { name: /下一題|完成/ })).toBeNull();
      expect(screen.getByText('1/2')).toBeTruthy();
      expect(useProgressStore.getState().recentLog).toHaveLength(0);
    } finally {
      dialog.remove();
    }

    // 關掉之後照常可用
    fireEvent.keyDown(document.body, { key: '1' });
    expect(screen.getByRole('button', { name: /下一題|完成/ })).toBeTruthy();
  });

  /*
   * 結算之後往哪裡去。
   *
   * 在此之前結算畫面只有「再練一次」與「回到課文」—— 兩條都是回頭路。
   * 練完第 1 課的人，畫面上沒有任何東西告訴他第 2 課是哪一課，
   * 得自己回課程列表翻。
   */
  describe('結算的下一步', () => {
    const finish = () => { pick(0); next(); };

    it('有下一課時給一顆連過去的按鈕，標題就印在上面', () => {
      render(
        <ExercisePlayer
          exercises={[mcq('q1', 0)]}
          nextUp={{ title: '名詞的陰陽性', href: '#/lessons/a0-genero' }}
        />,
      );
      finish();
      const link = screen.getByRole('link', { name: /下一課：名詞的陰陽性/ });
      expect(link.getAttribute('href')).toBe('#/lessons/a0-genero');
    });

    it('沒給下一課就不會多出一顆連不到地方的按鈕', () => {
      render(<ExercisePlayer exercises={[mcq('q1', 0)]} />);
      finish();
      expect(screen.queryByRole('link', { name: /下一課/ })).toBeNull();
    });

    it('最後一課給一句話，不是一顆按不到的按鈕', () => {
      render(<ExercisePlayer exercises={[mcq('q1', 0)]} courseDone />);
      finish();
      expect(screen.queryByRole('link', { name: /下一課/ })).toBeNull();
      expect(screen.getByText(/這是最後一課了/)).toBeTruthy();
    });

    /*
     * 答對不到六成就不要把人往前推 —— 這一輪的內容還沒站穩。
     * 「下一課」仍然在，只是退成次要的，主要動作換成「再練一次」。
     */
    it('答得差的時候主要動作是再練一次，下一課退成次要的', () => {
      render(
        <ExercisePlayer
          exercises={[mcq('q1', 0), mcq('q2', 0)]}
          nextUp={{ title: '名詞的陰陽性', href: '#/lessons/a0-genero' }}
        />,
      );
      pick(2); next(); // 錯
      pick(2); next(); // 錯 → 0%
      expect(screen.getByText('0%')).toBeTruthy();

      const again = screen.getByRole('button', { name: /再練一次/ });
      const nextLink = screen.getByRole('link', { name: /下一課/ });
      expect(again.className).toMatch(/bg-primary-500/);
      expect(nextLink.className).not.toMatch(/bg-primary-500/);
    });

    it('答得好的時候主要動作是下一課', () => {
      render(
        <ExercisePlayer
          exercises={[mcq('q1', 0)]}
          nextUp={{ title: '名詞的陰陽性', href: '#/lessons/a0-genero' }}
        />,
      );
      finish(); // 100%
      expect(screen.getByRole('link', { name: /下一課/ }).className).toMatch(/bg-primary-500/);
      expect(screen.getByRole('button', { name: /再練一次/ }).className).not.toMatch(/bg-primary-500/);
    });
  });
});
