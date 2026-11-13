/* ===== time clock (stage 4): all times are absolute epoch ms; durations are differences, so they are correct across midnight, DST and app restarts ===== */
var lastClk=0;
function tzName(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){return ''}}
function activeSes(){return S.sessions.find(function(s){return s.st!=='done'})}
function sesBreaks(s,now){return (s.br||[]).reduce(function(a,b){return a+Math.max(0,(b.b==null?now:b.b)-b.a)},0)}
function sesGross(s,now){return Math.max(0,(s.t1==null?now:s.t1)-s.t0)}
function sesNet(s,now){return Math.max(0,sesGross(s,now)-(s.bp?0:sesBreaks(s,now)))}
function p2(n){return String(n).padStart(2,'0')}
function hms(ms){var t=Math.floor(ms/1000);return p2(Math.floor(t/3600))+':'+p2(Math.floor(t%3600/60))+':'+p2(t%60)}
function lt(ms){var d=new Date(ms);return p2(d.getHours())+':'+p2(d.getMinutes())}
function ltS(ms){var d=new Date(ms);return p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds())}
function dtl(ms){var d=new Date(ms);return ds(d)+'T'+lt(ms)+':'+p2(d.getSeconds())}
function ckRate(c,basis){return basis==='hour'?(c&&c.hrate)||S.hrate||0:(c&&c.rate)||S.rate||0}
function ckPre(){try{ckProjFill()}catch(e){}var c=S.clients.find(function(x){return x.name===($('ckClient').value||'').trim()});$('ckRate').value=ckRate(c,$('ckBasis').value)}
function ckChip(id){$('ckClient').value=cl(id).name;ckPre()}
function startWork(now){var t=Date.now();if(t-lastClk<1200)return;if(activeSes())return info('כבר יש שעון עבודה פעיל. סיים אותו לפני שמתחילים חדש.');
  var nm=($('ckClient').value||'').trim();if(!nm){$('ckClient').focus();return}
  lastClk=t;now=now||t;var c=S.clients.find(function(x){return x.name===nm});if(!c){c={id:uid(),name:nm,phone:''};S.clients.push(c)}
  S.sessions.push({id:uid(),cid:c.id,t0:now,tz:tzName(),off0:-new Date(now).getTimezoneOffset(),t1:null,st:'run',br:[],basis:$('ckBasis').value,rate:+$('ckRate').value||0,note:($('ckNote').value||'').trim(),hist:[],bp:!!S.brPaid});(function(){var pj=proj(+$('ckProj').value),ss=S.sessions[S.sessions.length-1];if(pj&&pj.cid===ss.cid)ss.pid=pj.id})();
  $('ckNote').value='';save();render()}
function startBreak(now){var s=activeSes();if(!s||s.st!=='run')return;s.br.push({a:now||Date.now(),b:null});s.st='brk';save();render()}
function endBreak(now){var s=activeSes();if(!s||s.st!=='brk')return;var b=s.br[s.br.length-1];if(b&&b.b==null)b.b=now||Date.now();s.st='run';save();render()}
function entryFromSes(s,e){var net=sesNet(s,s.t1)/3600000,hr=s.basis==='hour',eff=hr?r2(s.rate*8):r2(s.rate);
  var o={cid:s.cid,date:ds(new Date(s.t0)),days:hr?r2(net/8):1,rate:eff,amount:hr?sesPay(s,s.t1).pay:r2(s.rate),t1:lt(s.t0),t2:lt(s.t1),nh:r2(net),sid:s.id,basis:s.basis};
  if(hr)o.hr=r2(s.rate);for(var k in o)e[k]=o[k];var os=hr?sesPay(s,s.t1):null;if(os&&os.o1+os.o2>0.004)e.ot=r2(os.o1+os.o2);else delete e.ot;if(os&&os.sh>0.004)e.sh=r2(os.sh);else delete e.sh;if(s.pid&&proj(s.pid))e.pid=s.pid;return e}
function finishWork(now){var s=activeSes();if(!s)return;now=now||Date.now();if(s.st==='brk'){var b=s.br[s.br.length-1];if(b&&b.b==null)b.b=now}
  if(now<s.t0)now=s.t0;s.t1=now;s.st='done';var e=entryFromSes(s,{id:uid(),receipt:false,note:s.note||''});s.eid=e.id;S.entries.push(e);save();render();ckSummary(s,e)}
function ckSummary(s,e){$('sheetBody').innerHTML='<b>סיכום עבודה</b><small class="m">'+esc(cl(s.cid).name)+' · '+ltS(s.t0)+'–'+ltS(s.t1)+' · '+esc(s.tz||'')+'</small><div class="top"><span>ברוטו</span><b>'+hms(sesGross(s,s.t1))+'</b></div><div class="top"><span>הפסקות</span><b>'+hms(sesBreaks(s,s.t1))+'</b></div><div class="top"><span>נטו</span><b>'+hms(sesNet(s,s.t1))+'</b></div><div class="top"><span>לתשלום ('+(s.basis==='hour'?'שעתי':'יומי')+')</span><b>'+nis(e.amount)+'</b></div><small class="m">נוצר יום עבודה ביומן. אפשר לתקן שעות בלשונית שעון.</small><button onclick="closeS()">סגירה</button>';$('sheet').hidden=false}
var CIRC=603.2;
function clkPay(s,now){if(!s)return 0;return s.basis==='hour'?sesPay(s,now).pay:r2(s.rate)}
function clkTick(){var s=activeSes(),b=$('ckb'),now=Date.now();
  if(b){b.hidden=!s;if(s)b.textContent='⏱ שעון עבודה פעיל · '+cl(s.cid).name+' · '+hms(sesNet(s,now))+(s.st==='brk'?' (בהפסקה)':'')+(now-s.t0>12*3600000?' · ⚠️ פעיל יותר מ-12 שעות, ייתכן ששכחת לסיים':'')}
  if(!$('ckBig'))return;var net=s?sesNet(s,now):0,tg=Math.max(1,+S.tgt||8)*3600000,p=net/tg,P=$('ckRingP'),O=$('ckRingO');
  $('ckBig').textContent=hms(net);$('ckNet').textContent=hms(net);$('ckBr').textContent=hms(s?sesBreaks(s,now):0);$('ckPay').textContent=nis(clkPay(s,now));
  P.style.strokeDashoffset=CIRC*(1-Math.min(p,1));O.style.strokeDashoffset=CIRC*(1-(p>1?Math.min(p-1,1):0));
  P.setAttribute('class','ckp'+(s&&s.st==='brk'?' brk':''));O.setAttribute('class','ckp ckp2'+(s&&s.st==='brk'?' brk':''));
  var st=$('ckSt');st.textContent=!s?'לא פעיל':s.st==='brk'?'בהפסקה':'עובד';st.className='ckst'+(!s?' off':s.st==='brk'?' brk':'');
  $('ckCl').textContent=s?cl(s.cid).name+' · מ-'+lt(s.t0):'';
  $('bStart').disabled=!!s;$('bBreak').disabled=!s||s.st!=='run';$('bResume').disabled=!s||s.st!=='brk';$('bStop').disabled=!s}
function rClock(){var s=activeSes();$('ckForm').hidden=!!s;
  if(!s){if(!$('ckClient').value){var r=recent();if(r[0]){$('ckClient').value=r[0].name}}if(!$('ckRate').value)ckPre();
    $('ckChips').innerHTML=recent().map(function(c){return '<button class="ghost" style="padding:6px 12px;font-size:14px;min-height:36px" onclick="ckChip('+c.id+')">'+esc(c.name)+'</button>'}).join('');
    $('clients').innerHTML=S.clients.filter(function(c){return !c.arch&&c.kind!=='pro'}).map(function(c){return '<option value="'+esc(c.name)+'">'}).join('')}
  var d=S.sessions.filter(function(x){return x.st==='done'}).sort(function(a,b){return b.t0-a.t0}).slice(0,8);
  $('ckHist').innerHTML=d.length?d.map(function(x){var e=ent(x.eid);return '<div class="card"><div class="top"><div><b>'+esc(cl(x.cid).name)+'</b><br><small class="m">'+fmt(ds(new Date(x.t0)))+' · '+lt(x.t0)+'–'+lt(x.t1)+(x.hist&&x.hist.length?' · תוקן '+x.hist.length+' פעמים':'')+'</small></div><div class="l"><div class="amt">'+hf(sesNet(x,x.t1)/3600000)+' שע׳</div><small class="m">'+(e?nis(e.amount):'ללא רישום')+'</small></div></div><div class="acts"><button class="ghost" style="padding:6px 12px;font-size:14px;min-height:36px" onclick="ckEdit('+x.id+')">✎ תיקון שעות</button>'+(x.hist&&x.hist.length?'<button class="ghost" style="padding:6px 12px;font-size:14px;min-height:36px" onclick="ckHistory('+x.id+')">היסטוריית שינויים</button>':'')+'</div></div>'}).join(''):'<div class="empty">עדיין אין סשנים שהסתיימו.</div>';
  clkTick();try{rToday()}catch(e){}}
function ckEdit(id){var s=S.sessions.find(function(x){return x.id===id});if(!s||s.st!=='done')return;
  $('sheetBody').innerHTML='<b>תיקון שעות</b><small class="m">כל תיקון נשמר בהיסטוריה. רישום העבודה המקושר יתעדכן.</small><label for="ce1">התחלה</label><input id="ce1" type="datetime-local" step="1" value="'+dtl(s.t0)+'"><label for="ce2">סיום</label><input id="ce2" type="datetime-local" step="1" value="'+dtl(s.t1)+'"><label for="ce3">סך הפסקות (דקות)</label><input id="ce3" type="number" min="0" value="'+Math.round(sesBreaks(s,s.t1)/60000)+'"><label for="ce4">סיבת התיקון</label><input id="ce4"><div id="cee" class="owe"></div><button onclick="ckSave('+id+')">שמירה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function ckSave(id){var s=S.sessions.find(function(x){return x.id===id});if(!s)return;var a=new Date($('ce1').value).getTime(),b=new Date($('ce2').value).getTime(),m=Math.max(0,+$('ce3').value||0);
  if(isNaN(a)||isNaN(b)||b<=a){$('cee').textContent='שעת הסיום חייבת להיות אחרי ההתחלה';return}if(m*60000>b-a){$('cee').textContent='ההפסקות ארוכות מזמן העבודה';return}
  var before={t0:s.t0,t1:s.t1,brMin:Math.round(sesBreaks(s,s.t1)/60000)};s.hist=(s.hist||[]).concat([{ts:Date.now(),from:before,to:{t0:a,t1:b,brMin:m},why:($('ce4').value||'').trim()}]);
  s.t0=a;s.t1=b;s.off0=-new Date(a).getTimezoneOffset();s.br=m>0?[{a:a,b:a+m*60000,manual:true}]:[];var e=ent(s.eid);if(e)entryFromSes(s,e);closeS();save();render()}
function ckHistory(id){var s=S.sessions.find(function(x){return x.id===id});if(!s)return;
  $('sheetBody').innerHTML='<b>היסטוריית תיקונים</b>'+(s.hist||[]).map(function(h){return '<div class="card" style="margin:0"><small class="m">'+ltS(h.ts)+' · '+fmt(ds(new Date(h.ts)))+(h.why?' · '+esc(h.why):'')+'</small><div style="font-size:14px">לפני: '+lt(h.from.t0)+'–'+lt(h.from.t1)+' · הפסקות '+h.from.brMin+' דק׳</div><div style="font-size:14px">אחרי: '+lt(h.to.t0)+'–'+lt(h.to.t1)+' · הפסקות '+h.to.brMin+' דק׳</div></div>'}).join('')+'<button class="ghost" onclick="closeS()">סגירה</button>';$('sheet').hidden=false}
setInterval(function(){if(!document.hidden)clkTick()},1000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)clkTick()});window.addEventListener('pageshow',clkTick);window.addEventListener('focus',clkTick);

/* ===== "היום שלי": today's summary, quick actions, duplicate last work day ===== */
function sumE(fn){var o={a:0,d:0,h:0,n:0};S.entries.forEach(function(e){if(!fn(e))return;o.a+=c100(e.amount);o.d+=e.days;o.h+=eh(e);o.n++});o.a/=100;return o}
function rToday(){var td=today(),w0=wk0(td),m=td.slice(0,7),now=new Date(),s=activeSes();
  var T=sumE(function(e){return e.date===td}),W=sumE(function(e){return e.date>=w0&&e.date<=td}),M=sumE(function(e){return e.date.slice(0,7)===m}),owe=0;S.entries.forEach(function(e){owe+=c100(e.bl)});
  $('tdDate').textContent=now.toLocaleDateString(LOCALE,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+now.toLocaleTimeString(LOCALE,{hour:'2-digit',minute:'2-digit'});$('tdHi').textContent=greet();try{var pa=$('profAsk');if(pa)pa.hidden=!(typeof aGet==='function'&&aGet()&&aGet().user)||!!(S.fname&&S.lname&&S.dob)}catch(e){}try{rTasks()}catch(e){}
  function k(l,v,sub,c){return '<div><small>'+l+'</small><b'+(c?' style="color:var('+c+')"':'')+'>'+v+'</b><span>'+sub+'</span></div>'}
  $('tdStats').innerHTML=k('היום',nis(T.a+(s?clkPay(s,Date.now()):0)),T.n?T.d+' ימים'+(T.h?' · '+hf(T.h)+' שעות':''):s?'שעון פעיל':'עוד לא נרשם')+k('השבוע',nis(W.a),W.d+' ימים'+(W.h?' · '+hf(W.h)+' שעות':''))+k('החודש',nis(M.a),M.d+' ימים')+k('חייבים לי',nis(owe/100),owe?'פתוח לגבייה':'אין חובות פתוחים',owe?'--owe':'--ok');
  var l=S.entries.filter(function(e){return e.date===td});$('tdList').innerHTML=l.length?l.map(function(e){return row(e,'d')}).join(''):'<div class="empty">עוד לא נרשמה עבודה היום. אפשר להפעיל את השעון או לרשום יום עבודה.</div>'}
function qaCli(){tab='cli';CID=null;if(typeof CKIND!=='undefined')CKIND='client';render();window.scrollTo(0,0);setTimeout(function(){var i=$('cn');if(i)i.focus()},50)}
function greet(){var h=new Date().getHours(),nm=String(S.nick||S.fname||'').replace(/\s+/g,' ').trim().slice(0,30);var g=h<5?'לילה טוב':h<12?'בוקר טוב':h<17?'צהריים טובים':h<21?'ערב טוב':'לילה טוב';return g+(nm?', '+nm:'')}
function qaDay(){tab='cal';selD=today();var p=selD.split('-');cal=new Date(+p[0],+p[1]-1,1);render();window.scrollTo(0,0)}
function qaPay(){tab='pay';if(typeof PSUB!=='undefined')PSUB='in';render();window.scrollTo(0,0)}
function qaExp(){tab='pay';if(typeof pSub==='function')pSub('exp');else render();window.scrollTo(0,0)}
function dupLast(){var l=S.entries.slice().sort(function(a,b){return b.date.localeCompare(a.date)||b.id-a.id}).filter(function(e){return e.date<today()})[0];if(!l)return info('אין יום עבודה קודם לשכפל');
  var c=cl(l.cid);if(S.entries.some(function(e){return e.date===today()&&e.cid===l.cid}))return info('כבר רשום היום יום עבודה אצל '+c.name+'. אפשר לערוך אותו ברשימה למטה.');
  cf('לשכפל להיום את יום העבודה מ-'+fmt(l.date)+' אצל '+c.name+' ('+nis(l.amount)+')?',function(){var n={id:uid(),cid:l.cid,date:today(),days:l.days,rate:l.rate,amount:l.amount,receipt:false,t1:l.t1||'',t2:l.t2||'',note:l.note||''};if(l.hr)n.hr=l.hr;if(l.nh!=null)n.nh=l.nh;S.entries.push(n);save();render();toast('יום העבודה שוכפל להיום')})}

setInterval(function(){if(tab==='clock'&&!document.hidden){try{var n=new Date();$('tdDate').textContent=n.toLocaleDateString(LOCALE,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+n.toLocaleTimeString(LOCALE,{hour:'2-digit',minute:'2-digit'})}catch(e){}}},30000);

/* power button (tab bar): no running clock -> start today's work for the most recent client; running -> finish. */
var PWRT=0;
function pwrSync(){var b=$('pwrB');if(!b)return;var s=activeSes();b.classList.toggle('run',!!s&&s.st==='run');b.classList.toggle('brk',!!s&&s.st==='brk');b.setAttribute('aria-pressed',s?'true':'false');b.setAttribute('aria-label',s?'סיום עבודה':'התחלת עבודה');b.title=s?'סיום עבודה':'התחלת עבודה'}
function pwrClient(){var act=S.clients.filter(function(c){return !c.arch}),last=null;
  S.sessions.slice().sort(function(a,b){return b.t0-a.t0}).some(function(x){var c=S.clients.find(function(y){return y.id===x.cid&&!y.arch});if(c){last={c:c,basis:x.basis};return true}});
  if(!last){var e=S.entries.slice().sort(function(a,b){return a.date<b.date?1:-1}).find(function(x){return act.some(function(c){return c.id===x.cid})});if(e)last={c:act.find(function(c){return c.id===e.cid}),basis:e.basis==='hour'?'hour':'day'}}
  if(!last&&act.length===1)last={c:act[0],basis:act[0].hrate&&!act[0].rate?'hour':'day'};return last}
function pwrToggle(){var t=Date.now();if(t-PWRT<1500)return;PWRT=t;var b=$('pwrB');if(b){b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');setTimeout(function(){b.classList.remove('spin')},750)}
  var s=activeSes();if(s){finishWork();pwrSync();return}
  var p=pwrClient();if(!p){tab='clock';render();window.scrollTo(0,0);toast('בחר לקוח כדי להתחיל עבודה');setTimeout(function(){var i=$('ckClient');if(i)i.focus()},80);return}
  if(tab!=='clock'){tab='clock';render()}$('ckClient').value=p.c.name;$('ckBasis').value=p.basis==='hour'?'hour':'day';ckPre();lastClk=0;startWork();pwrSync();if(activeSes())toast('השעון הופעל: '+p.c.name)}
