import { chromium } from 'playwright';
const BASE=process.argv[2];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const routes=['#/','#/vocab','#/lessons','#/lessons/a2-preterito-vs-imperfecto','#/review',
  '#/achievements','#/dashboard','#/drill/a0-hay','#/practice/a0-hay'];
const AUDIT = () => {
  function lum(rgb){const [r,g,bb]=rgb.map(v=>{const c=v/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);});
    return 0.2126*r+0.7152*g+0.0722*bb;}
  const parse=(s)=>{const m=s.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null;};
  // 漸層背景是 background-image，讀不到單一色值，量了也只會得到假數字 —— 跳過並回報
  function hasGradient(el){let n=el;
    while(n&&n!==document.documentElement){
      if(/gradient/.test(getComputedStyle(n).backgroundImage))return true;
      n=n.parentElement;}
    return false;}
  function bgOf(el){let n=el;
    while(n&&n!==document.documentElement){const c=getComputedStyle(n).backgroundColor;
      const a=c.match(/[\d.]+/g);
      if(a&&(a.length<4||Number(a[3])>0.5))return parse(c);
      n=n.parentElement;}
    return parse(getComputedStyle(document.body).backgroundColor)||[255,255,255];}
  const out=[]; let skipped=0;
  for(const el of document.querySelectorAll('main *, header *, nav *, [role="dialog"] *')){
    if(el.children.length>0)continue;
    const txt=(el.textContent||'').trim(); if(!txt)continue;
    if(hasGradient(el)){skipped++;continue;}
    const st=getComputedStyle(el);
    if(st.visibility==='hidden'||st.display==='none'||Number(st.opacity)<0.3)continue;
    const fg=parse(st.color), bg=bgOf(el); if(!fg||!bg)continue;
    const l1=lum(fg),l2=lum(bg);
    const ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    const size=parseFloat(st.fontSize), bold=Number(st.fontWeight)>=700;
    const need=(size>=24||(size>=18.66&&bold))?3:4.5;
    if(ratio<need)out.push({cls:el.className.slice(0,70),txt:txt.slice(0,18),
      ratio:Number(ratio.toFixed(2)),need,size:Math.round(size),bold});
  }
  out.skipped=skipped;
  return out;
};
const seen=new Map();
for (const scheme of ['light','dark']) {
  const p=await b.newPage({viewport:{width:1100,height:1000}});
  await p.emulateMedia({colorScheme:scheme});
  for(const r of routes){
    await p.goto(BASE+r,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
    for(let i=0;i<4;i++){if(!(await p.locator('[role="dialog"]').count()))break;
      await p.getByRole('button',{name:/^好$|^Nice$/}).first().click().catch(()=>{});await p.waitForTimeout(250);}
    for(const h of await p.evaluate(AUDIT)){
      const k=`${h.cls}|${h.ratio}`;
      if(!seen.has(k))seen.set(k,{...h,scheme,route:r});
    }
  }

  /*
   * 只走頁面量不到「開起來才存在」的東西：設定面板是對話框，
   * 聽力題的提示區塊要按了「看中文意思」才出現，而且要有語音才有那顆按鈕。
   * 容器裡沒有 TTS，所以塞一個假的西班牙文語音進去。
   */
  const q=await b.newPage({viewport:{width:1100,height:1000}});
  await q.emulateMedia({colorScheme:scheme});
  await q.addInitScript(`
    const v={name:'T',lang:'es-MX',default:false,localService:true,voiceURI:'t'};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
      getVoices:()=>[v],speak:()=>{},cancel:()=>{},
      addEventListener:()=>{},removeEventListener:()=>{}}});
    window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};
  `);

  await q.goto(BASE+'#/',{waitUntil:'networkidle'}); await q.waitForTimeout(500);
  await q.getByRole('button',{name:'設定'}).first().click(); await q.waitForTimeout(600);
  for(const h of await q.evaluate(AUDIT)){
    const k=`${h.cls}|${h.ratio}`;
    if(!seen.has(k))seen.set(k,{...h,scheme,route:'設定面板'});
  }
  await q.keyboard.press('Escape'); await q.waitForTimeout(400);

  await q.goto(BASE+'#/practice/b1-si-condicionales',{waitUntil:'networkidle'});
  await q.waitForTimeout(700);
  await q.getByRole('button',{name:/看中文意思/}).click(); await q.waitForTimeout(400);
  for(const h of await q.evaluate(AUDIT)){
    const k=`${h.cls}|${h.ratio}`;
    if(!seen.has(k))seen.set(k,{...h,scheme,route:'聽力提示'});
  }
  // 翻譯題的骨架提示（跟聽力提示同一個 HintBox，但字是等寬的）
  await q.goto(BASE+'#/practice/a0-saludos',{waitUntil:'networkidle'});
  await q.waitForTimeout(700);
  for(let i=0;i<12;i++){
    if(await q.getByRole('button',{name:/看提示/}).count())break;
    const next=q.getByRole('button',{name:/^下一題|^完成/});
    if(await next.count()){await next.first().click();await q.waitForTimeout(350);continue;}
    const opts=q.locator('main ol li button, main ul li button');
    if(await opts.count()){await opts.first().click();await q.waitForTimeout(350);continue;}
    const inp=q.locator('main input[type="text"]');
    if(await inp.count()){await inp.first().fill('x');await inp.first().press('Enter');await q.waitForTimeout(450);continue;}
    break;
  }
  if(await q.getByRole('button',{name:/看提示/}).count()){
    await q.getByRole('button',{name:/看提示/}).click(); await q.waitForTimeout(400);
    for(const h of await q.evaluate(AUDIT)){
      const k=`${h.cls}|${h.ratio}`;
      if(!seen.has(k))seen.set(k,{...h,scheme,route:'骨架提示'});
    }
  }
  await q.close();

  await p.close();
}
console.log(`不同的低對比樣式共 ${seen.size} 種：`);
for(const v of [...seen.values()].sort((a,b)=>a.ratio-b.ratio))
  console.log(`  ${v.ratio}/${v.need}  ${v.size}px${v.bold?' bold':''}  ${v.scheme}  "${v.txt}"\n      ${v.cls}`);
await b.close();
