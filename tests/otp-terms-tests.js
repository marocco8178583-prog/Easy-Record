// Sign-in with a one-time code (SMS / email), phone confirmation at sign-up, and terms acceptance.
// Runs against a LOCAL MOCK of Supabase Auth (simulation only). Usage: node tests/otp-terms-tests.js dist/index.html
const fs=require('fs'),http=require('http'),path=require('path');
const puppeteer=require(process.env.PUPPETEER||'/opt/npm-tools/node_modules/puppeteer');
const APP=path.resolve(process.argv[2]||'dist/index.html');const res=[];
const ok=(n,c,d)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+JSON.stringify(d)))};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TV='2026-11-21';const calls=[];let users={},tokens={},smsBroken=false;
function body(q){return new Promise(r=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch(e){r({})}})})}
function sess(id){const t='T'+Math.random().toString(36).slice(2);tokens[t]=id;const x=users[id];return {access_token:t,refresh_token:'R'+t,expires_in:3600,user:{id:x.id,email:id.includes('@')?id:'',phone:id.includes('@')?'':id,factors:[]}}}
const api=http.createServer(async(q,s)=>{s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Access-Control-Allow-Headers','*');s.setHeader('Access-Control-Allow-Methods','*');if(q.method==='OPTIONS'){s.statusCode=204;return s.end()}
  const b=await body(q),u=q.url.split('?')[0],auth=(q.headers.authorization||'').slice(7),j=(c,o)=>{s.statusCode=c;s.setHeader('content-type','application/json');s.end(JSON.stringify(o))};
  calls.push({m:q.method,u,q:q.url,b});
  if(u==='/auth/v1/settings')return j(200,{external:{email:true,phone:true}});
  if(u==='/auth/v1/otp'){if(b.phone&&smsBroken)return j(400,{error_code:'sms_send_failed',msg:'Unsupported phone provider'});const id=b.email||b.phone;if(!users[id]&&b.create_user)users[id]={id:'u'+Object.keys(users).length,md:b.data||{}};return j(200,{})}
  if(u==='/auth/v1/resend')return j(200,{});
  if(u==='/auth/v1/verify'){const id=b.email||b.phone;if(b.token!=='654321'||!users[id])return j(403,{error_code:'otp_expired',msg:'Token has expired or is invalid'});return j(200,sess(id))}
  if(u==='/auth/v1/signup'){const id=b.email||b.phone;users[id]={id:'u'+Object.keys(users).length,pw:b.password,md:b.data||{}};return j(200,b.phone?{id:users[id].id,phone:b.phone}:sess(id))}
  if(u==='/auth/v1/token'){const x=users[b.email];if(!x||x.pw!==b.password)return j(400,{error_code:'invalid_credentials'});return j(200,sess(b.email))}
  if(u==='/auth/v1/user'){const id=tokens[auth];if(!id)return j(401,{});if(q.method==='PUT'){users[id].md=Object.assign(users[id].md||{},b.data||{});return j(200,{})}return j(200,{id:users[id].id,email:id,factors:[],user_metadata:users[id].md||{}})}
  if(u==='/auth/v1/logout')return j(204,{});
  if(u.startsWith('/rest/v1/'))return j(200,[]);
  if(u.startsWith('/functions/v1/'))return j(200,{links:[]});
  j(404,{})});
(async()=>{await new Promise(r=>api.listen(0,r));const API='http://localhost:'+api.address().port;
  const web=http.createServer((q,s)=>{if(q.url.startsWith('/config.js')){s.setHeader('content-type','text/javascript');return s.end("window.ER_CONFIG={supabaseUrl:'"+API+"',supabaseAnonKey:'ANON-PUBLIC'}")}s.setHeader('content-type','text/html; charset=utf-8');s.end(fs.readFileSync(APP))});
  await new Promise(r=>web.listen(0,r));const base='http://localhost:'+web.address().port+'/';
  const br=await puppeteer.launch({args:['--no-sandbox']});const errs=[];
  async function open(){const ctx=await br.createBrowserContext(),p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await sleep(900);
    await p.waitForFunction(()=>typeof gOtpSend==='function'&&document.readyState==='complete',{timeout:15000});await p.evaluate(()=>{authCfg=function(){return true}});return p}
  const E=(p,f,...a)=>p.evaluate(f,...a);const err=p=>E(p,()=>document.getElementById('gErr').textContent);const last=u=>calls.filter(c=>c.u===u).slice(-1)[0];
  const sheet=p=>E(p,()=>{const s=document.getElementById('sheet');return s&&!s.hidden?document.getElementById('sheetBody').innerText:''});

  // ---- login screen: terms links + code sign-in entry
  let p=await open();
  ok('מסך כניסה: קישורים לתקנון ולמדיניות פרטיות',await E(p,()=>{const l=document.getElementById('gLegal');return !!l&&l.offsetParent!==null&&/תקנון/.test(l.textContent)&&/פרטיות/.test(l.textContent)&&!!l.querySelector('a[href="terms.html"]')}));
  ok('מסך כניסה: קישור "כניסה עם קוד ב-SMS או באימייל"',await E(p,()=>{const a=document.getElementById('gToOtp');return a.offsetParent!==null&&/SMS/.test(a.textContent)}));
  ok('מסך כניסה רגיל: אין תיבת אישור (רק בהרשמה ובקוד)',await E(p,()=>document.getElementById('gTermsW').hidden));

  // ---- OTP by email
  await E(p,()=>gMode('otp'));
  ok('מצב קוד: שדה אימייל/טלפון, בלי סיסמה, עם תיבת אישור תקנון וכפתור שליחה',await E(p,()=>!document.getElementById('gId').parentNode.hidden&&document.getElementById('gPw').parentNode.hidden&&!document.getElementById('gTermsW').hidden&&!document.getElementById('gOt').hidden));
  const n0=calls.length;await E(p,()=>{gId.value='dana@example.com';gOtpSend()});await sleep(300);
  ok('בלי אישור התקנון: לא נשלח קוד ומוצגת הודעה',/תנאי השימוש/.test(await err(p))&&!calls.slice(n0).some(c=>c.u==='/auth/v1/otp'),await err(p));
  await E(p,()=>{gTerms.checked=true;gOtpSend()});await sleep(500);let c=last('/auth/v1/otp');
  ok('נשלח קוד לאימייל עם יצירת משתמש ואישור התקנון (גרסה ותאריך)',c&&c.b.email==='dana@example.com'&&c.b.create_user===true&&c.b.data.terms_version===TV&&!!c.b.data.terms_accepted_at,c&&c.b);
  ok('קוד באימייל: כתובת חזרה לאפליקציה (לקישור שבמייל)',c&&/redirect_to=/.test(c.q));
  ok('אחרי השליחה: מסך הזנת קוד עם הסבר, שליחה חוזרת ננעלת ל-60 שניות',await E(p,()=>!document.getElementById('gCodeW').hidden&&!document.getElementById('gVf').hidden&&/dana@example.com/.test(gOtpTx.textContent)&&/בעוד/.test(gRe.textContent)));
  await E(p,()=>{gCode.value='111111';gOtpVerify()});await sleep(400);
  ok('קוד שגוי: הודעה ברורה, נשארים במסך',/שגוי|פג/.test(await err(p))&&await E(p,()=>!gate.hidden),await err(p));
  await E(p,()=>{gCode.value='654321';gOtpVerify()});await sleep(1200);
  c=last('/auth/v1/verify');ok('קוד נכון: אימות type=email ונכנסים לאפליקציה',c&&c.b.type==='email'&&await E(p,()=>gate.hidden&&!!aGet()),c&&c.b);
  ok('משתמש שאישר תקנון בהרשמה בקוד: לא נשאל שוב',!(await sheet(p)));

  // ---- OTP by SMS
  p=await open();await E(p,()=>{gMode('otp');gId.value='050-123-4567';gTerms.checked=true;gOtpSend()});await sleep(500);c=last('/auth/v1/otp');
  ok('קוד ב-SMS: מספר ישראלי מומר ל-E.164',c&&c.b.phone==='+972501234567'&&!c.b.email,c&&c.b);
  await E(p,()=>{gCode.value='654321';gOtpVerify()});await sleep(1200);c=last('/auth/v1/verify');
  ok('קוד ב-SMS: אימות type=sms ונכנסים',c&&c.b.type==='sms'&&c.b.phone==='+972501234567'&&await E(p,()=>gate.hidden),c&&c.b);
  smsBroken=true;p=await open();await E(p,()=>{gMode('otp');gId.value='0521112222';gTerms.checked=true;gOtpSend()});await sleep(500);
  ok('אין ספק SMS בשרת: הודעה מובנת שמציעה אימייל',/SMS/.test(await err(p))&&/אימייל/.test(await err(p)),await err(p));smsBroken=false;

  // ---- sign-up: terms required, phone confirmation step
  p=await open();await E(p,()=>{gMode('up');gFn.value='דנה';gLn.value='לוי';gDob.value='1990-01-01';gId.value='0539998888';gPw.value=gPw2.value='password1';gSignUp()});await sleep(400);
  ok('הרשמה בלי אישור התקנון נחסמת',/תנאי השימוש/.test(await err(p))&&!calls.some(x=>x.u==='/auth/v1/signup'),await err(p));
  ok('בהרשמה מוצגת תיבת אישור עם קישורים לתקנון ולפרטיות',await E(p,()=>!gTermsW.hidden&&!!gTermsW.querySelector('a[href="terms.html"]')&&!!gTermsW.querySelector('a[href="privacy.html"]')));
  await E(p,()=>{gTerms.checked=true;gSignUp()});await sleep(600);c=last('/auth/v1/signup');
  ok('הרשמה: אישור התקנון נשמר בחשבון',c&&c.b.data.terms_version===TV&&c.b.data.first_name==='דנה',c&&c.b);
  ok('הרשמה בטלפון: עוברים למסך הזנת קוד ה-SMS (לא נתקעים)',await E(p,()=>!gCodeW.hidden&&!gVf.hidden&&/SMS/.test(document.getElementById('gErr').textContent)));
  await E(p,()=>{OTPCD=0;gOtpResend()});await sleep(300);c=last('/auth/v1/resend');
  ok('שליחה חוזרת בהרשמה: /resend עם type=sms',c&&c.b.type==='sms'&&c.b.phone==='+972539998888',c&&c.b);
  await E(p,()=>{gCode.value='654321';gOtpVerify()});await sleep(1200);
  ok('אישור קוד ההרשמה: נכנסים לחשבון',await E(p,()=>gate.hidden&&!!aGet()));

  // ---- existing account without terms -> asked once after sign-in
  users['old@example.com']={id:'u-old',pw:'password1',md:{}};
  p=await open();await E(p,()=>{gId.value='old@example.com';gPw.value='password1';gSignIn()});await sleep(1800);
  let t=await sheet(p);ok('חשבון ישן בלי אישור: אחרי הכניסה מוצג מסך אישור תנאי השימוש',/אישור תנאי השימוש/.test(t)&&/התקנון/.test(t),t);
  await E(p,()=>document.getElementById('sheet').dispatchEvent(new MouseEvent('click',{bubbles:true})));await E(p,()=>closeS());await sleep(200);
  ok('אי אפשר לסגור את מסך האישור בלחיצה בחוץ',/אישור תנאי השימוש/.test(await sheet(p)));
  await E(p,()=>termsAccept());await sleep(300);
  ok('אישור בלי לסמן: הודעה, לא נשמר',/לסמן/.test(await E(p,()=>tmErr.textContent))&&!users['old@example.com'].md.terms_version);
  await E(p,()=>{tmOk.checked=true;termsAccept()});await sleep(600);
  ok('אישור: נשמר בחשבון והמסך נסגר',users['old@example.com'].md.terms_version===TV&&!/אישור תנאי השימוש/.test(await sheet(p)),users['old@example.com'].md);
  p=await open();await E(p,()=>{gId.value='old@example.com';gPw.value='password1';gSignIn()});await sleep(1600);
  ok('בכניסה הבאה לא נשאלים שוב',!/אישור תנאי השימוש/.test(await sheet(p)));
  users['no@example.com']={id:'u-no',pw:'password1',md:{}};
  p=await open();await E(p,()=>{gId.value='no@example.com';gPw.value='password1';gSignIn()});await sleep(1800);await E(p,()=>termsDecline());await sleep(800);
  ok('לא מאשר: יוצאים מהחשבון וחוזרים למסך הכניסה',await E(p,()=>!aGet()&&!gate.hidden)&&!users['no@example.com'].md.terms_version);

  ok('אין שגיאות JavaScript',errs.length===0,errs);
  await br.close();api.close();web.close();
  const failed=res.filter(x=>!x).length;console.log(`\n${res.length-failed}/${res.length} passed`);process.exit(failed?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
