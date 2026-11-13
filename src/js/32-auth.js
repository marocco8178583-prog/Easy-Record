/* Accounts (Supabase GoTrue REST, no secret keys). Needs window.ER_CONFIG={supabaseUrl,supabaseAnonKey} from config.js (PUBLIC anon key only).
   Without config the app works locally ("continue without account"). The gate is an identity screen, NOT a lock for data stored on the device. */
var CFG=window.ER_CONFIG||{},AUTHK='er-auth',LOCALK='er-local-mode',RECOV=null,PENDS=null,OAP={google:false,apple:false};
function authCfg(){return !!(CFG.supabaseUrl&&CFG.supabaseAnonKey&&/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:|\/|$))/.test(CFG.supabaseUrl))}
function aGet(){try{return JSON.parse(localStorage.getItem(AUTHK))}catch(e){return null}}
function aSet(s){try{if(s)localStorage.setItem(AUTHK,JSON.stringify(s));else localStorage.removeItem(AUTHK)}catch(e){}}
function aSess(d){if(!d||!d.access_token)return null;return {access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+(+d.expires_in||3600)*1000,user:{id:d.user&&d.user.id,email:d.user&&d.user.email||'',phone:d.user&&d.user.phone||''}}}
async function aFetch(path,method,body,token){var r;try{r=await fetch(CFG.supabaseUrl.replace(/\/$/,'')+path,{method:method,headers:{'Content-Type':'application/json',apikey:CFG.supabaseAnonKey,Authorization:'Bearer '+(token||CFG.supabaseAnonKey)},body:body?JSON.stringify(body):undefined})}catch(e){return {ok:false,net:true,status:0,data:{}}}
  var d={};try{d=await r.json()}catch(e){}return {ok:r.ok,status:r.status,data:d||{}}}
function aErr(r){if(r.net)return 'אין חיבור לאינטרנט. נסה שוב כשיש חיבור.';var c=(r.data.error_code||r.data.code||'')+'',m=(r.data.msg||r.data.message||r.data.error_description||'')+'';
  if(r.status===429||/rate|too many/i.test(c+m))return 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.';
  if(/invalid_credentials|invalid login/i.test(c+m))return 'האימייל/טלפון או הסיסמה שגויים.';
  if(/exists|registered/i.test(c+m))return 'כבר קיים חשבון עם הפרטים האלה. נסה להתחבר או לאפס סיסמה.';
  if(/weak_password|password/i.test(c+m))return 'הסיסמה חלשה מדי. השתמש בלפחות 8 תווים.';
  if(/not_confirmed|confirm/i.test(c+m))return 'החשבון עוד לא אושר. בדוק את האימייל שלך לקישור אישור.';
  return 'הפעולה נכשלה ('+(r.status||'שגיאה')+'). נסה שוב.'}
function aId(v){v=String(v||'').trim();if(!v)return {err:'הזן אימייל או טלפון'};if(v.indexOf('@')<0&&/[a-z]/i.test(v))return {err:'כתובת האימייל לא תקינה'};if(v.indexOf('@')>=0){if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))return {err:'כתובת האימייל לא תקינה'};return {email:v.toLowerCase()}}
  var p=normPhone(v,S.dcc);if(!p.ok||!p.e164)return {err:p.err||'הטלפון לא תקין. הוסף קידומת מדינה, למשל +972'};return {phone:p.e164}}
function gErr(t,good){var e=$('gErr');e.textContent=t||'';if(t){try{sndPlay(good?'save':'err')}catch(x){}}e.style.color=good?'var(--ok)':'var(--owe)'}
function gBusy(b){[].forEach.call(document.querySelectorAll('#gate button'),function(x){x.disabled=b})}
function gShow(on){var g=$('gate');g.hidden=!on;var m=document.querySelector('main'),n=$('nav');[m,n].forEach(function(x){if(!x)return;if(on)x.setAttribute('inert','');else x.removeAttribute('inert')});if(on){if(!RECOV)gMode('in');setTimeout(function(){var i=$('gId');if(i&&!RECOV)i.focus()},50)}}
function gMode(m){RECOV=m==='reset'?RECOV:null;if(m!=='mfa')PENDS=null;var mf=m==='mfa';$('gId').parentNode.hidden=m==='reset'||mf;$('gPw').parentNode.hidden=m==='forgot'||mf;$('gPw2').hidden=m!=='reset'&&m!=='up';$('gProf').hidden=m!=='up';
  $('gIn').hidden=m!=='in';$('gUp').hidden=m!=='up';$('gFg').hidden=m!=='forgot';$('gRs').hidden=m!=='reset';$('gLinks').hidden=m==='reset'||mf;
  $('gCodeW').hidden=!mf;$('gMf').hidden=!mf;$('gMfX').hidden=!mf;$('gLocal').hidden=mf;$('gOA').hidden=!(m==='in'||m==='up')||!(OAP.google||OAP.apple);$('gGoogle').hidden=!OAP.google;$('gApple').hidden=!OAP.apple;
  $('gPw').autocomplete=m==='up'||m==='reset'?'new-password':'current-password';$('gPw').placeholder=m==='reset'?'סיסמה חדשה (8 תווים לפחות)':'סיסמה';gErr('');$('gate').dataset.mode=m;if(m==='up')setTimeout(function(){var f=$('gFn');if(f&&!f.value)f.focus()},50);if(mf){$('gCode').value='';setTimeout(function(){$('gCode').focus()},50)}}
function gLocal(){try{localStorage.setItem(LOCALK,'1')}catch(e){}gShow(false);renderAcct()}
async function gSignIn(){var id=aId($('gId').value),pw=$('gPw').value;if(id.err)return gErr(id.err);if(!pw)return gErr('הזן סיסמה');if(!authCfg())return gErr('שירות החשבונות עדיין לא הוגדר באתר הזה. אפשר להמשיך בלי חשבון.');
  gBusy(true);gErr('');var r=await aFetch('/auth/v1/token?grant_type=password','POST',Object.assign({password:pw},id.email?{email:id.email}:{phone:id.phone}));gBusy(false);
  var s=r.ok&&aSess(r.data);if(!s)return gErr(aErr(r));$('gPw').value='';if(needMfa(r.data.user,s.access_token)){PENDS=s;PENDS.fid=mfaFid(r.data.user);var ps=PENDS;gMode('mfa');PENDS=ps;return}aSet(s);try{localStorage.removeItem(LOCALK)}catch(e){}await aAfterLogin()}
function nmClean(v){return String(v||'').replace(/\s+/g,' ').trim().slice(0,30)}
function dobErr(d){if(!d)return 'הזן תאריך לידה';if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return 'תאריך הלידה לא תקין';if(d>today())return 'תאריך הלידה לא יכול להיות בעתיד';if(d<'1900-01-01')return 'תאריך הלידה לא תקין';return ''}
function gProfile(){var p={fname:nmClean($('gFn').value),lname:nmClean($('gLn').value),nick:nmClean($('gNick').value),dob:String($('gDob').value||'')};
  if(!p.fname)return {err:'הזן שם פרטי'};if(!p.lname)return {err:'הזן שם משפחה'};var de=dobErr(p.dob);if(de)return {err:de};return p}
function profApply(p){if(!p)return;var ch=false;['fname','lname','nick','dob'].forEach(function(k){if(p[k]&&!S[k]){S[k]=p[k];ch=true}});if(ch){save();try{render()}catch(e){}}}
function profFromUser(u){var m=u&&u.user_metadata||{};return {fname:nmClean(m.first_name||m.given_name||''),lname:nmClean(m.last_name||m.family_name||''),nick:nmClean(m.nickname||''),dob:/^\d{4}-\d{2}-\d{2}$/.test(m.birth_date||'')?m.birth_date:''}}
async function gSignUp(){var pf=gProfile();if(pf.err)return gErr(pf.err);var id=aId($('gId').value),pw=$('gPw').value;if(id.err)return gErr(id.err);if(pw.length<8)return gErr('הסיסמה חייבת להכיל לפחות 8 תווים');if(pw!==$('gPw2').value)return gErr('הסיסמאות לא זהות');if(!authCfg())return gErr('שירות החשבונות עדיין לא הוגדר באתר הזה. אפשר להמשיך בלי חשבון.');
  gBusy(true);gErr('');var r=await aFetch('/auth/v1/signup','POST',Object.assign({password:pw,data:{first_name:pf.fname,last_name:pf.lname,nickname:pf.nick,birth_date:pf.dob}},id.email?{email:id.email}:{phone:id.phone}));gBusy(false);if(!r.ok)return gErr(aErr(r));
  try{localStorage.setItem('er-pendprof',JSON.stringify(pf))}catch(e){}
  var s=aSess(r.data);if(s){aSet(s);try{localStorage.removeItem(LOCALK)}catch(e){}$('gPw').value=$('gPw2').value='';await aAfterLogin();return}
  gMode('in');gErr(id.email?'נרשמת. שלחנו אימייל אישור, לחץ על הקישור ואז התחבר.':'נרשמת. אשר את הקוד שנשלח ב-SMS ואז התחבר.',true)}
async function gForgot(){var id=aId($('gId').value);if(id.err)return gErr(id.err);if(!id.email)return gErr('איפוס סיסמה נשלח באימייל. הזן את כתובת האימייל.');if(!authCfg())return gErr('שירות החשבונות עדיין לא הוגדר באתר הזה.');
  gBusy(true);var r=await aFetch('/auth/v1/recover?redirect_to='+encodeURIComponent(typeof natRedirect==='function'?natRedirect():location.origin+location.pathname),'POST',{email:id.email});gBusy(false);
  if(r.net||r.status===429)return gErr(aErr(r));gMode('in');gErr('אם קיים חשבון עם האימייל הזה, נשלח אליו קישור לאיפוס הסיסמה.',true)}
async function gReset(){var pw=$('gPw').value;if(pw.length<8)return gErr('הסיסמה חייבת להכיל לפחות 8 תווים');if(pw!==$('gPw2').value)return gErr('הסיסמאות לא זהות');
  gBusy(true);var r=await aFetch('/auth/v1/user','PUT',{password:pw},RECOV);gBusy(false);if(!r.ok)return gErr(aErr(r));RECOV=null;$('gPw').value=$('gPw2').value='';gMode('in');gErr('הסיסמה עודכנה. אפשר להתחבר.',true)}
async function authInit(){gProviders();try{if(!localStorage.getItem(OWNK)){var s0=aGet();localStorage.setItem(OWNK,s0&&s0.user&&s0.user.id?s0.user.id:'guest')}}catch(e){}
  var h=location.hash||'';if(/type=recovery/.test(h)){var m=/access_token=([^&]+)/.exec(h);if(m){RECOV=decodeURIComponent(m[1]);try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}gShow(true);gMode('reset');return}}
  /* email-confirmation / magic-link redirect: #access_token=...&refresh_token=...&type=signup -> sign in directly and clean the URL */
  if(/access_token=/.test(h)){var hp={};h.replace(/^#/,'').split('&').forEach(function(x){var i=x.indexOf('=');if(i>0)hp[x.slice(0,i)]=decodeURIComponent(x.slice(i+1))});try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
    if(hp.access_token&&authCfg()){var ur=await aFetch('/auth/v1/user','GET',null,hp.access_token);if(ur.ok&&ur.data&&ur.data.id){var hs={access_token:hp.access_token,refresh_token:hp.refresh_token||'',expires_at:Date.now()+(+hp.expires_in||3600)*1000,user:{id:ur.data.id,email:ur.data.email||'',phone:ur.data.phone||''}};
      if(needMfa(ur.data,hs.access_token)){gShow(true);hs.fid=mfaFid(ur.data);gMode('mfa');PENDS=hs;renderAcct();return}
      aSet(hs);try{localStorage.removeItem(LOCALK)}catch(e){}if(hp.type==='signup')info('האימייל אושר ואתה מחובר.');await aAfterLogin();return}}
    gShow(true);gErr('האימייל אושר. אפשר להתחבר עם האימייל והסיסמה.',true);renderAcct();return}
  if(/error_description=/.test(h)){var em=/error_description=([^&]+)/.exec(h);try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}gShow(true);gErr('הקישור לא תקין או שפג תוקפו. נסה להתחבר, או בקש קישור חדש.');renderAcct();return}
  var s=aGet();if(s&&s.access_token){if(s.expires_at<Date.now()+60000&&s.refresh_token&&authCfg()){var r=await aFetch('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:s.refresh_token});
      if(r.ok&&aSess(r.data))aSet(aSess(r.data));else if(!r.net&&r.status>=400&&r.status<500){aSet(null);gShow(true);renderAcct();return}}
    await aAfterLogin(true);return}
  var loc=false;try{loc=localStorage.getItem(LOCALK)==='1'}catch(e){}if(loc){gShow(false);renderAcct();return}gShow(true);renderAcct()}
function renderAcct(){var b=$('acct');if(!b)return;var s=aGet();
  if(s&&s.user){b.innerHTML='<b>החשבון שלי</b><small class="m" style="display:block;margin-top:4px">מחובר: '+esc(s.user.email||s.user.phone||'')+'<br>הנתונים נשמרים במכשיר ומסתנכרנים לחשבון כשיש חיבור. מצב הסנכרון מוצג למעלה ובלשונית "סנכרון וענן".</small><div class="acts"><button class="ghost" id="mfaBtn" onclick="mfaOpen()">🔐 אימות דו־שלבי</button><button class="ghost" onclick="aOut()">יציאה</button><button class="ghost" onclick="aDel()">מחיקת החשבון</button></div>'}
  else b.innerHTML='<b>החשבון שלי</b><small class="m" style="display:block;margin-top:4px">'+(authCfg()?'לא מחובר. העבודה כרגע מקומית במכשיר הזה.':'שירות החשבונות עוד לא הוגדר באתר הזה. העבודה מקומית במכשיר.')+'</small><div class="acts"><button class="ghost" onclick="aGate()">כניסה / הרשמה</button></div>'}
function aGate(){try{localStorage.removeItem(LOCALK)}catch(e){}gShow(true)}
/* After any successful sign-in: make sure the data on screen belongs to this account. Guest data is never moved into an account without an explicit choice. */
/* after sign-in (and after any account switch), fill name / nickname / birth date from the account profile — only into empty fields, only for the signed-in account */
function profAfter(){try{var s=aGet();if(!s||!s.user||owner()!==s.user.id)return;var pp=localStorage.getItem('er-pendprof');profApply(profFromUser(s.user));if(pp){profApply(JSON.parse(pp));localStorage.removeItem('er-pendprof')}}catch(e){}}
async function aAfterLogin(boot){await aAfterLogin0(boot);profAfter()}
async function aAfterLogin0(boot){var s=aGet();if(!s||!s.user)return;var uid=s.user.id,o=owner();
  if(o===uid){gShow(false);renderAcct();if(!boot)aBackend();return}
  if(o==='guest'&&!hasData()&&!(await stGet(uid))){try{localStorage.setItem(OWNK,uid)}catch(e){}gShow(false);renderAcct();aBackend();return}
  if(o!=='guest'||!hasData()){await profSwitch(uid,false);return}
  gShow(false);renderAcct();var sum=S.entries.reduce(function(a,x){return a+(+x.amount||0)},0);
  $('sheetBody').innerHTML='<b>יש במכשיר נתונים ממצב אורח</b><small class="m" id="mgPrev">'+S.clients.length+' לקוחות · '+S.entries.length+' ימי עבודה ('+nis(sum)+') · '+S.pays.length+' תשלומים · '+S.sessions.length+' רישומי שעון · '+(S.debts||[]).length+' חובות שלי · '+(S.expenses||[]).length+' הוצאות.<br>מה לעשות איתם בחשבון '+esc(s.user.email||s.user.phone||'')+'?</small><button onclick="aMerge(true)">העבר אותם לחשבון שלי</button><button class="ghost" onclick="aMerge(false)">התחל בחשבון בלי הנתונים האלה</button><small class="m">בשתי האפשרויות שום דבר לא נמחק. באפשרות השנייה הנתונים נשארים במכשיר במצב אורח ("המשך בלי חשבון").</small><button class="ghost" onclick="aMergeCancel()">ביטול והתנתקות</button>';$('sheet').hidden=false}
async function aMerge(keep){closeS();var s=aGet();if(!s)return;var ok=await profSwitch(s.user.id,keep);if(ok&&keep){renderAcct();render();aBackend();info('הנתונים הועברו לחשבון ויסונכרנו.')}}
function aMergeCancel(){closeS();aOut()}
function aBackend(){if(CDB&&!SBDB){location.reload();return}initSb()}
async function aOut(){var os=aGet();if(os&&os.access_token&&authCfg())aFetch('/auth/v1/logout','POST',{},os.access_token);aSet(null);stopSb();try{localStorage.removeItem(LOCALK)}catch(e){}renderAcct();gShow(true);
  if(os&&os.user&&owner()===os.user.id)await profSwitch('guest',false)}
function aDel(){cf('למחוק את החשבון בענן? הנתונים שבמכשיר הזה לא יימחקו: הם יישארו במצב אורח. אי אפשר לבטל.',async function(){var s=aGet();if(!s||!authCfg())return;await rcPurgeCloud();var r=await aFetch('/rest/v1/rpc/delete_my_account','POST',{},s.access_token);if(!r.ok)return info(aErr(r));
  aSet(null);stopSb();[S.entries,S.pays,S.clients,S.sessions,S.debts||[],S.expenses||[],S.projects||[],S.tasks||[]].forEach(function(a){a.forEach(function(x){x.bv=0})});S.tomb={};S.conf={};if(S.sv)S.sv.bv=0;
  if(owner()===s.user.id)await profSwitch('guest',true);renderAcct();render();gShow(true);info('החשבון נמחק')})}
/* Enter submits the visible action; eye button shows/hides the password */
document.addEventListener('keydown',function(e){if(e.key!=='Enter'||$('gate').hidden||!/^(gId|gPw|gPw2|gCode)$/.test(e.target.id||''))return;e.preventDefault();var m=$('gate').dataset.mode;(m==='mfa'?gMfa:m==='up'?gSignUp:m==='forgot'?gForgot:m==='reset'?gReset:gSignIn)()});
function gEye(){var p=$('gPw'),on=p.type==='password';p.type=on?'text':'password';$('gPw2').type=p.type;$('gEyeB').setAttribute('aria-pressed',on);$('gEyeB').textContent=on?'🙈':'👁'}

/* ===== OAuth (Google / Apple) via Supabase: buttons appear only for providers that are enabled in the project ===== */
async function gProviders(){if(!authCfg())return;try{var r=await aFetch('/auth/v1/settings','GET');var x=(r.ok&&r.data&&r.data.external)||{};OAP={google:!!x.google,apple:!!x.apple};var m=$('gate').dataset.mode||'in';if(!$('gate').hidden&&(m==='in'||m==='up')){$('gOA').hidden=!(OAP.google||OAP.apple);$('gGoogle').hidden=!OAP.google;$('gApple').hidden=!OAP.apple}}catch(e){}}
function gGo(u){location.href=u}
function gOAuth(p){if(!authCfg()||!OAP[p])return gErr('הכניסה הזו לא הופעלה בפרויקט.');gGo(CFG.supabaseUrl.replace(/\/$/,'')+'/auth/v1/authorize?provider='+p+'&redirect_to='+encodeURIComponent(typeof natRedirect==='function'?natRedirect():location.origin+location.pathname))}
/* ===== two-factor authentication (TOTP authenticator app) ===== */
function jwtAal(t){try{var p=String(t).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p+'==='.slice((p.length+3)%4))).aal||'aal1'}catch(e){return 'aal1'}}
function mfaList(u){return ((u&&u.factors)||[]).filter(function(f){return f.factor_type==='totp'})}
function mfaFid(u){var f=mfaList(u).filter(function(f){return f.status==='verified'})[0];return f?f.id:null}
function needMfa(u,tok){return !!mfaFid(u)&&jwtAal(tok)!=='aal2'}
async function mfaVerify(fid,code,tok){var c=await aFetch('/auth/v1/factors/'+fid+'/challenge','POST',{},tok);if(!c.ok)return c;return aFetch('/auth/v1/factors/'+fid+'/verify','POST',{challenge_id:c.data.id,code:code},tok)}
async function gMfa(){var code=($('gCode').value||'').replace(/\D/g,''),ps=PENDS;if(!ps)return gMode('in');if(code.length!==6)return gErr('הזן את 6 הספרות מאפליקציית האימות');
  gBusy(true);var r=await mfaVerify(ps.fid,code,ps.access_token);gBusy(false);if(r.net||r.status===429)return gErr(aErr(r));if(!r.ok||!r.data.access_token)return gErr('הקוד שגוי או שפג תוקפו. נסה שוב עם הקוד הנוכחי.');
  var s=aSess(r.data)||{};if(!s.user||!s.user.id)s.user=ps.user;if(!s.refresh_token)s.refresh_token=ps.refresh_token;aSet(s);PENDS=null;try{localStorage.removeItem(LOCALK)}catch(e){}await aAfterLogin()}
async function mfaOpen(){var s=aGet();if(!s||!authCfg())return;$('sheetBody').innerHTML='<b>אימות דו־שלבי</b><small class="m">טוען...</small>';$('sheet').hidden=false;
  var u=await aFetch('/auth/v1/user','GET',null,s.access_token);if(!u.ok){$('sheetBody').innerHTML='<b>אימות דו־שלבי</b><small class="owe">'+esc(aErr(u))+'</small><button class="ghost" onclick="closeS()">סגירה</button>';return}
  var fid=mfaFid(u.data);
  if(fid){$('sheetBody').innerHTML='<b>אימות דו־שלבי פעיל ✅</b><small class="m">בכל כניסה תתבקש להזין קוד מאפליקציית האימות, בנוסף לסיסמה.</small><label for="mfC">כדי לכבות, הזן קוד נוכחי</label><input id="mfC" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr"><div id="mfE" class="owe"></div><button class="ghost" onclick="mfaOff(\''+fid+'\')">כיבוי אימות דו־שלבי</button><button class="ghost" onclick="closeS()">סגירה</button>';return}
  /* remove abandoned (unverified) factors, then enrol a new one */
  var old=mfaList(u.data).filter(function(f){return f.status!=='verified'});for(var i=0;i<old.length;i++)await aFetch('/auth/v1/factors/'+old[i].id,'DELETE',null,s.access_token);
  var e=await aFetch('/auth/v1/factors','POST',{factor_type:'totp',friendly_name:'Easy Record '+Date.now()},s.access_token);
  if(!e.ok||!e.data.totp){$('sheetBody').innerHTML='<b>אימות דו־שלבי</b><small class="owe">לא ניתן להפעיל כרגע. '+esc(aErr(e))+'</small><button class="ghost" onclick="closeS()">סגירה</button>';return}
  var qr=String(e.data.totp.qr_code||''),img=/^data:image\/svg\+xml/.test(qr)?'<img alt="קוד QR" style="width:200px;height:200px;background:#fff;border-radius:12px;padding:8px;align-self:center" src="'+qa(qr.replace(/^data:image\/svg\+xml;utf-?8,/,'data:image/svg+xml,').replace(/#/g,'%23'))+'">':'';
  $('sheetBody').innerHTML='<b>הפעלת אימות דו־שלבי</b><small class="m">1. התקן אפליקציית אימות (Google Authenticator, Microsoft Authenticator, Authy וכו׳).<br>2. סרוק את הקוד, או הזן ידנית את המפתח.<br>3. הזן את 6 הספרות שהאפליקציה מציגה.</small>'+img+'<small class="m" dir="ltr" style="word-break:break-all;user-select:all">'+esc(e.data.totp.secret||'')+'</small><label for="mfC">קוד מהאפליקציה</label><input id="mfC" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr"><div id="mfE" class="owe"></div><button onclick="mfaOn(\''+e.data.id+'\')">אישור והפעלה</button><button class="ghost" onclick="closeS()">ביטול</button><small class="m">שמור את המפתח במקום בטוח. אם תאבד את הטלפון בלי גיבוי של אפליקציית האימות, לא תוכל להיכנס לחשבון.</small>'}
async function mfaOn(fid){var s=aGet(),code=($('mfC').value||'').replace(/\D/g,'');if(code.length!==6){$('mfE').textContent='הזן 6 ספרות';return}var r=await mfaVerify(fid,code,s.access_token);
  if(!r.ok||!r.data.access_token){$('mfE').textContent=r.net?aErr(r):'הקוד שגוי. ודא שהשעון בטלפון מדויק ונסה שוב.';return}var ns=aSess(r.data)||{};if(!ns.user||!ns.user.id)ns.user=s.user;if(!ns.refresh_token)ns.refresh_token=s.refresh_token;aSet(ns);closeS();renderAcct();info('אימות דו־שלבי הופעל. מהכניסה הבאה תתבקש להזין קוד.')}
async function mfaOff(fid){var s=aGet(),code=($('mfC').value||'').replace(/\D/g,'');if(code.length!==6){$('mfE').textContent='הזן קוד נוכחי בן 6 ספרות';return}var v=await mfaVerify(fid,code,s.access_token);
  if(!v.ok||!v.data.access_token){$('mfE').textContent=v.net?aErr(v):'הקוד שגוי.';return}var ns=aSess(v.data)||{};if(!ns.user||!ns.user.id)ns.user=s.user;if(!ns.refresh_token)ns.refresh_token=s.refresh_token;aSet(ns);
  var r=await aFetch('/auth/v1/factors/'+fid,'DELETE',null,ns.access_token);if(!r.ok){$('mfE').textContent=aErr(r);return}closeS();renderAcct();info('אימות דו־שלבי כובה.')}
