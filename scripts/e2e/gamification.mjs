import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();

const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1000,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

console.log('\n[1] 首頁：連續天數卡與旅程地圖');
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
let txt=await T(p);
ck('顯示連續天數卡（第 0 天也要看得到）', /還沒開始連續紀錄/.test(txt));
ck('顯示今日目標進度', /今天 \d+ \/ \d+ 分鐘/.test(txt), txt.match(/今天 \d+ \/ \d+ 分鐘/)?.[0]??'');
ck('旅程地圖標題', /旅程地圖/.test(txt));
// 城市名是 HTML（不是 SVG text），才不會被 viewBox 放大
const mapNodes = await p.locator('div[role="img"] > div').allInnerTexts();
ck('地圖畫出五個城市節點', ['台北','邁阿密','基多','昆卡','加拉巴哥'].every(c=>mapNodes.some(n=>n.includes(c))), mapNodes.map(n=>n.split('\n').join(' ')).join(' / '));
// 字級不能隨容器縮放：量實際 CSS px
const labelSizes = await p.locator('div[role="img"] > div > span:last-child').evaluateAll(els=>els.map(e=>parseFloat(getComputedStyle(e).fontSize)));
ck('城市名字級在合理範圍（11–16px）', labelSizes.every(s=>s>=11&&s<=16), labelSizes.join(','));
const mapH = await p.locator('div[role="img"]').evaluate(e=>e.getBoundingClientRect().height);
ck('地圖高度不超過 260px', mapH<=260, mapH+'px');
ck('成就捷徑卡顯示進度', /已解鎖 \d+ \/ \d+/.test(txt), txt.match(/已解鎖 \d+ \/ \d+/)?.[0]??'');
await p.screenshot({path:`${SP}/p4-home.png`,fullPage:true});

console.log('\n[2] 成就頁');
await p.getByRole('link',{name:/^成就$/}).first().click(); await p.waitForTimeout(600);
txt=await T(p);
ck('成就頁標題', /成就/.test(txt));
const items = await p.locator('main ul > li').count();
ck('成就數量 >= 20（規格要求）', items>=20, `實際 ${items}`);
ck('未解鎖成就顯示進度條分母', /0 \/ 1/.test(txt));
ck('顯示銅銀金分級', /銅/.test(txt)&&/銀/.test(txt)&&/金/.test(txt));
await p.screenshot({path:`${SP}/p4-achievements.png`,fullPage:true});

console.log('\n[3] 英文切換：成就名稱與說明要一起換');
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click();
await p.waitForTimeout(500);
txt=await T(p);
const zhLeft = (txt.match(/[一-鿿]/g)||[]).length;
ck('切英文後成就頁沒有中文殘留', zhLeft===0, zhLeft?`殘留 ${zhLeft} 個中文字：${(txt.match(/[一-鿿]+/g)||[]).slice(0,5).join(',')}`:'');
ck('英文成就名稱出現', /First Step/.test(txt));
ck('英文分級標籤', /Bronze/.test(txt));
await p.screenshot({path:`${SP}/p4-achievements-en.png`,fullPage:true});
// 切回中文
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click();
await p.waitForTimeout(400);

console.log('\n[4] 作答中不能被慶祝視窗蓋住回饋，結束後才播');
await p.goto(BASE+'#/lessons/a0-hay',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
await p.getByRole('link',{name:/開始練習/}).click(); await p.waitForTimeout(600);
await p.locator('ol li button').first().click(); await p.waitForTimeout(1200);
ck('第一題作答後「沒有」跳出慶祝視窗', (await p.locator('[role="dialog"]').count())===0);
let ftxt = await T(p);
ck('看得到答題回饋', /答對了|答錯了/.test(ftxt));
ck('看得到解釋', ftxt.length>60);
await p.screenshot({path:`${SP}/p4-no-interrupt.png`});

// 一路作答到整輪結束（先把答案填好，最後才按檢查，否則按到 disabled 的按鈕）
for (let i=0;i<60;i++){
  const done = p.getByRole('button',{name:/^完成/});
  if (await done.count()) { await done.first().click(); await p.waitForTimeout(1000); break; }
  const next = p.getByRole('button',{name:/^下一題/});
  if (await next.count()) { await next.first().click(); await p.waitForTimeout(300); continue; }

  // 詞塊池：已放置區有 aria-label，用它排除，否則點完的詞塊還在另一個 flex-wrap 裡，
  // while 迴圈永遠數不到 0
  const chips = p.locator('main div.flex-wrap:not([aria-label]) > button:not([disabled])');
  if (await chips.count()) {
    let guard = 0;
    while (await chips.count() && guard++ < 20) { await chips.first().click(); await p.waitForTimeout(100); }
    continue;
  }
  // 文字輸入
  const input = p.locator('main input[type="text"]');
  if (await input.count()) { await input.first().fill('x'); await p.waitForTimeout(120); }

  const check = p.locator('main button:not([disabled])').filter({hasText:/^檢查|^送出|^看答案|^不知道/});
  if (await check.count()) { await check.first().click().catch(()=>{}); await p.waitForTimeout(300); continue; }
  // 送出鍵只有圖示，靠 aria-label 找
  const send = p.getByRole('button',{name:/送出答案|Submit answer/});
  if (await send.count() && await send.first().isEnabled()) { await send.first().click(); await p.waitForTimeout(300); continue; }
  // 四選一 / 陰陽性分類
  const opts = p.locator('main ol li button, main ul li button');
  if (await opts.count()) { await opts.first().click().catch(()=>{}); await p.waitForTimeout(300); continue; }
  break;
}
const dialog = p.locator('[role="dialog"]');
const hasDialog = await dialog.count();
ck('整輪結束後才跳出慶祝視窗', hasDialog>0);
if (hasDialog) {
  const dtxt = await dialog.innerText();
  ck('慶祝視窗說明解鎖了什麼', /解鎖成就|升級了/.test(dtxt), dtxt.split('\n').filter(Boolean).join(' | '));
  await p.screenshot({path:`${SP}/p4-celebrate.png`});
  await p.getByRole('button',{name:'好'}).click(); await p.waitForTimeout(700);
}

console.log('\n[5] 成就狀態有落地');
await p.goto(BASE+'#/achievements',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
txt=await T(p);
ck('已解鎖數 > 0', /已解鎖 [1-9]\d* \//.test(txt), txt.match(/已解鎖 \d+ \/ \d+/)?.[0]??'');

console.log('\n[6] 重新整理後成就不會重跳慶祝');
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1200);
ck('重新載入後沒有慶祝視窗', (await p.locator('[role="dialog"]').count())===0);

console.log('\n[7] 手機底部列六個項目不重疊');
await p.setViewportSize({width:360,height:740});
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
// 側邊欄在窄畫面是 display:none 但仍在 DOM 裡，要指名底部那個 nav
const measure = () => p.locator('nav.fixed.bottom-0 a').evaluateAll(els=>els.map(e=>{
  const span=e.querySelector('span');
  return {t:e.innerText,sw:span?span.scrollWidth:0,cw:span?span.clientWidth:0};
}));
let boxes = await measure();
ck('底部列有六個項目', boxes.length===6, boxes.map(b=>b.t).join('/'));
ck('底部列可見', await p.locator('nav.fixed.bottom-0').isVisible());
ck('中文標籤沒有被截斷', boxes.every(b=>b.sw<=b.cw+1), boxes.filter(b=>b.sw>b.cw+1).map(b=>`${b.t}:${b.sw}>${b.cw}`).join(', '));
await p.screenshot({path:`${SP}/p4-phone.png`,fullPage:true});

// 英文標籤比中文長，同樣要量一次
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click();
await p.waitForTimeout(500);
boxes = await measure();
ck('英文標籤沒有被截斷', boxes.every(b=>b.sw<=b.cw+1), boxes.map(b=>`${b.t}:${b.sw}/${b.cw}`).join(', '));
await p.screenshot({path:`${SP}/p4-phone-en.png`,fullPage:true});
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click();
await p.waitForTimeout(400);
await p.screenshot({path:`${SP}/p4-phone.png`,fullPage:true});

console.log('\n[8] 深色模式');
await p.emulateMedia({colorScheme:'dark'});
await p.setViewportSize({width:1000,height:1200});
await p.goto(BASE+'#/achievements',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.screenshot({path:`${SP}/p4-dark.png`,fullPage:true});
ck('深色模式無錯誤', true);

ck('全程沒有 JS 例外', errs.length===0, errs.slice(0,3).join(' | '));
console.log(`\n${fail===0?'全部通過':`${fail} 項失敗`}`);
await b.close();
process.exit(fail?1:0);
