# 瀏覽器實測腳本

單元測試看不到的東西 —— 畫面有沒有真的渲染出來、按鍵有沒有作用、
顏色對比夠不夠、有沒有偷偷發出網路請求 —— 由這些腳本負責。

有幾個 bug 是**只有**這一層抓得到的：按 Enter 會跳過答題回饋、
旅程地圖的字被 SVG viewBox 放大成 31px、題目顯示成「哪一句 \*\*錯了\*\* ？」、
品牌橘上的白字只有 2.32:1、直接改網址換一課練習時上一課的作答狀態會留著、
設定對話框被 header 的 backdrop-filter 裁成 64px 高、
單字表 1456 顆喇叭只有第一顆顯示得出來。

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
node scripts/e2e/help-and-settings.mjs http://localhost:8000/ /tmp/shots
node scripts/e2e/mistakes-and-audio.mjs http://localhost:8000/ /tmp/shots
node scripts/e2e/dashboard.mjs    http://localhost:8000/ /tmp/shots
node scripts/e2e/shortcuts.mjs    http://localhost:8000/ /tmp/shots
node scripts/e2e/replay-and-focus.mjs http://localhost:8000/ /tmp/shots
node scripts/e2e/verbs.mjs        http://localhost:8000/ /tmp/shots
node scripts/e2e/desktop-audit.mjs http://localhost:8000/ /tmp/shots
node scripts/e2e/contrast-progress.mjs http://localhost:8000/
node scripts/e2e/contrast.mjs     http://localhost:8000/
node scripts/e2e/contrast-snapshot.mjs http://localhost:8000/

# 這一支要先知道全部課程的正式順序，才種得出「41 課都做完」的狀態
ALL_IDS=$(npx tsx -e "import {orderedLessons} from './src/content/index.ts'; \
  console.log(JSON.stringify(orderedLessons.map(l=>l.id)))") \
  node scripts/e2e/contrast-hero.mjs http://localhost:8000/
node scripts/e2e/vocab-perf.mjs   http://localhost:8000/
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
| `mistakes-and-audio.mjs` | 錯題本（答錯後首頁出現入口、題數對得上）、單字與例句的喇叭真的把西文送去唸、字元列插在游標位置、**單字表整頁只掛一個語音監聽器**、首頁的複習張數等於複習頁的題數、**匯出→作答→匯入不重新整理就回到匯出當時（而且下次作答不會把它蓋回去）**、**快照的兩段式還原走得完** |
| `listen-drill.mjs` | 連續聽寫：首頁與課程頁的入口、一場 12 句、去重音去逗號仍判對、每天固定一批、台北那段不給入口 |
| `help-and-settings.mjs` | 三種題型的兩階求助（會塞一個假的西班牙文語音進去，否則容器裡量不到有語音的那條路徑）、翻譯題的骨架提示、設定面板改得動而且真的有作用、遮罩鋪滿視窗 |
| `dashboard.mjs` | 空狀態、熱力圖、XP 折線、詞性雷達、最弱十字、匯出匯入 |
| `shortcuts.mjs` | 數字鍵選答案、Space 翻閃卡、`?` 說明面板、輸入框裡不搶鍵盤 |
| `contrast.mjs` | 9 個頁面 × 淺／深兩種模式的 WCAG AA 文字對比，另外量設定面板、聽力提示、骨架提示、字元列、有錯題時的首頁這幾個「要先做點什麼才存在」的狀態（漸層背景會跳過並回報） |
| `offline.mjs` | 走過 9 個頁面攔截所有請求，斷言零個對外請求 |
| `single-file.mjs` | 單檔版在 `file://` 下能不能開、hash 路由與儲存層可不可用 |
| `contrast-progress.mjs` | 課程列表的完成打勾與「全對」、單字卡與動詞列的熟練度星等 —— 這些要先**有進度**才畫得出來，`contrast.mjs` 從空白開站量不到。直接把進度種進 IndexedDB 再量，淺／深兩色都跑 |
| `contrast-snapshot.mjs` | 快照那一列的「還原」與確認狀態的對比 —— 這兩個要先有快照才畫得出來，`contrast.mjs` 從空白開站量不到 |
| `verbs.mjs` | 動詞列表與篩選、**打 `fui` 同時查到 ser 與 ir 並標出時態人稱**、反身動詞打 `llamo` 找得到 `llamarse`、完整變位表 7×5=35 格、沒有命令式的動詞不印空區塊、找不到的 id 給錯誤畫面、單字表的動詞卡連得過來、375px 下表格自己橫捲 |
| `desktop-audit.mjs` | **桌機專用的系統性稽核**（使用者說「基本上都只用電腦」）：16 條路由 × 1280／1440／1920 三種寬度不能橫向溢出、163 條站內連結全部到得了、Tab 走得完且焦點看得見、走一次完整流程（課文 → 練習 → 結算 → 課程列表標記 → 首頁複習張數 = 複習頁題數）、連續拉視窗、全程零 JS 錯誤。**「下一課」與首頁「繼續」指到哪一課也在這裡驗**（`a0-saludos` 的下一課必須是 `a0-numeros`，不是跳級到 A1） |
| `contrast-hero.mjs` | 首頁 hero 的對比。`contrast.mjs` 一碰到 `background-image` 就整段跳過，而 hero 整塊是漸層 —— **全站最顯眼的一塊，三支對比腳本一個都量不到**。這一支量「繼續」CTA（自己有實心底色）與 41 課做完後那一句話（拿漸層的三個色停各量一次，取最差端） |
| `vocab-perf.mjs` | 單字表 728 張卡全開時，每按一個鍵到畫面更新完成要多久、切換語言要多久、`content-visibility` 有沒有真的生效 |
| `replay-and-focus.mjs` | **只有一題的練習按「再練一次」之後那一題還能不能作答**（陰陽性分類都是一題）、對話框開著時按 1～4 不會回答背後那題、設定面板的 Tab 循環與關掉後的焦點還原、換頁會停止發音、熱力圖鍵盤讀得到、375px 下面板捲得到頂與字元列 ≥ 44px |
