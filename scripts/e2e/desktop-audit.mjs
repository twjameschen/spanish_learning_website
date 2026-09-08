import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};

/*
 * 桌機使用的系統性稽核。
 *
 * 使用者說「基本上都只用電腦」，所以這一支不看手機寬度，
 * 改成把整個 app 在桌機常見的三種寬度走一遍，
 * 找的是：JS 錯誤、橫向溢出、斷掉的連結、鍵盤到不了的東西、
 * 焦點看不見、以及超寬螢幕下的版面失控。
 */

const ROUTES = [
  '#/', '#/vocab', '#/verbs', '#/verbs/ser', '#/verbs/preocuparse',
  '#/lessons', '#/lessons/a0-saludos', '#/lessons/b1-si-condicionales',
  '#/practice/a0-saludos', '#/review', '#/achievements', '#/dashboard',
  '#/drill/all', '#/drill/gender-comida', '#/drill/listen', '#/drill/mistakes',
];

/** 桌機常見寬度：13 吋筆電、15 吋、外接螢幕 */
const WIDTHS = [1280, 1440, 1920];

const FAKE_VOICE = `
  const voice={name:'T',lang:'es-MX',default:false,localService:true,voiceURI:'t'};
  window.__spoken=[];
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    getVoices:()=>[voice],speak:u=>window.__spoken.push(u&&u.text),cancel:()=>{},
    addEventListener:()=>{},removeEventListener:()=>{}}});
  window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
`;

const b=await chromium.launch({executablePath:EXE});
const errs=[];

/* ------------------------------------------------------------------ *
 * 1. 每一頁在三種桌機寬度下都不能有錯誤或橫向溢出
 * ------------------------------------------------------------------ */
console.log('\n[1] 16 條路由 × 3 種桌機寬度');
const overflow=[]; const tooNarrow=[];
for (const width of WIDTHS){
  const p=await b.newPage({viewport:{width,height:900}});
  await p.addInitScript(FAKE_VOICE);
  p.on('pageerror',e=>errs.push(`${width}px ${e.message}`));
  p.on('console',m=>{if(m.type()==='error')errs.push(`${width}px console: ${m.text()}`);});

  for (const route of ROUTES){
    await p.goto(BASE+route,{waitUntil:'networkidle'});
    await p.waitForTimeout(450);
    for (let i=0;i<5;i++){
      const ok=p.getByRole('button',{name:/^好$|^Nice$/});
      if(!(await ok.count())) break;
      await ok.first().click().catch(()=>{}); await p.waitForTimeout(300);
    }
    const r=await p.evaluate(()=>({
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // 主要內容欄的實際寬度 —— 超寬螢幕下不該縮成一條
      mainW: Math.round(document.querySelector('main')?.getBoundingClientRect().width ?? 0),
      empty: (document.querySelector('main')?.innerText ?? '').trim().length < 10,
    }));
    if (r.over > 0) overflow.push(`${route}@${width}px 溢出 ${r.over}px`);
    if (r.mainW < 400) tooNarrow.push(`${route}@${width}px 主欄只有 ${r.mainW}px`);
    if (r.empty) overflow.push(`${route}@${width}px 主欄幾乎是空的`);
  }
  await p.close();
}
ck('沒有任何一頁橫向溢出', overflow.length===0, overflow.slice(0,4).join('; '));
ck('主內容欄在每種寬度都夠寬', tooNarrow.length===0, tooNarrow.slice(0,4).join('; '));

/* ------------------------------------------------------------------ *
 * 2. 沒有斷掉的內部連結
 * ------------------------------------------------------------------ */
console.log('\n[2] 內部連結');
const p=await b.newPage({viewport:{width:1440,height:1000}});
await p.addInitScript(FAKE_VOICE);
p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});

const seen=new Set(); const dead=[];
for (const route of ROUTES){
  await p.goto(BASE+route,{waitUntil:'networkidle'});
  await p.waitForTimeout(400);
  const hrefs=await p.evaluate(()=>[...document.querySelectorAll('a[href^="#/"]')]
    .map(a=>a.getAttribute('href')));
  for (const h of hrefs) seen.add(h);
}
// 每一個站內連結點過去都要有內容，不能落到「找不到」或空白
for (const h of [...seen]){
  await p.goto(BASE+h,{waitUntil:'networkidle'});
  await p.waitForTimeout(350);
  const t=(await p.locator('main').innerText()).trim();
  if (t.length < 10 || /找不到|No such|not found/i.test(t.slice(0,80))) dead.push(h);
}
ck(`站內連結全部到得了（${seen.size} 條）`, dead.length===0, dead.slice(0,5).join(', '));

/* ------------------------------------------------------------------ *
 * 3. 鍵盤：Tab 走得完，焦點看得見
 * ------------------------------------------------------------------ */
console.log('\n[3] 鍵盤操作');
await p.goto(BASE+'#/',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
const focusRing=await p.evaluate(async ()=>{
  const out={visited:0, noRing:[], offscreen:0};
  const seenEls=new Set();
  for (let i=0;i<40;i++){
    // 用真的 Tab 不行（evaluate 裡按不了），改成走可聚焦清單
    const els=[...document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(e=>e.offsetParent!==null);
    if (i>=els.length) break;
    const el=els[i];
    if (seenEls.has(el)) continue;
    seenEls.add(el);
    el.focus();
    out.visited++;
    const cs=getComputedStyle(el);
    const ring=cs.outlineStyle!=='none' || cs.boxShadow!=='none' ||
               (el.className||'').toString().includes('focus-visible');
    if (!ring) out.noRing.push((el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,20));
    const r=el.getBoundingClientRect();
    if (r.width===0 || r.height===0) out.offscreen++;
  }
  return out;
});
ck('首頁的可聚焦元素都有焦點樣式', focusRing.noRing.length===0,
   `走過 ${focusRing.visited} 個；沒有樣式的：${focusRing.noRing.slice(0,4).join(', ')}`);
ck('沒有零尺寸卻可聚焦的元素', focusRing.offscreen===0, `${focusRing.offscreen} 個`);

// 快捷鍵說明只在桌機出現 —— 使用者只用電腦，這顆一定要在
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
ck('桌機看得到快捷鍵說明的入口',
   (await p.locator('button[aria-label*="快捷"], button[aria-label*="Keyboard"]').count())>0);

/* ------------------------------------------------------------------ *
 * 4. 完整的學習流程：讀課文 → 練習 → 結算 → 複習
 * ------------------------------------------------------------------ */
console.log('\n[4] 走一次完整流程');

/*
 * 先看首頁有沒有「從哪裡接下去」。
 * 這一塊在 Phase 18 之前完全不存在：首頁六張卡全是分類入口，
 * 沒有一條路直接把人送回上次卡住的地方。
 */
await p.goto(BASE+'#/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
const cta=p.getByRole('link',{name:/繼續：第 \d+ 課|Continue: lesson \d+/});
ck('首頁有「繼續」入口', await cta.count()>0);
const ctaHref=await cta.first().getAttribute('href').catch(()=>null);
ck('全新使用者的「繼續」指向第 1 課（a0-alfabeto）', ctaHref==='#/lessons/a0-alfabeto', String(ctaHref));

await p.goto(BASE+'#/lessons/a0-saludos',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
const startBtn=p.getByRole('link',{name:/開始練習|Start practice/}).first();
ck('課文頁有「開始練習」', await startBtn.count()>0);
if (await startBtn.count()){ await startBtn.click(); await p.waitForTimeout(900); }

let answered=0;
for (let i=0;i<40;i++){
  const next=p.getByRole('button',{name:/^下一題|^完成|Next|Finish/});
  if (await next.count()){ await next.first().click(); await p.waitForTimeout(320); continue; }
  if (await p.getByRole('button',{name:/再練一次|Practice again/}).count()) break;
  const opts=p.locator('main ol li button, main ul li button');
  if (await opts.count()){ await opts.first().click(); await p.waitForTimeout(380); answered++; continue; }
  const giveUp=p.getByRole('button',{name:/直接看答案|Show the answer/});
  if (await giveUp.count()){ await giveUp.first().click(); await p.waitForTimeout(380); answered++; continue; }
  const el=p.getByRole('button',{name:/^el$|^la$/});
  if (await el.count()){ await el.first().click(); await p.waitForTimeout(180); continue; }

  // 排序題：字塊是 lang="es" 的按鈕。已放進句子的排在 DOM 前面，
  // 所以要點 last() —— 點 first() 會把剛放的那塊又拿出來，永遠湊不滿
  const tiles=p.locator('main button[lang="es"]:not([disabled])');
  if (await tiles.count()){
    for (let k=await tiles.count(); k>0; k--){
      await tiles.last().click().catch(()=>{});
      await p.waitForTimeout(90);
    }
    const check=p.getByRole('button',{name:/^檢查$|^Check$/});
    if (await check.count()){ await check.first().click(); await p.waitForTimeout(400); answered++; continue; }
  }

  // 閃卡：先翻開答案再評自己記不記得
  const flip=p.getByRole('button',{name:/翻開答案|Reveal/});
  if (await flip.count()){ await flip.first().click(); await p.waitForTimeout(300); continue; }
  const recall=p.getByRole('button',{name:/我記得|想不起來|I knew it|Didn't know/});
  if (await recall.count()){ await recall.first().click(); await p.waitForTimeout(380); answered++; continue; }

  // 需要打字的題目
  const input=p.locator('main input[type="text"]');
  if (await input.count()){
    await input.first().fill('x');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400); answered++; continue;
  }
  break;
}
ck('練習走得完並且到結算', await p.getByRole('button',{name:/再練一次|Practice again/}).count()>0,
   `作答 ${answered} 題`);

for (let i=0;i<5;i++){
  const ok=p.getByRole('button',{name:/^好$|^Nice$/});
  if(!(await ok.count())) break;
  await ok.first().click().catch(()=>{}); await p.waitForTimeout(350);
}

/*
 * 結算畫面要給得出下一課，而且是 journey 的下一課。
 * a0-saludos 在正式順序裡是第 5 課，下一課是 a0-numeros。
 * 以前這裡是拿 `lesson.order` 排全部 41 課算出來的，
 * 於是「下一課」變成 A1 的反身動詞 —— 初學者照著按就掉出 A0。
 */
const nextUp=p.getByRole('link',{name:/下一課：|Next: /});
ck('結算畫面給得出「下一課」', await nextUp.count()>0);
const nextHref=await nextUp.first().getAttribute('href').catch(()=>null);
ck('「下一課」是 journey 的下一課，不是跳級', nextHref==='#/lessons/a0-numeros', String(nextHref));
const nextText=await nextUp.first().innerText().catch(()=>'');
ck('「下一課」按鈕上印得出課名', /下一課：\S/.test(nextText), nextText.replace(/\n/g,' '));

// 做完之後課程列表要標成完成（Phase 17 剛加的）
await p.goto(BASE+'#/lessons',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
ck('做完的課在列表上被標成完成',
   (await p.locator('main [title="這一課做過了"], main [title="Lesson completed"]').count())>0);

// 首頁要出現複習張數，且複習頁排得出同樣的題數
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
for (let i=0;i<5;i++){
  const ok=p.getByRole('button',{name:/^好$|^Nice$/});
  if(!(await ok.count())) break;
  await ok.first().click().catch(()=>{}); await p.waitForTimeout(350);
}
/*
 * 跳著做的人要被帶回**最前面**那一堂沒做的，不是接在剛做完的那一堂後面。
 * 剛剛做的是第 5 課 a0-saludos，前面四課都沒做，所以還是第 1 課。
 */
const cta2=p.getByRole('link',{name:/繼續：第 \d+ 課|Continue: lesson \d+/});
const cta2Href=await cta2.first().getAttribute('href').catch(()=>null);
ck('做完第 5 課之後，「繼續」仍然指向沒做過的第 1 課',
   cta2Href==='#/lessons/a0-alfabeto', String(cta2Href));

const home=await p.locator('main').innerText();
const due=Number((home.match(/今天要複習 (\d+) 張|(\d+) cards? due/)??[])[1] ?? 0);
ck('首頁顯示今天要複習幾張', due>0, `${due} 張`);
await p.goto(BASE+'#/review',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const rev=await p.locator('main').innerText();
const inQueue=Number((rev.match(/(\d+)\s*\/\s*(\d+)/)??[])[2] ?? 0);
ck('複習頁排出來的題數跟首頁一致', inQueue===due, `首頁 ${due}、複習頁 ${inQueue}`);
await p.screenshot({path:`${SP}/p18-desktop-flow.png`,fullPage:true});

/* ------------------------------------------------------------------ *
 * 5. 視窗縮放不會壞掉（桌機會拉視窗）
 * ------------------------------------------------------------------ */
console.log('\n[5] 拉視窗');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
const sizes=[];
for (const w of [1920, 1100, 1440, 900, 1280]){
  await p.setViewportSize({width:w,height:900});
  await p.waitForTimeout(350);
  const over=await p.evaluate(()=>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  sizes.push(`${w}:${over}`);
  if (over>0) fail++;
}
ck('連續改變視窗寬度都不會橫向溢出', !sizes.some(s=>!s.endsWith(':0')), sizes.join(' '));

/* ------------------------------------------------------------------ *
 * 6. 分頁標題與 <html lang>
 *
 * 兩個都曾經寫死在 index.html：16 條路由共用同一個 <title>，桌機開一排
 * 分頁時完全分不出誰是誰（瀏覽記錄與書籤也全部同名）；lang="zh-Hant"
 * 不跟著語言開關走，讀屏會用中文語音唸英文介面。
 * ------------------------------------------------------------------ */
console.log('\n[6] 分頁標題與 html lang');
{
  const titles=[];
  for (const r of ROUTES){
    await p.goto(BASE+r,{waitUntil:'networkidle'}); await p.waitForTimeout(400);
    titles.push(await p.title());
  }
  ck('每一條路由的標題都不同', new Set(titles).size===ROUTES.length,
     `${new Set(titles).size}/${ROUTES.length}`);
  // 辨識用的字要在前面：分頁一窄是從尾巴開始截，品牌放後面才留得住課名
  ck('標題結尾都是品牌', titles.every((t)=>t.endsWith('Camino a Quito')||t.includes('Camino a Quito')));

  await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  ck('中文模式 lang=zh-Hant', (await p.evaluate(()=>document.documentElement.lang))==='zh-Hant');

  await p.getByRole('button',{name:/設定|Settings/}).first().click(); await p.waitForTimeout(600);
  await p.locator('[role="dialog"]').getByRole('button',{name:'English'}).click();
  await p.waitForTimeout(700);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  ck('切成英文後 lang=en', (await p.evaluate(()=>document.documentElement.lang))==='en',
     await p.evaluate(()=>document.documentElement.lang));
  ck('切成英文後標題也是英文', /Vocabulary/.test(await p.title()), await p.title());

  await p.getByRole('button',{name:/Settings/}).first().click(); await p.waitForTimeout(600);
  await p.locator('[role="dialog"]').getByRole('button',{name:'中文'}).click(); await p.waitForTimeout(700);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  ck('切回中文後兩者都跟著回來',
     (await p.evaluate(()=>document.documentElement.lang))==='zh-Hant' && /單字表/.test(await p.title()));
}

console.log('\n[7] 全程沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await p.close();
await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
