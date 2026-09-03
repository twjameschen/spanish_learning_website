import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  pickSpanishVoice, speechStatus, speak, whenVoicesReady, __resetSpeechForTests,
} from './speech';

/**
 * jsdom 沒有 speechSynthesis，所以預設路徑就是「不支援」——
 * 剛好驗證規格要求的降級行為。另外用 stub 模擬各種語音清單。
 */

const voice = (name: string, lang: string) =>
  ({ name, lang, default: false, localService: true, voiceURI: name }) as SpeechSynthesisVoice;

function stubVoices(list: SpeechSynthesisVoice[]) {
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => list,
    cancel: vi.fn(),
    speak: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    voice: SpeechSynthesisVoice | null = null;
    lang = '';
    rate = 1;
    constructor(t: string) { this.text = t; }
  });
}

describe('沒有語音合成時的降級', () => {
  // 偵測結果是共用的，換掉語音環境時一定要跟著清，否則會拿到上一個環境的答案
  afterEach(() => { vi.unstubAllGlobals(); __resetSpeechForTests(); });

  it('環境完全不支援時回報不可用', () => {
    expect(speechStatus().available).toBe(false);
    expect(pickSpanishVoice()).toBeNull();
  });

  it('speak() 回傳 false 讓 UI 知道要隱藏按鈕', () => {
    expect(speak('Hola')).toBe(false);
  });

  it('有語音合成但沒有任何西班牙文語音時也回報不可用', () => {
    stubVoices([voice('Microsoft Zira', 'en-US'), voice('Google 國語', 'zh-TW')]);
    expect(speechStatus().available).toBe(false);
    expect(speak('Hola')).toBe(false);
  });

  it('getVoices 直接丟例外時不會讓 app 掛掉', () => {
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => { throw new Error('blocked'); },
    });
    expect(speechStatus().available).toBe(false);
  });
});

describe('語音挑選偏好', () => {
  // 偵測結果是共用的，換掉語音環境時一定要跟著清，否則會拿到上一個環境的答案
  afterEach(() => { vi.unstubAllGlobals(); __resetSpeechForTests(); });

  it('優先選 es-MX', () => {
    stubVoices([
      voice('Helena', 'es-ES'),
      voice('Sabina', 'es-MX'),
      voice('Zira', 'en-US'),
    ]);
    expect(pickSpanishVoice()?.lang).toBe('es-MX');
  });

  it('沒有 es-MX 時退到 es-419', () => {
    stubVoices([voice('Helena', 'es-ES'), voice('LatAm', 'es-419')]);
    expect(pickSpanishVoice()?.lang).toBe('es-419');
  });

  it('只有西班牙腔時仍然可用 —— 有聲音比沒聲音好', () => {
    stubVoices([voice('Helena', 'es-ES')]);
    const status = speechStatus();
    expect(status.available).toBe(true);
    expect(status.lang).toBe('es-ES');
  });

  it('底線寫法的語言標籤也認得（es_MX）', () => {
    stubVoices([voice('X', 'es_MX'), voice('Helena', 'es-ES')]);
    expect(pickSpanishVoice()?.name).toBe('X');
  });
});

describe('唸出來', () => {
  beforeEach(() => { __resetSpeechForTests(); stubVoices([voice('Sabina', 'es-MX')]); });
  // 偵測結果是共用的，換掉語音環境時一定要跟著清，否則會拿到上一個環境的答案
  afterEach(() => { vi.unstubAllGlobals(); __resetSpeechForTests(); });

  it('有語音時回報成功並實際呼叫 speak', () => {
    expect(speak('¿Dónde está el baño?')).toBe(true);
    expect(speechSynthesis.speak).toHaveBeenCalled();
  });

  it('每次唸之前先取消前一句，避免排隊唸個沒完', () => {
    speak('uno');
    speak('dos');
    expect(speechSynthesis.cancel).toHaveBeenCalledTimes(2);
  });

  it('語速限制在合理範圍內', () => {
    const utterances: { rate: number }[] = [];
    (speechSynthesis.speak as ReturnType<typeof vi.fn>).mockImplementation(
      (u: { rate: number }) => utterances.push(u),
    );
    speak('a', { rate: 99 });
    speak('b', { rate: -5 });
    expect(utterances[0]?.rate).toBe(2);
    expect(utterances[1]?.rate).toBe(0.1);
  });
});

describe('等待語音清單載入', () => {
  // 偵測結果是共用的，換掉語音環境時一定要跟著清，否則會拿到上一個環境的答案
  afterEach(() => { vi.unstubAllGlobals(); __resetSpeechForTests(); });

  it('已經有語音時立刻回報，不必等', async () => {
    stubVoices([voice('Sabina', 'es-MX')]);
    await expect(whenVoicesReady()).resolves.toMatchObject({ available: true });
  });

  it('完全不支援時立刻回報不可用', async () => {
    await expect(whenVoicesReady()).resolves.toEqual({ available: false });
  });

  it('問幾次都只掛一個監聽器 —— 單字表一頁會問一千多次', () => {
    /*
     * 單字表一次渲染 728 張卡片、每張兩顆喇叭，每顆都會問一次有沒有語音。
     * 沒有共用的話就是 1456 個 voiceschanged 監聽器加 1456 個 timeout
     * 掛在同一個物件上，語音就緒時再觸發 1456 次更新。
     */
    const add = vi.fn();
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [],            // 還沒就緒
      cancel: vi.fn(), speak: vi.fn(),
      addEventListener: add, removeEventListener: vi.fn(),
    });
    for (let i = 0; i < 5; i += 1) void whenVoicesReady(50);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('第二次問直接拿同一份結果', async () => {
    stubVoices([voice('Sabina', 'es-MX')]);
    const first = await whenVoicesReady();
    const second = await whenVoicesReady();
    expect(second).toBe(first);
  });

  it('__resetSpeechForTests 之後會重新偵測', async () => {
    stubVoices([voice('Sabina', 'es-MX')]);
    expect((await whenVoicesReady()).available).toBe(true);

    vi.unstubAllGlobals();
    __resetSpeechForTests();
    expect((await whenVoicesReady()).available).toBe(false);
  });
});
