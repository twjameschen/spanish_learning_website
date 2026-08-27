import { CircleHelp, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n';
import type { Regional } from '@/content/schema';

/**
 * 區域用法標記。規格 §7 要求：不是百分之百確定的用法要顯示「待母語者確認」，
 * 而不是假裝所有區域資訊都同樣可靠。
 */
export function RegionalNote({ regional }: { regional: Regional }) {
  const { L } = useT();
  return (
    <div className="rounded-2xl border border-secondary-300/60 bg-secondary-50 p-3 dark:border-secondary-800 dark:bg-secondary-900/30">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">
          <MapPin aria-hidden="true" />
          {regional.region}
        </Badge>
        {regional.needsVerify ? <NeedsVerifyBadge /> : null}
      </div>
      <p className="text-sm leading-relaxed text-body">{L(regional.note)}</p>
    </div>
  );
}

export function NeedsVerifyBadge() {
  const { t } = useT();
  return (
    <Badge variant="accent" title={t('needsVerifyHint')}>
      <CircleHelp aria-hidden="true" />
      {t('needsVerify')}
    </Badge>
  );
}
