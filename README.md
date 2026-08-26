# Camino a Quito · 西班牙文之路

一套**完全離線**的西班牙文學習網站，語言變體鎖定**拉丁美洲 / 厄瓜多 Sierra（基多）**，
介面全繁體中文，給中文母語者從 A0 讀到 B1。

無後端、無 API 呼叫、無 CDN、無 Google Fonts —— 所有字型、資料、圖示都打包進 build 產物。

> **目前進度：Phase 1 / 7（專案骨架）**
> 骨架、色彩系統、三層儲存、雙 build 已完成並通過驗證。
> 課程內容與學習引擎在後續 Phase 交付。

---

## 快速開始

```bash
npm install
npm run dev          # 開發伺服器 http://localhost:5173
```

## Build 與開啟方式

### 方式一：一般 build + 本機伺服器（**建議**）

```bash
npm run build
cd dist
python -m http.server 8000
```

然後用 Chrome / Edge 開 <http://localhost:8000>。

Windows 若 `python` 不存在，試 `py -m http.server 8000`；
沒有 Python 也可以用 `npx serve dist` 或 `npm run preview`。

### 方式二：單一 HTML 檔（雙擊即開）

```bash
npm run build:single
```

產出 `dist-single/index.html` —— **整個 app 就這一個檔案**（約 310 KB），
JS / CSS / 字型全部 inline 成 data URI。複製到隨身碟、雙擊就能用，不需要任何伺服器。

實測 Chrome / Edge 在 `file://` 下**可以**正常保存進度。
但若你的瀏覽器或設定不允許（無痕模式、停用網站資料、Firefox 擋 IndexedDB），
app 會自動降級成「記憶體模式」並在頂端顯示警示條 —— 此時進度**不會**自動保存，
離開前請按「匯出進度」。

---

## 進度怎麼存、怎麼備份

儲存層會自動偵測並選用可用的方式，**實際寫一次**來判斷，不是靠 protocol 猜：

| 層級 | 說明 |
|---|---|
| **IndexedDB** | 最理想。容量充裕，進度自動保存。 |
| **localStorage** | 退而求其次。可用但約 5 MB 上限，建議定期匯出。 |
| **記憶體** | 前兩者都寫不進去時的退路。功能完整，但**關掉分頁就沒了**。 |

目前生效的是哪一層，首頁「儲存方式」卡片會直接標示。

### 備份

- **自動快照**：每次開站自動存一份，每天一份、保留最近 3 天。
  瀏覽器誤清資料時可以救回來。
- **手動匯出／匯入**：首頁「儲存方式」卡片有按鈕。
  匯出的 `camino-progress-*.json` 可以帶著走，換電腦或換瀏覽器時匯入即可接續。
  匯入預設是 **replace**（先清空再寫入），避免新舊資料混在一起。

> 注意：`file://` 下 Chrome 把所有本機 HTML 檔案視為同一個來源，
> 也就是說單檔版的進度跟你電腦上其他本機網頁共用同一份儲存空間。
> 個人自用沒問題，但這也是建議用方式一的理由之一。

---

## 開發指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` | 一般 build → `dist/` |
| `npm run build:single` | 單檔 build → `dist-single/index.html` |
| `npm run typecheck` | TypeScript strict 檢查 |
| `npm test` | vitest 單元測試 |
| `npm run test:watch` | 測試 watch 模式 |

---

## 技術棧

Vite 5 · React 18 · TypeScript (strict) · Tailwind CSS 3 · shadcn/ui（本地 copy，非 npm 依賴）
framer-motion · lucide-react · recharts · zustand + persist · ts-fsrs · canvas-confetti · zod · vitest

字型：`@fontsource/nunito`（只取 latin 子集的 400/600/800 三個字重 woff2）。
中文走系統字型堆疊 —— Noto Sans TC 全字集太大，不 bundle。

### 為什麼版本要鎖死

- `vite@5.4.21` — `vite-plugin-singlefile@2.3.3` 的 peer 是 `^5.4.21`，Vite 5 線只有這個版本能搭
- `@vitejs/plugin-react@4.7.0` — 最新的 6.x 強制要 Vite 8，不能用
- `tailwindcss@3.4.19` — v4 改成 CSS-first `@theme`，與本專案的 `theme.extend` 色票寫法不相容

---

## 語言規範（貫穿全站）

- **絕不出現 vosotros**。複數第二人稱一律 `ustedes`（有測試把關，違反就 build 失敗）
- 動詞人稱只有 5 個：`yo` / `tú` / `él-ella-usted` / `nosotros` / `ellos-ustedes`
- 沒有 voseo（不教阿根廷的 `vos`）；厄瓜多以 `tú` / `usted` 為主
- 發音走 seseo（`c`/`z` 唸 /s/，沒有 /θ/）與 yeísmo
- 區域用法只要不是百分之百確定，一律標 `needsVerify: true`，UI 上顯示「待母語者確認」小標記

---

## 專案結構

```
src/
├─ lib/          storage（三層）/ backup / snapshot / utils …
├─ content/      課程與單字 JSON + zod schema
├─ store/        zustand stores
├─ components/   ui（shadcn 本地 copy）/ decor / layout …
├─ hooks/
└─ pages/
```

## 自己新增單字

課程內容放在 `src/content/` 下的純 JSON，由 `src/content/schema.ts` 的 zod schema 驗證。
schema 不符會讓 `npm run build` 直接失敗，不會默默出錯。

> 詳細的單字欄位說明與新增步驟會在 Phase 2（內容 schema）完成後補上。
