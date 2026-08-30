import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();
async function clearCelebrations(p){
  for (let i=0;i<8;i++){
    if (!(await p.locator('[role="dialog"]').count())) return;
    await p.getByRole('button',{name:/^好$|^Nice$/}).first().click().catch(()=>{});
    await p.waitForTimeout(400);
  }
}

const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1000,height:1400}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

/* ------------------------------------------------------------------ *
 * 1. 首頁入口
 * ------------------------------------------------------------------ */
console.log('\n[1] 首頁的連續聽寫入口');
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
let t=await T(p);
ck('首頁出現「連續聽寫」卡片', /連續聽寫/.test(t));
ck('卡片說明講出題庫句數', /\d{3} 句整句聽寫/.test(t), t.match(/\d{3} 句整句聽寫/)?.[0]??'');
const card=p.locator('main a[href*="#/drill/listen"]');
ck('卡片連到 #/drill/listen', await card.count()===1);
await p.screenshot({path:`${SP}/p9-home-card.png`,fullPage:true});
await card.first().click(); await p.waitForTimeout(900);

/* ------------------------------------------------------------------ *
 * 2. 整段聽寫：12 句，容器內沒有語音所以走抄寫路徑
 * ------------------------------------------------------------------ */
console.log('\n[2] 整段連續聽寫');
t=await T(p);
ck('標題是連續聽寫', /連續聽寫/.test(t), t.split('\n').slice(0,3).join(' / '));
ck('說明講的是整段旅程', /橫跨整段旅程/.test(t));
ck('一場 12 題', /1\/12/.test(t), t.match(/\d+\/\d+/)?.[0]??'');
ck('回上一頁是回首頁', await p.locator('main a[href="#/"]').count()>0
   || /首頁/.test((await p.locator('main a').first().innerText())));
ck('容器沒有語音，改成抄寫', /照著下面的句子打一次/.test(t));
await p.screenshot({path:`${SP}/p9-listen-drill.png`,fullPage:true});

// 連做三題：照著畫面上的句子打，去掉重音與逗號都該判對
const strip=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/,/g,'').replace(/ñ/g,'n');
const sentences=[];
for (let i=0;i<3;i++){
  const es=(await p.locator('main p[lang="es"]').first().innerText()).trim();
  sentences.push(es);
  const inp=p.locator('main input[type="text"]').first();
  await inp.fill(strip(es));
  await inp.press('Enter');
  await p.waitForTimeout(600);
  const after=await T(p);
  ck(`第 ${i+1} 題：去重音去逗號仍判對`, /答對了/.test(after),
     `${es} → ${strip(es)}`);
  ck(`第 ${i+1} 題有解釋`, after.length>120);
  await p.getByRole('button',{name:/^下一題/}).first().click();
  await p.waitForTimeout(500);
}
ck('三題是三個不同的句子', new Set(sentences).size===3);
ck('每一句都是完整的句子', sentences.every(s=>/[.!?]$/.test(s)||/^[¿¡]/.test(s)), sentences.join(' | '));
await p.screenshot({path:`${SP}/p9-listen-answered.png`,fullPage:true});

/* ------------------------------------------------------------------ *
 * 3. 課程頁的分段入口
 * ------------------------------------------------------------------ */
console.log('\n[3] 課程頁每一段的聽力入口');
await p.goto(BASE+'#/lessons',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
const legs=p.locator('main a[href*="#/drill/listen-"]');
const legCount=await legs.count();
ck('已開放的段落有聽力入口', legCount>=1, `${legCount} 個`);
const hrefs=await legs.evaluateAll(as=>as.map(a=>a.getAttribute('href')));
ck('台北那一段沒有入口（例句湊不滿一場）', !hrefs.some(h=>h?.includes('listen-taipei')), hrefs.join(' '));
await p.screenshot({path:`${SP}/p9-lessons-legs.png`,fullPage:true});

await legs.first().click(); await p.waitForTimeout(900);
t=await T(p);
ck('分段聽寫的說明帶到城市名', /「.+」這一段的 12 句/.test(t), t.split('\n').slice(0,4).join(' / '));
ck('分段也是 12 題', /1\/12/.test(t));
ck('回上一頁是回課程', /課程/.test(await p.locator('main a').first().innerText()));

/* ------------------------------------------------------------------ *
 * 4. 每天同一批、不同段落不同批
 * ------------------------------------------------------------------ */
console.log('\n[4] 每天固定一批');
const first=async()=>(await p.locator('main p[lang="es"]').first().innerText()).trim();
const quito=await (async()=>{ await p.goto(BASE+'#/drill/listen-quito',{waitUntil:'networkidle'}); await p.waitForTimeout(800); await clearCelebrations(p); return first(); })();
const cuenca=await (async()=>{ await p.goto(BASE+'#/drill/listen-cuenca',{waitUntil:'networkidle'}); await p.waitForTimeout(800); await clearCelebrations(p); return first(); })();
const quitoAgain=await (async()=>{ await p.goto(BASE+'#/drill/listen-quito',{waitUntil:'networkidle'}); await p.waitForTimeout(800); await clearCelebrations(p); return first(); })();
ck('同一段重新進來是同一句', quito===quitoAgain, `${quito} vs ${quitoAgain}`);
ck('不同段是不同的句子', quito!==cuenca, `${quito} vs ${cuenca}`);

console.log('\n[5] 頁面沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
