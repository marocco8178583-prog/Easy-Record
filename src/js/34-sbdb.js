/* Supabase (PostgREST) adapter that implements the tiny document-db interface used by the sync engine (collection().get/onSnapshot, doc().get/set/onSnapshot).
   Records live in public.records (see cloud/supabase/schema.sql); the whole sync document is stored in `data`, with ver/deleted mirrored in columns. Polling (default 15s) instead of realtime. */
var SBDB=null;
function makeSbDb(){
  var TY={ws_e:'entry',ws_p:'payment',ws_c:'client',ws_t:'session',ws_d:'debt',ws_x:'expense',ws_j:'project',ws_k:'task'},timers=[],base=CFG.supabaseUrl.replace(/\/$/,''),pollMs=+CFG.pollMs||15000;
  async function refresh(oldTok){return aRefresh(oldTok)}  /* shared single-flight renewal (32-auth.js) */
  async function req(method,path,body,extra){var s=aGet();if(!s)throw new Error('נדרשת כניסה לחשבון');
    function once(tok){return fetch(base+path,{method:method,headers:Object.assign({'Content-Type':'application/json',apikey:CFG.supabaseAnonKey,Authorization:'Bearer '+tok},extra||{}),body:body==null?undefined:(body instanceof Blob?body:JSON.stringify(body))})}
    var r=await once(s.access_token);if(r.status===401){var ns=await refresh(s.access_token);if(!ns)throw new Error('נדרשת כניסה מחדש');r=await once(ns.access_token)}
    if(!r.ok){var t='';try{t=await r.text()}catch(e){}var m=/version_conflict/.test(t)?'version_conflict':'שגיאת שרת '+r.status+(t?': '+t.replace(/[<>]/g,'').slice(0,400):'');throw new Error(m)}return r}
  async function rows(q){var out=[],off=0,page=1000;for(;;){var r=await req('GET','/rest/v1/records?select=id,type,data,updated_at&'+q+'&order=updated_at.asc,id.asc&limit='+page+'&offset='+off),a=await r.json();out=out.concat(a);if(a.length<page)break;off+=page}return out}
  function split(path){var i=path.indexOf('/');return [path.slice(0,i),path.slice(i+1)]}
  function typeOf(c){return TY[c]||'setting'}
  function snapOf(list,first){return {metadata:{fromCache:false,hasPendingWrites:false},docChanges:function(){return list.map(function(x){return {type:'added',doc:{id:x.id,data:function(){return x.data}}}})}}}
  var stopped=false;function loop(fn){var busy=false,run=async function(){if(busy||stopped)return;busy=true;try{await fn()}catch(e){}busy=false};run();timers.push(setInterval(run,pollMs));window.addEventListener('online',run);document.addEventListener('visibilitychange',function(){if(!document.hidden)run()})}
  return {
    collection:function(name){return {
      get:async function(){var a=await rows('type=eq.'+typeOf(name));return {empty:!a.length,docs:a.map(function(x){return {id:x.id,data:function(){return x.data}}})}},
      onSnapshot:function(cb,eb){var since=null,first=true;loop(async function(){try{var a=await rows('type=eq.'+typeOf(name)+(since?'&updated_at=gte.'+encodeURIComponent(since):''));
          if(a.length)since=a[a.length-1].updated_at;if(a.length||first){first=false;cb(snapOf(a))}}catch(e){if(eb)eb(e)}})}}},
    doc:function(path){var p=split(path),c=p[0],id=p[1];return {
      get:async function(){var a=await rows('id=eq.'+encodeURIComponent(id)+'&type=eq.'+typeOf(c));return {exists:a.length>0,data:function(){return a[0]&&a[0].data}}},
      set:async function(doc){var s=aGet();await req('POST','/rest/v1/records?on_conflict=user_id,id',{user_id:s.user.id,id:id,type:typeOf(c),ver:doc.v,deleted:!!doc.d,data:doc,device_id:devId()},{Prefer:'resolution=merge-duplicates,return=minimal'})},
      onSnapshot:function(cb,eb){var last=null,first=true;loop(async function(){try{var a=await rows('id=eq.'+encodeURIComponent(id)+'&type=eq.'+typeOf(c)),u=a[0]&&a[0].updated_at;
          if(first||u!==last){first=false;last=u;cb({metadata:{fromCache:false},exists:a.length>0,data:function(){return a[0]&&a[0].data}})}}catch(e){if(eb)eb(e)}})}}},
    req:req,
    stop:function(){stopped=true;timers.forEach(clearInterval);timers=[]}}}
async function initSb(){var s=aGet();if(!s||!authCfg())return;if(owner()!==s.user.id)return; /* never sync data that belongs to another owner */
  function go(){if(SBDB)SBDB.stop();SBDB=makeSbDb();CDB=SBDB;RO=false;CONF=false;try{localStorage.setItem('er-sync-uid',s.user.id)}catch(e){}renderStatus();unreach=setTimeout(function(){if(!CONF){SYNC.st='unreach';renderStatus()}},10000);subscribe();syncSoon(200);renderStatus();RCS.since=null;RCS.last=0;RCS.setup=true;rcSoon(1500)}
  var last=null;try{last=localStorage.getItem('er-sync-uid')}catch(e){}
  if(last&&last!==s.user.id&&(S.entries.length||S.clients.length||S.pays.length)){cf('המכשיר הזה כבר סונכרן עם חשבון אחר. להמשיך ולהעלות את הנתונים שבמכשיר לחשבון הנוכחי? אם לא, אל תאשר ויצא מהחשבון.',go);return}
  go()}
function stopSb(){if(!SBDB)return;SBDB.stop();SBDB=null;CDB=null;renderStatus();if(window.claude&&claude.use)location.reload()}
