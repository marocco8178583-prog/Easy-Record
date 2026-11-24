/* ---- VAT for a licensed dealer (עוסק מורשה), pension + keren hishtalmut deposits, and work days to a phone calendar (.ics) ----
   Rough planning numbers, not tax advice. Rates for 2026 live in TAX26 (61-tax.js); sources checked 24.11.2026:
   VAT 18% (since 1.1.2025), report and pay by the 15th of the month after the period.
   Mandatory pension for the self-employed: 4.45% of income up to half the average wage (6,884.5 a month), 12.55% from there up to
   the average wage (13,769), ages 21-60. Pension tax benefit: qualifying income up to 232,800 a year, deduction up to 11% of it,
   then a 35% credit on up to 5.5%. Keren hishtalmut: deduction 4.5% of income up to 293,397 (max 13,203 a year); deposits up to
   20,566 a year keep tax-free gains. */

/* ---------- VAT ---------- */
function vatR(){var r=parseFloat(S.vatR);return isFinite(r)&&r>=0&&r<=50?r/100:.18}
function vatPer(){return +S.vatPer===1?1:2}
/* the VAT period that contains date d: {s,e} (e exclusive) as Date objects */
function vatRange(d,back){var per=vatPer(),y=d.getFullYear(),m=d.getMonth();m-=m%per;m-=per*(back||0);var s=new Date(y,m,1);return {s:s,e:new Date(s.getFullYear(),s.getMonth()+per,1)}}
function vatLabel(r){var a=MN[r.s.getMonth()],b=MN[new Date(r.e.getFullYear(),r.e.getMonth()-1,1).getMonth()];return (vatPer()===1?a:a+'–'+b)+' '+r.s.getFullYear()}
/* income after VAT has been taken out, and the VAT on it */
function vatSplitInc(a){var r=vatR();a=+a||0;return S.vatInc==='inc'?{net:a/(1+r),vat:a-a/(1+r)}:{net:a,vat:a*r}}
/* an expense: amount always includes VAT, unless marked nv (no VAT on it, e.g. insurance, food abroad) */
function vatSplitExp(x){var r=vatR(),a=+x.amount||0;return x.nv?{net:a,vat:0}:{net:a/(1+r),vat:a-a/(1+r)}}
function vatInfo(r){var now=new Date(),td=today(),inc=0,exp=0,out=0,inp=0;
  function inR(s){if(!s||s>td)return false;var a=s.split('-'),dt=new Date(+a[0],a[1]-1,+a[2]);return dt>=r.s&&dt<r.e}
  (S.cb==='paid'?S.pays:S.entries).forEach(function(e){if(inR(e.date)){inc+=+e.amount||0;out+=vatSplitInc(e.amount).vat}});
  (S.expenses||[]).forEach(function(x){if(inR(x.date)){exp+=+x.amount||0;inp+=vatSplitExp(x).vat}});
  out=Math.round(out*100)/100;inp=Math.round(inp*100)/100;return {r:r,inc:inc,exp:exp,out:out,inp:inp,due:Math.round((out-inp)*100)/100,deadline:new Date(r.e.getFullYear(),r.e.getMonth(),15),open:now<r.e}}
function vatCard(){if(!S.vatOn)return '';var cur=vatInfo(vatRange(new Date())),prev=vatInfo(vatRange(new Date(),1));
  var row=function(l,v,cls){return '<div class="top" style="margin:4px 0"><small class="m">'+l+'</small><b'+(cls?' class="'+cls+'"':'')+'>'+nis(v)+'</b></div>'};
  var blk=function(v,title){return '<small class="m"><b>'+title+'</b> · '+vatLabel(v.r)+'</small>'+row('מע״מ על ההכנסות (עסקאות)',v.out)+row('מע״מ על ההוצאות (תשומות)',v.inp)+
    row(v.due>=0?'לתשלום':'החזר צפוי',Math.abs(v.due),v.due>0?'owe':'')};
  return '<h2>מע״מ</h2><div class="card" id="vatCard">'+blk(cur,'התקופה הנוכחית (עד היום)')+
    '<div style="border-top:1px solid var(--bg);margin:8px 0"></div>'+blk(prev,'התקופה הקודמת')+
    '<p style="margin:4px 0"><small class="m">דיווח ותשלום עד <b>'+fmt(ds(prev.deadline))+'</b></small></p>'+
    '<small class="m" style="font-size:12px">הערכה בלבד: מע״מ '+Math.round(vatR()*1000)/10+'%, '+(S.vatInc==='inc'?'הסכומים בימי העבודה כוללים מע״מ':'הסכומים בימי העבודה לפני מע״מ')+
    ', לפי '+(S.cb==='paid'?'תאריך התשלום':'תאריך העבודה')+'. הוצאות נחשבות כוללות מע״מ, חוץ ממה שסימנת "בלי מע״מ". רכב, טלפון ומתנות מוכרים רק בחלקם; רואה החשבון קובע.</small></div>'}

/* ---------- pension + keren hishtalmut ---------- */
function pnDepL(){return (Array.isArray(S.pnDep)?S.pnDep:[]).filter(function(x){return x&&+x.a>0&&/^\d{4}-\d{2}-\d{2}$/.test(x.d||'')})}
function pnDepY(y,k){var t=0;pnDepL().forEach(function(x){if(+x.d.slice(0,4)===y&&(x.k==='kh'?'kh':'pn')===k)t+=c100(x.a)});return t/100}
function pnAge(){var d=S.dob;if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return null;var b=new Date(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10)),n=new Date(),a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--;return a}
/* P = yearly profit; pn / kh = this year's deposits. Returns the mandatory pension, deductible amounts and the income-tax saving. */
function pnCalc(P,pn,kh,pts,R){R=R||taxRates().R;P=Math.max(+P||0,0);pn=Math.max(+pn||0,0);kh=Math.max(+kh||0,0);var m=P/12,
  must=(Math.min(m,R.pnHalf)*R.pnLow+Math.max(Math.min(m,R.pnAvg)-R.pnHalf,0)*R.pnHigh)*12,
  Q=Math.min(P,R.pnQ),ded=Math.min(pn,R.pnDedR*Q),cr=.35*Math.min(Math.max(pn-ded,0),R.pnCrR*Q),
  khDed=Math.min(kh,R.khR*Math.min(P,R.khMax),R.khDed),c=taxCalc(P,pts,R),tx=Math.max(P-c.ni*R.niDed,0),
  after=Math.max(taxBr(Math.max(tx-ded-khDed,0),R)-(pts==null?2.25:pts)*R.pt-cr,0),save=Math.max(c.it-after,0);
  return {must:must,ded:ded,cr:cr,khDed:khDed,khMaxDed:Math.min(R.khR*Math.min(P,R.khMax),R.khDed),khFree:R.khFree,save:save,pnBest:R.pnDedR*Q+R.pnCrR*Q}}
function pnInfo(){var t=taxInfo(),y=t.r.s.getFullYear(),pn=pnDepY(y,'pn'),kh=pnDepY(y,'kh'),c=pnCalc(t.P,pn,kh,taxPts(),t.tr.R),age=pnAge();
  return {y:y,P:t.P,pn:pn,kh:kh,c:c,age:age,mustApply:age==null||(age>=21&&age<60),late:new Date().getMonth()>=10}}
function pnCard(){if(S.pnOn===false)return '';var i=pnInfo(),c=i.c,miss=Math.max(c.must-i.pn,0);
  var row=function(l,v,cls){return '<div class="top" style="margin:4px 0"><small class="m">'+l+'</small><b'+(cls==='ok'?' style="color:var(--ok)"':cls?' class="'+cls+'"':'')+'>'+nis(v)+'</b></div>'};
  return '<h2>פנסיה וקרן השתלמות</h2><div class="card" id="pnCard">'+
    row('הפקדות לפנסיה השנה',Math.round(i.pn))+
    (i.mustApply?row('חובה לשנה לפי הרווח (בערך)',Math.round(c.must))+(miss>0?row('חסר להשלמת החובה',Math.round(miss),'owe'):''):'<p class="m" style="margin:4px 0"><small>לפי תאריך הלידה בהגדרות, חובת הפקדה לפנסיה לא חלה עליך (גילאי 21–60).</small></p>')+
    row('הפקדות לקרן השתלמות השנה',Math.round(i.kh))+
    (i.P?row('קרן השתלמות: מוכר לניכוי עד',Math.round(c.khMaxDed))+row('קרן השתלמות: תקרה עם רווחים פטורים',c.khFree):'')+
    (c.save?row('חיסכון משוער במס הכנסה מההפקדות',Math.round(c.save),'ok'):'')+
    (i.late&&(miss>0||i.kh<c.khMaxDed)?'<p id="pnLate" class="owe" style="margin:6px 0"><small>הפקדה עד 31.12 נספרת לשנה הזו.</small></p>':'')+
    '<button class="ghost full" id="pnBtn" onclick="pnSheet()" style="margin:8px 0">רישום הפקדה</button>'+
    '<small class="m" style="font-size:12px">הערכה כללית בלבד: לפי הרווח בקצב הנוכחי ותקרות השנה. ההטבה בפועל תלויה גם בביטוח אובדן כושר עבודה ובהכנסות אחרות. בעל הקופה ורואה החשבון קובעים.</small></div>'}
function pnSheet(){var y=new Date().getFullYear(),l=pnDepL().filter(function(x){return +x.d.slice(0,4)===y}).sort(function(a,b){return b.d.localeCompare(a.d)}),kn={pn:'פנסיה',kh:'קרן השתלמות'};
  $('sheetBody').innerHTML='<b>רישום הפקדה</b><small class="m">הפקדה שעשית לקרן הפנסיה או לקרן ההשתלמות.</small>'+
    '<label for="pdA">סכום (₪)</label><input id="pdA" type="number" inputmode="decimal" min="0" step="1"><label for="pdD">תאריך ההפקדה</label><input id="pdD" type="date" value="'+today()+'">'+
    '<label for="pdK">לאן</label><select id="pdK" style="width:100%"><option value="pn">פנסיה</option><option value="kh">קרן השתלמות</option></select><div id="pdE" class="owe" role="alert"></div>'+
    '<button onclick="pnAdd()">שמירה</button>'+
    (l.length?'<small class="m">הופקד בשנת '+y+':</small>'+l.map(function(x){return '<div class="top pdRow"><small>'+fmt(x.d)+' · '+kn[x.k==='kh'?'kh':'pn']+' · <b>'+nis(x.a)+'</b></small><button class="ghost" style="width:auto;padding:4px 10px" onclick="pnDel('+x.id+')">מחיקה</button></div>'}).join(''):'')+
    '<button class="ghost" onclick="closeS()">סגירה</button>';$('sheet').hidden=false}
function pnAdd(){var a=c100($('pdA').value)/100,d=$('pdD').value||today(),k=$('pdK').value==='kh'?'kh':'pn';if(!(a>0)){$('pdE').textContent='הזן סכום גדול מאפס';return $('pdA').focus()}
  if(a>10000000){$('pdE').textContent='הסכום גבוה מדי';return}S.pnDep=pnDepL().concat([{id:uid(),d:d,a:a,k:k}]);save();render();pnSheet()}
function pnDel(id){S.pnDep=pnDepL().filter(function(x){return x.id!==id});save();render();pnSheet()}

/* ---------- work days to a calendar file (.ics) ---------- */
function icsEsc(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
/* fold lines at 70 UTF-8 bytes (RFC 5545 asks for 75), never inside a character */
function icsFold(l){var out=[],cur='',n=0;Array.from(l).forEach(function(ch){var b=unescape(encodeURIComponent(ch)).length;if(n+b>70){out.push(cur);cur=' ';n=1}cur+=ch;n+=b});out.push(cur);return out.join('\r\n')}
function icsDays(range){var td=today(),from=range==='all'?'':range==='30'?ds(new Date(Date.now()-30*864e5)):td;
  return S.entries.filter(function(e){return /^\d{4}-\d{2}-\d{2}$/.test(e.date||'')&&e.date>=from&&String(e.note||'').indexOf('בוטל ב-Find Medic')<0}).sort(function(a,b){return a.date.localeCompare(b.date)||(a.t1||'').localeCompare(b.t1||'')})}
function icsText(list){var st=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,''),hm=/^([01]\d|2[0-3]):[0-5]\d$/,L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Easy Record//HE','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Easy Record'];
  list.forEach(function(e){var d=e.date.replace(/-/g,''),c=cl(e.cid),nm=(c&&c.name)||'יום עבודה',ev=['BEGIN:VEVENT','UID:er-'+e.id+'@easyrecord','DTSTAMP:'+st];
    if(hm.test(e.t1||'')&&hm.test(e.t2||'')){var a=e.date.split('-'),end=new Date(+a[0],a[1]-1,+a[2]);if(e.t2<=e.t1)end.setDate(end.getDate()+1);
      ev.push('DTSTART:'+d+'T'+e.t1.replace(':','')+'00','DTEND:'+ds(end).replace(/-/g,'')+'T'+e.t2.replace(':','')+'00')}
    else{var b=e.date.split('-'),nx=new Date(+b[0],b[1]-1,+b[2]+1);ev.push('DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+ds(nx).replace(/-/g,''))}
    ev.push('SUMMARY:'+icsEsc(nm),'DESCRIPTION:'+icsEsc('סכום: '+nis(e.amount)+(e.note?'\n'+e.note:'')),'END:VEVENT');L=L.concat(ev)});
  L.push('END:VCALENDAR');return L.map(icsFold).join('\r\n')+'\r\n'}
function icsGo(){var r=($('icsR')||{}).value||'future',l=icsDays(r);if(!l.length)return info(r==='future'?'אין ימי עבודה מהיום והלאה. אפשר לבחור "30 הימים האחרונים והלאה" או "הכול".':'אין ימי עבודה לייצוא');
  dl('easy-record-calendar-'+today()+'.ics',new Blob([icsText(l)],{type:'text/calendar;charset=utf-8'}))}

/* ---------- settings ---------- */
function vpSetVals(){var v=$('svat');if(!v)return;v.value=S.vatOn?'on':'off';$('svatW').hidden=!S.vatOn;var r=$('svatR');if(document.activeElement!==r)r.value=Math.round(vatR()*1000)/10;
  $('svatI').value=S.vatInc==='inc'?'inc':'exc';$('svatP').value=String(vatPer());$('spn').value=S.pnOn===false?'off':'on'}
try{$('svat').onchange=function(){S.vatOn=this.value==='on';save();vpSetVals();render()};
  $('svatR').onchange=function(){var p=parseFloat(this.value);S.vatR=isFinite(p)&&p>=0&&p<=50?p:18;this.value=S.vatR;try{delete DIRTY[fKey(this)]}catch(e){}save();render()};
  $('svatI').onchange=function(){S.vatInc=this.value==='inc'?'inc':'exc';save();render()};
  $('svatP').onchange=function(){S.vatPer=this.value==='1'?1:2;save();render()};
  $('spn').onchange=function(){S.pnOn=this.value!=='off';save();vpSetVals();render()}}catch(e){}
