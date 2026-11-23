/* ---- "money to set aside" for income tax + National Insurance (self-employed, Israel) ----
   A rough estimate for planning only: profit this tax year (turnover on the same basis as the ceiling card, minus expenses),
   projected to a full year, then 2026 income-tax brackets minus credit points, and Bituach Leumi + health insurance at the
   self-employed rates. Not tax advice: no VAT, pension, other income, or special credits are taken into account.
   Sources (checked 23.11.2026): btl.gov.il self-employed rates from 1.1.2026; 2026 brackets and credit point as published
   for the 2026 tax year (₪242 a month). */
var TAX26={y:2026,pt:2904,
  br:[[84120,.10],[120720,.14],[228000,.20],[301200,.31],[560280,.35],[721560,.47],[Infinity,.50]],
  blLow:7703,blMax:51910,niLow:.0447,hiLow:.0323,niHigh:.1283,hiHigh:.0517,niDed:.52};
function taxBr(x){var t=0,lo=0;TAX26.br.forEach(function(b){if(x>lo)t+=(Math.min(x,b[0])-lo)*b[1];lo=b[0]});return t}
/* yearly profit -> {ni, hi, it, total} (₪ a year). National Insurance on monthly profit; 52% of the NI part (not health)
   is deducted from taxable income, as the tax rules allow the self-employed. */
function taxCalc(P,pts){P=Math.max(+P||0,0);var m=P/12,lo=Math.min(m,TAX26.blLow),hi=Math.max(Math.min(m,TAX26.blMax)-TAX26.blLow,0),
  ni=(lo*TAX26.niLow+hi*TAX26.niHigh)*12,h=(lo*TAX26.hiLow+hi*TAX26.hiHigh)*12,
  it=Math.max(taxBr(Math.max(P-ni*TAX26.niDed,0))-(pts==null?2.25:pts)*TAX26.pt,0);
  return {ni:ni,hi:h,it:it,total:ni+h+it}}
function taxPts(){var p=parseFloat(S.txPts);return isFinite(p)&&p>=0&&p<=20?p:2.25}
function taxInfo(){var now=new Date(),r=fyRange(now),inc=0,exp=0;
  function inR(s){var a=(s||'').split('-'),dt=new Date(+a[0],a[1]-1,+a[2]);return dt>=r.s&&dt<r.e&&dt<=now}
  if(S.cb==='paid')S.pays.forEach(function(p){if(inR(p.date))inc+=+p.amount||0});else S.entries.forEach(function(e){if(inR(e.date))inc+=+e.amount||0});
  (S.expenses||[]).forEach(function(x){if(inR(x.date))exp+=+x.amount||0});
  var prof=Math.max(inc-exp,0),mo=Math.min(Math.max((now-r.s)/(864e5*30.44),1),12),  // at least one month, so early-year numbers don't explode
      P=prof/mo*12,c=taxCalc(P,taxPts()),sofar=c.total*mo/12;
  return {inc:inc,exp:exp,prof:prof,P:P,c:c,sofar:sofar,month:c.total/12,rate:P?c.total/P*100:0,r:r}}
function taxCard(){if(S.txOn===false)return '';var t=taxInfo(),y=t.r.s.getFullYear(),c=t.c;
  var row=function(l,v){return '<div class="top" style="margin:4px 0"><small class="m">'+l+'</small><b>'+nis(v)+'</b></div>'};
  return '<h2>כמה לשים בצד למס</h2><div class="card" id="taxCard"><div class="top"><div><small class="m">שנת מס '+y+(S.fy?'/'+t.r.e.getFullYear():'')+' · עד היום</small><div class="amt" style="font-size:26px">'+nis(Math.round(t.sofar))+'</div></div><div class="l"><b style="font-size:22px">'+nis(Math.round(t.month))+'</b><br><small class="m">בערך לחודש</small></div></div>'+
    (t.prof?row('רווח עד היום (הכנסות פחות הוצאות)',Math.round(t.prof))+row('צפי רווח לשנה בקצב הנוכחי',Math.round(t.P))+
      '<div style="border-top:1px solid var(--bg);margin:8px 0"></div><small class="m">פירוט לשנה שלמה:</small>'+
      row('מס הכנסה',Math.round(c.it))+row('ביטוח לאומי',Math.round(c.ni))+row('מס בריאות',Math.round(c.hi))+
      '<p style="margin:6px 0 0"><small class="m">בערך <bdi dir="ltr">'+Math.round(t.rate)+'%</bdi> מהרווח</small></p>'
      :'<p class="m" style="margin:8px 0 0">עדיין אין הכנסות בשנת המס הזו.</p>')+
    '<small class="m" style="font-size:12px">הערכה כללית בלבד ולא ייעוץ מס: לפי מדרגות '+TAX26.y+', '+taxPts()+' נקודות זיכוי ושיעורי ביטוח לאומי לעצמאי. לא כולל מע״מ, פנסיה או הכנסות אחרות. רואה החשבון קובע את המקדמות בפועל. אפשר לשנות נקודות זיכוי בהגדרות.</small></div>'}
