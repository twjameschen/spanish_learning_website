import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};

/*
 * 單字表把 728 個字全部渲染，沒有分頁也沒有虛擬捲動。
 * 這支量的是「打一個字到畫面更新完成」要多久 —— 改動前先跑一次當基準。
 */
const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1100,height:900}});
// 塞假語音：喇叭按鈕要真的出現，量到的才是實際的渲染成本
await p.addInitScript(`
  const v={name:'T',lang:'es-MX',default:false,localService:true,voiceURI:'t'};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
    getVoices:()=>[v],speak:()=>{},cancel:()=>{},
    addEventListener:()=>{},removeEventListener:()=>{}}});
  window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
`);
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);

const cards=await p.locator('main article').count();
const speakers=await p.locator('main button[aria-label^="播放"]').count();
console.log(`\n單字卡 ${cards} 張、喇叭 ${speakers} 顆`);

/** 打一個字，等畫面上的「符合 N 筆」更新完，回傳耗時 */
async function typeOnce(ch) {
  return p.evaluate(async (c) => {
    const input = document.querySelector('main input[type="text"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const t0 = performance.now();
    setter.call(input, input.value + c);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // 等 React 重繪並讓瀏覽器完成一次版面／繪製
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  }, ch);
}

const samples=[];
for (const ch of 'comida'.split('')) {
  samples.push(await typeOnce(ch));
  await p.waitForTimeout(120);
}
const worst=Math.max(...samples);
const total=samples.reduce((a,c)=>a+c,0);
console.log('每個按鍵的耗時(ms):', samples.map((n)=>n.toFixed(0)).join(' · '));
console.log(`最慢一次 ${worst.toFixed(0)} ms、六次共 ${total.toFixed(0)} ms`);

const cv=await p.locator('main article').first().evaluate((el)=>getComputedStyle(el).contentVisibility);
console.log('卡片的 content-visibility:', cv);

// 語言切換：量整批重掛的成本
await p.evaluate(()=>{ const i=document.querySelector('main input[type="text"]'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,''); i.dispatchEvent(new Event('input',{bubbles:true})); });
await p.waitForTimeout(600);
const langMs=await p.evaluate(async ()=>{
  const btn=[...document.querySelectorAll('header button')].find((b)=>/切換語言|Switch language/.test(b.getAttribute('aria-label')||''));
  const t0=performance.now();
  btn.click();
  await new Promise((r)=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return performance.now()-t0;
});
console.log(`切換語言耗時 ${langMs.toFixed(0)} ms`);

ck('打字沒有卡到不能用（最慢一次 < 400ms）', worst<400, `${worst.toFixed(0)} ms`);
ck('切換語言沒有卡住（< 500ms）', langMs<500, `${langMs.toFixed(0)} ms`);
ck('卡片有開 content-visibility', cv==='auto', cv);

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
