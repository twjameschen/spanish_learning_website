# 瀏覽器實測腳本

單元測試看不到的東西 —— 畫面有沒有真的渲染出來、按鍵有沒有作用、
顏色對比夠不夠、有沒有偷偷發出網路請求 —— 由這些腳本負責。

有幾個 bug 是**只有**這一層抓得到的：按 Enter 會跳過答題回饋、
旅程地圖的字被 SVG viewBox 放大成 31px、題目顯示成「哪一句 \*\*錯了\*\* ？」、
品牌橘上的白字只有 2.32:1、直接改網址換一課練習時上一課的作答狀態會留著。

## 怎麼跑

需要 Node 與 Playwright（`playwright` 套件 + 一份 Chromium）。

```bash
npm run build
cd dist && python3 -m http.server 8000 &

node scripts/e2e/gamification.mjs http://localhost:8000/ /tmp/shots
node scripts/e2e/content-a1.mjs   http://localhost:8000/ /tmp/shots
node scripts/e2e/content-b1.mjs   http://localhost:8000/ /tmp/shots
node scripts/e2e/exercises-p8.mjs http://localhost:8000/ /tmp/shots
node scripts/e2e/listen-drill.mjs  http://localhost:8000/ /tmp/shots
node scripts/e2e/dashboard.mjs    http://localhost:8000/ /tmp/shots
node scripts/e2e/shortcuts.mjs    http://localhost:8000/ /tmp/shots
node scripts/e2e/contrast.mjs     http://localhost:8000/
node scripts/e2e/offline.mjs      http://localhost:8000/

# 單檔版走 file://，不需要伺服器
npm run build:single
node scripts/e2e/single-file.mjs /tmp/shots
```

第一個參數是網站位址，第二個是截圖輸出目錄。
腳本用退出碼回報結果（0 = 全過），可以直接串進 CI。

Chromium 路徑寫在每支腳本最上面的 `EXE` 常數，換機器時改那一行。

## 各支在測什麼

| 腳本 | 範圍 |
|---|---|
| `gamification.mjs` | 連續天數卡、旅程地圖節點與字級、成就頁、慶祝時機、手機底部列 |
| `content-a1.mjs` | 課程列表、A1 課文、Sierra 禮貌專課的「待母語者確認」標記、變位題實際作答 |
| `content-b1.mjs` | 全部 41 課、虛擬式課文、si 條件句的表格渲染、五站全開 |
| `exercises-p8.mjs` | 沒有 TTS 語音時聽力題的降級路徑、陰陽性分類實際作答到結算、主題分類入口、換一課要重新開始 |
| `listen-drill.mjs` | 連續聽寫：首頁與課程頁的入口、一場 12 句、去重音去逗號仍判對、每天固定一批、台北那段不給入口 |
| `dashboard.mjs` | 空狀態、熱力圖、XP 折線、詞性雷達、最弱十字、匯出匯入 |
| `shortcuts.mjs` | 數字鍵選答案、Space 翻閃卡、`?` 說明面板、輸入框裡不搶鍵盤 |
| `contrast.mjs` | 9 個頁面 × 淺／深兩種模式的 WCAG AA 文字對比（漸層背景會跳過並回報） |
| `offline.mjs` | 走過 9 個頁面攔截所有請求，斷言零個對外請求 |
| `single-file.mjs` | 單檔版在 `file://` 下能不能開、hash 路由與儲存層可不可用 |
