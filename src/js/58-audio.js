/* Sounds, read-aloud (speechSynthesis) and in-app alerts.
   Every alert goes through alertUser(kind,...): the visual message always shows; sound, speech and system notifications obey the per-type mute list, quiet hours and the master switch.
   Volume follows the device (Web Audio cannot exceed it; silent/ringer mode on phones is respected by the OS). Sounds are synthesized (no audio files). */
var ACX=null,ALERTK={start:'התחלת עבודה',stop:'סיום עבודה',brk:'הפסקה',longbrk:'הפסקה ארוכה',longrun:'שעון שנשאר פעיל',pay:'תשלום שהתקבל',debt:'חוב שמועדו הגיע',task:'תזכורות ומשימות'};
function sOn(k){var v=S&&S[k];return v==null?!!DEFSET[k]:!!v}
function muted(kind){return !!(S.mute&&S.mute[kind])}
function quietNow(){if(!S.qhOn)return false;var n=new Date(),m=n.getHours()*60+n.getMinutes(),p=function(t){var a=String(t||'').split(':');return (+a[0]||0)*60+(+a[1]||0)},a=p(S.qh1||'22:00'),b=p(S.qh2||'07:00');return a<=b?(m>=a&&m<b):(m>=a||m<b)}
/* ---- sound engine (Web Audio, synthesized — no files) ----
   Modes (S.sndMode): 'sound' | 'both' (sound + vibration) | 'vibe' (vibration only) | 'off' (completely silent).
   Volume S.sndVol 0–100 is relative: it can never go above the device volume, and the phone's silent switch / ringer mode still applies.
   Browsers only allow audio after a user gesture, so the AudioContext is created/unlocked on the first tap; the "app opened" chime plays on that first tap.
   Sounds never pile up: a new sound fades out the previous one (taps are throttled and skipped while another sound is playing). */
var SNDK={tap:'לחיצה על כפתור',open:'פתיחת האפליקציה',start:'התחלת עבודה',stop:'סיום עבודה',brk:'יציאה להפסקה',resume:'חזרה לעבודה',save:'שמירה הצליחה',err:'שגיאה',alert:'התראה ותזכורת',pay:'תשלום שהתקבל'};
var SNDV={tap:8,open:[20,40,20],start:[30,50,30],stop:[70],brk:[25,40,25],resume:[25],save:[15],err:[50,70,50],alert:[90,70,90],pay:[20,30,20,30,40],task:[90,70,90],debt:[90,70,90],longbrk:[90,70,90],longrun:[120,80,120],test:[30]};
function sndMode(){var m=S&&S.sndMode;if(m==='sound'||m==='both'||m==='vibe'||m==='off')return m;return sOn('snd')?'sound':'off'}
function audioOk(){return !!(window.AudioContext||window.webkitAudioContext)}
function vibeOk(){return typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'||!!(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics)}
var ACX=ACX||null,AMAST=null,ACUR=null,ALAST=0,AOPEN=false;
function actx(){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!ACX){ACX=new C();AMAST=ACX.createGain();AMAST.connect(ACX.destination)}if(ACX.state==='suspended'){try{ACX.resume()}catch(e){}}AMAST.gain.value=Math.pow(Math.max(0,Math.min(100,S.sndVol==null?70:+S.sndVol))/100,1.6);return ACX}
/* tone recipes: [freq, start, dur, gain, type, glideTo] — soft sine/triangle bells with quick attack and smooth decay */
var SNDR={
 tap:[[1350,0,.035,.35,'sine',900]],
 open:[[523.25,0,.22,.5,'sine'],[659.25,.09,.22,.45,'sine'],[783.99,.18,.32,.45,'sine'],[1046.5,.27,.45,.3,'sine']],
 start:[[587.33,0,.13,.55,'sine'],[880,.1,.24,.5,'sine'],[1174.7,.1,.24,.12,'sine']],
 stop:[[880,0,.12,.5,'sine'],[698.46,.1,.12,.45,'sine'],[587.33,.2,.3,.45,'sine']],
 brk:[[659.25,0,.16,.45,'triangle',622]],
 resume:[[622.25,0,.1,.4,'triangle'],[783.99,.08,.18,.45,'sine']],
 save:[[1046.5,0,.09,.4,'sine'],[1567.98,.06,.16,.32,'sine']],
 err:[[311.13,0,.14,.5,'triangle',293.66],[261.63,.15,.22,.5,'triangle',246.94]],
 alert:[[987.77,0,.12,.5,'sine'],[1318.5,.13,.12,.45,'sine'],[987.77,.3,.12,.45,'sine'],[1318.5,.43,.2,.4,'sine']],
 pay:[[783.99,0,.1,.45,'sine'],[987.77,.08,.1,.45,'sine'],[1174.7,.16,.3,.45,'sine']],
 test:[[660,0,.1,.45,'sine'],[880,.09,.16,.45,'sine']]};
var SNDALIAS={task:'alert',debt:'alert',longbrk:'alert',longrun:'alert'};
function vibe(kind){try{var m=sndMode();if(m!=='both'&&m!=='vibe')return false;var pt=SNDV[kind]||[20];var H=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Haptics;if(H){if(kind==='tap')H.impact({style:'LIGHT'});else if(kind==='err')H.notification({type:'ERROR'});else if(kind==='save')H.notification({type:'SUCCESS'});else H.vibrate({duration:Array.isArray(pt)?pt[0]:pt});return true}if(typeof navigator.vibrate==='function')return navigator.vibrate(pt)}catch(e){}return false}
function tones(kind,force){var C=actx();if(!C)return false;var rec=SNDR[SNDALIAS[kind]||kind]||SNDR.test,now=C.currentTime,t0=now+.01,soft=(S.sndKind||'soft')==='soft';
  if(kind!=='tap'&&ACUR&&ACUR.end>now){try{ACUR.g.gain.cancelScheduledValues(now);ACUR.g.gain.setValueAtTime(ACUR.g.gain.value,now);ACUR.g.gain.linearRampToValueAtTime(0,now+.04)}catch(e){}}
  var bus=C.createGain();bus.gain.value=1;bus.connect(AMAST);var end=t0;
  rec.forEach(function(x){var o=C.createOscillator(),g=C.createGain(),st=t0+x[1],du=x[2],pk=x[3]*(soft?.55:.8);o.type=soft?x[4]:(x[4]==='sine'?'triangle':x[4]);o.frequency.setValueAtTime(x[0],st);if(x[5])o.frequency.exponentialRampToValueAtTime(x[5],st+du);
    g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(pk,st+Math.min(.012,du/4));g.gain.exponentialRampToValueAtTime(.0001,st+du);o.connect(g);g.connect(bus);o.start(st);o.stop(st+du+.03);end=Math.max(end,st+du+.03)});
  if(kind!=='tap')ACUR={g:bus,end:end};ALAST=Date.now();return true}
/* play a named sound (and/or vibration) if the settings allow it. force=true is used by the test buttons (ignores quiet hours and the per-type list, not the mode). */
function sndPlay(kind,force){try{var m=sndMode();if(m==='off')return false;if(!force&&(muted(kind)||quietNow()))return false;if(kind==='tap'&&!force&&!sOn('tap'))return false;
  if(kind==='tap'&&!force&&ACUR&&ACX&&ACUR.end>ACX.currentTime)return false;
  var v=vibe(kind),a=false;if(m==='sound'||m==='both')a=tones(kind,force);return a||v}catch(e){return false}}
function tapPlay(){return sndPlay('tap')}
var TAPSEL='button,[role=button],[role=tab],a[href],a[onclick],summary,select,label,input[type=checkbox],input[type=radio],.chip,.tab,[onclick]';
var TAPLAST=0;
/* first user gesture: unlock audio (iOS/Android require it) and play the "app opened" chime once per launch instead of the tap */
function aUnlock(){try{var C=actx();if(C&&C.state!=='running'&&C.resume)C.resume();if(C){var bf=C.createBuffer(1,1,22050),sr=C.createBufferSource();sr.buffer=bf;sr.connect(C.destination);sr.start(0)}}catch(e){}}
document.addEventListener('pointerdown',function(ev){try{if(ev.button!=null&&ev.button>0)return;var first=!AOPEN;if(first){AOPEN=true;if(sndMode()!=='off')aUnlock()}
  var el=ev.target&&ev.target.closest&&ev.target.closest(TAPSEL);if(!el||el.disabled||el.getAttribute('aria-disabled')==='true'){if(first)sndPlay('open');return}var n=Date.now();if(n-TAPLAST<40)return;TAPLAST=n;if(first&&sndPlay('open'))return;tapPlay()}catch(e){}},true);
document.addEventListener('keydown',function(ev){try{if(ev.key!=='Enter'&&ev.key!==' ')return;var el=ev.target&&ev.target.closest&&ev.target.closest('button,[role=button],a[href],summary');if(!el||el.disabled)return;if(!AOPEN){AOPEN=true;aUnlock()}var n=Date.now();if(n-TAPLAST<40)return;TAPLAST=n;tapPlay()}catch(e){}},true);
function ttsOk(){return 'speechSynthesis' in window&&typeof SpeechSynthesisUtterance==='function'}
function speakLang(){var l=S.lang||'he';return {he:'he-IL',en:'en-US',ar:'ar-SA',ru:'ru-RU',fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT',pt:'pt-BR',am:'am-ET',zh:'zh-CN',ja:'ja-JP'}[l]||'he-IL'}
function speak(text,force){try{if(!ttsOk()||!text)return false;if(!force&&(!S.tts||quietNow()))return false;speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(String(text));u.lang=speakLang();u.rate=+S.ttsRate||1;var vs=speechSynthesis.getVoices().filter(function(v){return v.lang&&v.lang.slice(0,2)===u.lang.slice(0,2)});if(vs[0])u.voice=vs[0];speechSynthesis.speak(u);return true}catch(e){return false}}
function alertUser(kind,msg,say){ALAST=Date.now();toast(msg);if(muted(kind))return;sndPlay(kind);if(say)speak(say);
  try{if(document.hidden&&!quietNow()&&window.Notification&&Notification.permission==='granted')new Notification('Easy Record',{body:msg,tag:'er-'+kind})}catch(e){}}
/* spoken / written summaries (also used by voice commands) */
function sumToday(){var td=today(),h=0,a=0,s=activeSes();S.entries.forEach(function(e){if(e.date===td){h+=eh(e);a+=c100(e.amount)}});if(s){h+=sesNet(s,Date.now())/3600000;a+=c100(clkPay(s,Date.now()))}return {h:h,a:a/100,running:!!s}}
function sumMonth(){var m=today().slice(0,7),a=0,p=0,d=0;S.entries.forEach(function(e){if(e.date.slice(0,7)===m){a+=c100(e.amount);p+=c100(e.pa);d+=e.days}});return {a:a/100,p:p/100,d:d}}
function txtToday(){var t=sumToday();return 'היום עבדת '+hf(t.h)+' שעות, והכנסה משוערת של '+nis(t.a)+(t.running?'. השעון עדיין פעיל.':'.')}
function txtMonth(){var m=sumMonth();return 'החודש הרווחת '+nis(m.a)+' על '+m.d+' ימי עבודה. התקבל '+nis(m.p)+', ונשאר לגבות '+nis(m.a-m.p)+'.'}
function readSummary(){var t=txtToday()+' '+txtMonth();toast(t);if(!speak(t,true))info(t)}
/* wrap clock & payment actions with sounds (only when the action really happened) */
(function(){var w=function(name,kind){var f=window[name];if(typeof f!=='function')return;window[name]=function(){var b=JSON.stringify(activeSes()?{st:activeSes().st,id:activeSes().id}:null),r=f.apply(this,arguments),a=JSON.stringify(activeSes()?{st:activeSes().st,id:activeSes().id}:null);if(a!==b)sndPlay(kind);return r}};
  w('startWork','start');w('startBreak','brk');w('endBreak','resume');w('finishWork','stop');
  var ap=window.addPay;if(typeof ap==='function')window.addPay=function(){var p=ap.apply(this,arguments);if(p)alertUser('pay','נרשם תשלום של '+nis(p.amount));return p}})();
/* periodic checks: long break, clock left running, debts I owe that are due today */
var ALN={};
function alertTick(){var s=activeSes(),now=Date.now();if(s){if(s.st==='brk'){var b=s.br[s.br.length-1],mx=(+S.brkMax||30)*60000;if(b&&b.b==null&&now-b.a>=mx&&!ALN['b'+s.id+'_'+s.br.length]){ALN['b'+s.id+'_'+s.br.length]=1;alertUser('longbrk','ההפסקה נמשכת כבר '+Math.round((now-b.a)/60000)+' דקות','ההפסקה נמשכת כבר '+Math.round((now-b.a)/60000)+' דקות')}}
    var hh=(+S.runMax||12)*3600000;if(now-s.t0>=hh&&!ALN['r'+s.id]){ALN['r'+s.id]=1;alertUser('longrun','שעון העבודה פעיל כבר '+Math.floor((now-s.t0)/3600000)+' שעות. אולי שכחת לסיים?','שעון העבודה עדיין פעיל')}}
  var td=today();(S.debts||[]).forEach(function(d){if(d.due&&d.due<=td&&typeof debtBal==='function'&&debtBal(d)>0){var k='er-dn-'+d.id+'-'+td;try{if(localStorage.getItem(k))return;localStorage.setItem(k,'1')}catch(e){return}alertUser('debt','הגיע מועד התשלום ל'+d.name+': '+nis(debtBal(d)))}})}
setInterval(alertTick,30000);document.addEventListener('visibilitychange',function(){if(!document.hidden){alertTick();try{taskCheck()}catch(e){}}});
/* settings UI */
function rSound(){var b=$('sndBox');if(!b)return;var mu=S.mute||{};
  var md=sndMode(),vo=S.sndVol==null?70:+S.sndVol,opt=function(v,t){return '<option value="'+v+'"'+(md===v?' selected':'')+'>'+t+'</option>'};
  b.innerHTML='<label for="sMode">מצב צלילים ורטט</label><select id="sMode" style="width:100%" onchange="S.sndMode=this.value;S.snd=this.value===\'off\'?0:1;save();rSound();if(this.value!==\'off\')sndPlay(\'save\',true)">'+opt('sound','צלילים בלבד')+opt('both','צלילים ורטט')+opt('vibe','רטט בלבד')+opt('off','שקט מוחלט')+'</select>'+
  '<label for="sVol">עוצמת הצלילים: <span id="sVolV">'+vo+'%</span></label><input id="sVol" type="range" min="0" max="100" step="5" value="'+vo+'" style="width:100%" oninput="S.sndVol=+this.value;$(\'sVolV\').textContent=this.value+\'%\'" onchange="save();sndPlay(\'tap\',true)"'+(md==='off'||md==='vibe'?' disabled':'')+'><small class="m">העוצמה יחסית לעוצמת המכשיר ולא יכולה לעבור אותה. באייפון, כשמתג השקט פעיל, הדפדפן לא משמיע צלילים.</small>'+
  '<label for="sSndK">סוג צליל</label><select id="sSndK" style="width:100%" onchange="S.sndKind=this.value;save();sndPlay(\'start\',true)"><option value="soft"'+((S.sndKind||'soft')==='soft'?' selected':'')+'>רך</option><option value="clear"'+(S.sndKind==='clear'?' selected':'')+'>ברור</option></select>'+
  '<label for="sTap">צליל בלחיצה על כפתורים</label><select id="sTap" style="width:100%" onchange="S.tap=+this.value;save()"><option value="1"'+(sOn('tap')?' selected':'')+'>פעיל</option><option value="0"'+(!sOn('tap')?' selected':'')+'>כבוי</option></select>'+
  '<small class="m" id="sndSup">'+(!audioOk()?'⚠️ הדפדפן הזה לא תומך בהשמעת צלילים. ':'')+(vibeOk()?'רטט נתמך במכשיר הזה.':'⚠️ רטט לא נתמך במכשיר או בדפדפן הזה'+(/iPhone|iPad|iPod/.test(navigator.userAgent||'')?' (בדפדפן באייפון אין רטט)':'')+'.')+'</small>'+
  '<label>בדיקת צלילים</label><div class="chips sndT">'+Object.keys(SNDK).map(function(k){return '<button type="button" class="ghost" onclick="sndTest(\''+k+'\')">▶ '+SNDK[k]+'</button>'}).join('')+'</div><small class="m" id="sndTS" aria-live="polite"></small>'+
  '<label for="sTts">הקראה קולית של סיכומים ותזכורות</label><select id="sTts" style="width:100%" onchange="S.tts=+this.value;save()"><option value="0"'+(!S.tts?' selected':'')+'>כבויה</option><option value="1"'+(S.tts?' selected':'')+'>פעילה</option></select>'+(ttsOk()?'':'<small class="owe">הדפדפן הזה לא תומך בהקראה קולית.</small>')+
  '<label>אילו התראות להשמיע</label><div class="chk">'+Object.keys(ALERTK).map(function(k){return '<label><input type="checkbox" data-k="'+k+'"'+(mu[k]?'':' checked')+' onchange="muteSet(this)"> '+ALERTK[k]+'</label>'}).join('')+'</div>'+
  '<div class="two"><div><label for="sBrk">התראה על הפסקה אחרי (דקות)</label><input id="sBrk" type="number" min="5" max="240" value="'+(+S.brkMax||30)+'" onchange="S.brkMax=Math.max(5,+this.value||30);save()"></div><div><label for="sRun">שעון פעיל יותר מ (שעות)</label><input id="sRun" type="number" min="1" max="24" value="'+(+S.runMax||12)+'" onchange="S.runMax=Math.max(1,+this.value||12);save()"></div></div>'+
  '<label for="sQh">שעות שקטות (בלי צליל, הקראה או התראת מערכת)</label><select id="sQh" style="width:100%" onchange="S.qhOn=+this.value;save();rSound()"><option value="0"'+(!S.qhOn?' selected':'')+'>כבויות</option><option value="1"'+(S.qhOn?' selected':'')+'>פעילות</option></select>'+(S.qhOn?'<div class="two"><div><label for="sQ1">מ-</label><input id="sQ1" type="time" value="'+(S.qh1||'22:00')+'" onchange="S.qh1=this.value;save()"></div><div><label for="sQ2">עד</label><input id="sQ2" type="time" value="'+(S.qh2||'07:00')+'" onchange="S.qh2=this.value;save()"></div></div>':'')+
  '<label for="sBp">הפסקות</label><select id="sBp" style="width:100%" onchange="S.brPaid=+this.value;save()"><option value="0"'+(!S.brPaid?' selected':'')+'>ללא תשלום (מורדות מהזמן)</option><option value="1"'+(S.brPaid?' selected':'')+'>בתשלום (לא מורדות)</option></select><small class="m">השינוי חל על שעונים חדשים בלבד.</small>'+
  '<div class="acts"><button class="ghost" onclick="readSummary()">הקראת סיכום</button><button class="ghost" onclick="notifAsk()">אישור התראות מערכת</button></div><small class="m" id="nfSt"></small>';
  var ns=$('nfSt');if(ns)ns.textContent=!window.Notification?'הדפדפן לא תומך בהתראות מערכת.':Notification.permission==='granted'?'התראות מערכת מאושרות. הן מופיעות כשהאפליקציה פתוחה ברקע, לא כשהיא סגורה לגמרי.':Notification.permission==='denied'?'התראות מערכת חסומות בהגדרות הדפדפן.':''}
function sndTest(k){var m=sndMode(),st=$('sndTS'),r=sndPlay(k,true);if(!st)return;st.textContent=m==='off'?'מצב שקט מוחלט פעיל. שנה את המצב כדי לשמוע.':m==='vibe'?(vibeOk()?'רטט: '+SNDK[k]:'רטט לא נתמך במכשיר הזה.'):!audioOk()?'הדפדפן לא תומך בצלילים.':(r?'מושמע: '+SNDK[k]:'לא ניתן להשמיע כרגע. נסה שוב אחרי לחיצה נוספת על המסך.')}
function muteSet(el){S.mute=Object.assign({},S.mute||{});if(el.checked)delete S.mute[el.dataset.k];else S.mute[el.dataset.k]=true;save()}
function notifAsk(){if(!window.Notification)return info('הדפדפן הזה לא תומך בהתראות מערכת.');try{Notification.requestPermission().then(function(){rSound()})}catch(e){}}
