/* beta.39: refunds / money in are not picked by "select all" in the import, category remembered by merchant,
   days off (reserve duty, sick, vacation) in the calendar and statistics, comparison with the same month last year
   (src/js/67-plus.js, 60-reports.js, 70-ui.js). */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
(async()=>{const b=await chromium.launch();const R0=[];const ok=(n,c,d)=>R0.push([n,!!c,d]);
 const ctx=await b.newContext({viewport:{width:360,height:780}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(700);
 await p.evaluate(()=>{gLocal();S.clients.push({id:1,name:'נוח',rate:1000});S.expenses=[];S.rate=1000;S.vatOn=false;derive();save();render()});
 const rows=()=>p.evaluate(()=>{const l=[...document.querySelectorAll('.imRow')].map(x=>x.textContent);impAll(1);const o={l,sel:impSel().map(r=>r.n),mem:!$('imMemL').hidden};return o});

 // ===== 1. refunds / money in =====
 await p.evaluate(async()=>{await impFile(new File(['תאריך,שם בית העסק,סכום חיוב\n01/11/2026,פז,100\n02/11/2026,שופרסל,80\n03/11/2026,זיכוי שופרסל,-30\n04/11/2026,בזק,60\n'],'card.csv'))});
 let r=await rows();
 ok('כרטיס אשראי: הזיכוי (מינוס) מסומן "זיכוי / נכנס"',/זיכוי \/ נכנס/.test(r.l[2])&&!/זיכוי \/ נכנס/.test(r.l[0]+r.l[1]+r.l[3]),JSON.stringify(r.l));
 ok('"בחירת הכל" לא בוחר את הזיכוי',JSON.stringify(r.sel)==='["פז","שופרסל","בזק"]',JSON.stringify(r.sel));
 await p.evaluate(()=>closeS());
 await p.evaluate(async()=>{await impFile(new File(['תאריך,תיאור,סכום\n01/11/2026,ביטוח,-320\n02/11/2026,העברה מלקוח,5000\n03/11/2026,ארנונה,-450\n05/11/2026,חשמל,-210\n'],'bank.csv'))});
 r=await rows();
 ok('עו״ש עם עמודת סכום אחת: הכסף שנכנס (פלוס) מסומן ולא נבחר; ההוצאות (מינוס) נבחרות',/זיכוי \/ נכנס/.test(r.l[1])&&JSON.stringify(r.sel)==='["ביטוח","ארנונה","חשמל"]',JSON.stringify(r));
 await p.evaluate(()=>{document.querySelector('#imL input[data-i="1"]').click();});
 ok('אפשר עדיין לסמן ידנית שורה של זיכוי',await p.evaluate(()=>impSel().length===4));
 await p.evaluate(()=>closeS());
 await p.evaluate(async()=>{await impFile(new File(['תאריך,תיאור,סכום\n01/11/2026,א,10\n02/11/2026,ב,20\n'],'pos.csv'))});
 r=await rows();
 ok('קובץ בלי סכומים שליליים: אין סימון זיכוי, הכל נבחר',r.sel.length===2&&!r.l.some(x=>/זיכוי \/ נכנס/.test(x)),JSON.stringify(r));
 await p.evaluate(()=>closeS());

 // ===== 2. category remembered by merchant =====
 ok('מפתח בית עסק: בלי מספרים וסימנים',await p.evaluate(()=>impKey('פז דלק 1234 - ת"א')===impKey('פז  דלק 99 ת״א')&&impKey('12345')===''));
 await p.evaluate(()=>{S.expenses=[{id:11,date:'2026-09-01',amount:150,cat:'אוכל',note:'סונול 12',cid:0},{id:12,date:'2026-10-01',amount:200,cat:'דלק',note:'סונול 77',cid:0},{id:13,date:'2026-10-02',amount:50,cat:'אחר',note:'בזק',cid:0}];save()});
 await p.evaluate(async()=>{await impFile(new File(['תאריך,שם בית העסק,סכום חיוב\n10/11/2026,סונול 555,180\n11/11/2026,בזק,60\n12/11/2026,חדש,40\n'],'mem.csv'))});
 r=await rows();
 ok('שורה של בית עסק מוכר מציגה את הקטגוריה האחרונה (דלק), ו"אחר" לא נזכר',/דלק/.test(r.l[0])&&!/אחר/.test(r.l[1])&&r.mem,JSON.stringify(r));
 await p.fill('#imC','משרד');await p.evaluate(()=>impSave());
 r=await p.evaluate(()=>S.expenses.filter(x=>x.date>='2026-11-10').map(x=>[x.note,x.cat]));
 ok('בשמירה: בית עסק מוכר מקבל את הקטגוריה שלו (בזק לפי השם, מ-beta.40), השאר את הקטגוריה שנבחרה',JSON.stringify(r)==='[["סונול 555","דלק"],["בזק","טלפון ואינטרנט"],["חדש","משרד"]]',JSON.stringify(r));
 await p.evaluate(async()=>{await impFile(new File(['תאריך,שם בית העסק,סכום חיוב\n20/11/2026,סונול 9,90\n'],'mem2.csv'))});
 await p.evaluate(()=>{$('imMem').checked=false;document.querySelector('#imL input').click();$('imC').value='אחזקה';impSave()});
 ok('בלי הסימון "הקטגוריה מהפעם הקודמת": כל השורות מקבלות את הקטגוריה שנבחרה',await p.evaluate(()=>S.expenses.find(x=>x.note==='סונול 9').cat==='אחזקה'));
 ok('בלי בית עסק מוכר: הסימון לא מוצג',await p.evaluate(async()=>{await impFile(new File(['תאריך,שם בית העסק,סכום חיוב\n20/11/2026,משהו אחר,90\n'],'m3.csv'));const h=$('imMemL').hidden;closeS();return h}));

 // ===== 3. days off =====
 await p.evaluate(()=>{tab='cal';pick('2026-11-03')});
 r=await p.evaluate(()=>({box:$('offBox').textContent,btn:document.querySelectorAll('#offBox button').length}));
 ok('בלוח השנה: כרטיס "לא עבדת?" עם מילואים / מחלה / חופשה',r.btn===3&&/מילואים/.test(r.box)&&/מחלה/.test(r.box)&&/חופשה/.test(r.box),JSON.stringify(r));
 await p.evaluate(()=>{offSet('2026-11-03','res');pick('2026-11-04');offSet('2026-11-04','res');offSet('2026-11-05','sick');offSet('2025-12-30','vac')});
 r=await p.evaluate(()=>({m:S.offD,mark:[...document.querySelectorAll('#cgrid .offm')].map(x=>x.textContent),info:$('offBox').textContent,pressed:document.querySelector('#offBox button[aria-pressed="true"]').textContent,set:setCont().offD}));
 ok('סימון נשמר בהגדרות (מסתנכרן) ומופיע ביומן',r.m['2026-11-03']==='res'&&r.set['2026-11-05']==='sick'&&JSON.stringify(r.mark)==='["מיל","מיל","מחל"]',JSON.stringify(r));
 ok('ספירה חודשית והכפתור של היום הנבחר מסומן',/החודש: מילואים 2 · מחלה 1/.test(r.info)&&r.pressed==='מילואים',r.info);
 await p.evaluate(()=>offSet('2026-11-04','res'));
 ok('לחיצה נוספת על אותו סוג מבטלת',await p.evaluate(()=>!S.offD['2026-11-04']&&S.offD['2026-11-03']==='res'));
 await p.evaluate(()=>offSet('2026-11-03','vac'));
 ok('מעבר לסוג אחר מחליף',await p.evaluate(()=>S.offD['2026-11-03']==='vac'));
 await p.evaluate(()=>{offSet('2026-11-03','res');offSet('2026-11-04','res')});
 ok('תאריך לא תקין לא נשמר',await p.evaluate(()=>{offSet('abc','res');return !S.offD.abc}));
 ok('גיבוי: ימי החופש נכנסים לגיבוי',await p.evaluate(()=>{const o=expObj();return JSON.stringify(o).indexOf('2026-11-05')>=0}));

 // ===== 4. statistics: days off and the same month last year =====
 await p.evaluate(()=>{S.entries.push({id:9201,cid:1,date:'2025-11-10',days:2,rate:1000,amount:2000,receipt:false,note:''},{id:9202,cid:1,date:'2026-11-10',days:3,rate:1000,amount:3000,receipt:false,note:''});derive();save();GY=2026;GM=10;tab='set';ST='stats';render();rStats()});
 r=await p.evaluate(()=>({yoy:($('gyoy')||{}).textContent,off:($('offStats')||{}).textContent,copy:offCopyTxt(2026)}));
 ok('השוואה לנובמבר 2025: +1,000 (+50%)',/נובמבר 2025/.test(r.yoy)&&/1,000/.test(r.yoy)&&/50%/.test(r.yoy)&&/2 ימים/.test(r.yoy),r.yoy);
 ok('כרטיס "ימים שלא עבדת ב-2026" עם ספירה ותאריכי המילואים',/מילואים 2 · מחלה 1/.test(r.off)&&/03\/11\/2026/.test(r.off)&&!/30\/12/.test(r.off),r.off);
 ok('טקסט להעתקה: ימי מילואים 2026 (2)',/^ימי מילואים 2026 \(2\): /.test(r.copy),r.copy);
 r=await p.evaluate(()=>{GM=0;rStats();return $('gyoy').textContent});
 ok('בלי רישומים בשנה שעברה: כתוב שאין',/אין רישומים/.test(r),r);
 r=await p.evaluate(()=>{const y=new Date().getFullYear(),t=today(),ly=(y-1)+t.slice(4);S.entries.push({id:9203,cid:1,date:ly,days:1,rate:1000,amount:1000,receipt:false,note:''});derive();const o=yoyYtd(y,new Date());S.entries=S.entries.filter(e=>e.id!==9203);derive();return o});
 ok('מתחילת השנה מול אותה תקופה אשתקד (כולל אותו תאריך בשנה שעברה)',r&&r.b>=1000,JSON.stringify(r));
 ok('שנה שאינה השנה הנוכחית: אין השוואה מתחילת השנה',await p.evaluate(()=>yoyYtd(2020,new Date())===null));
 ok('אין גלילה הצידה ב-360px',await p.evaluate(()=>{const a=[];for(const t of ['cal','set','pay','dash']){tab=t;render();a.push(document.documentElement.scrollWidth<=innerWidth)}return a.every(Boolean)}));
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R0.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R0.length-f)+'/'+R0.length+' passed');await b.close();process.exit(f?1:0)})();
