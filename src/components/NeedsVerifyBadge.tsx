import { CircleHelp, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Regional } from '@/content/schema';

/**
 * 區域用法標記。規格 §7 要求：不是百分之百確定的用法要顯示「待母語者確認」，
 * 而不是假裝所有區域資訊都同樣可靠。
 */
export function RegionalNote({ regional }: { regional: Regional }) {
  return (
    <div className="rounded-2xl border border-secondary-300/60 bg-secondary-50 p-3 dark:border-secondary-800 dark:bg-secondary-900/30">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">
          <MapPin aria-hidden="true" />
          {regional.region}
        </Badge>
        {regional.needsVerify ? <NeedsVerifyBadge /> : null}
      </div>
      <p className="text-sm leading-relaxed text-body">{regional.note}</p>
    </div>
  );
}

export function NeedsVerifyBadge() {
  return (
    <Badge
      variant="accent"
      title="這條區域用法我沒有百分之百把握，建議找母語者確認後再當定論使用。"
    >
      <CircleHelp aria-hidden="true" />
      待母語者確認
    </Badge>
  );
}
