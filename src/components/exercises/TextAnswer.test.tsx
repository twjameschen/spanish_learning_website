import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranslateExercise, ConjugationExercise } from './TextAnswer';
import { answerSkeleton } from '@/lib/skeleton';
import type { Exercise } from '@/content/schema';
import type { ExerciseOutcome } from './types';

/**
 * 翻譯題與變位填空的求助階梯。
 *
 * 跟聽力題同樣的死路：送出鍵在沒打字時是停用的，想不出來就整題卡死。
 * 第一階給的是答案的骨架（不是意思 —— 意思本來就在畫面上）。
 */

const translate: Extract<Exercise, { type: 'translate' }> = {
  id: 't-1',
  type: 'translate',
  difficulty: 'medium',
  explain: { zh: '通用解釋', en: 'general explanation' },
  prompt: { zh: '把「我希望你明天來。」翻成西班牙文', en: 'Translate: I want you to come tomorrow.' },
  accept: ['Quiero que vengas mañana', 'Quiero que vengas manana'],
  canonical: 'Quiero que vengas mañana.',
};

/** 重音齊全的句子，用來驗「漏重音」與「只少句號」這兩條分得開 */
const accented: Extract<Exercise, { type: 'translate' }> = {
  id: 't-2',
  type: 'translate',
  difficulty: 'easy',
  explain: { zh: '通用解釋', en: 'general explanation' },
  prompt: { zh: '把「咖啡很燙。」翻成西班牙文', en: 'Translate: the coffee is hot.' },
  accept: ['El café está caliente'],
  canonical: 'El café está caliente.',
};

const conjugation: Extract<Exercise, { type: 'conjugation' }> = {
  id: 'c-1',
  type: 'conjugation',
  difficulty: 'medium',
  explain: { zh: '通用解釋', en: 'general explanation' },
  verbId: 'tener',
  person: 'yo',
  tense: 'preteritoIndefinido',
  answer: 'tuve',
};

function setupTranslate(answered = false) {
  const outcomes: ExerciseOutcome[] = [];
  render(
    <TranslateExercise
      exercise={translate}
      answered={answered}
      outcome={null}
      onAnswer={(o) => outcomes.push(o)}
    />,
  );
  return outcomes;
}

const hint = () => fireEvent.click(screen.getByRole('button', { name: /看提示/ }));
const giveUp = () => fireEvent.click(screen.getByRole('button', { name: /直接看答案/ }));
const type = (text: string) => {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('翻譯題的求助階梯', () => {
  it('兩顆求助按鈕一開始就在，而且沒有先洩漏答案', () => {
    setupTranslate();
    expect(screen.getByRole('button', { name: /看提示/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /直接看答案/ })).toBeTruthy();
    expect(screen.queryByText(translate.canonical)).toBeNull();
  });

  it('按了「看提示」出現骨架，而且骨架不是答案', () => {
    setupTranslate();
    hint();
    const skeleton = answerSkeleton(translate.canonical);
    expect(screen.getByText(skeleton)).toBeTruthy();
    expect(skeleton).not.toBe(translate.canonical);
    // 完整答案不能跟著出現
    expect(screen.queryByText(translate.canonical)).toBeNull();
    // 輸入框仍然可以打字
    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(false);
    // 按過之後這一顆就收起來
    expect(screen.queryByRole('button', { name: /看提示/ })).toBeNull();
  });

  it('看過提示才答對的，記成「不夠熟」', () => {
    const outcomes = setupTranslate();
    hint();
    type('Quiero que vengas mañana');
    expect(outcomes[0]!.correct).toBe(true);
    expect(outcomes[0]!.hesitant).toBe(true);
    expect(outcomes[0]!.note).toContain('看過提示');
  });

  it('沒看提示就答對的不該被降級', () => {
    const outcomes = setupTranslate();
    type('Quiero que vengas mañana');
    expect(outcomes[0]!.correct).toBe(true);
    expect(outcomes[0]!.hesitant).toBeFalsy();
    expect(outcomes[0]!.note).toBeUndefined();
  });

  it('看了提示又漏重音 —— 兩件事都要講，不能只留一條', () => {
    // 這是新舊邏輯交會的地方：漏重音本來就會設 hesitant 並帶自己的 note，
    // 只留一條的話使用者會漏掉另一件該修正的事
    const outcomes: ExerciseOutcome[] = [];
    render(
      <TranslateExercise
        exercise={accented}
        answered={false}
        outcome={null}
        onAnswer={(o) => outcomes.push(o)}
      />,
    );
    hint();
    type('El cafe esta caliente');   // café／está 的重音都沒打
    expect(outcomes[0]!.correct).toBe(true);
    expect(outcomes[0]!.hesitant).toBe(true);
    expect(outcomes[0]!.note).toContain('看過提示');
    expect(outcomes[0]!.note).toContain('café está caliente');
  });

  it('只是沒打句號不算重音不完整 —— accept 裡的寫法幾乎都不帶句號', () => {
    // 原本 isAccentImperfect 會把「只差一個句號」判成重音問題，
    // 68 題翻譯裡有 66 題照 accept 打就會被誤報，還跟著降成 FSRS Hard
    const outcomes: ExerciseOutcome[] = [];
    render(
      <TranslateExercise
        exercise={accented}
        answered={false}
        outcome={null}
        onAnswer={(o) => outcomes.push(o)}
      />,
    );
    type('El café está caliente');   // 重音全對，只少了句號
    expect(outcomes[0]!.correct).toBe(true);
    expect(outcomes[0]!.hesitant).toBeFalsy();
    expect(outcomes[0]!.note).toBeUndefined();
  });

  it('按「直接看答案」算答錯，並且說明為什麼', () => {
    const outcomes = setupTranslate();
    giveUp();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.correct).toBe(false);
    expect(outcomes[0]!.note).toBeTruthy();
  });

  it('作答後求助按鈕就不見了 —— 不能答完再回頭按', () => {
    setupTranslate(true);
    expect(screen.queryByRole('button', { name: /看提示/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /直接看答案/ })).toBeNull();
  });
});

describe('變位填空共用同一套求助', () => {
  it('一份實作兩種題型都吃得到', () => {
    const outcomes: ExerciseOutcome[] = [];
    render(
      <ConjugationExercise
        exercise={conjugation}
        answered={false}
        outcome={null}
        onAnswer={(o) => outcomes.push(o)}
      />,
    );
    hint();
    // tuve → t···
    expect(screen.getByText(answerSkeleton(conjugation.answer))).toBeTruthy();
    type('tuve');
    expect(outcomes[0]!.correct).toBe(true);
    expect(outcomes[0]!.hesitant).toBe(true);
  });
});
