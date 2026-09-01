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

/*
 * 容器裡沒有任何 TTS 語音，所以求助按鈕預設不會出現（有語音才需要求助）。
 * 這裡塞一個假的西班牙文語音進去，才驗得到有語音時的那條路徑。
 * speak() 本身不需要真的發出聲音 —— 測的是 UI 流程，不是音訊。
 */
const FAKE_VOICE = `
  const voice = { name: 'Test Sabina', lang: 'es-MX', default: false, localService: true, voiceURI: 'test' };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [voice],
      speak: () => {}, cancel: () => {},
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
 * 1. 有語音時的求助階梯
 * ------------------------------------------------------------------ */
console.log('\n[1] 聽力題的求助階梯');
await p.goto(BASE+'#/practice/b1-si-condicionales',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
let t=await T(p);
ck('有語音時走的是聽力路徑，不是抄寫', /聽完後把句子打出來/.test(t), t.split('\n')[2]??'');
ck('播放與放慢兩顆都在', await p.getByRole('button',{name:'播放'}).count()===1
   && await p.getByRole('button',{name:/放慢/}).count()===1);
ck('兩顆求助按鈕都在', await p.getByRole('button',{name:/看中文意思/}).count()===1
   && await p.getByRole('button',{name:/直接看答案/}).count()===1);
ck('還沒求助前，西文答案沒有洩漏', !/Si tuviera tiempo, iría a Galápagos/.test(t));
ck('還沒求助前，翻譯也沒有洩漏', !/如果我有時間/.test(t));
await p.screenshot({path:`${SP}/p10-listen-help.png`,fullPage:true});

await p.getByRole('button',{name:/看中文意思/}).click();
await p.waitForTimeout(400);
t=await T(p);
ck('按了之後翻譯出現', /如果我有時間/.test(t), t.split('\n').find(l=>/如果我有時間/.test(l))??'');
ck('但西文還是要自己拼', !/Si tuviera tiempo, iría a Galápagos/.test(t));
ck('「看中文意思」按過就收起來', await p.getByRole('button',{name:/看中文意思/}).count()===0);
ck('「直接看答案」還在', await p.getByRole('button',{name:/直接看答案/}).count()===1);
await p.screenshot({path:`${SP}/p10-listen-hinted.png`,fullPage:true});

const inp=p.locator('main input[type="text"]').first();
await inp.fill('Si tuviera tiempo iria a Galapagos');
await inp.press('Enter');
await p.waitForTimeout(700);
t=await T(p);
ck('看了意思之後答對仍然算對', /答對了/.test(t));
ck('但有講明「看過意思」，排程會提早再遇到', /看過意思/.test(t),
   t.split('\n').find(l=>/看過意思/.test(l))??'');
ck('作答後求助按鈕消失', await p.getByRole('button',{name:/直接看答案/}).count()===0);
await p.screenshot({path:`${SP}/p10-listen-hint-correct.png`,fullPage:true});

console.log('\n[2] 直接看答案');
await p.goto(BASE+'#/practice/a0-ser-estar',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
ck('第一題是聽力題', /聽完後把句子打出來/.test(await T(p)));
await p.getByRole('button',{name:/直接看答案/}).click();
await p.waitForTimeout(700);
t=await T(p);
ck('算答錯', /答錯了/.test(t));
ck('整句西文印出來了', /Soy estudiante y estoy cansado/.test(t));
ck('也說明了為什麼算錯', /看了答案/.test(t), t.split('\n').find(l=>/看了答案/.test(l))??'');
await p.screenshot({path:`${SP}/p10-listen-gaveup.png`,fullPage:true});

/* ------------------------------------------------------------------ *
 * 3. 設定面板
 * ------------------------------------------------------------------ */
console.log('\n[3] 設定面板');
await p.goto(BASE+'#/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
ck('首頁的每日目標預設是 5 分鐘', /\/ 5 分鐘/.test(await T(p)), (await T(p)).match(/今天.*分鐘/)?.[0]??'');

const gear=p.getByRole('button',{name:'設定'});
ck('header 有設定入口', await gear.count()===1);
await gear.first().click();
await p.waitForTimeout(500);
const dialog=p.locator('[role="dialog"][aria-label="設定"]');
ck('設定面板打得開', await dialog.count()===1);
const dtxt=await dialog.innerText();
ck('三個原本改不了的設定都在', /每日目標/.test(dtxt) && /西班牙文語音/.test(dtxt) && /未經確認的區域用法/.test(dtxt));

/*
 * 面板整片都要在視窗裡。這顆按鈕掛在 header 裡，而 header 有 backdrop-blur，
 * 只要祖先有 backdrop-filter 就會變成 fixed 的包含塊，inset-0 會量成 header
 * 那 64px 的高度，面板被裁掉大半。所以要量遮罩的實際高度，不能只看它渲染出來。
 */
const geo=await dialog.evaluate((el) => ({
  overlay: el.clientHeight,
  viewport: window.innerHeight,
  panelTop: (el.firstElementChild)?.getBoundingClientRect().top ?? -1,
}));
ck('遮罩鋪滿整個視窗（沒有被 header 的 backdrop-filter 裁掉）',
   geo.overlay === geo.viewport, `遮罩 ${geo.overlay}px / 視窗 ${geo.viewport}px`);
ck('面板頂端在視窗內', geo.panelTop >= 0, `top=${Math.round(geo.panelTop)}`);
ck('主題與語言在面板裡也找得到', /主題/.test(dtxt) && /介面與解說語言/.test(dtxt));
await p.screenshot({path:`${SP}/p10-settings.png`,fullPage:true});

await dialog.getByRole('button',{name:'15 分鐘'}).click();
await p.waitForTimeout(300);
ck('選了之後標成目前選項', await dialog.getByRole('button',{name:'15 分鐘'}).getAttribute('aria-pressed')==='true');
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
ck('Esc 關得掉', await p.locator('[role="dialog"][aria-label="設定"]').count()===0);
ck('首頁的每日目標跟著變成 15 分鐘', /\/ 15 分鐘/.test(await T(p)), (await T(p)).match(/今天.*分鐘/)?.[0]??'');

/* ------------------------------------------------------------------ *
 * 4. 未經確認的區域用法：關掉時整塊不見
 * ------------------------------------------------------------------ */
console.log('\n[4] 未經確認的區域用法');
// 課文頁的 intro 本來就會用文字解釋「待母語者確認」是什麼意思，那是內容不是標記；
// 真正掛 needsVerify 的是單字（funda、ahorita…），所以到單字表驗
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
await p.getByRole('textbox',{name:/搜尋/}).fill('funda');
await p.waitForTimeout(500);
t=await T(p);
const NOTE='購物用的塑膠袋一般說 funda';
ck('預設看得到「待母語者確認」標記', /待母語者確認/.test(t));
ck('也看得到註記內文', t.includes(NOTE));
ck('單字卡本身在', /塑膠袋/.test(t));

await p.getByRole('button',{name:'設定'}).first().click();
await p.waitForTimeout(400);
await p.locator('[role="dialog"][aria-label="設定"]').getByRole('button',{name:'隱藏',exact:true}).click();
await p.waitForTimeout(300);
await p.keyboard.press('Escape');
await p.waitForTimeout(600);
t=await T(p);
ck('關掉後標記不見', !/待母語者確認/.test(t));
ck('內文也一起不見 —— 不是只藏標記讓它看起來像確認過的', !t.includes(NOTE));
ck('單字本身還在，只是沒有那條沒把握的註記', /塑膠袋/.test(t));
await p.screenshot({path:`${SP}/p10-hidden-regional.png`,fullPage:true});

// 改回來，免得影響後面共用同一個 localStorage 的腳本
await p.getByRole('button',{name:'設定'}).first().click();
await p.waitForTimeout(400);
await p.locator('[role="dialog"][aria-label="設定"]').getByRole('button',{name:'顯示',exact:true}).click();
await p.keyboard.press('Escape');
await p.waitForTimeout(600);
ck('改回顯示之後又看得到了', /待母語者確認/.test(await T(p)));

/* ------------------------------------------------------------------ *
 * 5. 關掉語音之後聽力題改成抄寫，而且不再顯示求助
 * ------------------------------------------------------------------ */
console.log('\n[5] 關掉語音');
await p.getByRole('button',{name:'設定'}).first().click();
await p.waitForTimeout(400);
await p.locator('[role="dialog"][aria-label="設定"]').getByRole('button',{name:'關',exact:true}).click();
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
await p.goto(BASE+'#/practice/b1-si-condicionales',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
t=await T(p);
ck('聽力題變成抄寫', /照著下面的句子打一次/.test(t));
ck('整句直接印出來', /Si tuviera tiempo, iría a Galápagos/.test(t));
ck('抄寫模式不顯示求助 —— 答案已經在畫面上了',
   await p.getByRole('button',{name:/看中文意思/}).count()===0
   && await p.getByRole('button',{name:/直接看答案/}).count()===0);

/* ------------------------------------------------------------------ *
 * 5b. 翻譯題與變位填空的求助（第一階給的是骨架，不是意思）
 * ------------------------------------------------------------------ */
console.log('\n[5b] 翻譯題與變位填空的求助');
// 語音在上一段被關掉了，先開回來
await p.getByRole('button',{name:'設定'}).first().click();
await p.waitForTimeout(400);
await p.locator('[role="dialog"][aria-label="設定"]').getByRole('button',{name:'開',exact:true}).click();
await p.keyboard.press('Escape');
await p.waitForTimeout(500);

// a0-saludos 的 ex-sal-3：把「我叫 Ana。」翻成西班牙文 → Me llamo Ana.
await p.goto(BASE+'#/practice/a0-saludos',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
for (let i=0;i<12;i++){
  if (/翻成西班牙文/.test(await T(p))) break;
  const next=p.getByRole('button',{name:/^下一題|^完成/});
  if (await next.count()){ await next.first().click(); await p.waitForTimeout(400); continue; }
  const opts=p.locator('main ol li button, main ul li button');
  if (await opts.count()){ await opts.first().click(); await p.waitForTimeout(400); continue; }
  const el=p.getByRole('button',{name:/^el$/});
  if (await el.count()){ await el.first().click(); await p.waitForTimeout(250); continue; }
  const inp2=p.locator('main input[type="text"]');
  if (await inp2.count()){ await inp2.first().fill('x'); await inp2.first().press('Enter'); await p.waitForTimeout(500); continue; }
  break;
}
t=await T(p);
ck('走到翻譯題', /翻成西班牙文/.test(t), t.split('\n')[2]??'');
ck('翻譯題也有兩顆求助', await p.getByRole('button',{name:/看提示/}).count()===1
   && await p.getByRole('button',{name:/直接看答案/}).count()===1);
ck('求助前沒有洩漏答案', !/Me llamo Ana/.test(t));

await p.getByRole('button',{name:/看提示/}).click();
await p.waitForTimeout(400);
t=await T(p);
const sk=t.split('\n').find(l=>l.includes('·'))??'';
ck('骨架出現', sk.length>0, sk);
ck('骨架只留每個字的首字母，其餘是點', /^[^·]*M·+ l·+ A·+/.test(sk.trim()), sk.trim());
ck('骨架不是答案本身', !/Me llamo Ana/.test(t));
ck('有說明骨架怎麼讀', /每個字只留第一個字母/.test(t));
ck('「看提示」按過就收起來', await p.getByRole('button',{name:/看提示/}).count()===0);
await p.screenshot({path:`${SP}/p11-translate-hint.png`,fullPage:true});

const tinp=p.locator('main input[type="text"]').first();
await tinp.fill('Me llamo Ana');
await tinp.press('Enter');
await p.waitForTimeout(700);
t=await T(p);
ck('照骨架打完判對', /答對了/.test(t));
ck('有講明看過提示', /看過提示/.test(t), t.split('\n').find(l=>/看過提示/.test(l))??'');
ck('沒打句號不會被誤報重音不完整', !/重音/.test(t), t.split('\n').find(l=>/重音/.test(l))??'');
await p.screenshot({path:`${SP}/p11-translate-correct.png`,fullPage:true});

console.log('\n[5c] 變位填空直接看答案');
await p.goto(BASE+'#/practice/a1-presente-regular',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
t=await T(p);
ck('第一題是變位填空', /填出正確的動詞形式|變位/.test(t) || await p.getByRole('button',{name:/看提示/}).count()===1);
await p.getByRole('button',{name:/直接看答案/}).click();
await p.waitForTimeout(700);
t=await T(p);
ck('算答錯', /答錯了/.test(t));
ck('正解印出來了', /hablo/.test(t));
ck('說明了為什麼算錯', /看了答案/.test(t));
await p.screenshot({path:`${SP}/p11-conjugation-gaveup.png`,fullPage:true});

/* ------------------------------------------------------------------ *
 * 6. 首頁的進度條講的是學習者自己的進度
 * ------------------------------------------------------------------ */
console.log('\n[6] 首頁進度條');
await p.goto(BASE+'#/',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
await clearCelebrations(p);
t=await T(p);
ck('不再顯示寫死的開發階段編號', !/Phase \d \/ \d/.test(t));
ck('顯示的是「幾課 / 41 課」', /\d+ \/ 41 課/.test(t), t.match(/\d+ \/ 41 課/)?.[0]??'');

console.log('\n[7] 頁面沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
