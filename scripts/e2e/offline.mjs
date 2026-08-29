import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1100,height:900}});

// 記錄所有網路請求，任何指向本機以外的都算違反離線要求
const external=[];
p.on('request',(r)=>{
  const u=r.url();
  if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
  if (u.startsWith(BASE) || u.startsWith('file://')) return;
  external.push(`${r.method()} ${u}`);
});

const routes=['#/','#/vocab','#/lessons','#/lessons/a1-gustar','#/review','#/achievements',
              '#/dashboard','#/drill/a0-hay','#/practice/a0-hay'];
for (const r of routes) {
  await p.goto(BASE+r,{waitUntil:'networkidle'});
  await p.waitForTimeout(500);
}
// 深色模式與英文也走一遍，確認不會臨時去抓字型
await p.emulateMedia({colorScheme:'dark'});
await p.goto(BASE+'#/dashboard',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
await p.getByRole('button',{name:/切換語言|Switch language/}).first().click().catch(()=>{});
await p.waitForTimeout(600);

ck('走過 9 個頁面，零個對外請求', external.length===0, external.slice(0,5).join(' | '));

// 字型必須來自 build 產物本身
const fonts=await p.evaluate(()=>[...document.fonts].map(f=>f.family));
ck('Nunito 字型有載入（是 bundle 內的）', fonts.some(f=>/Nunito/i.test(f)), [...new Set(fonts)].join(', '));

console.log(`\n${fail===0?'離線驗證通過':`${fail} 項失敗`}`);
await b.close(); process.exit(fail?1:0);
