/* Connected apps (Find Medic). Server: cloud/supabase/functions/findmedic (+ migrations/009_findmedic.sql).
   1. Find Medic sends the user to .../findmedic/oauth/authorize, which redirects here with ?fm_client&fm_redirect&fm_cc&fm_state.
   2. After sign-in this module shows a consent sheet. "Approve" asks the function for a one-time code and goes back to Find Medic.
   3. The account card lists connected apps with "disconnect".
   Find Medic can only add / update / remove the work days it created. It never sees any other data. Only the user's own token is sent. */
var FMA={names:{'find-medic':'Find Medic'},req:null,shown:false,links:null,busy:false};
function fmBase(){return String(CFG.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/findmedic'}
(function(){try{var q=new URLSearchParams(location.search);
  if(q.get('fm_client')){FMA.req={client_id:q.get('fm_client'),redirect_uri:q.get('fm_redirect')||'',code_challenge:q.get('fm_cc')||'',state:q.get('fm_state')||''};
    sessionStorage.setItem('er-fm-req',JSON.stringify(FMA.req));history.replaceState(null,'',location.pathname+location.hash)}
  else{var s=sessionStorage.getItem('er-fm-req');if(s)FMA.req=JSON.parse(s)}}catch(e){}})();
async function fmTok(){var s=aGet();if(!s||!s.access_token)return null;
  if(s.expires_at<Date.now()+60000&&s.refresh_token){var r=await aFetch('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:s.refresh_token});var ns=r.ok&&aSess(r.data);if(ns){ns.user=s.user;aSet(ns);s=ns}}
  return s.access_token}
async function fmCall(method,path,body){var t=await fmTok();if(!t)throw new Error('נדרשת כניסה לחשבון');
  var r=await fetch(fmBase()+path,{method:method,headers:{'Content-Type':'application/json',apikey:CFG.supabaseAnonKey,Authorization:'Bearer '+t},body:body?JSON.stringify(body):undefined});
  var d={};try{d=await r.json()}catch(e){}if(!r.ok)throw new Error(d.error||('שגיאת שרת '+r.status));return d}
function fmClear(){FMA.req=null;try{sessionStorage.removeItem('er-fm-req')}catch(e){}}
/* consent: only once signed in and the sign-in screen is closed */
function fmMaybeConsent(){if(!FMA.req||FMA.shown||!authCfg())return;var s=aGet(),g=$('gate');if(!s||!s.user||(g&&!g.hidden)||PENDS)return;
  var sh=$('sheet');if(sh&&!sh.hidden)return;FMA.shown=true;var nm=FMA.names[FMA.req.client_id];
  if(!nm||!/^https:\/\//.test(FMA.req.redirect_uri)){fmClear();info('בקשת החיבור לא תקינה. אפשר לנסות שוב מתוך Find Medic.');return}
  $('sheetBody').innerHTML='<b>חיבור '+esc(nm)+' ל-Easy Record</b>'+
    '<small class="m" style="display:block;line-height:1.7">'+esc(nm)+' מבקשת להוסיף ליומן שלך משמרות שאישרת שם, כימי עבודה: תאריך, שעות, שם המעסיק והסכום, לפי מה שבחרת לשתף ב-'+esc(nm)+'. שינוי מועד יעדכן את יום העבודה, וביטול יסיר אותו.<br><b>'+esc(nm)+' לא תוכל לראות, לשנות או למחוק שום נתון אחר שלך.</b> אפשר לנתק בכל רגע בהגדרות > החשבון שלי.</small>'+
    '<small class="m" style="display:block">החשבון: '+esc(s.user.email||s.user.phone||'')+'</small>'+
    '<button id="fmOk" onclick="fmDecide(true)">אישור החיבור</button><button class="ghost" id="fmNo" onclick="fmDecide(false)">ביטול</button>';
  $('sheet').hidden=false}
async function fmDecide(ok){if(FMA.busy||!FMA.req)return;FMA.busy=true;[].forEach.call(document.querySelectorAll('#fmOk,#fmNo'),function(b){b.disabled=true});
  try{var d=await fmCall('POST',ok?'/oauth/approve':'/oauth/deny',FMA.req);fmClear();
    if(d.redirect&&/^https:\/\//.test(d.redirect)){location.href=d.redirect;return}throw new Error('תשובה לא צפויה מהשרת')}
  catch(e){FMA.busy=false;fmClear();info('החיבור נכשל: '+((e&&e.message)||e)+'. אפשר לנסות שוב מתוך Find Medic.')}}
setInterval(fmMaybeConsent,700);
/* connected apps in the account card */
async function fmLoadLinks(){if(!authCfg()||!aGet())return;try{var d=await fmCall('GET','/links');FMA.links=d.links||[]}catch(e){FMA.links=null}fmRenderLinks()}
function fmRenderLinks(){var b=$('fmLinks');if(!b)return;var l=FMA.links;
  if(!l||!l.length){b.innerHTML='';b.hidden=true;return}b.hidden=false;
  b.innerHTML='<b style="display:block;margin-top:10px">אפליקציות מחוברות</b>'+l.map(function(x){return '<div class="acts" style="align-items:center"><span style="flex:1">'+esc(x.name)+'<small class="m" style="display:block">מוסיפה ימי עבודה ממשמרות שאושרו · חוברה '+esc(new Date(x.created_at).toLocaleDateString('he-IL'))+'</small></span><button class="ghost" onclick="fmRevoke(\''+esc(x.id)+'\')">ניתוק</button></div>'}).join('')}
function fmRevoke(id){var x=(FMA.links||[]).find(function(l){return l.id===id});
  $('sheetBody').innerHTML='<b>לנתק את '+esc(x?x.name:'האפליקציה')+'?</b><small class="m" style="display:block">היא לא תוכל להוסיף או לעדכן ימי עבודה. ימי עבודה שכבר נוספו נשארים ביומן.</small><button onclick="fmRevokeGo(\''+esc(id)+'\')">ניתוק</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
async function fmRevokeGo(id){closeS();try{await fmCall('POST','/links/revoke',{id:id});info('החיבור נותק.')}catch(e){info('הניתוק נכשל: '+((e&&e.message)||e))}fmLoadLinks()}
/* called by renderAcct: draw the cached list right away, refresh it at most once a minute */
function fmAcct(){fmRenderLinks();if(!FMA.lastLoad||Date.now()-FMA.lastLoad>60000){FMA.lastLoad=Date.now();fmLoadLinks()}}
