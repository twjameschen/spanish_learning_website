import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();

/* 容器裡沒有 TTS 語音，塞一個假的才驗得到喇叭那條路 */
const FAKE_VOICE = `
  const voice = { name: 'Test', lang: 'es-MX', default: false, localService: true, voiceURI: 't' };
  window.__spoken = [];
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { getVoices: () => [voice], speak: (u) => window.__spoken.push(u && u.text),
             cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {} },
  });
  window.SpeechSynthesisUtterance = class { constructor(t){ this.text = t; } };
`;

const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1100,height:1200}});
await p.addInitScript(FAKE_VOICE);
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

/* ------------------------------------------------------------------ *
 * 1. 動詞列表
 * ------------------------------------------------------------------ */
console.log('\n[1] 動詞列表');
await p.goto(BASE+'#/verbs',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
ck('列表載入且有 105 個動詞', (await p.locator('main ul li').count())===105,
   `${await p.locator('main ul li').count()} 列`);
ck('導覽把「動詞」標成目前所在',
   (await p.locator('nav a[aria-current="page"], aside a[aria-current="page"]').count())>0);

await p.getByRole('button',{name:'A0'}).first().click();
await p.waitForTimeout(400);
const a0=await p.locator('main ul li').count();
ck('等級篩得動', a0>0 && a0<105, `A0 有 ${a0} 個`);
await p.getByRole('button',{name:'A0'}).first().click();
await p.waitForTimeout(300);

/* ------------------------------------------------------------------ *
 * 2. 變位形式反查
 * ------------------------------------------------------------------ */
console.log('\n[2] 打變位形式查得到原形');
await p.getByRole('textbox',{name:/搜尋動詞|Search verbs/}).fill('fui');
await p.waitForTimeout(500);
let t=await T(p);
ck('fui 同時查到 ser 與 ir', /\bser\b/.test(t) && /\bir\b/.test(t),
   t.split('\n').filter(l=>/＝|=/.test(l)).slice(0,2).join(' / '));
ck('而且標出是哪個時態哪個人稱', /fui＝簡單過去式・我|fui = preterite/.test(t));

await p.getByRole('textbox',{name:/搜尋動詞|Search verbs/}).fill('llamo');
await p.waitForTimeout(500);
ck('反身動詞：打 llamo 找得到 llamarse', /llamarse/.test(await T(p)));

/* ------------------------------------------------------------------ *
 * 3. 單一動詞的完整變位表
 * ------------------------------------------------------------------ */
console.log('\n[3] 完整變位表');
await p.goto(BASE+'#/verbs/ser',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
const grid=await p.evaluate(()=>{
  const tbl=document.querySelector('main table');
  if(!tbl) return null;
  const body=tbl.querySelector('tbody');
  return { rows: body.querySelectorAll('tr').length,
           cells: body.querySelectorAll('td').length,
           head: tbl.querySelectorAll('thead th').length };
});
ck('主表有七個時態列', grid && grid.rows===7, grid ? `${grid.rows} 列` : '沒有表格');
ck('七個時態 × 五個人稱 = 35 格', grid && grid.cells===35, grid ? `${grid.cells} 格` : '');
ck('表頭是時態欄 + 五個人稱', grid && grid.head===6, grid ? `${grid.head} 欄` : '');

t=await T(p);
ck('印的是資料裡的不規則形式，不是規則推出來的', /\bfui\b/.test(t) && !/\bseí\b/.test(t));
ck('過去分詞與現在分詞都在', /sido/.test(t) && /siendo/.test(t));
ck('命令式在', /命令式|Imperative/.test(t));
ck('連得到練過這個動詞的課', /練過這個動詞的課|Lessons that drill/.test(t));

await p.evaluate(()=>{ window.__spoken = []; });
await p.locator('main table tbody td button[aria-label^="播放"]').first().click();
await p.waitForTimeout(300);
const spoken=await p.evaluate(()=>window.__spoken);
ck('點格子會把那個形式送去唸', spoken.length===1 && spoken[0].length>0, JSON.stringify(spoken));
await p.screenshot({path:`${SP}/p16-verb-ser.png`,fullPage:true});

/* haber 沒有命令式 —— 整區不該出現（不補、不編） */
await p.goto(BASE+'#/verbs/haber',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
ck('沒有命令式的動詞不會印出空的命令式區塊',
   !/命令式|Imperative/.test(await T(p)));

/* 找不到的 id */
await p.goto(BASE+'#/verbs/zzzzz',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
t=await T(p);
ck('找不到的 id 給錯誤畫面與回列表的出口',
   /找不到這個動詞|No such verb/.test(t) && /zzzzz/.test(t));

/* ------------------------------------------------------------------ *
 * 4. 單字表的動詞卡連得過來
 * ------------------------------------------------------------------ */
console.log('\n[4] 從單字表進來');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
await p.getByRole('textbox',{name:/搜尋|Search/}).first().fill('fui');
await p.waitForTimeout(600);
t=await T(p);
ck('單字表打 fui 也查得到 ser 與 ir', /\bser\b/.test(t) && /\bir\b/.test(t));
const link=p.getByRole('link',{name:/看全部 7 個時態|See all seven tenses/}).first();
ck('動詞卡有「看全部時態」的入口', await link.count()>0);
if (await link.count()){
  await link.click();
  await p.waitForTimeout(800);
  ck('點下去真的到動詞頁', /#\/verbs\//.test(p.url()), p.url().split('#')[1]);
}

/* ------------------------------------------------------------------ *
 * 5. 375px：變位表自己橫捲，不把整頁撐寬
 * ------------------------------------------------------------------ */
console.log('\n[5] 375px 的變位表');
const m=await b.newPage({viewport:{width:375,height:667}});
await m.addInitScript(FAKE_VOICE);
await m.goto(BASE+'#/verbs/hablar',{waitUntil:'networkidle'});
await m.waitForTimeout(900);
const narrow=await m.evaluate(()=>{
  const tbl=document.querySelector('main table');
  const box=tbl.closest('div');
  return { pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
           tableScrolls: box.scrollWidth > box.clientWidth + 1,
           tableW: Math.round(tbl.getBoundingClientRect().width) };
});
ck('整頁沒有被表格撐寬', !narrow.pageOverflow);
ck('表格自己橫捲', narrow.tableScrolls, `表寬 ${narrow.tableW}px`);
await m.screenshot({path:`${SP}/p16-verb-375.png`});
await m.close();

console.log('\n[6] 沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
