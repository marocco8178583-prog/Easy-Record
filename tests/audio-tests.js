/* sound + haptics: modes, volume, per-event sounds, overlap, unlock, settings UI */
const {chromium}=require('playwright'),path=require('path');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__osc=[];window.__vib=[];window.__ctx=0;navigator.vibrate=function(x){__vib.push(x);return true};
 class P{constructor(v){this.value=v||0}setValueAtTime(v){this.value=v}linearRampToValueAtTime(v){}exponentialRampToValueAtTime(){}cancelScheduledValues(){}}
 class G{constructor(){this.gain=new P(1)}connect(){}}
 class O{constructor(){this.frequency=new P(0);this.type='sine'}connect(){}start(){__osc.push(this.frequency.value)}stop(){}}
 window.AudioContext=class{constructor(){__ctx++;this.state='suspended';this.destination={}}get currentTime(){return performance.now()/1000}createOscillator(){return new O()}createGain(){return new G()}resume(){this.state='running'}createBuffer(){return {}}createBufferSource(){return {connect(){},start(){}}}}});
await p.goto('file://'+path.join(__dirname,'..','dist','index.html'));await p.waitForTimeout(700);await p.evaluate(()=>gLocal());
const R=[];const ok=(n,c,d)=>R.push([n,!!c,d]);const E=f=>p.evaluate(f);
ok('לפני לחיצה ראשונה לא נוצר AudioContext',await E(()=>__ctx===0));
await p.click('#nav button[data-t="pay"]');ok('לחיצה ראשונה: השמע נפתח ומושמע צליל פתיחה (4 צלילים)',await E(()=>__ctx===1&&ACX.state==='running'&&__osc.length===4),await E(()=>JSON.stringify([__ctx,__osc.length])));
await p.waitForTimeout(900);await E(()=>{__osc=[]});await p.click('#nav button[data-t="cal"]');ok('לחיצה רגילה: צליל לחיצה קצר אחד',await E(()=>__osc.length===1&&__osc[0]===1350),await E(()=>JSON.stringify([__osc,ACUR&&ACUR.end,ACX.currentTime,AOPEN])));
const kinds=['start','stop','brk','resume','save','err','alert','pay'];const sig={};for(const k of kinds){await E(()=>{__osc=[];ACUR=null});await p.evaluate(k=>sndPlay(k,true),k);sig[k]=await E(()=>__osc.join(','))}
ok('לכל אירוע צליל משלו (8 צלילים שונים)',new Set(Object.values(sig)).size===8&&Object.values(sig).every(Boolean),JSON.stringify(sig));
await E(()=>{__osc=[];ACUR={end:999,g:{gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}}}}});await E(()=>sndPlay('tap'));ok('צליל לחיצה לא חופף לצליל אחר שמתנגן',await E(()=>__osc.length===0));await E(()=>{ACUR=null});
await E(()=>{S.sndVol=50;actx()});ok('עוצמה 50% משפיעה על עוצמת הפלט',await E(()=>Math.abs(AMAST.gain.value-Math.pow(.5,1.6))<1e-6));
await E(()=>{S.sndVol=0;actx()});ok('עוצמה 0% = שקט',await E(()=>AMAST.gain.value===0));await E(()=>{S.sndVol=70});
await E(()=>{S.sndMode='off';__osc=[];__vib=[];sndPlay('start');sndPlay('tap')});ok('שקט מוחלט: אין צליל ואין רטט',await E(()=>__osc.length===0&&__vib.length===0));
await E(()=>{S.sndMode='vibe';__osc=[];__vib=[];sndPlay('start')});ok('רטט בלבד: רטט בלי צליל',await E(()=>__osc.length===0&&__vib.length===1));
await E(()=>{S.sndMode='both';__osc=[];__vib=[];ACUR=null;sndPlay('err')});ok('צלילים ורטט: שניהם',await E(()=>__osc.length>0&&__vib.length===1));
await E(()=>{S.sndMode='sound';__osc=[];__vib=[];ACUR=null;sndPlay('save')});ok('צלילים בלבד: בלי רטט',await E(()=>__osc.length>0&&__vib.length===0));
await E(()=>{S.tap=0;__osc=[];sndPlay('tap')});ok('כיבוי צליל לחיצה',await E(()=>__osc.length===0));await E(()=>{S.tap=1});
await E(()=>{S.qhOn=1;S.qh1='00:00';S.qh2='23:59';__osc=[];ACUR=null;sndPlay('start')});ok('שעות שקטות משתיקות',await E(()=>__osc.length===0));await E(()=>{S.qhOn=0});
await E(()=>{S.clients.push({id:1,name:'נוח',phone:''});save();tab='clock';render();__osc=[];ACUR=null;$('ckClient').value='נוח';lastClk=0;startWork()});ok('התחלת עבודה משמיעה את צליל ההתחלה',await E(()=>__osc[0]===587.33),await E(()=>__osc.join(',')));
await E(()=>{__osc=[];ACUR=null;startBreak()});ok('יציאה להפסקה: צליל הפסקה',await E(()=>__osc[0]===659.25));
await E(()=>{__osc=[];ACUR=null;endBreak()});ok('חזרה מהפסקה: צליל חזרה',await E(()=>__osc[0]===622.25));
await E(()=>{__osc=[];ACUR=null;finishWork()});ok('סיום עבודה: צליל סיום',await E(()=>__osc[0]===880&&__osc[2]===587.33),await E(()=>__osc.join(',')));await E(()=>closeS());
await E(()=>{__osc=[];ACUR=null;ALAST=0;toast('נשמר')});ok('הודעת שמירה משמיעה צליל הצלחה',await E(()=>__osc[0]===1046.5));
await E(()=>{__osc=[];ACUR=null;alertUser('task','תזכורת: בדיקה')});ok('תזכורת: צליל התראה (בלי צליל שמירה כפול)',await E(()=>__osc[0]===987.77&&__osc.length===4),await E(()=>__osc.join(',')));
await E(()=>{tab='set';render()});ok('הגדרות: 4 מצבים, עוצמה ו-10 כפתורי בדיקה',await E(()=>$('sMode').options.length===4&&!!$('sVol')&&document.querySelectorAll('.sndT button').length===10));
await p.selectOption('#sMode','both');ok('בחירת מצב נשמרת',await E(()=>S.sndMode==='both'));
await p.reload();await p.waitForTimeout(700);ok('ההעדפה נשמרת אחרי רענון',await E(()=>sndMode()==='both'&&S.sndVol===70));
await E(()=>{tab='set';render()});await p.click('.sndT button >> nth=2');ok('כפתור בדיקה משמיע ומדווח',await E(()=>/מושמע/.test($('sndTS').textContent)),await E(()=>$('sndTS').textContent));
await E(()=>{delete S.sndMode;S.snd=0});ok('תאימות: משתמש שהשתיק בעבר נשאר מושתק',await E(()=>sndMode()==='off'));
ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
let f=0;R.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R.length-f)+'/'+R.length+' passed');await b.close();process.exit(f?1:0)})();
