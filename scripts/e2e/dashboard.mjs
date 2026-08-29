import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();
async function clear(p){for(let i=0;i<8;i++){if(!(await p.locator('[role="dialog"]').count()))return;
  await p.getByRole('button',{name:/^好$|^Nice$/}).first().click().catch(()=>{});await p.waitForTimeout(350);}}
const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1100,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

console.log('\n[1] 空狀態：沒有資料時不該畫空座標軸');
await p.goto(BASE+'#/dashboard',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
let t=await T(p);
ck('頁面標題', /學習統計/.test(t));
ck('概況磚出現六個', (await p.locator('main ul > li').count())>=6);
ck('沒有資料時顯示空狀態', /還沒有練習紀錄/.test(t));
ck('雷達提示需要更多詞性', /至少要有三種詞性|再練幾種詞性/.test(t));
ck('熱力圖有畫出來', (await p.locator('main [role="img"]').count())>0);
await p.screenshot({path:`${SP}/p6-empty.png`,fullPage:true});

console.log('\n[2] 單字閃卡會建立單字卡，儀表板才有資料');
await p.goto(BASE+'#/lessons/a0-hay',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
let tt=await T(p);
ck('課文頁有單字閃卡入口', /練這一課的單字/.test(tt));
await p.getByRole('link',{name:/練這一課的單字/}).click(); await p.waitForTimeout(800);
tt=await T(p);
ck('閃卡頁載入', /單字閃卡/.test(tt), tt.match(/\d+\/\d+/)?.[0]??'');
// 走完整輪閃卡：翻面 → 自評
for (let i=0;i<60;i++){
  const done=p.getByRole('button',{name:/^完成/});
  if (await done.count()) { await done.first().click(); await p.waitForTimeout(900); break; }
  const next=p.getByRole('button',{name:/^下一題/});
  if (await next.count()) { await next.first().click(); await p.waitForTimeout(200); continue; }
  // 閃卡：先翻面，再按「記得」（按「忘了」會拿 0 XP，折線圖就沒資料可畫）
  const reveal=p.getByRole('button',{name:/翻開答案|Reveal/});
  if (await reveal.count()) { await reveal.first().click(); await p.waitForTimeout(200); continue; }
  const knew=p.getByRole('button',{name:/我記得|I knew it/});
  if (await knew.count()) { await knew.first().click(); await p.waitForTimeout(200); continue; }
  const buttons=p.locator('main button:not([disabled])');
  if (!(await buttons.count())) break;
  await buttons.first().click().catch(()=>{});
  await p.waitForTimeout(200);
}
await clear(p);

await p.goto(BASE+'#/dashboard',{waitUntil:'networkidle'}); await p.waitForTimeout(1400);
await clear(p);
t=await T(p);
const answered=Number((t.match(/(\d+)\s*\n\s*累計題數/)||[])[1]??0);
ck('累計題數 > 0', answered>0, String(answered));
const seen=Number((t.match(/(\d+)\s*\n\s*接觸過的字/)||[])[1]??0);
ck('接觸過的字 > 0（單字卡有建立）', seen>0, String(seen));
ck('XP 折線畫出來了', (await p.locator('main .recharts-line').count())>0);
ck('題型正確率有列出', /各題型正確率/.test(t) && /%/.test(t));
const weakItems=await p.locator('main ol > li').count();
ck('最弱清單有項目', weakItems>0, `${weakItems} 個`);
await p.screenshot({path:`${SP}/p6-data.png`,fullPage:true});

console.log('\n[3] 匯出匯入在儀表板上');
ck('備份區塊在', /備份與還原/.test(t));
ck('匯出鍵在', (await p.getByRole('button',{name:/匯出/}).count())>0);
ck('匯入鍵在', (await p.getByRole('button',{name:/匯入/}).count())>0);

console.log('\n[4] 手機底部列六個項目');
await p.setViewportSize({width:360,height:740});
await p.goto(BASE+'#/dashboard',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clear(p);
const measure=()=>p.locator('nav.fixed.bottom-0 a').evaluateAll(els=>els.map(e=>{
  const s=e.querySelector('span'); return {t:e.innerText,sw:s?s.scrollWidth:0,cw:s?s.clientWidth:0};}));
let boxes=await measure();
ck('底部列六個項目', boxes.length===6, boxes.map(b=>b.t).join('/'));
ck('中文不截斷', boxes.every(b=>b.sw<=b.cw+1), boxes.filter(b=>b.sw>b.cw+1).map(b=>b.t).join(','));
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click(); await p.waitForTimeout(600);
boxes=await measure();
ck('英文不截斷', boxes.every(b=>b.sw<=b.cw+1), boxes.map(b=>`${b.t}:${b.sw}/${b.cw}`).join(', '));
await p.screenshot({path:`${SP}/p6-phone.png`,fullPage:true});

console.log('\n[5] 英文切換後圖表標籤也換');
await p.setViewportSize({width:1100,height:1200});
await p.goto(BASE+'#/dashboard',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
t=await T(p);
const zh=(t.match(/[一-鿿]/g)||[]).length;
ck('英文模式下沒有中文殘留', zh===0, zh?`殘留：${(t.match(/[一-鿿]+/g)||[]).slice(0,6).join(',')}`:'');
ck('英文標題', /Your progress/.test(t));
await p.screenshot({path:`${SP}/p6-en.png`,fullPage:true});

console.log('\n[6] 深色模式');
await p.emulateMedia({colorScheme:'dark'});
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1200);
await p.screenshot({path:`${SP}/p6-dark.png`,fullPage:true});
ck('深色模式無錯誤', true);

ck('全程沒有 JS 例外', errs.length===0, errs.slice(0,3).join(' | '));
console.log(`\n${fail===0?'全部通過':`${fail} 項失敗`}`);
await b.close(); process.exit(fail?1:0);
