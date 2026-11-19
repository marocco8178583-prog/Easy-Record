// Connected apps (Find Medic) tests against a LOCAL MOCK of Supabase Auth + the findmedic function (simulation only).
// Checks the consent sheet, approve / deny, what is sent, URL clean-up, sign-in first, bad requests, and the connected apps list.
const fs=require('fs'),http=require('http'),path=require('path');
const puppeteer=require(process.env.PUPPETEER||'/opt/npm-tools/node_modules/puppeteer');
const APP=path.resolve(process.argv[2]||'dist/index.html');const res=[];
const ok=(n,c,d)=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+d))};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const calls=[];let links=[{id:'L1',client_id:'find-medic',name:'Find Medic',created_at:'2026-11-19T09:00:00Z'}];
function body(q){return new Promise(r=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch(e){r({})}})})}
const FM_CB='https://wgiahldrrnrqnlprbdyd.supabase.co/functions/v1/easy-record-oauth';
const api=http.createServer(async(q,s)=>{s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Access-Control-Allow-Headers','*');s.setHeader('Access-Control-Allow-Methods','*');if(q.method==='OPTIONS'){s.statusCode=204;return s.end()}
  const b=await body(q),u=q.url.split('?')[0],auth=(q.headers.authorization||'').slice(7),j=(c,o)=>{s.statusCode=c;s.setHeader('content-type','application/json');s.end(JSON.stringify(o))};
  if(u.startsWith('/functions/v1/findmedic'))calls.push({m:q.method,u:u.replace('/functions/v1/findmedic',''),auth,b});
  if(u==='/auth/v1/settings')return j(200,{external:{email:true}});
  if(u==='/auth/v1/user')return auth==='TOK'?j(200,{id:'u1',email:'worker@example.com',factors:[]}):j(401,{});
  if(u.startsWith('/rest/v1/'))return j(200,[]);
  if(u==='/functions/v1/findmedic/oauth/approve'){if(auth!=='TOK')return j(401,{error:'unauthorized'});return j(200,{redirect:FM_CB+'?code=CODE123&state='+encodeURIComponent(b.state)})}
  if(u==='/functions/v1/findmedic/oauth/deny'){if(auth!=='TOK')return j(401,{});return j(200,{redirect:FM_CB+'?error=access_denied&state='+encodeURIComponent(b.state)})}
  if(u==='/functions/v1/findmedic/links'){if(auth!=='TOK')return j(401,{});return j(200,{links})}
  if(u==='/functions/v1/findmedic/links/revoke'){links=links.filter(l=>l.id!==b.id);return j(200,{revoked:true})}
  j(404,{})});
(async()=>{await new Promise(r=>api.listen(0,r));const API='http://localhost:'+api.address().port;
  const web=http.createServer((q,s)=>{if(q.url.startsWith('/config.js')){s.setHeader('content-type','text/javascript');return s.end("window.ER_CONFIG={supabaseUrl:'"+API+"',supabaseAnonKey:'ANON-PUBLIC'}")}s.setHeader('content-type','text/html; charset=utf-8');s.end(fs.readFileSync(APP))});
  await new Promise(r=>web.listen(0,r));const base='http://localhost:'+web.address().port+'/';
  const CC='a'.repeat(43),Q='?fm_client=find-medic&fm_redirect='+encodeURIComponent(FM_CB)+'&fm_cc='+CC+'&fm_state=user1.st4te';
  const b=await puppeteer.launch({args:['--no-sandbox']});const errs=[];
  async function open(url,signedIn){const ctx=await b.createBrowserContext(),p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.nav=[];
    await p.setRequestInterception(true);p.on('request',r=>{if(r.url().startsWith('https://wgiahldrrnrqnlprbdyd.supabase.co/')){p.nav.push(r.url());r.respond({status:200,contentType:'text/html',body:'<html>fm</html>'})}else r.continue()});
    await p.evaluateOnNewDocument(si=>{if(si){localStorage.setItem('er-auth',JSON.stringify({access_token:'TOK',refresh_token:'R',expires_at:Date.now()+3600e3,user:{id:'u1',email:'worker@example.com',phone:''}}));localStorage.setItem('er-owner','u1')}},signedIn);
    await p.goto(url);await sleep(1800);return {ctx,p}}
  const sheetText=p=>p.evaluate(()=>{const s=document.getElementById('sheet');return s&&!s.hidden?document.getElementById('sheetBody').innerText:''});
  // 1. signed in: consent appears, URL cleaned
  let {ctx,p}=await open(base+Q,true);
  let t=await sheetText(p);
  ok('מסך הסכמה מוצג אחרי כניסה, עם שם האפליקציה והחשבון',/Find Medic/.test(t)&&/worker@example\.com/.test(t),t.slice(0,120));
  ok('המסך מסביר ש-Find Medic לא רואה נתונים אחרים',/לא תוכל לראות, לשנות או למחוק שום נתון אחר/.test(t),t.slice(0,200));
  ok('פרמטרי הבקשה הוסרו מהכתובת',!/fm_/.test(await p.evaluate(()=>location.search)));
  await p.evaluate(()=>document.getElementById('fmOk').click());await sleep(1200);
  const ap=calls.find(c=>c.u==='/oauth/approve');
  ok('אישור שולח את הבקשה עם הטוקן של המשתמש בלבד',ap&&ap.auth==='TOK'&&ap.b.client_id==='find-medic'&&ap.b.redirect_uri===FM_CB&&ap.b.code_challenge===CC&&ap.b.state==='user1.st4te',JSON.stringify(ap));
  ok('אחרי האישור חוזרים ל-Find Medic עם קוד חד־פעמי',p.nav.some(x=>x.startsWith(FM_CB+'?code=CODE123&state=user1.st4te')),p.nav.join(' '));
  await ctx.close();
  // 2. deny
  ({ctx,p}=await open(base+Q,true));
  await p.evaluate(()=>document.getElementById('fmNo').click());await sleep(1200);
  ok('ביטול מחזיר ל-Find Medic עם access_denied',calls.some(c=>c.u==='/oauth/deny')&&p.nav.some(x=>/error=access_denied/.test(x)),p.nav.join(' '));
  await ctx.close();
  // 3. not signed in: sign-in screen first, no consent, request kept for after sign-in
  ({ctx,p}=await open(base+Q,false));
  ok('לא מחובר: מוצג מסך כניסה, בלי מסך הסכמה',!(await sheetText(p))&&await p.evaluate(()=>!document.getElementById('gate').hidden));
  ok('הבקשה נשמרת עד אחרי הכניסה',await p.evaluate(()=>!!sessionStorage.getItem('er-fm-req')));
  await p.evaluate(()=>{localStorage.setItem('er-auth',JSON.stringify({access_token:'TOK',refresh_token:'R',expires_at:Date.now()+3600e3,user:{id:'u1',email:'worker@example.com',phone:''}}));gShow(false)});await sleep(1200);
  ok('אחרי הכניסה מסך ההסכמה מופיע',/Find Medic/.test(await sheetText(p)));
  await ctx.close();
  // 4. unknown client / bad redirect: refused locally
  ({ctx,p}=await open(base+'?fm_client=evil&fm_redirect='+encodeURIComponent('https://evil.example/cb')+'&fm_cc='+CC+'&fm_state=x',true));
  t=await sheetText(p);
  ok('בקשה מאפליקציה לא מוכרת נדחית בלי לשלוח כלום',/לא תקינה/.test(t)&&!calls.some(c=>c.b&&c.b.client_id==='evil'),t);
  await ctx.close();
  // 5. connected apps list + disconnect
  ({ctx,p}=await open(base,true));
  await p.evaluate(()=>{FMA.lastLoad=0;renderAcct()});await sleep(1000);
  ok('בכרטיס החשבון מופיעה רשימת אפליקציות מחוברות',await p.evaluate(()=>{const b=document.getElementById('fmLinks');return !!b&&!b.hidden&&/Find Medic/.test(b.innerText)}));
  await p.evaluate(()=>fmRevoke('L1'));await sleep(200);
  ok('ניתוק מבקש אישור ומסביר שימי עבודה קיימים נשארים',/ימי עבודה שכבר נוספו נשארים/.test(await sheetText(p)));
  await p.evaluate(()=>fmRevokeGo('L1'));await sleep(1200);
  ok('הניתוק נשלח לשרת והרשימה מתעדכנת',calls.some(c=>c.u==='/links/revoke'&&c.b.id==='L1'&&c.auth==='TOK')&&await p.evaluate(()=>document.getElementById('fmLinks').hidden));
  await ctx.close();
  ok('כל הקריאות לפונקציה נשלחו עם הטוקן של המשתמש או בלי טוקן, אף פעם עם מפתח אחר',calls.every(c=>c.auth==='TOK'));
  ok('אין שגיאות JS',errs.length===0,errs.join(' | '));
  await b.close();api.close();web.close();
  const n=res.filter(Boolean).length;console.log(n+'/'+res.length+' passed');process.exit(n===res.length?0:1)})().catch(e=>{console.error(e);process.exit(1)});
