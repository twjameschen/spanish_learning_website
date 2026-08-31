import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/*
 * jsdom 沒有實作 matchMedia，但 useTheme 靠它判斷「跟隨系統」時該用深色還是淺色。
 * 沒有這個 stub 的話，任何用到主題的元件在測試裡一 render 就會炸。
 * 預設回報淺色 —— 測試不該依賴執行環境的系統偏好。
 */
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/**
 * 每個測試之間清掉 DOM，否則後面的 query 會撈到前一個測試殘留的節點。
 * 刻意不引入 @testing-library/jest-dom —— RTL 的 getBy* 找不到就會丟例外，
 * 已經足夠當斷言用，不必為了幾個語法糖再多一個依賴。
 */
afterEach(() => cleanup());
