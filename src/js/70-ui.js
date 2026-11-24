var ACCENTS=[['','ברירת מחדל','#12302d'],['#1d4ed8','כחול','#1d4ed8'],['#6d28d9','סגול','#6d28d9'],['#15803d','ירוק','#15803d'],['#c2410c','כתום','#c2410c'],['#be123c','אדום','#be123c']];
function applyAccent(){var r=document.documentElement,a=S.accent||'';if(a){r.style.setProperty('--brand',a);r.style.setProperty('--onbrand','#fff')}else{r.style.removeProperty('--brand');r.style.removeProperty('--onbrand')}
  var row=$('accRow');if(row)row.innerHTML=ACCENTS.map(function(x){return '<button class="sw'+((S.accent||'')===x[0]?' on':'')+'" style="background:'+x[2]+'" data-acc="'+x[0]+'" aria-label="'+x[1]+'" aria-pressed="'+((S.accent||'')===x[0])+'"></button>'}).join('')}
function setAccent(e){var b=e.target.closest('button');if(!b||b.dataset.acc===undefined)return;S.accent=b.dataset.acc;save();applyAccent()}
function tel(c){var h='';if(c.phone)h+='<a class="ph" href="#" onclick="event.stopPropagation();ask(\'p\','+c.id+');return false">📞 '+esc(c.phone)+'</a>';if(c.email)h+=(h?'<br>':'')+'<a class="ph" href="#" onclick="event.stopPropagation();ask(\'e\','+c.id+');return false">✉️ '+esc(c.email)+'</a>';return h}
function tel0(c){return c.phone?'<a class="ph" onclick="event.stopPropagation()" href="tel:'+c.phone.replace(/[^\d+]/g,'')+'">📞 '+esc(c.phone)+'</a>':''}
var MN=[];for(var i=0;i<12;i++)MN.push(new Date(2000,i,1).toLocaleDateString('he-IL',{month:'long'}));
selD=today();cal=new Date();cal.setDate(1);

function tm(e){return e.t1&&e.t2?' · '+e.t1+'–'+e.t2+' ('+hf(eh(e))+' שעות)':''}
function th(){var h=hrs($('t1').value,$('t2').value);$('hrs').textContent=h?'סה״כ '+hf(h)+' שעות':''}
function row(e,p){var c=cl(e.cid),part=e.pa>0&&!e.paid;
  return '<div class="card"><div class="top"><div>'+(p==='p'||p==='c'?'<b>'+fmt(e.date)+'</b>':'<b>'+esc(c.name)+'</b><br><small class="m">'+fmt(e.date)+'</small>')+'<br><small class="m">'+e.days+' ימים'+tm(e)+(e.pid&&proj(e.pid)?' · '+esc(proj(e.pid).name):'')+(e.travel?' · כולל נסיעות '+nis(e.travel):'')+(e.ot?' · '+hf(e.ot)+' שעות נוספות':'')+(e.sh?' · '+hf(e.sh)+' שעות שבת':'')+'</small>'+(e.note?'<br><small>📝 '+esc(e.note)+'</small>':'')+(e.loc?'<br><small><a class="ph" target="_blank" rel="noopener" href="'+locUrl(e.loc)+'">מיקום העבודה במפה</a></small>':'')+age(e)+'</div>'+
  '<div class="l"><div class="amt">'+nis(e.amount)+'</div><span class="tag '+(e.paid?'p':'u')+'">'+(e.paid?'שולם':part?'שולם חלקית':'לא שולם')+'</span></div></div>'+
  (part?'<small class="m" style="font-size:13px">שולם '+nis(e.pa)+' · יתרה <b style="color:var(--owe)">'+nis(e.bl)+'</b></small>':'')+(e.ov>0?'<br><small class="owe" style="font-size:13px">שולם יותר מהסכום: '+nis(e.ov)+'</small>':'')+payLines(e)+
  '<div class="acts">'+(e.paid?'':'<select id="pm'+p+e.id+'" aria-label="איך שילם"><option>כללי</option><option>ביט</option><option>העברה בנקאית</option><option>מזומן</option></select><button onclick="act('+e.id+',\'paid\',\''+p+'\')">'+(part?'שולם את היתרה':'קיבלתי תשלום')+'</button><button class="ghost" onclick="payPart('+e.id+')">תשלום חלקי</button>')+
  '<button class="ghost" onclick="act('+e.id+',\'receipt\')">'+(e.receipt?'✓ קבלה הופקה':'סימון: הופקה קבלה')+'</button>'+
  '<button class="ghost" onclick="rsh('+e.id+')">📎 קבלות'+(rc(e.id)?' ('+rc(e.id)+')':'')+'</button>'+
  '<button class="ghost" onclick="edt('+e.id+')">עריכה</button><button class="ghost" onclick="act('+e.id+',\'del\')">מחיקה</button></div></div>'}
function rPay(){var owed=0,got=0;S.entries.forEach(function(e){got+=e.pa;owed+=e.bl});
  $('owed').textContent=nis(owed);$('got').textContent=nis(got);$('tot').textContent=nis(owed+got);
  var b=$('banner'),has=S.entries.some(function(e){return e.date===today()});
  if(!has){b.hidden=false;b.textContent='עוד לא רשמת את היום. מי חייב לך? מי שילם? יש קבלה?'}
  else if(S.entries.some(function(e){return e.pa>0&&!e.receipt})){b.hidden=false;b.textContent='יש תשלומים ששולמו ועדיין בלי קבלה. אפשר להפיק בסאמיט.'}
  else b.hidden=true;
  [].forEach.call($('ftabs').children,function(x){x.className=x.dataset.f===filt?'on':''});
  var g=S.clients.map(function(c){var es=S.entries.filter(function(e){return e.cid===c.id&&(filt==='all'||(filt==='paid'?e.paid:e.bl>0.004))}).sort(function(a,b){return b.date.localeCompare(a.date)});
    return {c:c,es:es,sum:es.reduce(function(s,e){return s+(filt==='unpaid'?e.bl:filt==='paid'?e.pa:e.amount)},0)}}).filter(function(x){return x.es.length}).sort(function(a,b){return b.sum-a.sum});
  $('payList').innerHTML=g.length?g.map(function(x){return '<details class="card"'+(OP[x.c.id]?' open':'')+' ontoggle="OP['+x.c.id+']=this.open"><summary><div class="debt"><div><b>'+esc(x.c.name)+'</b><br><small class="m">'+x.es.length+' רישומים</small></div><span class="'+(filt==='paid'?'amt':'owe')+'">'+nis(x.sum)+'</span></div></summary><div style="margin-top:10px">'+(tel(x.c)?tel(x.c)+'<br>':'')+(filt==='paid'?'':'<button class="ghost" style="padding:8px 12px;font-size:14px;margin-bottom:8px" onclick="remind('+x.c.id+')">💬 תזכורת תשלום</button> <button class="ghost" style="padding:8px 12px;font-size:14px;margin-bottom:8px" onclick="payClient('+x.c.id+')">💵 רישום תשלום</button>')+x.es.map(function(e){return row(e,'p')}).join('')+'</div></details>'}).join(''):'<div class="empty">'+(filt==='unpaid'?'אף אחד לא חייב לך. מצוין.':'אין רישומים להצגה.')+'</div>'}

var SY=new Date().getFullYear(),SM=new Date().getMonth();
function sm(n){var d=new Date(SY,SM+n,1);SY=d.getFullYear();SM=d.getMonth();render()}
function gsm(m,y){SM=+m;SY=+y;render()}
function now(){SY=new Date().getFullYear();SM=new Date().getMonth();render()}
function mcal(){cal=new Date(SY,SM,1);tab='cal';render();window.scrollTo(0,0)}
function rMon(){
  var pre=SY+'-'+String(SM+1).padStart(2,'0'),m=stat(function(e){return e.date.indexOf(pre)===0}),y=stat(function(e){return +e.date.slice(0,4)===SY}),nd=new Date(),cur=nd.getFullYear()===SY&&nd.getMonth()===SM;
  var mo=MN.map(function(n,i){return '<option value="'+i+'"'+(i===SM?' selected':'')+'>'+n+'</option>'}).join(''),yo='';
  for(var k=Math.min(2020,SY);k<=Math.max(nd.getFullYear()+4,SY);k++)yo+='<option'+(k===SY?' selected':'')+'>'+k+'</option>';
  $('mcur').innerHTML='<div class="card"><div class="chead" style="margin-top:0"><button onclick="sm(-1)" aria-label="חודש קודם"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><span><select onchange="gsm(this.value,SY)" aria-label="חודש">'+mo+'</select> <select onchange="gsm(SM,this.value)" aria-label="שנה">'+yo+'</select></span><button onclick="sm(1)" aria-label="חודש הבא"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button></div>'+
  '<div class="top" style="margin-top:8px"><div><b style="font-size:19px">'+MN[SM]+' '+SY+'</b><br><small class="m">'+(cur?'החודש הנוכחי · ':'')+sub(m)+'</small></div><div class="l"><div class="amt" style="font-size:26px">'+nis(m.t)+'</div>'+owedTxt(m)+'</div></div><div class="acts"><button class="ghost" onclick="mcal()">פתיחה בלוח שנה</button>'+(cur?'':'<button class="ghost" onclick="now()">חזרה לחודש הנוכחי</button>')+'</div></div>';
  $('ytot').innerHTML='<div class="top"><div><small class="m">סה״כ שנתי '+SY+'</small><div class="amt" style="font-size:30px">'+nis(y.t)+'</div></div><div class="l"><small class="m">'+sub(y).replace(' · ','<br>')+'</small></div></div><small class="m">התקבל '+nis(y.p)+' · חייבים '+nis(y.t-y.p)+'</small>'}
function pick(s){selD=s;var p=s.split('-');cal=new Date(+p[0],+p[1]-1,1);render()}
function off(n){var d=new Date();d.setDate(d.getDate()+n);pick(ds(d))}
function mv(n){cal=new Date(cal.getFullYear(),cal.getMonth()+n,1);render()}
function gm(m,y){cal=new Date(+y,+m,1);render()}
function calc(){$('amount').value=nis((+$('days').value||0)*(+$('rate').value||0)+(Math.max(0,+($('travel')||{}).value||0)))}
function rCal(){var y=cal.getFullYear(),m=cal.getMonth(),t=today(),first=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),st={};
  S.entries.forEach(function(e){var o=st[e.date]||(st[e.date]={u:0,p:0});if(e.bl>0.004)o.u++;else o.p++});
  var mo=MN.map(function(x,i){return '<option value="'+i+'"'+(i===m?' selected':'')+'>'+x+'</option>'}).join(''),yo='',ty=new Date().getFullYear();
  for(var k=Math.min(2020,y);k<=Math.max(ty+4,y);k++)yo+='<option'+(k===y?' selected':'')+'>'+k+'</option>';
  $('chead').innerHTML='<button onclick="mv(-1)" aria-label="חודש קודם"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><span><select onchange="gm(this.value,'+y+')" aria-label="חודש">'+mo+'</select> <select onchange="gm('+m+',this.value)" aria-label="שנה">'+yo+'</select></span><button onclick="mv(1)" aria-label="חודש הבא"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>';
  var h=['א','ב','ג','ד','ה','ו','ש'].map(function(x){return '<i>'+x+'</i>'}).join('');
  for(var i=0;i<first;i++)h+='<span></span>';
  for(var d=1;d<=n;d++){var s=ds(new Date(y,m,d)),o=st[s];
    h+='<button class="d '+(s===selD?'sel ':'')+(s===t?'td':'')+'" onclick="pick(\''+s+'\')">'+d+(o?'<u class="'+(o.u?'u':'p')+'"></u>':'')+'</button>'}
  $('cgrid').innerHTML=h;
  var pre=y+'-'+String(m+1).padStart(2,'0'),me=S.entries.filter(function(e){return e.date.indexOf(pre)===0});
  $('cinfo').textContent='נבחר: '+fmt(selD)+' · החודש: '+me.reduce(function(s,e){return s+e.days},0)+' ימים, '+hf(me.reduce(function(s,e){return s+eh(e)},0))+' שעות, '+nis(me.reduce(function(s,e){return s+e.amount},0))+' (אדום: יש חוב, ירוק: שולם)';
  $('clients').innerHTML=S.clients.filter(function(c){return !c.arch&&c.kind!=='pro'}).map(function(c){return '<option value="'+esc(c.name)+'">'}).join('');$('chips').innerHTML=recent().map(function(c){return '<button class="ghost" style="padding:6px 12px;font-size:14px" onclick="chip('+c.id+')">'+esc(c.name)+'</button>'}).join('');
  (function(){var sp=selD.split('-'),d0=new Date(+sp[0],+sp[1]-1,+sp[2]);d0.setDate(d0.getDate()-d0.getDay());var h='',tD=0,tH=0,tA=0,tB=0;
    for(var i=0;i<7;i++){var d=new Date(d0);d.setDate(d0.getDate()+i);var k=ds(d),es=S.entries.filter(function(e){return e.date===k}),dy=0,hh=0,am=0,bl=0;es.forEach(function(e){dy+=e.days;hh+=eh(e);am+=e.amount;bl+=e.bl});tD+=dy;tH+=hh;tA+=am;tB+=bl;
      h+='<div class="top" role="button" tabindex="0" style="cursor:pointer;padding:6px 0;'+(k===selD?'font-weight:800':'')+'" onclick="pick(\''+k+'\')"><span>'+d.toLocaleDateString(LOCALE,{weekday:'short'})+' '+String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'</span><span class="m">'+(es.length?dy+' ימים'+(hh?' · '+hf(hh):'')+' · <b style="color:var('+(bl>0.004?'--owe':'--ok')+')">'+nis(am)+'</b>':'—')+'</span></div>'}
    $('weekBox').innerHTML=h+'<div class="top" style="border-top:1px solid var(--line);margin-top:6px;padding-top:8px"><b>סה״כ שבוע</b><b>'+tD+' ימים · '+hf(tH)+' · '+nis(tA)+(tB>0.004?' · חייבים '+nis(tB):'')+'</b></div>'})();
  var de=S.entries.filter(function(e){return e.date===selD});
  $('dayList').innerHTML=de.length?de.map(function(e){return row(e,'d')}).join(''):'<div class="empty">אין רישומים ביום הזה.</div>'}
$('client').oninput=function(){projFill();var c=findClient($('client').value);if(c&&c.phone&&!$('phone').value)$('phone').value=c.phone;if(c&&c.rate&&!RATEDIRTY){$('rate').value=c.rate;calc()}};
$('days').oninput=calc;$('rate').oninput=function(){RATEDIRTY=true;calc()};$('t1').oninput=th;$('t2').oninput=th;
$('add').onclick=function(){var n=$('client').value.trim(),d=+$('days').value,r=+$('rate').value,ph=$('phone').value.trim();
  if(!n){$('client').focus();return}var vr=wageErr($('days').value,$('rate').value);if(vr){sndPlay('err');return info(vr)}d=r2(d);r=c100(r)/100;
  var c=findClient(n);var pn=normPhone(ph,S.dcc);if(!pn.ok){info(pn.err);return}ph=pn.e164||ph;
  if(!c){c={id:uid(),name:n.replace(/\s+/g,' '),phone:ph};S.clients.push(c)}else if(ph&&!c.phone)c.phone=ph;if(c.arch)c.arch=false;
  var tv=c100(Math.max(0,+$('travel').value||0))/100,ne={id:uid(),cid:c.id,date:selD,days:d,rate:r,amount:(c100(d*r)+c100(tv))/100,receipt:false,t1:$('t1').value,t2:$('t2').value,note:$('note').value.trim()};if(tv)ne.travel=tv;var pj=proj(+$('proj').value);if(pj&&pj.cid===c.id)ne.pid=pj.id;S.entries.push(ne);
  $('travel').value='';$('proj').value='0';$('client').value='';$('phone').value='';$('days').value=1;$('t1').value='';$('t2').value='';$('note').value='';th();calc();save();render();okSave('נשמר יום עבודה: '+nis(ne.amount))};

/* file download: a normal browser download (Blob + <a download>) on the real site; inside a claude.ai preview the host's downloads capability is used instead */
function dlBlob(name,data){var bl=data instanceof Blob?data:new Blob([data]),u=URL.createObjectURL(bl),a=document.createElement('a');a.href=u;a.download=name;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(function(){try{document.body.removeChild(a)}catch(e){}URL.revokeObjectURL(u)},4000);return true}
async function dl(name,data){var host=typeof window.claude==='object'&&window.claude&&typeof window.claude.use==='function';
  if(host){try{var d=await window.claude.use('downloads');if(d){await d.save({filename:name,data:data});return true}}catch(e){if(e&&e.code==='declined')return false;if(e&&e.code==='rejected_extension'){info('סוג הקובץ הזה לא נתמך להורדה');return false}}}
  try{dlBlob(name,data);toast('✓ הקובץ ירד: '+name);return true}catch(e){info('ההורדה נכשלה. נסה שוב, או פתח את האפליקציה בדפדפן.');return false}}
function rSet(){$('setMain').hidden=ST!=='main';$('setStats').hidden=ST!=='stats';
  [].forEach.call($('stabs').children,function(b){b.className=b.dataset.s===ST?'on':''});if(ST==='stats')rStats();else rBak()}
function applyTheme(){applyAccent();var t=S.theme||'sys',r=document.documentElement,h=new Date().getHours(),eff=t==='time'?(h>=6&&h<18?'light':'dark'):t;
  if(eff==='sys')r.removeAttribute('data-theme');else r.setAttribute('data-theme',eff);
  var dk=eff==='dark'||(eff==='sys'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches),m=document.querySelector('meta[name="theme-color"]');if(m)m.content=dk?'#0f1b19':'#12302d';
  [].forEach.call($('thm').children,function(b){b.className=b.dataset.th===t?'on':''});
  $('thn').textContent=t==='time'?'מצב יום בין 6:00 ל-18:00, ומצב לילה בשאר שעות היממה.':t==='sys'?'המראה יתאים להגדרה של הטלפון.':'';}
$('thm').onclick=function(e){var t=e.target.dataset.th;if(!t)return;S.theme=t;save();applyTheme()};
setInterval(applyTheme,60000);
function setVals(){try{[['snick','nick'],['sfn','fname'],['sln','lname'],['sdob','dob']].forEach(function(x){var el=$(x[0]);if(el&&document.activeElement!==el)el.value=S[x[1]]||''})}catch(e){}try{rSound()}catch(e){}try{var hc=$('shc');if(hc)hc.value=String(+S.hc||0);applyHc()}catch(e){}try{applyNav()}catch(e){}try{payLinks();var sc=$('scur');if(sc){sc.value=S.cur||'₪';$('sot').value=S.otOn?'on':'off';$('sotW').hidden=!S.otOn;$('sotA').value=S.otAfter||8;$('sotA2').value=S.otAfter2||10;$('sotM1').value=Math.round((+S.otM1||1.25)*100);$('sotM2').value=Math.round((+S.otM2||1.5)*100);$('ssh').value=S.shOn?'on':'off';$('sshW').hidden=!S.shOn;$('sshM').value=Math.round((+S.shM||2)*100);$('sshF').value=S.shF||'18:00';$('sshT').value=S.shT||'19:00';$('spayN').value=S.payName||'סאמיט';$('spayU').value=S.payUrl||'https://app.sumit.co.il'}}catch(e){}try{if(typeof applyLang==='function'&&(S.lang||'he')!==document.documentElement.lang){applyLang(S.lang||'he');setTimeout(function(){render();applyLang(S.lang||'he')},0)}if(typeof applyFs==='function')applyFs()}catch(e){}try{applyBg();bgRow()}catch(e){}var sr=$('srm');if(sr){sr.value=S.rmOn?'on':'off';$('srmt').value=S.rmT||'18:00'}var sf=$('sfs');if(sf)sf.value=String(S.fs||1);if(typeof renderAcct==='function')renderAcct();var sl=$('slang');if(sl){if(!sl.options.length)sl.innerHTML=LANGS.map(function(l){return '<option value="'+l[0]+'">'+l[1]+(l[4]==='ניווט בלבד'?' (partial)':'')+'</option>'}).join('');sl.value=S.lang||'he';var li=langInfo(S.lang||'he');$('slangNote').textContent=li[0]==='he'?'':li[4]==='ניווט בלבד'?'בשפה הזו מתורגם כרגע רק הניווט הראשי. שאר הטקסט מוצג בעברית.':'רוב המסכים מתורגמים. הודעות ודוחות מסוימים עדיין בעברית.'}var sd=$('sdcc');if(sd){if(!sd.options.length)sd.innerHTML=ccOpts();sd.value=S.dcc||'IL'}var sg=$('stg');if(sg)sg.value=S.tgt||8;var sh=$('shr');if(sh)sh.value=S.hrate||0;var vi=$('verInfo');if(vi)vi.textContent='Easy Record v'+APP_VER+' · מבנה נתונים '+SCHEMA;if(!RATEDIRTY){$('rate').value=S.rate;calc()}$('srate').value=S.rate;$('sod').value=S.od||14;$('sco').value=S.capOn===false?'off':'on';$('scap').value=S.cap||122833;$('sfy').value=S.fy||0;$('scb').value=S.cb||'work';var tx=$('stx');if(tx){tx.value=S.txOn===false?'off':'on';var tp=$('stxp');if(document.activeElement!==tp)tp.value=taxPts()}}
function csf(c){var q=($('cs').value||'').trim().toLowerCase();return !q||c.name.toLowerCase().indexOf(q)>=0||(c.phone||'').indexOf(q)>=0}
var RATEDIRTY=false;
/* wage validation shared by the add form and the edit dialog: days > 0, rate >= 0 (0 allowed), numbers only, at most 2 decimals kept */
function wageErr(dv,rv,lbl){var d=String(dv==null?'':dv).trim(),r=String(rv==null?'':rv).trim();if(d===''||isNaN(+d)||+d<=0)return 'מספר הימים חייב להיות גדול מ-0';if(+d>31)return 'מספר הימים לא תקין';if(r===''||isNaN(+r))return 'הזן '+(lbl||'שכר ליום')+' (מספר)';if(+r<0)return (lbl||'השכר')+' לא יכול להיות שלילי';if(+r>1000000)return 'הסכום גבוה מדי';return ''}
function okSave(msg){toast('✓ '+msg)}
function edt(id){var e=S.entries.find(function(x){return x.id===id});if(!e)return;var hr=e.basis==='hour';
  var wf=hr?'<div class="two"><div><label for="edh">שעות</label><input id="edh" type="number" min="0" step="0.01" inputmode="decimal" value="'+r2(eh(e)||0)+'"></div><div><label for="edr">שכר לשעה (₪)</label><input id="edr" type="number" min="0" step="0.01" inputmode="decimal" value="'+(e.hr!=null?e.hr:r2(e.rate/8))+'"></div></div><input id="edd" type="hidden" value="'+e.days+'">'
    :'<div class="two"><div><label for="edd">ימים</label><input id="edd" type="number" min="0.5" step="0.5" inputmode="decimal" value="'+e.days+'"></div><div><label for="edr">שכר ליום (₪)</label><input id="edr" type="number" min="0" step="0.01" inputmode="decimal" value="'+e.rate+'"></div></div>';
  $('sheetBody').innerHTML='<b>עריכת רישום</b><label for="ed">תאריך</label><input id="ed" type="date" value="'+e.date+'">'+wf+'<div class="two"><div><label for="et1">משעה</label><input id="et1" type="time" value="'+(e.t1||'')+'"></div><div><label for="et2">עד שעה</label><input id="et2" type="time" value="'+(e.t2||'')+'"></div></div>'+'<label for="edp">פרויקט</label><select id="edp" style="width:100%">'+projOpts(e.cid,e.pid||0)+'</select><label for="edtr">נסיעות (₪)</label><input id="edtr" type="number" min="0" step="0.01" inputmode="decimal" value="'+(e.travel||'')+'">'+'<label for="edn">הערה</label><input id="edn" value="'+qa(e.note||'')+'">'+locBlock(e)+'<div id="ede" class="owe" role="alert" aria-live="polite"></div><small class="m">השינוי חל על היום הזה בלבד. ימים אחרים ותשלומים שכבר נרשמו לא משתנים.</small><button class="ghost" style="margin-top:8px" onclick="tplFromEntry('+e.id+')">שמירה כתבנית</button><button id="edSave" onclick="doEdt('+id+')">שמירה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function doEdt(id){var e=S.entries.find(function(x){return x.id===id});if(!e)return;var hr=e.basis==='hour',er=$('ede'),fail=function(m){if(er)er.textContent=m;try{sndPlay('err')}catch(x){}return false};
  if(!$('ed').value)return fail('בחר תאריך');
  var rv=$('edr').value,tvs=$('edtr').value;if(tvs!==''&&(isNaN(+tvs)||+tvs<0))return fail('סכום הנסיעות לא תקין');var tv=c100(Math.max(0,+tvs||0))/100,pj=proj(+$('edp').value),r,amt;
  if(hr){var hv=$('edh').value;if(hv===''||isNaN(+hv)||+hv<=0||+hv>24)return fail('מספר השעות חייב להיות בין 0 ל-24');var m=wageErr(1,rv,'שכר לשעה');if(m)return fail(m);
    var h=r2(+hv);r=c100(+rv)/100;var s=e.sid&&S.sessions.find(function(x){return x.id===e.sid}),same=s&&Math.abs(sesNet(s,s.t1)/3600000-h)<0.01;
    if(s)s.rate=r;var base=same?sesPay(s,s.t1):null;amt=base?base.pay:otPay(h,r);var os=base||otSplit(h);e.hr=r;e.nh=h;e.days=r2(h/8);e.rate=r2(r*8);if(os.o1+os.o2>0.004)e.ot=r2(os.o1+os.o2);else delete e.ot;if(base&&base.sh>0.004)e.sh=r2(base.sh);else if(!base)delete e.sh}
  else{var m2=wageErr($('edd').value,rv);if(m2)return fail(m2);var d=r2(+$('edd').value);r=c100(+rv)/100;e.days=d;e.rate=r;amt=d*r;var s2=e.sid&&S.sessions.find(function(x){return x.id===e.sid});if(s2&&s2.basis!=='hour')s2.rate=r}
  var paid=e.pa||0;e.date=$('ed').value;e.amount=(c100(amt)+c100(tv))/100;if(tv)e.travel=tv;else delete e.travel;if(pj&&pj.cid===e.cid)e.pid=pj.id;else delete e.pid;e.t1=$('et1').value;e.t2=$('et2').value;e.note=$('edn').value.trim();
  closeS();save();render();okSave('נשמר: '+nis(e.amount)+(hr?' ('+nis(r)+' לשעה)':' ('+nis(r)+' ליום)'));if(paid>e.amount+0.004)setTimeout(function(){info('שים לב: על היום הזה כבר התקבל '+nis(paid)+', יותר מהסכום החדש ('+nis(e.amount)+'). התשלום לא שונה, וההפרש מופיע כיתרת זכות.')},400);return true}
function remind(cid){var c=cl(cid),l=S.entries.filter(function(e){return e.cid===cid&&e.bl>0.004}).sort(function(a,b){return a.date.localeCompare(b.date)});if(!l.length)return info('אין חובות פתוחים ללקוח הזה');
  var t='שלום '+c.name+', תזכורת ידידותית: נשאר לשלם '+nis(l.reduce(function(a,e){return a+e.bl},0))+' עבור ימי העבודה: '+l.map(function(e){return fmt(e.date)}).join(', ')+'. תודה רבה!';CV=t;
  var w=waNum(c.phone);
  $('sheetBody').innerHTML='<b>תזכורת תשלום</b><small class="m" style="white-space:pre-wrap;line-height:1.5">'+esc(t)+'</small>'+(w?'<a class="btn" target="_blank" rel="noopener" href="https://wa.me/'+w+'?text='+encodeURIComponent(t)+'">💬 שליחה בוואטסאפ</a>':'<small class="owe">אין טלפון ללקוח. אפשר להעתיק את ההודעה.</small>')+'<button class="ghost" onclick="cp(this)">העתקת ההודעה</button><button class="ghost" onclick="closeS()">סגירה</button>';$('sheet').hidden=false}
function recent(){var seen={},o=[];S.entries.slice().sort(function(a,b){return b.date.localeCompare(a.date)}).forEach(function(e){if(!seen[e.cid]&&o.length<5&&!cl(e.cid).arch){seen[e.cid]=1;o.push(cl(e.cid))}});return o}
function chip(id){var c=cl(id);$('client').value=c.name;setTimeout(projFill,0);$('phone').value=c.phone||'';$('rate').value=c.rate||S.rate;RATEDIRTY=false;calc()}
var bt=null,DP='y',DM=new Date().getMonth(),DY=new Date().getFullYear();
var CF=null;
function cf(m,fn){CF=fn;$('sheetBody').innerHTML='<b>'+esc(m)+'</b><button onclick="var f=CF;closeS();f()">כן, למחוק</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function toast(m){try{if(/^✓|נשמר|נוסף|נרשם|עודכן|שוחזר/.test(String(m||''))&&Date.now()-(window.ALAST||0)>250)sndPlay('save')}catch(e){}var t=$('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.appendChild(t)}t.textContent=m;t.className='show';clearTimeout(t._h);t._h=setTimeout(function(){t.className=''},2600)}
function info(m){$('sheetBody').innerHTML='<b>'+esc(m)+'</b><button onclick="closeS()">אישור</button>';$('sheet').hidden=false}
var CV='';
function ask(t,id){var c=cl(id),v=t==='p'?c.phone:c.email;if(!v)return;CV=v;var h='';
  if(t==='p'){var d=v.replace(/[^\d+]/g,''),w=waNum(v);
    h='<a class="btn" href="tel:'+d+'">📞 חיוג</a><a class="btn" target="_blank" rel="noopener" href="https://wa.me/'+w+'">💬 וואטסאפ</a>'}
  else h='<a class="btn" href="mailto:'+qa(v)+'">✉️ שליחת אימייל</a>';
  $('sheetBody').innerHTML='<b>'+esc(c.name)+'</b><span class="m" dir="ltr">'+esc(v)+'</span>'+h+'<button class="ghost" onclick="cp(this)">העתקה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function cp(b){try{navigator.clipboard.writeText(CV).then(function(){b.textContent='הועתק'})}catch(e){b.textContent='ההעתקה נכשלה'}}
function closeS(){var s=$('sheet');if(s.dataset.lock)return;s.hidden=true}
var CID=null;
function openC(id){CID=id;render();window.scrollTo(0,0)}
function closeC(){CID=null;render()}
function saveC(){var c=cl(CID),n=$('dn').value.trim();if(!n)return $('dn').focus();var dup=findClient(n,c.id);if(dup)return info('כבר קיים לקוח בשם '+dup.name);var pn=normPhone($('dp').value,S.dcc);if(!pn.ok)return info(pn.err);c.name=n.replace(/\s+/g,' ');c.phone=pn.e164||$('dp').value.trim();c.email=$('de').value.trim();if($('dk')){if($('dk').value==='pro'){c.kind='pro';c.role=$('drole').value.trim()}else{delete c.kind;if($('drole').value.trim())c.role=$('drole').value.trim();else delete c.role}}c.address=$('da').value.trim();if($('dnotes')){var nt=$('dnotes').value.trim();if(nt)c.notes=nt;else delete c.notes}c.rate=+$('dr').value||0;c.hrate=+$('dh').value||0;save();render()}
function rDet(c){var es=S.entries.filter(function(e){return e.cid===c.id}).sort(function(a,b){return b.date.localeCompare(a.date)}),ow=0,pd=0,dy=0;
  es.forEach(function(e){dy+=e.days;pd+=e.pa;ow+=e.bl});
  var lk=(c.phone?'<button class="ghost" onclick="ask(\'p\','+c.id+')">📞 טלפון וואטסאפ</button>':'')+(c.email?'<button class="ghost" onclick="ask(\'e\','+c.id+')">✉️ אימייל</button>':'')+(c.address?'<a class="btn ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(c.address)+'">📍 ניווט</a>':'');
  $('cliList').innerHTML='<button class="ghost" onclick="closeC()">→ חזרה ללקוחות</button>'+
  '<div class="card" style="margin-top:10px"><h2 style="margin:0">'+esc(c.name)+'</h2><small class="m">'+dy+' ימים · חייב '+nis(ow)+' · שולם '+nis(pd)+(function(){var pr=cliProfit(c);return pr.exp?'<br>הכנסות '+nis(pr.inc)+' · הוצאות '+nis(pr.exp)+' · רווח '+nis(pr.profit):''})()+'</small>'+(lk?'<div class="acts">'+lk+'</div>':'')+
  '<label for="dk">סוג</label><select id="dk" style="width:100%"><option value="client"'+((c.kind||'client')==='client'?' selected':'')+'>לקוח</option><option value="pro"'+(c.kind==='pro'?' selected':'')+'>איש מקצוע</option></select><label for="drole">תחום (לאיש מקצוע)</label><input id="drole" value="'+qa(c.role||'')+'" placeholder="רואה חשבון, עורך דין..."><label for="dn">שם</label><input id="dn" value="'+qa(c.name)+'"><label for="dp">טלפון</label><input id="dp" type="tel" inputmode="tel" value="'+qa(c.phone)+'">'+
  '<label for="de">אימייל</label><input id="de" type="email" inputmode="email" dir="ltr" value="'+qa(c.email)+'"><label for="da">כתובת</label><input id="da" value="'+qa(c.address)+'"><label for="dnotes">הערות</label><textarea id="dnotes" rows="2">'+esc(c.notes||'')+'</textarea><label for="dr">שכר יומי ללקוח הזה (ריק = ברירת המחדל)</label><input id="dr" type="number" min="0" value="'+(c.rate||'')+'"><label for="dh">שכר שעתי ללקוח הזה (ריק = ברירת המחדל)</label><input id="dh" type="number" min="0" value="'+(c.hrate||'')+'">'+
  '<button class="full" onclick="saveC()">שמירת פרטים</button><div class="acts">'+(ow?'<button onclick="payClient('+c.id+')">💵 רישום תשלום</button><button class="ghost" onclick="remind('+c.id+')">💬 תזכורת תשלום</button>':'')+'<button onclick="goAdd('+c.id+')">רישום יום</button><button class="ghost" onclick="arcC('+c.id+')">'+(c.arch?'שחזור מארכיון':'העברה לארכיון')+'</button><button class="ghost" onclick="delC('+c.id+')">מחיקת לקוח</button></div></div>'+
  projBlock(c)+rcBlock(c)+payBlock(c)+'<h2>היסטוריה</h2>'+(es.length?es.map(function(e){return row(e,'c')}).join(''):'<div class="empty">אין רישומים ללקוח הזה.</div>')}
var CKIND='client';
function rKind(){var k=$('ktabs');if(!k)return;k.hidden=!!CID;[].forEach.call(k.children,function(b){b.className=b.dataset.k===CKIND?'on':''});$('cnRoleW').hidden=CKIND!=='pro'}
function rCli(){rKind();$('cliAdd').hidden=$('cliExp').hidden=$('cs').hidden=!!CID;var cc=CID&&S.clients.find(function(x){return x.id===CID});if(cc)return rDet(cc);CID=null;$('cliAdd').hidden=$('cliExp').hidden=$('cs').hidden=false;xfill();$('cliList').innerHTML=S.clients.length?S.clients.filter(csf).filter(function(c){return (c.kind||'client')===CKIND}).filter(function(c){return SHOWARC||!c.arch}).sort(function(a,b){return a.name.localeCompare(b.name,'he')}).map(function(c){
  var es=S.entries.filter(function(e){return e.cid===c.id}),ow=0,pd=0,dy=0;es.forEach(function(e){dy+=e.days;pd+=e.pa;ow+=e.bl});
  return '<div class="card"><div class="top" role="button" tabindex="0" style="cursor:pointer" onclick="openC('+c.id+')"><div><b>'+esc(c.name)+' ›</b>'+(c.role?' <small class="m">'+esc(c.role)+'</small>':'')+'<br>'+(tel(c)||'<small class="m">אין טלפון</small>')+'</div><div class="l"><div class="owe">'+(ow?nis(ow):'')+'</div></div></div>'+
  '<small class="m">'+dy+' ימים · שולם '+nis(pd)+(c.arch?' · בארכיון':'')+'</small><div class="acts"><button onclick="openC('+c.id+')">פרטים</button><button onclick="goAdd('+c.id+')">רישום יום</button><button class="ghost" onclick="delC('+c.id+')">מחיקה</button></div></div>'}).join(''):'<div class="empty">אין לקוחות עדיין. הוסף למעלה, או שיווצרו אוטומטית כשתרשום יום עבודה.</div>'}
function addC(){var n=$('cn').value.trim();if(!n)return $('cn').focus();
  var pn=normPhone($('cp').value,S.dcc);if(!pn.ok)return info(pn.err);var ph=pn.e164||$('cp').value.trim();
  var c=findClient(n);if(c){if(ph)c.phone=ph;if(c.arch){c.arch=false;info('הלקוח '+c.name+' כבר קיים (היה בארכיון) והוחזר לרשימה')}else info('הלקוח '+c.name+' כבר קיים. לא נוצר כפיל')}else{var nc={id:uid(),name:n.replace(/\s+/g,' '),phone:ph};if(CKIND==='pro'){nc.kind='pro';nc.role=$('cnRole').value.trim()}S.clients.push(nc)}
  $('cn').value='';$('cp').value='';$('cnRole').value='';save();render()}
function arcC(id){var c=cl(id);if(!c||!c.id)return;c.arch=!c.arch;if(c.arch)CID=null;save();render()}
var SHOWARC=false;function toggleArc(){SHOWARC=!SHOWARC;$('arcT').textContent=SHOWARC?'הסתרת לקוחות בארכיון':'הצגת לקוחות בארכיון';render()}
function goAdd(id){var c=cl(id);tab='cal';$('client').value=c.name;$('phone').value=c.phone;$('rate').value=c.rate||S.rate;calc();render();window.scrollTo(0,0)}
function editC(id){var c=cl(id),n=prompt('שם הלקוח',c.name);if(n===null||!n.trim())return;var p=prompt('טלפון',c.phone);if(p===null)return;c.name=n.trim();c.phone=p.trim();save();render()}
function delC(id){var k=S.entries.filter(function(e){return e.cid===id}).length;cf(k?'ללקוח יש '+k+' רישומים. למחוק גם אותם?':'למחוק את הלקוח?',function(){delC2(id)})}
function delC2(id){S.entries.filter(function(e){return e.cid===id}).forEach(function(e){delEntry(e.id)});
  S.pays.filter(function(p){return p.cid===id}).forEach(function(p){S.pays.splice(S.pays.indexOf(p),1);tombAdd('p',p)});
  S.sessions.filter(function(x){return x.cid===id}).forEach(function(x){S.sessions.splice(S.sessions.indexOf(x),1);tombAdd('t',x)});(S.projects||[]).filter(function(x){return x.cid===id}).forEach(function(x){S.projects.splice(S.projects.indexOf(x),1);tombAdd('j',x)});(S.expenses||[]).forEach(function(x){if(x.cid===id)x.cid=0});(S.tasks||[]).forEach(function(x){if(x.cid===id)x.cid=0});var c=S.clients.find(function(x){return x.id===id});if(c){S.clients.splice(S.clients.indexOf(c),1);tombAdd('c',c)}CID=null;
  var rl=R.filter(function(r){return r.cid===id});rl.forEach(function(r){tx('readwrite',function(s){return s.delete(r.id)})});rcQueueDel(rl);R=R.filter(function(r){return r.cid!==id});save();render()}
$('accRow').onclick=setAccent;
$('scur').onchange=function(){S.cur=this.value;save();applyLang(S.lang||'he');render();applyLang(S.lang||'he')};
$('sot').onchange=function(){S.otOn=this.value==='on';save();setVals()};
$('sotA').onchange=function(){S.otAfter=Math.min(24,Math.max(1,+this.value||8));if((S.otAfter2||10)<S.otAfter)S.otAfter2=S.otAfter;save();setVals()};
$('sotM1').onchange=function(){S.otM1=Math.min(5,Math.max(1,(+this.value||125)/100));save();setVals()};$('sotM2').onchange=function(){S.otM2=Math.min(5,Math.max(1,(+this.value||150)/100));save();setVals()};
$('ssh').onchange=function(){S.shOn=this.value==='on';save();setVals()};$('sshM').onchange=function(){S.shM=Math.min(5,Math.max(1,(+this.value||200)/100));save();setVals()};
$('sshF').onchange=function(){if(this.value){S.shF=this.value;save()}};$('sshT').onchange=function(){if(this.value){S.shT=this.value;save()}};
$('sotA2').onchange=function(){S.otAfter2=Math.min(24,Math.max(S.otAfter||8,+this.value||10));save();setVals()};
$('spayN').onchange=function(){S.payName=this.value.trim().slice(0,30)||'סאמיט';save();setVals()};
$('spayU').onchange=function(){var v=this.value.trim();if(v&&!/^https:\/\/[^\s"'<>]+$/.test(v)){info('הכתובת חייבת להתחיל ב-https:// ובלי רווחים');this.value=S.payUrl||'';return}S.payUrl=v||'https://app.sumit.co.il';save();setVals()};
$('sfn').onchange=function(){S.fname=nmClean(this.value);this.value=S.fname;save();render()};$('sln').onchange=function(){S.lname=nmClean(this.value);this.value=S.lname;save()};
$('sdob').onchange=function(){var v=this.value,e=v?dobErr(v):'';if(e){toast(e);this.value=S.dob||'';return}S.dob=v;save();toast('נשמר')};
$('snick').onchange=function(){S.nick=this.value.replace(/\s+/g,' ').trim().slice(0,30);this.value=S.nick;save();render();toast(S.nick?'נשמר. נעים להכיר, '+S.nick:'השם הוסר מהברכה')};
$('shc').onchange=function(){S.hc=+this.value||0;save();applyHc()};
function applyNav(){var v=S.navPos==='right'||S.navPos==='left'?S.navPos:'';if(v)document.documentElement.setAttribute('data-nav',v);else document.documentElement.removeAttribute('data-nav');var e=$('snav');if(e)e.value=v||'bottom'}
$('snav').onchange=function(){S.navPos=this.value==='right'||this.value==='left'?this.value:'bottom';save();applyNav();render()};
function applyHc(){if(+S.hc)document.documentElement.setAttribute('data-hc','1');else document.documentElement.removeAttribute('data-hc')}
$('sfs').onchange=function(){S.fs=+this.value||1;save();applyFs()};
function applyFs(){document.body.style.zoom=(+S.fs||1)===1?'':String(+S.fs)}
$('srm').onchange=function(){S.rmOn=this.value==='on';save();if(S.rmOn&&window.Notification&&Notification.permission==='default'){try{Notification.requestPermission()}catch(e){}}remCheck()};
$('srmt').onchange=function(){S.rmT=this.value||'18:00';save();remCheck()};
function remDay(){try{return localStorage.getItem('er-rm-dismiss')}catch(e){return null}}
function remDone(){try{localStorage.setItem('er-rm-dismiss',today())}catch(e){}$('rmb').hidden=true}
function remCheck(){var b=$('rmb');if(!b)return;if(!S.rmOn||remDay()===today()){b.hidden=true;return}var n=new Date(),t=(S.rmT||'18:00').split(':'),due=n.getHours()*60+n.getMinutes()>=(+t[0]*60+ +t[1]);
  if(!due||S.entries.some(function(e){return e.date===today()})){b.hidden=true;return}
  b.hidden=false;b.innerHTML='🔔 עוד לא רשמת יום עבודה היום. <u>לרישום</u> · <u onclick="event.stopPropagation();remDone()">התעלם להיום</u>';b.onclick=function(){remDone();tab='cal';selD=today();render()};
  try{if(window.Notification&&Notification.permission==='granted'&&localStorage.getItem('er-rm-notif')!==today()){localStorage.setItem('er-rm-notif',today());new Notification('Easy Record',{body:'עוד לא רשמת יום עבודה היום'})}}catch(e){}}
setInterval(remCheck,60000);document.addEventListener('visibilitychange',function(){if(!document.hidden)remCheck()});
$('slang').onchange=function(){setLang(this.value)};
$('sdcc').onchange=function(){S.dcc=this.value;save();render()};
$('stg').onchange=function(){S.tgt=Math.min(24,Math.max(1,+this.value||8));save();render()};
$('shr').onchange=function(){S.hrate=+this.value||0;save();render()};
$('srate').onchange=function(){S.rate=+this.value||0;$('rate').value=S.rate;calc();save()};
function wipe(){cf('למחוק את כל הנתונים? נוצר גיבוי אוטומטי לפני כן, והמחיקה תסונכרן למכשירים אחרים.',function(){bak(true);S.entries.slice().forEach(function(e){tombAdd('e',e)});S.pays.slice().forEach(function(p){tombAdd('p',p)});S.clients.slice().forEach(function(c){tombAdd('c',c)});
  S.sessions.slice().forEach(function(x){tombAdd('t',x)});(S.debts||[]).slice().forEach(function(x){tombAdd('d',x)});(S.expenses||[]).slice().forEach(function(x){tombAdd('x',x)});S.expenses=[];(S.projects||[]).slice().forEach(function(x){tombAdd('j',x)});S.projects=[];(S.tasks||[]).slice().forEach(function(x){tombAdd('k',x)});S.tasks=[];S.entries=[];S.pays=[];S.clients=[];S.sessions=[];S.debts=[];var _rid=R.map(function(r){return r.id});rcQueueDel(R);R=[];if(DB)tx('readwrite',function(s){_rid.forEach(function(i){s.delete(i)})});save();render()})}
$('ktabs').onclick=function(e){var b=e.target.closest('button');if(b&&b.dataset.k){CKIND=b.dataset.k;render()}};
$('nav').onclick=function(e){var b=e.target.closest('button');if(b&&b.id==='pwrB'){pwrToggle();return}if(b){tab=b.dataset.t;if(tab==='cli')CID=null;render();window.scrollTo(0,0)}};
$('ftabs').onclick=function(e){if(e.target.dataset.f){filt=e.target.dataset.f;render()}};
function render(){try{if(!NOSAVE&&expRecur())setTimeout(save,0)}catch(e){}try{derive()}catch(e){}try{if(tab==='cal')setTimeout(rDayView,0)}catch(e){}try{remCheck()}catch(e){}try{rDebts()}catch(e){}$('roBan').hidden=!RO;renderCfb();renderStatus();['pay','dash','cal','clock','cli','set'].forEach(function(v){$('v-'+v).hidden=v!==tab});
  [].forEach.call($('nav').children,function(b){if(b.id==='pwrB')return;b.className=b.dataset.t===tab?'on':''});try{pwrSync()}catch(e){}
  if(tab==='pay'){rPay();rMon();rOd();rCapB()}if(tab==='cal')rCal();if(tab==='cli')rCli();if(tab==='set')rSet();if(tab==='dash')rDash();if(tab==='clock')rClock();clkTick()}
/* Keep what the user is typing. Background re-renders (cloud sync, polling, timers) rebuild screens from saved data; without this, a half-edited field
   (e.g. a client's rate changed from 600 to 300 but not yet saved) jumped back to the saved value and the client form reset.
   Fields the user changed are remembered until the user presses any button (the button's own handler reads them first) or switches screen. */
var DIRTY={};
function fKey(el){return el&&el.id?tab+'|'+(typeof CID!=='undefined'&&CID!=null?CID:'')+'|'+el.id:null}
document.addEventListener('input',function(ev){var el=ev.target;if(!el||!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.type==='file'||el.type==='range')return;if(!document.querySelector('main').contains(el))return;var k=fKey(el);if(k)DIRTY[k]=el.type==='checkbox'?el.checked:el.value},true);
document.addEventListener('change',function(ev){var el=ev.target;if(el&&el.tagName==='SELECT'&&document.querySelector('main').contains(el)){var k=fKey(el);if(k)DIRTY[k]=el.value}},true);
document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest&&ev.target.closest('button,[role=button],a');if(b)setTimeout(function(){DIRTY={}},0)},true);
(function(){var r0=render;render=function(){var r=r0.apply(this,arguments);try{Object.keys(DIRTY).forEach(function(k){var p=k.split('|');if(p[0]!==tab||p[1]!==String(typeof CID!=='undefined'&&CID!=null?CID:''))return;var el=document.getElementById(p.slice(2).join('|'));if(!el)return;
  if(el.type==='checkbox'){if(el.checked!==DIRTY[k])el.checked=DIRTY[k]}else if(el.value!==DIRTY[k]){el.value=DIRTY[k];if(el.id==='rate'||el.id==='days')try{calc()}catch(e){}}})}catch(e){}return r}})();
