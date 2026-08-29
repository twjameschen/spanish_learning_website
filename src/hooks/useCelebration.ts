import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '@/store/useProgressStore';
import { levelForXp } from '@/lib/xp';
import { buildAchievementSnapshot } from '@/lib/snapshotProgress';
import { evaluateAchievements, type Achievement } from '@/lib/achievements';
import { celebrateLevelUp, celebrateAchievement } from '@/lib/celebrate';
import { useSessionStore } from '@/store/useSessionStore';

export interface Celebration {
  kind: 'level' | 'achievement';
  level?: number;
  achievement?: Achievement;
}

/**
 * 監看 XP 與成就，在跨過門檻時排入慶祝佇列。
 *
 * 兩個刻意的時機控制：
 * 1. 只在**補水完成後**才開始比對 —— 否則從儲存層載回進度的那一刻，
 *    XP 從 0 跳到 5000，會誤判成剛升了 20 級並炸出一堆彩帶。
 * 2. **作答中不吐出項目**，彩帶也跟著延後（彩帶在真正顯示的那一刻才放，
 *    不是偵測到的那一刻），否則畫面上會出現「沒有視窗的彩帶」。
 */
export function useCelebration(): { current: Celebration | null; dismiss: () => void } {
  const hydrated = useProgressStore((s) => s.hydrated);
  const totalXp = useProgressStore((s) => s.totalXp);
  const cards = useProgressStore((s) => s.cards);
  const lessons = useProgressStore((s) => s.lessons);
  const seen = useProgressStore((s) => s.seenAchievements);
  const markSeen = useProgressStore((s) => s.markAchievementsSeen);

  const answering = useSessionStore((s) => s.answering);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const baseline = useRef<{ level: number } | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const level = levelForXp(totalXp);
    if (baseline.current === null) {
      // 第一次（補水後）只記錄基準，不慶祝
      baseline.current = { level };
      return;
    }

    const events: Celebration[] = [];
    if (level > baseline.current.level) events.push({ kind: 'level', level });
    baseline.current = { level };

    const fresh = evaluateAchievements(buildAchievementSnapshot())
      .filter((a) => a.unlocked && !seen.includes(a.achievement.id))
      .map((a) => a.achievement);
    if (fresh.length > 0) {
      markSeen(fresh.map((a) => a.id));
      for (const achievement of fresh) events.push({ kind: 'achievement', achievement });
    }

    if (events.length > 0) setQueue((q) => [...q, ...events]);
    // seen 會在 markSeen 後變動，刻意不放進依賴避免無限迴圈
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, totalXp, cards, lessons]);

  // 作答中先不顯示；佇列照樣累積，等這一輪結束再一次播完
  const current = answering ? null : (queue[0] ?? null);

  // 彩帶跟著「真正顯示出來」走，一個 current 只放一次
  useEffect(() => {
    if (!current) return;
    if (current.kind === 'level') celebrateLevelUp();
    else celebrateAchievement();
  }, [current]);

  return {
    current,
    dismiss: () => setQueue((q) => q.slice(1)),
  };
}
