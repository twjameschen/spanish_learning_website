import { Volume2 } from 'lucide-react';
import { speak } from '@/lib/speech';
import { useSpeech } from '@/hooks/useSpeech';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * 唸一段西班牙文的小喇叭。
 *
 * `speak()` 本來只接在聽力題上，單字表的 728 個字、它們的例句、
 * 課文裡的 648 句規則例句通通不能聽 —— 對一個語言 app 來說那是漏接。
 *
 * 偵測不到西班牙文語音（或使用者在設定裡關掉語音）時**整顆不顯示**。
 * 一個按了沒反應的按鈕比沒有按鈕更糟 —— 這條規則整個 app 都守著。
 */
export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const { t } = useT();
  const speech = useSpeech();
  if (!speech.available) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        // 這顆常常包在連結或卡片裡，點它只該發音，不該順便導頁
        e.preventDefault();
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`${t('playAudio')}：${text}`}
      title={t('playAudio')}
      className={cn(
        'inline-grid size-7 shrink-0 place-items-center rounded-xl align-middle',
        'text-secondary-700 transition-colors hover:bg-secondary-100 hover:text-secondary-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/40',
        'dark:text-secondary-200 dark:hover:bg-secondary-900/50 dark:hover:text-secondary-100',
        className,
      )}
    >
      <Volume2 aria-hidden="true" className="size-4" />
    </button>
  );
}
