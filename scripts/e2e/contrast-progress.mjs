import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};

/*
 * 進度相關的標記只有「已經有進度」時才畫得出來：
 * 課程列表的完成打勾與「全對」、單字卡與動詞列的熟練度星等。
 * contrast.mjs 從空白狀態開站，這些一個都量不到 ——
 * Phase 16 的 accent badge 就是這樣漏掉的（3.75:1，低於 AA）。
 * 這支專門把它們叫出來量。
 */
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
  for (const el of document.querySelectorAll('main *')){
    const txt=(el.textContent||'').trim();
    if(!txt||el.children.length) continue;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none') continue;
    const fg=parse(cs.color); const b=bg(el);
    if(!fg||b==='gradient') continue;
    const L1=lum(fg),L2=lum(b);
    const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight,10)>=700;
    const large=size>=24||(size>=18.66&&bold);
    const need=large?3:4.5;
    if(ratio<need) out.push({txt:txt.slice(0,20), ratio:+ratio.toFixed(2), need, size:Math.round(size)});
  }
  return out;
};

/** 直接把進度寫進 IndexedDB —— 做完 41 課太慢，而且我們要量的是畫面不是流程 */
const SEED = async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('camino-a-quito', 1);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const write = (k, v) => new Promise((res, rej) => {
    const r = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
    r.onsuccess = () => res(true); r.onerror = () => rej(r.error);
  });
  const now = new Date().toISOString();
  // 一張 5 星的卡（stability 夠大、reps > 0）與兩課（一課全對、一課 70%）
  const card = { due: now, stability: 90, difficulty: 5, elapsed_days: 1, scheduled_days: 90,
                 reps: 9, lapses: 0, state: 2, last_review: now };
  await write('camino:progress', JSON.stringify({
    state: {
      cards: { 'w:cafe-bebida': card, 'w:ser': card },
      dailyStats: {}, recentLog: [],
      lessons: {
        'a0-saludos': { completedAt: now, bestAccuracy: 1, attempts: 1 },
        'a0-genero': { completedAt: now, bestAccuracy: 0.7, attempts: 2 },
      },
      totalXp: 400,
      streak: { current: 3, best: 3, freezes: 0, lastActiveDay: null, lastFreezeGrantWeek: null },
      seenAchievements: [],
    },
    version: 0,
  }));
  return 'ok';
};

const b=await chromium.launch({executablePath:EXE});
for (const theme of ['light','dark']){
  const p=await b.newPage({viewport:{width:1100,height:1200},colorScheme:theme});
  await p.goto(BASE+'#/',{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  ck(`[${theme}] 種得進進度`, (await p.evaluate(SEED))==='ok');
  await p.reload({waitUntil:'networkidle'});
  await p.waitForTimeout(1000);
  for (let i=0;i<6;i++){
    const ok=p.getByRole('button',{name:/^好$|^Nice$/});
    if(!(await ok.count())) break;
    await ok.first().click().catch(()=>{}); await p.waitForTimeout(400);
  }

  // 課程列表：完成打勾、「全對」、「最佳 70%」、城市的「做完 N / M 課」
  await p.goto(BASE+'#/lessons',{waitUntil:'networkidle'});
  await p.waitForTimeout(800);
  const t=await p.locator('main').innerText();
  ck(`[${theme}] 完成標記真的畫出來了`, /全對|Perfect/.test(t) && /做完|of \d+ done/.test(t),
     t.split('\n').filter(l=>/全對|最佳|做完/.test(l)).slice(0,3).join(' / '));
  let bad=await p.evaluate(AUDIT);
  ck(`[${theme}] 課程列表的完成標記對比都過 AA`, bad.length===0, JSON.stringify(bad));

  // 單字表：熟練度星等
  await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  await p.getByRole('textbox',{name:/搜尋|Search/}).first().fill('café');
  await p.waitForTimeout(600);
  ck(`[${theme}] 星等真的畫出來了`,
     (await p.locator('main [aria-label*="熟練度"], main [aria-label*="Mastery"]').count())>0);
  bad=await p.evaluate(AUDIT);
  ck(`[${theme}] 單字表（含星等）對比都過 AA`, bad.length===0, JSON.stringify(bad));

  await p.goto(BASE+'#/verbs',{waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  bad=await p.evaluate(AUDIT);
  ck(`[${theme}] 動詞列表（含星等）對比都過 AA`, bad.length===0, JSON.stringify(bad));

  await p.close();
}
await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
