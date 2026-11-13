/* Button audit: clicks EVERY visible button on every screen (and the buttons inside each dialog it opens), with mouse, touch and keyboard.
   Fails on any JavaScript error; reports buttons that produced no visible reaction so they can be reviewed. */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
const seed=()=>{const T=Date.now(),d=new Date();const ds=x=>x.toISOString().slice(0,10);S.clients.push({id:1,name:'נוח',phone:'+972501234567',rate:600,hrate:60},{id:2,name:'דנה',phone:'',rate:500});
 for(let i=0;i<6;i++){const dd=new Date(d.getFullYear(),d.getMonth(),Math.max(1,d.getDate()-i));S.entries.push({id:100+i,cid:1+(i%2),date:ds(new Date(dd.getTime()-dd.getTimezoneOffset()*60000)),days:1,rate:600,amount:600,receipt:false,note:'בדיקה'})}
 S.pays.push({id:300,cid:1,date:ds(d),amount:300,method:'cash',alloc:[{eid:100,amt:300}]});(S.debts=S.debts||[]).push({id:400,name:'אבי',amount:1000,date:ds(d),pays:[]});(S.expenses=S.expenses||[]).push({id:500,date:ds(d),amount:120,cat:'דלק',note:''});
 (S.tasks=S.tasks||[]).push({id:600,title:'להתקשר',due:ds(d),time:'',done:false});derive();save();render()};
(async()=>{const b=await chromium.launch();const R=[];const ok=(n,c,d)=>R.push([n,!!c,d]);const silent=[];let clicks=0;
 const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
 await p.goto(URL);await p.waitForTimeout(700);await p.evaluate(()=>gLocal());await p.evaluate(seed);const snap=await p.evaluate(()=>JSON.stringify(S));
 const sig=()=>p.evaluate(()=>[document.querySelector('main').innerHTML.length,document.getElementById('sheet').hidden,JSON.stringify(S).length,tab,(document.getElementById('toast')||{}).textContent||'',document.activeElement&&document.activeElement.id,location.hash,window.scrollY].join('|'));
 const reset=async t=>{await p.evaluate(([s,t])=>{try{closeS()}catch(e){}S=JSON.parse(s);derive();tab=t;CID=null;render();window.scrollTo(0,0)},[snap,t])};
 const label=h=>p.evaluate(e=>(e.getAttribute('aria-label')||e.textContent||e.id||'').trim().slice(0,40),h);
 const SKIP=/מחיקת כל הנתונים|מחיקת החשבון|יציאה|Google|Apple|ייבוא|העלאת תמונה|קבצים|📂|📎|צילום|הקלטת|סאמיט/;
 const tabs=['clock','pay','dash','cal','cli','set'];
 for(const t of tabs){await reset(t);const n=await p.evaluate(()=>[...document.querySelectorAll('main button, #nav button')].filter(b=>b.offsetParent&&!b.disabled).length);
  for(let i=0;i<n;i++){await reset(t);const bs=await p.$$('main button:visible, #nav button:visible');const h=bs.filter(Boolean)[i];if(!h)continue;const lb=await label(h);if(SKIP.test(lb))continue;
   const before=await sig();const e0=errs.length;let dl=false;const dlw=p.waitForEvent('download',{timeout:400}).then(()=>dl=true).catch(()=>{});
   try{await h.scrollIntoViewIfNeeded({timeout:500});await h.click({timeout:1500})}catch(e){continue}clicks++;await dlw;await p.waitForTimeout(120);const after=await sig();
   if(errs.length>e0)ok('['+t+'] '+lb+': בלי שגיאה',false,errs.slice(e0).join('|'));
   if(before===after&&!dl)silent.push(t+': '+lb);
   // one level into an opened dialog
   if(await p.evaluate(()=>!document.getElementById('sheet').hidden)){const m=await p.evaluate(()=>[...document.querySelectorAll('#sheetBody button')].filter(x=>x.offsetParent&&!x.disabled).length);
    for(let j=0;j<m;j++){const sb=(await p.$$('#sheetBody button:visible'))[j];if(!sb)break;const sl=await label(sb);if(SKIP.test(sl)||/כן, למחוק/.test(sl))continue;const e1=errs.length;try{await sb.click({timeout:1000});clicks++}catch(e){}await p.waitForTimeout(80);if(errs.length>e1)ok('['+t+' › '+lb+'] '+sl+': בלי שגיאה',false,errs.slice(e1).join('|'));
     if(await p.evaluate(()=>document.getElementById('sheet').hidden))break}}}}
 ok('כל הכפתורים בכל המסכים נלחצו בלי שגיאת JavaScript ('+clicks+' לחיצות)',!errs.length,errs.slice(0,5).join(' | '));
 // delete with confirmation
 await reset('cli');await p.evaluate(()=>{CID=1;render()});const nE=await p.evaluate(()=>S.entries.length);await p.click('main button:visible:has-text("מחיקה") >> nth=0');ok('מחיקה פותחת חלון אישור ולא מוחקת מיד',await p.evaluate(()=>!document.getElementById('sheet').hidden)&&await p.evaluate(n=>S.entries.length===n,nE));
 await p.click('#sheetBody button:has-text("ביטול")');ok('ביטול המחיקה משאיר את הרישום',await p.evaluate(n=>S.entries.length===n,nE));
 await p.click('main button:visible:has-text("מחיקה") >> nth=0');await p.click('#sheetBody button:has-text("כן, למחוק")');await p.waitForTimeout(150);ok('אישור המחיקה מוחק רישום אחד',await p.evaluate(n=>S.entries.length===n-1,nE));
 // exports produce files
 await reset('dash');const exp=await p.evaluate(()=>[...document.querySelectorAll('main button')].filter(b=>/CSV|Excel|PDF|דוח|ייצוא/.test(b.textContent)&&b.offsetParent).map(b=>b.textContent.trim()).slice(0,6));let got=0;
 for(const x of exp){await reset('dash');const w=p.waitForEvent('download',{timeout:3000}).then(()=>1).catch(()=>0);await p.click('main button:visible:has-text("'+x.replace(/"/g,'')+'")').catch(()=>{});got+=await w;await p.evaluate(()=>{try{closeS()}catch(e){}})}
 ok('כפתורי ייצוא בדשבורד מורידים קובץ ('+got+'/'+exp.length+')',exp.length>0&&got>0,JSON.stringify(exp));
 // backup download + restore round trip
 await reset('set');const w2=p.waitForEvent('download',{timeout:4000}).catch(()=>null);await p.evaluate(()=>expFile());const d2=await w2;ok('גיבוי JSON יורד כקובץ תקין',!!d2&&/easy-record-backup-.*\.json$/.test(d2.suggestedFilename()),d2&&d2.suggestedFilename());
 if(d2){const fp=await d2.path();const txt=require('fs').readFileSync(fp,'utf8');const o=JSON.parse(txt);await reset('set');const n0=await p.evaluate(()=>S.entries.length);await p.evaluate(()=>{S.entries.splice(0,3);derive();save();render()});await p.setInputFiles('#jf',fp);await p.waitForTimeout(600);
  await p.evaluate(()=>impGo('merge'));await p.waitForTimeout(800);const back=await p.evaluate(()=>S.entries.length);ok('שחזור (מיזוג) מהגיבוי שהורד מחזיר את ימי העבודה שנמחקו',back===n0,JSON.stringify([n0,back]))}
 // keyboard: Tab to a nav button + Enter navigates
 await reset('clock');await p.focus('#nav button[data-t="cli"]');await p.keyboard.press('Enter');ok('מקלדת: Enter על כפתור ניווט עובר מסך',await p.evaluate(()=>tab==='cli'));
 await p.focus('#nav button[data-t="set"]');await p.keyboard.press('Space');ok('מקלדת: רווח על כפתור ניווט עובר מסך',await p.evaluate(()=>tab==='set'));
 await reset('clock');await p.evaluate(()=>{$('ckClient').value='נוח';ckPre()});await p.focus('#nav #pwrB');await p.keyboard.press('Enter');ok('מקלדת: כפתור ההפעלה מתחיל עבודה',await p.evaluate(()=>!!activeSes()));
 // touch
 const tc=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const tp=await tc.newPage();const terr=[];tp.on('pageerror',e=>terr.push(e.message));await tp.goto(URL);await tp.waitForTimeout(700);await tp.evaluate(()=>gLocal());await tp.evaluate(seed);
 for(const t of tabs){await tp.tap('#nav button[data-t="'+t+'"]');await tp.waitForTimeout(100)}ok('מגע: הקשה על כל לשונית ניווט עוברת מסך',await tp.evaluate(()=>tab==='set'));
 await tp.tap('#nav button[data-t="clock"]');await tp.evaluate(()=>{$('ckClient').value='נוח';ckPre()});await tp.tap('#pwrB');await tp.waitForTimeout(200);ok('מגע: כפתור ההפעלה מתחיל עבודה',await tp.evaluate(()=>!!activeSes()));
 await tp.waitForTimeout(1600);await tp.tap('#pwrB');await tp.waitForTimeout(200);ok('מגע: הקשה נוספת מסיימת עבודה',await tp.evaluate(()=>!activeSes()&&S.entries.length===7));
 ok('מגע: בלי שגיאות JavaScript',!terr.length,terr.join('|'));
 // visual overflow on mobile: no horizontal scroll on any tab
 const ov=[];for(const t of tabs){await reset(t);if(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1))ov.push(t)}ok('תצוגת מובייל 390px: אין גלילה אופקית באף מסך',!ov.length,ov.join(','));
 console.log('INFO כפתורים בלי תגובה נראית (לבדיקה ידנית): '+(silent.length?silent.join(' ; '):'אין'));
 let f=0;R.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R.length-f)+'/'+R.length+' passed');await b.close();process.exit(f?1:0)})();
