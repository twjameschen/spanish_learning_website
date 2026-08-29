import { useEffect, useState } from 'react';
import { whenVoicesReady, type SpeechStatus } from '@/lib/speech';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 語音可用性。語音清單在部分瀏覽器是非同步載入的，
 * 所以第一次 render 先當作「還在確認」，等 whenVoicesReady 回報再更新。
 * 使用者也可以在設定裡關掉語音，關掉時一律視為不可用。
 */
export function useSpeech(): SpeechStatus {
  const enabled = useSettingsStore((s) => s.speechEnabled);
  const [status, setStatus] = useState<SpeechStatus>({ available: false });

  useEffect(() => {
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
