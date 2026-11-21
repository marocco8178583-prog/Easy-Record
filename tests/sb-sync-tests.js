// Cloud sync via the Supabase adapter against a LOCAL MOCK of GoTrue + PostgREST (simulation; not a real Supabase project).
const fs=require('fs'),http=require('http'),path=require('path');
const puppeteer=require(process.env.PUPPETEER||'/opt/npm-tools/node_modules/puppeteer');
const APP=path.resolve(process.argv[2]||'dist/index.html');const res=[];
const ok=(n,c,d)=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+d))};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,ms=8000){const t=Date.now();while(Date.now()-t<ms){try{if(await f())return true}catch(e){}await sleep(150)}return false}
const users={},tok={},rowsDB=new Map(),store=new Map(),ALLOWED=['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf'].concat(process.env.NOAUDIO?[]:['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/aac']);let hasBucket=true,storeDenied=0,allowDebt=true,allowExp=true,allowProj=true,allowTask=true;let down=false,lastTs=0,rejected=0,seenKeys=new Set();
const rd=q=>new Promise(r=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch(e){r({})}})});
const api=http.createServer(async(q,s)=>{s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Access-Control-Allow-Headers','*');s.setHeader('Access-Control-Allow-Methods','*');if(q.method==='OPTIONS'){s.statusCode=204;return s.end()}
 if(q.url.startsWith('/storage/v1/object/')){const t=(q.headers.authorization||'').slice(7),em=tok[t];const J=(c,o)=>{s.statusCode=c;s.setHeader('content-type','application/json');s.end(JSON.stringify(o))};if(!em)return J(401,{message:'jwt'});const uid=users[em].id;
  const chunks=[];await new Promise(r=>{q.on('data',c=>chunks.push(c));q.on('end',r)});const buf=Buffer.concat(chunks);
  if(!hasBucket)return J(400,{statusCode:'404',error:'Bucket not found',message:'Bucket not found'});
  let pth=q.url.replace('/storage/v1/object/','').replace(/^authenticated\//,'');
  if(pth==='receipts'&&q.method==='DELETE'){const b=JSON.parse(buf.toString()||'{}');(b.prefixes||[]).forEach(x=>{if(x.split('/')[0]===uid)store.delete(x)});return J(200,[])}
  pth=pth.replace(/^receipts\//,'');const seg=pth.split('/');if(seg[0]!==uid||seg.length!==2){storeDenied++;return J(403,{message:'new row violates row-level security policy'})}
  if(q.method==='POST'){const ct=q.headers['content-type'];if(!ALLOWED.includes(ct))return J(400,{message:'mime type not supported'});if(buf.length>10485760)return J(413,{message:'too large'});store.set(pth,{ct,buf});return J(200,{Key:'receipts/'+pth})}
  if(q.method==='GET'){const o=store.get(pth);if(!o)return J(404,{message:'not found'});s.statusCode=200;s.setHeader('content-type',o.ct);return s.end(o.buf)}
  if(q.method==='DELETE'){if(!store.has(pth))return J(404,{message:'not found'});store.delete(pth);return J(200,{})}
  return J(405,{})}
 const b=await rd(q),u=new URL(q.url,'http://x'),j=(c,o)=>{s.statusCode=c;s.setHeader('content-type','application/json');s.end(JSON.stringify(o))};seenKeys.add(q.headers.apikey);
 const mk=(id,x)=>{const t='t'+Math.random();tok[t]=id;return {access_token:t,refresh_token:'r'+t,expires_in:3600,user:{id:x.id,email:id}}};
 if(u.pathname==='/auth/v1/signup'){if(users[b.email])return j(422,{error_code:'user_already_exists'});users[b.email]={pw:b.password,id:'uid-'+Object.keys(users).length};return j(200,mk(b.email,users[b.email]))}
 if(u.pathname==='/auth/v1/token'){const x=users[b.email];if(u.searchParams.get('grant_type')==='refresh_token'){const e=Object.keys(tok).map(k=>tok[k]);return j(400,{})}if(!x||x.pw!==b.password)return j(400,{error_code:'invalid_credentials'});return j(200,mk(b.email,x))}
 if(u.pathname.startsWith('/rest/v1/records')){if(down)return j(503,{message:'down'});const t=(q.headers.authorization||'').slice(7),em=tok[t];if(!em)return j(401,{message:'jwt'});const uid=users[em].id;
  if(q.method==='GET'){let a=[...rowsDB.values()].filter(r=>r.user_id===uid);const f=(k)=>{const v=u.searchParams.get(k);return v&&v.replace(/^(eq|gte)\./,'')};
   if(u.searchParams.get('type'))a=a.filter(r=>r.type===f('type'));if(u.searchParams.get('id'))a=a.filter(r=>r.id===f('id'));if(u.searchParams.get('updated_at'))a=a.filter(r=>r.updated_at>=f('updated_at'));
   a.sort((x,y)=>x.updated_at<y.updated_at?-1:x.updated_at>y.updated_at?1:x.id<y.id?-1:1);const off=+u.searchParams.get('offset')||0,lim=+u.searchParams.get('limit')||1000;return j(200,a.slice(off,off+lim).map(r=>({id:r.id,type:r.type,data:r.data,deleted:r.deleted,updated_at:r.updated_at})))}
  if(q.method==='POST'){if(b.user_id!==uid)return j(403,{message:'rls'});const key=uid+'|'+b.id,old=rowsDB.get(key);lastTs=Math.max(Date.now(),lastTs+1);
   if(b.type==='task'&&!allowTask)return j(400,{code:'23514',message:'new row for relation "records" violates check constraint "records_type_check"'});if(b.type==='project'&&!allowProj)return j(400,{code:'23514',message:'new row for relation "records" violates check constraint "records_type_check"'});if(b.type==='expense'&&!allowExp)return j(400,{code:'23514',details:'Failing row contains ('+'x'.repeat(300)+')',hint:null,message:'new row for relation "records" violates check constraint "records_type_check"'});if(b.type==='debt'&&!allowDebt)return j(400,{code:'23514',details:'Failing row contains ('+'x'.repeat(300)+')',hint:null,message:'new row for relation "records" violates check constraint "records_type_check"'});if(b.type==='receipt'&&!hasBucket)return j(400,{code:'23514',message:'new row for relation "records" violates check constraint "records_type_check"'});if(old&&/ignore-duplicates/.test(q.headers.prefer||'')){s.statusCode=201;return s.end()}
   if(old&&b.ver<=old.ver){rejected++;return j(400,{code:'P0001',message:'version_conflict'})}
   rowsDB.set(key,{user_id:uid,id:b.id,type:b.type,ver:b.ver,deleted:b.deleted,data:b.data,updated_at:new Date(lastTs).toISOString()});s.statusCode=201;return s.end()}}
 j(404,{})});
(async()=>{await new Promise(r=>api.listen(0,r));const API='http://localhost:'+api.address().port;
 const web=http.createServer((q,s)=>{if(q.url.startsWith('/config.js')){s.setHeader('content-type','text/javascript');return s.end("window.ER_CONFIG={supabaseUrl:'"+API+"',supabaseAnonKey:'ANON-PUBLIC',pollMs:400}")}s.setHeader('content-type','text/html; charset=utf-8');s.end(fs.readFileSync(APP))});
 await new Promise(r=>web.listen(0,r));const base='http://localhost:'+web.address().port+'/';
 const b=await puppeteer.launch({args:['--no-sandbox']});const errs=[];
 async function dev(){const c=await b.createBrowserContext();const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await sleep(600);return p}
 const sign=async(p,id,pw,up)=>{await p.evaluate((i,w,u)=>{gId.value=i;gPw.value=w;gPw2.value=w;if(u){gMode('up');gFn.value='א';gLn.value='ב';gDob.value='1990-01-01';gTerms.checked=true}return u?gSignUp():gSignIn()},id,pw,up);await sleep(700)};
 // Signing out (aOut) and "continue without the guest data" (aMerge(false)) switch profiles by RELOADING the page.
 // Wait for that reload to finish instead of a fixed sleep: on a slow machine (GitHub's runners) the reload used to land
 // in the middle of the next step, which then ran on a page that was going away.
 const navAfter=async(p,f)=>{const nav=p.waitForNavigation({timeout:15000}).catch(()=>null);
   await p.evaluate(f).catch(e=>{if(!/context was destroyed|navigation/i.test(e.message))throw e});await nav;
   await p.waitForFunction(()=>document.readyState==='complete'&&typeof gSignIn==='function',{timeout:15000}).catch(()=>{});await sleep(400)};
 // The app may reload itself right after signing in; that is not a failure, so wait for the page to settle instead of crashing.
 const sign=async(p,id,pw,up)=>{try{await p.evaluate((i,w,u)=>{gId.value=i;gPw.value=w;gPw2.value=w;if(u){gMode('up');gFn.value='א';gLn.value='ב';gDob.value='1990-01-01'}return u?gSignUp():gSignIn()},id,pw,up)}catch(e){if(!/context was destroyed|navigation/i.test(e.message))throw e;await p.waitForFunction(()=>document.readyState==='complete'&&typeof gSignIn==='function',{timeout:8000}).catch(()=>{})}await sleep(700)};
 const D1=await dev(),D2=await dev();
 await sign(D1,'a@b.co','password1',true);
 ok('D1 נרשם ומחובר לענן (CDB פעיל)',await D1.evaluate(()=>!!CDB&&!!SBDB));
 await D1.evaluate(async()=>{S.clients.push({id:101,name:'נוח',phone:''});S.entries.push({id:201,cid:101,date:'2026-11-03',days:1,rate:600,amount:600});derive();stamp();addPay(101,[{eid:201,amt:200}],'2026-11-04','ביט','');save();await syncNow(true)});
 ok('D1: הנתונים עלו לענן, אין שינויים ממתינים, הסטטוס "מסונכרן"',await until(()=>D1.evaluate(()=>pendCount()===0&&/מסונכרן/.test($('syn').textContent))),await D1.evaluate(()=>$('syn').textContent+'|'+SYNC.err));
 await sign(D2,'a@b.co','password1',false);
 ok('D2 נכנס עם אותו חשבון ומקבל לקוח, יום ותשלום (בלי כפילויות)',await until(()=>D2.evaluate(()=>S.clients.length===1&&S.entries.length===1&&S.pays.length===1&&S.entries[0].bl===400)),await D2.evaluate(()=>JSON.stringify([S.clients.length,S.entries.length,S.pays.length])));
 await D2.evaluate(async()=>{const e=S.entries[0];e.note='נערך ב-D2';e.amount=700;e.rate=700;derive();stamp();save();await syncNow()});
 ok('עריכה ב-D2 מגיעה ל-D1 בתוך מחזור הסקר',await until(()=>D1.evaluate(()=>S.entries[0].amount===700&&S.entries[0].note==='נערך ב-D2')));
 await D1.evaluate(()=>{edt(201)});await D1.evaluate(()=>{document.getElementById('edr').value='300';document.getElementById('edSave').click()});await D1.evaluate(async()=>{await syncNow(true)});
 ok('עריכת שכר יומי 600→300 דרך חלון העריכה: נשמר, ומגיע למכשיר השני בלי לשנות את התשלום',await until(()=>D2.evaluate(()=>S.entries[0].rate===300&&S.entries[0].amount===300&&S.pays[0].amount===200&&S.entries[0].bl===100)),await D2.evaluate(()=>JSON.stringify([S.entries[0].rate,S.entries[0].amount,S.pays[0].amount,S.entries[0].bl])));
 // server down: not "synced"
 down=true;await D1.evaluate(async()=>{S.entries[0].note='בזמן תקלה';stamp();save();await syncNow(true)});
 ok('שרת לא זמין: הסטטוס לא "מסונכרן", השינוי ממתין ונשמר מקומית',await D1.evaluate(()=>SYNC.st==='err'&&pendCount()>0&&!/מסונכרן/.test($('syn').textContent)&&S.entries[0].note==='בזמן תקלה'),await D1.evaluate(()=>$('syn').textContent));
 // conflict: D2 edits the same record while server is down, then both come back
 await D2.evaluate(async()=>{S.entries[0].note='גרסת D2';stamp();save();await syncNow()});
 down=false;
 const conf=await until(async()=>{const a=await D1.evaluate(()=>Object.keys(S.conf).length),c=await D2.evaluate(()=>Object.keys(S.conf).length);return a+c>0},12000);
 ok('אותה רשומה נערכה בשני מכשירים: מזוהה התנגשות בלי אובדן נתונים',conf);
 const side=await D1.evaluate(()=>Object.keys(S.conf).length)?D1:D2;
 await side.evaluate(()=>{const k=Object.keys(S.conf)[0];resolve(k,'local')});
 ok('פתרון ההתנגשות ("שמור את שלי") מתכנס בשני המכשירים לאותו ערך',await until(async()=>{const x=await D1.evaluate(()=>S.entries[0].note+'|'+Object.keys(S.conf).length+'|'+pendCount()),y=await D2.evaluate(()=>S.entries[0].note+'|'+Object.keys(S.conf).length+'|'+pendCount());return x===y&&/\|0\|0$/.test(x)},12000),await D1.evaluate(()=>S.entries[0].note)+' / '+await D2.evaluate(()=>S.entries[0].note));
 // delete propagates and does not return
 await D1.evaluate(async()=>{delEntry(S.entries[0].id);save();await syncNow()});
 ok('מחיקה ב-D1 מתפשטת ל-D2 ולא חוזרת',await until(()=>D2.evaluate(()=>S.entries.length===0&&S.pays.length===0)));
 await sleep(1500);ok('אחרי כמה סבבי סקר הרשומה לא חזרה בשום מכשיר',await D1.evaluate(()=>S.entries.length===0)&&await D2.evaluate(()=>S.entries.length===0));
 // new records from both devices at once
 await Promise.all([D1.evaluate(async()=>{S.clients.push({id:301,name:'מ-D1',phone:''});stamp();save();await syncNow()}),D2.evaluate(async()=>{S.clients.push({id:302,name:'מ-D2',phone:''});stamp();save();await syncNow()})]);
 ok('לקוחות שנוצרו במקביל בשני מכשירים לא נעלמים ולא מוכפלים',await until(async()=>{const f=()=>D=>D.evaluate(()=>S.clients.map(c=>c.id).sort().join(','));return (await f()(D1))===(await f()(D2))&&(await f()(D1)).split(',').length===3}),await D1.evaluate(()=>S.clients.map(c=>c.id).join(',')));
 // ===== account separation on one device =====
 const aIds=await D1.evaluate(()=>S.clients.map(c=>c.id).sort().join(','));
 await navAfter(D1,()=>{aOut()});
 ok('יציאה: נתוני החשבון לא מוצגים יותר במכשיר (מצב אורח ריק) והשער חזר',await D1.evaluate(()=>!gate.hidden&&S.clients.length===0&&S.entries.length===0&&owner()==='guest'),await D1.evaluate(()=>JSON.stringify([S.clients.length,owner()])));
 const before=[...rowsDB.values()].filter(r=>r.user_id==='uid-0').length;
 await sign(D1,'c@d.co','password1',true);await sleep(800);
 ok('חשבון ב׳ באותו מכשיר: מתחיל ריק, לא רואה ולא מעלה את נתוני חשבון א׳',await D1.evaluate(()=>gate.hidden&&S.clients.length===0&&owner()===aGet().user.id)&&[...rowsDB.values()].filter(r=>r.user_id==='uid-0').length===before,await D1.evaluate(()=>S.clients.length)+'/'+before);
 ok('משתמש ב׳ לא רואה נתוני משתמש א׳ (בקשת קריאה ישירה)',await D1.evaluate(async()=>{const s=aGet();const r=await fetch(CFG.supabaseUrl+'/rest/v1/records?select=*',{headers:{apikey:CFG.supabaseAnonKey,Authorization:'Bearer '+s.access_token}});const g=await r.json();return Array.isArray(g)&&!g.some(x=>x.type==='client'||x.type==='entry')}));
 await D1.evaluate(async()=>{S.clients.push({id:901,name:'לקוח של ב׳',phone:''});stamp();save();await syncNow()});
 await navAfter(D1,()=>{aOut()});
 await sign(D1,'a@b.co','password1',false);await sleep(900);
 ok('חזרה לחשבון א׳: הנתונים שלו חוזרים, בלי הלקוח של ב׳',await until(()=>D1.evaluate((x)=>S.clients.map(c=>c.id).sort().join(',')===x&&!S.clients.some(c=>c.id===901),aIds)),await D1.evaluate(()=>S.clients.map(c=>c.id).join(',')));
 ok('בענן: הלקוח של ב׳ שמור רק אצל ב׳',[...rowsDB.values()].filter(r=>r.id==='c901').every(r=>r.user_id==='uid-1')&&[...rowsDB.values()].some(r=>r.id==='c901'));
 // ===== guest data + explicit merge prompt =====
 const D3=await dev();
 await D3.evaluate(()=>{gLocal();S.clients.push({id:701,name:'אורח',phone:''});S.entries.push({id:702,cid:701,date:'2026-11-09',days:1,rate:500,amount:500});derive();stamp();save();aGate()});
 await sign(D3,'a@b.co','password1',false);await sleep(700);
 ok('אורח עם נתונים שנכנס לחשבון: מוצג חלון מיזוג עם תצוגה מקדימה, ושום דבר עוד לא הועלה',await D3.evaluate(()=>!$('sheet').hidden&&/1 לקוחות/.test($('mgPrev').textContent)&&/1 ימי עבודה/.test($('mgPrev').textContent)&&!SBDB)&&![...rowsDB.values()].some(r=>r.id==='e702'),await D3.evaluate(()=>$('sheetBody').textContent.slice(0,120)));
 await navAfter(D3,()=>{aMerge(false)});
 ok('בחירה "בלי הנתונים האלה": החשבון נטען בלי נתוני האורח, והם לא הועלו',await until(()=>D3.evaluate((x)=>S.clients.map(c=>c.id).sort().join(',')===x,aIds))&&![...rowsDB.values()].some(r=>r.id==='e702'),await D3.evaluate(()=>S.clients.map(c=>c.id).join(',')));
 await navAfter(D3,()=>{aOut()});
 ok('אחרי יציאה: נתוני האורח חזרו בשלמותם (לא נמחקו)',await D3.evaluate(()=>S.clients.length===1&&S.clients[0].id===701&&S.entries.length===1&&S.entries[0].amount===500&&owner()==='guest'),await D3.evaluate(()=>JSON.stringify([S.clients.length,S.entries.length,owner()])));
 await sign(D3,'a@b.co','password1',false);await sleep(700);
 await D3.evaluate(()=>{aMerge(true)});
 ok('בחירה "העבר לחשבון שלי": נתוני האורח מתמזגים עם נתוני החשבון ועולים לענן',await until(()=>[...rowsDB.values()].some(r=>r.id==='e702'&&r.user_id==='uid-0')&&[...rowsDB.values()].some(r=>r.id==='c701'&&r.user_id==='uid-0'),10000)&&await until(()=>D3.evaluate((x)=>{const ids=S.clients.map(c=>c.id);return ids.includes(701)&&x.split(',').every(i=>ids.includes(+i))},aIds)),await D3.evaluate(()=>S.clients.map(c=>c.id).join(',')));
 ok('המכשיר השני מקבל את הנתונים שמוזגו',await until(()=>D2.evaluate(()=>S.entries.some(e=>e.id===702)&&S.clients.some(c=>c.id===701)),10000));
 // ===== receipts in cloud storage =====
 const addFile=(P,name,type,body)=>P.evaluate(async(n,t,b)=>{const c=S.clients[0];UP={eid:0,cid:c.id};const dt=new DataTransfer();dt.items.add(new File([b],n,{type:t}));$('rf').files=dt.files;await $('rf').onchange();await rcSync();return R[R.length-1].id},name,type,body);
 const rid=await addFile(D2,'kabala.pdf','application/pdf','%PDF-1.4 easy record test file');
 ok('קבלה שנוספה ב-D2 עולה לאחסון הפרטי בנתיב <מזהה משתמש>/<מזהה קבלה>, ונרשמת כרשומה',store.has('uid-0/'+rid)&&[...rowsDB.values()].some(r=>r.id==='r'+rid&&r.user_id==='uid-0'&&r.type==='receipt')&&await D2.evaluate(i=>R.find(r=>r.id===i).up===1,rid),[...store.keys()].join());
 await until(()=>D1.evaluate(async i=>{await rcSync();return R.some(x=>x.id===i)},rid));
 ok('D1 מקבל את הקבלה ברשימה בלי להוריד את הקובץ (הורדה עצלה)',await D1.evaluate(i=>{const r=R.find(x=>x.id===i);return !!r&&r.blob===null&&r.up===1&&r.name==='kabala.pdf'},rid));
 ok('פתיחת הקבלה ב-D1 מורידה את הקובץ המקורי עם הטוקן של המשתמש',await D1.evaluate(async i=>{await vr(i);const r=R.find(x=>x.id===i);return !!r.blob&&(await r.blob.text())==='%PDF-1.4 easy record test file'},rid));
 await D1.evaluate(()=>closeS());
 ok('גיבוי ZIP ב-D1 כולל את קובץ הקבלה',await D1.evaluate(async i=>{const b=await zipBlob();const z=await JSZip.loadAsync(b);const f=Object.keys(z.files).find(n=>n.startsWith('receipts/'+i));return !!f&&(await z.file(f).async('string'))==='%PDF-1.4 easy record test file'},rid));
 const tid=await addFile(D2,'notes.txt','text/plain','hello');
 ok('סוג קובץ לא נתמך נשאר במכשיר בלבד ולא עולה לענן',!store.has('uid-0/'+tid)&&await D2.evaluate(i=>R.find(r=>r.id===i).nosync===1,tid));
 // another account cannot read A's file
 const D4=await dev();await sign(D4,'c@d.co','password1',false);await sleep(600);const den0=storeDenied;
 ok('חשבון ב׳ לא יכול להוריד קבלה של חשבון א׳ (נדחה)',await D4.evaluate(async i=>{try{await SBDB.req('GET','/storage/v1/object/authenticated/receipts/uid-0/'+i);return false}catch(e){return true}},rid)&&storeDenied===den0+1);
 ok('חשבון ב׳ לא רואה את הקבלה ברשימה שלו',await D4.evaluate(async i=>{await rcSync();return !R.some(r=>r.id===i)},rid));
 // delete propagates
 await D2.evaluate(async i=>{window.cf=function(t,fn){fn()};dr(i);await new Promise(r=>setTimeout(r,300));await rcSync()},rid);
 ok('מחיקת קבלה ב-D2 מוחקת את הקובץ מהענן ומסמנת את הרשומה כמחוקה',await until(()=>!store.has('uid-0/'+rid)&&[...rowsDB.values()].some(r=>r.id==='r'+rid&&r.deleted===true)));
 ok('המחיקה מגיעה ל-D1',await until(()=>D1.evaluate(async i=>{await rcSync();return !R.some(r=>r.id===i)},rid)));
 // cloud not set up (migration 002 not run): everything stays local, clear status, no errors
 hasBucket=false;const lid=await addFile(D2,'local.pdf','application/pdf','%PDF local only');
 ok('בלי הגדרת האחסון בענן: הקבלה נשמרת במכשיר, והסטטוס מסביר מה חסר',await D2.evaluate(i=>{const r=R.find(x=>x.id===i);return !!r&&!!r.blob&&!r.up&&RCS.setup===false&&/002_receipts_storage/.test(rcStatus())},lid),await D2.evaluate(()=>rcStatus()+'|'+RCS.err));
 hasBucket=true;await D2.evaluate(()=>rcSync());
 // rcSync() does nothing while a sync started by the app's own timer is still running, so retry until the upload lands.
 ok('אחרי שהאחסון הוגדר: הקבלה הממתינה עולה לבד',await until(async()=>{await D2.evaluate(()=>rcSync());return store.has('uid-0/'+lid)&&await D2.evaluate(()=>RCS.setup===true)}));
 // ===== debts I owe: sync, and graceful behaviour when the server schema lacks the type =====
 await D2.evaluate(async()=>{S.debts=S.debts||[];S.debts.push({id:8801,name:'ספק',amount:750,date:'2026-11-10',due:'',note:'',pays:[]});LASTDP={k:'',t:0};debtPay(8801,250,'2026-11-10','');save();await syncNow()});
 ok('חוב שלי שנרשם ב-D2 מגיע ל-D1 עם התשלום החלקי (יתרה 500)',await until(()=>D1.evaluate(()=>(S.debts||[]).some(d=>d.id===8801&&debtBal(d)===500)),8000)&&[...rowsDB.values()].some(r=>r.id==='d8801'&&r.type==='debt'&&r.user_id==='uid-0'));
 await D1.evaluate(async()=>{window.cf=function(t,fn){fn()};debtDel(8801);await syncNow()});
 ok('מחיקת החוב ב-D1 מתפשטת ל-D2',await until(()=>D2.evaluate(()=>!(S.debts||[]).some(d=>d.id===8801)),8000));
 allowDebt=false;
 await D2.evaluate(async()=>{S.debts.push({id:8802,name:'מקומי',amount:100,date:'2026-11-10',due:'',note:'',pays:[]});save();await syncNow(true);closeS()});await sleep(600);
 ok('שרת בלי סוג "חוב" (004 לא הורץ): החוב נשאר במכשיר, אין מצב "הסנכרון נכשל", ומוצג הסבר',await D2.evaluate(()=>S.debts.some(d=>d.id===8802)&&DEBTOFF===true&&SYNC.st!=='err'&&pendCount()===0&&/004_debts/.test($('synInfo')?$('synInfo').innerHTML:''))&&![...rowsDB.values()].some(r=>r.id==='d8802'),await D2.evaluate(()=>SYNC.st+'|'+SYNC.err+'|'+DEBTOFF));
 allowDebt=true;await D2.evaluate(async()=>{DEBTOFF=false;await syncNow()});
 ok('אחרי שהשרת עודכן: החוב שהמתין עולה',await until(()=>[...rowsDB.values()].some(r=>r.id==='d8802'),8000));
 // ===== expenses: sync + missing-schema fallback; professionals and favourites travel with sync =====
 await D2.evaluate(async()=>{S.expenses=S.expenses||[];S.expenses.push({id:9901,date:'2026-11-10',amount:88.4,cat:'חומרים',note:'',cid:0});S.clients.push({id:9902,name:'עו״ד לוי',phone:'',kind:'pro',role:'עורך דין'});S.bgFav=['sea'];stamp();save();await syncNow()});
 ok('הוצאה, איש מקצוע ומועדפי רקע מ-D2 מגיעים ל-D1',await until(()=>D1.evaluate(()=>(S.expenses||[]).some(x=>x.id===9901&&x.amount===88.4)&&S.clients.some(c=>c.id===9902&&c.kind==='pro'&&c.role==='עורך דין')&&(S.bgFav||[]).join()==='sea'),9000)&&[...rowsDB.values()].some(r=>r.id==='x9901'&&r.type==='expense'),await D1.evaluate(()=>JSON.stringify([(S.expenses||[]).length,S.bgFav])));
 allowExp=false;
 await D2.evaluate(async()=>{S.expenses.push({id:9903,date:'2026-11-10',amount:10,cat:'אחר',note:'',cid:0});save();await syncNow(true);closeS()});await sleep(600);
 ok('שרת בלי סוג "הוצאה" (005 לא הורץ): ההוצאה נשארת במכשיר, אין כשל סנכרון, ומוצג הסבר',await D2.evaluate(()=>S.expenses.some(x=>x.id===9903)&&EXPOFF===true&&SYNC.st!=='err'&&pendCount()===0&&/005_expenses/.test($('synInfo')?$('synInfo').innerHTML:''))&&![...rowsDB.values()].some(r=>r.id==='x9903'),await D2.evaluate(()=>SYNC.st+'|'+SYNC.err+'|'+EXPOFF));
 allowExp=true;await D2.evaluate(async()=>{EXPOFF=false;await syncNow()});
 ok('אחרי עדכון השרת: ההוצאה הממתינה עולה',await until(()=>[...rowsDB.values()].some(r=>r.id==='x9903'),8000));
 // ===== projects sync + missing-schema fallback =====
 await D2.evaluate(async()=>{S.projects=S.projects||[];S.projects.push({id:7701,cid:S.clients[0].id,name:'פרויקט סנכרון',rate:700,hrate:0,done:false,note:''});save();await syncNow()});
 ok('פרויקט מ-D2 מגיע ל-D1',await until(()=>D1.evaluate(()=>(S.projects||[]).some(p=>p.id===7701&&p.rate===700)),9000)&&[...rowsDB.values()].some(r=>r.id==='j7701'&&r.type==='project'));
 allowProj=false;await D2.evaluate(async()=>{S.projects.push({id:7702,cid:S.clients[0].id,name:'מקומי',rate:0,hrate:0,done:false,note:''});save();await syncNow(true);closeS()});await sleep(500);
 ok('שרת בלי סוג "פרויקט" (006 לא הורץ): הפרויקט נשאר במכשיר, בלי כשל סנכרון, עם הסבר',await D2.evaluate(()=>S.projects.some(p=>p.id===7702)&&PROJOFF===true&&SYNC.st!=='err'&&pendCount()===0&&/006_projects/.test($('synInfo')?$('synInfo').innerHTML:''))&&![...rowsDB.values()].some(r=>r.id==='j7702'),await D2.evaluate(()=>SYNC.st+'|'+PROJOFF+'|'+($('synInfo')?$('synInfo').textContent.slice(-120):'')));
 allowProj=true;await D2.evaluate(async()=>{PROJOFF=false;await syncNow()});
 ok('אחרי עדכון השרת: הפרויקט הממתין עולה',await until(()=>[...rowsDB.values()].some(r=>r.id==='j7702'),8000));
 // ===== tasks + voice notes =====
 await D2.evaluate(async()=>{taskAdd('משימה מסונכרנת','2026-11-12','10:00',0);await syncNow()});
 ok('משימה מ-D2 מגיעה ל-D1',await until(()=>D1.evaluate(()=>(S.tasks||[]).some(t=>t.title==='משימה מסונכרנת'&&t.time==='10:00')),9000)&&[...rowsDB.values()].some(r=>r.type==='task'));
 allowTask=false;await D2.evaluate(async()=>{taskAdd('מקומית בלבד',today(),'',0);await syncNow(true);closeS()});await sleep(500);
 ok('שרת בלי סוג "משימה" (007 לא הורץ): המשימה נשארת במכשיר, בלי כשל סנכרון, עם הסבר',await D2.evaluate(()=>S.tasks.some(t=>t.title==='מקומית בלבד')&&TASKOFF===true&&SYNC.st!=='err'&&pendCount()===0&&/007_tasks_voice/.test($('synInfo')?$('synInfo').innerHTML:'')),await D2.evaluate(()=>SYNC.st+'|'+TASKOFF));
 allowTask=true;await D2.evaluate(async()=>{TASKOFF=false;await syncNow()});
 ok('אחרי עדכון השרת: המשימה הממתינה עולה',await until(()=>[...rowsDB.values()].some(r=>r.type==='task'&&r.data&&r.data.data&&r.data.data.title==='מקומית בלבד'),8000));
 const vid=await D2.evaluate(async()=>{const b=new Blob([new Uint8Array(2048).fill(7)],{type:'audio/webm;codecs=opus'});const r={id:uid(),cid:S.clients[0].id,eid:0,name:'הערה קולית.webm',type:b.type,date:today(),blob:b,kind:'voice',dur:4};await tx('readwrite',st=>st.put(r));R.push(r);await rcSync();return r.id});
 ok('הערה קולית עולה לאחסון הפרטי כקובץ שמע (סוג בסיסי audio/webm, בלי פרמטרים)',await until(async()=>{if(!store.has('uid-0/'+vid))await D2.evaluate(()=>rcSync());return store.has('uid-0/'+vid)})&&store.get('uid-0/'+vid).ct==='audio/webm',[...store.keys()].join()+' '+(store.get('uid-0/'+vid)||{}).ct);
 await until(()=>D1.evaluate(async i=>{await rcSync();return R.some(x=>x.id===i)},vid));
 ok('D1 מקבל את ההערה הקולית ברשימה (עם סוג "קולית" ומשך) ומוריד אותה בפתיחה',await D1.evaluate(async i=>{const r=R.find(x=>x.id===i);if(!r||r.kind!=='voice'||r.dur!==4)return false;await vr(i);const ok=!!document.querySelector('#sheetBody audio')&&r.blob&&r.blob.size===2048;closeS();return ok},vid));
 // ===== language setting survives sync polling and reaches the other device =====
 await D2.evaluate(async()=>{setLang('en');await syncNow()});await sleep(1800);
 ok('שינוי שפה לא מתבטל על ידי הסנכרון (נשאר אנגלית אחרי כמה סבבי סקר)',await D2.evaluate(()=>S.lang==='en'&&document.documentElement.lang==='en'&&document.querySelector('#nav button[data-t="pay"]').textContent.trim()==='Pay'),await D2.evaluate(()=>S.lang+'|'+document.documentElement.lang));
 ok('ההגדרה מגיעה למכשיר השני ומוחלת על המסך',await until(()=>D1.evaluate(()=>S.lang==='en'&&document.documentElement.lang==='en'),8000),await D1.evaluate(()=>S.lang+'|'+document.documentElement.lang));
 await D2.evaluate(async()=>{setLang('he');await syncNow()});await sleep(1500);
 // ===== upgrade from a version without per-account stores =====
 const pre=await D2.evaluate(()=>JSON.stringify([S.clients.length,S.entries.length,S.pays.length]));
 await D2.evaluate(()=>localStorage.removeItem('er-owner'));await D2.reload();await sleep(900);
 ok('שדרוג מגרסה קודמת (משתמש מחובר, בלי סימון בעלות): הנתונים נשארים, משויכים לחשבון, בלי חלון מיזוג',await D2.evaluate((x)=>JSON.stringify([S.clients.length,S.entries.length,S.pays.length])===x&&owner()===aGet().user.id&&$('sheet').hidden&&gate.hidden,pre),await D2.evaluate(()=>owner()+'|'+JSON.stringify([S.clients.length,S.entries.length])));
 ok('כל הבקשות לענן נשלחו עם מפתח anon ציבורי בלבד',[...seenKeys].every(k=>!k||k==='ANON-PUBLIC'),[...seenKeys].join());
 ok('אין שגיאות JS',errs.length===0,errs.join('|'));
 await b.close();api.close();web.close();const f=res.filter(x=>!x).length;console.log((res.length-f)+'/'+res.length+' passed');process.exit(f?1:0)})();
