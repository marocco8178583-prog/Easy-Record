/* Voice: one-shot spoken commands (Web Speech API, he-IL / en-US) and recorded voice notes (MediaRecorder).
   - Listening happens only after a tap, for a single phrase; never continuous or in the background.
   - The transcript is always shown. Anything that changes data asks for confirmation; there is always a Cancel button.
   - Where speech recognition is unavailable, the same commands can be typed.
   - Privacy: in Chrome/Android the browser sends the audio to Google's recognition service; Safari uses Apple's. The app explains this and asks once.
   - Voice notes are stored like receipts (on the device, and in the private cloud bucket when signed in). They are never sent to any transcription service. */
var VC={rec:null,on:false},VR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
function vcLang(){return (S.lang||'he')==='he'?'he-IL':'en-US'}
var HEN={'אחת':1,'אחד':1,'שתיים':2,'שניים':2,'שתי':2,'שני':2,'שלוש':3,'שלושה':3,'ארבע':4,'ארבעה':4,'חמש':5,'חמישה':5,'שש':6,'שישה':6,'שבע':7,'שבעה':7,'שמונה':8,'תשע':9,'תשעה':9,'עשר':10,'עשרה':10,'עשרים':20,'שלושים':30,'ארבעים':40,'חמישים':50,'שישים':60,'שבעים':70,'שמונים':80,'תשעים':90};
function vcNum(t){var m=String(t).replace(/,/g,'').match(/(\d+(?:\.\d+)?)/);if(m)return +m[1];var w=String(t).split(/\s+|-/),tot=0,cur=0,hit=false;
  w.forEach(function(x){x=x.replace(/^ו/,'');if(x==='מאה'){cur=(cur||1)*100;hit=true}else if(x==='מאתיים'){cur+=200;hit=true}else if(x==='מאות'){cur=(cur||1)*100;hit=true}else if(x==='אלף'){tot+=(cur||1)*1000;cur=0;hit=true}else if(x==='אלפיים'){tot+=2000;hit=true}else if(x==='אלפים'){tot+=(cur||1)*1000;cur=0;hit=true}else if(HEN[x]!=null){cur+=HEN[x];hit=true}});
  return hit?tot+cur:null}
function vcClient(t){var n=nk(t),best=null;S.clients.filter(function(c){return !c.arch}).forEach(function(c){var k=nk(c.name);if(k&&n.indexOf(k)>=0&&(!best||k.length>nk(best.name).length))best=c});return best}
function vcWhen(t){var d=new Date();if(/מחרתיים|day after tomorrow/.test(t))d.setDate(d.getDate()+2);else if(/מחר|tomorrow/.test(t))d.setDate(d.getDate()+1);var tm=null,m=t.match(/(?:בשעה|ב-?|at)\s*(\d{1,2})(?::(\d{2}))?/);if(m&&+m[1]<24)tm=String(+m[1]).padStart(2,'0')+':'+(m[2]||'00');return {d:ds(d),t:tm}}
/* parse -> {type:'answer'|'go'|'confirm'|'unknown', text, run} */
function vcParse(raw){var t=String(raw||'').toLowerCase().replace(/[.,!?״"']/g,' ').replace(/\s+/g,' ').trim(),s=activeSes();
  if(!t)return {type:'unknown',text:'לא נקלטה פקודה.'};
  if(/^(בטל|ביטול|cancel|stop listening)$/.test(t))return {type:'go',text:'בוטל',run:function(){}};
  if(/כמה שעות|how many hours/.test(t))return {type:'answer',text:txtToday()};
  if(/כמה (הרווחתי|הכנסתי|הרווחנו)|how much (did i |have i )?(earn|make|made)/.test(t))return {type:'answer',text:/היום|today/.test(t)?txtToday():txtMonth()};
  if(/^(סיכום|תן לי סיכום|summary)/.test(t))return {type:'answer',text:txtToday()+' '+txtMonth()};
  if(/(התחל|תתחיל|להתחיל|צא|תצא|יציאה)\s*(ל)?(ה)?הפסקה|start (a )?break|take a break/.test(t)){if(!s||s.st!=='run')return {type:'unknown',text:'אין שעון עבודה פעיל שאפשר לצאת ממנו להפסקה.'};return {type:'confirm',text:'יציאה להפסקה',run:function(){startBreak()}}}
  if(/(חזור|חזרה|תחזור|לחזור)\s*(ל)?(ה)?עבודה|(סיים|סוף|תסיים)\s*(את\s*)?(ה)?הפסקה|resume|back to work|end (the )?break/.test(t)){if(!s||s.st!=='brk')return {type:'unknown',text:'אין הפסקה פעילה.'};return {type:'confirm',text:'חזרה מההפסקה לעבודה',run:function(){endBreak()}}}
  if(/(התחל|תתחיל|להתחיל|הפעל|תפעיל)\s*(את\s*)?(ה)?(עבודה|שעון|משמרת)|start (work|the clock|shift|my shift)|clock in/.test(t)){if(s)return {type:'unknown',text:'כבר יש שעון עבודה פעיל.'};var c=vcClient(t);if(c)$('ckClient').value=c.name;var nm=($('ckClient').value||'').trim();if(!nm)return {type:'unknown',text:'לא ידוע אצל איזה לקוח. אמור למשל: "התחל עבודה אצל נוח".'};return {type:'confirm',text:'התחלת עבודה אצל '+nm,run:function(){$('ckClient').value=nm;try{ckPre()}catch(e){}startWork()}}}
  if(/(סיים|תסיים|לסיים|עצור|תעצור)\s*(את\s*)?(ה)?(עבודה|שעון|משמרת)|(stop|end|finish) (work|the clock|shift|my shift)|clock out/.test(t)){if(!s)return {type:'unknown',text:'אין שעון עבודה פעיל.'};return {type:'confirm',text:'סיום העבודה אצל '+cl(s.cid).name+' ('+hf(sesNet(s,Date.now())/3600000)+' שעות)',run:function(){finishWork()}}}
  if(/(הוסף|תוסיף|רשום|תרשום|קיבלתי)\s*(את\s*)?(ה)?תשלום|add (a )?payment|record (a )?payment|i got paid|received (a )?payment/.test(t)){var a=vcNum(t.replace(/.*תשלום|.*payment/,''))||vcNum(t);if(!(a>0))return {type:'unknown',text:'לא שמעתי סכום. אמור למשל: "הוסף תשלום של 600 שקל מנוח".'};
    var cc=vcClient(t),open=S.clients.filter(function(c){return S.entries.some(function(e){return e.cid===c.id&&e.bl>0.004})});if(!cc&&open.length===1)cc=open[0];
    if(!cc)return {type:'pick',text:'תשלום של '+nis(a)+'. ממי התקבל?',list:open,amount:a};
    return {type:'confirm',text:'פתיחת רישום תשלום של '+nis(a)+' מ'+cc.name+'. בחלון הבא תראה לאילו ימים הוא משויך ותאשר.',run:function(){vcPay(cc.id,a)}}}
  if(/(צור|תיצור|הוסף|תוסיף|קבע|תקבע|רשום|תרשום)\s*(לי\s*)?(תזכורת|משימה)|remind me|(add|create) (a )?(reminder|task)/.test(t)){var w=vcWhen(t),title=raw.replace(/.*?(תזכורת|משימה|remind me|reminder|task)\s*/i,'').replace(/^(ל|על|to)\s*/,'').replace(/(מחרתיים|מחר|היום|tomorrow|today|day after tomorrow)/gi,'').replace(/(בשעה|at)\s*\d{1,2}(:\d{2})?/gi,'').replace(/\s+/g,' ').trim()||'תזכורת';
    return {type:'confirm',text:'יצירת תזכורת "'+title+'" ל-'+fmt(w.d)+(w.t?' בשעה '+w.t:''),run:function(){taskAdd(title,w.d,w.t||'',vcClient(t)?vcClient(t).id:0);render();toast('התזכורת נוספה')}}}
  if(/לקוחות|clients|customers/.test(t))return {type:'go',text:'פותח את רשימת הלקוחות',run:function(){tab='cli';CID=null;render()}};
  if(/חובות|מי חייב|חייבים לי|debts|who owes/.test(t))return {type:'go',text:'פותח את החובות הפתוחים',run:function(){tab='pay';PSUB='in';filt='unpaid';render()}};
  if(/לוח שנה|יומן|calendar/.test(t))return {type:'go',text:'פותח את לוח השנה',run:function(){tab='cal';render()}};
  if(/הגדרות|settings/.test(t))return {type:'go',text:'פותח את ההגדרות',run:function(){tab='set';render()}};
  if(/דשבורד|דוחות|dashboard|reports/.test(t))return {type:'go',text:'פותח את הדשבורד',run:function(){tab='dash';render()}};
  if(/הוצאות|expenses/.test(t))return {type:'go',text:'פותח את ההוצאות',run:function(){tab='pay';pSub('exp')}};
  if(/(מסך )?(הבית|היום שלי)|home|my day/.test(t))return {type:'go',text:'פותח את היום שלי',run:function(){tab='clock';render()}};
  return {type:'unknown',text:'לא הבנתי את הפקודה: "'+raw+'".'}}
function vcPay(cid,a){payClient(cid);var i=$('pca');if(i){i.value=r2(a);try{var cap=[].slice.call(document.querySelectorAll('.pck:checked')).reduce(function(s,x){return s+(+x.dataset.bl)},0);if(a>cap+0.004)$('pce').textContent='הסכום גבוה מהחוב הפתוח של הלקוח ('+nis(cap)+'). בדוק לפני השמירה.'}catch(e){}}}
function vcSheet(){var can=!!VR;$('sheetBody').innerHTML='<b>פקודה קולית</b>'+(can?'<div class="vcmic"><button id="vcGo" class="vcbig" aria-label="הקשבה" onclick="vcListen()"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><small class="m" id="vcSt">לחץ ודבר. ההקשבה נעצרת לבד בסוף המשפט.</small></div>':'<small class="m">זיהוי דיבור לא זמין בדפדפן הזה. אפשר להקליד את אותן פקודות.</small>')+
  '<div id="vcTr" class="vctr" aria-live="polite"></div><div id="vcAct"></div><label for="vcTxt">'+(can?'או הקלד פקודה':'הקלד פקודה')+'</label><input id="vcTxt" autocomplete="off" placeholder="למשל: כמה הרווחתי החודש"><div class="acts"><button onclick="vcRun($(\'vcTxt\').value)">ביצוע</button><button class="ghost" onclick="vcStop();closeS()">ביטול</button></div>'+
  '<details><summary class="m">דוגמאות</summary><small class="m" style="display:block;line-height:1.9">התחל עבודה אצל נוח · התחל הפסקה · חזור לעבודה · סיים עבודה · כמה שעות עבדתי היום · כמה הרווחתי החודש · הוסף תשלום של 600 שקל מנוח · פתח את רשימת הלקוחות · הצג לי את החובות · צור תזכורת למחר בשעה 9 להתקשר לרואה החשבון</small></details>';$('sheet').hidden=false;
  var ti=$('vcTxt');ti.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();vcRun(ti.value)}}}
function vcConsent(go){var k='er-vc-ok';try{if(localStorage.getItem(k))return go()}catch(e){}
  $('vcAct').innerHTML='<div class="card" style="margin:8px 0"><b>לפני השימוש הראשון</b><small class="m" style="display:block;line-height:1.6">המיקרופון פועל רק אחרי לחיצה, למשפט אחד, ונעצר לבד. הזיהוי נעשה על ידי שירות הדיבור של הדפדפן: בכרום ובאנדרואיד ההקלטה נשלחת לשרתי Google, בספארי לשרתי Apple. Easy Record לא שומרת את ההקלטה.</small><div class="acts"><button onclick="try{localStorage.setItem(\'er-vc-ok\',\'1\')}catch(e){};$(\'vcAct\').innerHTML=\'\';vcListen()">הבנתי, להמשיך</button><button class="ghost" onclick="$(\'vcAct\').innerHTML=\'\'">לא עכשיו</button></div></div>'}
function vcListen(){if(!VR)return;vcConsent(function(){vcStop();var r=new VR();VC.rec=r;r.lang=vcLang();r.interimResults=true;r.continuous=false;r.maxAlternatives=1;var fin='';VC.on=true;var b=$('vcGo');if(b)b.classList.add('on');$('vcSt').textContent='מקשיב...';
  r.onresult=function(ev){var t='';for(var i=0;i<ev.results.length;i++){t+=ev.results[i][0].transcript;if(ev.results[i].isFinal)fin=t}$('vcTr').textContent=t};
  r.onerror=function(ev){VC.on=false;var m=ev.error==='not-allowed'||ev.error==='service-not-allowed'?'אין הרשאה למיקרופון. אפשר לאשר בהגדרות הדפדפן, או להקליד את הפקודה.':ev.error==='no-speech'?'לא נשמע דיבור. נסה שוב.':ev.error==='network'?'אין חיבור לשירות הזיהוי. אפשר להקליד את הפקודה.':'הזיהוי נכשל ('+ev.error+'). אפשר להקליד את הפקודה.';var st=$('vcSt');if(st)st.textContent=m;var bb=$('vcGo');if(bb)bb.classList.remove('on')};
  r.onend=function(){VC.on=false;var bb=$('vcGo');if(bb)bb.classList.remove('on');var st=$('vcSt');if(st&&/מקשיב/.test(st.textContent))st.textContent='';var t=fin||($('vcTr')?$('vcTr').textContent:'');if(t)vcRun(t)};
  try{r.start()}catch(e){$('vcSt').textContent='לא ניתן להפעיל את המיקרופון כרגע.'}})}
function vcStop(){try{if(VC.rec)VC.rec.abort()}catch(e){}VC.rec=null;VC.on=false}
function vcRun(text){var tr=$('vcTr');if(tr)tr.textContent=text;var p=vcParse(text),a=$('vcAct');if(!a)return p;
  if(p.type==='answer'){a.innerHTML='<div class="card vcans">'+esc(p.text)+'</div>';speak(p.text,true)}
  else if(p.type==='go'){a.innerHTML='';closeS();p.run();toast(p.text)}
  else if(p.type==='confirm'){a.innerHTML='<div class="card"><b>לבצע?</b><div style="margin:6px 0">'+esc(p.text)+'</div><div class="acts"><button id="vcYes">ביצוע</button><button class="ghost" onclick="$(\'vcAct\').innerHTML=\'\'">ביטול</button></div></div>';$('vcYes').onclick=function(){closeS();p.run()}}
  else if(p.type==='pick'){a.innerHTML='<div class="card"><b>'+esc(p.text)+'</b><div class="acts">'+(p.list.length?p.list.map(function(c){return '<button class="ghost" data-c="'+c.id+'">'+esc(c.name)+'</button>'}).join(''):'<small class="m">אין לקוחות עם חוב פתוח.</small>')+'</div></div>';[].forEach.call(a.querySelectorAll('[data-c]'),function(b){b.onclick=function(){closeS();vcPay(+b.dataset.c,p.amount)}})}
  else a.innerHTML='<div class="card owe">'+esc(p.text)+'</div>';return p}
/* ---- voice notes ---- */
var VN={mr:null,chunks:[],t0:0,timer:null,cid:0,eid:0},VN_MAX_S=120,VN_MAX_B=3*1024*1024;
function vnOk(){return !!(window.MediaRecorder&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)}
function vnMime(){var l=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus','audio/ogg'];for(var i=0;i<l.length;i++){try{if(MediaRecorder.isTypeSupported(l[i]))return l[i]}catch(e){}}return ''}
function vnSheet(cid,eid){if(!DB)return info('שמירת קבצים לא זמינה בדפדפן הזה.');if(!vnOk())return info('הקלטת שמע לא נתמכת בדפדפן הזה.');VN.cid=cid;VN.eid=eid||0;var e=eid?ent(eid):null;
  $('sheetBody').innerHTML='<b>הערה קולית'+(e?' ליום '+fmt(e.date):' ל'+esc(cl(cid).name))+'</b><small class="m">עד '+(VN_MAX_S/60)+' דקות. ההקלטה נשמרת במכשיר, ובענן הפרטי שלך אם אתה מחובר. היא לא נשלחת לשום שירות תמלול.</small><div class="vcmic"><button id="vnB" class="vcbig" aria-label="התחלת הקלטה" onclick="vnToggle()"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><b id="vnT" dir="ltr">0:00</b></div><div id="vnE" class="owe" role="alert"></div><button class="ghost" onclick="vnCancel()">ביטול</button>';$('sheet').hidden=false}
async function vnToggle(){if(VN.mr&&VN.mr.state==='recording'){VN.mr.stop();return}var er=$('vnE');er.textContent='';var st;try{st=await navigator.mediaDevices.getUserMedia({audio:true})}catch(x){er.textContent=x&&x.name==='NotAllowedError'?'אין הרשאה למיקרופון. אפשר לאשר בהגדרות הדפדפן.':'לא ניתן לפתוח את המיקרופון.';return}
  var mt=vnMime(),mr;try{mr=mt?new MediaRecorder(st,{mimeType:mt,audioBitsPerSecond:32000}):new MediaRecorder(st)}catch(x){st.getTracks().forEach(function(t){t.stop()});er.textContent='ההקלטה לא נתמכת כאן.';return}
  VN.mr=mr;VN.chunks=[];VN.t0=Date.now();mr.ondataavailable=function(ev){if(ev.data&&ev.data.size)VN.chunks.push(ev.data)};
  mr.onstop=function(){clearInterval(VN.timer);st.getTracks().forEach(function(t){t.stop()});if(VN.cancel){VN.cancel=false;VN.mr=null;return}var b=new Blob(VN.chunks,{type:(mr.mimeType||mt||'audio/webm').split(';')[0]});VN.mr=null;vnSave(b,Date.now()-VN.t0)};
  mr.start(1000);$('vnB').classList.add('on');$('vnB').setAttribute('aria-label','עצירת הקלטה');VN.timer=setInterval(function(){var s=Math.floor((Date.now()-VN.t0)/1000),el=$('vnT');if(el)el.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');if(s>=VN_MAX_S&&VN.mr)VN.mr.stop()},250)}
function vnCancel(){if(VN.mr&&VN.mr.state==='recording'){VN.cancel=true;VN.mr.stop()}closeS()}
async function vnSave(b,ms){if(!b||!b.size){$('vnE').textContent='ההקלטה ריקה.';return}if(b.size>VN_MAX_B){$('vnE').textContent='ההקלטה גדולה מדי ('+Math.round(b.size/1024)+' KB). אפשר עד '+(VN_MAX_B/1048576)+' MB.';return}
  var e=VN.eid?ent(VN.eid):null,ext=/mp4/.test(b.type)?'m4a':/ogg/.test(b.type)?'ogg':'webm',r={id:uid(),cid:VN.cid,eid:VN.eid||0,name:'הערה קולית '+(e?e.date:today())+' '+new Date().toTimeString().slice(0,5).replace(':','-')+'.'+ext,type:b.type,date:e?e.date:today(),blob:b,kind:'voice',dur:Math.round(ms/1000)};
  try{await tx('readwrite',function(s){return s.put(r)});R.push(r)}catch(x){$('vnE').textContent='השמירה נכשלה. ייתכן שאין מקום פנוי.';return}
  try{rcSoon()}catch(x){}closeS();render();toast('ההערה הקולית נשמרה')}
