/**
 * speechSynthesis 包裝。
 *
 * 規格要求 lang 設 `es-MX` / `es-419`，並且**偵測不到 es 語音時要隱藏發音按鈕並提示**。
 * 所以這裡的重點不是「唸出來」，而是「誠實回報能不能唸」——
 * 一個按了沒反應的按鈕比沒有按鈕更糟。
 *
 * 偏好順序：es-MX（拉美中性腔的常見代表）→ es-419（拉美泛用碼）
 * → 任何其他 es-*（含 es-ES，總比沒有好）。
 */

/** 依偏好排序的語言標籤 */
const PREFERRED = ['es-mx', 'es-419', 'es-us', 'es-co', 'es-ar', 'es-cl', 'es-pe'];

export interface SpeechStatus {
  available: boolean;
  /** 實際會用到的語音名稱，供設定頁顯示 */
  voiceName?: string;
  lang?: string;
}

function synth(): SpeechSynthesis | null {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    return window.speechSynthesis;
  } catch {
    return null;
  }
}

/** 挑一個西班牙文語音。找不到回傳 null。 */
export function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  let voices: SpeechSynthesisVoice[];
  try {
    voices = s.getVoices();
  } catch {
    return null;
  }
  const spanish = voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
  if (spanish.length === 0) return null;

  for (const tag of PREFERRED) {
    const hit = spanish.find((v) => v.lang.toLowerCase().replace('_', '-') === tag);
    if (hit) return hit;
  }
  // 沒有拉美語音就退而求其次用任何西班牙文語音
  return spanish[0] ?? null;
}

export function speechStatus(): SpeechStatus {
  const voice = pickSpanishVoice();
  if (!voice) return { available: false };
  return { available: true, voiceName: voice.name, lang: voice.lang };
}

/**
 * 語音清單在部分瀏覽器是非同步載入的，第一次呼叫 getVoices() 可能回空陣列。
 * 這個函式等到清單就緒（或逾時）才回報，避免一開始就誤判成「沒有語音」。
 */
export function whenVoicesReady(timeoutMs = 2000): Promise<SpeechStatus> {
  const s = synth();
  if (!s) return Promise.resolve({ available: false });
  if (pickSpanishVoice()) return Promise.resolve(speechStatus());

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      s.removeEventListener('voiceschanged', done);
      clearTimeout(timer);
      resolve(speechStatus());
    };
    const timer = setTimeout(done, timeoutMs);
    s.addEventListener('voiceschanged', done);
  });
}

export interface SpeakOptions {
  /** 0.1–2，預設 0.9（初學者聽稍慢一點比較好跟） */
  rate?: number;
}

/** 唸一句西班牙文。回傳 false 代表環境不支援，呼叫端應據此隱藏按鈕。 */
export function speak(text: string, opts: SpeakOptions = {}): boolean {
  const s = synth();
  const voice = pickSpanishVoice();
  if (!s || !voice) return false;
  try {
    // 連按時先取消前一句，否則會排隊唸個沒完
    s.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = Math.min(2, Math.max(0.1, opts.rate ?? 0.9));
    s.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    /* 沒有語音合成時無事可做 */
  }
}
