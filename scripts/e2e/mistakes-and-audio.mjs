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

/* ------------------------------------------------------------------ *
 * 4. 語音偵測只問一次（單字表一頁 1456 顆喇叭）
 * ------------------------------------------------------------------ */
console.log('\n[4] 語音偵測只問一次');
const q=await b.newPage({viewport:{width:1000,height:1300}});
// 這一頁的 getVoices() 故意先回空陣列 —— 那才會走到「掛監聽器等」那條路
await q.addInitScript(`
  window.__listeners = 0;
  const voice = { name: 'Late', lang: 'es-MX', default: false, localService: true, voiceURI: 'l' };
  let ready = false;
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => (ready ? [voice] : []),
      speak: () => {}, cancel: () => {},
      addEventListener: () => { window.__listeners += 1; },
      removeEventListener: () => {},
    },
  });
  window.SpeechSynthesisUtterance = class { constructor(t){ this.text = t; } };
`);
await q.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
await q.waitForTimeout(1500);
const cards=await q.locator('main article').count();
const listeners=await q.evaluate(()=>window.__listeners);
ck('單字表一次渲染很多張卡', cards>500, `${cards} 張`);
ck('整頁只掛一個 voiceschanged 監聽器', listeners===1,
   `${listeners} 個（卡片 ${cards} 張，每張兩顆喇叭）`);
await q.close();

/* ------------------------------------------------------------------ *
 * 5. 首頁的複習張數 = 複習頁實際排出來的題數
 * ------------------------------------------------------------------ */
console.log('\n[5] 複習張數與佇列同源');
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
await clearCelebrations(p);
t=await T(p);
const dueShown=Number((t.match(/今天要複習 (\d+) 張/)??[])[1] ?? 0);
ck('首頁顯示今天要複習幾張', dueShown>0, `${dueShown} 張`);
await p.goto(BASE+'#/review',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
await clearCelebrations(p);
t=await T(p);
const queueLen=Number((t.match(/(\d+)\s*\/\s*(\d+)/)??[])[2] ?? (t.match(/共 (\d+) 題/)??[])[1] ?? 0);
ck('複習頁排出來的題數跟首頁一樣', queueLen===dueShown, `首頁 ${dueShown}、複習頁 ${queueLen}`);

/* ------------------------------------------------------------------ *
 * 6. 匯出 → 作答 → 匯入，不重新整理就回到匯出當時的數字
 * ------------------------------------------------------------------ */
console.log('\n[6] 匯入備份立刻生效');
// 首頁不印 totalXp，只印「Lv. N」與「等級內 XP / 等級跨距」；
// 而且答錯不給 XP，這支腳本前面刻意全答錯，所以等級卡根本不會出現。
// 真正會隨著作答動的看得到的數字是「錯題本 N 題」與「今天要複習 N 張」，
// 這兩個都直接讀自 progress store，拿它們當進度的觀測點。
const levelLine = async () => {
  const txt=await T(p);
  const m=txt.match(/Lv\. \d+\s*\n?\s*\d+ \/ \d+ XP/);
  return m ? m[0].replace(/\s+/g,' ') : '(沒有等級卡)';
};
const progressLine = async () => {
  const txt=await T(p);
  const wrong=(txt.match(/(\d+) 題還沒答對/)??[])[1] ?? '0';
  const due=(txt.match(/今天要複習 (\d+) 張/)??[])[1] ?? '0';
  return `錯題 ${wrong} 題、複習 ${due} 張`;
};
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
const xpBefore=await progressLine();
ck('首頁讀得到進度數字', xpBefore!=='錯題 0 題、複習 0 張', xpBefore);

// 匯出：檔案下載在無頭環境要用 download 事件接
const dl=p.waitForEvent('download');
await p.getByRole('button',{name:/^匯出/}).first().click();
const file=`${SP}/e2e-backup.json`;
await (await dl).saveAs(file);
ck('匯出真的產生檔案', (await import('node:fs')).existsSync(file));

// 再作答一輪，把 XP 推高
await p.goto(BASE+'#/practice/a0-numeros',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
for (let i=0;i<10;i++){
  const next=p.getByRole('button',{name:/^下一題|^完成/});
  if (await next.count()){ await next.first().click(); await p.waitForTimeout(300); continue; }
  const opts=p.locator('main ol li button, main ul li button');
  if (await opts.count()){ await opts.first().click(); await p.waitForTimeout(400); continue; }
  const giveUp=p.getByRole('button',{name:/直接看答案/});
  if (await giveUp.count()){ await giveUp.first().click(); await p.waitForTimeout(400); continue; }
  break;
}
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
const xpAfter=await progressLine();
ck('作答之後進度變了', xpAfter!==xpBefore, `${xpBefore} → ${xpAfter}`);

// 匯入剛才那份，**不重新整理**
await p.locator('input[type="file"]').setInputFiles(file);
await p.waitForTimeout(1200);
t=await T(p);
ck('顯示匯入成功', /已匯入/.test(t), t.split('\n').find(l=>/匯入/.test(l))??'');
const xpBack=await progressLine();
ck('不重新整理，進度就回到匯出當時', xpBack===xpBefore,
   `匯出當時「${xpBefore}」、匯入後「${xpBack}」`);

// 真正會吃掉資料的那一半：匯入後再作答，寫回去的要是新資料
await p.goto(BASE+'#/practice/a0-numeros',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
for (let i=0;i<3;i++){
  const next=p.getByRole('button',{name:/^下一題|^完成/});
  if (await next.count()){ await next.first().click(); await p.waitForTimeout(300); continue; }
  const opts=p.locator('main ol li button, main ul li button');
  if (await opts.count()){ await opts.first().click(); await p.waitForTimeout(400); continue; }
  break;
}
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(900);
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
const xpFinal=await progressLine();
// 匯入之後又作答了 3 題，所以最後不該等於「匯入前那份被丟掉的舊進度」，
// 也不該原封不動等於匯出當時 —— 它必須是「匯出當時 + 那 3 題」
ck('重新整理後沒有跳回被匯入蓋掉的舊進度', xpFinal!==xpAfter,
   `匯出當時「${xpBefore}」、被蓋掉的舊進度「${xpAfter}」、最後「${xpFinal}」`);
await p.screenshot({path:`${SP}/p14-import.png`,fullPage:true});

/* ------------------------------------------------------------------ *
 * 7. 快照還原走得完兩段式確認
 * ------------------------------------------------------------------ */
console.log('\n[7] 快照還原');
// 種一份「前一天」的快照：內容是現在的進度，但 XP 改成 12345，
// 還原成功與否用這個一眼就看得出來的數字判斷
// 資料層是 IndexedDB（camino-a-quito / kv，key 前綴 camino:），
// 快照 body 裡的 data 用的是**去掉前綴**的 key
const seeded = await p.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('camino-a-quito', 1);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const read = (k) => new Promise((res, rej) => {
    const r = db.transaction('kv', 'readonly').objectStore('kv').get(k);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const write = (k, v) => new Promise((res, rej) => {
    const r = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
    r.onsuccess = () => res(true); r.onerror = () => rej(r.error);
  });
  const raw = await read('camino:progress');
  if (!raw) return 'no progress key';
  const parsed = JSON.parse(raw);
  parsed.state.totalXp = 12345;
  await write('camino:snapshot:2020-01-01', {
    savedAt: '2020-01-01T00:00:00.000Z',
    data: { progress: JSON.stringify(parsed) },
  });
  return 'ok';
});
ck('種得進一份昨天的快照', seeded==='ok', seeded);
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1200);
await clearCelebrations(p);
t=await T(p);
ck('快照列出現昨天那一份', /2020-01-01/.test(t), t.split('\n').filter(l=>/2020|快照/.test(l)).join(' / '));

const rows=p.locator('main li').filter({hasText:'2020-01-01'});
ck('那一列有還原按鈕', await rows.getByRole('button',{name:/^還原$/}).count()===1);
await rows.getByRole('button',{name:/^還原$/}).click();
await p.waitForTimeout(400);
ck('第一次點只出現確認', /確定要還原到 2020-01-01/.test(await T(p)));
const beforeRestore=await levelLine();
await p.screenshot({path:`${SP}/p14-snapshot-confirm.png`,fullPage:true});

await p.locator('main li').filter({hasText:'2020-01-01'})
  .getByRole('button',{name:/確定還原/}).click();
await p.waitForTimeout(1200);
t=await T(p);
ck('確認之後才還原', /已還原/.test(t), t.split('\n').find(l=>/已還原/.test(l))??'');
const afterRestore=await levelLine();
ck('不重新整理，等級就跟著快照變了', afterRestore!==beforeRestore,
   `還原前「${beforeRestore}」、還原後「${afterRestore}」`);
// 再重新整理一次：store 與儲存層要一致，否則就是只改了畫面沒改資料（或反過來）
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1200);
await clearCelebrations(p);
ck('重新整理後還是同一個值，store 與儲存層一致', (await levelLine())===afterRestore,
   `還原後「${afterRestore}」、重新整理後「${await levelLine()}」`);
await p.screenshot({path:`${SP}/p14-snapshot-restored.png`,fullPage:true});

console.log('\n[8] 頁面沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
