import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { RegionalNote } from './NeedsVerifyBadge';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Regional } from '@/content/schema';

/**
 * 設定面板。
 *
 * 這一組的價值在於：每日目標、語音、未經確認的區域用法這三個設定
 * 在 Phase 10 之前存在資料層卻**沒有任何畫面入口**，
 * 其中「未經確認的區域用法」甚至沒有任何地方在讀。
 * 斷言要同時蓋到「改得動」與「改了真的有作用」。
 */

const open = () => fireEvent.click(screen.getByRole('button', { name: /設定/ }));
const click = (name: RegExp | string) =>
  fireEvent.click(screen.getByRole('button', { name }));

describe('設定面板', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'system', locale: 'zh', dailyGoal: 5,
      speechEnabled: true, showNeedsVerify: true,
    });
  });

  it('每日目標改得動 —— 之前永遠鎖在 5 分鐘', () => {
    render(<SettingsPanel />);
    open();
    click('15 分鐘');
    expect(useSettingsStore.getState().dailyGoal).toBe(15);
  });

  it('語音關得掉 —— 之前沒有任何入口', () => {
    render(<SettingsPanel />);
    open();
    click('關');
    expect(useSettingsStore.getState().speechEnabled).toBe(false);
  });

  it('未經確認的區域用法藏得起來 —— 之前這個設定沒有人讀', () => {
    render(<SettingsPanel />);
    open();
    click('隱藏');
    expect(useSettingsStore.getState().showNeedsVerify).toBe(false);
  });

  it('目前的選擇會標出來（aria-pressed）', () => {
    useSettingsStore.setState({ dailyGoal: 10 });
    render(<SettingsPanel />);
    open();
    expect(screen.getByRole('button', { name: '10 分鐘' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '5 分鐘' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('主題與語言在面板裡也找得到', () => {
    render(<SettingsPanel />);
    open();
    click('English');
    expect(useSettingsStore.getState().locale).toBe('en');
    click(/Dark/);
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
});

describe('未經確認的區域用法怎麼藏', () => {
  const unverified: Regional = {
    region: 'Ecuador',
    needsVerify: true,
    note: { zh: '這個說法我沒有十足把握。', en: 'I am not fully sure about this usage.' },
  };
  const verified: Regional = {
    region: 'Ecuador',
    needsVerify: false,
    note: { zh: '這個說法可以確定。', en: 'This usage is confirmed.' },
  };

  // locale 也要重設 —— store 是跨測試共用的，上一個測試把介面切成英文了
  beforeEach(() => useSettingsStore.setState({ showNeedsVerify: true, locale: 'zh' }));

  it('打開時看得到內容與標記', () => {
    render(<RegionalNote regional={unverified} />);
    expect(screen.getByText(unverified.note.zh)).toBeTruthy();
    expect(screen.getByText('待母語者確認')).toBeTruthy();
  });

  it('關掉時整塊不見 —— 不是只把標記藏起來', () => {
    useSettingsStore.setState({ showNeedsVerify: false });
    render(<RegionalNote regional={unverified} />);
    // 標記不見是必要的，但內文也必須跟著不見：
    // 只藏標記的話，沒把握的用法會看起來像已經確認過的
    expect(screen.queryByText('待母語者確認')).toBeNull();
    expect(screen.queryByText(unverified.note.zh)).toBeNull();
  });

  it('已確認的區域用法不受這個設定影響', () => {
    useSettingsStore.setState({ showNeedsVerify: false });
    render(<RegionalNote regional={verified} />);
    expect(screen.getByText(verified.note.zh)).toBeTruthy();
  });
});
