import confetti from 'canvas-confetti';

/**
 * 慶祝特效。
 *
 * canvas-confetti 會自己建 canvas 疊在頁面上，不需要額外 DOM。
 * 尊重 prefers-reduced-motion —— 對動態敏感的使用者，滿螢幕彩帶不是驚喜是困擾。
 */
function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const PALETTE = ['#FF8A5B', '#4ECDC4', '#FFD166', '#7BC96F'];

/** 升級：全螢幕兩側噴發 */
export function celebrateLevelUp(): void {
  if (reducedMotion()) return;
  const end = Date.now() + 900;
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors: PALETTE,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors: PALETTE,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** 解鎖成就：小一點的單次噴發 */
export function celebrateAchievement(): void {
  if (reducedMotion()) return;
  confetti({
    particleCount: 70,
    spread: 60,
    origin: { y: 0.65 },
    colors: PALETTE,
    disableForReducedMotion: true,
  });
}
