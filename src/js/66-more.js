/* ---- beta.37: receipts on expenses, business trips by km, reminders before the 15th, more in the accountant export ----
   Rough planning tools, not tax advice. */

/* ---------- receipts attached to an expense (receipt.xid = expense id) ---------- */
function xRcL(id){return (typeof R!=='undefined'&&R||[]).filter(function(r){return r.xid===id})}
function xRc(id){var x=(S.expenses||[]).find(function(y){return y.id===id});if(!x)return;var l=xRcL(id);
  $('sheetBody').innerHTML='<b>קבלות להוצאה · '+esc(x.cat)+' · '+fmt(x.date)+'</b>'+(l.length?l.map(function(r){return '<button class="ghost xRcRow" onclick="vr('+r.id+')">'+esc(r.name)+'</button>'}).join(''):'<span class="m">עדיין אין קבלה להוצאה הזו. צילום של הקבלה שומר אותה לביקורת ונכנס לקובץ לרואה החשבון.</span>')+
    '<button id="xRcUp" onclick="upl(0,'+(x.cid||0)+','+x.id+')">צילום / העלאת קבלה</button><button class="ghost" onclick="closeS()">סגירה</button>';$('sheet').hidden=false}

/* ---------- business trips: an expense with km (total km), kmR (rate per km), rt (round trip), always without VAT ---------- */
function kmRate(){var r=parseFloat(S.kmR);return isFinite(r)&&r>0&&r<=20?r:0}
function tripL(pre){return (S.expenses||[]).filter(function(x){return +x.km>0&&(!pre||String(x.date||'').indexOf(pre)===0)})}
function tripKm(l){return Math.round(l.reduce(function(s,x){return s+(+x.km||0)},0)*10)/10}
function tripSumH(){var m=today().slice(0,7),y=today().slice(0,4),lm=tripL(m),ly=tripL(y);
  return 'החודש: <b>'+tripKm(lm)+' ק״מ</b> · '+nis(expSum(lm))+' · השנה: '+tripKm(ly)+' ק״מ'}
function tripSheet(id){var x=id?(S.expenses||[]).find(function(y){return y.id===id}):null,rt=x?!!x.rt:false,km=x?(rt?x.km/2:x.km):'',r=x?x.kmR:kmRate();
  var co='<option value="0">ללא</option>'+S.clients.filter(function(c){return !c.arch||(x&&x.cid===c.id)}).map(function(c){return '<option value="'+c.id+'"'+(x&&x.cid===c.id?' selected':'')+'>'+esc(c.name)+'</option>'}).join('');
  $('sheetBody').innerHTML='<b>'+(x?'עריכת נסיעה':'רישום נסיעה עסקית')+'</b>'+
    '<div class="two"><div><label for="ktD">תאריך</label><input id="ktD" type="date" value="'+(x?x.date:today())+'"></div><div><label for="ktK">ק״מ</label><input id="ktK" type="number" inputmode="decimal" min="0" step="0.1" value="'+km+'"></div></div>'+
    '<label for="ktT">כיוון</label><select id="ktT" style="width:100%"><option value="0">כיוון אחד</option><option value="1"'+(rt?' selected':'')+'>הלוך ושוב (פי 2)</option></select>'+
    '<label for="ktN">מסלול / מטרה</label><input id="ktN" autocomplete="off" placeholder="למשל: הביתה ← לקוח בחיפה" value="'+qa(x?x.note||'':'')+'">'+
    '<label for="ktC">לקוח (לא חובה)</label><select id="ktC" style="width:100%">'+co+'</select>'+
    '<label for="ktR">תעריף לק״מ (₪)</label><input id="ktR" type="number" inputmode="decimal" min="0" step="0.01" value="'+(r||'')+'">'+
    '<small class="m">את התעריף קובע אתה (למשל לפי מה שרואה החשבון אמר). הנסיעה נרשמת כהוצאה בקטגוריה "נסיעות", בלי מע״מ. רואה החשבון קובע כמה מוכר בפועל.</small>'+
    '<div id="ktE" class="owe" role="alert"></div><button id="ktGo" onclick="tripSave('+(x?x.id:0)+')">שמירה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function tripSave(id){var e=$('ktE'),k1=Math.round(parseFloat($('ktK').value)*10)/10,rt=$('ktT').value==='1',km=rt?Math.round(k1*20)/10:k1,r=Math.round(parseFloat($('ktR').value)*100)/100,d=$('ktD').value||today();e.textContent='';
  if(!(k1>0)||k1>5000){e.textContent='הזן מספר ק״מ (גדול מאפס)';return $('ktK').focus()}
  if(!(r>0)||r>20){e.textContent='הזן תעריף לק״מ (בין 0.01 ל-20 ₪)';return $('ktR').focus()}
  var a=c100(km*r)/100;if(!(a>0)){e.textContent='הסכום יוצא אפס';return}
  var f={date:d,amount:a,cat:'נסיעות',note:$('ktN').value.replace(/\s+/g,' ').trim(),cid:+$('ktC').value||0,km:km,kmR:r,nv:1};if(rt)f.rt=1;
  S.kmR=r;S.expenses=S.expenses||[];
  if(id){var x=S.expenses.find(function(y){return y.id===id});if(!x)return closeS();Object.assign(x,f);if(!rt)delete x.rt}else S.expenses.push(Object.assign({id:uid()},f));
  closeS();save();render()}

/* ---------- reminder before the 15th: VAT report (when VAT is on) and income tax / National Insurance advances ---------- */
function ddDays(){var n=+S.ddDays;return [1,2,3,5,7].indexOf(n)>=0?n:2}
/* what is due on the 15th of the month of date d */
function ddItems(d,withAmt){var l=[],m=d.getMonth();
  if(S.vatOn&&(vatPer()===1||m%2===0)){var p=vatRange(d,1),it={k:'vat',t:'דיווח ותשלום מע״מ ('+vatLabel(p)+')'};if(withAmt){var v=vatInfo(p);it.a=v.due}l.push(it)}
  var a=+S.ddAdv;if(a===1||(a===2&&m%2===0))l.push({k:'adv',t:'מקדמות מס הכנסה וביטוח לאומי'});return l}
function ddKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function ddDone(){try{localStorage.setItem('er-dd-done',ddKey(new Date()))}catch(e){}var b=$('ddb');if(b)b.hidden=true}
/* {due, left (days), items} when today is inside the reminder window and it was not dismissed; otherwise null */
function ddNow(now){now=now||new Date();if(!S.ddOn)return null;var y=now.getFullYear(),m=now.getMonth(),due=new Date(y,m,15),t0=new Date(y,m,now.getDate()),
  left=Math.round((due-t0)/864e5);if(left<0||left>ddDays())return null;
  try{if(localStorage.getItem('er-dd-done')===ddKey(now))return null}catch(e){}
  var l=ddItems(now,true);return l.length?{due:due,left:left,items:l}:null}
function ddText(s){return 'עד '+fmt(ds(s.due))+' ('+(s.left?'עוד '+(s.left===1?'יום':s.left+' ימים'):'היום')+'): '+s.items.map(function(x){return x.t+(x.a>0?' · בערך '+nis(Math.round(x.a)):'')}).join('; ')}
function ddCheck(){var b=$('ddb');if(!b)return;var s=ddNow();if(!s){b.hidden=true;return}
  b.hidden=false;b.innerHTML='📅 '+esc(ddText(s))+' · <u onclick="event.stopPropagation();ddDone()">סימנתי שטיפלתי</u>';b.onclick=function(){tab='dash';render();window.scrollTo(0,0)};
  try{if(window.Notification&&Notification.permission==='granted'&&localStorage.getItem('er-dd-notif')!==today()){localStorage.setItem('er-dd-notif',today());new Notification('Easy Record',{body:ddText(s),tag:'er-dd'})}}catch(e){}}
/* for the phone app: OS notifications at 09:00, "days before" the 15th, for the next 4 months */
function ddNat(){if(!S.ddOn)return [];var now=new Date(),out=[];for(var k=0;k<4;k++){var d=new Date(now.getFullYear(),now.getMonth()+k,1),l=ddItems(d,false),at=new Date(d.getFullYear(),d.getMonth(),15-ddDays(),9,0);
    if(l.length&&at>now)out.push({id:2147480000+(d.getFullYear()*12+d.getMonth())%1000,title:'Easy Record',body:'עד 15.'+(d.getMonth()+1)+': '+l.map(function(x){return x.t}).join('; '),schedule:{at:at,allowWhileIdle:true}})}
  return out}
setInterval(function(){try{ddCheck()}catch(e){}},60000);document.addEventListener('visibilitychange',function(){if(!document.hidden)try{ddCheck()}catch(e){}});

/* ---------- settings ---------- */
function ddSetVals(){var s=$('sdd');if(!s)return;s.value=S.ddOn?'on':'off';$('sddW').hidden=!S.ddOn;$('sddA').value=String([0,1,2].indexOf(+S.ddAdv)>=0?+S.ddAdv:0);$('sddD').value=String(ddDays())}
try{$('sdd').onchange=function(){S.ddOn=this.value==='on';save();if(S.ddOn&&window.Notification&&Notification.permission==='default'){try{Notification.requestPermission()}catch(e){}}ddSetVals();render()};
  $('sddA').onchange=function(){S.ddAdv=+this.value===1?1:+this.value===2?2:0;save();render()};
  $('sddD').onchange=function(){S.ddDays=[1,2,3,5,7].indexOf(+this.value)>=0?+this.value:2;save();render()}}catch(e){}

/* ---------- accountant export: extra summary rows and sheets for year y ---------- */
function accExtra(y,xs){var c2=function(n){return Math.round((+n||0)*100)/100},sum=[],sheets=[],yy=function(s){return +String(s||'').slice(0,4)===y};
  var tp=taxPaidL().filter(function(x){return yy(x.d)}).sort(function(a,b){return a.d.localeCompare(b.d)});
  if(tp.length){var ti=0,tn=0;tp.forEach(function(x){if(x.k==='ni')tn+=c100(x.a);else ti+=c100(x.a)});
    sum.push(['מקדמות מס הכנסה ששולמו',ti/100],['מקדמות ביטוח לאומי ובריאות ששולמו',tn/100]);
    sheets.push({name:'מקדמות',rows:[['תאריך','למי','סכום']].concat(tp.map(function(x){return [x.d,x.k==='ni'?'ביטוח לאומי ובריאות':'מס הכנסה',c2(x.a)]}),[[],['סה״כ מס הכנסה','',ti/100],['סה״כ ביטוח לאומי ובריאות','',tn/100]]),widths:[2,3,2]})}
  var pd=pnDepL().filter(function(x){return yy(x.d)}).sort(function(a,b){return a.d.localeCompare(b.d)});
  if(pd.length){var pp=0,pk=0;pd.forEach(function(x){if(x.k==='kh')pk+=c100(x.a);else pp+=c100(x.a)});
    sum.push(['הפקדות לפנסיה',pp/100],['הפקדות לקרן השתלמות',pk/100]);
    sheets.push({name:'פנסיה וקרן השתלמות',rows:[['תאריך','לאן','סכום']].concat(pd.map(function(x){return [x.d,x.k==='kh'?'קרן השתלמות':'פנסיה',c2(x.a)]}),[[],['סה״כ פנסיה','',pp/100],['סה״כ קרן השתלמות','',pk/100]]),widths:[2,3,2]})}
  if(S.vatOn){var per=vatPer(),rows=[['תקופה','הכנסות','מע״מ על ההכנסות','הוצאות','מע״מ על ההוצאות','לתשלום (מינוס = החזר)','מועד דיווח']],O=0,I=0;
    for(var m=0;m<12;m+=per){var v=vatInfo({s:new Date(y,m,1),e:new Date(y,m+per,1)});O+=c100(v.out);I+=c100(v.inp);rows.push([vatLabel(v.r),c2(v.inc),v.out,c2(v.exp),v.inp,v.due,ds(v.deadline)])}
    rows.push([],['סה״כ','',O/100,'',I/100,(O-I)/100,'']);
    sum.push(['מע״מ על ההכנסות (עסקאות)',O/100],['מע״מ על ההוצאות (תשומות)',I/100],['מע״מ לתשלום בשנה (נטו)',(O-I)/100]);
    sheets.push({name:'מע״מ',rows:rows.concat([[],['מע״מ '+Math.round(vatR()*1000)/10+'%, '+(S.vatInc==='inc'?'הסכומים בימי העבודה כוללים מע״מ':'הסכומים בימי העבודה לפני מע״מ')+', לפי '+(S.cb==='paid'?'תאריך התשלום':'תאריך העבודה')+'. הערכה בלבד.']]),widths:[3,2,2,2,2,2,2]})}
  var tr=xs.filter(function(x){return +x.km>0});
  if(tr.length){var K=0,A=0;tr.forEach(function(x){K+=+x.km||0;A+=c100(x.amount)});K=Math.round(K*10)/10;
    sum.push(['נסיעות עסקיות (ק״מ)',K]);
    sheets.push({name:'נסיעות',rows:[['תאריך','ק״מ','הלוך ושוב','מסלול / מטרה','לקוח','תעריף לק״מ','סכום']].concat(tr.map(function(x){return [x.date,+x.km,x.rt?'כן':'',x.note||'',x.cid?cl(x.cid).name:'',+x.kmR||'',c2(x.amount)]}),[[],['סה״כ',K,'','','','',A/100]]),widths:[2,1,1,4,3,1,2]})}
  return {sum:sum,sheets:sheets}}
