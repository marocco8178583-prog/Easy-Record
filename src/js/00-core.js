var APP_VER='__VERSION__',KEY='er4-v3',LEGACY_KEY='workdays-v1',SCHEMA=3,NOSAVE=false,MIGERR='',S=null,tab='clock',filt='unpaid',OP={},selD,cal;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.entries){try{S=JSON.parse(localStorage.getItem(LEGACY_KEY))}catch(e){S=null}}
if(!S||!S.entries)S={rate:600,entries:[],clients:[]};
function $(i){return document.getElementById(i)}
function uid(){return Date.now()*1000+Math.floor(Math.random()*1000)}
/* damaged saved data (e.g. a list that is not a list) must never stop the app: bad parts are replaced by empty ones, and the original text is kept aside (never deleted) */
function sanitizeState(o){if(!o||typeof o!=='object')return o;var bad=false;['entries','clients','pays','sessions','debts','expenses','projects','tasks'].forEach(function(k){if(o[k]!=null&&!Array.isArray(o[k])){bad=true;o[k]=[]}else if(Array.isArray(o[k])){var n=o[k].length;o[k]=o[k].filter(function(x){return x&&typeof x==='object'});if(o[k].length!==n)bad=true}});
  ['tomb','conf'].forEach(function(k){if(o[k]!=null&&(typeof o[k]!=='object'||Array.isArray(o[k]))){bad=true;o[k]={}}});if(bad){try{localStorage.setItem('er-damaged-'+Date.now(),JSON.stringify(o).slice(0,500000))}catch(e){}}return o}
function ensureCids(o){sanitizeState(o);o.clients=o.clients||[];(o.entries||[]).forEach(function(e){if(!e.cid){var n=e.client||'',c=o.clients.find(function(x){return x.name===n});
  if(!c){c={id:uid(),name:n,phone:''};o.clients.push(c)}if(e.phone&&!c.phone)c.phone=e.phone;e.cid=c.id}})}
function migrate(){ensureCids(S)}
migrate();
function curSym(){return (S&&S.cur)||'₪'}
function nis(n){n=+n||0;var c=(n<0?-1:1)*Math.round(Math.abs(n)*100+1e-7),L=typeof LOCALE==='string'?LOCALE:'he-IL',t=c%100===0?(c/100).toLocaleString(L):(c/100).toLocaleString(L,{minimumFractionDigits:2,maximumFractionDigits:2});return t+' '+curSym()}
function ds(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function today(){return ds(new Date())}
function fmt(s){var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0]}
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function cl(id){return S.clients.find(function(c){return c.id===id})||{name:'לקוח לא ידוע',phone:''}}
function hrs(a,b){if(!a||!b)return 0;var x=a.split(':'),y=b.split(':'),m=(+y[0]*60+ +y[1])-(+x[0]*60+ +x[1]);if(m<0)m+=1440;return m/60}
function eh(e){return e.nh!=null?e.nh:hrs(e.t1,e.t2)}
function hf(h){var H=Math.floor(h),M=Math.round((h-H)*60);if(M===60){H++;M=0}return H+':'+String(M).padStart(2,'0')}
function safe(t){return String(t).replace(/[\\\/:*?"<>|]+/g,'_').trim()||'file'}
/* ===== data model v3: work days + payments + record metadata ===== */
var META={cr:1,up:1,ver:1,bv:1,_h:1},SETK=['rate','hrate','od','cap','capOn','fy','cb','accent','tgt','dcc','lang','fs','rmOn','rmT','bg','bgDim','bgSec','bgTone','bgBlur','bgGlass','bgFav','cur','otOn','otAfter','otM1','otAfter2','otM2','payUrl','payName','hc','tpls','snd','sndKind','tts','mute','qhOn','qh1','qh2','brkMax','runMax','brPaid','nick','tap','fname','lname','dob','shOn','shM','shF','shT','sndMode','sndVol','txOn','txPts'],DEFSET={rate:600,hrate:0,od:14,cap:122833,capOn:true,fy:0,cb:'work',accent:'',tgt:8,dcc:'IL',lang:'he',fs:1,rmOn:false,rmT:'18:00',bg:'none',bgDim:35,bgSec:45,bgTone:'',bgBlur:0,bgGlass:25,bgFav:[],cur:'₪',otOn:false,otAfter:8,otM1:1.25,otAfter2:10,otM2:1.5,payUrl:'https://app.sumit.co.il',hc:0,tpls:[],snd:1,sndKind:'soft',tts:0,mute:{},qhOn:0,qh1:'22:00',qh2:'07:00',brkMax:30,runMax:12,brPaid:0,nick:'',tap:1,fname:'',lname:'',dob:'',shOn:false,shM:2,shF:'18:00',shT:'19:00',sndMode:'sound',sndVol:70,payName:'סאמיט',txOn:true,txPts:2.25};
function c100(n){return Math.round(((+n||0)+Number.EPSILON)*100)}
function r2(n){return c100(n)/100}
function stab(o){if(Array.isArray(o))return '['+o.map(stab).join(',')+']';if(o&&typeof o==='object')return '{'+Object.keys(o).sort().map(function(k){return JSON.stringify(k)+':'+stab(o[k])}).join(',')+'}';return JSON.stringify(o===undefined?null:o)}
function cont(r){var c={};Object.keys(r).forEach(function(k){if(!META[k])c[k]=r[k]});return c}
function hsS(s){var a=5381,b=0;for(var i=0;i<s.length;i++){var ch=s.charCodeAt(i);a=((a<<5)+a+ch)|0;b=(Math.imul(b,31)+ch)|0}return a+':'+b}
function hs(r){return hsS(stab(cont(r)))}
function setCont(){var o={};SETK.forEach(function(k){o[k]=S[k]===undefined?DEFSET[k]:S[k]});return o}
function kf(t,id){return t+(id<0?'n'+(-id):id)}
function arrOf(t){return t==='e'?S.entries:t==='p'?S.pays:t==='t'?S.sessions:t==='d'?(S.debts=S.debts||[]):t==='x'?(S.expenses=S.expenses||[]):t==='j'?(S.projects=S.projects||[]):t==='k'?(S.tasks=S.tasks||[]):S.clients}
function recOf(t,id){return arrOf(t).find(function(x){return x.id===id})}
function nd(o,k,v){Object.defineProperty(o,k,{value:v,writable:true,configurable:true,enumerable:false})}
function derive(){var m={};S.pays.forEach(function(p){(p.alloc||[]).forEach(function(a){var o=m[a.eid]||(m[a.eid]={s:0,l:null});o.s+=c100(a.amt);if(!o.l||(p.date||'')>=(o.l.date||''))o.l=p})});
  S.entries.forEach(function(e){var o=m[e.id],s=o?o.s:0,am=c100(e.amount);nd(e,'pa',Math.min(s,am)/100);nd(e,'bl',Math.max(am-s,0)/100);nd(e,'ov',Math.max(s-am,0)/100);
    nd(e,'paid',am>0&&am-s<=0);nd(e,'method',o&&o.l?o.l.method||'':'');nd(e,'pdate',o&&o.l?o.l.date||'':'')})}
function stamp(){var now=Date.now();[S.entries,S.pays,S.clients,S.sessions,S.debts=S.debts||[],S.expenses=S.expenses||[],S.projects=S.projects||[],S.tasks=S.tasks||[]].forEach(function(a){a.forEach(function(r){var h=hs(r);
    if(!r.ver){r.ver=1;r.cr=r.cr||now;r.up=r.up||now;r.bv=0;r._h=h}else if(r._h===undefined){r._h=h}else if(r._h!==h){r.ver++;r.up=now;r._h=h}})});
  var sh=hsS(stab(setCont()));if(S.sv){if(S.sv._h!==sh){S.sv.ver++;S.sv.up=now;S.sv._h=sh}}else if(sh!==hsS(stab(DEFSET)))S.sv={ver:1,bv:0,up:now,_h:sh}}
function tombAdd(t,r){if(!r||!r.bv)return;S.tomb[kf(t,r.id)]={t:t,id:r.id,ver:(r.ver||0)+1,bv:r.bv,up:Date.now()}}
function pendingCount(){var n=0;[S.entries,S.pays,S.clients,S.sessions,S.debts||[],S.expenses||[],S.projects||[],S.tasks||[]].forEach(function(a){a.forEach(function(r){if(r.ver>r.bv)n++})});Object.keys(S.tomb||{}).forEach(function(k){var t=S.tomb[k];if(t.ver>t.bv)n++});if(S.sv&&S.sv.ver>S.sv.bv)n++;return n}

function clean(o){return JSON.parse(JSON.stringify(o),function(k,v){return (k==='__proto__'||k==='constructor'||k==='prototype')?undefined:v})}
function strip(r){var o=cont(r);if(r.cr)o.cr=r.cr;if(r.up)o.up=r.up;return o}
function devId(){var d=null;try{d=localStorage.getItem('er4-dev');if(!d){d='d'+uid().toString(36);localStorage.setItem('er4-dev',d)}}catch(e){}return d||'d0'}
function qa(t){return esc(t||'').replace(/"/g,'&quot;')}
