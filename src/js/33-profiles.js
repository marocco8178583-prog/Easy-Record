/* Per-account local stores. The "active slot" (localStorage er4-v3 + IndexedDB er4-state/main) always belongs to exactly one owner: 'guest' or a user id.
   Switching owner stashes the active data under prof:<owner> (IndexedDB, falling back to localStorage) and loads the target owner's stash (or an empty state), then reloads.
   Stashes are NOT encrypted: this separates accounts in the UI and in sync; it is not protection against someone with access to the device's storage. */
var OWNK='er-owner';
function owner(){try{return localStorage.getItem(OWNK)||'guest'}catch(e){return 'guest'}}
function hasData(){return !!(S.entries.length||S.clients.length||S.pays.length||S.sessions.length||(S.debts||[]).length||(S.expenses||[]).length||(S.projects||[]).length||(S.tasks||[]).length)}
function emptyState(){var o={schema:SCHEMA,rate:DEFSET.rate,entries:[],clients:[],pays:[],sessions:[],debts:[],expenses:[],projects:[],tasks:[],tomb:{},conf:{}};['lang','fs','accent','dcc','cur'].forEach(function(k){if(S[k]!==undefined)o[k]=S[k]});return o}
async function stGet(id){try{if(!SDB)SDB=await sdbOpen();var v=await sget('prof:'+id);if(v)return v}catch(e){}try{var j=localStorage.getItem('er-prof-'+id);return j?JSON.parse(j):null}catch(e){return null}}
async function stPut(id,v){try{if(!SDB)SDB=await sdbOpen();await sput('prof:'+id,v);try{localStorage.removeItem('er-prof-'+id)}catch(e){}return true}catch(e){}
  try{if(v==null)localStorage.removeItem('er-prof-'+id);else localStorage.setItem('er-prof-'+id,JSON.stringify(v));return true}catch(e){return false}}
async function tagReceipts(pf){if(!DB||!R.length)return;try{await tx('readwrite',function(s){R.forEach(function(r){r.pf=pf;s.put(r)})})}catch(e){}}
/* profSwitch(to, keep): keep=true -> the data on screen moves with the user to the new owner (explicit merge); keep=false -> stash it and load the target owner's data. */
async function profSwitch(to,keep){var from=owner();if(from===to)return true;if(NOSAVE){info('לא ניתן להחליף חשבון כרגע כי שמירת הנתונים מושבתת. גבה את הנתונים ונסה שוב.');return false}
  try{derive();stamp()}catch(e){}
  if(keep){var st=await stGet(to);if(st&&st.j){try{bak(true);mergeInto(normalizeImport(clean(JSON.parse(st.j))),{})}catch(e){}await stPut(to,null)}
    await tagReceipts(to);try{localStorage.setItem(OWNK,to);localStorage.removeItem('er-sync-uid')}catch(e){}try{derive()}catch(e){}persist();return true}
  var bk='';try{bk=localStorage.getItem('er4-bak')||''}catch(e){}
  var ok=await stPut(from,{ts:Date.now(),j:JSON.stringify(S),bak:bk});if(!ok){info('לא ניתן להפריד את הנתונים במכשיר הזה (אין מקום אחסון פנוי). הנתונים נשארו במקומם.');return false}
  await tagReceipts(from);
  var t=await stGet(to),j=t&&t.j?t.j:JSON.stringify(emptyState()),ts=Date.now();
  NOSAVE=true; /* freeze saves until the reload below */
  try{localStorage.setItem(KEY,j);localStorage.setItem('er4-ts',String(ts));if(t&&t.bak)localStorage.setItem('er4-bak',t.bak);else localStorage.removeItem('er4-bak');
    ['er4-lastexp','er-sync-uid','er-rm-dismiss','er-rm-notif'].forEach(function(k){localStorage.removeItem(k)})}catch(e){}
  try{await sput('main',{ts:ts,j:j})}catch(e){}
  await stPut(to,null);try{localStorage.setItem(OWNK,to)}catch(e){}
  location.reload();return true}
