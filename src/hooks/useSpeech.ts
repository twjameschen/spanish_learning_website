import { useEffect, useState } from 'react';
import { whenVoicesReady, speechStatusIfKnown, type SpeechStatus } from '@/lib/speech';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 語音可用性。語音清單在部分瀏覽器是非同步載入的，
 * 所以第一次 render 先當作「還在確認」，等 whenVoicesReady 回報再更新。
 * 使用者也可以在設定裡關掉語音，關掉時一律視為不可用。
 *
 * 偵測結果由 `speech.ts` 共用一份，所以同一頁掛幾百顆喇叭也只問一次。
 * 已經問出來的話 `speechStatusIfKnown()` 會直接給答案 ——
 * 後掛載的元件不必再等一次，也不會先閃一下「沒有語音」再冒出來。
 */
export function useSpeech(): SpeechStatus {
  const enabled = useSettingsStore((s) => s.speechEnabled);
  const [status, setStatus] = useState<SpeechStatus>(() => speechStatusIfKnown() ?? { available: false });

  useEffect(() => {
    /*
     * 已經問出答案了就直接同步過來，**不能只是 return**。
     *
     * 一頁上千顆喇叭是同一輪 render 掛上去的：那時快取還是空的，
     * 所以每一顆的初始狀態都是「沒有語音」。接著第一顆的 effect 一跑，
     * whenVoicesReady() 就同步把快取填好了 —— 後面 1455 顆的 effect
     * 看到快取有值就跳過訂閱，於是它們永遠停在「沒有語音」，整頁只有一顆喇叭。
     */
    const known = speechStatusIfKnown();
    if (known) {
      setStatus(known);   // 同一個物件參考，值沒變時 React 會自己略過重繪
      return;
    }
    let alive = true;
    void whenVoicesReady().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return enabled ? status : { available: false };
}
