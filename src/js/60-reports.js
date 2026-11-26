function stat(fn){var o={t:0,p:0,d:0,h:0};S.entries.forEach(function(e){if(!fn(e))return;o.t+=e.amount;o.d+=e.days;o.h+=eh(e);o.p+=e.pa});return o}
function sub(o){return o.d?o.d+' ימים'+(o.h?' · '+hf(o.h)+' שעות':''):'אין רישומים'}
function owedTxt(o){return o.t?'<small class="'+(o.t-o.p?'owe':'m')+'" style="font-size:13px">'+(o.t-o.p?'חייבים '+nis(o.t-o.p):'שולם הכל')+'</small>':''}
var ST='main',GY=new Date().getFullYear(),GM=new Date().getMonth();
function mt(y,m){var pre=y+'-'+String(m+1).padStart(2,'0');return stat(function(e){return e.date.indexOf(pre)===0})}
function gy(n){GY+=n;rStats()}
$('stabs').onclick=function(e){var s=e.target.dataset.s;if(s){ST=s;render()}};
function dif(a,b){var d=a-b,p=b?Math.round(d/b*100)+'%':'';return '<b style="color:var('+(d>=0?'--ok':'--owe')+')">'+(d>=0?'+':'-')+nis(Math.abs(d))+(p?' ('+(d>=0?'+':'')+p+')':'')+'</b>'}
function rStats(){
  var M=[],mx=1,T=0,i,nd=new Date(),W=360,base=160,H=130;
  for(i=0;i<12;i++){M.push(mt(GY,i));mx=Math.max(mx,M[i].t);T+=M[i].t}
  var act=M.filter(function(o){return o.t>0}).length,avg=act?T/act:0,bi=0;
  M.forEach(function(o,k){if(o.t>M[bi].t)bi=k});
  $('gyt').textContent=GY;
  var s='<svg viewBox="0 0 '+W+' 190" width="100%" role="img" aria-label="גרף הכנסות חודשיות">';
  for(i=0;i<12;i++){var o=M[i],x=6+(11-i)*29,h=o.t/mx*H,hp=o.p/mx*H,cur=nd.getFullYear()===GY&&nd.getMonth()===i;
    if(o.t>0){s+='<rect x="'+x+'" y="'+(base-h)+'" width="21" height="'+Math.max(h-hp,0)+'" rx="3" style="fill:var(--owe)"/><rect x="'+x+'" y="'+(base-hp)+'" width="21" height="'+hp+'" rx="3" style="fill:var(--ok)"/>'+
      '<text x="'+(x+10.5)+'" y="'+(base-h-4)+'" text-anchor="middle" font-size="9" style="fill:var(--mute)">'+(o.t>=1000?Math.round(o.t/100)/10+'k':Math.round(o.t))+'</text>'}
    s+='<text x="'+(x+10.5)+'" y="178" text-anchor="middle" font-size="11" '+(cur?'font-weight="800" ':'')+'style="fill:var(--ink)">'+(i+1)+'</text>'+(cur?'<rect x="'+x+'" y="182" width="21" height="3" rx="1.5" style="fill:var(--ink)"/>':'')}
  s+='<line x1="4" x2="'+(W-4)+'" y1="'+base+'" y2="'+base+'" style="stroke:var(--line)"/>';
  if(avg)s+='<line x1="4" x2="'+(W-4)+'" y1="'+(base-avg/mx*H)+'" y2="'+(base-avg/mx*H)+'" stroke-dasharray="3 3" style="stroke:var(--ink);opacity:.5"/>';
  $('gchart').innerHTML=s+'</svg>';
  var cur=M[GM],pm=mt(GM?GY:GY-1,(GM+11)%12),opt=MN.map(function(n,k){return '<option value="'+k+'"'+(k===GM?' selected':'')+'>'+n+'</option>'}).join('');
  $('gfacts').innerHTML='<div class="card"><div class="top"><div><small class="m">סה״כ '+GY+'</small><div class="amt" style="font-size:26px">'+nis(T)+'</div></div><div class="l"><small class="m">ממוצע לחודש<br><b>'+nis(avg)+'</b></small></div></div>'+
    (T?'<p style="margin:10px 0 0">🏆 החודש הכי טוב: <b>'+MN[bi]+'</b> '+nis(M[bi].t)+'</p>':'<p class="m">אין עדיין רישומים בשנה הזו.</p>')+'</div>'+
    '<div class="card"><label for="ggm">השוואה לחודש</label><select id="ggm" onchange="GM=+this.value;rStats()" style="width:100%">'+opt+'</select>'+
    '<p style="margin:10px 0 4px">'+MN[GM]+' '+GY+': <b>'+nis(cur.t)+'</b> · '+cur.d+' ימים</p>'+
    '<p style="margin:4px 0">לעומת '+MN[(GM+11)%12]+': '+dif(cur.t,pm.t)+'</p>'+
    (avg?'<p style="margin:4px 0">לעומת הממוצע: '+dif(cur.t,avg)+'</p>':'')+'</div>';
  var ord=M.map(function(o,k){return k}).filter(function(k){return M[k].t>0}).sort(function(a,b){return M[b].t-M[a].t});
  $('grank').innerHTML=ord.length?ord.map(function(k,n){return '<div style="margin-bottom:10px"><div class="top"><span>'+(n===0?'🏆 ':'')+MN[k]+'</span><b>'+nis(M[k].t)+'</b></div><div style="height:8px;background:var(--bg);border-radius:6px;margin-top:4px"><div style="height:8px;width:'+Math.max(M[k].t/M[ord[0]].t*100,2)+'%;background:var(--ok);border-radius:6px"></div></div></div>'}).join(''):'<span class="m">אין נתונים להצגה.</span>'}
function dago(s){var a=s.split('-'),t=new Date();t.setHours(0,0,0,0);return Math.round((t-new Date(+a[0],a[1]-1,+a[2]))/864e5)}
function odl(){return S.od||14}
function age(e){if(e.paid)return '';var n=dago(e.date);return n>0?'<br><small class="'+(n>=odl()?'owe':'m')+'" style="font-size:13px">'+(n>=odl()?'⏰ ':'')+'ממתין '+n+' ימים</small>':''}
function rOd(){var l=S.entries.filter(function(e){return e.bl>0.004&&dago(e.date)>=odl()}),b=$('odb');if(!l.length){b.hidden=true;return}
  b.hidden=false;b.textContent='⏰ '+l.length+' רישומים ('+nis(l.reduce(function(a,e){return a+e.bl},0))+') ממתינים לתשלום יותר מ-'+odl()+' ימים. לחץ כאן לשליחת תזכורת.';
  b.setAttribute('role','button');b.tabIndex=0;b.style.cursor='pointer';b.onclick=odSheet;b.onkeydown=function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();odSheet()}}}
/* overdue clients: one row per client with the overdue total and a reminder button (WhatsApp message via remind()) */
function odList(){var by={};S.entries.forEach(function(e){if(!(e.bl>0.004)||dago(e.date)<odl())return;var o=by[e.cid]||(by[e.cid]={cid:e.cid,t:0,n:0,old:0});o.t+=c100(e.bl);o.n++;o.old=Math.max(o.old,dago(e.date))});
  return Object.keys(by).map(function(k){return by[k]}).sort(function(a,b){return b.old-a.old||b.t-a.t})}
function odSheet(){var l=odList();if(!l.length)return info('אין חובות ישנים');
  $('sheetBody').innerHTML='<b>לקוחות שמאחרים בתשלום</b><small class="m">חובות שממתינים יותר מ-'+odl()+' ימים. אפשר לשנות את מספר הימים בהגדרות.</small>'+
    l.map(function(o){var c=cl(o.cid);return '<div class="card" style="margin:6px 0"><div class="top"><div><b>'+esc(c.name)+'</b><br><small class="m">'+o.n+' רישומים · הישן ביותר לפני '+o.old+' ימים</small></div><div class="l"><b class="owe">'+nis(o.t/100)+'</b></div></div><div class="acts"><button onclick="remind('+o.cid+')">💬 שליחת תזכורת</button></div></div>'}).join('')+
    '<button class="ghost" onclick="closeS()">סגירה</button>';$('sheet').hidden=false}
function csv(){var q=function(v){v=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(v)&&isNaN(Number(v)))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'},rows=[['תאריך','לקוח','טלפון','ימים','משעה','עד שעה','שעות','שכר ליום','סכום','שולם','יתרה','תאריך תשלום אחרון','אופן תשלום אחרון','קבלה','הערה']];
  S.entries.slice().sort(function(a,b){return a.date.localeCompare(b.date)}).forEach(function(e){var c=cl(e.cid),h=eh(e);rows.push([e.date,c.name,c.phone||'',e.days,e.t1||'',e.t2||'',h?hf(h):'',e.rate,e.amount,e.pa,e.bl,e.pdate||'',e.method||'',e.receipt?'כן':'לא',e.note||''])});
  dl('work-log.csv',new Blob(['\ufeff'+rows.map(function(r){return r.map(q).join(',')}).join('\r\n')],{type:'text/csv;charset=utf-8'}))}
/* ---- cap tracking ---- */
function fyRange(d){var m=S.fy||0,y=d.getFullYear();if(d.getMonth()<m)y--;return {s:new Date(y,m,1),e:new Date(y+1,m,1)}}
function capInfo(){var now=new Date(),r=fyRange(now),cap=S.cap||122833,t=0;
  function inR(s){var a=(s||'').split('-'),dt=new Date(+a[0],a[1]-1,+a[2]);return dt>=r.s&&dt<r.e}
  if(S.cb==='paid')S.pays.forEach(function(p){if(inR(p.date))t+=p.amount});else S.entries.forEach(function(e){if(inR(e.date))t+=e.amount});
  var el=Math.max((now-r.s)/864e5,1),tot=(r.e-r.s)/864e5,ml=Math.max((r.e-now)/(864e5*30.44),0.5);
  return {t:t,cap:cap,p:t/cap*100,left:cap-t,proj:t/el*tot,pm:Math.max(cap-t,0)/ml,r:r}}
function capMsg(c){return c.p>=100?'🚨 המחזור עבר את תקרת העוסק הפטור ('+nis(c.cap)+'). כדאי לבדוק עם רואה חשבון.':c.p>=90?'⚠️ המחזור הגיע ל-'+Math.round(c.p)+'% מהתקרה. נשארו '+nis(c.left)+'.':c.p>=70?'המחזור הגיע ל-'+Math.round(c.p)+'% מהתקרה. נשארו '+nis(c.left)+'.':c.proj>c.cap?'לפי הקצב הנוכחי המחזור צפוי לעבור את התקרה לפני סוף שנת המס.':''}
function rCapB(){var b=$('capb');if(S.capOn===false){b.hidden=true;return}var m=capMsg(capInfo());b.hidden=!m;b.textContent=m}
function capCard(){if(S.capOn===false)return '';var c=capInfo(),col=c.p>=70?'--owe':'--ok',y=c.r.s.getFullYear(),m=capMsg(c);
  return '<h2>מעקב תקרת מחזור</h2><div class="card"><div class="top"><div><small class="m">שנת מס '+y+(S.fy?'/'+c.r.e.getFullYear():'')+' · '+(S.cb==='paid'?'לפי תקבולים':'לפי תאריך עבודה')+'</small><div class="amt" style="font-size:26px">'+nis(c.t)+'</div></div><div class="l"><b style="font-size:24px;color:var('+col+')">'+Math.round(c.p)+'%</b><br><small class="m">מתוך '+nis(c.cap)+'</small></div></div>'+
  '<div style="height:10px;background:var(--bg);border-radius:6px;margin:10px 0"><div style="height:10px;width:'+Math.min(c.p,100)+'%;background:var('+col+');border-radius:6px"></div></div>'+
  '<div class="top"><small class="m">נשארו '+nis(Math.max(c.left,0))+'</small><small class="m">ממוצע חודשי נותר: '+nis(c.pm)+'</small></div>'+
  '<p style="margin:8px 0 0"><small class="m">תחזית לסוף שנת המס בקצב הנוכחי: <b style="color:var('+(c.proj>c.cap?'--owe':'--ok')+')">'+nis(c.proj)+'</b></small></p>'+(m?'<p style="margin:8px 0 0;color:var(--owe);font-weight:600">'+m+'</p>':'')+
  '<small class="m" style="font-size:12px">מידע כללי בלבד ולא ייעוץ מס. אפשר לשנות תקרה, תחילת שנת מס ובסיס חישוב בהגדרות.</small></div>'}
/* ---- dashboard ---- */
function dIn(e){if(DP==='a')return true;var k=DP==='y'?String(DY):DY+'-'+String(DM+1).padStart(2,'0');return e.date.indexOf(k)===0}
function dSet(k,v){if(k==='p')DP=v;else if(k==='m')DM=+v;else DY=+v;rDash()}
function kp(l,v,c){return '<div class="card" style="margin:0"><small class="m">'+l+'</small><div class="amt" style="font-size:24px'+(c?';color:var('+c+')':'')+'">'+v+'</div></div>'}
function rDash(){var es=S.entries.filter(dIn),T=0,P=0,D=0,by={},ny=new Date().getFullYear();
  es.forEach(function(e){T+=e.amount;D+=e.days;var o=by[e.cid]||(by[e.cid]={t:0,p:0,d:0});o.t+=e.amount;o.d+=e.days;P+=e.pa;o.p+=e.pa});
  var ks=Object.keys(by).sort(function(a,b){return by[b].t-by[a].t}),mx=ks.length?by[ks[0]].t:1;
  var mo=MN.map(function(n,i){return '<option value="'+i+'"'+(i===DM?' selected':'')+'>'+n+'</option>'}).join(''),yo='';
  for(var k=2020;k<=Math.max(ny+1,DY);k++)yo+='<option'+(k===DY?' selected':'')+'>'+k+'</option>';
  var h='<div class="card"><div class="two"><div><label for="dp">תקופה</label><select id="dp" style="width:100%" onchange="dSet(\'p\',this.value)"><option value="m"'+(DP==='m'?' selected':'')+'>חודש</option><option value="y"'+(DP==='y'?' selected':'')+'>שנה</option><option value="a"'+(DP==='a'?' selected':'')+'>הכל</option></select></div>'+
    (DP==='m'?'<div><label for="dm">חודש</label><select id="dm" style="width:100%" onchange="dSet(\'m\',this.value)">'+mo+'</select></div>':'')+(DP!=='a'?'<div><label for="dy">שנה</label><select id="dy" style="width:100%" onchange="dSet(\'y\',this.value)">'+yo+'</select></div>':'')+'</div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px">'+kp('הכנסות',nis(T))+kp('התקבל',nis(P),'--ok')+kp('חובות פתוחים',nis(T-P),'--owe')+kp('אחוז גבייה',(T?Math.round(P/T*100):0)+'%')+(function(){var pre=DP==='a'?'':DP==='y'?String(DY):DY+'-'+String(DM+1).padStart(2,'0'),X=typeof expSum==='function'?expSum(expIn(pre)):0;return kp('הוצאות',nis(X),'--owe')+kp('רווח (הכנסות פחות הוצאות)',nis(T-X),T-X>=0?'--ok':'--owe')})()+'</div><small class="m">'+D+' ימי עבודה · '+ks.length+' לקוחות פעילים</small>'+
    dTrend()+'<h2>פילוח לפי לקוח</h2><div class="card">'+(ks.length?ks.map(function(k){var o=by[k],c=cl(+k);return '<div style="margin-bottom:14px"><div class="top"><b>'+esc(c.name)+' <small class="m">'+(T?Math.round(o.t/T*100):0)+'%</small></b><b>'+nis(o.t)+'</b></div><div style="display:flex;height:10px;width:'+Math.max(o.t/mx*100,3)+'%;background:var(--owe);border-radius:6px;overflow:hidden;margin:4px 0"><div style="width:'+(o.t?o.p/o.t*100:0)+'%;background:var(--ok)"></div></div><small class="m">התקבל '+nis(o.p)+' · <span style="color:var(--owe)">חייב '+nis(o.t-o.p)+'</span></small></div>'}).join(''):'<span class="m">אין נתונים בתקופה הזו.</span>')+'</div>'+(typeof goalCard==='function'?goalCard():'')+capCard()+taxCard()+vatCard()+pnCard();
  $('dashBody').innerHTML=h;rfill()}
/* ---- reports ---- */
function rfill(){var c=$('rc'),v=c.value;c.innerHTML=S.clients.map(function(x){return '<option value="'+x.id+'">'+esc(x.name)+'</option>'}).join('');if(v)c.value=v;
  if(!$('rmn').options.length){$('rmn').innerHTML=MN.map(function(n,i){return '<option value="'+i+'"'+(i===new Date().getMonth()?' selected':'')+'>'+n+'</option>'}).join('');var y=new Date().getFullYear(),h='';for(var k=2020;k<=y+1;k++)h+='<option'+(k===y?' selected':'')+'>'+k+'</option>';$('rmy').innerHTML=h}rtu();if(typeof accFill==='function')accFill()}
function rtu(){var t=$('rt').value,pp=t==='m'?'m':t==='d'?'':$('rpp').value;$('rcw').hidden=t!=='c';$('rpp').hidden=$('rppl').hidden=t!=='c';$('rpw').hidden=t==='d'||pp==='a';$('rmn').hidden=pp!=='m';$('rmy').hidden=pp==='a'||pp==='';
  $('rcnt').textContent='הדוח כולל '+repData().rows.filter(function(r){return !r.b}).length+' רישומים'}
function repData(){var t=$('rt').value,pp=t==='m'?'m':t==='d'?'a':$('rpp').value,y=$('rmy').value,m=+$('rmn').value,pre=pp==='m'?y+'-'+String(m+1).padStart(2,'0'):pp==='y'?y:'',pl=pp==='m'?MN[m]+' '+y:pp==='y'?'שנת '+y:'כל התקופות',cid=$('rc').value,td=today();
  var es=S.entries.filter(function(e){return (!pre||e.date.indexOf(pre)===0)&&(t!=='c'||String(e.cid)===cid)&&(t!=='d'||e.bl>0.004)}),R={sum:[],rows:[]};
  if(t==='d'){es.sort(function(a,b){return cl(a.cid).name.localeCompare(cl(b.cid).name,'he')||a.date.localeCompare(b.date)});
    R.title='רשימת חובות פתוחים';R.sub='נכון ל-'+fmt(td);R.cols=['לקוח','תאריך','ממתין (ימים)','הערה','יתרה'];R.w=[3,2,2,3,2];
    var cur=null,sb=0,tot=0;function fl(){if(cur!==null)R.rows.push({c:['סה״כ '+cur,'','','',nis(sb)],x:['סה״כ '+cur,'','','',sb],b:1})}
    es.forEach(function(e){var n=cl(e.cid).name;if(n!==cur){fl();cur=n;sb=0}sb+=e.bl;tot+=e.bl;R.rows.push({c:[n,fmt(e.date),String(dago(e.date)),e.note||'',nis(e.bl)],x:[n,e.date,dago(e.date),e.note||'',e.bl]})});fl();
    R.sum=[['סה״כ חובות פתוחים',nis(tot),r2(tot)],['מספר רישומים',String(es.length),es.length]];R.file='easy-record-debts-'+td}
  else{es.sort(function(a,b){return a.date.localeCompare(b.date)});var cc=t==='c';
    R.title=cc?'דוח לקוח · '+cl(+cid).name:'דוח חודשי';R.sub=pl;
    R.cols=['תאריך'].concat(cc?[]:['לקוח'],['ימים','שעות','סכום','שולם','יתרה','תשלום אחרון']);R.w=cc?[2,1.3,1.5,2,2,2,3.2]:[2,2.6,1.3,1.5,2,2,2,3.2];
    var T=0,P=0,D=0,H=0;es.forEach(function(e){var h=eh(e);T+=e.amount;D+=e.days;H+=h;P+=e.pa;var lp=e.pdate?fmt(e.pdate)+(e.method?' '+e.method:''):'';
      R.rows.push({c:[fmt(e.date)].concat(cc?[]:[cl(e.cid).name],[String(e.days),h?hf(h):'',nis(e.amount),nis(e.pa),nis(e.bl),lp]),x:[e.date].concat(cc?[]:[cl(e.cid).name],[e.days,h?+h.toFixed(2):'',e.amount,e.pa,e.bl,lp])})});
    R.sum=[['סה״כ הכנסות',nis(T),r2(T)],['התקבל',nis(P),r2(P)],['יתרה פתוחה',nis(T-P),r2(T-P)],['ימי עבודה',String(D),D],['שעות',H?hf(H):'0',+H.toFixed(2)]];R.file='easy-record-'+(cc?'client':'monthly')+'-'+(pre||'all')}
  return R}
function repGo(k){var R=repData();if(!R.rows.length)return info('אין נתונים בדוח הזה');if(k==='pdf')repPdf(R);else repXlsx(R)}
async function repXlsx(R){try{var b=await xlsxBlob(xlsxRows(R),R.w);dl(R.file+'.xlsx',b)}catch(e){info('יצירת האקסל נכשלה: '+(e&&e.message||e))}}
async function repPdf(R){try{await document.fonts.load('700 30px Assistant');await document.fonts.load('400 24px Assistant');await document.fonts.load('700 40px Rubik')}catch(e){}
  var L=document.documentElement.dir==='ltr',W=1240,H=1754,mg=70,rh=54,pages=[],ctx,y,F='Assistant,Arial,sans-serif',tw=W-2*mg,sw=R.w.reduce(function(a,b){return a+b},0),cw=R.w.map(function(x){return x/sw*tw});
  function fit(t,mw){t=String(t);while(ctx.measureText(t).width>mw&&t.length>1)t=t.slice(0,-2)+'…';return t}
  function row(cells,fill,bold,hd){if(fill){ctx.fillStyle=fill;ctx.fillRect(mg,y,tw,rh)}ctx.font=(bold?'700 ':'400 ')+'24px '+F;var rt=L?mg:W-mg;ctx.textAlign=L?'left':'right';ctx.direction=L?'ltr':'rtl';
    cells.forEach(function(c,i){ctx.fillStyle=hd?'#12302d':c==='לא שולם'?'#d32f2f':String(c).indexOf('שולם')===0?'#17734a':'#1b2b29';ctx.fillText(fit(c,cw[i]-20),L?rt+12:rt-12,y+rh/2);rt+=L?cw[i]:-cw[i]});
    ctx.strokeStyle='#d3dedb';ctx.beginPath();ctx.moveTo(mg,y+rh);ctx.lineTo(W-mg,y+rh);ctx.stroke();y+=rh}
  function np(){var cv=document.createElement('canvas');cv.width=W;cv.height=H;ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.textBaseline='middle';pages.push(cv);
    ctx.fillStyle='#12302d';ctx.fillRect(0,0,W,160);ctx.direction='ltr';ctx.textAlign=L?'right':'left';ctx.fillStyle='#f28c28';ctx.font='700 44px Rubik,Arial,sans-serif';ctx.fillText('Easy Record',L?W-mg:mg,80);
    ctx.direction=L?'ltr':'rtl';ctx.textAlign=L?'left':'right';ctx.fillStyle='#fff';ctx.font='700 38px '+F;ctx.fillText(fit(R.title,700),L?mg:W-mg,62);ctx.fillStyle='#cfe0dc';ctx.font='400 26px '+F;ctx.fillText(R.sub,L?mg:W-mg,112);
    y=200;row(R.cols,'#e6efed',1,1)}
  np();R.rows.forEach(function(r,i){if(y+rh>H-120)np();row(r.c,r.b?'#f1f5f4':i%2?'#fafcfb':null,r.b)});
  if(y+rh*(R.sum.length+1)>H-100)np();y+=24;
  R.sum.forEach(function(s,i){var bx=L?mg:W-mg-520;ctx.fillStyle=i===0?'#12302d':'#e6efed';ctx.fillRect(bx,y,520,rh);ctx.font=(i===0?'700 ':'400 ')+'26px '+F;ctx.fillStyle=i===0?'#fff':'#12302d';ctx.direction=L?'ltr':'rtl';ctx.textAlign=L?'left':'right';ctx.fillText(s[0],L?bx+14:bx+506,y+rh/2);ctx.textAlign=L?'right':'left';ctx.fillText(s[1],L?bx+506:bx+14,y+rh/2);y+=rh});
  pages.forEach(function(cv,i){var c=cv.getContext('2d');c.direction=L?'ltr':'rtl';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#7a8c89';c.font='400 20px '+F;c.fillText(L?'Easy Record · Page '+(i+1)+' of '+pages.length+' · '+fmt(today()):'Easy Record · עמוד '+(i+1)+' מתוך '+pages.length+' · הופק ב-'+fmt(today()),W/2,H-50)});
  dl(R.file+'.pdf',mkPdf(pages))}
function mkPdf(cvs){var enc=new TextEncoder(),parts=[],off=0,xr=[],n=cvs.length;function w(x){var b=typeof x==='string'?enc.encode(x):x;parts.push(b);off+=b.length}
  function ob(id,body){xr[id]=off;w(id+' 0 obj\n'+body+'\nendobj\n')}
  w('%PDF-1.4\n');ob(1,'<< /Type /Catalog /Pages 2 0 R >>');ob(2,'<< /Type /Pages /Kids ['+cvs.map(function(_,i){return (3+3*i)+' 0 R'}).join(' ')+'] /Count '+n+' >>');
  cvs.forEach(function(cv,i){var p=3+3*i,bin=atob(cv.toDataURL('image/jpeg',0.88).split(',')[1]),by=new Uint8Array(bin.length);for(var k=0;k<bin.length;k++)by[k]=bin.charCodeAt(k);
    ob(p,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 '+(p+1)+' 0 R >> >> /Contents '+(p+2)+' 0 R >>');
    xr[p+1]=off;w((p+1)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+cv.width+' /Height '+cv.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+by.length+' >>\nstream\n');w(by);w('\nendstream\nendobj\n');
    var s='q 595 0 0 842 0 0 cm /Im0 Do Q';ob(p+2,'<< /Length '+s.length+' >>\nstream\n'+s+'\nendstream')});
  var st=off,tot=3+3*n;w('xref\n0 '+tot+'\n0000000000 65535 f \n');for(var id=1;id<tot;id++)w(String(xr[id]).padStart(10,'0')+' 00000 n \n');w('trailer\n<< /Size '+tot+' /Root 1 0 R >>\nstartxref\n'+st+'\n%%EOF');
  return new Blob(parts,{type:'application/pdf'})}

/* ---- interactive trend chart (tap a bar for details + comparison with the previous period) ---- */
var DG='m12',DSEL=-1;
function wk0(k){var a=k.split('-'),d=new Date(+a[0],+a[1]-1,+a[2]);d.setDate(d.getDate()-d.getDay());return ds(d)}
function dBuckets(){var now=new Date(),ks=[],key,lab,i;
  if(DG==='d30'){key=function(e){return e.date};for(i=29;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);ks.push([ds(d),d.getDate()+'/'+(d.getMonth()+1)])}}
  else if(DG==='w12'){key=function(e){return wk0(e.date)};for(i=11;i>=0;i--){var w=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i*7);var k=wk0(ds(w));ks.push([k,k.slice(8)+'/'+k.slice(5,7)])}}
  else if(DG==='y'){key=function(e){return e.date.slice(0,4)};for(i=4;i>=0;i--){var y=String(now.getFullYear()-i);ks.push([y,y])}}
  else{key=function(e){return e.date.slice(0,7)};for(i=11;i>=0;i--){var m=new Date(now.getFullYear(),now.getMonth()-i,1);ks.push([m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0'),MN[m.getMonth()].slice(0,3)])}}
  var o=ks.map(function(x){return {k:x[0],l:x[1],t:0,p:0,d:0,h:0}}),ix={};o.forEach(function(b,j){ix[b.k]=j});
  S.entries.forEach(function(e){var j=ix[key(e)];if(j==null)return;var b=o[j];b.t=r2(b.t+e.amount);b.p=r2(b.p+e.pa);b.d+=e.days;b.h+=eh(e)});return o}
function dG(g){DG=g;DSEL=-1;rDash()}function dSel(i){DSEL=DSEL===i?-1:i;rDash()}
function dTrend(){var b=dBuckets(),mx=0,n=b.length;b.forEach(function(x){if(x.t>mx)mx=x.t});if(!mx)mx=1;var W=320,H=130,bw=W/n,svg='';
  b.forEach(function(x,i){var h=Math.round(x.t/mx*(H-8)),hp=x.t?Math.round(x.p/x.t*h):0,ho=h-hp,xx=i*bw+bw*.15,w=bw*.7;
    svg+='<g class="trendbar" tabindex="0" role="button" aria-label="'+x.l+': '+nis(x.t)+'" onclick="dSel('+i+')" onkeydown="if(event.key===\'Enter\')dSel('+i+')"><rect x="'+(i*bw)+'" y="0" width="'+bw+'" height="'+H+'" fill="transparent"/>'+
      (x.t?'<rect x="'+xx+'" y="'+(H-hp)+'" width="'+w+'" height="'+hp+'" rx="2" fill="var(--ok)"/><rect x="'+xx+'" y="'+(H-hp-ho)+'" width="'+w+'" height="'+ho+'" rx="2" fill="var(--owe)"/>':'<rect x="'+xx+'" y="'+(H-2)+'" width="'+w+'" height="2" fill="var(--line)"/>')+
      (i===DSEL?'<rect x="'+(i*bw+1)+'" y="1" width="'+(bw-2)+'" height="'+(H-2)+'" rx="4" fill="none" stroke="var(--ink)" stroke-width="2"/>':'')+'<title>'+x.l+': '+nis(x.t)+'</title></g>'});
  var lbl='<div style="display:flex;direction:ltr;font-size:11px;color:var(--mute)">'+b.map(function(x,i){return '<span style="flex:1;text-align:center;overflow:hidden'+(n>14&&i%3?';visibility:hidden':'')+'">'+x.l+'</span>'}).join('')+'</div>';
  var det='<small class="m">לחץ על עמודה לפירוט. ירוק: שולם · אדום: חוב פתוח.</small>';
  if(DSEL>=0){var x=b[DSEL],pv=DSEL>0?b[DSEL-1]:null;det='<div style="margin-top:6px"><b>'+x.l+'</b>: '+nis(x.t)+' · שולם '+nis(x.p)+' · חוב '+nis(x.t-x.p)+'<br><small class="m">'+x.d+' ימים'+(x.h?' · '+hf(x.h)+' שעות':'')+(pv?' · לעומת התקופה הקודמת: '+dif(x.t,pv.t):'')+'</small></div>'}
  var gb=[['d30','30 ימים'],['w12','12 שבועות'],['m12','12 חודשים'],['y','שנים']].map(function(g){return '<button class="'+(DG===g[0]?'on':'')+'" aria-pressed="'+(DG===g[0])+'" style="padding:6px 4px;font-size:13px" onclick="dG(\''+g[0]+'\')">'+g[1]+'</button>'}).join('');
  return '<h2>מגמה</h2><div class="card"><div class="tabs" style="margin-bottom:8px">'+gb+'</div><svg viewBox="0 0 '+W+' '+H+'" width="100%" style="direction:ltr;display:block" role="group" aria-label="גרף הכנסות">'+svg+'</svg>'+lbl+det+'</div>'}
