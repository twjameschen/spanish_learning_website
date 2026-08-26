import { cn } from '@/lib/utils';

/**
 * 空狀態／載入狀態插畫。全部自己畫 inline SVG，不外連圖片（離線要求）。
 * currentColor 讓它自動跟著主題色走。
 */

/** 載入中：轉動的羅盤 */
export function CompassLoading({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="載入中" className={cn('size-24', className)}>
      <circle cx="48" cy="48" r="38" className="fill-accent-100 dark:fill-ink-800" />
      <circle
        cx="48"
        cy="48"
        r="38"
        className="fill-none stroke-primary-400"
        strokeWidth="4"
        strokeDasharray="12 8"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 48 48"
          to="360 48 48"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      <g>
        <path d="M48 24 L56 48 L48 44 L40 48 Z" className="fill-primary-500" />
        <path d="M48 72 L40 48 L48 52 L56 48 Z" className="fill-secondary-500" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 48 48; 40 48 48; -25 48 48; 12 48 48; 0 48 48"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </g>
      <circle cx="48" cy="48" r="4" className="fill-ink-700 dark:fill-ink-100" />
    </svg>
  );
}

/** 空狀態：一頂草帽 + 一片葉子，語氣輕鬆 */
export function EmptyHat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 110" role="img" aria-label="沒有東西" className={cn('h-28', className)}>
      <ellipse cx="70" cy="92" rx="46" ry="7" className="fill-ink-200/60 dark:fill-ink-700/50" />
      <path
        d="M18 74 Q70 96 122 74 Q118 66 70 68 Q22 66 18 74 Z"
        className="fill-accent-400"
      />
      <path
        d="M40 70 Q42 30 70 28 Q98 30 100 70 Q70 78 40 70 Z"
        className="fill-accent-500"
      />
      <path d="M40 60 Q70 68 100 60 L100 66 Q70 74 40 66 Z" className="fill-primary-500" />
      <path
        d="M112 40 Q126 30 130 44 Q124 56 110 50 Z"
        className="fill-secondary-500"
      />
      <path d="M112 46 L130 42" className="stroke-secondary-700" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** 錯誤／找不到：斷掉的路標 */
export function BrokenSignpost({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="出了點問題" className={cn('h-28', className)}>
      <ellipse cx="60" cy="106" rx="34" ry="6" className="fill-ink-200/60 dark:fill-ink-700/50" />
      <rect x="55" y="42" width="10" height="62" rx="4" className="fill-ink-400" />
      <g transform="rotate(-8 60 52)">
        <rect x="16" y="42" width="66" height="20" rx="6" className="fill-primary-500" />
        <path d="M82 42 L96 52 L82 62 Z" className="fill-primary-500" />
      </g>
      <g transform="rotate(7 60 76)">
        <rect x="38" y="68" width="60" height="18" rx="6" className="fill-secondary-500" />
        <path d="M38 68 L24 77 L38 86 Z" className="fill-secondary-500" />
      </g>
    </svg>
  );
}

/** 通用空狀態容器 */
export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon ?? <EmptyHat />}
      <div className="space-y-1">
        <p className="text-base font-extrabold text-body">{title}</p>
        {hint ? <p className="max-w-sm text-sm leading-relaxed text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
