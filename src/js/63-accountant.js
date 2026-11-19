/* Yearly export for the accountant: one ZIP with an Excel workbook (summary, income by work day, payments received, expenses, expenses by category, by client) and the year's receipt files.
   The tax year follows the "tax year start" setting (S.fy). Internal summary only, not accounting or tax advice. */
function accRange(y){var m=S.fy||0;return {s:new Date(y,m,1),e:new Date(y+1,m,1),label:m?y+'-'+(y+1):String(y)}}
function accIn(r,s){var a=String(s||'').split('-');if(a.length<3)return false;var d=new Date(+a[0],a[1]-1,+a[2]);return d>=r.s&&d<r.e}
function accFill(){var el=$('accY');if(!el||el.options.length)return;var now=new Date(),cur=fyRange(now).s.getFullYear(),h='';
  for(var k=Math.max(2020,cur-6);k<=cur;k++)h+='<option value="'+k+'"'+(k===cur?' selected':'')+'>'+accRange(k).label+'</option>';el.innerHTML=h}
function accData(y){var r=accRange(y),c2=function(n){return Math.round((+n||0)*100)/100};
  var es=S.entries.filter(function(e){return accIn(r,e.date)}).sort(function(a,b){return a.date.localeCompare(b.date)}),
    ps=S.pays.filter(function(p){return accIn(r,p.date)}).sort(function(a,b){return a.date.localeCompare(b.date)}),
    xs=(S.expenses||[]).filter(function(x){return accIn(r,x.date)}).sort(function(a,b){return a.date.localeCompare(b.date)}),
    rc=(typeof R!=='undefined'&&R||[]).filter(function(f){return f.kind!=='voice'&&!/^audio\//.test(f.type||'')&&accIn(r,f.date)});
  var T=0,P=0,B=0,D=0,X=0,cat={},cli={};
  es.forEach(function(e){T+=c100(e.amount);B+=c100(e.bl);D+=+e.days||0;var o=cli[e.cid]||(cli[e.cid]={t:0,p:0,d:0});o.t+=c100(e.amount);o.d+=+e.days||0});
  ps.forEach(function(p){P+=c100(p.amount);var o=cli[p.cid]||(cli[p.cid]={t:0,p:0,d:0});o.p+=c100(p.amount)});
  xs.forEach(function(x){X+=c100(x.amount);cat[x.cat||'אחר']=(cat[x.cat||'אחר']||0)+c100(x.amount)});
  var title='Easy Record · '+(S.fy?'שנת מס ':'שנת ')+r.label,nm=[S.fname,S.lname].filter(Boolean).join(' ');
  var summary=[[title],[nm?'שם: '+nm:''],['הופק ב-'+fmt(today())+' · '+(S.fy?'שנת המס מתחילה ב'+MN[S.fy]:'ינואר עד דצמבר')],[],
    ['נושא','סכום (₪)'],
    ['הכנסות לפי תאריך העבודה',T/100],
    ['תקבולים (כסף שהתקבל בפועל לפי תאריך התשלום)',P/100],
    ['יתרה פתוחה מעבודות השנה',B/100],
    ['הוצאות',X/100],
    ['רווח (הכנסות לפי עבודה פחות הוצאות)',(T-X)/100],
    ['רווח לפי תקבולים (תקבולים פחות הוצאות)',(P-X)/100],[],
    ['ימי עבודה',c2(D)],['רישומי עבודה',es.length],['תשלומים',ps.length],['הוצאות',xs.length],['קבלות מצורפות',rc.length],[],
    ['סיכום פנימי מתוך האפליקציה. זה לא דוח חשבונאי ולא ייעוץ מס.']];
  var inc=[['תאריך','לקוח','ימים','שעות','סכום','שולם','יתרה','הערה']].concat(es.map(function(e){var h=eh(e);return [e.date,cl(e.cid).name,+e.days||0,h?+h.toFixed(2):'',c2(e.amount),c2(e.pa),c2(e.bl),e.note||'']}),[[],['סה״כ','','',  '',T/100,'',B/100,'']]);
  var pay=[['תאריך','לקוח','סכום','אופן תשלום','הערה']].concat(ps.map(function(p){return [p.date,cl(p.cid).name,c2(p.amount),p.method||'',p.note||'']}),[[],['סה״כ','',P/100,'','']]);
  var exp=[['תאריך','קטגוריה','סכום','לקוח','הערה']].concat(xs.map(function(x){return [x.date,x.cat||'אחר',c2(x.amount),x.cid?cl(x.cid).name:'',x.note||'']}),[[],['סה״כ','',X/100,'','']]);
  var ck=Object.keys(cat).sort(function(a,b){return cat[b]-cat[a]}),byCat=[['קטגוריה','סכום','אחוז']].concat(ck.map(function(k){return [k,cat[k]/100,X?Math.round(cat[k]/X*1000)/10:0]}),[[],['סה״כ',X/100,X?100:0]]);
  var lk=Object.keys(cli).sort(function(a,b){return cli[b].t-cli[a].t}),byCli=[['לקוח','ימי עבודה','הכנסות לפי עבודה','תקבולים']].concat(lk.map(function(k){var o=cli[k];return [cl(+k).name,c2(o.d),o.t/100,o.p/100]}));
  return {r:r,label:r.label,receipts:rc,count:es.length+ps.length+xs.length,
    sheets:[{name:'סיכום',rows:summary,widths:[6,2]},{name:'הכנסות',rows:inc,widths:[2,3,1,1,2,2,2,4]},{name:'תקבולים',rows:pay,widths:[2,3,2,2,4]},{name:'הוצאות',rows:exp,widths:[2,3,2,3,4]},{name:'הוצאות לפי קטגוריה',rows:byCat,widths:[3,2,1]},{name:'לפי לקוח',rows:byCli,widths:[3,2,2,2]}]}}
async function accGo(){var el=$('accY'),y=+(el&&el.value)||fyRange(new Date()).s.getFullYear(),A=accData(y),btn=$('accBtn');
  if(!A.count&&!A.receipts.length)return info('אין נתונים בשנה הזו');if(!window.JSZip)return info('רכיב ה-ZIP עוד לא נטען. נסה שוב בעוד רגע.');
  if(btn){btn.disabled=true;btn.textContent='מכין את הקובץ...'}
  try{var list=A.receipts,miss=0;if(list.length&&typeof rcEnsureAll==='function'){miss=await rcEnsureAll(list);list=list.filter(function(f){return f.blob})}
    var z=new JSZip(),base='easy-record-'+A.label;z.file(base+'.xlsx',await xlsxBook(A.sheets));
    var seen={};list.slice().sort(function(a,b){return a.date.localeCompare(b.date)}).forEach(function(f){var k='receipts/'+safe(cl(f.cid).name)+'/'+f.date+'_'+safe(f.name);if(seen[k]){seen[k]++;k=k.replace(/(\.[^.\/]*)?$/,'_'+seen[k]+'$1')}else seen[k]=1;z.file(k,f.blob)});
    z.file('קרא אותי.txt','﻿'+['Easy Record · '+(S.fy?'שנת מס ':'שנת ')+A.label,'',base+'.xlsx: גיליונות סיכום, הכנסות, תקבולים, הוצאות, הוצאות לפי קטגוריה ולפי לקוח.','receipts/: קבצי הקבלות של השנה, לפי לקוח.'+(miss?' ('+miss+' קבלות לא הורדו מהענן ולא נכללו.)':''),'','סיכום פנימי מתוך האפליקציה. זה לא דוח חשבונאי ולא ייעוץ מס.'].join('\r\n'));
    await dl(base+'-accountant.zip',await z.generateAsync({type:'blob',compression:'DEFLATE'}));
    if(miss)info(miss+' קבלות לא הורדו מהענן ולא נכללו בקובץ. בדוק את החיבור ונסה שוב.')}
  catch(e){info('יצירת הקובץ נכשלה: '+(e&&e.message||e))}
  finally{if(btn){btn.disabled=false;btn.textContent='הורדת קובץ לרואה החשבון'}}}
