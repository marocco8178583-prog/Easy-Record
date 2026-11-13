/* Receipts in the cloud (Supabase Storage, PRIVATE bucket "receipts", path <user_id>/<receipt id>) + receipt metadata rows (records.type='receipt').
   Files are downloaded with the user's own token (no public or shareable links). Downloads are lazy: other devices get the list and fetch a file when it is opened or backed up.
   Requires cloud/supabase/migrations/002_receipts_storage.sql. Without it the feature reports "not set up" and everything stays local. */
var RCS={busy:false,since:null,err:'',setup:true,last:0,timer:null},RC_MAX=10485760,RC_TYPES=['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf','audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/aac'];function rcBase(t){return String(t||'').split(';')[0].trim()}
function rcOn(){var s=aGet();return !!(SBDB&&DB&&s&&s.user&&owner()===s.user.id)}
function rcPut(r){return tx('readwrite',function(s){return s.put(r)})}
function rcDelQ(){try{return JSON.parse(localStorage.getItem('er-rc-del-'+owner()))||[]}catch(e){return []}}
function rcDelSet(l){try{if(l.length)localStorage.setItem('er-rc-del-'+owner(),JSON.stringify(l));else localStorage.removeItem('er-rc-del-'+owner())}catch(e){}}
/* call when receipts that may exist in the cloud are deleted locally */
function rcQueueDel(list){var q=rcDelQ();list.forEach(function(r){if(r&&r.up&&q.indexOf(r.id)<0)q.push(r.id)});rcDelSet(q);rcSoon()}
function rcSoon(ms){if(!rcOn())return;clearTimeout(RCS.timer);RCS.timer=setTimeout(rcSync,ms==null?800:ms)}
function rcStatus(){if(!SBDB)return 'קבלות: נשמרות במכשיר ובגיבוי ZIP בלבד (אין חשבון מחובר).';if(!RCS.setup)return 'קבלות בענן: לא הוגדר עדיין. יש להריץ ב-Supabase את הקובץ 002_receipts_storage.sql. בינתיים הקבלות נשמרות במכשיר.';
  var loc=R.filter(function(r){return !r.up&&!r.nosync&&r.blob}).length,ns=R.filter(function(r){return r.nosync}).length;
  return 'קבלות בענן: '+R.filter(function(r){return r.up}).length+' מגובות'+(loc?' · '+loc+' ממתינות להעלאה':'')+(ns?' · '+ns+' במכשיר בלבד (גדולות מ-10MB או סוג לא נתמך)':'')+(RCS.err?' · שגיאה אחרונה: '+esc(RCS.err.slice(0,120)):'')}
async function rcSync(){if(!rcOn()||RCS.busy)return;if(navigator.onLine===false)return;RCS.busy=true;var uid=aGet().user.id,changed=false;
  try{
    /* 1. upload local files */
    var up=R.filter(function(r){return !r.up&&!r.nosync&&r.blob});
    for(var i=0;i<up.length;i++){var r=up[i];
      if(r.blob.size>RC_MAX||RC_TYPES.indexOf(rcBase(r.type))<0){r.nosync=1;await rcPut(r);changed=true;continue}
      await SBDB.req('POST','/storage/v1/object/receipts/'+uid+'/'+r.id,r.blob,{'Content-Type':rcBase(r.type),'x-upsert':'true'});
      await SBDB.req('POST','/rest/v1/records?on_conflict=user_id,id',{user_id:uid,id:'r'+r.id,type:'receipt',ver:1,deleted:false,data:{id:r.id,cid:r.cid,eid:r.eid||0,name:r.name,type:rcBase(r.type),date:r.date,size:r.blob.size,kind:r.kind||'',dur:r.dur||0},device_id:devId()},{Prefer:'resolution=ignore-duplicates,return=minimal'});
      r.up=1;await rcPut(r);changed=true}
    /* 2. deletions */
    var q=rcDelQ();
    for(var k=0;k<q.length;k++){var id=q[k];
      await SBDB.req('POST','/rest/v1/records?on_conflict=user_id,id',{user_id:uid,id:'r'+id,type:'receipt',ver:2,deleted:true,data:{id:id},device_id:devId()},{Prefer:'resolution=merge-duplicates,return=minimal'}).catch(function(e){if(!/version_conflict/.test(e.message))throw e});
      await SBDB.req('DELETE','/storage/v1/object/receipts/'+uid+'/'+id).catch(function(e){if(!/ 404|שרת 404|שרת 400/.test(e.message))throw e});
      rcDelSet(rcDelQ().filter(function(x){return x!==id}))}
    /* 3. pull the list from other devices */
    var res=await SBDB.req('GET','/rest/v1/records?select=id,data,deleted,updated_at&type=eq.receipt'+(RCS.since?'&updated_at=gte.'+encodeURIComponent(RCS.since):'')+'&order=updated_at.asc&limit=1000'),rows=await res.json(),pend=rcDelQ();
    for(var j=0;j<rows.length;j++){var row=rows[j],d=row.data||{},rid=+String(row.id).slice(1),loc=R.find(function(x){return x.id===rid});
      if(row.deleted){if(loc){await tx('readwrite',function(s){return s.delete(rid)});R=R.filter(function(x){return x.id!==rid});changed=true}}
      else if(!loc&&pend.indexOf(rid)<0&&d.id){var nr={id:rid,cid:d.cid,eid:d.eid||0,name:d.name||'receipt',type:d.type||'',date:d.date||today(),size:d.size||0,blob:null,up:1};if(d.kind)nr.kind=d.kind;if(d.dur)nr.dur=d.dur;await rcPut(nr);R.push(nr);changed=true}
      else if(loc&&!loc.up){loc.up=1;await rcPut(loc)}}
    if(rows.length)RCS.since=rows[rows.length-1].updated_at;
    RCS.err='';RCS.setup=true;RCS.last=Date.now()}
  catch(e){RCS.err=(e&&e.message)||String(e);if(/Bucket not found|bucket.*not.*found|records_type_check|check constraint|23514/i.test(RCS.err))RCS.setup=false}
  RCS.busy=false;if(changed)render();else renderStatus()}
/* make sure the file itself is on this device (lazy download with the user's token) */
async function rcEnsure(r){if(!r||r.blob)return !!r;if(!rcOn())return false;try{var res=await SBDB.req('GET','/storage/v1/object/authenticated/receipts/'+aGet().user.id+'/'+r.id);var b=await res.blob();r.blob=r.type&&b.type!==r.type?new Blob([b],{type:r.type}):b;await rcPut(r);return true}catch(e){RCS.err=(e&&e.message)||String(e);return false}}
async function rcEnsureAll(list){var miss=0;for(var i=0;i<list.length;i++){if(!list[i].blob&&!(await rcEnsure(list[i])))miss++}return miss}
/* before deleting the account: remove the user's files from Storage (best effort; rows are removed by the account deletion itself) */
async function rcPurgeCloud(){if(!SBDB)return;try{var uid=aGet().user.id,res=await SBDB.req('GET','/rest/v1/records?select=id&type=eq.receipt&limit=1000'),rows=await res.json(),px=rows.map(function(x){return uid+'/'+String(x.id).slice(1)});
    for(var i=0;i<px.length;i+=100)await SBDB.req('DELETE','/storage/v1/object/receipts',{prefixes:px.slice(i,i+100)})}catch(e){}}
setInterval(function(){rcSoon(0)},60000);window.addEventListener('online',function(){rcSoon(500)});
