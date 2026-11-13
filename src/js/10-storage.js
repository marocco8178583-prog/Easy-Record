function save(){if(NOSAVE)return;try{derive();stamp()}catch(e){}persist();clearTimeout(bt);bt=setTimeout(bak,20000);if(!CDB)return;if(RO){rebuildRO();return}syncSoon()}
var DB=null,R=[],UP=null;
function copyOldReceipts(db){return new Promise(function(done){try{if(localStorage.getItem('er4-rcopied'))return done();
  var q=indexedDB.open('wd-'+'receipts'),created=false;q.onupgradeneeded=function(){created=true};
  q.onsuccess=function(){var od=q.result;if(created||!od.objectStoreNames.contains('r')){od.close();if(created){try{indexedDB.deleteDatabase('wd-'+'receipts')}catch(e){}}try{localStorage.setItem('er4-rcopied','1')}catch(e){}return done()}
    var g=od.transaction('r').objectStore('r').getAll();
    g.onsuccess=function(){var all=g.result||[],t=db.transaction('r','readwrite'),s=t.objectStore('r');all.forEach(function(r){s.put(r)});t.oncomplete=function(){od.close();try{localStorage.setItem('er4-rcopied','1')}catch(e){}done()};t.onerror=function(){od.close();done()}};g.onerror=function(){od.close();done()}};
  q.onerror=function(){done()}}catch(e){done()}})}
function idb(){return new Promise(function(ok,no){try{var q=indexedDB.open('er4-receipts',1);q.onupgradeneeded=function(){q.result.createObjectStore('r',{keyPath:'id'})};q.onsuccess=function(){ok(q.result)};q.onerror=function(){no()}}catch(e){no()}})}
function tx(m,fn){return new Promise(function(ok,no){var t=DB.transaction('r',m),r=fn(t.objectStore('r'));t.oncomplete=function(){ok(r&&r.result)};t.onerror=function(){no()}})}
idb().then(function(d){DB=d;return copyOldReceipts(d).then(function(){return tx('readonly',function(s){return s.getAll()})})}).then(function(a){var ow='guest';try{ow=localStorage.getItem('er-owner')||'guest'}catch(e){}R=(a||[]).filter(function(r){return !r.pf||r.pf===ow});applyRmap();render()}).catch(function(){DB=null});
try{navigator.storage.persist()}catch(e){}
/* ===== local persistence: localStorage + IndexedDB ===== */
var SDB=null,LOC='';
function sdbOpen(){return new Promise(function(ok,no){try{var q=indexedDB.open('er4-state',1);q.onupgradeneeded=function(){q.result.createObjectStore('k',{keyPath:'id'})};q.onsuccess=function(){ok(q.result)};q.onerror=function(){no(q.error)}}catch(e){no(e)}})}
function sput(k,v){return new Promise(function(ok,no){if(!SDB)return no('nodb');var t=SDB.transaction('k','readwrite');t.objectStore('k').put({id:k,v:v});t.oncomplete=ok;t.onerror=function(){no(t.error)}})}
function sget(k){return new Promise(function(ok,no){if(!SDB)return no('nodb');var r=SDB.transaction('k').objectStore('k').get(k);r.onsuccess=function(){ok(r.result&&r.result.v)};r.onerror=function(){no(r.error)}})}
var persistN=0;
function persist(){if(NOSAVE)return;var j=JSON.stringify(S),ts=Date.now(),lsOk=true,n=++persistN;
  try{localStorage.setItem(KEY,j);localStorage.setItem('er4-ts',String(ts))}catch(e){lsOk=false}
  LOC='saving';renderStatus();
  sput('main',{ts:ts,j:j}).then(function(){if(n===persistN){LOC='ok';renderStatus()}}).catch(function(){if(n===persistN){LOC=lsOk?'ls':'err';renderStatus()}})}
async function loadIdbState(){try{SDB=await sdbOpen();var v=await sget('main'),lt=+localStorage.getItem('er4-ts')||0;
    if(v&&v.j&&v.ts>lt+1){var o=JSON.parse(v.j);if(o&&o.entries&&o.schema===SCHEMA){S=o;S.pays=S.pays||[];S.sessions=S.sessions||[];S.debts=S.debts||[];S.expenses=S.expenses||[];S.projects=S.projects||[];S.tasks=S.tasks||[];S.tomb=S.tomb||{};S.conf=S.conf||{};setVals();render();applyTheme()}}
    else if(!v&&S.entries.length&&!NOSAVE)persist();else LOC='ok';renderStatus()}catch(e){LOC='ls';renderStatus()}}
