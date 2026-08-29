import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCelebration } from './useCelebration';
import { useProgressStore, exerciseKey } from '@/store/useProgressStore';
import { useSessionStore } from '@/store/useSessionStore';
import { initStorage, __resetStorageForTests } from '@/lib/storage';

// 彩帶會碰 canvas，jsdom 沒有；這裡只在意「有沒有被呼叫」
vi.mock('@/lib/celebrate', () => ({
  celebrateLevelUp: vi.fn(),
  celebrateAchievement: vi.fn(),
}));
import { celebrateLevelUp, celebrateAchievement } from '@/lib/celebrate';

/**
 * 慶祝的時機。
 *
 * 這裡守的是一條規格底線：**學習者一定要看得到答題回饋**。
 * Phase 3 修過「按 Enter 跳過回饋」的 bug，慶祝視窗是同一個坑的另一條路徑
 * —— 全螢幕 modal 蓋在回饋上，等於沒看到解釋。
 */
const answer = (id: string, xp: number) =>
  useProgressStore.getState().recordAnswer({
    key: exerciseKey(id), exerciseType: 'mcq', correct: true, ms: 2000, xp,
  });

describe('useCelebration 的時機', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    useProgressStore.getState().reset();
    useProgressStore.setState({ hydrated: true });
    useSessionStore.setState({ answering: false });
    vi.mocked(celebrateLevelUp).mockClear();
    vi.mocked(celebrateAchievement).mockClear();
  });

  it('補水後的第一次比對只建立基準，不慶祝', async () => {
    const { result } = renderHook(() => useCelebration());
    expect(result.current.current).toBeNull();
    expect(celebrateLevelUp).not.toHaveBeenCalled();
    expect(celebrateAchievement).not.toHaveBeenCalled();
  });

  it('作答後解鎖成就會跳出慶祝', async () => {
    const { result } = renderHook(() => useCelebration());
    act(() => { answer('a', 10); });
    await waitFor(() => expect(result.current.current).not.toBeNull());
    expect(result.current.current?.kind).toBe('achievement');
    expect(result.current.current?.achievement?.id).toBe('first-answer');
    expect(celebrateAchievement).toHaveBeenCalled();
  });

  it('作答中不吐出慶祝，彩帶也不放', async () => {
    useSessionStore.setState({ answering: true });
    const { result } = renderHook(() => useCelebration());
    act(() => { answer('a', 10); });

    // 給 effect 跑完的機會，仍然不該有東西
    await act(async () => { await Promise.resolve(); });
    expect(result.current.current).toBeNull();
    expect(celebrateAchievement).not.toHaveBeenCalled();
  });

  it('一輪結束後把壓著的慶祝放出來（不會掉）', async () => {
    useSessionStore.setState({ answering: true });
    const { result } = renderHook(() => useCelebration());
    act(() => { answer('a', 10); });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.current).toBeNull();

    act(() => { useSessionStore.setState({ answering: false }); });
    await waitFor(() => expect(result.current.current).not.toBeNull());
    expect(celebrateAchievement).toHaveBeenCalled();
  });

  it('dismiss 之後換下一個，全部看完才變 null', async () => {
    const { result } = renderHook(() => useCelebration());
    // 一次給足 XP，讓等級與多個成就同時跨門檻
    act(() => { answer('a', 600); });
    await waitFor(() => expect(result.current.current).not.toBeNull());

    const seen: string[] = [];
    for (let i = 0; i < 10 && result.current.current; i += 1) {
      const c = result.current.current;
      seen.push(c.kind === 'level' ? `level-${c.level}` : c.achievement!.id);
      act(() => { result.current.dismiss(); });
    }
    expect(seen.length).toBeGreaterThan(1);
    expect(seen).toContain('first-answer');
    expect(seen).toContain('xp-500');
    expect(result.current.current).toBeNull();
  });

  it('同一個成就不會重複慶祝（seenAchievements 有記住）', async () => {
    const { result } = renderHook(() => useCelebration());
    act(() => { answer('a', 10); });
    await waitFor(() => expect(result.current.current).not.toBeNull());
    act(() => { result.current.dismiss(); });

    act(() => { answer('b', 10); });
    await act(async () => { await Promise.resolve(); });
    // 第二題不會再解鎖 first-answer
    expect(result.current.current?.achievement?.id).not.toBe('first-answer');
  });
});
