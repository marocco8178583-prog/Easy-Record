var CDB=null,RO=false,pt=null;
/* ===== record-level cloud sync (shared db capability) ===== */
var SYNC={st:'idle',last:0,err:'',retry:0},RM={},CONF=false,syncing=false,again=false,unreach=null,arT=null,CN={e:'ws_e',p:'ws_p',c:'ws_c',t:'ws_t',d:'ws_d',x:'ws_x',j:'ws_j',k:'ws_k'},DEBTOFF=false,EXPOFF=false,PROJOFF=false,TASKOFF=false;
function setSyn(){renderStatus()}
function pendCount(){var n=0,cf=S.conf||{};[['e',S.entries],['p',S.pays],['c',S.clients],['t',S.sessions]].concat(DEBTOFF?[]:[['d',S.debts||[]]]).concat(EXPOFF?[]:[['x',S.expenses||[]]]).concat(PROJOFF?[]:[['j',S.projects||[]]]).concat(TASKOFF?[]:[['k',S.tasks||[]]]).forEach(function(x){x[1].forEach(function(r){if(r.ver>r.bv&&!cf[kf(x[0],r.id)])n++})});Object.keys(S.tomb||{}).forEach(function(k){var t=S.tomb[k];if(t.ver>t.bv&&!cf[k])n++});if(S.sv&&S.sv.ver>S.sv.bv)n++;return n}
function renderStatus(){var s=$('syn');if(!S||!S.conf)return;var p=pendCount(),nc=Object.keys(S.conf).length,
  loc=LOC==='ok'?'💾 נשמר מקומית':LOC==='saving'?'💾 שומר...':LOC==='ls'?'💾 נשמר (דפדפן בלבד)':LOC==='err'?'⚠️ שגיאת שמירה מקומית':'',cl;
  if(NOSAVE)cl='⛔ המיגרציה נכשלה, לא נשמר דבר';else if(!CDB)cl='מקומי בלבד (ללא ענן)';else if(RO)cl='👁 צפייה בלבד';else if(nc)cl='⚠️ '+nc+' התנגשויות';
  else if(navigator.onLine===false)cl='📴 אין חיבור · '+p+' ממתינים';else if(SYNC.st==='err')cl='⚠️ הסנכרון נכשל · '+p+' ממתינים';else if(SYNC.st==='unreach'&&!CONF)cl='⚠️ אין תשובה מהשרת. הנתונים אולי לא עדכניים';
  else if(SYNC.st==='sync')cl='🔄 מסנכרן...';else if(p)cl='⏳ ממתין לסנכרון ('+p+')';else if(!CONF)cl='⏳ מתחבר לענן...';else cl='☁️ מסונכרן';
  if(s)s.innerHTML=(loc?loc+'<br>':'')+cl;
  var si=$('synInfo');if(si)si.innerHTML='מצב: <b>'+cl+'</b><br>'+(loc||'')+'<br>סנכרון מוצלח אחרון: '+(SYNC.last?new Date(SYNC.last).toLocaleString('he-IL'):'עדיין לא בוצע')+'<br>שינויים ממתינים: '+p+' · התנגשויות: '+nc+(SYNC.err?'<br>שגיאה אחרונה: '+esc(String(SYNC.err).slice(0,160)):'')+'<br>מזהה מכשיר: '+esc(devId())+(typeof rcStatus==='function'?'<br>'+rcStatus():'')+(DEBTOFF?'<br>החובות שלי: נשמרים במכשיר בלבד. לסנכרון יש להריץ ב-Supabase את 004_debts.sql.':'')+(EXPOFF?'<br>הוצאות: נשמרות במכשיר בלבד. לסנכרון יש להריץ ב-Supabase את 005_expenses.sql.':'')+(PROJOFF?'<br>פרויקטים: נשמרים במכשיר בלבד. לסנכרון יש להריץ ב-Supabase את 006_projects.sql.':'')+(TASKOFF?'<br>משימות ותזכורות: נשמרות במכשיר בלבד. לסנכרון יש להריץ ב-Supabase את 007_tasks_voice.sql.':'')}
function renderCfb(){var n=Object.keys((S&&S.conf)||{}).length,b=$('cfb');if(!b)return;b.hidden=!n;b.textContent=n?'⚠️ '+n+' התנגשויות סנכרון. לחץ כדי לבחור איזו גרסה לשמור.':''}
function setRec(t,id,rd){var arr=arrOf(t),i=arr.findIndex(function(x){return x.id===id}),r=Object.assign({},rd.data||{},{id:id,cr:rd.cr,up:rd.u,ver:rd.v,bv:rd.v});r._h=hs(r);if(i>=0)arr[i]=r;else arr.push(r);delete S.tomb[kf(t,id)]}
function setTomb(t,id,rd){var arr=arrOf(t),i=arr.findIndex(function(x){return x.id===id});if(i>=0)arr.splice(i,1);S.tomb[kf(t,id)]={t:t,id:id,ver:rd.v,bv:rd.v,up:rd.u||0}}
function mkConf(k,t,id,loc,rd){S.conf[k]={t:t,id:id,l:loc,r:{d:!!rd.d,data:rd.d?null:JSON.parse(JSON.stringify(rd.data||{})),v:rd.v,u:rd.u,cr:rd.cr}}}
function reconcile(t,id,rd,unconf){var k=kf(t,id);
  if(RO){if(rd.d)setTomb(t,id,rd);else setRec(t,id,rd);return}
  var l=recOf(t,id),tb=S.tomb[k];
  if(l){if(rd.v<=l.bv)return;
    if(l.ver===l.bv){if(rd.d)setTomb(t,id,rd);else setRec(t,id,rd);return}
    if(!rd.d&&hs(rd.data)===l._h){if(!unconf){l.bv=l.ver=rd.v}return}
    if(unconf)return;
    mkConf(k,t,id,{d:false,data:cont(l),ver:l.ver},rd);return}
  if(tb){if(rd.v<=tb.bv)return;
    if(tb.ver===tb.bv){if(rd.d){tb.bv=tb.ver=rd.v}else setRec(t,id,rd);return}
    if(rd.d){if(!unconf){tb.bv=tb.ver=rd.v}return}
    if(unconf)return;mkConf(k,t,id,{d:true,data:null,ver:tb.ver},rd);return}
  if(rd.d)S.tomb[k]={t:t,id:id,ver:rd.v,bv:rd.v,up:rd.u||0};else setRec(t,id,rd)}
function applySettings(rd){SETK.forEach(function(k){if(rd.data&&rd.data[k]!==undefined)S[k]=rd.data[k]});S.sv={ver:rd.v,bv:rd.v,up:rd.u||0,_h:hsS(stab(setCont()))}}
function reconcileSettings(rd){if(RO){applySettings(rd);return}if(!S.sv){if(rd.v>0)applySettings(rd);return}if(rd.v<=S.sv.bv)return;if(S.sv.ver===S.sv.bv||(rd.u||0)>S.sv.up)applySettings(rd)}
function rebuildRO(){S.entries=[];S.pays=[];S.sessions=[];S.clients=[];S.debts=[];S.expenses=[];S.projects=[];S.tasks=[];S.tomb={};Object.keys(RM).forEach(function(k){var rd=RM[k];if(rd&&!rd.d)setRec(rd.t,rd.id,rd)});derive();persist();render()}
function afterRemote(){clearTimeout(arT);arT=setTimeout(function(){derive();persist();setVals();render();if(!RO)syncSoon(400)},150)}
function subscribe(){['e','p','c','t','d','x','j','k'].forEach(function(t){CDB.collection(CN[t]).onSnapshot(function(snap){var un=!!(snap.metadata&&(snap.metadata.fromCache||snap.metadata.hasPendingWrites));if(snap.metadata&&!snap.metadata.fromCache){CONF=true;clearTimeout(unreach)}
    var ch=snap.docChanges();ch.forEach(function(c){if(c.type==='removed')return;var rd=c.doc.data();if(!rd||!rd.t)return;RM[c.doc.id]=rd;reconcile(rd.t,rd.id,rd,un)});if(ch.length||CONF)afterRemote()},
    function(err){SYNC.st='err';SYNC.err=(err&&(err.message||err.code))||'שגיאת מנוי';renderStatus()})});
  CDB.doc('ws_s/main').onSnapshot(function(snap){if(snap.metadata&&!snap.metadata.fromCache){CONF=true;clearTimeout(unreach)}if(snap.exists)reconcileSettings(snap.data());afterRemote()},function(){})}
async function pushAll(){var items=[],fail=0,n=0,cf=S.conf;
  [['c',S.clients],['e',S.entries],['p',S.pays],['t',S.sessions]].concat(DEBTOFF?[]:[['d',S.debts||[]]]).concat(EXPOFF?[]:[['x',S.expenses||[]]]).concat(PROJOFF?[]:[['j',S.projects||[]]]).concat(TASKOFF?[]:[['k',S.tasks||[]]]).forEach(function(x){x[1].forEach(function(r){if(r.ver>r.bv&&!cf[kf(x[0],r.id)])items.push({t:x[0],id:r.id,r:r,d:false})})});
  Object.keys(S.tomb).forEach(function(k){var tb=S.tomb[k];if((DEBTOFF&&tb.t==='d')||(EXPOFF&&tb.t==='x')||(PROJOFF&&tb.t==='j')||(TASKOFF&&tb.t==='k'))return;if(tb.ver>tb.bv&&!cf[k])items.push({t:tb.t,id:tb.id,r:tb,d:true})});
  for(var i=0;i<items.length;i++){var it=items[i],k=kf(it.t,it.id);
    try{var ref=CDB.doc(CN[it.t]+'/'+k),cur=await ref.get();
      if(cur.exists){var rd=cur.data();RM[k]=rd;
        if(rd.v>it.r.bv){if((it.d&&rd.d)||(!it.d&&!rd.d&&hs(rd.data)===it.r._h)){it.r.bv=it.r.ver=rd.v;continue}
          mkConf(k,it.t,it.id,{d:it.d,data:it.d?null:cont(it.r),ver:it.r.ver},rd);continue}}
      var doc=it.d?{t:it.t,id:it.id,v:it.r.ver,u:it.r.up||Date.now(),d:true}:{t:it.t,id:it.id,v:it.r.ver,u:it.r.up,cr:it.r.cr||0,d:false,data:cont(it.r)};
      await ref.set(doc);it.r.bv=it.r.ver;RM[k]=doc;n++}
    catch(e){var em=(e&&(e.message||e.code))||String(e);if((it.t==='d'||it.t==='x'||it.t==='j'||it.t==='k')&&/records_type_check|check constraint|23514/i.test(em)){if(it.t==='d')DEBTOFF=true;else if(it.t==='x')EXPOFF=true;else if(it.t==='j')PROJOFF=true;else TASKOFF=true;continue}fail++;SYNC.err=em}}
  if(S.sv&&S.sv.ver>S.sv.bv){try{var sr=CDB.doc('ws_s/main'),sc=await sr.get(),srd=sc.exists?sc.data():null;
      if(srd&&srd.v>S.sv.bv&&(srd.u||0)>S.sv.up)applySettings(srd);
      else{var nv=Math.max(S.sv.ver,srd?srd.v+1:1);S.sv.ver=nv;await sr.set({v:nv,u:S.sv.up,data:setCont()});S.sv.bv=nv;n++}}
    catch(e){fail++;SYNC.err=(e&&(e.message||e.code))||String(e)}}
  return {fail:fail,n:n}}
function syncSoon(ms){if(!CDB||RO)return;clearTimeout(pt);pt=setTimeout(syncNow,ms==null?700:ms)}
async function syncNow(manual){if(!CDB){if(manual===true)info('הסנכרון לא זמין בסביבה הזו. הנתונים נשמרים מקומית בלבד.');return}
  if(RO){renderStatus();return}if(syncing){again=true;return}
  if(navigator.onLine===false){SYNC.st='off';renderStatus();if(manual===true)info('אין חיבור לאינטרנט. השינויים נשמרו מקומית וישודרו כשהחיבור יחזור.');return}
  syncing=true;SYNC.st='sync';renderStatus();var res;
  try{derive();stamp();res=await pushAll();SYNC.st=res.fail?'err':'ok';if(!res.fail){SYNC.last=Date.now();SYNC.retry=0;SYNC.err=''}}catch(e){SYNC.st='err';SYNC.err=(e&&(e.message||e.code))||String(e)}
  syncing=false;persist();render();
  if(SYNC.st==='err'){SYNC.retry=Math.min(60000,(SYNC.retry||2000)*2);clearTimeout(pt);pt=setTimeout(syncNow,SYNC.retry);if(manual===true)info('הסנכרון נכשל: '+SYNC.err+'. השינויים נשמרו מקומית וינסו להישלח שוב אוטומטית.')}
  else if(again||pendCount()){again=false;syncSoon(300)}
  else if(manual===true&&!Object.keys(S.conf).length)info('הסנכרון הושלם.')}
window.addEventListener('online',function(){syncSoon(300)});window.addEventListener('offline',renderStatus);
setInterval(function(){if(CDB&&!RO&&pendCount()&&!syncing&&navigator.onLine!==false)syncSoon(100)},30000);
function describe(t,d){if(!d)return 'נמחק';if(t==='k')return 'משימה · '+esc(d.title||'')+(d.due?' · '+fmt(d.due):'');if(t==='j')return 'פרויקט · '+esc(d.name||'')+(d.rate?' · '+nis(d.rate)+' ליום':'');if(t==='x')return 'הוצאה · '+esc(d.cat||'')+' · '+nis(d.amount)+' · '+fmt(d.date);if(t==='d')return 'חוב שלי ל'+esc(d.name||'')+' · '+nis(d.amount)+' · '+fmt(d.date);if(t==='e')return fmt(d.date)+' · '+d.days+' ימים · '+nis(d.amount)+(d.note?' · '+esc(d.note):'');if(t==='t')return 'שעון: '+lt(d.t0)+(d.t1?'–'+lt(d.t1):' (פעיל)')+' · '+fmt(ds(new Date(d.t0)));if(t==='p')return fmt(d.date)+' · תשלום '+nis(d.amount)+' · '+esc(d.method||'');return esc(d.name||'')+(d.phone?' · '+esc(d.phone):'')}
function showConf(){var ks=Object.keys(S.conf||{});if(!ks.length){if($('sheet').hidden)info('אין התנגשויות סנכרון');else closeS();return}
  $('sheetBody').innerHTML='<b>התנגשויות סנכרון ('+ks.length+')</b><small class="m">אותה רשומה נערכה בשני מכשירים. בחר איזו גרסה לשמור.</small>'+ks.slice(0,4).map(function(k){var c=S.conf[k],nm={e:'יום עבודה',p:'תשלום',c:'לקוח',t:'שעון עבודה',d:'חוב שלי',x:'הוצאה',j:'פרויקט',k:'משימה'}[c.t];
    return '<div class="card" style="margin:0"><b>'+nm+'</b><div style="font-size:14px">📱 במכשיר הזה: '+(c.l.d?'נמחק':describe(c.t,c.l.data))+'</div><div style="font-size:14px">☁️ בענן: '+(c.r.d?'נמחק':describe(c.t,c.r.data))+'</div><div class="acts"><button style="padding:8px 12px;font-size:14px" onclick="resolve(\''+k+'\',\'local\')">שמור את שלי</button><button class="ghost" style="padding:8px 12px;font-size:14px" onclick="resolve(\''+k+'\',\'remote\')">שמור את מהענן</button></div></div>'}).join('')+'<button class="ghost" onclick="closeS()">סגירה</button>';$('sheet').hidden=false}
function resolve(k,ch){var c=S.conf[k];if(!c)return;
  if(ch==='remote'){if(c.r.d)setTomb(c.t,c.id,{v:c.r.v,u:c.r.u});else setRec(c.t,c.id,{data:c.r.data,v:c.r.v,u:c.r.u,cr:c.r.cr})}
  else{var nv=Math.max(c.l.ver,c.r.v)+1;if(c.l.d){S.tomb[k]={t:c.t,id:c.id,ver:nv,bv:c.r.v,up:Date.now()};var a=arrOf(c.t),i=a.findIndex(function(x){return x.id===c.id});if(i>=0)a.splice(i,1)}
    else{var l=recOf(c.t,c.id);if(l){l.ver=nv;l.bv=c.r.v;l.up=Date.now()}else{var nr=Object.assign({},c.l.data,{ver:nv,bv:c.r.v,up:Date.now()});nr._h=hs(nr);arrOf(c.t).push(nr)}delete S.tomb[k]}}
  delete S.conf[k];derive();persist();render();syncSoon(200);if(Object.keys(S.conf).length)showConf();else closeS()}
async function importLegacyCloud(){var m=await CDB.doc('app/meta').get();if(!m.exists){try{localStorage.setItem('er4-cloud-v3','1')}catch(e){}return}
  var d=m.data(),q=await CDB.collection('entries').get(),en=[];q.docs.forEach(function(x){en=en.concat(((x.data()||{}).list)||[])});
  var n=normalizeImport(clean({rate:d.rate,od:d.od,cap:d.cap,capOn:d.capOn,fy:d.fy,cb:d.cb,clients:d.clients||[],entries:en}));
  bak(true);mergeInto(n,{skipTomb:true});derive();save();try{localStorage.setItem('er4-cloud-v3','1')}catch(e){}}
async function initDb(){try{if(authCfg()&&aGet()){await initSb();return}if(!window.claude||!claude.use)return;var d=await claude.use('db');if(!d)return;CDB=d;
  try{var u=await claude.use('user');if(u)RO=(await u.can('data.write'))===false}catch(e){}
  renderStatus();unreach=setTimeout(function(){if(!CONF){SYNC.st='unreach';renderStatus()}},10000);
  if(!RO){try{var empty=(await CDB.collection('ws_e').get()).empty&&(await CDB.collection('ws_c').get()).empty;if(empty&&!localStorage.getItem('er4-cloud-v3'))await importLegacyCloud()}catch(e){SYNC.err=(e&&(e.message||e.code))||String(e)}}
  subscribe();syncSoon(200);renderStatus()}catch(e){CDB=null;renderStatus()}}
$('sod').onchange=function(){S.od=+this.value||14;save();render()};
$('sco').onchange=function(){S.capOn=this.value!=='off';save();render()};
$('scap').onchange=function(){S.cap=+this.value||122833;save();render()};
$('sfy').onchange=function(){S.fy=+this.value||0;save();render()};
$('scb').onchange=function(){S.cb=this.value;save();render()};
