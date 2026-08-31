# Camino a Quito · 西班牙文之路

一套**完全離線**的西班牙文學習網站，語言變體鎖定**拉丁美洲 / 厄瓜多 Sierra（基多）**，
說明與解說可在**繁體中文 ↔ English** 之間切換，從 A0 讀到 B1。

無後端、無 API 呼叫、無 CDN、無 Google Fonts —— 所有字型、資料、圖示都打包進 build 產物。

> **目前進度：全部 7 個 Phase 完成**
> A0 到 B1 共 **41 課、728 個詞條、389 題**，五座城市全部開放。
> 間隔複習（FSRS）、7 種題型、XP／等級／連續天數／26 個成就、
> 旅程地圖、學習統計儀表板、匯出匯入都可以用了，全部中英雙語。

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

產出 `dist-single/index.html` —— **整個 app 就這一個檔案**（約 1.8 MB），
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

瀏覽器實測（畫面、鍵盤、對比、離線）另外放在 `scripts/e2e/`，用法見該目錄的 README。

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
├─ components/   ui（shadcn 本地 copy）/ exercises（7 種題型）/
│                journey（旅程地圖）/ dashboard（圖表）/ decor / layout
├─ hooks/
├─ i18n/         UI 字串（中英雙語，key 有型別）
└─ pages/        Home / Vocab / Lesson / Practice / Drill / Review /
                 Achievements / Dashboard
```

## 內容一覽

| 項目 | 數量 |
|---|---|
| 詞條（含動詞） | **728**（A0 232 · A1 255 · A2 166 · B1 75） |
| 動詞變位表 | 105 個，其中 15 個高頻不規則動詞補齊 7 個簡單時態 + 命令式 |
| 課程 | **41**（A0 12 · A1 13 · A2 10 · B1 6） |
| 練習題 | **389**，涵蓋全部 7 種題型（四選一 151 · 動詞變位 73 · 翻譯 68 · **聽力 44** · 排序 36 · **陰陽性分類 12** · 閃卡 5） |
| 課外練習 | 依主題即時產生的 18 組陰陽性分類；**321 句的連續聽寫題庫**（每場 12 句） |
| 成就 | 26 個，銅／銀／金三階 |
| 標註區域用法 | 30 筆，其中 15 筆不確定的標了「待母語者確認」 |
| 單元測試 | 580 條 |

### 課程分佈

| 城市 | 等級 | 課數 | 重點 |
|---|---|---|---|
| 台北 | A0 | 6 | 發音、重音、seseo／yeísmo、問候、數字 |
| 邁阿密 | A0 | 6 | 名詞性別、冠詞、複數、主詞代名詞、ser／estar、hay |
| 基多 | A1 | 13 | 現在式三組、字根變化、gustar、反身動詞、受詞代名詞、命令式、**基多的禮貌等級** |
| 昆卡 | A2 | 10 | 兩種過去式的對比、現在完成式、未來式、條件式、por／para、關係代名詞 |
| 加拉巴哥 | B1 | 6 | 虛擬式三章、過去虛擬式、si 條件句、se 被動與無人稱 |

---

## 怎麼用

| 想做什麼 | 去哪裡 |
|---|---|
| 從頭學 | 首頁 → 旅程地圖 → 台北第 1 課 |
| 讀課文 | 課程 → 挑一課（規則、例句、最容易犯的錯、題目預覽都在同一頁） |
| 做題目 | 課文頁的「開始練習」 |
| 背單字 | 課文頁的「練這一課的單字」，或單字表右上角的「今天的單字閃卡」 |
| 練陰陽性 | 單字表 → 點一個主題篩選 → 「練這個主題的陰陽性」（18 個主題各一組，限時 75 秒） |
| 練整句聽力 | 首頁的「連續聽寫」（橫跨整段旅程），或課程頁每一段的「練這一段的聽力」。一場 12 句，每天換一批 |
| 聽不懂的時候 | 聽力題的輸入框下方有「看中文意思」與「直接看答案」 |
| 改設定 | 右上角的齒輪：每日目標、語音開關、未經確認的區域用法、語言、主題 |
| 每天複習 | 「複習」分頁 —— FSRS 排程決定今天該複習哪些 |
| 看進度 | 「統計」分頁：練習日曆、XP 走勢、詞性雷達、最弱的 10 個字 |
| 備份 | 統計頁最下方的「匯出進度」 |

### 聽不懂的時候怎麼辦

聽力題的送出鍵在沒打字時是停用的，所以完全聽不出來的話會**整題卡死** ——
只能亂打一通讓它判錯才過得去。輸入框下方因此有兩階求助：

| | 做什麼 | 怎麼算分 |
|---|---|---|
| **看中文意思** | 只翻出意思，西文還是要自己拼 | 答對仍算對，但 FSRS 記 Hard，會比較快再遇到 |
| **直接看答案** | 整句西文與翻譯由回饋面板印出來 | 算答錯、0 XP，跟閃卡的「想不起來」同一個意思 |

裝置沒有西班牙文語音時，聽力題本來就會改成看著西班牙文抄寫，
整句已經在畫面上，那時**不顯示求助按鈕**。

### 設定放在哪裡

右上角的齒輪。三個設定在 Phase 10 之前存在資料層卻沒有任何畫面入口 ——
每日目標永遠鎖在 5 分鐘、語音關不掉、「未經確認的區域用法」那個開關
甚至沒有任何地方在讀。

| 設定 | 選項 |
|---|---|
| 每日目標 | 5 / 10 / 15 分鐘（首頁的連續天數卡以這個數字算達標） |
| 西班牙文語音 | 開／關（關掉後聽力題改成抄寫，題目不會消失） |
| 未經確認的區域用法 | 顯示／隱藏 |
| 介面與解說語言 | 中文／English（header 也有快捷鍵） |
| 主題 | 淺色／深色／跟隨系統（header 也有快捷鍵） |

「未經確認的區域用法」選隱藏時**整塊都不顯示**，不是只把「待母語者確認」
的標記藏起來 —— 那會讓沒把握的用法看起來像已經確認過的，
正好違反規格第七條的誠實要求。要嘛看到內容連同警告，要嘛看不到。

### 連續聽寫的題庫從哪來

課內的聽力題受規格「每課 6–10 題」限制，補不上去了（41 課裡 30 課已滿），
所以整句聽寫另外做成課外模式，不佔課程題數。

題庫**不另外寫句子**，而是從已經審過的內容組起來：課內 44 題聽力，
加上課文規則裡的例句。例句要過三關才進題庫 —— 是完整的一句話
（句尾有 `.!?` 或句首有 `¿¡`）、不是變化表展示（`hablar → hablando`）、
不是對話（`Gracias. — De nada.` 中間的破折號聽不出來也打不出來）。
同一句話課內有手寫版本時用手寫的那一版，說明比較好，FSRS 也記在同一張卡上。

濾完 **321 句**：邁阿密 28 · 基多 111 · 昆卡 107 · 加拉巴哥 67。
台北那六課教的是字母與發音，例句多半是單字與片語，湊不滿一場，所以那一段沒有入口。

`accept` 由程式自動補齊三種變體的交叉組合 —— 去 ñ、去逗號、去句中的 `?!`。
這三種 `normalizeAnswer()` 不會處理，而聽的人也沒辦法從聲音判斷要不要打。

### 掌握度星等從哪裡來

每個單字的 0–5 星是 FSRS 的 stability 映射出來的，而 stability 只有在
**單字閃卡**裡才會累積 —— 一般的四選一、翻譯題算的是「這一題」的熟練度，
不是「這個字」的。所以想看到詞性雷達與最弱十個字有資料，要做單字閃卡。

### 鍵盤快捷鍵

| 鍵 | 動作 |
|---|---|
| `1`–`4` | 選四選一的答案 |
| `Space` | 翻開閃卡 |
| `1` / `2` | 翻開後：想不起來／我記得 |
| `Enter` | 下一題 |
| `?` | 打開快捷鍵說明 |

游標在輸入框裡時快捷鍵全部停用 —— 打字優先。

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
**每課 6–10 題且至少有一題聽力**、聽寫題的 `accept` 有無 ñ 與無逗號的版本，
以及**沒有任何 vosotros 或 voseo 形式混進來**。

---

## 內容結構

```
src/content/
├─ schema.ts        zod schema —— 型別的單一真相來源（TS 型別由 z.infer 反推）
├─ index.ts         載入 + 驗證 + 跨檔完整性檢查
├─ words/{a0,a1,a2,b1}.json   非動詞詞條，共 623 個
├─ verbs/{a0,a1,a2,b1}.json   動詞，共 105 個（含變化表）
├─ lessons/{a0,a1,a2,b1}.json 課程，共 41 課
└─ journey.json               5 個城市 → 課程分組

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

---

## 品質閘門

`npm test` 跑的 524 條測試裡，有一批是專門用來擋內容錯誤的 ——
它們的存在理由是「這種錯誤看不出來，但學習者會學到錯的東西」。

| 測試 | 擋什麼 |
|---|---|
| `no-vosotros.test.ts` | 任何 `vosotros`／`vuestro`／voseo 的痕跡；變位表的人稱 key 必須**恰好**是那 5 個 |
| `schema.test.ts` | zod 驗證、id 全域唯一、**名詞性別符合字尾規則**（例外要明列理由）、markdown 只用渲染器支援的語法 |
| `irregular-verbs.test.ts` | 15 個不規則動詞的現在式與簡單過去式逐格比對；其餘時態用西班牙文本身的結構規律驗（未來式與條件式同字根、過去虛擬式由簡單過去式第三人稱複數推出…） |
| `conjugate.test.ts` | 規則變位引擎，含正字法調整（`buscar → busqué`、`creer → creído`） |
| `normalize.test.ts` | 大小寫／重音折疊，且 **`año` 不會被折成 `ano`** |
| 完整性檢查 | 跨檔引用（`wordId`／`verbId` 存在、`genderSort` 的字都是名詞且**兩個冠詞不能都對**）、前置課程無循環 |

幾條測試是**先發現真實錯誤才寫出來的**，不是事後補的：
引擎的 `participio()` 少了遏止重音（`creer → creido`）、`parseVerb()` 不接受 `-ír` 結尾、
`llover` 被硬填出 `lluevo` 這種不存在的形式。

### 無障礙

所有頁面在**淺色與深色兩種模式**下都通過 WCAG AA 文字對比（一般文字 4.5:1、大字 3:1），
用瀏覽器實際量測而非目測。品牌橘 `#FF8A5B` 上的白字只有 2.32:1，
因此那些位置改用深墨色（5.56:1）—— 色票本身維持規格指定的值不變。

### 離線驗證

不是用 grep 掃字串，而是在瀏覽器裡走過 9 個頁面（含深色模式與語言切換），
攔截所有網路請求並斷言**零個對外請求**，同時確認 Nunito 字型來自 bundle 內。
