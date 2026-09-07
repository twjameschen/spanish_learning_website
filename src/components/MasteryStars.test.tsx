import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MasteryStars } from './MasteryStars';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MAX_STARS } from '@/lib/fsrs';

/**
 * 熟練度星等。
 *
 * `starsForWord()` 與 `stabilityToStars()` 從 Phase 3／4 就寫好也測過，
 * 兩個成就（精通 20 個字、精通 100 個字）就是在數這個，
 * 但學習者在任何一張卡上都看不到自己某個字幾星。
 */

describe('熟練度星等', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
  });

  /*
   * 0 星整個不顯示。728 張卡裡絕大多數一開始都是 0 星，
   * 每張都掛五顆空星只會變成視覺雜訊。
   */
  it('0 星完全不顯示，不留空殼', () => {
    const { container } = render(<MasteryStars stars={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('學過的字印出五格，填滿到目前的星數', () => {
    const { container } = render(<MasteryStars stars={3} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(MAX_STARS);

    const filled = [...svgs].filter((s) => s.getAttribute('class')?.includes('fill-accent-500'));
    expect(filled).toHaveLength(3);
  });

  it('滿星時五格全滿', () => {
    const { container } = render(<MasteryStars stars={MAX_STARS} />);
    const filled = [...container.querySelectorAll('svg')].filter((s) =>
      s.getAttribute('class')?.includes('fill-accent-500'),
    );
    expect(filled).toHaveLength(MAX_STARS);
  });

  it('有可讀的標籤 —— 星星不能只是裝飾', () => {
    render(<MasteryStars stars={2} />);
    expect(screen.getByLabelText(`熟練度 2 / ${MAX_STARS} 星`)).toBeTruthy();
  });

  it('切成英文時標籤跟著換', () => {
    useSettingsStore.setState({ locale: 'en' });
    render(<MasteryStars stars={2} />);
    expect(screen.getByLabelText(`Mastery 2 of ${MAX_STARS}`)).toBeTruthy();
  });
});
