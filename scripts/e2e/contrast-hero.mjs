import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2];
const ALL_IDS=JSON.parse(process.env.ALL_IDS||'[]');
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};

/*
 * 首頁 hero 的對比。
 *
 * `contrast.mjs` 一碰到 `background-image` 就整段跳過（它算不出漸層上
 * 某一點的實際顏色），而 hero 正好整塊是漸層 —— 全站最顯眼的一塊，
 * 三支對比腳本一個都量不到。Phase 18 的「繼續」CTA 就長在上面。
 *
 * 這一支手動量兩件事：
 *   1. CTA 自己有實心的 bg-ink-900，直接量得到
 *   2. 41 課做完之後那一句話直接坐在漸層上 ——
 *      拿漸層的三個色停各量一次，取最差的那一端
 */
const MEASURE = () => {
  const lum=(rgb)=>{const [r,g,b]=rgb.map(v=>{const c=v/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);});
    return 0.2126*r+0.7152*g+0.0722*b;};
  const parse=(s)=>{const m=s.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null;};
  const alpha=(s)=>{const m=s.match(/[\d.]+/g);return m&&m[3]!==undefined?Number(m[3]):1;};
  const over=(fg,a,bg)=>fg.map((v,i)=>a*v+(1-a)*bg[i]);
  const ratio=(a,b)=>{const L1=lum(a),L2=lum(b);
    return +(((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05))).toFixed(2);};
  const need=(s)=>{const size=parseFloat(s.fontSize);
    return (size>=24||(size>=18.66&&parseInt(s.fontWeight,10)>=700))?3:4.5;};

  const out=[];
  const cta=document.querySelector('section a[href^="#/lessons/"]');
  if (cta){
    const bg=parse(getComputedStyle(cta).backgroundColor);
    for (const el of cta.querySelectorAll('span')){
      const s=getComputedStyle(el);
      out.push({ what:(el.textContent||'').trim().slice(0,14),
                 ratio:ratio(over(parse(s.color), alpha(s.color), bg), bg), need:need(s) });
    }
  }

  const done=[...document.querySelectorAll('section p')]
    .find((el)=>/全部做完了|lessons done/.test(el.textContent||''));
  if (done){
    // 漸層的三個色停：from-primary-500 via-primary-400 to-accent-400
    const probe=document.createElement('div');
    document.body.appendChild(probe);
    const read=(cls)=>{probe.className=cls;return parse(getComputedStyle(probe).backgroundColor);};
    const stops=[read('bg-primary-500'), read('bg-primary-400'), read('bg-accent-400')];
    probe.remove();
    for (const el of [done, ...done.querySelectorAll('span')]){
      const s=getComputedStyle(el);
      for (const stop of stops){
        out.push({ what:(el.textContent||'').trim().slice(0,10),
                   ratio:ratio(over(parse(s.color), alpha(s.color), stop), stop), need:need(s) });
      }
    }
  }
  return out;
};

/** 41 課全部標成做完 —— 要看的是那一句話，不是走完流程 */
const SEED_ALL = async (ids) => {
  const db=await new Promise((res,rej)=>{const r=indexedDB.open('camino-a-quito',1);
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);});
  const now=new Date().toISOString();
  await new Promise((res,rej)=>{
    const r=db.transaction('kv','readwrite').objectStore('kv').put(JSON.stringify({
      state:{ cards:{}, dailyStats:{}, recentLog:[],
        lessons:Object.fromEntries(ids.map((id)=>[id,{completedAt:now,bestAccuracy:1,attempts:1}])),
        totalXp:0,
        streak:{current:0,best:0,freezes:0,lastActiveDay:null,lastFreezeGrantWeek:null},
        seenAchievements:[] }, version:0 }), 'camino:progress');
    r.onsuccess=()=>res(1); r.onerror=()=>rej(r.error);});
  return 'ok';
};

if (!ALL_IDS.length) { console.log('  ✗ 需要環境變數 ALL_IDS（見 README）'); process.exit(1); }

const b=await chromium.launch({executablePath:EXE});
for (const theme of ['light','dark']){
  const p=await b.newPage({viewport:{width:1440,height:1000},colorScheme:theme});
  await p.goto(BASE+'#/',{waitUntil:'networkidle'});
  await p.waitForTimeout(800);

  let rows=await p.evaluate(MEASURE);
  ck(`[${theme}] 量到「繼續」CTA 的字`, rows.length>=2,
     rows.map((r)=>`${r.what} ${r.ratio}:1`).join(' / '));
  ck(`[${theme}] CTA 的字都過 AA`, rows.every((r)=>r.ratio>=r.need),
     JSON.stringify(rows.filter((r)=>r.ratio<r.need)));

  ck(`[${theme}] 種得進「全部做完」`, (await p.evaluate(SEED_ALL, ALL_IDS))==='ok');
  await p.reload({waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  rows=await p.evaluate(MEASURE);
  ck(`[${theme}] 全做完那一句量得到`, rows.length>0,
     `最差 ${Math.min(...rows.map((r)=>r.ratio))}:1`);
  ck(`[${theme}] 全做完那一句在漸層最差端也過 AA`, rows.every((r)=>r.ratio>=r.need),
     JSON.stringify(rows.filter((r)=>r.ratio<r.need)));
  await p.close();
}
await b.close();
console.log(fail?`\n${fail} 項未通過\n`:'\n全部通過\n');
process.exit(fail?1:0);
