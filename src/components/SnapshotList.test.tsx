import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SnapshotList } from './SnapshotList';
import { storage, initStorage, __resetStorageForTests } from '@/lib/storage';
import * as snapshotLib from '@/lib/snapshot';
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

  /*
   * 快照存不進去的時候不可以假裝「還沒有快照」。
   *
   * takeSnapshot 會把所有 key 完整複製一份並保留 3 份，在 localStorage 那一層
   * （約 5MB）很有機會 QuotaExceededError。以前這條鏈沒有 .catch，
   * 一 reject 就無聲中斷、清單留在空的，畫面顯示「還沒有任何快照」——
   * 在備份最重要的那一層，使用者被告知的是「還沒開始存」。
   */
  it('拍快照失敗時說的是「存不起來」，不是「還沒有快照」', async () => {
    const spy = vi.spyOn(snapshotLib, 'takeSnapshot')
      .mockRejectedValue(new DOMException('quota', 'QuotaExceededError'));
    try {
      render(<SnapshotList />);
      await screen.findByText(/快照存不起來/);
      expect(screen.queryByText(/還沒有任何快照/)).toBeNull();
      // 而且要告訴他還能怎麼辦
      expect(screen.getByText(/匯出進度/)).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it('還原進行中按鈕會停用，連按兩下只會還原一次', async () => {
    await seedSnapshot();
    let resolveIt: (v: string[]) => void = () => {};
    const spy = vi.spyOn(snapshotLib, 'restoreSnapshot').mockImplementation(
      () => new Promise<string[]>((res) => { resolveIt = res; }),
    );
    try {
      render(<SnapshotList />);
      await screen.findByText(day);
      fireEvent.click(inRow().getByRole('button', { name: /^還原$/ }));

      const confirm = inRow().getByRole('button', { name: /確定還原|還原中/ });
      fireEvent.click(confirm);

      // 處理中：按鈕停用，再點也不會再送一次
      await waitFor(() => {
        expect((inRow().getByRole('button', { name: /還原中/ }) as HTMLButtonElement).disabled)
          .toBe(true);
      });
      fireEvent.click(inRow().getByRole('button', { name: /還原中/ }));
      expect(spy).toHaveBeenCalledTimes(1);

      resolveIt([PROGRESS_KEY]);
      await screen.findByText(/已還原/);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
