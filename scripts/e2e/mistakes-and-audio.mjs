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

/* 容器裡沒有任何 TTS 語音，塞一個假的進去才驗得到喇叭按鈕那條路徑 */
const FAKE_VOICE = `
  const voice = { name: 'Test', lang: 'es-MX', default: false, localService: true, voiceURI: 't' };
  window.__spoken = [];
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [voice],
      speak: (u) => window.__spoken.push(u && u.text),
      cancel: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
    },
  });
  window.SpeechSynthesisUtterance = class { constructor(t){ this.text = t; } };
`;

const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1000,height:1300}});
await p.addInitScript(FAKE_VOICE);
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

/* ------------------------------------------------------------------ *
 * 1. 錯題本
 * ------------------------------------------------------------------ */
console.log('\n[1] 錯題本');
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
ck('一開始沒有錯題，首頁不顯示入口', !/錯題本/.test(await T(p)));

// 故意把 a0-genero 的前三題全部答錯
await p.goto(BASE+'#/practice/a0-genero',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
let wrongDone=0;
for (let guard=0; guard<40 && wrongDone<3; guard++){
  const next=p.getByRole('button',{name:/^下一題|^完成/});
  if (await next.count()){ await next.first().click(); await p.waitForTimeout(350); continue; }
  // 陰陽性分類：一路按 el，八個字裡一定有錯的
  const el=p.getByRole('button',{name:/^el$/});
  if (await el.count()){
    for (let k=0;k<10 && await el.count();k++){ await el.first().click().catch(()=>{}); await p.waitForTimeout(120); }
    await p.waitForTimeout(400); wrongDone++; continue;
  }
  // 四選一：直接看答案不存在，選一個再說
  const giveUp=p.getByRole('button',{name:/直接看答案/});
  if (await giveUp.count()){ await giveUp.first().click(); await p.waitForTimeout(500); wrongDone++; continue; }
  const opts=p.locator('main ol li button, main ul li button');
  if (await opts.count()){ await opts.first().click(); await p.waitForTimeout(500); wrongDone++; continue; }
  break;
}
ck('作答了幾題', wrongDone>=3, `${wrongDone} 題`);

await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
let t=await T(p);
ck('首頁出現錯題本入口', /錯題本/.test(t), t.split('\n').find(l=>/還沒答對/.test(l))??'');
const shown=Number((t.match(/(\d+) 題還沒答對/)??[])[1] ?? 0);
ck('入口顯示題數', shown>0, `${shown} 題`);
await p.screenshot({path:`${SP}/p12-home-mistakes.png`,fullPage:true});

await p.getByRole('link',{name:/錯題本/}).first().click();
await p.waitForTimeout(900);
t=await T(p);
ck('進得去錯題本', /錯題本/.test(t));
ck('題數跟首頁對得上', new RegExp(`${shown} 題還沒答對過`).test(t), t.split('\n').slice(0,4).join(' / '));
await p.screenshot({path:`${SP}/p12-mistakes-drill.png`,fullPage:true});

/* ------------------------------------------------------------------ *
 * 2. 喇叭按鈕
 * ------------------------------------------------------------------ */
console.log('\n[2] 單字與例句都能點來聽');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
await p.getByRole('textbox',{name:/搜尋/}).fill('café');
await p.waitForTimeout(500);
const speakers=p.locator('main button[aria-label^="播放"]');
ck('單字卡有喇叭按鈕', await speakers.count()>=2, `${await speakers.count()} 顆`);

// 搜尋也會比對例句，所以第一張卡不一定是 café —— 直接跟那張卡自己的西文比對
const card=p.locator('main article').first();
const headword=(await card.locator('h3[lang="es"]').innerText()).trim();
await p.evaluate(()=>{ window.__spoken = []; });
await card.locator('button[aria-label^="播放"]').first().click();
await p.waitForTimeout(300);
let spoken=await p.evaluate(()=>window.__spoken);
ck('點了真的送出去唸', spoken.length===1, JSON.stringify(spoken));
ck('唸的就是那張卡上的西班牙文', spoken[0]===headword, `唸了「${spoken[0]}」，卡片是「${headword}」`);

// 例句那一顆唸的是例句，不是單字
const example=(await card.locator('p[lang="es"]').first().innerText()).trim();
await p.evaluate(()=>{ window.__spoken = []; });
await card.locator('button[aria-label^="播放"]').nth(1).click();
await p.waitForTimeout(300);
spoken=await p.evaluate(()=>window.__spoken);
ck('例句的喇叭唸的是例句', spoken[0]===example, `唸了「${spoken[0]}」，例句是「${example}」`);
await p.screenshot({path:`${SP}/p12-vocab-speak.png`,fullPage:true});

await p.goto(BASE+'#/lessons/a1-gustar',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
ck('課文例句也有喇叭', await p.locator('main button[aria-label^="播放"]').count()>5,
   `${await p.locator('main button[aria-label^="播放"]').count()} 顆`);

/* ------------------------------------------------------------------ *
 * 3. 西文字元列
 * ------------------------------------------------------------------ */
console.log('\n[3] 西文字元列');
await p.goto(BASE+'#/practice/b1-si-condicionales',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
await clearCelebrations(p);
ck('聽力題有字元列', await p.getByRole('button',{name:'插入 ñ'}).count()===1);
ck('九個字元都在', await p.locator('main button[aria-label^="插入"]').count()===9);

const inp=p.locator('main input[type="text"]').first();
await inp.fill('ano');
await inp.evaluate((el)=>el.setSelectionRange(2,2));   // a n | o
await p.getByRole('button',{name:'插入 ñ'}).click();
await p.waitForTimeout(300);
ck('插在游標位置，不是接在最後', await inp.inputValue()==='anño', await inp.inputValue());
await p.getByRole('button',{name:'插入 í'}).click();
await p.waitForTimeout(300);
ck('連點兩個不會錯位', await inp.inputValue()==='anñío', await inp.inputValue());
ck('焦點回到輸入框', await inp.evaluate((el)=>el===document.activeElement));
await p.screenshot({path:`${SP}/p12-charpad.png`,fullPage:true});

await p.goto(BASE+'#/practice/a0-saludos',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
await clearCelebrations(p);
for (let i=0;i<12;i++){
  if (await p.getByRole('button',{name:'插入 ñ'}).count()) break;
  const next=p.getByRole('button',{name:/^下一題|^完成/});
  if (await next.count()){ await next.first().click(); await p.waitForTimeout(350); continue; }
  const opts=p.locator('main ol li button, main ul li button');
  if (await opts.count()){ await opts.first().click(); await p.waitForTimeout(400); continue; }
  break;
}
ck('翻譯題也有字元列', await p.getByRole('button',{name:'插入 ñ'}).count()===1);

console.log('\n[4] 頁面沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
