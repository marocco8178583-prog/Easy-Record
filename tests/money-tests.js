/* beta.35: VAT for a licensed dealer, pension + keren hishtalmut deposits, work days to a calendar file (src/js/65-money.js). */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
(async()=>{const b=await chromium.launch();const R=[];const ok=(n,c,d)=>R.push([n,!!c,d]);
 const ctx=await b.newContext({viewport:{width:360,height:780}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(700);await p.evaluate(()=>{gLocal();S.clients.push({id:1,name:'נוח, בע"מ',rate:1000});derive();save();render()});
 // ---- VAT periods
 const per=await p.evaluate(()=>{const f=r=>ds(r.s)+'..'+ds(r.e);const a=[f(vatRange(new Date(2026,10,24))),f(vatRange(new Date(2026,10,24),1)),f(vatRange(new Date(2027,0,5),1))];
  S.vatPer=1;a.push(f(vatRange(new Date(2026,10,24))),f(vatRange(new Date(2026,10,24),1)));S.vatPer=2;return a});
 ok('דיווח דו-חודשי: נובמבר–דצמבר, הקודמת ספטמבר–אוקטובר',per[0]==='2026-11-01..2027-01-01'&&per[1]==='2026-09-01..2026-11-01',JSON.stringify(per));
 ok('בינואר התקופה הקודמת היא נובמבר–דצמבר של השנה שעברה',per[2]==='2026-11-01..2027-01-01',per[2]);
 ok('דיווח חודשי: נובמבר, הקודמת אוקטובר',per[3]==='2026-11-01..2026-12-01'&&per[4]==='2026-10-01..2026-11-01',JSON.stringify(per));
 // ---- VAT amounts
 const v=await p.evaluate(()=>{const d=today();S.vatOn=true;S.vatR=18;S.vatInc='exc';S.cb='work';
  S.entries.push({id:11,cid:1,date:d,days:1,rate:1000,amount:1000},{id:12,cid:1,date:d,days:1,rate:1000,amount:1000},{id:13,cid:1,date:'2099-01-01',days:1,rate:1000,amount:1000});
  S.expenses=[{id:21,date:d,amount:590,cat:'כלים'},{id:22,date:d,amount:300,cat:'ביטוח',nv:1}];save();
  const a=vatInfo(vatRange(new Date()));S.vatInc='inc';const b=vatInfo(vatRange(new Date()));const t=taxInfo();S.vatInc='exc';const t2=taxInfo();S.vatOn=false;const t3=taxInfo();S.vatOn=true;
  return {out:a.out,inp:a.inp,due:a.due,outInc:Math.round(b.out*100)/100,incInc:Math.round(t.inc*100)/100,incExc:t2.inc,expNet:Math.round(t2.exp*100)/100,inc0:t3.inc,exp0:t3.exp}});
 ok('מע״מ עסקאות: 2 ימים של 1,000 לפני מע״מ = 360 (יום עתידי לא נספר)',v.out===360,JSON.stringify(v));
 ok('מע״מ תשומות: הוצאה 590 כולל מע״מ = 90; הוצאה "בלי מע״מ" לא נספרת',v.inp===90,JSON.stringify(v));
 ok('לתשלום: 360 - 90 = 270',v.due===270,JSON.stringify(v));
 ok('כשהסכומים כוללים מע״מ: 2,000 → מע״מ 305.08',v.outInc===305.08,v.outInc);
 ok('כרטיס המס עם מע״מ: הכנסה בלי המע״מ (2,000 / 1.18)',v.incInc===1694.92,v.incInc);
 ok('כרטיס המס עם מע״מ: הוצאות בלי המע״מ (500 + 300)',v.expNet===800&&v.incExc===2000,JSON.stringify(v));
 ok('בלי מע״מ (עוסק פטור): כרטיס המס כמו קודם',v.inc0===2000&&v.exp0===890,JSON.stringify(v));
 await p.evaluate(()=>{tab='dash';render()});
 let c=await p.evaluate(()=>{const el=document.getElementById('vatCard');return el?el.textContent:''});
 ok('כרטיס מע״מ בדשבורד עם לתשלום ותאריך דיווח',c.indexOf('לתשלום')>=0&&/\d\d\/\d\d\/\d{4}/.test(c),c.slice(0,120));
 // ---- VAT settings + expense form
 await p.evaluate(()=>{S.vatOn=false;setVals();tab='set';render()});await p.selectOption('#svat','on');
 ok('הגדרות: אפשרויות המע״מ מוצגות כשפעיל',await p.evaluate(()=>document.getElementById('svat').value==='on'&&!document.getElementById('svatW').hidden&&document.getElementById('svatR').value==='18'));
 await p.selectOption('#svatP','1');await p.selectOption('#svatI','inc');
 ok('שינוי תדירות ובסיס נשמר',await p.evaluate(()=>S.vatPer===1&&S.vatInc==='inc'));
 await p.fill('#svatR','99');await p.dispatchEvent('#svatR','change');
 ok('שיעור לא תקין חוזר ל-18',await p.evaluate(()=>S.vatR===18));
 await p.selectOption('#svatP','2');await p.selectOption('#svatI','exc');
 await p.evaluate(()=>{tab='pay';render();pSub('exp')});
 ok('בטופס ההוצאה מופיע "מע״מ בהוצאה" כשמע״מ פעיל',await p.evaluate(()=>!document.getElementById('xVatW').hidden));
 await p.fill('#xA','100');await p.fill('#xC','ביטוח');await p.selectOption('#xVat','0');await p.evaluate(()=>expAdd());
 ok('הוצאה "בלי מע״מ" נשמרת כך',await p.evaluate(()=>S.expenses[S.expenses.length-1].nv===1));
 await p.evaluate(()=>expEdit(S.expenses[S.expenses.length-1].id));await p.selectOption('#xeV','1');await p.evaluate(()=>expEditGo(S.expenses[S.expenses.length-1].id));
 ok('בעריכה אפשר לשנות ל"יש מע״מ"',await p.evaluate(()=>!S.expenses[S.expenses.length-1].nv));
 await p.evaluate(()=>{S.vatOn=false;save();tab='pay';render();pSub('exp')});
 ok('כשמע״מ כבוי: אין שדה מע״מ בטופס ואין כרטיס',await p.evaluate(()=>{const h=document.getElementById('xVatW').hidden;tab='dash';render();return h&&!document.getElementById('vatCard')}));
 // ---- pension math (by hand from the 2026 ceilings)
 const m=await p.evaluate(()=>{const r=x=>Math.round(x);const a=pnCalc(120000,0,0,2.25),b=pnCalc(200000,0,0,2.25),c=pnCalc(120000,10000,0,2.25),d=pnCalc(120000,15000,0,2.25),e=pnCalc(120000,0,6000,2.25),z=pnCalc(0,5000,5000,2.25);
  return {a:r(a.must),b:r(b.must),c:r(c.save),d:[r(d.ded),r(d.cr),r(d.save)],e:[r(e.khDed),r(e.save),r(e.khMaxDed)],z:r(z.save)}});
 ok('חובת פנסיה ברווח 120,000: 4.45% עד 6,884.5 + 12.55% מעליו = 8,368',m.a===8368,m.a);
 ok('חובת פנסיה מעל השכר הממוצע: 14,044 לשנה (המרבי)',m.b===14044,m.b);
 ok('הפקדה 10,000 לפנסיה (רווח 120,000): ניכוי במדרגת 14% = חיסכון 1,400',m.c===1400,m.c);
 ok('הפקדה 15,000: ניכוי 13,200 (11%) + זיכוי 35% על 1,800 = 2,478',JSON.stringify(m.d)==='[13200,630,2478]',JSON.stringify(m.d));
 ok('קרן השתלמות 6,000 (רווח 120,000): מוכר 5,400 (4.5%), חיסכון 756',JSON.stringify(m.e)==='[5400,756,5400]',JSON.stringify(m.e));
 ok('בלי רווח אין חיסכון במס',m.z===0,m.z);
 // ---- pension card + deposits
 await p.evaluate(()=>{tab='dash';render()});
 ok('כרטיס פנסיה מופיע בדשבורד (ברירת מחדל)',await p.evaluate(()=>!!document.getElementById('pnCard')));
 await p.click('#pnBtn');await p.fill('#pdA','-5');await p.evaluate(()=>pnAdd());
 ok('הפקדה שלילית נדחית',await p.evaluate(()=>pnDepL().length===0&&document.getElementById('pdE').textContent.length>0));
 const y=await p.evaluate(()=>new Date().getFullYear());
 await p.fill('#pdA','3000');await p.selectOption('#pdK','pn');await p.evaluate(()=>pnAdd());
 await p.fill('#pdA','2000');await p.selectOption('#pdK','kh');await p.evaluate(()=>pnAdd());
 await p.fill('#pdA','999');await p.fill('#pdD',(y-1)+'-12-30');await p.evaluate(()=>pnAdd());
 let pi=await p.evaluate(()=>{const i=pnInfo();return {pn:i.pn,kh:i.kh,rows:document.querySelectorAll('.pdRow').length,sync:SETK.indexOf('pnDep')>=0&&setCont().pnDep.length===3&&expV3().settings.pnDep.length===3}});
 ok('הפקדות נספרות לפי סוג ורק של השנה',pi.pn===3000&&pi.kh===2000,JSON.stringify(pi));
 ok('בחלון: רק הפקדות השנה',pi.rows===2,pi.rows);
 ok('ההפקדות נשמרות בסנכרון ובגיבוי',pi.sync);
 await p.evaluate(()=>pnDel(pnDepL().find(x=>x.a===3000).id));
 ok('מחיקת הפקדה',await p.evaluate(()=>pnInfo().pn===0));
 await p.evaluate(()=>{closeS();S.dob='1960-01-01';tab='dash';render()});
 ok('גיל 66 לפי תאריך הלידה: חובת הפנסיה לא חלה',await p.evaluate(()=>!pnInfo().mustApply&&document.getElementById('pnCard').textContent.indexOf('לא חלה')>=0));
 await p.evaluate(()=>{S.dob='';S.pnDep='bad';});
 ok('ערך פגום לא שובר את הכרטיס',await p.evaluate(()=>{try{render();return pnInfo().pn===0&&!!document.getElementById('pnCard')}catch(e){return false}}));
 await p.evaluate(()=>{S.pnDep=[];tab='set';render()});await p.selectOption('#spn','off');
 ok('כיבוי מסתיר את כרטיס הפנסיה',await p.evaluate(()=>{tab='dash';render();return !document.getElementById('pnCard')&&S.pnOn===false}));
 await p.evaluate(()=>{S.pnOn=true;S.vatOn=true;save();tab='dash';render()});
 ok('מסך 360px: אין גלילה אופקית בדשבורד עם כל הכרטיסים',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // ---- calendar file
 const ics=await p.evaluate(async()=>{const d=today(),t=new Date();t.setDate(t.getDate()+3);const fut=ds(t),old=ds(new Date(Date.now()-10*864e5)),vold=ds(new Date(Date.now()-90*864e5));
  S.entries=[{id:31,cid:1,date:fut,days:1,rate:1000,amount:1000,t1:'08:00',t2:'16:30',note:'משמרת בוקר; קומה 2'},{id:32,cid:1,date:fut,days:1,rate:800,amount:800,t1:'22:00',t2:'06:00',note:''},
   {id:33,cid:1,date:d,days:1,rate:600,amount:600,note:''},{id:34,cid:1,date:old,days:1,rate:600,amount:600,note:''},{id:35,cid:1,date:vold,days:1,rate:600,amount:600,note:''},
   {id:36,cid:1,date:fut,days:1,rate:600,amount:600,note:'בוטל ב-Find Medic'}];save();
  let got=null;const D=dl;dl=function(n,b){got=[n,b]};tab='dash';render();document.getElementById('icsR').value='future';icsGo();const txt=await got[1].text();
  document.getElementById('icsR').value='30';icsGo();const t30=await got[1].text();document.getElementById('icsR').value='all';icsGo();const tall=await got[1].text();
  S.entries=[];document.getElementById('icsR').value='future';got=null;icsGo();const none=got===null&&!document.getElementById('sheet').hidden;closeS();dl=D;
  const n=s=>(s.match(/BEGIN:VEVENT/g)||[]).length,ln=txt.split('\r\n'),bytes=ln.map(l=>new TextEncoder().encode(l).length);
  return {name:got===null,fut:n(txt),d30:n(t30),all:n(tall),none,crlf:txt.indexOf('\n')===txt.indexOf('\r\n')+1&&!/[^\r]\n/.test(txt),maxB:Math.max(...bytes),
   timed:txt.indexOf('DTSTART:'+fut.replace(/-/g,'')+'T080000')>=0&&txt.indexOf('DTEND:'+fut.replace(/-/g,'')+'T163000')>=0,
   night:(()=>{const e=new Date(fut);e.setDate(e.getDate()+1);return txt.indexOf('DTEND:'+ds(e).replace(/-/g,'')+'T060000')>=0})(),
   allday:txt.indexOf('DTSTART;VALUE=DATE:'+d.replace(/-/g,''))>=0,uid:txt.indexOf('UID:er-31@easyrecord')>=0,cancel:txt.indexOf('er-36@')<0,
   esc:txt.replace(/\r\n /g,'').indexOf('SUMMARY:נוח\\, בע"מ')>=0&&txt.replace(/\r\n /g,'').indexOf('משמרת בוקר\\; קומה 2')>=0,sum:txt.replace(/\r\n /g,'').split('\r\n').filter(l=>l.indexOf('משמרת')>=0).join(' | '),start:txt.startsWith('BEGIN:VCALENDAR'),end:txt.trim().endsWith('END:VCALENDAR')}});
 ok('קובץ יומן תקין (מתחיל ונגמר נכון, שורות CRLF)',ics.start&&ics.end&&ics.crlf,JSON.stringify(ics));
 ok('"מהיום והלאה": 3 ימים (היום ועתידיים), בלי משמרת שבוטלה',ics.fut===3&&ics.cancel,ics.fut);
 ok('"30 הימים האחרונים": 4; "הכול": 5',ics.d30===4&&ics.all===5,JSON.stringify([ics.d30,ics.all]));
 ok('יום עם שעות: אירוע 08:00–16:30',ics.timed);
 ok('משמרת לילה 22:00–06:00 נגמרת למחרת',ics.night);
 ok('יום בלי שעות: אירוע של יום שלם',ics.allday);
 ok('מזהה קבוע לכל יום (ייצוא חוזר מעדכן ולא מכפיל)',ics.uid);
 ok('פסיקים ונקודה-פסיק בשם ובהערה מוגנים',ics.esc,ics.sum);
 ok('שורות לא ארוכות מ-75 בתים (קיפול לפי התקן)',ics.maxB<=75,ics.maxB);
 ok('אין ימים לייצוא: הודעה במקום קובץ ריק',ics.none);
 ok('הכפתור במסך הדוחות',await p.evaluate(()=>{tab='dash';render();return !!document.getElementById('icsBtn')}));
 const en=await p.evaluate(async()=>{S.lang='en';save();render();await new Promise(r=>setTimeout(r,300));const h=[...document.querySelectorAll('#dashBody h2')].map(x=>x.textContent);S.lang='he';save();render();return h});
 ok('באנגלית: כותרות מע״מ ופנסיה מתורגמות',en.indexOf('VAT')>=0&&en.indexOf('Pension and study fund')>=0,JSON.stringify(en));
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R.length-f)+'/'+R.length+' passed');await b.close();process.exit(f?1:0)})();
