import { cn } from '@/lib/utils';

/**
 * 拉丁美洲風幾何裝飾。全部是 inline SVG，不外連圖片，
 * 一律低透明度當背景，不搶內容。
 */

/** 安地斯風三角帶（毯子紋樣） */
export function AndeanBand({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 16"
      preserveAspectRatio="none"
      className={cn('h-4 w-full', className)}
    >
      <defs>
        <pattern id="andean" width="24" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 16 L6 4 L12 16 Z" fill="currentColor" opacity=".55" />
          <path d="M12 16 L18 4 L24 16 Z" fill="currentColor" opacity=".28" />
          <rect x="0" y="0" width="24" height="2.5" fill="currentColor" opacity=".4" />
        </pattern>
      </defs>
      <rect width="120" height="16" fill="url(#andean)" />
    </svg>
  );
}

/** 波浪（加勒比海／太平洋） */
export function Waves({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 40"
      preserveAspectRatio="none"
      className={cn('h-10 w-full', className)}
    >
      <path
        d="M0 24 C 20 10, 40 10, 60 24 S 100 38, 120 24 S 160 10, 180 24 S 220 38, 240 24 V40 H0 Z"
        fill="currentColor"
        opacity=".22"
      />
      <path
        d="M0 30 C 20 18, 40 18, 60 30 S 100 42, 120 30 S 160 18, 180 30 S 220 42, 240 30 V40 H0 Z"
        fill="currentColor"
        opacity=".14"
      />
    </svg>
  );
}

/** 印加太陽紋（Inti） */
export function SunMotif({ className }: { className?: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg aria-hidden="true" viewBox="-60 -60 120 120" className={cn('size-40', className)}>
      {rays.map((deg) => (
        <path
          key={deg}
          d="M0 -34 L4.5 -46 L0 -56 L-4.5 -46 Z"
          fill="currentColor"
          opacity=".5"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle r="28" fill="none" stroke="currentColor" strokeWidth="3" opacity=".45" />
      <circle r="20" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".3" />
      <circle r="9" fill="currentColor" opacity=".35" />
    </svg>
  );
}

/** 整頁背景：右上太陽紋 + 左下波浪 + 細三角帶，固定不隨捲動 */
export function PageDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <SunMotif className="absolute -right-16 -top-16 size-[22rem] text-accent-500/45 dark:text-accent-500/20 animate-float" />
      <Waves className="absolute inset-x-0 bottom-0 h-32 text-secondary-500/35 dark:text-secondary-500/15" />
      <AndeanBand className="absolute inset-x-0 top-0 h-3 text-primary-500/30 dark:text-primary-500/20" />
      <div className="absolute -left-24 top-1/3 size-72 rounded-full bg-primary-300/20 blur-3xl dark:bg-primary-700/10" />
      <div className="absolute -right-20 bottom-1/4 size-64 rounded-full bg-secondary-300/20 blur-3xl dark:bg-secondary-700/10" />
    </div>
  );
}
