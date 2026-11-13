// Easy Record automated tests (headless Chromium + mock of the shared db capability)
// Usage: node tests/run-tests.js <path-to-index.html> [path-to-chromium] [path-to-jszip.min.js]
const fs=require('fs'),http=require('http'),path=require('path');
const puppeteer=require(process.env.PUPPETEER||'/opt/npm-tools/node_modules/puppeteer');
const APP=path.resolve(process.argv[2]||'index.html');
const CHROME=process.argv[3]||process.env.CHROME||'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const JSZIP=fs.readFileSync(process.argv[4]||process.env.JSZIP||'/opt/npm-tools/node_modules/jszip/dist/jszip.min.js','utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];let errors=[];
async function step(name,fn){const t=Date.now();try{const r=await fn();results.push({name,ok:true,note:r||'',ms:Date.now()-t});console.log('PASS',name,r||'')}catch(e){results.push({name,ok:false,note:e.message,ms:Date.now()-t});console.log('FAIL',name,'-',e.message)}}
function eq(a,b,m){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error((m||'mismatch')+': expected '+JSON.stringify(b)+' got '+JSON.stringify(a))}
function ok(c,m){if(!c)throw new Error(m||'assertion failed')}
// ---- shared mock cloud store (stands in for the db capability) ----
const store=new Map();
const MOCK=`(function(){window.__OFF=false;window.__FAILSET=false;
Object.defineProperty(navigator,'onLine',{get:function(){return !window.__OFF}});
function gate(){if(window.__OFF){var e=new Error('offline');e.code='unavailable';throw e}}
var nm=function(d){return JSON.parse(JSON.stringify(d))};
function snapOf(id,d){return {id:id,exists:d!==null&&d!==undefined,data:function(){return d==null?undefined:Object.freeze(nm(d))},metadata:{fromCache:false,hasPendingWrites:false}}}
var db={doc:function(path){var id=path.split('/').pop();return {path:path,id:id,
 get:async function(){gate();return snapOf(id,await window.__dbGet(path))},
 set:async function(data){gate();if(window.__FAILSET){var e=new Error('server rejected');e.code='unavailable';throw e}await window.__dbSet(path,nm(data))},
 onSnapshot:function(next,err){var last;var tick=async function(){if(window.__OFF)return;try{var d=await window.__dbGet(path);var s=JSON.stringify(d);if(s!==last){last=s;next(snapOf(id,d))}}catch(e){}};tick();var h=setInterval(tick,200);return function(){clearInterval(h)}}}},
 collection:function(name){return {name:name,
 get:async function(){gate();var l=await window.__dbList(name);var docs=l.map(function(x){return snapOf(x.id,x.data)});return {docs:docs,size:docs.length,empty:!docs.length,docChanges:function(){return []},metadata:{fromCache:false,hasPendingWrites:false}}},
 onSnapshot:function(next,err){var last={},first=true;var tick=async function(){if(window.__OFF)return;try{var l=await window.__dbList(name),ch=[],cur={};
  l.forEach(function(x){var s=JSON.stringify(x.data);cur[x.id]=s;if(!(x.id in last))ch.push({type:'added',doc:snapOf(x.id,x.data)});else if(last[x.id]!==s)ch.push({type:'modified',doc:snapOf(x.id,x.data)})});
  if(first||ch.length){first=false;last=cur;var docs=l.map(function(x){return snapOf(x.id,x.data)});next({docs:docs,size:docs.length,empty:!docs.length,docChanges:function(){return ch},metadata:{fromCache:false,hasPendingWrites:false}})}}catch(e){}};tick();var h=setInterval(tick,200);return function(){clearInterval(h)}}}}};
window.claude={use:async function(n){if(n==='db')return db;if(n==='user')return {can:async function(){return window.__CAN!==false}};if(n==='downloads')return {save:async function(o){(window.__dl=window.__dl||[]).push(o)}};return null}};})();`;
let server,PORT,browser;
async function device(opts={}){
  const ctx=await (browser.createBrowserContext?browser.createBrowserContext():browser.createIncognitoBrowserContext());
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
  await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('http://localhost:')?r.continue():r.abort());
  await page.exposeFunction('__dbGet',p=>store.has(p)?store.get(p):null);
  await page.exposeFunction('__dbSet',(p,d)=>{store.set(p,d)});
  await page.exposeFunction('__dbList',c=>[...store.entries()].filter(([k])=>k.startsWith(c+'/')).map(([k,v])=>({id:k.slice(c.length+1),data:v})));
  if(!opts.noJszip)await page.evaluateOnNewDocument(JSZIP);
  if(opts.nocloud)await page.evaluateOnNewDocument('window.__NOCLOUD=1');else await page.evaluateOnNewDocument(MOCK);
  if(opts.cant)await page.evaluateOnNewDocument('window.__CAN=false');
  if(opts.seed)await page.evaluateOnNewDocument('if(!localStorage.getItem("__seeded")){localStorage.setItem("workdays-v1",'+JSON.stringify(opts.seed)+');localStorage.setItem("__seeded","1")}');
  if(opts.seedIdb){await page.goto('http://localhost:'+PORT+'/blank.html');await page.evaluate(async(recs)=>{await new Promise((ok,no)=>{const q=indexedDB.open('wd-'+'receipts',1);q.onupgradeneeded=()=>q.result.createObjectStore('r',{keyPath:'id'});q.onsuccess=()=>{const t=q.result.transaction('r','readwrite');recs.forEach(r=>t.objectStore('r').put({id:r.id,cid:r.cid,eid:r.eid,name:r.name,type:r.type,date:r.date,blob:new Blob([new Uint8Array(r.bytes)],{type:r.type})}));t.oncomplete=()=>{q.result.close();ok()};t.onerror=no}})},opts.seedIdb)}
  await page.goto('http://localhost:'+PORT+'/index.html');
  await page.waitForFunction('typeof bootMigrate==="function"&&document.getElementById("syn")',{timeout:10000});
  await sleep(opts.settle||600);return page;}
async function until(page,fn,ms=9000,arg){const end=Date.now()+ms;while(Date.now()<end){try{if(await page.evaluate(fn,arg))return true}catch(e){}await sleep(150)}return false}
const ev=(p,f,a)=>p.evaluate(f,a);
const LEG={rate:600,clients:[{id:1,name:'נוח',phone:'050-1111111'},{id:2,name:'דנה',phone:''}],entries:[
 {id:101,gid:101,cid:1,date:'2026-11-03',days:0.67,rate:600,amount:400,paid:false,method:'',receipt:false,note:'שיפוץ'},
 {id:102,gid:101,cid:1,date:'2026-11-03',days:0.33,rate:600,amount:200,paid:true,method:'ביט',pdate:'2026-11-04',receipt:false,note:'תשלום חלקי'},
 {id:103,cid:2,date:'2026-11-05',days:1,rate:600,amount:600,paid:true,method:'מזומן',pdate:'2026-11-06',receipt:true},
 {id:104,cid:1,date:'2026-11-02',days:2,rate:600,amount:1200,paid:false,method:'',receipt:false},
 {id:105,gid:105,cid:1,date:'2026-10-01',days:0.5,rate:600,amount:300,paid:false,method:'',receipt:false},
 {id:106,gid:105,cid:1,date:'2026-10-02',days:0.5,rate:600,amount:300,paid:true,method:'כללי',pdate:'2026-10-03',receipt:false}]};
const SEED=JSON.stringify(LEG);
async function addDay(p,name,days,note){return ev(p,(a)=>{selD=today();$('client').value=a[0];$('days').value=a[1];$('note').value=a[2]||'';calc();$('add').onclick();return S.entries.length},[name,days,note])}
(async()=>{
  server=http.createServer((q,s)=>{if(q.url.startsWith('/config.js')){s.statusCode=404;return s.end()}s.setHeader('content-type','text/html; charset=utf-8');s.end(q.url.startsWith('/blank')?'<html><body>blank</body></html>':fs.readFileSync(APP))}).listen(0);PORT=server.address().port;
  browser=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']});

  // ===== 1. migration of legacy data =====
  await step('מיגרציה: נתונים ישנים מומרים, סכומים נשמרים, אין איחוד לא וודאי',async()=>{
    const p=await device({seed:SEED,nocloud:true});
    const r=await ev(p,()=>({schema:S.schema,n:S.entries.length,pays:S.pays.length,tot:S.entries.reduce((s,e)=>s+e.amount,0),paid:S.pays.reduce((s,x)=>s+x.amount,0),
      e101:(e=>({amount:e.amount,pa:e.pa,bl:e.bl,days:e.days,legacy:e.legacy}))(S.entries.find(e=>e.id===101)),e105:!!S.entries.find(e=>e.id===105),e106:!!S.entries.find(e=>e.id===106),e102:!!S.entries.find(e=>e.id===102),raw:localStorage.getItem('er4-premig-backup'),legacyKey:localStorage.getItem('workdays-v1'),newKey:!!localStorage.getItem('er4-v3')}));
    eq(r.schema,3);eq(r.n,5,'entries');eq(r.pays,3,'payments');eq(r.tot,3000,'work total');eq(r.paid,1100,'paid total');
    eq([r.e101.amount,r.e101.pa,r.e101.bl],[600,200,400],'merged split day 600/200/400');eq(r.e101.days,1);
    ok(r.e105&&r.e106,'ambiguous group 105/106 must stay separate');ok(!r.e102,'copy 102 absorbed into 101');
    eq(JSON.parse(r.raw).entries.length,6,'pre-migration raw backup kept (6 legacy rows)');eq(r.legacyKey,SEED,'legacy storage key must stay byte-identical (old app data untouched)');ok(r.newKey,'v4 data saved under its own key');
    ok(r.e101.legacy&&r.e101.legacy.merged.length===1,'legacy info preserved on merged entry');await p.close();return '5 ימי עבודה, 3 תשלומים, 3000/1100 ₪';});
  await step('מיגרציה: קבלות ישנות מועתקות, מקושרות לרישום המאוחד, והמסד הישן לא משתנה',async()=>{
    const p=await device({seed:SEED,nocloud:true,seedIdb:[{id:7,cid:1,eid:102,name:'x.png',type:'image/png',date:'2026-11-03',bytes:[1,2,3]},{id:8,cid:2,eid:103,name:'y.png',type:'image/png',date:'2026-11-05',bytes:[9,8]}],settle:1500});
    const r=await ev(p,async()=>{const old=await new Promise(ok=>{const q=indexedDB.open('wd-'+'receipts');q.onsuccess=()=>{const g=q.result.transaction('r').objectStore('r').getAll();g.onsuccess=()=>{ok(g.result.map(x=>[x.id,x.eid]));q.result.close()}}});
      return {mem:R.map(x=>[x.id,x.eid]).sort(),old:old.sort()}});
    eq(r.mem,[[7,101],[8,103]],'new store: receipt 7 re-linked from merged row 102 to 101');eq(r.old,[[7,102],[8,103]],'old store untouched');await p.close();});

  await step('ZIP פועל בלי רשת: JSZip מוטמע בקובץ (בלי CDN)',async()=>{const p=await device({nocloud:true,noJszip:true});const r=await ev(p,async()=>{const z=new JSZip();z.file('a.txt','שלום');const b=await z.generateAsync({type:'blob'});const z2=await JSZip.loadAsync(b);return await z2.file('a.txt').async('string')});eq(r,'שלום');await p.close()});

  // ===== 2. work days, payments =====
  const A=await device();
  await step('הוספת יום עבודה חדש (600 ₪)',async()=>{await addDay(A,'נוח',1,'בדיקה');const e=await ev(A,()=>({amount:S.entries[0].amount,pa:S.entries[0].pa,bl:S.entries[0].bl}));eq([e.amount,e.pa,e.bl],[600,0,600]);});
  await step('תשלום חלקי: היום נשאר רשומה אחת של 600 ₪',async()=>{
    const r=await ev(A,()=>{const e=S.entries[0];payPart(e.id);$('pa').value=200;$('pmx').value='ביט';doPart(e.id);const x=S.entries[0];return {n:S.entries.length,a:x.amount,pa:x.pa,bl:x.bl,pays:S.pays.length}});
    eq(r,{n:1,a:600,pa:200,bl:400,pays:1});});
  await step('מספר תשלומים לאותו יום + יתרה',async()=>{
    const r=await ev(A,()=>{const e=S.entries[0];payPart(e.id);$('pa').value=100;doPart(e.id);const x=S.entries[0];return {pays:S.pays.length,pa:x.pa,bl:x.bl,paid:x.paid}});eq(r,{pays:2,pa:300,bl:300,paid:false});});
  await step('תשלום גבוה מהיתרה נדחה',async()=>{
    const r=await ev(A,()=>{const e=S.entries[0];payPart(e.id);$('pa').value=1000;doPart(e.id);return {pays:S.pays.length,err:$('pce').textContent}});eq(r.pays,2);ok(/גבוה/.test(r.err),'no error shown');await ev(A,()=>closeS());});
  await step('מחיקת תשלום מעדכנת יתרה',async()=>{
    const r=await ev(A,()=>{const p=S.pays.find(x=>x.amount===100);delPay(p.id);CF();const x=S.entries[0];return {pays:S.pays.length,pa:x.pa,bl:x.bl}});eq(r,{pays:1,pa:200,bl:400});});
  await step('תשלום אחד למספר ימי עבודה (הקצאה מהישן לחדש)',async()=>{
    await ev(A,()=>{S.entries[0].date='2026-11-01';save();render()});
    await addDay(A,'נוח',1,'יום שני');
    const r=await ev(A,()=>{const c=S.entries[0].cid;payClient(c);$('pca').value=700;doPayClient(c);const old=S.entries.find(e=>e.date==='2026-11-01'),nw=S.entries.find(e=>e.note==='יום שני'),p=S.pays.find(x=>x.amount===700);return {oldBl:old.bl,oldPaid:old.paid,newBl:nw.bl,allocs:p.alloc.length,sum:p.alloc.reduce((s,a)=>s+a.amt,0)}});
    eq(r,{oldBl:0,oldPaid:true,newBl:300,allocs:2,sum:700});});
  await step('שמירה אוטומטית: רענון הדף שומר הכל',async()=>{
    const before=await ev(A,()=>({e:S.entries.length,p:S.pays.length}));await A.reload();await A.waitForFunction('typeof bootMigrate==="function"');await sleep(700);
    eq(await ev(A,()=>({e:S.entries.length,p:S.pays.length})),before);});
  await step('שמירה ב-IndexedDB כשה-localStorage נמחק',async()=>{
    const before=await ev(A,()=>({e:S.entries.length,p:S.pays.length}));await sleep(500);
    await ev(A,()=>localStorage.removeItem('er4-v3'));await ev(A,()=>localStorage.removeItem('er4-ts'));await A.reload();await A.waitForFunction('typeof bootMigrate==="function"');await sleep(1200);
    eq(await ev(A,()=>({e:S.entries.length,p:S.pays.length})),before,'state restored from IndexedDB');});

  // ===== 2b. time clock =====
  const H=3600000;
  await step('שעון: התחלה, הפסקה, המשך, סיום - חישוב נטו ושכר שעתי',async()=>{
    const r=await ev(A,(H)=>{const base=Date.now()-5*H;$('ckClient').value='שעון';$('ckBasis').value='hour';$('ckRate').value=100;startWork(base);startBreak(base+2*H);endBreak(base+2.5*H);finishWork(base+5*H);
      const s=S.sessions[0],e=S.entries.find(x=>x.sid===s.id);return {st:s.st,net:sesNet(s,s.t1)/H,gross:sesGross(s,s.t1)/H,br:sesBreaks(s,s.t1)/H,amount:e.amount,nh:e.nh,days:e.days,rate:e.rate,basis:e.basis,t:[e.t1,e.t2].join('-'),eid:s.eid===e.id}},H);
    eq([r.st,r.net,r.gross,r.br],['done',4.5,5,0.5]);eq([r.amount,r.nh,r.days,r.rate,r.basis],[450,4.5,0.56,800,'hour'],'hourly pay = net hours x rate');ok(r.eid);});
  await step('שעון: חישוב יומי יוצר רישום יום עבודה אחד בתעריף היומי',async()=>{
    const r=await ev(A,(H)=>{lastClk=0;const n0=S.entries.length,base=Date.now()-3*H;$('ckClient').value='שעון';$('ckBasis').value='day';$('ckRate').value=600;startWork(base);finishWork(base+3*H);const e=S.entries[S.entries.length-1];return {added:S.entries.length-n0,amount:e.amount,days:e.days,nh:e.nh}},H);eq(r,{added:1,amount:600,days:1,nh:3});});
  await step('שעון: מניעת הפעלה כפולה (שעון פעיל קיים ולחיצה כפולה מהירה)',async()=>{
    await sleep(1300);const r=await ev(A,()=>{$('ckClient').value='כפול';$('ckBasis').value='day';$('ckRate').value=600;startWork();const n1=S.sessions.length;startWork();const n2=S.sessions.length;const banner=!document.getElementById('ckb').hidden&&/שעון עבודה פעיל/.test(document.getElementById('ckb').textContent);return {n1,n2,banner}});
    eq(r.n1,r.n2,'second start must be blocked');ok(r.banner,'active-clock banner');
    const r2=await ev(A,()=>{lastClk=0;startWork();return S.sessions.filter(s=>s.st!=='done').length});eq(r2,1,'only one active session');
    await ev(A,()=>finishWork());});
  await step('שעון: משמרת שחוצה חצות',async()=>{
    const r=await ev(A,(H)=>{const d=new Date();d.setDate(d.getDate()-1);d.setHours(22,0,0,0);const a=d.getTime(),b=a+8*H;$('ckClient').value='לילה';$('ckBasis').value='hour';$('ckRate').value=50;lastClk=0;startWork(a);finishWork(b);const s=S.sessions.find(x=>x.t0===a),e=ent(s.eid);return {net:sesNet(s,s.t1)/H,date:e.date,startDate:ds(new Date(a)),endDate:ds(new Date(b)),amount:e.amount,t:e.t1+'-'+e.t2}},H);
    eq(r.net,8);eq(r.date,r.startDate,'entry dated by start day');ok(r.endDate!==r.startDate,'really crossed midnight');eq(r.amount,400);eq(r.t,'22:00-06:00');});
  await step('שעון: הפעלת שעון פעיל נשמרת אחרי סגירה ופתיחה, והזמן ממשיך להצטבר',async()=>{
    await ev(A,(H)=>{lastClk=0;$('ckClient').value='נשמר';$('ckBasis').value='day';$('ckRate').value=600;startWork(Date.now()-3*H)},H);
    await sleep(900);await A.reload();await A.waitForFunction('typeof bootMigrate==="function"');await sleep(900);
    const r=await ev(A,(H)=>{const s=activeSes();return s?{net:sesNet(s,Date.now())/H,st:s.st,banner:!document.getElementById('ckb').hidden}:null},H);ok(r,'active session lost after reload');ok(Math.abs(r.net-3)<0.01,'elapsed from timestamps, got '+r.net);ok(r.banner);
    await ev(A,()=>finishWork());});
  await step('שעון: תיקון שעות עם היסטוריה, הרישום המקושר מתעדכן',async()=>{
    const r=await ev(A,(H)=>{const s=S.sessions.find(x=>x.st==='done'&&x.basis==='hour'&&x.rate===100);const before=ent(s.eid).amount;ckEdit(s.id);$('ce1').value=dtl(s.t0);$('ce2').value=dtl(s.t1+H);$('ce3').value=30;$('ce4').value='שכחתי לסיים';ckSave(s.id);const e=ent(s.eid);return {before,after:e.amount,nh:e.nh,hist:s.hist.length,why:s.hist[0].why,from:Math.abs(s.hist[0].from.t1-(s.t1-H))<1500}},H);
    eq(r.before,450);eq(r.after,550);eq(r.nh,5.5);eq(r.hist,1);eq(r.why,'שכחתי לסיים');ok(r.from,'history keeps previous values');});
  await step('שעון: מעברי שעון קיץ וחורף (אזור זמן ניו יורק)',async()=>{
    const N=await device({nocloud:true});await N.emulateTimezone('America/New_York');await N.reload();await N.waitForFunction('typeof bootMigrate==="function"');await sleep(500);
    const r=await ev(N,(H)=>{const spring=[new Date(2026,2,8,1,30).getTime(),new Date(2026,2,8,3,30).getTime()],fall=[new Date(2026,10,1,0,30).getTime(),new Date(2026,10,1,3,30).getTime()];
      return {tz:tzName(),spring:(spring[1]-spring[0])/H,fall:(fall[1]-fall[0])/H,springSes:sesNet({t0:spring[0],t1:spring[1],br:[]},spring[1])/H,fallSes:sesNet({t0:fall[0],t1:fall[1],br:[]},fall[1])/H,wallSpring:'01:30-03:30'}},H);
    eq(r.tz,'America/New_York');eq(r.springSes,1,'spring forward: 01:30->03:30 is 1 real hour');eq(r.fallSes,4,'fall back: 00:30->03:30 is 4 real hours');await N.close();});

  // ===== 3. reports =====
  await step('דוחות: סכומים תואמים לחישוב עצמאי מהנתונים',async()=>{
    const r=await ev(A,()=>{rfill();const cid0=S.entries[0].cid,ids=new Set(S.entries.filter(e=>e.cid===cid0).map(e=>e.id)),ind={t:0,paid:0,allT:0,allPaid:0};S.entries.forEach(e=>{ind.allT+=e.amount;if(e.cid===cid0)ind.t+=e.amount});S.pays.forEach(p=>p.alloc.forEach(a=>{ind.allPaid+=a.amt;if(ids.has(a.eid))ind.paid+=a.amt}));
      $('rt').value='c';$('rc').value=String(S.entries[0].cid);$('rpp').value='a';rtu();const c=repData();$('rt').value='d';rtu();const d=repData();$('rt').value='m';$('rpp').value='a';rtu();
      const y=today().slice(0,4),m=+today().slice(5,7)-1;$('rmn').value=m;$('rmy').value=y;const mo=repData();
      ind.m=S.entries.filter(e=>e.date.startsWith(y+'-'+String(m+1).padStart(2,'0'))).reduce((s,e)=>s+e.amount,0);return {ind,client:c.sum.map(x=>x[2]),debt:d.sum[0][2],month:mo.sum.map(x=>x[2])}});
    eq(r.client.slice(0,3),[r.ind.t,r.ind.paid,r.ind.t-r.ind.paid],'client report');eq(r.debt,r.ind.allT-r.ind.allPaid,'debts report (all clients)');
    eq(r.month[0],r.ind.m,'monthly report total = sum of that month');return 'הכנסות '+r.ind.t+' · שולם '+r.ind.paid;});
  await step('דשבורד ותקרת מחזור מציגים סכומים נכונים',async()=>{
    const r=await ev(A,()=>{tab='dash';DP='a';render();const html=$('dashBody').innerHTML;const ci=capInfo();return {has:html.indexOf('הכנסות')>0,capT:ci.t,tot:S.entries.reduce((s,e)=>s+e.amount,0)}});ok(r.has);eq(r.capT,r.tot,'cap turnover = total work');});

  // ===== 4. backup zip / restore =====
  let snapshot;
  await step('גיבוי ZIP כולל קבלות, ושחזור מחזיר הכל בלי כפילויות',async()=>{
    await ev(A,async()=>{const rec={id:555,cid:S.entries[0].cid,eid:S.entries[0].id,name:'receipt.png',type:'image/png',date:'2026-11-01',blob:new Blob([new Uint8Array([137,80,78,71,1,2,3,4,5])],{type:'image/png'})};await tx('readwrite',s=>s.put(rec));R.push(rec)});
    snapshot=await ev(A,async()=>{let blob;window.dl=async(n,b)=>{blob=b};await expZip();const z=await JSZip.loadAsync(blob),d=JSON.parse(await z.file('data.json').async('string')),f=await z.file(d.receipts[0].file).async('uint8array');
      return {e:d.entries.length,p:d.payments.length,c:d.clients.length,rc:d.receipts.length,bytes:Array.from(f),counts:d.counts,state:{e:S.entries.map(x=>[x.id,x.amount,x.pa,x.bl]),p:S.pays.map(x=>[x.id,x.amount])},size:blob.size}});
    eq([snapshot.e,snapshot.p,snapshot.rc],[snapshot.state.e.length,snapshot.state.p.length,1]);eq(snapshot.bytes,[137,80,78,71,1,2,3,4,5],'receipt bytes inside zip');
    // wipe everything then restore from the zip
    const r=await ev(A,async()=>{const z0=await (async()=>{let blob;window.dl=async(n,b)=>{blob=b};await expZip();return blob})();
      wipe();CF();await tx('readwrite',s=>s.clear());R=[];await new Promise(r=>setTimeout(r,200));const wiped={e:S.entries.length,p:S.pays.length,r:R.length};
      const z=await JSZip.loadAsync(z0),n=normalizeImport(clean(JSON.parse(await z.file('data.json').async('string'))));impPrepare(n,'t',z);await impRun(IMPD,'merge');
      const after={e:S.entries.map(x=>[x.id,x.amount,x.pa,x.bl]),p:S.pays.map(x=>[x.id,x.amount]),r:R.length,rb:R.length?Array.from(new Uint8Array(await R[0].blob.arrayBuffer())):[]};
      impPrepare(n,'t',z);await impRun(IMPD,'merge');return {wiped,after,again:{e:S.entries.length,p:S.pays.length,r:R.length}}});
    eq(r.wiped,{e:0,p:0,r:0});eq(r.after.e,snapshot.state.e,'entries restored with identical amounts/balances');eq(r.after.p,snapshot.state.p);eq(r.after.r,1);eq(r.after.rb,[137,80,78,71,1,2,3,4,5],'receipt image restored byte-for-byte');
    eq(r.again,{e:snapshot.state.e.length,p:snapshot.state.p.length,r:1},'second restore creates no duplicates');return 'ZIP '+snapshot.size+' bytes';});
  await step('שחזור "החלפה מלאה" מוחק נתונים שלא בגיבוי ומחזיר גרסה ישנה',async()=>{
    const r=await ev(A,async()=>{let blob;window.dl=async(n,b)=>{blob=b};await expZip();const z=await JSZip.loadAsync(blob),n=normalizeImport(clean(JSON.parse(await z.file('data.json').async('string'))));
      const id0=S.entries[0].id,orig=S.entries[0].amount;S.entries[0].note='שונה אחרי הגיבוי';selD=today();$('client').value='אקסטרה';$('days').value=1;calc();$('add').onclick();const before=S.entries.length;
      impPrepare(n,'t',z);impGo('replace');CF();await new Promise(r=>setTimeout(r,800));return {before,after:S.entries.length,note:S.entries.find(e=>e.id===id0).note,hasExtra:S.clients.some(c=>c.name==='אקסטרה')}});
    eq(r.before,r.after+1,'one extra entry added then removed by replace');ok(r.note!=='שונה אחרי הגיבוי','note restored');ok(!r.hasExtra,'extra client removed');});
  await step('שחזור כושל באמצע לא פוגע בנתונים הקיימים (שחזור אטומי)',async()=>{
    const r=await ev(A,async()=>{let blob;window.dl=async(n,b)=>{blob=b};await expZip();const z=await JSZip.loadAsync(blob),n=normalizeImport(clean(JSON.parse(await z.file('data.json').async('string'))));
      S.entries[0].note='שינוי מקומי חשוב';save();const snap=()=>JSON.stringify([S.entries.map(e=>[e.id,e.note,e.amount]),S.pays.map(p=>[p.id,p.amount]),S.clients.map(c=>c.name)]);const before=snap();
      const orig=window.restoreReceipts;window.restoreReceipts=async()=>{throw new Error('כשל מדומה באמצע שחזור')};impPrepare(n,'t',z);await impRun(IMPD,'replace');window.restoreReceipts=orig;
      return {before,after:snap(),msg:document.getElementById('sheetBody').textContent}});
    eq(r.after,r.before,'state must be identical after failed restore');ok(/שוחזרו ללא שינוי/.test(r.msg),r.msg);});
  await step('גיבוי מוצפן בסיסמה: הצפנה, סיסמה שגויה, קובץ פגום, שחזור מלא',async()=>{
    const r=await ev(A,async()=>{let out;window.dl=async(n,b)=>{out=b};expEncAsk();$('ep1').value='short';$('ep2').value='short';await expEnc();const e1=$('epe').textContent;
      expEncAsk();$('ep1').value='correct-horse-1';$('ep2').value='different-1';await expEnc();const e2=$('epe').textContent;
      expEncAsk();$('ep1').value='correct-horse-1';$('ep2').value='correct-horse-1';await expEnc();const u8=new Uint8Array(await out.arrayBuffer());
      const hdr=new TextDecoder().decode(u8.slice(0,6)),plain=new TextDecoder('latin1').decode(u8).indexOf('data.json')>=0;
      let wrong='',tmsg='';try{await decBytes(u8,'wrong-password-1')}catch(e){wrong=e.message}
      const tam=u8.slice();tam[100]^=1;try{await decBytes(tam,'correct-horse-1')}catch(e){tmsg=e.message}
      const z=await JSZip.loadAsync(await decBytes(u8,'correct-horse-1')),d=JSON.parse(await z.file('data.json').async('string'));
      await openBackup(u8,'x.zip');const askText=document.getElementById('sheetBody').textContent;
      $('pwi').value='wrong-password-1';await goPw();const wrongUi=$('pwe').textContent;$('pwi').value='correct-horse-1';await goPw();const prev=document.getElementById('sheetBody').textContent;
      return {e1,e2,hdr,plain,wrong,tmsg,cnt:d.entries.length,n:S.entries.length,askText,wrongUi,prev}});
    ok(/קצרה/.test(r.e1),'short pw');ok(/לא זהות/.test(r.e2),'mismatch');eq(r.hdr,'ERENC1');ok(!r.plain,'ciphertext must not expose zip entries');ok(/סיסמה שגויה/.test(r.wrong));ok(/סיסמה שגויה/.test(r.tmsg),'tampered file must be rejected');
    eq(r.cnt,r.n);ok(/גיבוי מוצפן/.test(r.askText)&&/סיסמה שגויה/.test(r.wrongUi),'ui pw prompt');ok(/ייבוא גיבוי ZIP/.test(r.prev),'preview after correct password');await ev(A,()=>closeS());});
  await step('ייבוא גיבוי JSON ישן: המרה, בלי כפילויות, סכומים נשמרים',async()=>{
    const P=await device({nocloud:true});
    const r=await ev(P,(raw)=>{const n=normalizeImport(clean(JSON.parse(raw)));impPrepare(n,'t');return impRun(IMPD,'merge').then(()=>{const a={e:S.entries.length,p:S.pays.length,t:S.entries.reduce((s,e)=>s+e.amount,0)};impPrepare(normalizeImport(clean(JSON.parse(raw))),'t');return impRun(IMPD,'merge').then(()=>({a,b:{e:S.entries.length,p:S.pays.length}}))})},SEED);
    eq(r.a,{e:5,p:3,t:3000});eq(r.b,{e:5,p:3},'second import adds nothing');await P.close();});
  await step('ייבוא קובץ פגום / לא תקין נדחה בלי לפגוע בנתונים',async()=>{
    const r=await ev(A,()=>{const before=S.entries.length;let msg='';try{normalizeImport({foo:1})}catch(e){msg=e.message}try{normalizeImport({schema:3,entries:[{id:1}]})}catch(e){msg+='|'+e.message}return {before,after:S.entries.length,msg}});
    ok(/לא מזוהה/.test(r.msg)&&/לא תקין/.test(r.msg),r.msg);eq(r.before,r.after);});

  // ===== 5. sync between devices =====
  store.clear();
  const D1=await device({settle:1200}),D2=await device({settle:1200});
  const st=p=>ev(p,()=>(derive(),{e:S.entries.map(x=>[x.id,x.amount,x.pa,x.note||'']),p:S.pays.map(x=>[x.id,x.amount]),c:S.clients.map(x=>x.name),conf:Object.keys(S.conf).length,pend:pendCount(),st:SYNC.st}));
  await step('סנכרון: רשומות ותשלומים מגיעים למכשיר השני',async()=>{
    await addDay(D1,'נוח',1,'מד1');await ev(D1,()=>{const e=S.entries[0];payPart(e.id);$('pa').value=200;doPart(e.id)});
    ok(await until(D2,()=>S.entries.length===1&&S.pays.length===1&&S.clients.length===1),'device 2 did not receive data');
    const a=await st(D1),b=await st(D2);eq(b.e,a.e);eq(b.p,a.p);eq(b.c,a.c);ok(await until(D1,()=>pendCount()===0&&SYNC.st==='ok'),'D1 not synced');return JSON.stringify(b.e);});
  await step('סנכרון דו־כיווני: עריכה במכשיר 2 מגיעה למכשיר 1',async()=>{
    await ev(D2,()=>{S.entries[0].note='נערך ב-D2';save()});ok(await until(D1,()=>S.entries[0].note==='נערך ב-D2'));});
  await step('סנכרון: רשומות משני מכשירים לא נעלמות ולא מוכפלות',async()=>{
    await Promise.all([addDay(D1,'דנה',1,'מ-D1'),addDay(D2,'דנה',1,'מ-D2')]);
    ok(await until(D1,()=>S.entries.length===3,10000)&&await until(D2,()=>S.entries.length===3,10000),'both devices must show 3 entries');
    const a=await st(D1),b=await st(D2);eq(a.e.map(x=>x[0]).sort(),b.e.map(x=>x[0]).sort());eq(a.c.length,b.c.length);});
  await step('מחיקה מסונכרנת ולא חוזרת אחרי סנכרון',async()=>{
    const id=await ev(D1,()=>{const e=S.entries.find(x=>x.note==='מ-D1');delEntry(e.id);save();render();return e.id});
    ok(await until(D2,(i)=>!S.entries.some(e=>e.id===i),10000,id),'deletion not synced');await ev(D2,()=>syncNow(true));await sleep(1500);
    ok(!(await ev(D1,(i)=>S.entries.some(e=>e.id===i),id))&&!(await ev(D2,(i)=>S.entries.some(e=>e.id===i),id)),'deleted entry came back');
    eq(store.get('ws_e/e'+id).d,true,'tombstone stored in cloud');});
  await step('עבודה ללא אינטרנט ואז סנכרון אוטומטי בחזרה',async()=>{await ev(D1,()=>{window.__OFF=false;window.__FAILSET=false});
    await ev(D1,()=>{window.__OFF=true});await addDay(D1,'נוח',1,'אופליין');await sleep(500);
    const off=await ev(D1,()=>({pend:pendCount(),status:$('syn').textContent,saved:JSON.parse(localStorage.getItem('er4-v3')).entries.some(e=>e.note==='אופליין')}));
    ok(off.pend>0&&off.saved,'offline change must be saved locally and queued');ok(!/מסונכרן/.test(off.status),'must not claim synced while offline: '+off.status);
    ok(!(await ev(D2,()=>S.entries.some(e=>e.note==='אופליין'))),'D2 must not have it yet');
    await ev(D1,()=>{window.__OFF=false;window.dispatchEvent(new Event('online'))});
    ok(await until(D2,()=>S.entries.some(e=>e.note==='אופליין'),12000),'queued change not delivered after reconnect');ok(await until(D1,()=>pendCount()===0&&SYNC.st==='ok'),'D1 stuck pending');});
  await step('התנגשות עריכות: בחירה "שמור את שלי"',async()=>{
    await ev(D1,()=>{window.__OFF=true});const id=await ev(D1,()=>{const e=S.entries.find(x=>x.note==='אופליין');e.note='D1-edit';save();return e.id});
    await ev(D2,(i)=>{S.entries.find(e=>e.id===i).note='D2-edit';save()},id);await sleep(1500);
    await ev(D1,()=>{window.__OFF=false;window.dispatchEvent(new Event('online'))});
    ok(await until(D1,()=>Object.keys(S.conf).length===1,12000),'conflict not detected');
    ok(await until(D1,()=>!document.getElementById('cfb').hidden,5000),'conflict banner not shown');const c=await ev(D1,()=>{const k=Object.keys(S.conf)[0];return {l:S.conf[k].l.data.note,r:S.conf[k].r.data.note,banner:!document.getElementById('cfb').hidden,status:$('syn').textContent}});
    eq([c.l,c.r],['D1-edit','D2-edit']);ok(c.banner,'banner');ok(!/מסונכרן/.test(c.status),'must not show synced during conflict');
    eq(store.get('ws_e/e'+id).data.note,'D2-edit','remote untouched until user decides');
    await ev(D1,()=>{resolve(Object.keys(S.conf)[0],'local')});ok(await until(D2,(i)=>S.entries.find(e=>e.id===i).note==='D1-edit',12000,id),'D2 did not receive chosen version');
    eq(await ev(D1,()=>Object.keys(S.conf).length),0);});
  await step('התנגשות עריכות: בחירה "שמור את מהענן"',async()=>{
    await ev(D1,()=>{window.__OFF=true});const id=await ev(D1,()=>{const e=S.entries.find(x=>x.note==='D1-edit');e.note='A3';save();return e.id});
    await ev(D2,(i)=>{S.entries.find(e=>e.id===i).note='B3';save()},id);await sleep(1500);
    await ev(D1,()=>{window.__OFF=false;window.dispatchEvent(new Event('online'))});ok(await until(D1,()=>Object.keys(S.conf).length===1,12000),'conflict not detected');
    await ev(D1,()=>{resolve(Object.keys(S.conf)[0],'remote')});const n=await ev(D1,(i)=>S.entries.find(e=>e.id===i).note,id);eq(n,'B3');
    ok(await until(D1,()=>pendCount()===0&&SYNC.st==='ok'),'D1 should be clean');});
  await step('התנגשות עריכה מול מחיקה',async()=>{
    await ev(D1,()=>{window.__OFF=true});const id=await ev(D1,()=>{const e=S.entries.find(x=>x.note==='B3');e.note='edit-vs-delete';save();return e.id});
    await ev(D2,(i)=>{delEntry(i);save();render()},id);await sleep(1500);
    await ev(D1,()=>{window.__OFF=false;window.dispatchEvent(new Event('online'))});ok(await until(D1,()=>Object.keys(S.conf).length===1,12000),'edit-vs-delete conflict not detected');
    await ev(D1,()=>{resolve(Object.keys(S.conf)[0],'remote')});ok(!(await ev(D1,(i)=>S.entries.some(e=>e.id===i),id)),'remote deletion should win');});
  await step('כשל שרת: לא מוצג "מסונכרן", השינוי נשמר מקומית ומנסה שוב',async()=>{
    await ev(D1,()=>{window.__FAILSET=true});await addDay(D1,'נוח',1,'כשל');
    ok(await until(D1,()=>SYNC.st==='err',8000),'no error state');const s=await ev(D1,()=>({t:$('syn').textContent,pend:pendCount(),ls:JSON.parse(localStorage.getItem('er4-v3')).entries.some(e=>e.note==='כשל')}));
    ok(/נכשל/.test(s.t)&&!/מסונכרן/.test(s.t),s.t);ok(s.pend>0&&s.ls);
    await ev(D1,()=>{window.__FAILSET=false});ok(await until(D2,()=>S.entries.some(e=>e.note==='כשל'),20000),'retry did not deliver');});
  await step('מכשיר חדש מתחבר ומקבל את כל הנתונים בלי כפילויות',async()=>{
    const D3=await device({settle:1500});ok(await until(D3,()=>S.entries.length>0,10000),'no data on new device');await sleep(1500);
    const a=await st(D1),c=await st(D3);eq(c.e.map(x=>x[0]).sort(),a.e.map(x=>x[0]).sort(),'same records');eq(c.p.length,a.p.length);eq(c.c.sort(),a.c.sort());
    eq(await ev(D3,()=>S.entries.map(e=>[e.amount,e.pa,e.bl]).sort().join()),await ev(D1,()=>S.entries.map(e=>[e.amount,e.pa,e.bl]).sort().join()),'balances equal');await D3.close();});
  await step('שעון: סשן שהסתיים ב-D1 מופיע ב-D2 עם הרישום המקושר',async()=>{
    await ev(D1,(H)=>{lastClk=0;const base=Date.now()-2*H;$('ckClient').value='סנכרון שעון';$('ckBasis').value='hour';$('ckRate').value=80;startWork(base);startBreak(base+H);endBreak(base+1.25*H);finishWork(base+2*H)},H);
    ok(await until(D2,()=>S.sessions.some(s=>s.st==='done')&&S.entries.some(e=>e.sid),12000),'session/entry did not reach D2');
    const a=await ev(D1,()=>{const s=S.sessions[0];return [s.id,s.t0,s.t1,s.br.length,ent(s.eid).amount]}),b=await ev(D2,()=>{const s=S.sessions[0];return [s.id,s.t0,s.t1,s.br.length,ent(s.eid).amount]});eq(b,a);});
  await step('משתמש בלי הרשאת כתיבה: צפייה בלבד, שינוי מקומי מבוטל',async()=>{
    const V=await device({cant:true,settle:1500});ok(await until(V,()=>RO===true&&S.entries.length>0,10000),'viewer did not load data');
    const r=await ev(V,()=>{const n=S.entries.length;selD=today();$('client').value='לא מורשה';$('days').value=1;calc();$('add').onclick();return {n,after:S.entries.length,banner:!document.getElementById('roBan').hidden}});
    eq(r.after,r.n,'viewer edit must be reverted');ok(r.banner);await sleep(500);ok(!Array.from(store.keys()).some(k=>/unauthorized|לא מורשה/.test(JSON.stringify(store.get(k)))),'viewer wrote to cloud');await V.close();});
  await step('ענן ישן (ws_*) ריק: ייבוא חד־פעמי מהפורמט הישן ללא כפילויות בין מכשירים',async()=>{
    store.clear();
    store.set('app/meta',{rate:600,od:14,cap:122833,capOn:true,fy:0,cb:'work',clients:LEG.clients,ts:1});store.set('entries/2026-11',{list:LEG.entries.filter(e=>e.date.startsWith('2026-11'))});store.set('entries/2026-10',{list:LEG.entries.filter(e=>e.date.startsWith('2026-10'))});
    const X=await device({settle:2500}),Y=await device({settle:2500});
    ok(await until(X,()=>S.entries.length===5&&S.pays.length===3,12000),'device X did not import legacy cloud');ok(await until(Y,()=>S.entries.length===5&&S.pays.length===3,12000),'device Y did not receive');
    const a=await st(X),b=await st(Y);eq(a.e.map(x=>x[0]).sort(),b.e.map(x=>x[0]).sort());eq(await ev(Y,()=>S.entries.reduce((s,e)=>s+e.amount,0)),3000);
    ok(store.has('app/meta'),'legacy cloud data kept untouched');});
  await step('נתיב מקומי בלבד (ללא ענן) עובד ומציג סטטוס מקומי',async()=>{
    const L=await device({nocloud:true});await addDay(L,'מקומי',1,'x');const s=await ev(L,()=>$('syn').textContent);ok(/מקומי/.test(s),s);await L.close();});

  console.log('\nJS errors during run:',errors.length?errors.join('\n'):'none');
  const pass=results.filter(r=>r.ok).length;console.log('\n'+pass+'/'+results.length+' passed');
  fs.writeFileSync(path.join(path.dirname(process.argv[1]),'results.json'),JSON.stringify({date:new Date().toISOString(),pass,total:results.length,jsErrors:errors,results},null,1));
  await browser.close();server.close();process.exit(pass===results.length?0:1);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2)});
