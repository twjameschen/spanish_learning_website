import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * 每個測試之間清掉 DOM，否則後面的 query 會撈到前一個測試殘留的節點。
 * 刻意不引入 @testing-library/jest-dom —— RTL 的 getBy* 找不到就會丟例外，
 * 已經足夠當斷言用，不必為了幾個語法糖再多一個依賴。
 */
afterEach(() => cleanup());
