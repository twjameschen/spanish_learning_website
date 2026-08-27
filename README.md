# Camino a Quito · 西班牙文之路

一套**完全離線**的西班牙文學習網站，語言變體鎖定**拉丁美洲 / 厄瓜多 Sierra（基多）**，
說明與解說可在**繁體中文 ↔ English** 之間切換，從 A0 讀到 B1。

無後端、無 API 呼叫、無 CDN、無 Google Fonts —— 所有字型、資料、圖示都打包進 build 產物。

> **目前進度：Phase 2 / 7（A0 內容）**
> 骨架、色彩系統、三層儲存、雙 build、content schema 與 **A0 全部內容**已完成。
> 可以瀏覽 232 個單字與 12 課課文（唯讀），全部中英雙語。
> 實際作答、間隔複習與遊戲化在 Phase 3 之後交付。

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

## 內容一覽

| 項目 | 數量 |
|---|---|
| A0 單字（含動詞） | 232 |
| A0 課程 | 12（台北 6 + 邁阿密 6） |
| 練習題 | 99，涵蓋全部 7 種題型 |
| 標註區域用法 | 15 筆，其中不確定的都標了「待母語者確認」 |
| 雙語欄位 | 1,306 組 `{zh, en}`，兩種語言都必填 |

---

## 語言切換

右上角的 **中／EN** 按鈕一次切換**全部** —— 介面、單字字義、例句翻譯、
課文、題目解釋都跟著換。設定會存進儲存層，重整後保持。

西班牙文本身（單字、例句、變位表）當然不隨語言改變，那是要學的東西。

### 為什麼兩種語言都強制必填

`schema.ts` 的 `localizedSchema` 要求 `{ zh, en }` 兩邊都非空。
刻意不做「缺英文就 fallback 回中文」—— 那樣切到英文時會看到一半中文一半英文，
比整頁中文更難用。缺翻譯就讓驗證失敗，`npm run build` 直接擋下。

`src/i18n/i18n.test.ts` 另外檢查：
所有 1,306 組欄位兩邊都在、英文欄位不含中文字、
該翻譯的欄位沒有兩版一模一樣（純數字與注音式重音標記如 `CA-sa`、`/k/` 除外）。

---

## 自己新增單字

內容全部是 `src/content/` 下的純 JSON，由 `src/content/schema.ts` 的 zod schema 驗證。
**schema 不符會讓 `npm run build` 直接失敗**，不會默默出錯。

### 加一個名詞

編輯 `src/content/words/a0.json`，加一筆：

```json
{
  "id": "ventana",
  "es": "ventana",
  "gloss": { "zh": "窗戶", "en": "window" },
  "pos": "noun",
  "gender": "f",
  "level": "A0",
  "topic": "lugares",
  "exampleEs": "La ventana es grande.",
  "exampleGloss": { "zh": "那扇窗很大。", "en": "The window is big." }
}
```

必填欄位：`id`（小寫、數字、連字號）、`es`、`gloss`、`pos`、`level`、`topic`、
`exampleEs`、`exampleGloss`。

**所有給人看的文字都是 `{ zh, en }` 物件，兩邊都必填。**

**`pos` 是 `noun` 時 `gender` 必填**（`m` 或 `f`）—— 這條由 schema 強制，
因為中文沒有性別，這是最容易漏的欄位。反過來，非名詞不准標 `gender`。

選填：`genderNote`（陰陽同形或例外時說明）、`regional`（區域用法）。

### 加一個動詞

編輯 `src/content/verbs/a0.json`。動詞多幾個欄位：

```json
{
  "id": "abrir", "es": "abrir",
  "gloss": { "zh": "打開", "en": "to open" },
  "pos": "verb", "level": "A0", "topic": "verbos",
  "exampleEs": "Abro la ventana.",
  "exampleGloss": { "zh": "我打開窗戶。", "en": "I open the window." },
  "infinitive": "abrir", "irregular": false, "reflexive": false,
  "participio": "abierto", "gerundio": "abriendo",
  "conjugations": {
    "presente": {
      "yo": "abro", "tu": "abres", "el_ella_usted": "abre",
      "nosotros": "abrimos", "ellos_ustedes": "abren"
    }
  }
}
```

**人稱只有這 5 個 key，多一個少一個都會驗證失敗。** 沒有 vosotros。
`presente` 必填，其他時態選填。

### 加一個區域用法

```json
"regional": {
  "region": "Ecuador",
  "note": {
    "zh": "厄瓜多常用，其他西語區多說 …",
    "en": "Common in Ecuador; elsewhere people usually say …"
  },
  "needsVerify": true
}
```

`region` 只能是 `Ecuador` / `Andes` / `LatAm` / `Quito` / `Costa`。
**不是百分之百確定就設 `needsVerify: true`** —— UI 會顯示「待母語者確認」標記，
誠實標示不確定比假裝權威有用得多。

### 改完之後

```bash
npm run validate:content   # 只跑內容驗證，最快
npm test                   # 全部測試
```

驗證會檢查：schema 形狀、id 唯一、名詞有性別、例句非空、每題都有解釋、
**中英兩種語言都不缺**、跨檔引用都解析得到（題目指向的單字要存在、
變位題答案要跟變化表一致）、前置課程無循環，
以及**沒有任何 vosotros 或 voseo 形式混進來**。

---

## 內容結構

```
src/content/
├─ schema.ts        zod schema —— 型別的單一真相來源（TS 型別由 z.infer 反推）
├─ index.ts         載入 + 驗證 + 跨檔完整性檢查
├─ words/a0.json    214 個非動詞單字
├─ verbs/a0.json     18 個動詞（含現在式變化表）
├─ lessons/a0.json   12 課
└─ journey.json      5 個城市 → 課程分組

src/i18n/
├─ ui.ts            介面字串（按鈕、標題、狀態訊息）
└─ index.ts         useT()：t() 取介面字串、L() 取內容的 Localized 欄位
```

每一課的結構：

| 欄位 | 用途 |
|---|---|
| `intro` | 白話的中文導言 |
| `rules[]` | 規則 + 雙語例句 |
| `pitfalls` | **最容易犯的錯，明講** —— 這是全站最重要的教學資產 |
| `pronunciation[]` | 發音課專用：字母、IPA、中文說明、例字 |
| `exercises[]` | 練習題，7 種題型 |
| `prerequisites[]` | 前置課程 id，用於技能樹解鎖 |
| `usesOnlyTaughtGrammar` | 自我聲明：規則例句只用了本課與前置課教過的文法 |

### pitfalls 的撰寫口吻

**直接講西班牙文本身的規則與陷阱，不拿其他語言的情境來對照。**

結構固定為：點出最容易犯的錯 → `✗ / ✓` 具體示範 → 可操作的判準 → 自我檢查法。

`src/content/no-vosotros.test.ts` 有兩支測試把關：
禁止以其他語言為參照的詞彙、每課都必須有 `✗/✓` 對照。

### 例句難度政策

- **單字例句實用優先** —— 用真的會用到的日常句，即使用到之後才教的文法
  （例如 `¿Cuánto cuesta?` 當整句記憶）。
- **課文例句嚴格分級** —— 示範文法規則的例句只用該課與前置課教過的東西，
  讓規則被孤立出來、不被雜訊干擾。
