/* ---- beta.40: expense categories like a bank app: category buttons with a colour and an icon, a coloured breakdown that filters
   the list, moving many expenses to another category at once, and a category guessed from the business name (import / no category). ---- */
var XCI={fuel:'<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M7.5 8h4M14 9l3 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  cart:'<path d="M3 4h2l2.2 11h10.6L20 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  phone:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17.5h2"/>',
  tool:'<path d="M15 4a4 4 0 0 0-3.9 5L4.6 15.5a2 2 0 1 0 2.9 2.9L14 12a4 4 0 0 0 5-3.9l-2.5 2.5-2.6-.4-.4-2.6z"/>',
  box:'<path d="M3 7.5l9-4.5 9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9"/>',
  car:'<path d="M4 15v-3l2-5h12l2 5v3zM4 12h16"/><circle cx="8" cy="17.5" r="1.6"/><circle cx="16" cy="17.5" r="1.6"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  doc:'<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
  screen:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  mega:'<path d="M3 10v4h4l8 4V6l-8 4zM18.5 9a4 4 0 0 1 0 6"/>',
  bolt:'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  home:'<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1"/>',
  bank:'<path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  dots:'<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8zM7.5 8.5h.01"/>'};
/* the known categories: colour + icon. The names stay the same as before, so existing expenses keep their category */
var XCM={'דלק ונסיעות':['#E07B2E','fuel'],'אוכל':['#2E9E5B','cart'],'טלפון ואינטרנט':['#3B82C4','phone'],'כלים וציוד':['#8A6BBE','tool'],
  'חומרים':['#A8732F','box'],'רכב ותחזוקה':['#5E6E7E','car'],'ביטוח':['#2B8C8C','shield'],'רואה חשבון':['#6177D1','doc'],
  'תוכנה ומנויים':['#0E9AAE','screen'],'פרסום ושיווק':['#D0457F','mega'],'חשמל, מים וארנונה':['#C9961A','bolt'],'שכירות ומשרד':['#9A5B3C','home'],
  'עמלות בנק':['#64798A','bank'],'נסיעות':['#5E6E7E','car'],'אחר':['#8E8E93','dots']};
var XCP=['#E07B2E','#2E9E5B','#3B82C4','#8A6BBE','#D0457F','#0E9AAE','#C9961A','#2B8C8C'],XCF='',XCL=[];
function xcCol(c){var m=XCM[c];if(m)return m[0];var h=0;String(c||'').split('').forEach(function(ch){h=(h*31+ch.charCodeAt(0))%997});return XCP[h%XCP.length]}
function xcIco(c,inl){var m=XCM[c],k=m?m[1]:'tag';return '<span class="xcI'+(inl?' xcIn':'')+'" style="background:'+xcCol(c)+'" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+XCI[k]+'</svg></span>'}
/* the buttons: the fixed list, then the user's own categories (most used first, up to 6) */
function xcList(){var n={};(S.expenses||[]).forEach(function(x){var c=x.cat;if(c&&XCATS.indexOf(c)<0&&c!=='נסיעות')n[c]=(n[c]||0)+1});
  var own=Object.keys(n).sort(function(a,b){return n[b]-n[a]}).slice(0,6),l=XCATS.filter(function(c){return c!=='אחר'});return l.concat(own,['אחר'])}
function xcChipsH(id,cur){return '<div class="xcGrid" id="'+id+'K" role="group" aria-label="קטגוריה">'+xcList().map(function(c){var on=c===cur;
  return '<button type="button" class="xcChip'+(on?' on':'')+'" aria-pressed="'+on+'" data-c="'+qa(c)+'" onclick="xcPick(\''+id+'\',this)">'+xcIco(c)+'<span>'+esc(c)+'</span></button>'}).join('')+'</div>'}
function xcPick(id,b){var i=$(id);if(!i)return;i.value=b.dataset.c;xcSync(id)}
function xcSync(id){var i=$(id),g=$(id+'K');if(!i||!g)return;var v=i.value.replace(/\s+/g,' ').trim();[].forEach.call(g.querySelectorAll('.xcChip'),function(b){var on=b.dataset.c===v;b.className='xcChip'+(on?' on':'');b.setAttribute('aria-pressed',String(on))})}
function xcRender(){var w=$('xCKw');if(w)w.innerHTML=xcChipsH('xC',$('xC').value.replace(/\s+/g,' ').trim())}

/* ---------- category from the business name (like the bank): whole words, the first group that matches wins ---------- */
var XCKW=[['',['סופר פארם','סופר-פארם','super-pharm','superpharm','בית מרקחת']],/* a pharmacy is not food: no guess */
  ['עמלות בנק',['עמלה','עמלת','עמלות','דמי כרטיס','דמי ניהול חשבון','ריבית']],
  ['פרסום ושיווק',['google ads','facebook','meta','פייסבוק','instagram','אינסטגרם','tiktok','טיקטוק','דפי זהב','פרסום','שיווק דיגיטלי','מודעה','מודעות']],
  ['תוכנה ומנויים',['google','גוגל','microsoft','מיקרוסופט','apple','icloud','adobe','zoom','canva','wix','dropbox','openai','chatgpt','anthropic','claude','github','office','monday','מנוי']],
  ['טלפון ואינטרנט',['בזק','פרטנר','partner','סלקום','cellcom','הוט','hot','פלאפון','pelephone','גולן טלקום','012','013','019','we4g','אקספון','xphone','תקשורת','אינטרנט','סלולר','yes']],
  ['חשמל, מים וארנונה',['חברת החשמל','חברת חשמל','חשמל ישראל','iec','תאגיד','מים','ארנונה','עירית','עיריית','מועצה','פזגז','אמישראגז','סופרגז','גז']],
  ['ביטוח',['ביטוח','הראל','מגדל','הפניקס','מנורה','איילון','ליברה','aig','wesure','שומרה','כלל ביטוח','ביטוח ישיר']],
  ['רואה חשבון',['רואה חשבון','רואי חשבון','הנהלת חשבונות','מנהלת חשבונות','יועץ מס']],
  ['רכב ותחזוקה',['מוסך','צמיגים','צמיג','טסט','רישוי','משרד הרישוי','שטיפת רכב','ליסינג','אלבר','sixt','hertz','avis','רכב']],
  ['דלק ונסיעות',['פז','סונול','דלק','דור אלון','ten','טן','yellow','ילו','חניה','חניון','פנגו','pango','סלופארק','cellopark','כביש 6','נתיב מהיר','רכבת','רב קו','רב-קו','מונית','gett','yango','אגד']],
  ['אוכל',['שופרסל','רמי לוי','יוחננוף','ויקטורי','טיב טעם','אושר עד','מגה','חצי חינם','יינות ביתן','קרפור','carrefour','am:pm','אמפם','סופר','מסעדה','מסעדת','קפה','ארומה','aroma','מקדונלד','mcdonald','mcdonalds','בורגר','פיצה','wolt','וולט','תן ביס','10bis','cibus','סיבוס','שווארמה','פלאפל','מאפה','מאפיית']],
  ['חומרים',['טמבור','חומרי בניין','חומרי','צבע','צבעים','ברזל','עצים','אינסטלציה']],
  ['כלים וציוד',['ace','איס','הום סנטר','home center','ikea','איקאה','ksp','באג','bug','אמזון','amazon','aliexpress','עלי אקספרס','ebay','איביי','ציוד','כלי עבודה','מקס סטוק']],
  ['שכירות ומשרד',['שכירות','שכר דירה','משרד','wework','מחסן']]];
var XCRE=null;
function xcRe(){if(XCRE)return XCRE;var W='[^0-9a-z\\u05d0-\\u05ea]',e=function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')};
  XCRE=XCKW.map(function(g){return [g[0],new RegExp('(^|'+W+')('+g[1].map(e).join('|')+')(?='+W+'|$)')]});return XCRE}
function catGuess(n){var s=String(n||'').toLowerCase().replace(/[‎‏"'״׳`]/g,'').replace(/\s+/g,' ').trim();if(!s)return '';
  var r=xcRe();for(var i=0;i<r.length;i++)if(r[i][1].test(s))return r[i][0];return ''}

/* ---------- breakdown by category (coloured bars; a tap filters the list) ---------- */
function xcBreak(ks,by,tot){var T=Math.max(1,c100(tot)),mx=Math.max.apply(null,ks.map(function(k){return by[k]}).concat([1]));
  return '<div class="xcBr" style="margin-top:10px">'+ks.map(function(k){var on=XCF===k,p=Math.round(by[k]/T*100);
    return '<button type="button" class="xcRow'+(on?' on':'')+'" aria-pressed="'+on+'" data-c="'+qa(k)+'" onclick="xcF(this.dataset.c)">'+xcIco(k)+
      '<span class="xcRb"><span class="top"><span class="xcRn">'+esc(k)+'</span><span>'+nis(by[k]/100)+' · '+p+'%</span></span>'+
      '<span class="xcBar"><span style="width:'+Math.max(by[k]/mx*100,2)+'%;background:'+xcCol(k)+'"></span></span></span></button>'}).join('')+
    '<small class="m" style="display:block;margin-top:4px">לחיצה על קטגוריה מציגה רק אותה ברשימה.</small></div>'}
function xcF(c){XCF=XCF===c?'':String(c||'');render()}
function xcFilt(l){if(XCF&&!l.some(function(x){return x.cat===XCF}))XCF='';var f=XCF?l.filter(function(x){return x.cat===XCF}):l;XCL=f;return f}
function xcBar(f,l){if(!l.length)return '';return '<div class="acts" id="xcBar" style="margin:6px 0">'+(XCF?'<button class="ghost" onclick="xcF(\'\')">מציג רק: '+esc(XCF)+' ✕</button>':'')+
  '<button class="ghost" onclick="xcBulk()">שינוי קטגוריה לכמה הוצאות</button></div>'}

/* ---------- move many expenses to another category at once (the expenses shown now; trips keep "נסיעות") ---------- */
function xcBulkL(){return XCL.filter(function(x){return !(+x.km>0)})}
function xcBulk(){var l=xcBulkL();if(!l.length)return info('אין כאן הוצאות שאפשר להעביר (נסיעות נשארות בקטגוריה "נסיעות").');
  $('sheetBody').innerHTML='<b>שינוי קטגוריה לכמה הוצאות</b><small class="m">סמן הוצאות ובחר לאיזו קטגוריה להעביר אותן.</small>'+
    '<div class="acts" style="margin-top:8px"><button class="ghost" onclick="xcBAll(1)">בחירת הכל</button><button class="ghost" onclick="xcBAll(0)">ניקוי</button></div>'+
    '<div id="xbL" style="max-height:34vh;min-height:44px;flex-shrink:0;overflow:auto;margin:6px 0">'+l.map(function(x){return '<label class="xbRow" style="display:flex;gap:8px;align-items:center;margin:4px 0;font-weight:400"><input type="checkbox" data-id="'+x.id+'" onchange="xcBCnt()" style="width:auto;flex:none">'+xcIco(x.cat,1)+
      '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+fmt(x.date)+' · '+esc(x.cat)+(x.note?' · '+esc(x.note):'')+'</span><b style="flex:none">'+nis(x.amount)+'</b></label>'}).join('')+'</div>'+
    '<label for="xbC">לאיזו קטגוריה להעביר?</label><input id="xbC" list="xCats" autocomplete="off" oninput="xcSync(\'xbC\')" placeholder="בחר למטה או הקלד">'+xcChipsH('xbC','')+
    '<div id="xbE" class="owe" role="alert"></div><button id="xbGo" onclick="xcBGo()">העברה</button><button class="ghost" onclick="closeS()">ביטול</button>';$('sheet').hidden=false;xcBCnt()}
function xcBSel(){return [].filter.call(document.querySelectorAll('#xbL input[type=checkbox]'),function(c){return c.checked}).map(function(c){return +c.dataset.id})}
function xcBAll(on){[].forEach.call(document.querySelectorAll('#xbL input[type=checkbox]'),function(c){c.checked=!!on});xcBCnt()}
function xcBCnt(){var n=xcBSel().length,b=$('xbGo');if(b)b.textContent=n?'העברת '+n+' הוצאות':'העברה'}
function xcBGo(){var ids=xcBSel(),c=$('xbC').value.replace(/\s+/g,' ').trim(),e=$('xbE');if(!ids.length){e.textContent='סמן לפחות הוצאה אחת';return}if(!c){e.textContent='בחר קטגוריה';return}
  var n=0;(S.expenses||[]).forEach(function(x){if(ids.indexOf(x.id)>=0&&!(+x.km>0)&&x.cat!==c){x.cat=c;n++}});XCF='';closeS();save();render();okSave(n?'הועברו '+n+' הוצאות ל"'+c+'"':'לא היה מה לשנות')}
