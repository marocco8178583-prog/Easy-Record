/* ---- backup ---- */

function exp(b){try{navigator.clipboard.writeText(JSON.stringify(expObj())).then(function(){b.textContent='הועתק'})}catch(e){b.textContent='ההעתקה נכשלה'}}
function expFile(){dl('easy-record-backup-'+today()+'.json',new Blob([JSON.stringify(expObj(),null,1)],{type:'application/json'}));try{localStorage.setItem('er4-lastexp',today())}catch(e){}rBak()}


function bakList(){try{return JSON.parse(localStorage.getItem('er4-bak'))||[]}catch(e){return []}}
function bak(manual){try{if(!S.entries.length&&!S.clients.length)return;var l=bakList(),t=today(),j=JSON.stringify(expObj());
  if(!manual){var i=l.findIndex(function(x){return x.d===t&&!x.m});if(i>=0)l.splice(i,1)}
  l.unshift({d:t,m:manual?1:0,ts:Date.now(),n:S.entries.length,j:j});l=l.slice(0,8);
  for(;;){try{localStorage.setItem('er4-bak',JSON.stringify(l));break}catch(e){if(l.length<=1)break;l.pop()}}}catch(e){}}
function rBak(){var l=bakList(),le='';try{le=localStorage.getItem('er4-lastexp')||''}catch(e){}
  $('bakInfo').textContent='הגיבוי כולל לקוחות, רישומים והגדרות. '+(le?'ייצוא קובץ אחרון: '+fmt(le)+'. ':'עדיין לא ייצאת קובץ גיבוי. ')+'הנתונים מסונכרנים גם בשרת. קבלות מצורפות לא נכללות.';
  $('baks').innerHTML=l.length?l.map(function(x,i){var d=new Date(x.ts);return '<div class="top" style="margin-top:8px"><small class="m">'+fmt(x.d)+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+(x.m?' · לפני שחזור':' · אוטומטי')+' · '+x.n+' רישומים</small><button class="ghost" style="padding:6px 12px;font-size:14px" onclick="rb('+i+')">שחזור</button></div>'}).join(''):'<small class="m">עדיין אין גיבויים. הם נוצרים אוטומטית כשיש נתונים.</small>'}

function expV3(){return {app:'easy-record',version:3,schema:3,appVersion:APP_VER,exportedAt:new Date().toISOString(),device:devId(),settings:setCont(),clients:S.clients.map(strip),entries:S.entries.map(strip),payments:S.pays.map(strip),sessions:S.sessions.map(strip),debts:(S.debts||[]).map(strip),expenses:(S.expenses||[]).map(strip),projects:(S.projects||[]).map(strip),tasks:(S.tasks||[]).map(strip),counts:{tasks:(S.tasks||[]).length,projects:(S.projects||[]).length,expenses:(S.expenses||[]).length,clients:S.clients.length,entries:S.entries.length,payments:S.pays.length,sessions:S.sessions.length,debts:(S.debts||[]).length}}}
function expObj(){return expV3()}
async function zipBlob(){if(!window.JSZip)throw new Error('רכיב ה-ZIP עוד לא נטען. נסה שוב בעוד רגע');
  var miss=await rcEnsureAll(R);if(miss)throw new Error(miss+' קבלות נמצאות רק בענן ולא ניתן להוריד אותן כרגע. התחבר לאינטרנט ונסה שוב כדי שהגיבוי יהיה מלא');
  var z=new JSZip(),idx=[],o=expV3();R.forEach(function(r){var fn='receipts/'+r.id+'_'+safe(r.name);z.file(fn,r.blob);idx.push({id:r.id,cid:r.cid,eid:r.eid,name:r.name,type:r.type,date:r.date,file:fn,size:r.blob.size})});
  o.receipts=idx;o.counts.receipts=idx.length;z.file('data.json',JSON.stringify(o,null,1));
  z.file('README.txt','Easy Record backup (schema 3, app '+APP_VER+')\r\ndata.json: clients, work days, payments, settings, receipts index\r\nreceipts/: receipt and image files\r\nNo passwords or tokens are stored in this file.\r\nImport via Settings > Backup > Import.\r\n');
  return z.generateAsync({type:'blob',compression:'DEFLATE'})}
async function expZip(){try{var b=await zipBlob();await dl('easy-record-backup-'+today()+'.zip',b);try{localStorage.setItem('er4-lastexp',today())}catch(e){}rBak()}catch(e){info(e.message)}}
function normalizeImport(o){if(!o||typeof o!=='object'||!Array.isArray(o.entries))throw new Error('הקובץ לא מזוהה כגיבוי של Easy Record');
  if(o.schema===3||o.version>=3){if(!Array.isArray(o.clients))o.clients=[];var pays=o.payments||o.pays||[];
    o.entries.forEach(function(e){if(e.id==null||!e.date||typeof e.amount!=='number')throw new Error('רישום עבודה לא תקין בגיבוי')});
    pays.forEach(function(p){if(p.id==null||!Array.isArray(p.alloc))throw new Error('תשלום לא תקין בגיבוי')});
    return {kind:'v3',clients:o.clients,entries:o.entries,pays:pays,sessions:Array.isArray(o.sessions)?o.sessions:[],debts:Array.isArray(o.debts)?o.debts.filter(function(d){return d&&d.id!=null&&typeof d.amount==='number'}):[],projects:Array.isArray(o.projects)?o.projects.filter(function(d){return d&&d.id!=null&&d.name}):[],tasks:Array.isArray(o.tasks)?o.tasks.filter(function(d){return d&&d.id!=null&&d.title}):[],expenses:Array.isArray(o.expenses)?o.expenses.filter(function(d){return d&&d.id!=null&&typeof d.amount==='number'&&d.date}):[],settings:o.settings||null,receipts:o.receipts||[],counts:o.counts||null,idmap:{},exportedAt:o.exportedAt||''}}
  var tmp={clients:JSON.parse(JSON.stringify(o.clients||[])),entries:JSON.parse(JSON.stringify(o.entries||[]))};ensureCids(tmp);
  tmp.entries.forEach(function(e){if(e.id==null||!e.date)throw new Error('רישום ישן לא תקין')});
  var r=legacyToV3(tmp),v=validateMig(tmp,r);if(!v.ok)throw new Error('המרת גיבוי ישן נכשלה: '+v.msg);
  var st={};SETK.forEach(function(k){if(o[k]!==undefined)st[k]=o[k]});
  return {kind:'legacy',clients:tmp.clients,entries:r.entries,pays:r.pays,sessions:[],debts:[],expenses:[],projects:[],tasks:[],settings:st,receipts:[],counts:null,idmap:r.idmap,exportedAt:o.exportedAt||'',stats:v}}
function diffImport(n){n.debts=n.debts||[];n.expenses=n.expenses||[];n.projects=n.projects||[];n.tasks=n.tasks||[];var out={};[['c','clients'],['e','entries'],['p','pays'],['t','sessions'],['d','debts'],['x','expenses'],['j','projects'],['k','tasks']].forEach(function(x){var t=x[0],a=n[x[1]],o={n:a.length,add:0,same:0,chg:0};a.forEach(function(r){var l=recOf(t,r.id);if(!l)o.add++;else if(stab(cont(l))===stab(cont(r)))o.same++;else o.chg++});out[t]=o});return out}
function mkNew(t,r){var k=kf(t,r.id),o=Object.assign({},cont(r),r.cr?{cr:r.cr}:{},r.up?{up:r.up}:{}),tb=S.tomb[k];if(tb){o.ver=tb.ver+1;o.bv=tb.ver;o.up=Date.now();o.cr=o.cr||Date.now();delete S.tomb[k]}return o}
function mergeInto(n,opt){opt=opt||{};n.debts=n.debts||[];n.expenses=n.expenses||[];n.projects=n.projects||[];n.tasks=n.tasks||[];var st={add:0,upd:0,same:0,keep:0,skip:0};
  [['c','clients'],['e','entries'],['p','pays'],['t','sessions'],['d','debts'],['x','expenses'],['j','projects'],['k','tasks']].forEach(function(x){var t=x[0];n[x[1]].forEach(function(r){var l=recOf(t,r.id),k=kf(t,r.id),arr=arrOf(t);
    if(!l){if(S.tomb[k]&&opt.skipTomb){st.skip++;return}arr.push(mkNew(t,r));st.add++}
    else if(stab(cont(l))===stab(cont(r)))st.same++;
    else if((r.up||0)>(l.up||0)){arr[arr.indexOf(l)]=Object.assign({},cont(r),{cr:l.cr,up:l.up,ver:l.ver,bv:l.bv,_h:l._h});st.upd++}
    else st.keep++})});
  if(n.settings&&!S.sv)SETK.forEach(function(k){if(n.settings[k]!==undefined)S[k]=n.settings[k]});
  if(n.idmap&&Object.keys(n.idmap).length)remapReceipts(n.idmap);return st}
function replaceWith(n){n.debts=n.debts||[];n.expenses=n.expenses||[];n.projects=n.projects||[];n.tasks=n.tasks||[];var st={add:0,upd:0,same:0,del:0};
  [['c','clients'],['e','entries'],['p','pays'],['t','sessions'],['d','debts'],['x','expenses'],['j','projects'],['k','tasks']].forEach(function(x){var t=x[0],ids={},arr=arrOf(t);n[x[1]].forEach(function(r){ids[r.id]=1});
    arr.slice().forEach(function(l){if(!ids[l.id]){tombAdd(t,l);arr.splice(arr.indexOf(l),1);st.del++}});
    n[x[1]].forEach(function(r){var l=recOf(t,r.id);if(!l){arr.push(mkNew(t,r));st.add++}else if(stab(cont(l))===stab(cont(r)))st.same++;else{arr[arr.indexOf(l)]=Object.assign({},cont(r),{cr:l.cr,up:l.up,ver:l.ver,bv:l.bv,_h:l._h});st.upd++}})});
  if(n.settings)SETK.forEach(function(k){if(n.settings[k]!==undefined)S[k]=n.settings[k]});
  if(n.idmap&&Object.keys(n.idmap).length)remapReceipts(n.idmap);return st}
async function restoreReceipts(n,zip,mode,added){var st={add:0,same:0,missing:0,keptLocal:0};if(!zip)return st;var list=n.receipts||[];if(!DB){st.missing=list.length;return st}
  var have={},inb={};R.forEach(function(r){have[r.id]=1});
  for(var i=0;i<list.length;i++){var x=list[i];inb[x.id]=1;if(have[x.id]){st.same++;continue}var fe=zip.file(x.file);if(!fe){st.missing++;continue}
    var raw=await fe.async('blob'),rec={id:x.id,cid:x.cid,eid:(n.idmap&&n.idmap[x.eid])||x.eid,name:x.name,type:x.type,date:x.date,blob:new Blob([raw],{type:x.type||'application/octet-stream'})};
    await tx('readwrite',function(s){return s.put(rec)});R.push(rec);if(added)added.push(rec.id);st.add++}
  R.forEach(function(r){if(!inb[r.id])st.keptLocal++});return st}
function integrity(){var out=[],ids={};S.entries.forEach(function(e){ids[e.id]=1});S.pays.forEach(function(p){(p.alloc||[]).forEach(function(a){if(!ids[a.eid])out.push('תשלום '+p.id+' מפנה ליום עבודה חסר')});var s=(p.alloc||[]).reduce(function(x,a){return x+a.amt},0);if(Math.abs(s-p.amount)>0.01)out.push('תשלום '+p.id+' לא מאוזן')});
  S.entries.forEach(function(e){if(!S.clients.some(function(c){return c.id===e.cid}))out.push('יום עבודה '+e.id+' בלי לקוח')});return out}
async function pwKey(pw,salt,use){var km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:200000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,[use])}
async function encBytes(buf,pw){var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await pwKey(pw,salt,'encrypt'),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,buf)),out=new Uint8Array(34+ct.length);
  out.set(new TextEncoder().encode('ERENC1'),0);out.set(salt,6);out.set(iv,22);out.set(ct,34);return out}
async function decBytes(u8,pw){if(u8.length<51||new TextDecoder().decode(u8.slice(0,6))!=='ERENC1')throw new Error('הקובץ אינו גיבוי מוצפן של Easy Record');
  try{var key=await pwKey(pw,u8.slice(6,22),'decrypt');return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:u8.slice(22,34)},key,u8.slice(34)))}catch(e){throw new Error('סיסמה שגויה או קובץ פגום')}}
var PWD=null;
function expEncAsk(){$('sheetBody').innerHTML='<b>גיבוי מוצפן בסיסמה</b><small class="m">הסיסמה לא נשמרת בשום מקום. אם תאבד אותה, אי אפשר לשחזר את הגיבוי. מינימום 8 תווים.</small><label for="ep1">סיסמה</label><input id="ep1" type="password" autocomplete="new-password"><label for="ep2">אימות סיסמה</label><input id="ep2" type="password" autocomplete="new-password"><div id="epe" class="owe"></div><button onclick="expEnc()">הורדת גיבוי מוצפן</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
async function expEnc(){var a=$('ep1').value,b=$('ep2').value;if(a.length<8){$('epe').textContent='הסיסמה קצרה מדי (מינימום 8 תווים)';return}if(a!==b){$('epe').textContent='הסיסמאות לא זהות';return}
  try{var blob=await zipBlob(),out=await encBytes(await blob.arrayBuffer(),a);closeS();await dl('easy-record-backup-'+today()+'-encrypted.zip',new Blob([out],{type:'application/zip'}));info('נוצר גיבוי מוצפן. הקובץ נקרא encrypted.zip אך אי אפשר לפתוח אותו כ-ZIP רגיל. נדרשת הסיסמה כדי לשחזר אותו באפליקציה.')}catch(e){$('epe').textContent='ההצפנה נכשלה: '+e.message}}
async function openBackup(u8,name,pw){var hd=new TextDecoder().decode(u8.slice(0,6));
  if(hd==='ERENC1'){if(!pw){askPw(u8,name);return}u8=await decBytes(u8,pw)}
  if(u8[0]===0x50&&u8[1]===0x4b){if(!window.JSZip)throw new Error('רכיב ה-ZIP עוד לא נטען. נסה שוב בעוד רגע');var z=await JSZip.loadAsync(u8),df=z.file('data.json');if(!df)throw new Error('ב-ZIP אין קובץ data.json');impPrepare(normalizeImport(clean(JSON.parse(await df.async('string')))),'ייבוא גיבוי ZIP',z)}
  else impPrepare(normalizeImport(clean(JSON.parse(new TextDecoder().decode(u8)))),'ייבוא גיבוי JSON')}
function askPw(u8,name){PWD={u8:u8,name:name};$('sheetBody').innerHTML='<b>גיבוי מוצפן</b><label for="pwi">סיסמה</label><input id="pwi" type="password" autocomplete="off"><div id="pwe" class="owe"></div><button onclick="goPw()">פתיחה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
async function goPw(){var D=PWD;try{await openBackup(D.u8,D.name,$('pwi').value)}catch(e){var el=$('pwe');if(el)el.textContent=e.message}}
var IMPD=null;
function impPrepare(n,label,zip){IMPD={n:n,zip:zip||null};var d=diffImport(n),L=function(t,w){var x=d[t];return '<div class="top"><small class="m">'+w+': '+x.n+' בגיבוי</small><small class="m">חדשים '+x.add+' · שונים '+x.chg+' · זהים '+x.same+'</small></div>'};
  var rc2=(n.receipts||[]).length,miss=zip?(n.receipts||[]).filter(function(x){return !zip.file(x.file)}).length:0,warn=[];
  if(n.counts&&n.counts.sessions!=null&&n.counts.sessions!==(n.sessions||[]).length)warn.push('מספר שעוני העבודה בקובץ לא תואם לסיכום שבו.');
  if(n.counts&&(n.counts.entries!==n.entries.length||n.counts.payments!==n.pays.length||n.counts.clients!==n.clients.length))warn.push('מספר הרשומות בקובץ לא תואם לסיכום שבו (ייתכן שהקובץ פגום).');
  if(miss)warn.push(miss+' קבצי קבלות חסרים בגיבוי.');
  var orph=n.pays.filter(function(p){return p.alloc.some(function(a){return !n.entries.some(function(e){return e.id===a.eid})&&!recOf('e',a.eid)})}).length;if(orph)warn.push(orph+' תשלומים מפנים לימי עבודה שלא קיימים.');
  $('sheetBody').innerHTML='<b>'+esc(label||'ייבוא גיבוי')+'</b><small class="m">'+(n.exportedAt?'יוצא ב-'+fmt(n.exportedAt.slice(0,10))+' · ':'')+(n.kind==='legacy'?'פורמט ישן (יומר אוטומטית)':'פורמט v3')+'</small>'+L('c','לקוחות')+L('e','ימי עבודה')+L('p','תשלומים')+(rc2?'<small class="m">קבלות: '+rc2+(miss?' (חסרות '+miss+')':'')+'</small>':'')+(warn.length?'<div class="owe" style="font-size:14px">⚠️ '+warn.map(esc).join('<br>⚠️ ')+'</div>':'')+
    '<button onclick="impGo(\'merge\')">🔀 מיזוג (מומלץ): מוסיף מה שחסר, לא מוחק</button><button class="ghost" style="border-color:var(--owe);color:var(--owe)" onclick="impGo(\'replace\')">♻️ החלפה מלאה: מוחק את הנתונים הקיימים</button><small class="m" style="font-size:12px">לפני כל ייבוא נוצר גיבוי אוטומטי של המצב הנוכחי.</small><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function impGo(mode){var D=IMPD;if(!D)return;if(mode==='replace'){cf('החלפה מלאה תמחק את כל הנתונים הקיימים ('+S.entries.length+' ימי עבודה, '+S.clients.length+' לקוחות) ותחליף אותם בגיבוי. המחיקה תסונכרן גם למכשירים אחרים. להמשיך?',function(){impRun(D,'replace')});return}impRun(D,'merge')}
async function impRun(D,mode){var snap=JSON.stringify(S),added=[];
  try{bak(true);var st=mode==='replace'?replaceWith(D.n):mergeInto(D.n),rs=await restoreReceipts(D.n,D.zip,mode,added);derive();save();render();setVals();applyTheme();var iss=integrity();
    info((mode==='replace'?'ההחלפה הושלמה. ':'המיזוג הושלם. ')+'נוספו '+st.add+' רשומות, עודכנו '+st.upd+', זהות '+st.same+(st.del?', נמחקו '+st.del:'')+'.'+(rs.add||rs.missing?' קבלות: נוספו '+rs.add+(rs.missing?', חסרות '+rs.missing:'')+'.':'')+(rs.keptLocal?' '+rs.keptLocal+' קבלות מקומיות שאינן בגיבוי נשמרו.':'')+(iss.length?' ⚠️ '+iss.length+' אזהרות תקינות.':''))}
  catch(e){try{var o=JSON.parse(snap);o.pays=o.pays||[];o.tomb=o.tomb||{};o.conf=o.conf||{};S=o;added.forEach(function(id){tx('readwrite',function(s){return s.delete(id)});R=R.filter(function(r){return r.id!==id})});derive();persist();render();setVals();applyTheme()}catch(e2){}
    info('הייבוא נכשל והנתונים הקודמים שוחזרו ללא שינוי: '+e.message)}IMPD=null}
function applyImp(t){try{impPrepare(normalizeImport(clean(JSON.parse(t))),'ייבוא מהדבקה')}catch(e){info('הגיבוי לא תקין: '+e.message)}}
function imp(){applyImp($('imp').value);$('imp').value=''}
$('jf').onchange=async function(){var fl=this.files[0];this.value='';if(!fl)return;try{await openBackup(new Uint8Array(await fl.arrayBuffer()),fl.name)}catch(e){info('הקובץ לא תקין: '+e.message)}};
function rb(i){var x=bakList()[i];if(!x)return;try{impPrepare(normalizeImport(clean(JSON.parse(x.j))),'שחזור מגיבוי אוטומטי מ-'+fmt(x.d))}catch(e){info('הגיבוי לא תקין: '+e.message)}}
setTimeout(bak,3000);

/* ===== safety net for upgrades: before a new app version first runs, keep a snapshot of the data as the previous version left it (last 2) ===== */
async function preUpSnap(){try{var last=localStorage.getItem('er-lastver');if(last===APP_VER)return;localStorage.setItem('er-lastver',APP_VER);if(!last)return;var raw=localStorage.getItem(KEY);if(!raw)return;
    if(!SDB)SDB=await sdbOpen();var idx=(await sget('preup-index'))||[];idx=idx.filter(function(x){return x.from!==last});idx.unshift({from:last,to:APP_VER,ts:Date.now(),owner:localStorage.getItem('er-owner')||'guest'});
    await sput('preup:'+last,{ts:Date.now(),j:raw});while(idx.length>2){var o=idx.pop();await sput('preup:'+o.from,null)}await sput('preup-index',idx)}catch(e){}}
async function preUpList(){try{if(!SDB)SDB=await sdbOpen();return (await sget('preup-index'))||[]}catch(e){return []}}
async function preUpRestore(from){try{if(!SDB)SDB=await sdbOpen();var v=await sget('preup:'+from);if(!v||!v.j)return info('לא נמצא עותק לשחזור');var o=JSON.parse(v.j);if(!o||!Array.isArray(o.entries))return info('העותק פגום ולא ניתן לשחזר ממנו');
    var n=normalizeImport(clean({version:3,schema:3,clients:o.clients||[],entries:o.entries||[],payments:o.pays||[],sessions:o.sessions||[],debts:o.debts||[],expenses:o.expenses||[],projects:o.projects||[],tasks:o.tasks||[],settings:null}));
    bak(true);var st=mergeInto(n,{});derive();save();render();info('שוחזר מהעותק שלפני השדרוג: '+st.add+' רשומות חזרו, '+st.keep+' נשארו בגרסה החדשה יותר, '+st.same+' זהות. נוצר גם גיבוי אוטומטי של המצב שלפני השחזור.')}catch(e){info('השחזור נכשל: '+(e&&e.message||e))}}
async function preUpUI(){var l=await preUpList(),b=$('preUp');if(!b)return;b.innerHTML=l.length?l.map(function(x){return '<div class="top" style="margin-top:6px"><small class="m">לפני השדרוג מ-'+esc(x.from)+' ל-'+esc(x.to)+' · '+new Date(x.ts).toLocaleString(LOCALE)+'</small><button class="ghost" style="padding:6px 12px;font-size:14px;min-height:36px" onclick="preUpAsk(\''+qa(x.from)+'\')">שחזור</button></div>'}).join(''):'<small class="m">עדיין אין עותקים. עותק נשמר אוטומטית בכל פעם שהאפליקציה מתעדכנת לגרסה חדשה.</small>'}
function preUpAsk(from){cf('לשחזר את הנתונים כפי שהיו לפני השדרוג מגרסה '+from+'? רשומות שנמחקו או השתנו מאז יחזרו; רשומות חדשות יותר לא יימחקו.',function(){preUpRestore(from)})}
