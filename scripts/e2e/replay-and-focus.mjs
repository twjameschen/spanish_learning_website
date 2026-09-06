import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();
async function clearCelebrations(p){
  for (let i=0;i<8;i++){
    if (!(await p.locator('[role="dialog"][aria-modal="true"]').count())) return;
    const ok=p.getByRole('button',{name:/^好$|^Nice$/});
    if (!(await ok.count())) return;
    await ok.first().click().catch(()=>{});
    await p.waitForTimeout(400);
  }
}

/* 容器裡沒有任何 TTS 語音，塞一個假的進去才走得到有語音的那條路 */
const FAKE_VOICE = `
  const voice = { name: 'Test', lang: 'es-MX', default: false, localService: true, voiceURI: 't' };
  window.__spoken = []; window.__cancels = 0;
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [voice],
      speak: (u) => window.__spoken.push(u && u.text),
      cancel: () => { window.__cancels += 1; },
      addEventListener: () => {}, removeEventListener: () => {},
    },
  });
  window.SpeechSynthesisUtterance = class { constructor(t){ this.text = t; } };
`;

const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1100,height:1000}});
await p.addInitScript(FAKE_VOICE);
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

/* ------------------------------------------------------------------ *
 * 1. 只有一題的練習，「再練一次」不可以卡死
 *    每一組陰陽性分類都恰好是一題，所以這條路徑一定會被踩到。
 * ------------------------------------------------------------------ */
console.log('\n[1] 單題練習的「再練一次」');
// 每一組陰陽性分類都恰好是一題，這正是會踩到卡死的那條路徑
await p.goto(BASE+'#/drill/gender-comida',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
await clearCelebrations(p);

// 一路按 el 把這一題做完
for (let i=0;i<12;i++){
  const el=p.getByRole('button',{name:/^el$/});
  if (!(await el.count())) break;
  await el.first().click().catch(()=>{});
  await p.waitForTimeout(150);
}
await p.waitForTimeout(600);
let next=p.getByRole('button',{name:/^下一題|^完成/});
if (await next.count()){ await next.first().click(); await p.waitForTimeout(700); }
await clearCelebrations(p);

const again=p.getByRole('button',{name:/再練一次/});
ck('做完之後有結算與「再練一次」', await again.count()===1, `${await again.count()} 顆`);
if (await again.count()){
  await again.first().click();
  await p.waitForTimeout(800);
  await clearCelebrations(p);

  // 關鍵：重來之後那一題必須是「還沒作答」的狀態
  const feedback=await p.getByRole('button',{name:/^下一題|^完成/}).count();
  ck('重來之後回饋區不在（outcome 有被清掉）', feedback===0, `${feedback} 顆下一題`);
  const elBtns=await p.getByRole('button',{name:/^el$|^la$/}).count();
  ck('重來之後題目按得下去（不是攤開的死題目）', elBtns>0, `${elBtns} 顆分類按鈕`);
  const t0=await T(p);
  ck('倒數回到滿秒', /\b(6[0-9]|7[0-5])s\b/.test(t0), (t0.match(/\d+s/)??[''])[0]);
  await p.screenshot({path:`${SP}/p15-replay.png`,fullPage:true});
}

/* ------------------------------------------------------------------ *
 * 2. 對話框開著時的按鍵不可以流到背後的題目
 * ------------------------------------------------------------------ */
console.log('\n[2] 快捷鍵不穿透對話框');
await p.goto(BASE+'#/practice/a0-saludos',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
await clearCelebrations(p);
const before=await T(p);
const posBefore=(before.match(/(\d+)\s*\/\s*\d+/)??[])[1];

await p.keyboard.press('?');
await p.waitForTimeout(600);
const dialogOpen=await p.locator('[role="dialog"][aria-modal="true"]').count();
ck('快捷鍵說明打得開', dialogOpen===1);

await p.keyboard.press('1');
await p.keyboard.press('2');
await p.waitForTimeout(500);
ck('面板開著按 1、2 不會回答背後那題',
   (await p.locator('[role="dialog"][aria-modal="true"]').count())===1 &&
   (await T(p)).includes(`${posBefore} /`) === before.includes(`${posBefore} /`),
   `題號 ${posBefore}`);

await p.keyboard.press('Escape');
await p.waitForTimeout(600);
ck('Escape 關得掉（inDialog 沒有把自己也擋掉）',
   (await p.locator('[role="dialog"][aria-modal="true"]').count())===0);

/* ------------------------------------------------------------------ *
 * 3. 設定面板的焦點：Tab 循環、關掉之後回到齒輪
 * ------------------------------------------------------------------ */
console.log('\n[3] 設定面板的焦點');
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
await clearCelebrations(p);
const gear=p.getByRole('button',{name:/設定|Settings/}).first();
await gear.focus();
await gear.click();
await p.waitForTimeout(700);
ck('面板打得開', (await p.locator('[role="dialog"][aria-modal="true"]').count())===1);

// Tab 20 次，焦點必須一直留在面板裡
let escaped=false;
for (let i=0;i<20;i++){
  await p.keyboard.press('Tab');
  const inside=await p.evaluate(()=>{
    const d=document.querySelector('[role="dialog"][aria-modal="true"]');
    return d ? d.contains(document.activeElement) : false;
  });
  if (!inside){ escaped=true; break; }
}
ck('Tab 20 次都還在面板裡，沒有跑到遮罩後面', !escaped);
await p.screenshot({path:`${SP}/p15-settings-focus.png`,fullPage:true});

await p.keyboard.press('Escape');
await p.waitForTimeout(700);
const backOnGear=await p.evaluate(()=>{
  const el=document.activeElement;
  return !!el && (el.getAttribute('aria-label')||'').match(/設定|Settings/) !== null;
});
ck('關掉之後焦點回到齒輪', backOnGear);

/* ------------------------------------------------------------------ *
 * 4. 聲音要停
 * ------------------------------------------------------------------ */
console.log('\n[4] 換頁就停止發音');
await p.goto(BASE+'#/practice/b1-si-condicionales',{waitUntil:'networkidle'});
await p.waitForTimeout(1000);
await clearCelebrations(p);
const spoke=await p.evaluate(()=>window.__spoken.length);
ck('聽力題有自動唸', spoke>0, `${spoke} 句`);
await p.evaluate(()=>{ window.__cancels = 0; });
await p.goto(BASE+'#/',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
ck('切頁之後有呼叫 cancel()', (await p.evaluate(()=>window.__cancels))>0,
   `${await p.evaluate(()=>window.__cancels)} 次`);

/* ------------------------------------------------------------------ *
 * 5. 熱力圖的鍵盤與觸控
 * ------------------------------------------------------------------ */
console.log('\n[5] 熱力圖讀得到');
await p.goto(BASE+'#/dashboard',{waitUntil:'networkidle'});
await p.waitForTimeout(1000);
await clearCelebrations(p);
const cells=p.locator('main [role="group"] button');
ck('格子是按鈕', await cells.count()>50, `${await cells.count()} 格`);
// 只檢查熱力圖自己的容器 —— 裝飾用的 SVG 本來就該是 role="img"
ck('熱力圖容器不是 role="img"（否則格子改成 button 也讀不到）',
   (await p.locator('main [role="img"] button').count())===0);
await cells.nth(10).focus();
await p.waitForTimeout(300);
const tip=await p.locator('main').innerText();
ck('鍵盤聚焦看得到那天的數字', /\d{4}-\d{2}-\d{2}[：:]/.test(tip),
   (tip.match(/\d{4}-\d{2}-\d{2}[^\n]*/)??[''])[0]);

/* ------------------------------------------------------------------ *
 * 6. 手機寬度：設定面板捲得到頂、字元列夠大
 * ------------------------------------------------------------------ */
console.log('\n[6] 375px 手機');
const m=await b.newPage({viewport:{width:375,height:667}});
await m.addInitScript(FAKE_VOICE);
await m.goto(BASE+'#/',{waitUntil:'networkidle'}); await m.waitForTimeout(900);
await clearCelebrations(m);
await m.getByRole('button',{name:/設定|Settings/}).first().click();
await m.waitForTimeout(800);
const reach=await m.evaluate(()=>{
  const d=document.querySelector('[role="dialog"][aria-modal="true"]');
  if(!d) return {ok:false,why:'沒有面板'};
  const panel=d.firstElementChild;
  if(!panel) return {ok:false,why:'沒有內容'};
  d.scrollTop = 0;
  const r=panel.getBoundingClientRect();
  // 捲到最上面之後，面板頂端不可以還在視窗上方（那一段捲不回去）
  return {ok: r.top >= -1, why: `面板頂端 ${Math.round(r.top)}px、可視高 ${window.innerHeight}px、面板高 ${Math.round(r.height)}px`};
});
ck('設定面板最上面那一列捲得到', reach.ok, reach.why);
await m.screenshot({path:`${SP}/p15-settings-375.png`,fullPage:false});
await m.keyboard.press('Escape');
await m.waitForTimeout(500);

await m.goto(BASE+'#/practice/b1-si-condicionales',{waitUntil:'networkidle'});
await m.waitForTimeout(1000);
await clearCelebrations(m);
const pad=await m.evaluate(()=>{
  const bs=[...document.querySelectorAll('main button[aria-label^="插入"]')];
  if(bs.length===0) return null;
  const sizes=bs.map(b=>{const r=b.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)};});
  return {
    n: bs.length,
    minW: Math.min(...sizes.map(s=>s.w)),
    minH: Math.min(...sizes.map(s=>s.h)),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
ck('字元列量得到', pad !== null, pad ? `${pad.n} 顆` : '找不到');
if (pad){
  ck('每顆按鍵至少 44px', pad.minW>=44 && pad.minH>=44, `最小 ${pad.minW}×${pad.minH}px`);
  ck('沒有把整頁撐出橫向捲動', !pad.overflow);
}
await m.screenshot({path:`${SP}/p15-charpad-375.png`,fullPage:false});
await m.close();

console.log('\n[7] 沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
