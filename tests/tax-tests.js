/* "Money to set aside for tax" card (src/js/61-tax.js): the math, the dashboard card, its settings, and phone layout. */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
(async()=>{const b=await chromium.launch();const R=[];const ok=(n,c,d)=>R.push([n,!!c,d]);
 const ctx=await b.newContext({viewport:{width:360,height:780}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(700);await p.evaluate(()=>gLocal());
 // ---- math (values worked out by hand from the 2026 brackets and BTL rates)
 const m=await p.evaluate(()=>{const r=x=>Math.round(x);const a=taxCalc(60000,2.25),c=taxCalc(120000,2.25),d=taxCalc(120000,2.75),z=taxCalc(0,2.25),big=taxCalc(1200000,2.25);
  return {a:[r(a.it),r(a.ni),r(a.hi)],c:[r(c.it),r(c.ni),r(c.hi)],d:r(d.it),z:r(z.total),bigNi:r(big.ni+big.hi),br:r(taxBr(84120)),br2:r(taxBr(100000))}});
 ok('מדרגה ראשונה: 84,120 × 10% = 8,412',m.br===8412,m.br);
 ok('מדרגה שנייה: 100,000 → 8,412 + 15,880 × 14%',m.br2===8412+2223,m.br2);
 ok('רווח 60,000: אין מס הכנסה (נקודות הזיכוי מכסות), ביטוח לאומי ובריאות בשיעור מופחת',m.a[0]===0&&m.a[1]===2682&&m.a[2]===1938,JSON.stringify(m.a));
 ok('רווח 120,000: מס הכנסה 6,343, ביטוח לאומי 7,668, בריאות 4,411',JSON.stringify(m.c)==='[6343,7668,4411]',JSON.stringify(m.c));
 ok('עוד חצי נקודת זיכוי מורידה 1,452 ₪ ממס ההכנסה',m.c[0]-m.d===1452,m.c[0]-m.d);
 ok('בלי רווח: אין מה לשים בצד',m.z===0,m.z);
 ok('ביטוח לאומי נעצר בהכנסה המרבית (51,910 לחודש)',m.bigNi===Math.round((7703*.077+(51910-7703)*.18)*12),m.bigNi);
 // ---- card on the dashboard, with income and expenses this tax year
 await p.evaluate(()=>{const ds=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10),now=new Date();
  S.clients.push({id:1,name:'נוח',rate:1000});for(let i=0;i<10;i++)S.entries.push({id:100+i,cid:1,date:ds(new Date(now.getFullYear(),now.getMonth(),Math.max(1,now.getDate()-i))),days:1,rate:1000,amount:1000,receipt:false,note:''});
  (S.expenses=S.expenses||[]).push({id:500,date:ds(now),amount:2000,cat:'דלק',note:''},{id:501,date:(now.getFullYear()-1)+'-06-01',amount:9999,cat:'ישן',note:''});
  S.entries.push({id:200,cid:1,date:(now.getFullYear()+1)+'-01-15',days:1,rate:5000,amount:5000,receipt:false,note:'עתידי'});
  derive();save();tab='dash';render()});
 let t=await p.evaluate(()=>{const i=taxInfo(),el=document.getElementById('taxCard');return {inc:i.inc,exp:i.exp,prof:i.prof,sofar:Math.round(i.sofar),month:Math.round(i.month),has:!!el,txt:el?el.textContent:''}});
 ok('הכרטיס מופיע בדשבורד',t.has&&t.txt.indexOf('מס הכנסה')>=0,t.txt.slice(0,80));
 ok('הכנסות השנה בלבד, בלי ימים עתידיים',t.inc===10000,t.inc);
 ok('הוצאות מורידות מהרווח, הוצאה משנה קודמת לא נספרת',t.exp===2000&&t.prof===8000,JSON.stringify(t));
 ok('סכום "עד היום" וסכום חודשי חיוביים',t.sofar>0&&t.month>0,JSON.stringify(t));
 // ---- settings
 await p.evaluate(()=>{tab='set';render()});
 const s0=await p.evaluate(()=>[document.getElementById('stx').value,document.getElementById('stxp').value]);
 ok('הגדרות: ברירת מחדל פעיל ו-2.25 נקודות',s0[0]==='on'&&s0[1]==='2.25',JSON.stringify(s0));
 await p.fill('#stxp','2.75');await p.dispatchEvent('#stxp','change');
 const it1=await p.evaluate(()=>{S.txPts=2.25;const a=taxInfo().c.it;S.txPts=2.75;return [a,taxInfo().c.it,S.txPts]});
 ok('שינוי נקודות זיכוי נשמר ומשפיע על החישוב',it1[2]===2.75&&it1[1]<=it1[0],JSON.stringify(it1));
 await p.fill('#stxp','-3');await p.dispatchEvent('#stxp','change');
 {const v=await p.evaluate(()=>[S.txPts,document.getElementById('stxp').value]);ok('ערך לא תקין חוזר ל-2.25',v[0]===2.25&&v[1]==='2.25',JSON.stringify(v))}
 ok('ההגדרה נשמרת בסנכרון ובגיבוי',await p.evaluate(()=>SETK.indexOf('txOn')>=0&&SETK.indexOf('txPts')>=0&&setCont().txPts===2.25));
 await p.selectOption('#stx','off');
 await p.evaluate(()=>{tab='dash';render()});
 ok('כיבוי מסתיר את הכרטיס',await p.evaluate(()=>!document.getElementById('taxCard')&&S.txOn===false));
 await p.evaluate(()=>{S.txOn=true;save();render()});
 // ---- phone layout + English
 ok('מסך 360px: אין גלילה אופקית בדשבורד',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const en=await p.evaluate(async()=>{S.lang='en';save();render();await new Promise(r=>setTimeout(r,300));const h=[...document.querySelectorAll('#dashBody h2')].map(x=>x.textContent);S.lang='he';save();render();return h});
 ok('באנגלית: כותרת הכרטיס מתורגמת',en.indexOf('Money to set aside for tax')>=0,JSON.stringify(en));
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R.length-f)+'/'+R.length+' passed');await b.close();process.exit(f?1:0)})();
