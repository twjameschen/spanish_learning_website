import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Listening } from './Listening';
import { useSettingsStore } from '@/store/useSettingsStore';
import { whenVoicesReady, speechStatusIfKnown } from '@/lib/speech';
import type { Exercise } from '@/content/schema';
import type { ExerciseOutcome } from './types';

/**
 * 聽力題的求助階梯。
 *
 * 這一組測的是規格外但實際會卡死人的路徑：完全聽不出來的時候，
 * 送出鍵是停用的（沒打字不能送），沒有出口就只能亂打一通讓它判錯。
 */

const ex: Extract<Exercise, { type: 'listening' }> = {
  id: 'x-1',
  type: 'listening',
  difficulty: 'medium',
  explain: { zh: '通用解釋', en: 'general explanation' },
  es: 'Se necesita permiso para acampar.',
  gloss: { zh: '露營需要許可。', en: 'You need a permit to camp.' },
  accept: ['Se necesita permiso para acampar'],
};

/** jsdom 沒有 speechSynthesis，要有語音的路徑得自己塞一個進去 */
function stubSpanishVoice() {
  const v = { name: 'Sabina', lang: 'es-MX', default: false, localService: true, voiceURI: 'Sabina' };
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [v as SpeechSynthesisVoice],
    cancel: vi.fn(),
    speak: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string; voice: SpeechSynthesisVoice | null = null; lang = ''; rate = 1;
    constructor(t: string) { this.text = t; }
  });
}

function setup(answered = false) {
  const outcomes: ExerciseOutcome[] = [];
  render(
    <Listening
      exercise={ex}
      answered={answered}
      outcome={null}
      onAnswer={(o) => outcomes.push(o)}
    />,
  );
  return outcomes;
}

const type = (text: string) => {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('聽力題的求助階梯', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('有語音時兩顆求助按鈕都在', async () => {
    stubSpanishVoice();
    setup();
    await waitFor(() => screen.getByRole('button', { name: /看中文意思/ }));
    expect(screen.getByRole('button', { name: /直接看答案/ })).toBeTruthy();
    // 還沒按之前不該先把翻譯洩漏出來
    expect(screen.queryByText(ex.gloss.zh)).toBeNull();
  });

  it('按了「看中文意思」翻譯才出現，而且還是要自己拼', async () => {
    stubSpanishVoice();
    setup();
    await waitFor(() => screen.getByRole('button', { name: /看中文意思/ }));
    fireEvent.click(screen.getByRole('button', { name: /看中文意思/ }));

    expect(screen.getByText(ex.gloss.zh)).toBeTruthy();
    // 西文答案不能跟著出現，否則第一階就等於直接給答案
    expect(screen.queryByText(ex.es)).toBeNull();
    // 輸入框仍然可以打字
    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(false);
    // 按過之後這一顆就不再出現
    expect(screen.queryByRole('button', { name: /看中文意思/ })).toBeNull();
  });

  it('看過意思才答對的，記成「不夠熟」', async () => {
    stubSpanishVoice();
    const outcomes = setup();
    await waitFor(() => screen.getByRole('button', { name: /看中文意思/ }));
    fireEvent.click(screen.getByRole('button', { name: /看中文意思/ }));
    type('Se necesita permiso para acampar');

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.correct).toBe(true);
    expect(outcomes[0]!.hesitant).toBe(true);
    expect(outcomes[0]!.note).toBeTruthy();
  });

  it('沒看提示就答對的不該被降級 —— 否則等於每題都記 Hard', async () => {
    stubSpanishVoice();
    const outcomes = setup();
    await waitFor(() => screen.getByRole('button', { name: /看中文意思/ }));
    type('Se necesita permiso para acampar');

    expect(outcomes[0]!.correct).toBe(true);
    expect(outcomes[0]!.hesitant).toBeFalsy();
  });

  it('按「直接看答案」算答錯，並且說明為什麼', async () => {
    stubSpanishVoice();
    const outcomes = setup();
    await waitFor(() => screen.getByRole('button', { name: /直接看答案/ }));
    fireEvent.click(screen.getByRole('button', { name: /直接看答案/ }));

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.correct).toBe(false);
    expect(outcomes[0]!.note).toBeTruthy();
  });

  it('作答之後求助按鈕就不見了 —— 不能答完再回頭按', async () => {
    stubSpanishVoice();
    setup(true);
    await waitFor(() => screen.getByText(ex.es));
    expect(screen.queryByRole('button', { name: /看中文意思/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /直接看答案/ })).toBeNull();
  });

  it('沒有語音時不顯示求助 —— 整句本來就印在畫面上，沒東西可以揭曉', async () => {
    // 不 stub：jsdom 沒有 speechSynthesis，走的就是抄寫降級路徑。
    // 語音偵測是非同步的，要等它回報完才斷言，否則 React 會抱怨 act()
    setup();
    await waitFor(() => screen.getByText(ex.es));
    expect(screen.queryByRole('button', { name: /看中文意思/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /直接看答案/ })).toBeNull();
  });
});

/*
 * 打到一半的字不可以被清掉。
 *
 * 以前重設 effect 掛的是 [exercise.id, exercise.es, speech.available]，
 * 而 speech.available 在同一題進行中會翻轉兩次：
 * 語音偵測是非同步的（最多等 2 秒），設定裡的語音開關也會即時改它。
 * 兩條路徑都會執行 setValue('') 與 setHinted(false) ——
 * 使用者打好的字整個不見，換來的提示也被收回。
 */
describe('聽力題不能吃掉打到一半的字', () => {
  beforeEach(() => {
    useSettingsStore.setState({ speechEnabled: true });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('語音偵測晚一步完成時，已經打的字還在，而且不會被切走正在抄的句子', async () => {
    stubSpanishVoice();
    setup();

    // 冷開機：偵測還沒完成，畫面是「照著抄」，使用者已經開始抄
    expect(screen.getByText(ex.es)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Se necesita' } });

    // 讓偵測真的跑完（不是等逾時）
    await act(async () => { await whenVoicesReady(); });
    expect(speechStatusIfKnown()?.available).toBe(true);

    // 已經投入的東西一個都不能少：打的字還在，正在抄的句子也還在
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Se necesita');
    expect(screen.getByText(ex.es)).toBeTruthy();
  });

  it('還沒開始打字的話，語音一就緒就升級成聽力題', async () => {
    stubSpanishVoice();
    setup();
    expect(screen.getByText(ex.es)).toBeTruthy();     // 一開始是抄寫模式

    await act(async () => { await whenVoicesReady(); });

    // 沒投入任何東西，所以跟著升級：求助按鈕出現、句子收起來
    await waitFor(() => screen.getByRole('button', { name: /看中文意思/ }));
    expect(screen.queryByText(ex.es)).toBeNull();
  });

  it('打到一半去設定切語音開關，字不會被清掉、提示也不會被收回', async () => {
    stubSpanishVoice();
    setup();
    await waitFor(() => screen.getByRole('button', { name: /看中文意思/ }));

    fireEvent.click(screen.getByRole('button', { name: /看中文意思/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Se necesita permiso' } });
    expect(screen.getByText(ex.gloss.zh)).toBeTruthy();

    // 使用者跑去設定把語音關掉
    act(() => { useSettingsStore.setState({ speechEnabled: false }); });

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Se necesita permiso');
    expect(screen.getByText(ex.gloss.zh)).toBeTruthy();
  });

  it('離開這一題就停止發音，不會蓋在下一個畫面上', async () => {
    stubSpanishVoice();
    const { unmount } = render(
      <Listening exercise={ex} answered={false} outcome={null} onAnswer={() => {}} />,
    );
    await waitFor(() => screen.getByRole('button', { name: /看中文意思/ }));

    const cancel = (globalThis.speechSynthesis as unknown as { cancel: ReturnType<typeof vi.fn> })
      .cancel;
    const before = cancel.mock.calls.length;
    unmount();
    expect(cancel.mock.calls.length).toBeGreaterThan(before);
  });
});
