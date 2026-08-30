import { chromium } from 'playwright';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE=process.argv[2], SP=process.argv[3];
let fail=0;
const ck=(n,ok,x='')=>{console.log(`  ${ok?'✓':'✗'} ${n}${x?'  '+x:''}`); if(!ok)fail++;};
const T=p=>p.locator('main').innerText();
// 離開練習頁後，先前壓著的慶祝視窗會播出來（設計上的行為），它是 modal 會擋住點擊
async function clearCelebrations(p){
  for (let i=0;i<8;i++){
    if (!(await p.locator('[role="dialog"]').count())) return;
    await p.getByRole('button',{name:/^好$|^Nice$/}).first().click().catch(()=>{});
    await p.waitForTimeout(400);
  }
}

const b=await chromium.launch({executablePath:EXE});
const p=await b.newPage({viewport:{width:1000,height:1200}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});

/* ------------------------------------------------------------------ *
 * 1. 聽力題的降級路徑
 *    容器裡沒有任何 TTS 語音，所以跑到的一定是 fallback：
 *    發音按鈕不出現、句子直接印出來、題目仍然作答得完。
 *    b1-si-condicionales 的第一題就是聽力，而且句子含逗號，
 *    順便驗「沒打逗號、沒打重音」也判得對。
 * ------------------------------------------------------------------ */
console.log('\n[1] 沒有語音時聽力題改成抄寫');
const voices=await p.evaluate(()=>speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('es')).length);
ck('這台機器確實沒有 es 語音（否則測不到 fallback）', voices===0, `es 語音 ${voices} 個`);

await p.goto(BASE+'#/practice/b1-si-condicionales',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
let t=await T(p);
ck('第一題就是聽力題', /照著下面的句子打一次/.test(t), t.split('\n')[2]??'');
ck('說明有講原因', /沒有西班牙文語音/.test(t));
ck('發音按鈕不存在', await p.getByRole('button',{name:'播放'}).count()===0);
ck('放慢重聽的按鈕也不存在', await p.getByRole('button',{name:/放慢/}).count()===0);
ck('句子直接印在畫面上', /Si tuviera tiempo, iría a Galápagos/.test(t));
ck('輸入框提示改成「照著上面的句子打」（沒東西可以聽）',
   await p.locator('main input[placeholder*="照著上面"]').count()===1);
await p.screenshot({path:`${SP}/p8-listening-fallback.png`,fullPage:true});

const inp=p.locator('main input[type="text"]').first();
await inp.fill('Si tuviera tiempo iria a Galapagos');   // 沒逗號、沒重音
await inp.press('Enter');
await p.waitForTimeout(700);
t=await T(p);
ck('沒打逗號也沒打重音仍然判對', /答對了/.test(t), t.split('\n').find(l=>/答對|答錯/.test(l))??'');
ck('解釋有出現', /過去虛擬式|條件式/.test(t));
await p.screenshot({path:`${SP}/p8-listening-answered.png`,fullPage:true});

// 直接改網址換到另一課的練習（route.name 沒變，元件不會重掛）——
// 沒有 key 的話 index 與作答狀態會整組留著，第二課一進去就是「已作答」
await p.goto(BASE+'#/practice/a0-ser-estar',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
await clearCelebrations(p);
t=await T(p);
ck('換一課的練習會從第一題重來', /1\/10/.test(t), t.match(/\d+\/\d+/)?.[0]??'');
const inp2=p.locator('main input[type="text"]').first();
ck('輸入框可以打字（沒有留著上一課的已作答狀態）', await inp2.isEnabled());
ck('a0-ser-estar 第一題也是聽力', /照著下面的句子打一次/.test(t));
await inp2.fill('soy estudiante y estoy cansado');   // 全小寫
await inp2.press('Enter');
await p.waitForTimeout(700);
ck('全小寫也判對', /答對了/.test(await T(p)));

/* ------------------------------------------------------------------ *
 * 2. 陰陽性分類題：從單字表的主題篩選進去，實際分類到結算
 * ------------------------------------------------------------------ */
console.log('\n[2] 主題陰陽性分類');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
ck('沒有篩選主題時不顯示入口', await p.getByRole('link',{name:/練這個主題的陰陽性/}).count()===0);

await p.getByRole('button',{name:/^食物與飲料/}).first().click();
await p.waitForTimeout(400);
const cta=p.getByRole('link',{name:/練這個主題的陰陽性/});
ck('篩選主題後出現入口', await cta.count()===1);
await p.screenshot({path:`${SP}/p8-vocab-cta.png`,fullPage:true});
await cta.first().click();
await p.waitForTimeout(900);

t=await T(p);
ck('標題是分類題不是閃卡', /陰陽性快速分類/.test(t), t.split('\n').slice(0,4).join(' / '));
ck('說明帶到主題名稱', /食物與飲料/.test(t));
ck('題目提示出現', /el 還是 la/.test(t));
ck('有倒數計時', /\d+s/.test(t), t.match(/\d+s/)?.[0]??'');
await p.screenshot({path:`${SP}/p8-gendersort.png`,fullPage:true});

const shown=[];
for (let i=0;i<8;i++){
  shown.push((await p.locator('main p[lang="es"]').first().innerText()).trim());
  await p.getByRole('button',{name:i%2===0?'el':'la'}).first().click();
  await p.waitForTimeout(220);
}
await p.waitForTimeout(600);
t=await T(p);
ck('八個字都跑完並結算', /這一輪結束/.test(t));
const score=(await p.locator('main p.text-3xl').first().innerText()).trim();
ck('結算顯示得分', /^\d+ \/ 8$/.test(score), score);
// 故意 el/la 交替作答，這一組不是剛好交替，所以不可能全對 —— 判分真的有在判
ck('判分不是照單全收', score!=='8 / 8', score);
const chips=await p.locator('main ul li').allInnerTexts();
ck('正解列出八個，而且都帶冠詞', chips.length===8 && chips.every(c=>/^(el|la) /.test(c.trim())), chips.join(' · '));
ck('結算把剛才分類的字都列出來', shown.every(w=>t.includes(w)), shown.join(' '));
ck('分類的是八個不同的字', new Set(shown).size===8);
ck('沒有兩個冠詞都對的字混進來', !/estudiante|guía|policía|visitante|azúcar|agua|hambre/.test(shown.join(' ')), shown.join(' '));
await p.screenshot({path:`${SP}/p8-gendersort-done.png`,fullPage:true});

// 離開再回來要是同一組字 —— 每次換一批就記不起來
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
await p.waitForTimeout(500);
await clearCelebrations(p);
await p.goto(BASE+'#/drill/gender-comida',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
await clearCelebrations(p);
const again=[];
for (let i=0;i<3;i++){
  again.push((await p.locator('main p[lang="es"]').first().innerText()).trim());
  await p.getByRole('button',{name:'el'}).first().click();
  await p.waitForTimeout(220);
}
ck('同一個主題每次都是同一組字', again.join(' ')===shown.slice(0,3).join(' '),
   `${again.join(' ')} vs ${shown.slice(0,3).join(' ')}`);

/* ------------------------------------------------------------------ *
 * 3. 字不夠的主題不給按鈕（按了沒反應的按鈕比沒有按鈕更糟）
 * ------------------------------------------------------------------ */
console.log('\n[3] 出不了題的主題');
await p.goto(BASE+'#/vocab',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await clearCelebrations(p);
await p.getByRole('button',{name:/^情緒與個性/}).first().click();   // emociones 只有 3 個名詞
await p.waitForTimeout(400);
ck('情緒主題不顯示入口', await p.getByRole('link',{name:/練這個主題的陰陽性/}).count()===0);

console.log('\n[4] 課文頁看得到新題型');
await p.goto(BASE+'#/lessons/a1-gustar',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
t=await T(p);
ck('題型預覽列出聽力', /聽力/.test(t));
ck('題型預覽列出陰陽性分類', /陰陽性分類/.test(t));

console.log('\n[5] 頁面沒有 JS 錯誤');
ck('沒有 pageerror / console error', errs.length===0, errs.slice(0,3).join(' | '));

await b.close();
console.log(fail? `\n${fail} 項未通過\n` : '\n全部通過\n');
process.exit(fail?1:0);
