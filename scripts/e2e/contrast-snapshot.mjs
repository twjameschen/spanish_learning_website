import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};

/* 快照那一列的「還原」與確認狀態，只有真的有快照時才畫得出來，
   contrast.mjs 從空白狀態開站，量不到 —— 這支專門把它們叫出來量。 */
const AUDIT = () => {
  function lum(rgb){const [r,g,b]=rgb.map(v=>{const c=v/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);});
    return 0.2126*r+0.7152*g+0.0722*b;}
  const parse=(s)=>{const m=s.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null;};
  function bg(el){let n=el;
    while(n&&n!==document.documentElement){
      const cs=getComputedStyle(n);
      if(cs.backgroundImage&&cs.backgroundImage!=='none') return 'gradient';
      const c=parse(cs.backgroundColor);
      const a=(cs.backgroundColor.match(/[\d.]+/g)||[])[3];
      if(c&&a!=='0') return c;
      n=n.parentElement;
    }
    return [255,255,255];
  }
  const out=[];
  for (const el of document.querySelectorAll('main li *, main li')){
    const txt=(el.textContent||'').trim();
    if(!txt||el.children.length) continue;
    const cs=getComputedStyle(el);
    const fg=parse(cs.color); const b=bg(el);
    if(!fg||b==='gradient') continue;
    const L1=lum(fg),L2=lum(b);
    const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight,10)>=700;
    const large=size>=24||(size>=18.66&&bold);
    out.push({txt:txt.slice(0,24), ratio:+ratio.toFixed(2), need:large?3:4.5});
  }
  return out;
};

const b=await chromium.launch({executablePath:EXE});
for (const theme of ['light','dark']){
  const p=await b.newPage({viewport:{width:1000,height:1200},colorScheme:theme});
  await p.goto(BASE+'#/practice/a0-genero',{waitUntil:'networkidle'});
  await p.waitForTimeout(800);
  // 隨便作答幾題，讓儲存層有東西，開站才拍得出快照
  for(let i=0;i<6;i++){
    const el=p.getByRole('button',{name:/^el$/});
    if(await el.count()){ await el.first().click().catch(()=>{}); await p.waitForTimeout(150); continue; }
    const next=p.getByRole('button',{name:/^下一題|^完成/});
    if(await next.count()){ await next.first().click(); await p.waitForTimeout(250); continue; }
    break;
  }
  await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
  await p.goto(BASE+'#/',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  for(let i=0;i<6;i++){
    const ok=p.getByRole('button',{name:/^好$|^Nice$/});
    if(!(await ok.count())) break;
    await ok.first().click().catch(()=>{}); await p.waitForTimeout(400);
  }
  const restore=p.getByRole('button',{name:/^還原$/});
  ck(`[${theme}] 有快照列與還原按鈕`, await restore.count()>0, `${await restore.count()} 顆`);
  if(!(await restore.count())){ await p.close(); continue; }

  let bad=(await p.evaluate(AUDIT)).filter(r=>r.ratio<r.need);
  ck(`[${theme}] 快照列（含還原鈕）對比都過 AA`, bad.length===0, JSON.stringify(bad));

  await restore.first().click(); await p.waitForTimeout(400);
  ck(`[${theme}] 進到確認狀態`, /確定要還原到/.test(await p.locator('main').innerText()));
  bad=(await p.evaluate(AUDIT)).filter(r=>r.ratio<r.need);
  ck(`[${theme}] 確認列（確定／取消）對比都過 AA`, bad.length===0, JSON.stringify(bad));
  await p.close();
}
await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
