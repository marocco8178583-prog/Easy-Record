/* beta.38: deadline of the 15th moves past Saturday / holidays, "done" also skips the phone notification, monthly income goal,
   import of expenses from a bank / credit-card file (src/js/65-money.js, 66-more.js, 67-plus.js). */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
(async()=>{const b=await chromium.launch();const R0=[];const ok=(n,c,d)=>R0.push([n,!!c,d]);
 const ctx=await b.newContext({viewport:{width:360,height:780}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(700);
 await p.evaluate(()=>{gLocal();S.clients.push({id:1,name:'נוח',rate:1000});S.expenses=[];S.rate=1000;derive();save();render()});

 // ===== 1. deadline of the 15th =====
 let r=await p.evaluate(()=>({nov:ds(due15(2026,10)),aug:ds(due15(2026,7)),kip:ds(due15(2032,8)),atz:ds(due15(2032,3)),st:ds(due15(2033,9)),jan:ds(due15(2027,0))}));
 ok('ה-15 ביום חול נשאר ה-15 (נובמבר 2026; ינואר 2027 ביום שישי)',r.nov==='2026-11-15'&&r.jan==='2027-01-15',JSON.stringify(r));
 ok('ה-15 בשבת עובר ליום ראשון (16.8.2026)',r.aug==='2026-08-16',r.aug);
 ok('ה-15 ביום כיפור (15.9.2032) עובר ל-16',r.kip==='2032-09-16',r.kip);
 ok('ה-15 ביום העצמאות שהוקדם (15.4.2032) עובר ל-16',r.atz==='2032-04-16',r.atz);
 ok('ה-15 בשבת שהיא גם שמחת תורה (15.10.2033) עובר ל-16',r.st==='2033-10-16',r.st);
 ok('מועד המע״מ לפי אותו כלל (דיווח חודשי על יולי 2026: עד 16.8)',await p.evaluate(()=>{S.vatPer=1;const a=ds(vatInfo(vatRange(new Date(2026,6,10))).deadline);S.vatPer=2;return a==='2026-08-16'}));
 r=await p.evaluate(()=>{try{localStorage.removeItem('er-dd-done')}catch(e){}S.ddOn=true;S.ddAdv=1;S.ddDays=2;S.vatOn=false;
  const f=d=>{const s=ddNow(d);return s?s.left:null};return {d13:f(new Date(2026,7,13,10)),d14:f(new Date(2026,7,14,10)),d16:f(new Date(2026,7,16,10)),d17:f(new Date(2026,7,17,10)),t:ddText(ddNow(new Date(2026,7,14,10)))}});
 ok('אוגוסט 2026: התזכורת עד 16.8 (מ-14 עד 16)',r.d13===null&&r.d14===2&&r.d16===0&&r.d17===null&&/^עד 16\/08\/2026/.test(r.t),JSON.stringify(r));

 // ===== 2. phone notifications skip a month marked "done" =====
 r=await p.evaluate(()=>{const RD=Date,fake=new RD(2026,6,20,10).getTime();window.Date=class extends RD{constructor(...a){a.length?super(...a):super(fake)}static now(){return fake}};
  const L=()=>ddNat().map(x=>[x.schedule.at.getMonth(),x.schedule.at.getDate(),x.body]);const o={all:L()};localStorage.setItem('er-dd-done','2026-08');o.skip=L();localStorage.removeItem('er-dd-done');window.Date=RD;return o});
 ok('התראות בטלפון: באוגוסט ב-14 (יומיים לפני 16.8), עם התאריך הנכון בהודעה',r.all.length===3&&r.all[0][0]===7&&r.all[0][1]===14&&/^עד 16\.8:/.test(r.all[0][2]),JSON.stringify(r.all));
 ok('חודש שסומן "טיפלתי" לא מקבל התראה בטלפון',r.skip.length===2&&r.skip.every(x=>x[0]!==7),JSON.stringify(r.skip));
 ok('"סימנתי שטיפלתי" מתזמן מחדש את ההתראות בטלפון',await p.evaluate(()=>{let n=0;const o=window.natSchedule;window.natSchedule=()=>{n++};ddDone();window.natSchedule=o;localStorage.removeItem('er-dd-done');return n===1}));
 await p.evaluate(()=>{S.ddOn=false;S.ddAdv=0;save()});

 // ===== 3. monthly income goal =====
 ok('בלי יעד: אין כרטיס יעד',await p.evaluate(()=>{S.incGoal=0;tab='dash';render();return !document.getElementById('goalCard')&&goalCard()===''}));
 r=await p.evaluate(()=>{const td=today();S.entries.push({id:9101,cid:1,date:td,days:3,rate:1000,amount:3000,receipt:false,note:''});derive();S.incGoal=10000;tab='dash';render();const c=document.getElementById('goalCard');return {t:c&&c.textContent,i:goalInfo()}});
 ok('יעד 10,000 והכנסה 3,000: 30%, נשאר 7,000, בערך עוד 7 ימי עבודה',r.t&&/30%/.test(r.t)&&/נשאר/.test(r.t)&&/7,000/.test(r.t)&&r.i.days===7,JSON.stringify(r));
 r=await p.evaluate(()=>{S.incGoal=2500;render();const t=document.getElementById('goalCard').textContent;return t});
 ok('כשעוברים את היעד: "הגעת ליעד!"',/הגעת ליעד/.test(r),r);
 await p.evaluate(()=>{S.incGoal=0;save();tab='set';render()});
 await p.fill('#sgoal','15000');await p.dispatchEvent('#sgoal','change');
 ok('הגדרות: יעד הכנסה חודשי נשמר ומסתנכרן',await p.evaluate(()=>S.incGoal===15000&&SETK.indexOf('incGoal')>=0&&setCont().incGoal===15000));
 await p.fill('#sgoal','');await p.dispatchEvent('#sgoal','change');
 ok('מחיקת היעד מכבה אותו',await p.evaluate(()=>S.incGoal===0));
 await p.evaluate(()=>{S.entries=S.entries.filter(e=>e.id!==9101);derive();save()});

 // ===== 4. import of expenses =====
 r=await p.evaluate(()=>[impDate('01/11/2026'),impDate('5.3.27'),impDate('2026-02-30'),impDate(46331),impDate('סה"כ'),impNum('1,200.50'),impNum('80.00-'),impNum('(12)'),impNum('₪ 7'),impNum('abc')]);
 ok('קריאת תאריכים וסכומים בפורמטים של בנקים',r[0]==='2026-11-01'&&r[1]==='2027-03-05'&&r[2]===''&&r[3]==='2026-11-05'&&r[4]===''&&r[5]===1200.5&&r[6]===-80&&r[7]===-12&&r[8]===7&&isNaN(r[9]),JSON.stringify(r));
 const csv='פרטי כרטיס 1234\n\nתאריך עסקה,שם בית העסק,סכום עסקה,סכום חיוב\n01/11/2026,פז דלק,"1,200.50","1,200.50"\n02/11/2026,"סופר ""שוק""",80,80\n04/11/2026,פז בע"מ רמת גן,15,15\n03/11/2026,זיכוי,-50,-50\nסה"כ,,,1230.5\n';
 await p.evaluate(async csv=>{S.expenses=[{id:1,date:'2026-11-02',amount:80,cat:'אוכל',note:'',cid:0}];await impFile(new File([csv],'cal.csv',{type:'text/csv'}))},csv);
 r=await p.evaluate(()=>({open:!$('sheet').hidden,d:$('imD').value,a:$('imA').value,n:$('imN').value,rows:document.querySelectorAll('.imRow').length,dup:[...document.querySelectorAll('.imRow')].map(x=>/כבר רשום/.test(x.textContent)),t:$('imL').textContent}));
 ok('CSV של כרטיס אשראי: זיהוי עמודות (תאריך עסקה, שם בית העסק, סכום חיוב)',r.open&&r.d==='0'&&r.n==='1'&&r.a==='3',JSON.stringify(r));
 ok('4 שורות עם תאריך וסכום (שורת סה״כ לא נכנסת); גרשיים בתוך שם (גם בע"מ בלי מירכאות) נקראים נכון',r.rows===4&&/סופר "שוק"/.test(r.t)&&/פז בע"מ רמת גן/.test(r.t),r.t);
 ok('שורה שכבר רשומה (2.11, 80 ₪) מסומנת "כבר רשום"',JSON.stringify(r.dup)==='[false,true,false,false]',JSON.stringify(r.dup));
 await p.evaluate(()=>impAll(1));
 r=await p.evaluate(()=>({n:impSel().length,btn:$('imGo').textContent}));
 ok('"בחירת הכל" לא בוחר שורות שכבר רשומות',r.n===3&&/הוספת 3 הוצאות/.test(r.btn),JSON.stringify(r));
 await p.evaluate(()=>{impAll(0);document.querySelector('#imL input[data-i="0"]').click()});
 await p.fill('#imC','דלק ונסיעות');await p.evaluate(()=>impSave());
 r=await p.evaluate(()=>{const x=S.expenses.find(z=>z.note==='פז דלק');return {n:S.expenses.length,x:x&&{d:x.date,a:x.amount,c:x.cat,cid:x.cid,ver:x.ver>0},closed:$('sheet').hidden}});
 ok('נוספה הוצאה אחת: 1.11.2026, 1,200.50 ₪, דלק ונסיעות, עם שם בית העסק בהערה, ונשמרת לסנכרון',r.n===2&&r.x&&r.x.d==='2026-11-01'&&r.x.a===1200.5&&r.x.c==='דלק ונסיעות'&&r.x.cid===0&&r.x.ver,JSON.stringify(r));
 ok('בלי שורות מסומנות: הודעה ולא מוסיף',await p.evaluate(async csv=>{await impFile(new File([csv],'a.csv'));const n=S.expenses.length;impSave();const t=$('imE').textContent;closeS();return S.expenses.length===n&&/לפחות שורה/.test(t)},csv));
 // Windows-1255 (older Israeli bank exports), ; separator
 r=await p.evaluate(async()=>{const enc={'א':0xE0,'ב':0xE1,'ג':0xE2,'ד':0xE3,'ה':0xE4,'ו':0xE5,'ז':0xE6,'ח':0xE7,'ט':0xE8,'י':0xE9,'ך':0xEA,'כ':0xEB,'ל':0xEC,'ם':0xED,'מ':0xEE,'ן':0xEF,'נ':0xF0,'ס':0xF1,'ע':0xF2,'ף':0xF3,'פ':0xF4,'ץ':0xF5,'צ':0xF6,'ק':0xF7,'ר':0xF8,'ש':0xF9,'ת':0xFA};
  const s='תאריך;תיאור;זכות;חובה\n10/11/2026;העברה;500;\n11/11/2026;ביטוח;;320.00\n',bytes=[];for(const ch of s)bytes.push(enc[ch]!==undefined?enc[ch]:ch.charCodeAt(0));
  await impFile(new File([new Uint8Array(bytes)],'bank.csv'));const o={a:$('imA').selectedOptions[0].textContent,n:$('imN').selectedOptions[0].textContent,t:$('imL').textContent,rows:document.querySelectorAll('.imRow').length};closeS();return o});
 ok('קובץ בנק בקידוד ישן (Windows-1255) עם ";" : עמודת "חובה" נבחרת ולא "זכות"',r.a==='חובה'&&r.n==='תיאור'&&r.rows===1&&/ביטוח/.test(r.t)&&/320/.test(r.t),JSON.stringify(r));
 // .xlsx with a date as an Excel day number
 r=await p.evaluate(async()=>{const z=new JSZip();
  z.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  z.file('xl/sharedStrings.xml','<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>תאריך רכישה</t></si><si><t>שם בית עסק</t></si><si><t>סכום חיוב</t></si><si><r><t>חשמל</t></r><r><t> ישראל</t></r></si></sst>');
  z.file('xl/worksheets/sheet1.xml','<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="s"><v>2</v></c></row><row r="2"><c r="A2"><v>46331</v></c><c r="B2" t="s"><v>3</v></c><c r="D2"><v>412.3</v></c></row></sheetData></worksheet>');
  const blob=await z.generateAsync({type:'blob'});await impFile(new File([blob],'max.xlsx'));const o={rows:document.querySelectorAll('.imRow').length,t:$('imL').textContent,a:$('imA').selectedOptions[0].textContent};
  document.querySelector('#imL input').click();impSave();const x=S.expenses.find(e=>e.note==='חשמל ישראל');return Object.assign(o,{x:x&&[x.date,x.amount]})});
 ok('קובץ Excel (xlsx): תאריך כמספר, עמודה ריקה באמצע, טקסט מחולק — נקרא נכון ונוסף',r.rows===1&&r.a==='סכום חיוב'&&r.x&&r.x[0]==='2026-11-05'&&r.x[1]===412.3,JSON.stringify(r));
 ok('קובץ xls ישן: הודעה להמיר ל-xlsx או CSV',await p.evaluate(async()=>{await impFile(new File([new Uint8Array([0xD0,0xCF,0x11,0xE0])],'old.xls'));const t=$('sheetBody').textContent;closeS();return /xls/.test(t)&&/CSV/.test(t)}));
 ok('קובץ בלי טבלה: הודעה ברורה',await p.evaluate(async()=>{await impFile(new File(['שלום'],'x.csv'));const t=$('sheetBody').textContent;closeS();return /לא מצאתי טבלה/.test(t)}));
 r=await p.evaluate(()=>{S.vatOn=true;tab='pay';PSUB='exp';render();return {card:!!document.getElementById('impBtn')&&document.getElementById('impCard').offsetParent!==null,sw:document.documentElement.scrollWidth<=innerWidth}});
 ok('במסך ההוצאות יש כרטיס "ייבוא הוצאות מקובץ"; אין גלילה הצידה ב-360px',r.card&&r.sw,JSON.stringify(r));
 r=await p.evaluate(async csv=>{await impFile(new File([csv],'a.csv'));const has=!!document.getElementById('imV');$('imV').value='0';document.querySelector('#imL input[data-i="3"]').click();impSave();const x=S.expenses.find(e=>e.note==="זיכוי");S.vatOn=false;return {has,nv:x&&x.nv,a:x&&x.amount,sw:document.documentElement.scrollWidth<=innerWidth}},csv);
 ok('עם מע״מ פעיל: אפשר לסמן "בלי מע״מ"; סכום שלילי נרשם כחיובי',r.has&&r.nv===1&&r.a===50,JSON.stringify(r));
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R0.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R0.length-f)+'/'+R0.length+' passed');await b.close();process.exit(f?1:0)})();
