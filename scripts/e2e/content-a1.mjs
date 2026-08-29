import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();
// 離開練習頁後，先前壓著的慶祝視窗會播出來（這是設計上的行為），
// 它是 modal 會擋住點擊，所以每次互動前先清掉
async function clearCelebrations(p){
  for (let i=0;i<6;i++){
    const d=p.locator('[role="dialog"]');
    if (!(await d.count())) return;
    await p.getByRole('button',{name:/^好$|^Nice$/}).first().click().catch(()=>{});
    await p.waitForTimeout(400);
  }
}

const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1000,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

console.log('\n[1] 課程列表含全部四個等級');
await p.goto(BASE+'#/lessons',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
let t=await T(p);
ck('說明文字涵蓋 A0 到 B1', /A0 到 B1/.test(t), t.split('\n')[2]??'');
const links=await p.locator('main a[href*="#/lessons/"]').count();
ck('課程連結 41 條', links===41, `實際 ${links}`);
await p.screenshot({path:`${SP}/p5-lessons.png`,fullPage:true});

console.log('\n[2] A1 課文頁');
await p.goto(BASE+'#/lessons/a1-gustar',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
t=await T(p);
ck('標題正確', /gustar/.test(t));
ck('有規則與例句', /Me gusta el café/.test(t));
ck('有最容易犯的錯區塊', /最容易犯的錯|整個動詞漏掉|動詞跟著人變/.test(t));
ck('有題目列出', /題|練習/.test(t));
await p.screenshot({path:`${SP}/p5-a1-gustar.png`,fullPage:true});

console.log('\n[3] Sierra 禮貌專課與待母語者確認標記');
await p.goto(BASE+'#/lessons/a1-cortesia-sierra',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
t=await T(p);
ck('ahorita 有講到', /ahorita/i.test(t));
ck('-ito 軟化有講到', /ito|軟化/.test(t));
ck('顯示「待母語者確認」標記', /待母語者確認/.test(t), (t.match(/待母語者確認/g)||[]).length+' 個');
await p.screenshot({path:`${SP}/p5-sierra.png`,fullPage:true});

console.log('\n[4] A1 練習可以實際作答');
await p.goto(BASE+'#/practice/a1-presente-regular',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
t=await T(p);
ck('進度顯示 1/10', /1\/10/.test(t), t.match(/\d+\/\d+/)?.[0]??'');
// 第一題是動詞變位，輸入 hablo
const input=p.locator('main input[type="text"]');
ck('變位題有輸入框', await input.count()>0);
if (await input.count()) {
  await input.first().fill('hablo');
  await p.getByRole('button',{name:/送出答案|Submit answer/}).first().click();
  await p.waitForTimeout(700);
  t=await T(p);
  ck('答對了', /答對了/.test(t), t.split('\n').find(l=>/答對|答錯/.test(l))??'');
}
await p.screenshot({path:`${SP}/p5-a1-practice.png`,fullPage:true});

await clearCelebrations(p);

console.log('\n[5] 單字表含全部四個等級');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
t=await T(p);
ck('顯示總數 728', /728/.test(t), t.match(/\d{3}/)?.[0]??'');
ck('有 A1 主題（家與家具等）', /家與家具|城市與交通|身體與健康/.test(t));

console.log('\n[6] 英文切換：A1 內容也要跟著換');
await p.goto(BASE+'#/lessons/a1-gustar',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
await clearCelebrations(p);
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click();
await p.waitForTimeout(700);
t=await T(p);
const zh=(t.match(/[一-鿿]/g)||[]).length;
ck('切英文後沒有中文殘留', zh===0, zh?`殘留 ${zh} 字：${(t.match(/[一-鿿]+/g)||[]).slice(0,6).join(',')}`:'');
ck('英文規則出現', /the thing you like is the subject|agrees with/i.test(t));
await p.screenshot({path:`${SP}/p5-a1-en.png`,fullPage:true});

console.log('\n[7] 旅程地圖基多站已開放');
await clearCelebrations(p);
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click();
await p.waitForTimeout(400);
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
t=await T(p);
ck('基多站顯示 0/13', /0\/13/.test(t), (t.match(/\d+\/\d+/g)||[]).join(' '));

ck('全程沒有 JS 例外', errs.length===0, errs.slice(0,3).join(' | '));
console.log(`\n${fail===0?'全部通過':`${fail} 項失敗`}`);
await b.close(); process.exit(fail?1:0);
