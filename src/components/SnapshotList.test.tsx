import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SnapshotList } from './SnapshotList';
import { storage, initStorage, __resetStorageForTests } from '@/lib/storage';
import { SNAPSHOT_PREFIX } from '@/lib/snapshot';
import { useProgressStore, PROGRESS_KEY } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 快照還原。
 *
 * 這一組的價值在於：`restoreSnapshot()` 從 Phase 6 就寫好也有測試，
 * 但**沒有任何畫面呼叫它** —— 首頁只把快照列成三行唯讀的字。
 * 於是「每天自動存一份」這個安全網出事時根本用不到。
 * 斷言要同時蓋到「按得到」「不會手滑就還原」與「還原後 store 立刻是新的」。
 */

const day = '2026-08-31';
const snapId = `${SNAPSHOT_PREFIX}${day}`;

/** 一份 partialize 之後的空進度，用來手工組快照 */
const progressWith = (totalXp: number) =>
  JSON.stringify({
    state: {
      cards: {}, dailyStats: {}, recentLog: [], lessons: {}, totalXp,
      streak: { current: 0, best: 0, freezes: 0, lastActiveDay: null, lastFreezeGrantWeek: null },
      seenAchievements: [],
    },
    version: 0,
  });

/** 放一份「那一天 XP 是 500」的快照進儲存層 */
async function seedSnapshot(): Promise<void> {
  await storage.set(snapId, {
    savedAt: `${day}T10:00:00.000Z`,
    data: { [PROGRESS_KEY]: progressWith(500) },
  });
}

/**
 * 掛載時會順手拍一份「今天」的快照（跟搬過來之前的首頁一樣），
 * 所以清單裡不只有 seed 的那一列 —— 斷言一律鎖在 seed 那一列上。
 */
const row = () =>
  screen.getAllByRole('listitem').find((li) => li.textContent?.includes(day))!;
const inRow = () => within(row());

/** persist 的寫入是非同步的，等它跑完才動儲存層 */
const flushPersist = () => new Promise((r) => setTimeout(r, 0));

describe('快照還原', () => {
  beforeEach(async () => {
    __resetStorageForTests();
    localStorage.clear();
    await initStorage();
    useProgressStore.getState().reset();
    useSettingsStore.setState({ locale: 'zh' });
  });

  it('有快照時每一列都有「還原」', async () => {
    await seedSnapshot();
    render(<SnapshotList />);
    await screen.findByText(day);
    expect(inRow().getByRole('button', { name: /還原/ })).toBeTruthy();
  });

  it('第一次點只出現確認，不會真的還原', async () => {
    await seedSnapshot();
    useProgressStore.setState({ totalXp: 7 });
    render(<SnapshotList />);
    await screen.findByText(day);

    fireEvent.click(inRow().getByRole('button', { name: /還原/ }));

    expect(row().textContent).toContain('確定要還原到');
    expect(row().textContent).toContain(day);
    // 真正的還原還沒發生
    expect(useProgressStore.getState().totalXp).toBe(7);
  });

  it('確認之後才還原，而且 store 立刻反映', async () => {
    await seedSnapshot();
    useProgressStore.setState({ totalXp: 7 });
    render(<SnapshotList />);
    await screen.findByText(day);

    fireEvent.click(inRow().getByRole('button', { name: /^還原$/ }));
    fireEvent.click(inRow().getByRole('button', { name: /確定還原/ }));

    // 不必重新整理
    await waitFor(() => expect(useProgressStore.getState().totalXp).toBe(500));
    await screen.findByText(/已還原 1 筆資料/);
  });

  it('取消之後回到原本的樣子，什麼都沒動', async () => {
    await seedSnapshot();
    useProgressStore.setState({ totalXp: 7 });
    render(<SnapshotList />);
    await screen.findByText(day);

    fireEvent.click(inRow().getByRole('button', { name: /^還原$/ }));
    fireEvent.click(inRow().getByRole('button', { name: /取消/ }));

    expect(row().textContent).not.toContain('確定要還原到');
    expect(inRow().getByRole('button', { name: /^還原$/ })).toBeTruthy();
    expect(useProgressStore.getState().totalXp).toBe(7);
    // 儲存層裡的快照也還在，沒有被消耗掉
    expect(await storage.get(snapId)).toBeTruthy();
  });

  it('沒有快照時顯示空狀態，不會出現還原按鈕', async () => {
    // 全新使用者：儲存層真的是空的，掛載時也不該留下一份空快照
    await flushPersist();
    await storage.clear();
    render(<SnapshotList />);
    await screen.findByText(/還沒有任何快照/);
    expect(screen.queryByRole('button', { name: /還原/ })).toBeNull();
  });
});
