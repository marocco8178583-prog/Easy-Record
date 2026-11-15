/* ===== migration legacy -> v3 ===== */
function legacyToV3(o){var ents=(o.entries||[]).map(function(e){return JSON.parse(JSON.stringify(e))}),groups={},hostOf={},out=[],pays=[],idmap={},done={};
  ents.forEach(function(e){if(e.gid)(groups[e.gid]=groups[e.gid]||[]).push(e)});
  Object.keys(groups).forEach(function(g){var m=groups[g];if(m.length<2)return;
    if(!m.every(function(x){return x.cid===m[0].cid&&x.date===m[0].date&&x.rate===m[0].rate}))return;
    var h=m.find(function(x){return String(x.id)===g})||m.slice().sort(function(a,b){return a.id-b.id})[0];m.forEach(function(x){hostOf[x.id]=h})});
  var DROP={paid:1,method:1,pdate:1,gid:1,client:1,phone:1,_h:1,ver:1,bv:1,up:1,cr:1};
  ents.forEach(function(e){var h=hostOf[e.id]||e;if(done[h.id])return;done[h.id]=1;var mem=hostOf[e.id]?ents.filter(function(x){return hostOf[x.id]===h}):[e],w={};
    Object.keys(h).forEach(function(k){if(!DROP[k])w[k]=h[k]});
    if(mem.length>1){w.days=r2(mem.reduce(function(s,x){return s+(+x.days||0)},0));w.amount=r2(mem.reduce(function(s,x){return s+(+x.amount||0)},0))}else w.amount=r2(w.amount);
    w.legacy={paid:!!h.paid,method:h.method||'',pdate:h.pdate||'',gid:h.gid||null};
    if(mem.length>1)w.legacy.merged=mem.filter(function(x){return x!==h}).map(function(x){return JSON.parse(JSON.stringify(x))});
    mem.forEach(function(x){if(x!==h)idmap[x.id]=h.id;if(x.paid)pays.push({id:-x.id,cid:h.cid,date:x.pdate||x.date,amount:r2(x.amount),method:x.method||'כללי',note:x===h?'':'תשלום חלקי (הומר)',alloc:[{eid:h.id,amt:r2(x.amount)}]})});
    out.push(w)});
  return {entries:out,pays:pays,idmap:idmap}}
function validateMig(o,r){var A=function(a,k){return r2(a.reduce(function(s,x){return s+(+x[k]||0)},0))},ents=o.entries||[],oldAmt=A(ents,'amount'),oldPaid=r2(ents.filter(function(e){return e.paid}).reduce(function(s,e){return s+(+e.amount||0)},0)),
    nAmt=A(r.entries,'amount'),nPaid=A(r.pays,'amount');
  if(Math.abs(oldAmt-nAmt)>0.01)return {ok:false,msg:'סכום העבודה לא תואם ('+oldAmt+' מול '+nAmt+')'};
  if(Math.abs(oldPaid-nPaid)>0.01)return {ok:false,msg:'סכום התשלומים לא תואם ('+oldPaid+' מול '+nPaid+')'};
  var ids={};r.entries.forEach(function(e){ids[e.id]=1});
  for(var i=0;i<ents.length;i++){var id=ents[i].id;if(!ids[id]&&!r.idmap[id])return {ok:false,msg:'רישום '+id+' אבד בהמרה'}}
  var cl={};ents.forEach(function(e){cl[e.cid]=r2((cl[e.cid]||0)+(+e.amount||0))});var cn={};r.entries.forEach(function(e){cn[e.cid]=r2((cn[e.cid]||0)+(+e.amount||0))});
  for(var k in cl)if(Math.abs(cl[k]-(cn[k]||0))>0.01)return {ok:false,msg:'סכום ללקוח '+k+' לא תואם'};
  return {ok:true,oldAmt:oldAmt,oldPaid:oldPaid,count:ents.length,merged:Object.keys(r.idmap).length}}
function bootMigrate(){sanitizeState(S);S.pays=S.pays||[];S.sessions=S.sessions||[];S.debts=S.debts||[];S.expenses=S.expenses||[];S.projects=S.projects||[];S.tasks=S.tasks||[];S.tomb=S.tomb||{};S.conf=S.conf||{};if(S.schema===SCHEMA)return;
  try{var raw=localStorage.getItem(LEGACY_KEY);if(raw&&!localStorage.getItem('er4-premig-backup'))localStorage.setItem('er4-premig-backup',raw)}catch(e){}
  var old=JSON.parse(JSON.stringify(S));
  try{var r=legacyToV3(S),v=validateMig(S,r);if(!v.ok)throw new Error(v.msg);
    S.entries=r.entries;S.pays=r.pays;S.schema=SCHEMA;S.migratedAt=Date.now();S.migStats=v;
    if(Object.keys(r.idmap).length){try{localStorage.setItem('er4-rmap',JSON.stringify(r.idmap))}catch(e){}}
    derive();stamp();persist()}
  catch(e){NOSAVE=true;MIGERR=e.message;S=old;S.pays=[];S.sessions=[];S.debts=[];S.expenses=[];S.projects=[];S.tasks=[];S.tomb={};S.conf={};
    setTimeout(function(){info('⚠️ המיגרציה נכשלה ('+MIGERR+'). הנתונים הישנים נשארו שמורים ולא שונו. אל תשתמש באפליקציה ופנה לתמיכה.')},500)}}
function remapReceipts(map){if(!map||!R)return;R.forEach(function(r){if(map[r.eid]){r.eid=map[r.eid];if(DB)tx('readwrite',function(s){return s.put(r)})}})}
function applyRmap(){try{var m=JSON.parse(localStorage.getItem('er4-rmap')||'null');if(m){remapReceipts(m);localStorage.removeItem('er4-rmap')}}catch(e){}}
function dlPremig(){var raw=null;try{raw=localStorage.getItem('er4-premig-backup')}catch(e){}if(!raw)return info('לא נמצא גיבוי של הנתונים לפני המיגרציה (כנראה לא הייתה צורך במיגרציה).');dl('easy-record-before-migration.json',new Blob([raw],{type:'application/json'}))}
function rollbackLegacy(){var raw=null;try{raw=localStorage.getItem('er4-premig-backup')}catch(e){}if(!raw)return info('לא נמצא גיבוי של הנתונים לפני המיגרציה.');try{impPrepare(normalizeImport(JSON.parse(raw)),'הנתונים לפני המיגרציה')}catch(e){info('הקריאה נכשלה: '+e.message)}}
