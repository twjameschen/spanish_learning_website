import { useEffect, useState } from 'react';
import { BookMarked, GraduationCap, Sparkles, Camera, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BackupControls } from '@/components/BackupControls';
import { EmptyState } from '@/components/decor/Illustrations';
import { SunMotif } from '@/components/decor/Patterns';
import { useStorageTier } from '@/hooks/useStorageTier';
import { takeSnapshot, listSnapshots, type SnapshotMeta } from '@/lib/snapshot';
import { hrefFor } from '@/lib/router';
import { allWords, allLessons, journey } from '@/content';
import type { StorageTier } from '@/lib/storage';

const TIER_TEXT: Record<StorageTier, { label: string; note: string; variant: 'success' | 'accent' | 'error' }> = {
  idb: { label: 'IndexedDB', note: '進度會自動保存，容量充裕。', variant: 'success' },
  local: { label: 'localStorage', note: '會自動保存，但約 5MB 上限，建議定期匯出。', variant: 'accent' },
  memory: { label: '記憶體（暫存）', note: '瀏覽器不讓本頁寫入資料，關掉分頁就沒了，務必手動匯出。', variant: 'error' },
};

export function HomePage() {
  const tier = useStorageTier();
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);

  useEffect(() => {
    let alive = true;
    void takeSnapshot()
      .then(() => listSnapshots())
      .then((m) => { if (alive) setSnapshots(m); });
    return () => { alive = false; };
  }, []);

  const openStops = journey.filter((s) => s.lessonIds.length > 0);
  const exerciseCount = allLessons.reduce((n, l) => n + l.exercises.length, 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-400 to-accent-400 p-6 text-white shadow-lift sm:p-9">
        <SunMotif className="absolute -right-10 -top-10 size-64 text-white/25" />
        <div className="relative space-y-3">
          <Badge variant="accent" className="bg-white/25 text-white">
            <Sparkles aria-hidden="true" />
            Phase 2 · A0 內容
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
              <span>進度</span>
              <span>Phase 2 / 7</span>
            </div>
            <Progress value={(2 / 7) * 100} className="bg-white/25" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <a href={hrefFor({ name: 'vocab' })} className="group">
          <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary-500 text-ink-900">
                  <BookMarked aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>單字表</CardTitle>
                <ArrowRight aria-hidden="true" className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                {allWords.length} 個 A0 單字，全部附例句與中譯。名詞一律標 el / la。
              </CardDescription>
            </CardHeader>
          </Card>
        </a>

        <a href={hrefFor({ name: 'lessons' })} className="group">
          <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary-500 text-white">
                  <GraduationCap aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>課程</CardTitle>
                <ArrowRight aria-hidden="true" className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                {allLessons.length} 課、{exerciseCount} 題。每一課都標出中文母語者會踩的坑。
              </CardDescription>
            </CardHeader>
          </Card>
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>旅程</CardTitle>
          <CardDescription>
            五個城市，五組課程。目前開放 {openStops.length} 站。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {journey.map((stop) => {
              const open = stop.lessonIds.length > 0;
              return (
                <li
                  key={stop.city}
                  className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3"
                >
                  <MapPin
                    aria-hidden="true"
                    className={open ? 'size-4 shrink-0 text-primary-500' : 'size-4 shrink-0 text-muted/50'}
                  />
                  <span className={open ? 'font-bold text-body' : 'font-bold text-muted/70'}>
                    {stop.nameZh}
                  </span>
                  <span lang="es" className="text-sm text-muted">{stop.nameEs}</span>
                  <span className="ml-auto text-xs font-semibold text-muted">
                    {open ? `${stop.lessonIds.length} 課` : '尚未開放'}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>儲存方式</CardTitle>
            {tier ? <Badge variant={TIER_TEXT[tier].variant}>{TIER_TEXT[tier].label}</Badge> : null}
          </div>
          <CardDescription>{tier ? TIER_TEXT[tier].note : '偵測中…'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BackupControls />
          {snapshots.length === 0 ? (
            <EmptyState
              title="還沒有任何快照"
              hint="開始練習之後，每天開站都會自動存一份，保留最近 3 天。"
            />
          ) : (
            <ul className="space-y-2">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5">
                  <Camera aria-hidden="true" className="size-4 text-secondary-600" />
                  <span className="font-mono text-sm font-semibold text-body">{s.day}</span>
                  <span className="ml-auto text-xs text-muted">{s.entries} 筆資料</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
