/* "אני חייב": debts I owe to other people. One synced record per debt (type 'd'): {id,name,amount,date,due,note,pays:[{id,date,amt,note}]}. Money is summed in integer cents. */
var PSUB='in',DFILT='open';
function debtPaid(d){return (d.pays||[]).reduce(function(s,p){return s+c100(p.amt)},0)/100}
function debtBal(d){return Math.max(0,c100(d.amount)-c100(debtPaid(d)))/100}
function debtGet(id){return (S.debts||[]).find(function(x){return x.id===id})}
function debtOver(d){return debtBal(d)>0&&d.due&&d.due<today()}
function debtAdd(){var n=$('dbN').value.replace(/\s+/g,' ').trim(),a=c100($('dbA').value)/100,dt=$('dbD').value||today(),due=$('dbDue').value||'',er=$('dbErr');er.textContent='';
  if(!n){er.textContent='כתוב למי אתה חייב';return $('dbN').focus()}if(!(a>0)){er.textContent='הזן סכום גדול מאפס';return $('dbA').focus()}if(due&&due<dt){er.textContent='תאריך הפירעון לא יכול להיות לפני תאריך החוב';return}
  S.debts=S.debts||[];S.debts.push({id:uid(),name:n,amount:a,date:dt,due:due,note:$('dbNote').value.trim(),pays:[]});$('dbN').value=$('dbA').value=$('dbDue').value=$('dbNote').value='';save();render()}
var LASTDP={k:'',t:0};
function debtPay(id,amt,date,note){var d=debtGet(id);if(!d)return 'לא נמצא';var c=c100(amt);if(!(c>0))return 'הזן סכום גדול מאפס';if(c>c100(debtBal(d)))return 'הסכום גבוה מהיתרה ('+nis(debtBal(d))+')';
  var k=id+'|'+c+'|'+(date||'')+'|'+(note||''),now=Date.now();if(LASTDP.k===k&&now-LASTDP.t<3000)return '';LASTDP={k:k,t:now};
  d.pays=(d.pays||[]).concat([{id:uid(),date:date||today(),amt:c/100,note:note||''}]);return ''}
function debtPayAll(id){var d=debtGet(id);if(!d||!(debtBal(d)>0))return;debtPay(id,debtBal(d),today(),'');save();render()}
function debtPart(id){var d=debtGet(id);if(!d)return;$('sheetBody').innerHTML='<b>שילמתי חלק ל'+esc(d.name)+'</b><small class="m">יתרה: '+nis(debtBal(d))+' מתוך '+nis(d.amount)+'</small><label for="dpA">כמה שילמתי (₪)</label><input id="dpA" type="number" inputmode="decimal"><label for="dpD">תאריך</label><input id="dpD" type="date" value="'+today()+'"><label for="dpN">הערה</label><input id="dpN"><div id="dpE" class="owe"></div><button onclick="debtPartGo('+id+')">שמירה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function debtPartGo(id){var e=debtPay(id,$('dpA').value,$('dpD').value,$('dpN').value.trim());if(e){$('dpE').textContent=e;return}closeS();save();render()}
function debtPayDel(id,pid){var d=debtGet(id);if(!d)return;cf('לבטל את התשלום הזה? היתרה תחושב מחדש.',function(){d.pays=(d.pays||[]).filter(function(p){return p.id!==pid});save();render()})}
function debtDel(id){var d=debtGet(id);if(!d)return;cf('למחוק את החוב ל'+d.name+' ('+nis(d.amount)+')?',function(){S.debts.splice(S.debts.indexOf(d),1);tombAdd('d',d);save();render()})}
function debtEdit(id){var d=debtGet(id);if(!d)return;$('sheetBody').innerHTML='<b>עריכת חוב</b><label for="deN">למי</label><input id="deN" value="'+qa(d.name)+'"><label for="deA">סכום (₪)</label><input id="deA" type="number" inputmode="decimal" value="'+d.amount+'"><label for="deD">תאריך החוב</label><input id="deD" type="date" value="'+d.date+'"><label for="deU">לשלם עד</label><input id="deU" type="date" value="'+(d.due||'')+'"><label for="deT">על מה?</label><input id="deT" value="'+qa(d.note||'')+'"><div id="deE" class="owe"></div><button onclick="debtEditGo('+id+')">שמירה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function debtEditGo(id){var d=debtGet(id),n=$('deN').value.replace(/\s+/g,' ').trim(),a=c100($('deA').value)/100;if(!d)return;if(!n){$('deE').textContent='חסר שם';return}if(!(a>0)){$('deE').textContent='הזן סכום גדול מאפס';return}if(c100(a)<c100(debtPaid(d))){$('deE').textContent='הסכום קטן ממה שכבר שולם ('+nis(debtPaid(d))+')';return}
  d.name=n;d.amount=a;d.date=$('deD').value||d.date;d.due=$('deU').value||'';d.note=$('deT').value.trim();closeS();save();render()}
function pSub(k){PSUB=k;render()}
function rDebts(){var pi=$('payIn'),po=$('payOut');if(!pi||!po)return;pi.hidden=PSUB!=='in';po.hidden=PSUB!=='out';var px=$('payExp');if(px){px.hidden=PSUB!=='exp';try{rExp()}catch(e){}}[].forEach.call($('ptabs').children,function(b){b.className=b.dataset.p===PSUB?'on':''});
  var L=S.debts||[],tot=0,paid=0,od=0;L.forEach(function(d){tot+=c100(d.amount);paid+=Math.min(c100(d.amount),c100(debtPaid(d)));if(debtOver(d))od++});
  var ob=$('ptabs').children[1];if(ob)ob.textContent='אני חייב'+(tot-paid>0?' · '+nis((tot-paid)/100):'');
  if(PSUB!=='out')return;
  $('dOwe').textContent=nis((tot-paid)/100);$('dPaid').textContent=nis(paid/100);$('dTot').textContent=nis(tot/100);var b=$('dOd');b.hidden=!od;b.textContent=od?'⏰ '+od+' חובות עברו את תאריך הפירעון':'';
  if(!$('dbD').value)$('dbD').value=today();
  var names={};L.forEach(function(d){names[d.name]=1});S.clients.forEach(function(c){if(!c.arch)names[c.name]=1});$('dbNames').innerHTML=Object.keys(names).map(function(n){return '<option value="'+qa(n)+'">'}).join('');
  [].forEach.call($('dtabs').children,function(x){x.className=x.dataset.d===DFILT?'on':''});
  var l=L.filter(function(d){var o=debtBal(d)>0;return DFILT==='all'||(DFILT==='open'?o:!o)}).sort(function(a,b){var ao=debtBal(a)>0,bo=debtBal(b)>0;if(ao!==bo)return ao?-1:1;return (a.due||'9999').localeCompare(b.due||'9999')||b.date.localeCompare(a.date)});
  $('debtList').innerHTML=l.length?l.map(function(d){var bal=debtBal(d),pd=debtPaid(d),ov=debtOver(d);
    return '<div class="card"><div class="top"><div><b>'+esc(d.name)+'</b><br><small class="m">'+fmt(d.date)+(d.due?' · לשלם עד '+fmt(d.due):'')+(d.note?' · '+esc(d.note):'')+'</small></div><div class="l"><div class="'+(bal>0?'owe':'')+'" style="font-weight:800'+(bal>0?'':';color:var(--ok)')+'">'+(bal>0?nis(bal):'שולם ✓')+'</div><small class="m">מתוך '+nis(d.amount)+'</small></div></div>'+
      (ov?'<small class="owe" style="display:block">⏰ עבר תאריך הפירעון</small>':'')+
      (d.pays||[]).map(function(p){return '<div class="top" style="margin-top:4px"><small class="m" style="font-size:13px">💸 '+fmt(p.date)+' · שילמתי '+nis(p.amt)+(p.note?' · '+esc(p.note):'')+'</small><button class="ghost" style="padding:2px 10px;font-size:13px" aria-label="ביטול תשלום" onclick="debtPayDel('+d.id+','+p.id+')">✕</button></div>'}).join('')+
      '<div class="acts">'+(bal>0?'<button onclick="debtPayAll('+d.id+')">שילמתי הכל</button><button class="ghost" onclick="debtPart('+d.id+')">שילמתי חלק</button>':'')+'<button class="ghost" onclick="debtEdit('+d.id+')">עריכה</button><button class="ghost" onclick="debtDel('+d.id+')">מחיקה</button></div></div>'}).join(''):'<div class="empty">'+(L.length?'אין חובות בתצוגה הזו.':'עדיין לא רשמת חובות. הוסף למעלה חוב שאתה חייב למישהו.')+'</div>'}
$('ptabs').onclick=function(e){var b=e.target.closest('button');if(b&&b.dataset.p)pSub(b.dataset.p)};
$('dtabs').onclick=function(e){var b=e.target.closest('button');if(b&&b.dataset.d){DFILT=b.dataset.d;render()}};
