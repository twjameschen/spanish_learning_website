import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();
async function clear(p){for(let i=0;i<6;i++){if(!(await p.locator('[role="dialog"]').count()))return;
  await p.getByRole('button',{name:/^好$|^Nice$/}).first().click().catch(()=>{});await p.waitForTimeout(300);}}
const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1100,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));

console.log('\n[1] 四選一：數字鍵選答案');
await p.goto(BASE+'#/practice/a0-hay',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
let t=await T(p);
ck('選項標的是數字不是字母', /^1$/m.test(t)&&!/^A$/m.test(t));
await p.keyboard.press('2'); await p.waitForTimeout(600);
t=await T(p);
ck('按 2 選到第二個選項並顯示回饋', /答對了|答錯了/.test(t));
ck('進度沒有前進（回饋看得到）', /1\/10/.test(t), t.match(/\d+\/\d+/)?.[0]??'');
await p.screenshot({path:`${SP}/p7-mcq-key.png`});

console.log('\n[2] Enter 前進到下一題');
await p.keyboard.press('Enter'); await p.waitForTimeout(600);
ck('Enter 前進到 2/10', /2\/10/.test(await T(p)));

console.log('\n[3] 作答後數字鍵不再改答案');
await p.keyboard.press('1'); await p.waitForTimeout(400);
await p.keyboard.press('1'); await p.waitForTimeout(400);
t=await T(p);
ck('第二次按 1 沒有再作答一次', /2\/10/.test(t), t.match(/\d+\/\d+/)?.[0]??'');

console.log('\n[4] 閃卡：Space 翻面，1/2 自評');
await p.goto(BASE+'#/drill/a0-hay',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
t=await T(p);
ck('閃卡頁載入', /1\/20/.test(t));
await p.keyboard.press(' '); await p.waitForTimeout(500);
t=await T(p);
ck('Space 翻開了答案', /我記得|想不起來/.test(t));
await p.keyboard.press('2'); await p.waitForTimeout(600);
t=await T(p);
ck('按 2 = 我記得，顯示回饋', /答對了/.test(t));
await p.screenshot({path:`${SP}/p7-flash-key.png`});

console.log('\n[5] 快捷鍵說明面板');
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await clear(p);
await p.keyboard.press('?'); await p.waitForTimeout(600);
ck('按 ? 開啟說明', (await p.locator('[role="dialog"]').count())>0);
const dtxt=await p.locator('[role="dialog"]').innerText().catch(()=>'');
ck('列出快捷鍵', /鍵盤快捷鍵/.test(dtxt)&&/Space/.test(dtxt), dtxt.split('\n').slice(0,3).join(' | '));
await p.screenshot({path:`${SP}/p7-shortcuts.png`});
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
ck('Esc 關閉', (await p.locator('[role="dialog"]').count())===0);

console.log('\n[6] 輸入框裡打字時快捷鍵不接手');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
await clear(p);
const search=p.locator('main input[type="text"], main input[type="search"]').first();
await search.click();
await search.type('casa?1 2');
await p.waitForTimeout(500);
ck('搜尋框收到完整字串，沒有被快捷鍵吃掉', (await search.inputValue())==='casa?1 2', await search.inputValue());
ck('打 ? 沒有誤開說明面板', (await p.locator('[role="dialog"]').count())===0);

console.log('\n[7] 減少動態效果偏好');
await p.emulateMedia({reducedMotion:'reduce'});
await p.goto(BASE+'#/practice/a0-hay',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.locator('main ol li button').first().click(); await p.waitForTimeout(500);
ck('開啟減少動態後仍能正常作答', /答對了|答錯了/.test(await T(p)));

ck('全程沒有 JS 例外', errs.length===0, errs.slice(0,2).join(' | '));
console.log(`\n${fail===0?'全部通過':`${fail} 項失敗`}`);
await b.close(); process.exit(fail?1:0);
