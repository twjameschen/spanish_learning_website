import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// `--mode single` 走單一 HTML 打包（雙擊可開）；預設走一般 dist/。
// 刻意用 Vite 的 --mode 而非環境變數：Windows cmd/PowerShell 不吃 `FOO=bar cmd` 前綴。
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    // 相對路徑：file:// 與任意子目錄下都能載入資源
    base: './',
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      // 單檔模式要把字型等資源全部 inline 成 data URI
      assetsInlineLimit: single ? 100_000_000 : 4096,
      cssCodeSplit: !single,
      chunkSizeWarningLimit: 2000,
    },
  };
});
