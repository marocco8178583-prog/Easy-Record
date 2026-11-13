function payLines(e){var l=[];S.pays.forEach(function(p){(p.alloc||[]).forEach(function(a){if(a.eid===e.id)l.push({p:p,amt:a.amt})})});l.sort(function(a,b){return (a.p.date||'').localeCompare(b.p.date||'')});
  return l.map(function(x){return '<div class="top" style="margin-top:4px"><small class="m" style="font-size:13px">💵 '+fmt(x.p.date)+' · '+nis(x.amt)+(x.p.method?' · '+esc(x.p.method):'')+(x.p.note?' · '+esc(x.p.note):'')+(x.p.alloc.length>1?' · תשלום משותף '+nis(x.p.amount):'')+'</small><button class="ghost" style="padding:2px 10px;font-size:13px" aria-label="מחיקת תשלום" onclick="delPay('+x.p.id+')">✕</button></div>'}).join('')}
function ent(id){return S.entries.find(function(x){return x.id===id})}
var LASTPAY={k:'',t:0};
/* addPay: integer-cents allocations; refuses non-positive amounts and an identical payment submitted twice within 3s (double tap). Returns the new payment or null. */
function addPay(cid,alloc,date,method,note){var al=alloc.map(function(a){return {eid:a.eid,amt:c100(a.amt)/100}}).filter(function(a){return a.amt>0});if(!al.length)return null;
  var cents=al.reduce(function(s,a){return s+c100(a.amt)},0),k=stab([cid,al,date||today(),method||'',note||'']),now=Date.now();
  if(LASTPAY.k===k&&now-LASTPAY.t<3000)return null;LASTPAY={k:k,t:now};
  var p={id:uid(),cid:cid,date:date||today(),amount:cents/100,method:method||'כללי',note:note||'',alloc:al};S.pays.push(p);return p}
function delEntry(id){var e=ent(id);if(!e)return;S.entries.splice(S.entries.indexOf(e),1);tombAdd('e',e);
  S.pays.slice().forEach(function(p){var n=(p.alloc||[]).filter(function(a){return a.eid!==id});if(n.length===p.alloc.length)return;
    if(!n.length){S.pays.splice(S.pays.indexOf(p),1);tombAdd('p',p)}else{p.alloc=n;p.amount=r2(n.reduce(function(s,a){return s+a.amt},0));p.note=((p.note||'')+' (הוקטן עקב מחיקת יום עבודה)').trim()}})}
function delPay(pid){var p=S.pays.find(function(x){return x.id===pid});if(!p)return;cf('למחוק את התשלום ('+nis(p.amount)+' מתאריך '+fmt(p.date)+')? היתרות יחושבו מחדש.',function(){S.pays.splice(S.pays.indexOf(p),1);tombAdd('p',p);save();render()})}
function act(id,w,p){var e=ent(id);if(!e)return;
  if(w==='paid'){var s=$('pm'+p+id);if(e.bl>0.004)addPay(e.cid,[{eid:id,amt:e.bl}],today(),s?s.value:'כללי','');save();render();return}
  if(w==='receipt')e.receipt=!e.receipt;
  if(w==='del'){cf('למחוק את הרישום? תשלומים ששויכו אליו יתעדכנו.',function(){delEntry(id);save();render()});return}
  save();render()}
var METH='<option>כללי</option><option>ביט</option><option>העברה בנקאית</option><option>מזומן</option>';
function payPart(id){var e=ent(id);if(!e)return;
  $('sheetBody').innerHTML='<b>תשלום חלקי</b><small class="m">יתרה פתוחה: '+nis(e.bl)+' מתוך '+nis(e.amount)+'</small><label for="pa">סכום ששולם (₪)</label><input id="pa" type="number" inputmode="decimal" placeholder="כמה שולם?"><label for="pdt">תאריך התשלום</label><input id="pdt" type="date" value="'+today()+'"><label for="pmx">אופן תשלום</label><select id="pmx" style="width:100%">'+METH+'</select><label for="pnt">הערה / אסמכתה</label><input id="pnt"><div id="pce" class="owe"></div><button onclick="doPart('+id+')">שמירה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function doPart(id){var e=ent(id),a=r2($('pa').value);if(!e)return;if(!(a>0)){$('pce').textContent='הזן סכום גדול מאפס';return}
  if(a>e.bl+0.004){$('pce').textContent='הסכום גבוה מהיתרה הפתוחה ('+nis(e.bl)+')';return}
  addPay(e.cid,[{eid:id,amt:Math.min(a,e.bl)}],$('pdt').value||today(),$('pmx').value,$('pnt').value.trim());closeS();save();render()}
function payClient(cid){var c=cl(cid),l=S.entries.filter(function(e){return e.cid===cid&&e.bl>0.004}).sort(function(a,b){return a.date.localeCompare(b.date)});if(!l.length)return info('אין חובות פתוחים ללקוח הזה');
  var tot=l.reduce(function(s,e){return s+e.bl},0);
  $('sheetBody').innerHTML='<b>תשלום מ-'+esc(c.name)+'</b><small class="m">בחר לאילו ימי עבודה לשייך את התשלום (מהישן לחדש)</small><div style="max-height:30vh;overflow:auto">'+l.map(function(e){return '<label style="display:flex;gap:8px;align-items:center;color:var(--ink);font-size:15px"><input type="checkbox" class="pck" value="'+e.id+'" data-bl="'+e.bl+'" checked style="width:auto" onchange="pcSum()"> '+fmt(e.date)+' · יתרה '+nis(e.bl)+'</label>'}).join('')+'</div><label for="pca">סכום התשלום (₪)</label><input id="pca" type="number" inputmode="decimal" value="'+r2(tot)+'"><label for="pcd">תאריך</label><input id="pcd" type="date" value="'+today()+'"><label for="pcm">אופן תשלום</label><select id="pcm" style="width:100%">'+METH+'</select><label for="pcn">הערה / אסמכתה</label><input id="pcn"><div id="pce" class="owe"></div><button onclick="doPayClient('+cid+')">שמירה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false}
function pcSum(){var s=0;[].forEach.call(document.querySelectorAll('.pck:checked'),function(x){s+=+x.dataset.bl});$('pca').value=r2(s)}
function doPayClient(cid){var a=r2($('pca').value),al=[],rem=a;if(!(a>0)){$('pce').textContent='הזן סכום גדול מאפס';return}
  var it=[].slice.call(document.querySelectorAll('.pck:checked')).map(function(x){return ent(+x.value)}).filter(Boolean).sort(function(x,y){return x.date.localeCompare(y.date)});
  var cap=it.reduce(function(s,e){return s+e.bl},0);if(!it.length){$('pce').textContent='בחר לפחות יום עבודה אחד';return}if(a>cap+0.004){$('pce').textContent='הסכום גבוה מהיתרה של הימים שנבחרו ('+nis(cap)+')';return}
  it.forEach(function(e){if(rem<=0.004)return;var t=Math.min(rem,e.bl);al.push({eid:e.id,amt:r2(t)});rem=r2(rem-t)});
  addPay(cid,al,$('pcd').value||today(),$('pcm').value,$('pcn').value.trim());closeS();save();render()}
function payBlock(c){var l=S.pays.filter(function(p){return p.cid===c.id}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});
  return '<h2>תשלומים</h2><div class="card">'+(l.length?l.map(function(p){return '<div class="top" style="margin-bottom:6px"><small class="m">'+fmt(p.date)+' · <b>'+nis(p.amount)+'</b> · '+esc(p.method||'')+(p.note?' · '+esc(p.note):'')+' · '+p.alloc.length+' ימים</small><button class="ghost" style="padding:2px 10px;font-size:13px" aria-label="מחיקת תשלום" onclick="delPay('+p.id+')">✕</button></div>'}).join(''):'<span class="m">עדיין אין תשלומים רשומים.</span>')+'<div class="acts"><button onclick="payClient('+c.id+')">💵 רישום תשלום</button></div></div>'}
