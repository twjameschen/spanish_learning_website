import { useMemo } from 'react';
import {
  CalendarDays, TrendingUp, Radar as RadarIcon, ListChecks, Target, Save,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { XpChart, PosRadar, TypeAccuracy } from '@/components/dashboard/Charts';
import { WeakestWords } from '@/components/dashboard/WeakestWords';
import { BackupControls } from '@/components/BackupControls';
import { overview } from '@/lib/dashboard';
import { useProgressStore } from '@/store/useProgressStore';
import { useT } from '@/i18n';
import type { UIKey } from '@/i18n';
import type { ReactNode } from 'react';

function Section({
  icon, titleKey, descKey, children,
}: { icon: ReactNode; titleKey: UIKey; descKey?: UIKey; children: ReactNode }) {
  const { t } = useT();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-secondary-500 text-ink-900">
            {icon}
          </span>
          <CardTitle>{t(titleKey)}</CardTitle>
        </div>
        {descKey ? <CardDescription>{t(descKey)}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useT();
  const dailyStats = useProgressStore((s) => s.dailyStats);
  const cards = useProgressStore((s) => s.cards);
  const stats = useMemo(() => overview(dailyStats, cards), [dailyStats, cards]);

  const tiles: { key: UIKey; value: string }[] = [
    { key: 'overviewDays', value: String(stats.activeDays) },
    { key: 'overviewAnswered', value: String(stats.totalAnswered) },
    { key: 'overviewAccuracy', value: `${Math.round(stats.accuracy * 100)}%` },
    { key: 'overviewMinutes', value: String(stats.minutes) },
    { key: 'overviewWordsSeen', value: String(stats.wordsSeen) },
    { key: 'overviewWordsMastered', value: String(stats.wordsMastered) },
  ];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-body">{t('dashboardTitle')}</h1>
        <p className="text-sm text-muted">{t('dashboardDesc')}</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.key} className="rounded-2xl bg-surface px-4 py-3 shadow-soft">
            <p className="font-mono text-2xl font-extrabold tabular-nums text-body">{tile.value}</p>
            <p className="text-xs font-semibold text-muted">{t(tile.key)}</p>
          </li>
        ))}
      </ul>

      <Section icon={<CalendarDays aria-hidden="true" className="size-[18px]" />} titleKey="heatmapTitle">
        <Heatmap />
      </Section>

      <Section
        icon={<TrendingUp aria-hidden="true" className="size-[18px]" />}
        titleKey="xpChartTitle"
        descKey="xpChartDesc"
      >
        <XpChart />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          icon={<RadarIcon aria-hidden="true" className="size-[18px]" />}
          titleKey="radarTitle"
          descKey="radarDesc"
        >
          <PosRadar />
        </Section>
        <Section
          icon={<Target aria-hidden="true" className="size-[18px]" />}
          titleKey="typeAccuracyTitle"
          descKey="typeAccuracyDesc"
        >
          <TypeAccuracy />
        </Section>
      </div>

      <Section
        icon={<ListChecks aria-hidden="true" className="size-[18px]" />}
        titleKey="weakestTitle"
        descKey="weakestDesc"
      >
        <WeakestWords />
      </Section>

      <Section
        icon={<Save aria-hidden="true" className="size-[18px]" />}
        titleKey="backupTitle"
        descKey="backupDesc"
      >
        <BackupControls />
      </Section>
    </div>
  );
}
