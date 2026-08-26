import { useEffect, useState } from 'react';
import { Database, HardDrive, CircuitBoard, Sparkles, Camera } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BackupControls } from '@/components/BackupControls';
import { CompassLoading, EmptyState } from '@/components/decor/Illustrations';
import { AndeanBand, SunMotif } from '@/components/decor/Patterns';
import { useStorageTier } from '@/hooks/useStorageTier';
import { useSettingsStore } from '@/store/useSettingsStore';
import { takeSnapshot, listSnapshots, type SnapshotMeta } from '@/lib/snapshot';
import type { StorageTier } from '@/lib/storage';

const TIER_INFO: Record<StorageTier, { icon: typeof Database; label: string; note: string; variant: 'success' | 'accent' | 'error' }> = {
  idb: {
    icon: Database,
    label: 'IndexedDB',
    note: '進度會自動保存，容量充裕。這是最理想的狀態。',
    variant: 'success',
  },
  local: {
    icon: HardDrive,
    label: 'localStorage',
    note: '進度會自動保存，但容量約 5MB 上限，建議定期匯出備份。',
    variant: 'accent',
  },
  memory: {
    icon: CircuitBoard,
    label: '記憶體（暫存）',
    note: '瀏覽器不讓本頁寫入資料（無痕模式／停用網站資料／配額已滿），關掉分頁進度就沒了，務必手動匯出。',
    variant: 'error',
  },
};

const SWATCHES = [
  { name: 'primary', hex: '#FF8A5B', zh: 'papaya 橘', cls: 'bg-primary-500' },
  { name: 'secondary', hex: '#4ECDC4', zh: '加勒比綠松石', cls: 'bg-secondary-500' },
  { name: 'accent', hex: '#FFD166', zh: '太陽黃', cls: 'bg-accent-500' },
  { name: 'ink', hex: '#2D3047', zh: '深藍灰', cls: 'bg-ink-700' },
  { name: 'success', hex: '#7BC96F', zh: '正確綠', cls: 'bg-success-500' },
  { name: 'error', hex: '#F26D6D', zh: '錯誤紅', cls: 'bg-error-500' },
];

export default function App() {
  const tier = useStorageTier();
  const hydrated = useSettingsStore((s) => s.hydrated);
  const dailyGoal = useSettingsStore((s) => s.dailyGoal);
  const setDailyGoal = useSettingsStore((s) => s.setDailyGoal);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);

  // 每次開站自動拍一份快照，避免瀏覽器清資料時全毀
  useEffect(() => {
    let alive = true;
    void takeSnapshot()
      .then(() => listSnapshots())
      .then((metas) => {
        if (alive) setSnapshots(metas);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (tier === null || !hydrated) {
    return (
      <AppShell>
        <div className="grid place-items-center gap-4 py-24 text-center">
          <CompassLoading />
          <p className="text-sm font-semibold text-muted">正在確認儲存方式…</p>
        </div>
      </AppShell>
    );
  }

  const info = TIER_INFO[tier];
  const TierIcon = info.icon;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-400 to-accent-400 p-6 text-white shadow-lift sm:p-9">
          <SunMotif className="absolute -right-10 -top-10 size-64 text-white/25" />
          <div className="relative space-y-3">
            <Badge variant="accent" className="bg-white/25 text-white">
              <Sparkles aria-hidden="true" />
              Phase 1 · 專案骨架
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              ¡Bienvenido al camino!
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/90 sm:text-base">
              從台北出發，經邁阿密轉機，抵達基多、昆卡，最後到加拉巴哥。
              這條路上的西班牙文全部是拉丁美洲用法 —— 沒有 vosotros，沒有 /θ/。
            </p>
            <div className="max-w-sm pt-2">
              <div className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-white/90">
                <span>骨架完成度</span>
                <span>Phase 1 / 7</span>
              </div>
              <Progress value={100 / 7} className="bg-white/25" />
            </div>
          </div>
        </section>

        {/* 儲存層診斷 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>儲存方式</CardTitle>
              <Badge variant={info.variant}>
                <TierIcon aria-hidden="true" />
                {info.label}
              </Badge>
            </div>
            <CardDescription>{info.note}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                三層降級順序
              </p>
              <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {(['idb', 'local', 'memory'] as const).map((t, i) => (
                  <li key={t} className="flex items-center gap-2">
                    {i > 0 ? <span className="text-muted">→</span> : null}
                    <span
                      className={
                        t === tier
                          ? 'rounded-2xl bg-primary-500 px-3 py-1 text-white shadow-soft'
                          : 'rounded-2xl bg-surface px-3 py-1 text-muted'
                      }
                    >
                      {TIER_INFO[t].label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <BackupControls />
          </CardContent>
        </Card>

        {/* 自動快照 */}
        <Card>
          <CardHeader>
            <CardTitle>自動快照</CardTitle>
            <CardDescription>
              每次開站自動存一份，每天一份、保留最近 3 天。瀏覽器誤清資料時可以救回來。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <EmptyState
                title="還沒有任何快照"
                hint="這是正常的 —— 目前還沒有學習進度可以快照。開始練習之後，每天開站都會自動存一份。"
              />
            ) : (
              <ul className="space-y-2">
                {snapshots.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3"
                  >
                    <Camera aria-hidden="true" className="size-4 text-secondary-600" />
                    <span className="font-mono text-sm font-semibold text-body">{s.day}</span>
                    <span className="ml-auto text-xs text-muted">{s.entries} 筆資料</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 設計語言檢查（給 Phase 1 驗收用） */}
        <Card className="overflow-hidden">
          <AndeanBand className="text-primary-500/50" />
          <CardHeader>
            <CardTitle>設計語言</CardTitle>
            <CardDescription>
              色票、圓角、陰影、按鈕互動的基準。切換右上角主題按鈕可檢查深色模式。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SWATCHES.map((s) => (
                <div key={s.name} className="space-y-1.5">
                  <div className={`h-14 rounded-2xl shadow-soft ${s.cls}`} />
                  <p className="text-xs font-bold text-body">{s.zh}</p>
                  <p className="font-mono text-[11px] text-muted">{s.hex}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="primary">主要按鈕</Button>
              <Button variant="secondary">次要</Button>
              <Button variant="accent">強調</Button>
              <Button variant="outline">外框</Button>
              <Button variant="ghost">幽靈</Button>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                每日目標（設定會存進儲存層，重整後應保持）
              </p>
              <div className="flex gap-2">
                {([10, 20, 30] as const).map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant={dailyGoal === g ? 'primary' : 'outline'}
                    onClick={() => setDailyGoal(g)}
                  >
                    {g} 分鐘
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
