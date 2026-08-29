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
    await p.waitForTimeout(350);
  }
}
const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1000,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

console.log('\n[1] 全部 41 課都列出');
await p.goto(BASE+'#/lessons',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
let t=await T(p);
const links=await p.locator('main a[href*="#/lessons/"]').count();
ck('課程連結 41 條', links===41, `實際 ${links}`);
ck('說明文字沒有停留在只有 A0 的舊敘述', /A0 到 B1/.test(t), t.split('\n')[2]??'');

console.log('\n[2] B1 虛擬式課文');
await p.goto(BASE+'#/lessons/b1-subjuntivo-forma',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
t=await T(p);
ck('標題出現', /虛擬式/.test(t));
ck('六個特例列出', /sea|vaya|sepa/.test(t));
ck('有最容易犯的錯區塊', /最容易犯的錯/.test(t));
await p.screenshot({path:`${SP}/p5b-subj.png`,fullPage:true});

console.log('\n[3] si 條件句的表格有渲染');
await p.goto(BASE+'#/lessons/b1-si-condicionales',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
t=await T(p);
ck('三種搭配都講到', /過去虛擬式/.test(t)&&/條件式/.test(t));
ck('點出 si 不接現在虛擬式', /si 後面永遠不用現在虛擬式|永遠不用現在虛擬式/.test(t));
const tables=await p.locator('main table').count();
ck('intro 的表格有渲染成 table', tables>0, `${tables} 個`);
await p.screenshot({path:`${SP}/p5b-si.png`,fullPage:true});

console.log('\n[4] B1 練習可以實際作答');
await p.goto(BASE+'#/practice/b1-imperfecto-subjuntivo',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
t=await T(p);
ck('進度顯示 1/10', /1\/10/.test(t), t.match(/\d+\/\d+/)?.[0]??'');
const input=p.locator('main input[type="text"]');
if (await input.count()) {
  await input.first().fill('hablara');
  await p.getByRole('button',{name:/送出答案|Submit answer/}).first().click();
  await p.waitForTimeout(700);
  t=await T(p);
  ck('過去虛擬式答對', /答對了/.test(t));
}
await clearCelebrations(p);

console.log('\n[5] 旅程地圖五站全開');
await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
await clearCelebrations(p);
t=await T(p);
const counts=(t.match(/\d+\/\d+/g)||[]);
ck('五站都有課程數（無「尚未開放」）', !/尚未開放/.test(t), counts.join(' '));
ck('加拉巴哥顯示 /6', /\/6/.test(t));
await p.screenshot({path:`${SP}/p5b-home.png`,fullPage:true});

console.log('\n[6] 單字表 728 個字');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
t=await T(p);
ck('顯示 728', /728/.test(t), t.match(/\d{3}/)?.[0]??'');
ck('B1 主題出現', /環境與保育|社會與制度|意見與態度/.test(t));

console.log('\n[7] 英文切換：B1 內容也跟著換');
await p.goto(BASE+'#/lessons/b1-se-pasiva',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await clearCelebrations(p);
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click();
await p.waitForTimeout(800);
t=await T(p);
const zh=(t.match(/[一-鿿]/g)||[]).length;
ck('切英文後沒有中文殘留', zh===0, zh?`殘留 ${zh} 字：${(t.match(/[一-鿿]+/g)||[]).slice(0,6).join(',')}`:'');
ck('英文規則出現', /Passive se|impersonal/i.test(t));

ck('全程沒有 JS 例外', errs.length===0, errs.slice(0,3).join(' | '));
console.log(`\n${fail===0?'全部通過':`${fail} 項失敗`}`);
await b.close(); process.exit(fail?1:0);
