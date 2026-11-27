/* ---- beta.38: monthly income goal, import of expenses from a bank / credit-card file ---- */

/* ---------- monthly income goal (S.incGoal, 0 = off). Income this month by work date, like the expenses screen ---------- */
function goalAmt(){var g=parseFloat(S.incGoal);return isFinite(g)&&g>0?Math.round(g):0}
function goalInfo(now){now=now||new Date();var g=goalAmt();if(!g)return null;var pre=ds(now).slice(0,7),inc=incIn(pre),left=Math.max(g-inc,0),
  last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),rate=+S.rate||0;
  return {g:g,inc:inc,left:left,pct:Math.min(Math.round(inc/g*100),999),daysLeft:last-now.getDate(),days:rate>0&&left>0?Math.ceil(Math.round(left/rate*10)/10):0}}
function goalCard(){var i=goalInfo();if(!i)return '';var w=Math.min(i.pct,100);
  return '<h2>יעד החודש</h2><div class="card" id="goalCard"><div class="top"><span class="m">הכנסות החודש (לפי תאריך עבודה)</span><b>'+nis(i.inc)+'</b></div>'+
    '<div style="height:12px;background:var(--bg);border-radius:6px;overflow:hidden;margin:8px 0" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+w+'" aria-label="התקדמות ליעד"><div style="height:100%;width:'+w+'%;background:var(--ok)"></div></div>'+
    '<div class="top"><small class="m">'+i.pct+'% מהיעד ('+nis(i.g)+')</small>'+(i.left>0?'<small class="owe">נשאר '+nis(i.left)+'</small>':'<small style="color:var(--ok);font-weight:700">הגעת ליעד!</small>')+'</div>'+
    (i.left>0&&i.days?'<small class="m" style="display:block;margin-top:4px">בערך עוד '+(i.days===1?'יום עבודה אחד':i.days+' ימי עבודה')+' (לפי '+nis(+S.rate)+' ליום) · נשארו '+i.daysLeft+' ימים בחודש</small>':'')+'</div>'}

/* ---------- import expenses from a bank / credit-card file (CSV or Excel .xlsx) ---------- */
var IMP=null;
function impPick(){var f=$('impF');if(f){f.value='';f.click()}}
/* CSV: a quote opens a quoted cell only at the start of the cell, so Hebrew abbreviations like בע"מ inside a plain cell stay as they are */
/* text of a file: UTF-8, or Windows-1255 (older Israeli bank exports) when UTF-8 does not decode cleanly */
function impText(buf){var u=new Uint8Array(buf),t='';try{t=new TextDecoder('utf-8',{fatal:true}).decode(u)}catch(e){try{t=new TextDecoder('windows-1255').decode(u)}catch(e2){t=new TextDecoder().decode(u)}}return t.replace(/^﻿/,'')}
function impCsv(t){var lines=t.split(/\r\n|\n|\r/).slice(0,40).join('\n'),cnt=function(ch){return (lines.match(new RegExp(ch==='\t'?'\\t':'\\'+ch,'g'))||[]).length},
  sep=[',',';','\t'].sort(function(a,b){return cnt(b)-cnt(a)})[0],rows=[],row=[],cell='',q=false;
  for(var i=0;i<t.length;i++){var c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
    else if(c==='"'&&cell.trim()==='')q=true;else if(c===sep){row.push(cell);cell=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}
  if(cell!==''||row.length){row.push(cell);rows.push(row)}
  return rows.map(function(r){return r.map(function(x){return String(x).trim()})}).filter(function(r){return r.some(function(x){return x!==''})})}
/* first worksheet of an .xlsx file as rows of strings / numbers */
async function impXlsx(buf){var z=await JSZip.loadAsync(buf),ss=[],P=new DOMParser(),sf=z.file('xl/sharedStrings.xml');
  if(sf){var sd=P.parseFromString(await sf.async('string'),'application/xml');[].forEach.call(sd.getElementsByTagName('si'),function(si){ss.push([].map.call(si.getElementsByTagName('t'),function(t){return t.textContent}).join(''))})}
  var names=Object.keys(z.files).filter(function(n){return /^xl\/worksheets\/sheet\d+\.xml$/.test(n)}).sort(function(a,b){return parseInt(a.replace(/\D/g,''),10)-parseInt(b.replace(/\D/g,''),10)});
  if(!names.length)return [];var d=P.parseFromString(await z.file(names[0]).async('string'),'application/xml'),rows=[];
  [].forEach.call(d.getElementsByTagName('row'),function(r){var o=[];[].forEach.call(r.getElementsByTagName('c'),function(c){var ref=c.getAttribute('r')||'',col=0,m=/^[A-Z]+/.exec(ref);
      if(m){for(var k=0;k<m[0].length;k++)col=col*26+(m[0].charCodeAt(k)-64);col--}else col=o.length;
      var t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0],val='';
      if(t==='s')val=v?ss[+v.textContent]||'':'';else if(t==='inlineStr'){val=[].map.call(c.getElementsByTagName('t'),function(x){return x.textContent}).join('')}else if(v){val=t==='str'||t==='b'?v.textContent:(isFinite(+v.textContent)?+v.textContent:v.textContent)}
      o[col]=val});
    for(var j=0;j<o.length;j++)if(o[j]===undefined)o[j]='';if(o.some(function(x){return String(x).trim()!==''}))rows.push(o)});
  return rows}
/* a date cell -> 'YYYY-MM-DD' or '' (dd/mm/yyyy, dd.mm.yy, yyyy-mm-dd, Excel day number) */
function impDate(v){if(typeof v==='number'){if(v>20000&&v<80000){var d=new Date(1899,11,30+Math.floor(v));return ds(d)}return ''}
  var s=String(v||'').trim(),m=/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s),y,mo,da;
  if(m){y=+m[1];mo=+m[2];da=+m[3]}else{m=/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})(?!\d)/.exec(s);if(!m)return '';da=+m[1];mo=+m[2];y=+m[3];if(y<100)y+=2000}
  if(y<2000||y>2100||mo<1||mo>12||da<1||da>31)return '';var dt=new Date(y,mo-1,da);if(dt.getMonth()!==mo-1)return '';return ds(dt)}
/* an amount cell -> number (₪, commas, trailing minus, brackets) or NaN */
function impNum(v){if(typeof v==='number')return v;var s=String(v||'').replace(/[‎‏‪-‮]/g,'').replace(/[₪$€\s]|ש"ח|ש״ח|NIS/gi,'').replace(/,/g,'');if(!s)return NaN;var neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1)}if(/-$/.test(s)){neg=true;s=s.slice(0,-1)}if(!/^-?\d+(\.\d+)?$/.test(s))return NaN;var n=parseFloat(s);return neg?-n:n}
/* which row is the header and which columns hold the date, the description and the charge */
function impGuess(rows){var hi=-1;for(var i=0;i<Math.min(rows.length,30);i++){if(rows[i].some(function(c){return /תאריך|date/i.test(String(c))})){hi=i;break}}
  var hd=hi>=0?rows[hi].map(function(c){return String(c).trim()}):[],body=rows.slice(hi+1),nc=rows.reduce(function(a,r){return Math.max(a,r.length)},0),
  find=function(res,not){for(var k=0;k<res.length;k++)for(var j=0;j<hd.length;j++)if(res[k].test(hd[j])&&!(not&&not.test(hd[j])))return j;return -1};
  var dc=find([/תאריך עסקה|תאריך רכישה/,/תאריך/,/date/i]),nc2=find([/שם בית העסק|בית עסק/,/תיאור|פירוט|הפעולה|פרטים|description/i,/^שם/]),ac=find([/סכום חיוב|סכום לחיוב|חיוב בש/,/חובה/,/סכום|amount/i],/זכות|מקורי|עסקה במטבע/);
  var share=function(fn){var n=0,t=0;body.slice(0,50).forEach(function(r){if(r.length){t++;if(fn(r))n++}});return t?n/t:0};
  if(dc<0)for(var a=0;a<nc;a++)if(share(function(r){return !!impDate(r[a])})>0.5){dc=a;break}
  if(ac<0)for(var b=nc-1;b>=0;b--)if(b!==dc&&share(function(r){return isFinite(impNum(r[b]))&&impNum(r[b])!==0})>0.5){ac=b;break}
  if(nc2<0)for(var c=0;c<nc;c++)if(c!==dc&&c!==ac&&share(function(r){return /[א-תA-Za-z]/.test(String(r[c]||''))})>0.5){nc2=c;break}
  var names=[];for(var x=0;x<nc;x++)names.push(hd[x]||('עמודה '+(x+1)));
  return {hi:hi,names:names,body:body,d:dc,n:nc2,a:ac}}
/* a merchant / description -> a key for remembering its category (no digits, punctuation or extra spaces) */
function impKey(n){return String(n||'').toLowerCase().replace(/[\u200e\u200f"'״׳.,:;!?\-_*#\/\\()\[\]|+]/g,' ').replace(/\d+/g,' ').replace(/\s+/g,' ').trim().slice(0,40)}
/* category of earlier expenses with the same merchant / description (the latest one wins; the default "אחר" is not remembered) */
function impMem(){var m={};(S.expenses||[]).slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date))}).forEach(function(x){var k=impKey(x.note),c=String(x.cat||'').trim();if(k.length>=2&&c&&c!=='אחר')m[k]=c});return m}
/* candidate expenses from the chosen columns: valid date and a non-zero amount; dup = same date and amount already in the expenses.
   cr = a refund / money in: when the file has both signs, the rows with the less common sign (a tie: the negative ones) */
function impRows(g,dc,nc,ac){var have={},mem=impMem();(S.expenses||[]).forEach(function(x){have[x.date+'|'+c100(x.amount)]=1});var out=[],pos=0,neg=0;
  g.body.forEach(function(r){var d=impDate(r[dc]),a=impNum(r[ac]);if(!d||!isFinite(a)||Math.abs(a)<0.005)return;var sg=a<0?-1:1;if(sg<0)neg++;else pos++;a=Math.abs(Math.round(a*100)/100);
    var n=nc>=0?String(r[nc]||'').replace(/\s+/g,' ').trim().slice(0,120):'';out.push({d:d,a:a,n:n,sg:sg,c:mem[impKey(n)]||'',dup:!!have[d+'|'+c100(a)]})});
  var crS=pos&&neg?(neg<=pos?-1:1):0;out.forEach(function(r){r.cr=!!crS&&r.sg===crS});
  return out}
async function impFile(f){if(!f)return;var nm=(f.name||'').toLowerCase();
  if(/\.xls$/.test(nm))return info('זה קובץ Excel ישן (xls). פתח אותו ב-Excel ושמור בשם כ-xlsx או CSV, ואז ייבא שוב.');
  if(f.size>5*1024*1024)return info('הקובץ גדול מדי (יותר מ-5MB)');
  try{var buf=await f.arrayBuffer(),u=new Uint8Array(buf),rows;
    if(u[0]===0x50&&u[1]===0x4B){if(!window.JSZip)return info('רכיב ה-ZIP עוד לא נטען. נסה שוב בעוד רגע.');rows=await impXlsx(buf)}
    else if(u[0]===0xD0&&u[1]===0xCF)return info('זה קובץ Excel ישן (xls). פתח אותו ב-Excel ושמור בשם כ-xlsx או CSV, ואז ייבא שוב.');
    else rows=impCsv(impText(buf));
    var g=impGuess(rows);if(!g.body.length||g.names.length<2)return info('לא מצאתי טבלה בקובץ. צריך קובץ CSV או Excel (xlsx) עם עמודות של תאריך וסכום.');
    IMP={g:g,f:f.name||''};impSheet()}
  catch(e){info('לא הצלחתי לקרוא את הקובץ: '+(e&&e.message||e))}}
function impOpts(sel,none){return (none?'<option value="-1">ללא</option>':'')+IMP.g.names.map(function(n,i){return '<option value="'+i+'"'+(i===sel?' selected':'')+'>'+esc(n)+'</option>'}).join('')}
function impSheet(){var g=IMP.g;
  $('sheetBody').innerHTML='<b>ייבוא הוצאות מקובץ</b><small class="m">'+esc(IMP.f)+'. בחר אילו שורות הן הוצאות של העסק. שורות שכבר רשומות (אותו תאריך ואותו סכום) וזיכויים או כסף שנכנס מסומנים, ו"בחירת הכל" לא בוחר אותם.</small>'+
    '<div class="two"><div><label for="imD">עמודת תאריך</label><select id="imD" style="width:100%" onchange="impList()">'+impOpts(g.d)+'</select></div><div><label for="imA">עמודת סכום</label><select id="imA" style="width:100%" onchange="impList()">'+impOpts(g.a)+'</select></div></div>'+
    '<label for="imN">עמודת תיאור (נכנס להערה)</label><select id="imN" style="width:100%" onchange="impList()">'+impOpts(g.n,1)+'</select>'+
    '<label for="imC">קטגוריה לשורות שנבחרו</label><input id="imC" list="xCats" autocomplete="off" value="אחר">'+
    '<label class="imMemL" id="imMemL" style="display:flex;gap:8px;align-items:center;font-weight:400;margin-top:6px" hidden><input type="checkbox" id="imMem" checked style="width:auto;flex:none">לשורות של בית עסק מוכר: הקטגוריה מהפעם הקודמת</label>'+
    (S.vatOn?'<label for="imV">מע״מ בהוצאות</label><select id="imV" style="width:100%"><option value="1">יש בהן מע״מ (כלול בסכום)</option><option value="0">בלי מע״מ</option></select>':'')+
    '<div class="acts" style="margin-top:8px"><button class="ghost" onclick="impAll(1)">בחירת הכל</button><button class="ghost" onclick="impAll(0)">ניקוי</button></div>'+
    '<div id="imL" style="max-height:42vh;overflow:auto;margin:6px 0"></div><div id="imE" class="owe" role="alert"></div>'+
    '<button id="imGo" onclick="impSave()">הוספת ההוצאות שנבחרו</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false;impList()}
function impList(){var dc=+$('imD').value,ac=+$('imA').value,nc=+$('imN').value,l=impRows(IMP.g,dc,nc,ac);IMP.l=l;
  $('imL').innerHTML=l.length?l.map(function(r,i){return '<label class="imRow" style="display:flex;gap:8px;align-items:center;margin:4px 0;font-weight:400"><input type="checkbox" data-i="'+i+'" onchange="impCnt()" style="width:auto;flex:none"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+fmt(r.d)+' · '+esc(r.n||'—')+(r.dup?' <small class="m">(כבר רשום)</small>':'')+(r.cr?' <small class="owe">(זיכוי / נכנס)</small>':'')+(r.c?' <small class="m">· '+esc(r.c)+'</small>':'')+'</span><b style="flex:none">'+nis(r.a)+'</b></label>'}).join(''):'<span class="m">לא נמצאו שורות עם תאריך וסכום בעמודות שנבחרו.</span>';var ml=$('imMemL');if(ml)ml.hidden=!l.some(function(r){return r.c});impCnt()}
function impSel(){return [].filter.call(document.querySelectorAll('#imL input[type=checkbox]'),function(c){return c.checked}).map(function(c){return IMP.l[+c.dataset.i]})}
function impAll(on){[].forEach.call(document.querySelectorAll('#imL input[type=checkbox]'),function(c){var r=IMP.l[+c.dataset.i];c.checked=!!on&&!r.dup&&!r.cr});impCnt()}
function impCnt(){var s=impSel(),b=$('imGo');if(b)b.textContent=s.length?'הוספת '+s.length+' הוצאות ('+nis(s.reduce(function(a,r){return a+r.a},0))+')':'הוספת ההוצאות שנבחרו'}
function impSave(){var s=impSel(),e=$('imE');if(!s.length){e.textContent='סמן לפחות שורה אחת';return}
  var cat=$('imC').value.replace(/\s+/g,' ').trim()||'אחר',v=$('imV'),nv=S.vatOn&&v&&v.value==='0',mm=$('imMem'),useMem=!!(mm&&mm.checked),ids={};S.expenses=S.expenses||[];S.expenses.forEach(function(x){ids[x.id]=1});
  var base=uid();s.forEach(function(r,i){var id=base+i;while(ids[id])id++;ids[id]=1;var x={id:id,date:r.d,amount:r.a,cat:useMem&&r.c?r.c:cat,note:r.n,cid:0};if(nv)x.nv=1;S.expenses.push(x)});
  IMP=null;closeS();save();render();okSave('נוספו '+s.length+' הוצאות')}
try{$('impF').onchange=function(){var f=this.files&&this.files[0];this.value='';impFile(f)}}catch(e){}

/* ---------- settings ---------- */
function plSetVals(){var g=$('sgoal');if(g&&document.activeElement!==g)g.value=goalAmt()||''}
try{$('sgoal').onchange=function(){var v=Math.round(parseFloat(this.value));S.incGoal=isFinite(v)&&v>0&&v<10000000?v:0;save();render()}}catch(e){}

/* ---------- beta.39: days off — reserve duty (מילואים), sick, vacation. S.offD = {'YYYY-MM-DD': 'res' | 'sick' | 'vac'} (synced with the settings) ---------- */
var OFFK={res:'מילואים',sick:'מחלה',vac:'חופשה'},OFFS={res:'מיל',sick:'מחל',vac:'חופ'};
function offMap(){var o=S.offD;return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}
function offOf(d){var k=offMap()[d];return OFFK[k]?k:''}
/* mark a day; the same kind again clears it */
function offSet(d,k){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d)))return;var o=Object.assign({},offMap());if(OFFK[k]&&o[d]!==k)o[d]=k;else delete o[d];S.offD=o;save();render()}
function offCount(pre){var c={res:0,sick:0,vac:0},o=offMap();Object.keys(o).forEach(function(d){if(d.indexOf(pre)===0&&c[o[d]]!==undefined)c[o[d]]++});return c}
function offDates(pre,k){var o=offMap();return Object.keys(o).filter(function(d){return d.indexOf(pre)===0&&o[d]===k}).sort()}
function offTxt(c){return Object.keys(OFFK).filter(function(k){return c[k]}).map(function(k){return OFFK[k]+' '+c[k]}).join(' · ')}
function offMark(d){var k=offOf(d);return k?'<b class="offm off-'+k+'" aria-label="'+OFFK[k]+'">'+OFFS[k]+'</b>':''}
/* the calendar card under the month grid: what the selected day was, and this month's count */
function offRender(){var b=$('offBox');if(!b||typeof selD!=='string')return;var k=offOf(selD),pre=cal.getFullYear()+'-'+String(cal.getMonth()+1).padStart(2,'0'),t=offTxt(offCount(pre));
  b.innerHTML='<small class="m">לא עבדת ב-'+fmt(selD)+'? אפשר לסמן למה (לחיצה נוספת מבטלת):</small><div class="acts" style="margin:6px 0 0">'+
    Object.keys(OFFK).map(function(x){return '<button class="'+(k===x?'':'ghost')+'" style="padding:6px 12px;font-size:14px" aria-pressed="'+(k===x)+'" onclick="offSet(selD,\''+x+'\')">'+OFFK[x]+'</button>'}).join('')+'</div>'+
    (t?'<small class="m" style="display:block;margin-top:6px">החודש: '+t+'</small>':'')}
/* statistics: the days off of the year, and the reserve-duty dates to copy (for a Bituach Leumi claim) */
function offStats(y){var c=offCount(y+'-');if(!c.res&&!c.sick&&!c.vac)return '';
  return '<div class="card" id="offStats"><b>ימים שלא עבדת ב-'+y+'</b><p style="margin:6px 0">'+offTxt(c)+'</p>'+
    (c.res?'<small class="m" style="display:block">תאריכי המילואים: '+offDates(y+'-','res').map(function(d){return fmt(d)}).join(', ')+'</small><button class="ghost" style="margin-top:8px" onclick="offCopy(this,'+y+')">העתקת תאריכי המילואים</button>':'')+'</div>'}
function offCopyTxt(y){var l=offDates(y+'-','res');return 'ימי מילואים '+y+' ('+l.length+'): '+l.map(function(d){return fmt(d)}).join(', ')}
function offCopy(b,y){try{navigator.clipboard.writeText(offCopyTxt(y)).then(function(){b.textContent='הועתק'},function(){b.textContent='ההעתקה נכשלה'})}catch(e){b.textContent='ההעתקה נכשלה'}}
