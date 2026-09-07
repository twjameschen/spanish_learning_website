import { memo } from 'react';
import { Star } from 'lucide-react';
import { MAX_STARS } from '@/lib/fsrs';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * 一個字的熟練度，0–5 星。
 *
 * 這在此之前是**資料有、畫面沒有**：`starsForWord()` 與 `stabilityToStars()`
 * 都寫好也測過，兩個成就（精通 20 個字、精通 100 個字）就是數這個，
 * 但學習者在任何一張卡上都看不到自己某個字到底幾星。
 *
 * **0 星整個不顯示**。728 張卡裡絕大多數一開始都是 0 星，
 * 每張都掛五顆空星只會變成視覺雜訊，而且會讓「還沒學過」跟
 * 「學過但忘光了」看起來一樣 —— 前者不該被責備。
 */
export const MasteryStars = memo(function MasteryStars({
  stars,
  className,
}: {
  stars: number;
  className?: string;
}) {
  const { t } = useT();
  if (stars <= 0) return null;

  return (
    <span
      className={cn('inline-flex items-center gap-px align-middle', className)}
      title={t('masteryStars', { n: stars, max: MAX_STARS })}
      aria-label={t('masteryStars', { n: stars, max: MAX_STARS })}
      role="img"
    >
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(
            'size-3',
            i < stars
              ? 'fill-accent-500 text-accent-500'
              // 已經學過才會走到這裡，所以剩下的空星是「還能再進步」，
              // 顏色要淡到不搶戲但看得出總共有五格
              : 'fill-none text-line',
          )}
        />
      ))}
    </span>
  );
});
