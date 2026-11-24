/* ---- "money to set aside" for income tax + National Insurance (self-employed, Israel) ----
   A rough estimate for planning only: profit this tax year (turnover on the same basis as the ceiling card, minus expenses),
   projected to a full year, then 2026 income-tax brackets minus credit points, and Bituach Leumi + health insurance at the
   self-employed rates. Not tax advice: no VAT, pension, other income, or special credits are taken into account.
   Sources (checked 23.11.2026): btl.gov.il self-employed rates from 1.1.2026; 2026 brackets and credit point as published
   for the 2026 tax year (₪242 a month). */
/* rates by tax year. A new year gets its own entry once the brackets and BTL rates are published; until then the newest
   known year is used and the card says so (taxRates().stale). */
var TAX26={y:2026,pt:2904,
  br:[[84120,.10],[120720,.14],[228000,.20],[301200,.31],[560280,.35],[721560,.47],[Infinity,.50]],
  blLow:7703,blMax:51910,niLow:.0447,hiLow:.0323,niHigh:.1283,hiHigh:.0517,niDed:.52,
  pnHalf:6884.5,pnAvg:13769,pnLow:.0445,pnHigh:.1255,pnQ:232800,pnDedR:.11,pnCrR:.055,khR:.045,khMax:293397,khDed:13203,khFree:20566};
var TAXR={2026:TAX26};
function taxRates(y){y=y||new Date().getFullYear();var ks=Object.keys(TAXR).map(Number).sort(),k=ks[0];ks.forEach(function(x){if(x<=y)k=x});return {R:TAXR[k],y:k,stale:y>k}}
function taxBr(x,R){R=R||taxRates().R;var t=0,lo=0;R.br.forEach(function(b){if(x>lo)t+=(Math.min(x,b[0])-lo)*b[1];lo=b[0]});return t}
/* yearly profit -> {ni, hi, it, total} (₪ a year). National Insurance on monthly profit; 52% of the NI part (not health)
   is deducted from taxable income, as the tax rules allow the self-employed. */
function taxCalc(P,pts,R){R=R||taxRates().R;P=Math.max(+P||0,0);var m=P/12,lo=Math.min(m,R.blLow),hi=Math.max(Math.min(m,R.blMax)-R.blLow,0),
  ni=(lo*R.niLow+hi*R.niHigh)*12,h=(lo*R.hiLow+hi*R.hiHigh)*12,
  it=Math.max(taxBr(Math.max(P-ni*R.niDed,0),R)-(pts==null?2.25:pts)*R.pt,0);
  return {ni:ni,hi:h,it:it,total:ni+h+it}}
function taxPts(){var p=parseFloat(S.txPts);return isFinite(p)&&p>=0&&p<=20?p:2.25}
/* advance payments already made this year (setting txPaid: [{id,d,a,k}] k='it' income tax / 'ni' National Insurance+health) */
function taxPaidL(){return (Array.isArray(S.txPaid)?S.txPaid:[]).filter(function(x){return x&&+x.a>0&&/^\d{4}-\d{2}-\d{2}$/.test(x.d||'')})}
function taxPaidY(y){var t=0;taxPaidL().forEach(function(x){if(+x.d.slice(0,4)===y)t+=c100(x.a)});return t/100}
/* the income-tax year of a self-employed person is always the calendar year, whatever "start of tax year" says (that setting
   is for the VAT-exempt ceiling) */
function taxInfo(){var now=new Date(),y=now.getFullYear(),r={s:new Date(y,0,1),e:new Date(y+1,0,1)},inc=0,exp=0,tr=taxRates(y);
  function inR(s){var a=(s||'').split('-'),dt=new Date(+a[0],a[1]-1,+a[2]);return dt>=r.s&&dt<r.e&&dt<=now}
  var nI=function(a){return S.vatOn?vatSplitInc(a).net:+a||0},nX=function(x){return S.vatOn?vatSplitExp(x).net:+x.amount||0};  // with VAT on: profit without the VAT
  if(S.cb==='paid')S.pays.forEach(function(p){if(inR(p.date))inc+=nI(p.amount)});else S.entries.forEach(function(e){if(inR(e.date))inc+=nI(e.amount)});
  (S.expenses||[]).forEach(function(x){if(inR(x.date))exp+=nX(x)});
  var prof=Math.max(inc-exp,0),mo=Math.min(Math.max((now-r.s)/(864e5*30.44),1),12),  // at least one month, so early-year numbers don't explode
      P=prof/mo*12,c=taxCalc(P,taxPts(),tr.R),sofar=c.total*mo/12,paid=taxPaidY(y);
  return {inc:inc,exp:exp,prof:prof,P:P,c:c,sofar:sofar,month:c.total/12,rate:P?c.total/P*100:0,r:r,tr:tr,paid:paid,left:Math.max(sofar-paid,0)}}
function taxCard(){if(S.txOn===false)return '';var t=taxInfo(),y=t.r.s.getFullYear(),c=t.c;
  var row=function(l,v,cls){return '<div class="top" style="margin:4px 0"><small class="m">'+l+'</small><b'+(cls?' class="'+cls+'"':'')+'>'+nis(v)+'</b></div>'};
  return '<h2>כמה לשים בצד למס</h2><div class="card" id="taxCard"><div class="top"><div><small class="m">שנת מס '+y+' · עד היום</small><div class="amt" style="font-size:26px">'+nis(Math.round(t.sofar))+'</div></div><div class="l"><b style="font-size:22px">'+nis(Math.round(t.month))+'</b><br><small class="m">בערך לחודש</small></div></div>'+
    (t.tr.stale?'<p id="taxStale" class="owe" style="margin:6px 0"><small>שיעורי המס של '+y+' עוד לא עודכנו באפליקציה. בינתיים החישוב לפי שיעורי '+t.tr.y+'.</small></p>':'')+
    (t.paid?'<div id="taxPaidBox">'+row('מקדמות ששולמו השנה',Math.round(t.paid))+row('נשאר לשים בצד עד היום',Math.round(t.left),'owe')+'</div>':'')+
    (t.prof?row('רווח עד היום (הכנסות פחות הוצאות)',Math.round(t.prof))+row('צפי רווח לשנה בקצב הנוכחי',Math.round(t.P))+
      '<div style="border-top:1px solid var(--bg);margin:8px 0"></div><small class="m">פירוט לשנה שלמה:</small>'+
      row('מס הכנסה',Math.round(c.it))+row('ביטוח לאומי',Math.round(c.ni))+row('מס בריאות',Math.round(c.hi))+
      '<p style="margin:6px 0 0"><small class="m">בערך <bdi dir="ltr">'+Math.round(t.rate)+'%</bdi> מהרווח</small></p>'
      :'<p class="m" style="margin:8px 0 0">עדיין אין הכנסות בשנת המס הזו.</p>')+
    '<button class="ghost full" id="taxPaidBtn" onclick="taxPaidSheet()" style="margin:8px 0">רישום מקדמה ששולמה</button>'+
    '<small class="m" style="font-size:12px">הערכה כללית בלבד ולא ייעוץ מס: לפי מדרגות '+t.tr.y+', '+taxPts()+' נקודות זיכוי ושיעורי ביטוח לאומי לעצמאי. לא כולל מע״מ, פנסיה או הכנסות אחרות. רואה החשבון קובע את המקדמות בפועל. אפשר לשנות נקודות זיכוי בהגדרות.</small></div>'}
/* sheet: record an advance payment (income tax or National Insurance) and see / delete this year's ones */
function taxPaidSheet(){var y=new Date().getFullYear(),l=taxPaidL().filter(function(x){return +x.d.slice(0,4)===y}).sort(function(a,b){return b.d.localeCompare(a.d)}),kn={it:'מס הכנסה',ni:'ביטוח לאומי ובריאות'};
  $('sheetBody').innerHTML='<b>רישום מקדמה ששולמה</b><small class="m">מקדמה ששילמת למס הכנסה או לביטוח לאומי. היא יורדת מהסכום שנשאר לשים בצד.</small>'+
    '<label for="tpA">סכום (₪)</label><input id="tpA" type="number" inputmode="decimal" min="0" step="1"><label for="tpD">תאריך התשלום</label><input id="tpD" type="date" value="'+today()+'">'+
    '<label for="tpK">למי שולם</label><select id="tpK" style="width:100%"><option value="it">מס הכנסה</option><option value="ni">ביטוח לאומי ובריאות</option></select><div id="tpE" class="owe" role="alert"></div>'+
    '<button onclick="taxPaidAdd()">שמירה</button>'+
    (l.length?'<small class="m">שולם בשנת '+y+':</small>'+l.map(function(x){return '<div class="top tpRow"><small>'+fmt(x.d)+' · '+kn[x.k==='ni'?'ni':'it']+' · <b>'+nis(x.a)+'</b></small><button class="ghost" style="width:auto;padding:4px 10px" onclick="taxPaidDel('+x.id+')">מחיקה</button></div>'}).join(''):'')+
    '<button class="ghost" onclick="closeS()">סגירה</button>';$('sheet').hidden=false}
function taxPaidAdd(){var a=c100($('tpA').value)/100,d=$('tpD').value||today(),k=$('tpK').value==='ni'?'ni':'it';if(!(a>0)){$('tpE').textContent='הזן סכום גדול מאפס';return $('tpA').focus()}
  if(a>10000000){$('tpE').textContent='הסכום גבוה מדי';return}S.txPaid=taxPaidL().concat([{id:uid(),d:d,a:a,k:k}]);save();render();taxPaidSheet()}
function taxPaidDel(id){S.txPaid=taxPaidL().filter(function(x){return x.id!==id});save();render();taxPaidSheet()}
