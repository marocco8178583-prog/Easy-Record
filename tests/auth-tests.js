// Auth gate tests against a LOCAL MOCK of the Supabase GoTrue REST API (simulation, NOT a real Supabase project).
const fs=require('fs'),http=require('http'),path=require('path');
const puppeteer=require(process.env.PUPPETEER||'/opt/npm-tools/node_modules/puppeteer');
const APP=path.resolve(process.argv[2]||'dist/index.html');const res=[];
const ok=(n,c,d)=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+d))};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const users={};const mkTok=(id,aal)=>{const t='h.'+Buffer.from(JSON.stringify({aal:aal||'aal1',r:Math.random()})).toString('base64url')+'.s';tokens[t]=id;aalOf[t]=aal||'aal1';return t};const sess=(id,aal,extra)=>{const x=users[id],t=mkTok(id,aal);return {access_token:t,refresh_token:'r'+t,expires_in:3600,user:Object.assign({id:x.id,email:id.includes('@')?id:'',phone:id.includes('@')?'':id,factors:x.factors||[]},extra||{})}};let aalOf={},loggedOut=[],log=[],tokens={},mailSent=[],autoConfirm=true,deleted=[];
function body(q){return new Promise(r=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch(e){r({})}})})}
const api=http.createServer(async(q,s)=>{s.setHeader('Access-Control-Allow-Origin','*');s.setHeader('Access-Control-Allow-Headers','*');s.setHeader('Access-Control-Allow-Methods','*');if(q.method==='OPTIONS'){s.statusCode=204;return s.end()}
 const b=await body(q),u=q.url,j=(c,o)=>{s.statusCode=c;s.setHeader('content-type','application/json');s.end(JSON.stringify(o))};log.push(q.method+' '+u.split('?')[0]+' key:'+(q.headers.apikey||'').slice(0,4));
 const id=b.email||b.phone;
 if(u.startsWith('/auth/v1/signup')){if(users[id])return j(422,{error_code:'user_already_exists',msg:'User already registered'});if((b.password||'').length<8)return j(422,{error_code:'weak_password',msg:'weak'});users[id]={pw:b.password,id:'u'+Object.keys(users).length,confirmed:autoConfirm,md:b.data||{}};if(!autoConfirm){return j(200,{id:users[id].id,email:b.email})}
  return j(200,sess(id))}
 if(u.startsWith('/auth/v1/token?grant_type=password')){const x=users[id];if(!x||x.pw!==b.password)return j(400,{error_code:'invalid_credentials',msg:'Invalid login credentials'});if(!x.confirmed)return j(400,{error_code:'email_not_confirmed',msg:'Email not confirmed'});return j(200,sess(id))}
 if(u.startsWith('/auth/v1/settings'))return j(200,{external:{google:true,apple:false,email:true}});
 if(u.startsWith('/auth/v1/factors')){const t=(q.headers.authorization||'').slice(7),uidk=tokens[t],x=users[uidk];if(!x)return j(401,{});x.factors=x.factors||[];const m=/^\/auth\/v1\/factors\/([^\/]+)(\/(challenge|verify))?/.exec(u);
  if(!m&&q.method==='POST'){const f={id:'f'+Math.random().toString(36).slice(2),status:'unverified',factor_type:'totp'};x.factors.push(f);return j(200,{id:f.id,type:'totp',totp:{qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#000"/></svg>',secret:'JBSWY3DPEHPK3PXP',uri:'otpauth://totp/x'}})}
  const f=x.factors.find(y=>y.id===m[1]);if(!f)return j(404,{});
  if(m[3]==='challenge')return j(200,{id:'ch-'+f.id});
  if(m[3]==='verify'){if(b.challenge_id!=='ch-'+f.id||b.code!=='123456')return j(422,{error_code:'mfa_verification_failed',msg:'Invalid TOTP code entered'});f.status='verified';return j(200,sess(uidk,'aal2'))}
  if(q.method==='DELETE'){if(x.factors.some(y=>y.status==='verified')&&f.status==='verified'&&aalOf[t]!=='aal2')return j(403,{error_code:'insufficient_aal'});x.factors=x.factors.filter(y=>y!==f);return j(200,{id:f.id})}
  return j(405,{})}
 if(u.startsWith('/auth/v1/logout')){loggedOut.push((q.headers.authorization||'').slice(7));return j(204,{})}
 if(u.startsWith('/auth/v1/user')&&q.method==='GET'){const t=(q.headers.authorization||'').slice(7);if(t==='CONFIRMTOK')return j(200,{id:'u-conf',email:'new@b.co'});if(tokens[t]){const x=users[tokens[t]];return j(200,{id:x.id,email:tokens[t],factors:x.factors||[],user_metadata:x.md||{}})}return j(401,{})}
 if(u.startsWith('/auth/v1/recover')){mailSent.push(b.email);return j(200,{})}
 if(u.startsWith('/auth/v1/user')&&q.method==='PUT'){const t=(q.headers.authorization||'').slice(7),i=tokens[t]||(t==='RECOVERYTOK'?'a@b.co':null);if(!i)return j(401,{msg:'bad'});if(b.password)users[i].pw=b.password;if(b.data&&users[i])users[i].md=Object.assign(users[i].md||{},b.data);return j(200,{})}
 if(u.startsWith('/rest/v1/rpc/delete_my_account')){const t=(q.headers.authorization||'').slice(7);if(!tokens[t])return j(401,{});deleted.push(tokens[t]);delete users[tokens[t]];return j(200,{})}
 j(404,{})});
(async()=>{await new Promise(r=>api.listen(0,r));const API='http://localhost:'+api.address().port;
 const web=http.createServer((q,s)=>{if(q.url.startsWith('/config.js')){s.setHeader('content-type','text/javascript');return s.end("window.ER_CONFIG=%CFG%")}s.setHeader('content-type','text/html; charset=utf-8');s.end(fs.readFileSync(APP))});
 let cfg="{supabaseUrl:'"+API+"',supabaseAnonKey:'ANON-PUBLIC'}";
 web.removeAllListeners('request');web.on('request',(q,s)=>{if(q.url.startsWith('/config.js')){s.setHeader('content-type','text/javascript');return s.end('window.ER_CONFIG='+cfg)}s.setHeader('content-type','text/html; charset=utf-8');s.end(fs.readFileSync(APP))});
 await new Promise(r=>web.listen(0,r));const base='http://localhost:'+web.address().port+'/';
 // API is http://localhost -> the app requires https URL: relax only for tests by patching via request interception is not needed: we override authCfg
 const b=await puppeteer.launch({args:['--no-sandbox']});const errs=[];
 async function open(ctx){const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.evaluateOnNewDocument(()=>{window.__t=1});await p.goto(base);await sleep(600);await p.evaluate(()=>{authCfg=function(){return !!(CFG.supabaseUrl&&CFG.supabaseAnonKey)}});return p}
 const ctx=await b.createBrowserContext();let p=await open(ctx);
 const ready=()=>p.waitForFunction(()=>typeof authInit==='function'&&typeof aDel==='function'&&document.readyState==='complete',{timeout:15000});
 const v=async(f,...a)=>{for(let i=0;i<3;i++){try{await ready();return await p.evaluate(f,...a)}catch(e){if(i===2||!/context|navigation|not defined|not a function/i.test(e.message))throw e;await sleep(500)}}};
 ok('מסך פתיחה: שער מוצג, והאפליקציה חסומה מאחוריו',await v(()=>!document.getElementById('gate').hidden&&document.querySelector('main').hasAttribute('inert')));
 ok('מסך פתיחה מכיל לוגו, שדה אימייל/טלפון וסיסמה, כניסה, הרשמה ושכחתי סיסמה',await v(()=>!!document.querySelector('#gate img.logoI, #gate svg')&&!!gId&&!!gPw&&gIn.offsetParent&&/הרשמה/.test(gLinks.textContent)&&/שכחתי/.test(gLinks.textContent)));
 const fill=async(id,pw,pw2)=>{await v((a,b,c)=>{gId.value=a;gPw.value=b;gPw2.value=c||'';gFn.value='דניאל';gLn.value='מרוקו';gDob.value='1990-05-20';gTerms.checked=true},id,pw,pw2)};
 await v(()=>gSignIn());await sleep(100);ok('כניסה עם שדות ריקים: הודעת שגיאה, אין קריאת רשת',await v(()=>/אימייל או טלפון/.test(document.getElementById('gErr').textContent))&&log.filter(l=>!l.includes('settings')).length===0,log.join());
 await fill('not-an-email','12345678');await v(()=>gSignIn());ok('אימייל לא תקין נדחה בצד לקוח',await v(()=>/לא תקינה/.test(document.getElementById('gErr').textContent))&&log.filter(l=>!l.includes('settings')).length===0);
 await fill('a@b.co','12345678');await v(()=>gSignIn());await sleep(400);ok('כניסה עם משתמש לא קיים: שגיאה כללית, נשארים בשער',await v(()=>/שגויים/.test(document.getElementById('gErr').textContent)&&!gate.hidden));
 await v(()=>gMode('up'));await fill('a@b.co','password1','password1');await v(()=>{gFn.value=''});await v(()=>gSignUp());ok('הרשמה: שם פרטי חובה',await v(()=>/שם פרטי/.test(document.getElementById('gErr').textContent)));
 await fill('a@b.co','password1','password1');await v(()=>{gLn.value=''});await v(()=>gSignUp());ok('הרשמה: שם משפחה חובה',await v(()=>/שם משפחה/.test(document.getElementById('gErr').textContent)));
 await fill('a@b.co','password1','password1');await v(()=>{gDob.value=''});await v(()=>gSignUp());ok('הרשמה: תאריך לידה חובה',await v(()=>/תאריך לידה/.test(document.getElementById('gErr').textContent)));
 await fill('a@b.co','password1','password1');await v(()=>{gDob.value='2099-01-01'});await v(()=>gSignUp());ok('הרשמה: תאריך לידה עתידי נדחה',await v(()=>/בעתיד/.test(document.getElementById('gErr').textContent)));
 await fill('a@b.co','short','short');await v(()=>gSignUp());ok('הרשמה: סיסמה קצרה נדחית',await v(()=>/8 תווים/.test(document.getElementById('gErr').textContent)));
 await fill('a@b.co','password1','password2');await v(()=>gSignUp());ok('הרשמה: אימות סיסמה לא זהה נדחה',await v(()=>/לא זהות/.test(document.getElementById('gErr').textContent)));
 await fill('a@b.co','password1','password1');await v(()=>{gNick.value='דני'});await v(()=>gSignUp());await sleep(500);ok('הרשמה: שם, כינוי ותאריך לידה נשמרים והכינוי מופיע בברכה',await v(()=>S.fname==='דניאל'&&S.lname==='מרוקו'&&S.dob==='1990-05-20'&&/דני$/.test(greet())),await v(()=>JSON.stringify([S.fname,S.lname,S.dob,greet()])));
 ok('הרשמה עם אימייל: נכנס לאפליקציה, השער נסגר, מפתח anon בלבד נשלח',await v(()=>gate.hidden&&!document.querySelector('main').hasAttribute('inert'))&&log.some(l=>l.includes('signup')&&l.endsWith('key:ANON')),log.join('|'));
 const sess=await v(()=>JSON.parse(localStorage.getItem('er-auth')));ok('הסשן נשמר (בלי סיסמה)',sess&&sess.user.email==='a@b.co'&&!JSON.stringify(sess).includes('password1'));
 await p.reload();await sleep(700);ok('אחרי רענון נשארים מחוברים (בלי שער)',await v(()=>gate.hidden));
 ok('הגדרות: מוצג החשבון המחובר',await v(()=>{tab='set';render();return /a@b.co/.test(document.getElementById('acct').textContent)}));
 await v(()=>{aOut()});await sleep(900);ok('יציאה: חוזר השער והסשן נמחק',await v(()=>!gate.hidden&&!localStorage.getItem('er-auth')));
 await fill('a@b.co','password1');await v(()=>gSignIn());await sleep(500);ok('כניסה עם סיסמה נכונה',await v(()=>gate.hidden),await v(()=>document.getElementById('gErr').textContent));
 await v(()=>{aOut()});await sleep(900);await v(()=>gSignUp&&gMode('up'));await fill('a@b.co','password1','password1');await v(()=>gSignUp());await sleep(400);ok('הרשמה כפולה: הודעה על חשבון קיים',await v(()=>/כבר קיים חשבון/.test(document.getElementById('gErr').textContent)));
 // phone
 await fill('0501234567','password1','password1');await v(()=>gSignUp());await sleep(500);ok('הרשמה/כניסה בטלפון: מומר ל-E.164',await v(()=>gate.hidden)&&JSON.stringify(await v(()=>aGet()))&&(await v(()=>aGet().user.phone))==='+972501234567',JSON.stringify(await v(()=>aGet())));
 await v(()=>{aOut()});await sleep(900);
 // forgot
 await v(()=>gMode('forgot'));await fill('a@b.co','');await v(()=>gForgot());await sleep(400);ok('שכחתי סיסמה: נשלח אימייל, הודעה לא חושפת אם החשבון קיים',mailSent.includes('a@b.co')&&await v(()=>/אם קיים חשבון/.test(document.getElementById('gErr').textContent)));
 mailSent=[];await v(()=>gMode('forgot'));await fill('nobody@x.co','');await v(()=>gForgot());await sleep(400);ok('אותה הודעה גם לאימייל שלא קיים',await v(()=>/אם קיים חשבון/.test(document.getElementById('gErr').textContent)));
 await v(()=>gMode('forgot'));await fill('0501234567','');await v(()=>gForgot());ok('איפוס בטלפון: מוסבר שנשלח באימייל',await v(()=>/באימייל/.test(document.getElementById('gErr').textContent)));
 // recovery link
 const p2=await ctx.newPage();p2.on('pageerror',e=>errs.push(e.message));await p2.goto(base+'#access_token=RECOVERYTOK&type=recovery&refresh_token=x');await sleep(700);await p2.evaluate(()=>{authCfg=function(){return true}});
 ok('קישור איפוס: מוצג מסך סיסמה חדשה וה-hash נמחק',await p2.evaluate(()=>!gate.hidden&&gate.dataset.mode==='reset'&&!location.hash));
 await p2.evaluate(()=>{gPw.value='newpass123';gPw2.value='newpass123';gReset()});await sleep(500);ok('סיסמה חדשה נשמרה בשרת (מדומה)',users['a@b.co'].pw==='newpass123');
 await p2.close();
 // sign in with new pass then delete
 await fill('a@b.co','newpass123');await v(()=>gSignIn());await sleep(500);
 await v(()=>{window.cf=function(t,fn){fn()};aDel()});await sleep(1000);ok('מחיקת חשבון: נקראה פונקציית המחיקה, הסשן נמחק, השער חזר',deleted.includes('a@b.co')&&await v(()=>!gate.hidden&&!localStorage.getItem('er-auth')),JSON.stringify(deleted));
 // email confirmation redirect
 const p4=await ctx.newPage();p4.on('pageerror',e=>errs.push(e.message));await p4.goto(base+'#access_token=CONFIRMTOK&expires_in=3600&refresh_token=rt1&token_type=bearer&type=signup');await sleep(900);
 ok('קישור אישור אימייל: נכנס אוטומטית, ה-token נמחק משורת הכתובת',await p4.evaluate(()=>gate.hidden&&!location.hash&&aGet().user.email==='new@b.co'&&aGet().refresh_token==='rt1'),await p4.evaluate(()=>location.hash+'|'+JSON.stringify(aGet())));
 await p4.evaluate(()=>{aOut()});await sleep(900);ok('יציאה מבטלת את הסשן גם בשרת (logout)',loggedOut.includes('CONFIRMTOK'),loggedOut.join());
 await p4.goto(base+'#error=access_denied&error_description=Email+link+is+invalid+or+has+expired');await p4.reload();await sleep(700);
 ok('קישור שפג תוקפו: הודעה ברורה, בלי שגיאה',await p4.evaluate(()=>!gate.hidden&&/פג תוקפו/.test(document.getElementById('gErr').textContent)&&!location.hash));await p4.close();
 // ===== OAuth buttons =====
 await v(()=>{aGate()});await sleep(500);
 ok('כפתור Google מוצג רק כי הספק מופעל בפרויקט; Apple מוסתר כי לא מופעל',await v(()=>!document.getElementById('gOA').hidden&&!gGoogle.hidden&&gApple.hidden));
 ok('לחיצה על Google מפנה ל-Supabase עם הספק וכתובת החזרה של האתר',await v(()=>{let u='';window.gGo=function(x){u=x};gOAuth('google');return /\/auth\/v1\/authorize\?provider=google&redirect_to=/.test(u)&&decodeURIComponent(u.split('redirect_to=')[1])===location.origin+location.pathname}));
 ok('Apple שלא הופעל: לא מפנה לשום מקום',await v(()=>{let u='';window.gGo=function(x){u=x};gOAuth('apple');return u===''}));
 // ===== two-factor =====
 await v(()=>{gMode('up')});await fill('mfa@b.co','password1','password1');await v(()=>gSignUp());await sleep(600);
 await v(()=>mfaOpen());await sleep(500);
 ok('הפעלת אימות דו־שלבי: מוצגים קוד QR ומפתח להזנה ידנית',await v(()=>!!document.querySelector('#sheetBody img[alt="קוד QR"]')&&/JBSWY3DPEHPK3PXP/.test($('sheetBody').textContent)));
 const fid=users['mfa@b.co'].factors[0].id;
 await v(f=>{$('mfC').value='000000';return mfaOn(f)},fid);await sleep(300);
 ok('קוד שגוי בהפעלה נדחה, האימות לא מופעל',await v(()=>/שגוי/.test($('mfE').textContent))&&users['mfa@b.co'].factors[0].status==='unverified');
 await v(f=>{$('mfC').value='123456';return mfaOn(f)},fid);await sleep(300);
 ok('קוד נכון מפעיל את האימות והסשן משודרג ל-aal2',users['mfa@b.co'].factors[0].status==='verified'&&await v(()=>jwtAal(aGet().access_token)==='aal2'&&/הופעל/.test($('sheetBody').textContent)));await v(()=>closeS());
 await v(()=>{aOut()});await sleep(900);
 await fill('mfa@b.co','password1');await v(()=>gSignIn());await sleep(500);
 ok('כניסה עם סיסמה נכונה לחשבון עם אימות דו־שלבי: נדרש קוד, עדיין לא מחוברים והסשן לא נשמר',await v(()=>!gate.hidden&&gate.dataset.mode==='mfa'&&!document.getElementById('gCodeW').hidden&&!localStorage.getItem('er-auth')));
 await v(()=>{gCode.value='111111';return gMfa()});await sleep(300);
 ok('קוד שגוי בכניסה נדחה',await v(()=>/שגוי/.test(document.getElementById('gErr').textContent)&&!gate.hidden&&!localStorage.getItem('er-auth')));
 await v(()=>{gCode.value='123456';return gMfa()});await sleep(600);
 ok('קוד נכון מכניס לאפליקציה עם סשן aal2',await v(()=>gate.hidden&&jwtAal(aGet().access_token)==='aal2'&&aGet().user.email==='mfa@b.co'));
 await v(()=>mfaOpen());await sleep(400);
 ok('בהגדרות מוצג שהאימות פעיל, וכיבוי דורש קוד',await v(()=>/פעיל/.test($('sheetBody').textContent))&&await v(async f=>{$('mfC').value='';await mfaOff(f);return /6 ספרות/.test($('mfE').textContent)},fid)&&users['mfa@b.co'].factors.length===1);
 await v(f=>{$('mfC').value='123456';return mfaOff(f)},fid);await sleep(400);
 ok('כיבוי עם קוד נכון מסיר את האימות',users['mfa@b.co'].factors.length===0&&await v(()=>/כובה/.test($('sheetBody').textContent)));await v(()=>closeS());
 await v(()=>{aOut()});await sleep(1200);await p.waitForFunction(()=>typeof gLocal==='function'&&document.readyState==='complete');await sleep(300);
 // local mode
 await v(()=>gLocal());ok('המשך בלי חשבון: האפליקציה נפתחת',await v(()=>gate.hidden));await p.reload();await sleep(700);ok('מצב מקומי נשמר אחרי רענון',await v(()=>gate.hidden));
 // offline with session
 await fill&&0;await v(()=>{localStorage.removeItem('er4-local');aGate()});await fill('0501234567','password1');
 // not configured
 cfg="{supabaseUrl:'',supabaseAnonKey:''}";const ctx2=await b.createBrowserContext();const p3=await ctx2.newPage();await p3.goto(base);await sleep(700);
 await p3.evaluate(()=>{gId.value='a@b.co';gPw.value='12345678';gSignIn()});await sleep(200);
 ok('בלי הגדרת שירות: הודעה כנה ואפשרות להמשיך מקומית',await p3.evaluate(()=>/עדיין לא הוגדר/.test(document.getElementById('gErr').textContent)&&document.getElementById('gLocal').offsetParent!==null));
 ok('אין קריאות רשת סודיות: כל הבקשות נשלחו עם מפתח ה-anon בלבד',log.every(l=>l.endsWith('key:ANON')||l.endsWith('key:')),log.join('|'));
 ok('אין שגיאות JS',errs.length===0,errs.join('|'));
 await b.close();api.close();web.close();const f=res.filter(x=>!x).length;console.log((res.length-f)+'/'+res.length+' passed');process.exit(f?1:0)})();
