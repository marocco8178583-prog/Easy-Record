/* beta.37: receipts on expenses, business trips by km, reminders before the 15th, and the extra parts of the accountant export
   (src/js/66-more.js, 45-receipts.js, 53-expenses.js, 63-accountant.js). */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
const JSZipN=(()=>{for(const m of [process.env.JSZIP_MOD,'jszip','/opt/npm-tools/node_modules/jszip'])try{if(m)return require(m)}catch(e){}return null})();
(async()=>{const b=await chromium.launch();const R0=[];const ok=(n,c,d)=>R0.push([n,!!c,d]);
 const ctx=await b.newContext({viewport:{width:360,height:780},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(700);
 await p.evaluate(()=>{gLocal();S.clients.push({id:1,name:'נוח',rate:1000});S.expenses=[];derive();save();render()});
 const y=await p.evaluate(()=>new Date().getFullYear()),td=await p.evaluate(()=>today());

 // ===== 1. receipts on an expense =====
 await p.evaluate(td=>{S.expenses.push({id:7001,date:td,amount:100,cat:'ציוד',note:'',cid:1});save();tab='pay';PSUB='exp';render()},td);
 ok('בכרטיס ההוצאה יש כפתור "קבלה"',await p.evaluate(()=>[...document.querySelectorAll('#expList button')].some(b=>b.textContent.trim()==='קבלה')));
 await p.evaluate(()=>xRc(7001));
 ok('חלון קבלות להוצאה: עדיין אין קבלה, יש כפתור העלאה',await p.evaluate(()=>/עדיין אין קבלה/.test($('sheetBody').textContent)&&!!document.getElementById('xRcUp')));
 const rid=await p.evaluate(async()=>{closeS();UP={eid:0,cid:1,xid:7001};const dt=new DataTransfer();dt.items.add(new File(['%PDF-1.4 x'],'kabala.pdf',{type:'application/pdf'}));$('rf').files=dt.files;await $('rf').onchange();closeS();return R[R.length-1].id});
 let r=await p.evaluate(([id,td])=>{const x=R.find(z=>z.id===id);tab='pay';PSUB='exp';render();return {xid:x.xid,date:x.date===td,cid:x.cid,n:xRcL(7001).length,btn:[...document.querySelectorAll('#expList button')].map(b=>b.textContent.trim()).find(t=>/^קבלה/.test(t))}},[rid,td]);
 ok('הקבלה נשמרת עם מזהה ההוצאה, התאריך והלקוח שלה',r.xid===7001&&r.date&&r.cid===1&&r.n===1,JSON.stringify(r));
 ok('בכרטיס ההוצאה: "קבלה (1)"',r.btn==='קבלה (1)',r.btn);
 await p.evaluate(()=>xRc(7001));
 ok('בחלון: הקבלה מופיעה ברשימה',await p.evaluate(()=>document.querySelectorAll('.xRcRow').length===1));
 await p.evaluate(id=>vr(id),rid);await p.waitForTimeout(150);
 ok('בפתיחת הקבלה כתוב "קבלה להוצאה"',await p.evaluate(()=>/קבלה להוצאה/.test($('sheetBody').textContent)));
 await p.evaluate(()=>closeS());
 r=await p.evaluate(async id=>{const z=await JSZip.loadAsync(await zipBlob()),o=JSON.parse(await z.file('data.json').async('string')),ix=o.receipts.find(x=>x.id===id);
   await tx('readwrite',s=>s.delete(id));R=R.filter(x=>x.id!==id);await restoreReceipts({receipts:o.receipts},z,'merge',[]);const back=R.find(x=>x.id===id);return [ix&&ix.xid,back&&back.xid]},rid);
 ok('גיבוי ZIP ושחזור שומרים את הקישור להוצאה',r[0]===7001&&r[1]===7001,JSON.stringify(r));
 ok('קבלה של לקוח רגילה (בלי הוצאה) לא מקבלת מזהה הוצאה',await p.evaluate(async()=>{UP={eid:0,cid:1};const dt=new DataTransfer();dt.items.add(new File(['x'],'a.pdf',{type:'application/pdf'}));$('rf').files=dt.files;await $('rf').onchange();closeS();const x=R[R.length-1];R=R.filter(z=>z!==x);await tx('readwrite',s=>s.delete(x.id));return !x.xid}));

 // ===== 2. business trips =====
 ok('בהתחלה אין תעריף לק״מ',await p.evaluate(()=>kmRate()===0));
 await p.evaluate(()=>{tab='pay';PSUB='exp';render()});
 ok('במסך ההוצאות יש כרטיס "נסיעות עסקיות" עם כפתור רישום',await p.evaluate(()=>!!document.getElementById('tripBtn')&&document.getElementById('tripCard').offsetParent!==null));
 await p.evaluate(()=>tripSheet());
 await p.fill('#ktK','0');await p.evaluate(()=>tripSave(0));
 ok('ק״מ 0 נדחה',await p.evaluate(()=>/ק״מ/.test($('ktE').textContent)&&!S.expenses.some(x=>x.km)));
 await p.fill('#ktK','35');await p.selectOption('#ktT','1');await p.fill('#ktN','בית ← לקוח בחיפה');await p.selectOption('#ktC','1');await p.fill('#ktR','');await p.evaluate(()=>tripSave(0));
 ok('בלי תעריף לק״מ: הודעה ולא נשמר',await p.evaluate(()=>/תעריף/.test($('ktE').textContent)&&!S.expenses.some(x=>x.km)));
 await p.fill('#ktR','1.5');await p.evaluate(()=>tripSave(0));
 let t=await p.evaluate(()=>{const x=S.expenses.find(z=>z.km);return x&&{km:x.km,a:x.amount,cat:x.cat,nv:x.nv,rt:x.rt,r:x.kmR,cid:x.cid,note:x.note,kmR:S.kmR,ver:x.ver>0}});
 ok('נסיעה הלוך ושוב: 70 ק״מ × 1.5 = 105 ₪, קטגוריה נסיעות, בלי מע״מ',t&&t.km===70&&t.a===105&&t.cat==='נסיעות'&&t.nv===1&&t.rt===1&&t.r===1.5&&t.cid===1&&t.note==='בית ← לקוח בחיפה',JSON.stringify(t));
 ok('התעריף נזכר להבא ומסתנכרן בהגדרות; הנסיעה נשמרת לסנכרון',t.kmR===1.5&&t.ver&&await p.evaluate(()=>SETK.indexOf('kmR')>=0&&setCont().kmR===1.5));
 ok('ברשימה: "נסיעה 70 ק״מ"',await p.evaluate(()=>/נסיעה 70 ק״מ/.test($('expList').textContent)));
 ok('סיכום בכרטיס: החודש 70 ק״מ ו-105 ₪',await p.evaluate(()=>/70 ק״מ/.test($('tripSum').textContent)&&/105/.test($('tripSum').textContent)),await p.evaluate(()=>$('tripSum').textContent));
 await p.evaluate(()=>tripSheet());
 ok('נסיעה חדשה: התעריף כבר ממולא',await p.evaluate(()=>$('ktR').value==='1.5'));
 await p.evaluate(()=>{closeS();expEdit(S.expenses.find(z=>z.km).id)});
 ok('עריכת נסיעה פותחת את חלון הנסיעה (35 ק״מ, הלוך ושוב)',await p.evaluate(()=>!!document.getElementById('ktK')&&$('ktK').value==='35'&&$('ktT').value==='1'));
 await p.selectOption('#ktT','0');await p.evaluate(()=>tripSave(S.expenses.find(z=>z.km).id));
 t=await p.evaluate(()=>{const l=S.expenses.filter(z=>z.km);return {n:l.length,km:l[0].km,a:l[0].amount,rt:'rt' in l[0]}});
 ok('אחרי עריכה לכיוון אחד: 35 ק״מ, 52.5 ₪, אותה נסיעה',t.n===1&&t.km===35&&t.a===52.5&&!t.rt,JSON.stringify(t));
 ok('עם מע״מ פעיל: לנסיעה אין מע״מ תשומות',await p.evaluate(()=>{S.vatOn=true;const v=vatSplitExp(S.expenses.find(z=>z.km)).vat;S.vatOn=false;return v===0}));
 ok('מסך 360px: אין גלילה אופקית במסך ההוצאות',await p.evaluate(()=>{tab='pay';PSUB='exp';render();return document.documentElement.scrollWidth<=innerWidth}));

 // ===== 3. reminder before the 15th =====
 r=await p.evaluate(()=>{const o={};const L=d=>ddItems(d,false).map(x=>x.k+(x.k==='vat'?':'+x.t:'')).join('|');
  S.vatOn=true;S.vatPer=2;S.ddAdv=2;o.nov=L(new Date(2026,10,10));o.dec=L(new Date(2026,11,10));o.jan=L(new Date(2027,0,10));
  S.vatPer=1;S.ddAdv=1;o.dec1=L(new Date(2026,11,10));S.vatOn=false;S.ddAdv=0;o.none=L(new Date(2026,10,10));S.vatPer=2;return o});
 ok('מע״מ דו-חודשי: בנובמבר על ספטמבר–אוקטובר; בדצמבר אין; בינואר על נובמבר–דצמבר',/^vat:.*ספטמבר–אוקטובר 2026.*\|adv$/.test(r.nov)&&r.dec===''&&/נובמבר–דצמבר 2026/.test(r.jan),JSON.stringify(r));
 ok('מע״מ חודשי ומקדמות כל חודש: בדצמבר על נובמבר + מקדמות',/^vat:.*נובמבר 2026\)\|adv$/.test(r.dec1),r.dec1);
 ok('בלי מע״מ ובלי מקדמות: אין תזכורת',r.none==='',r.none);
 r=await p.evaluate(()=>{try{localStorage.removeItem('er-dd-done')}catch(e){}S.ddAdv=1;S.ddDays=2;S.ddOn=false;const off=ddNow(new Date(2026,10,14));S.ddOn=true;
  const f=d=>{const s=ddNow(d);return s?s.left:null};const o={off:off,d12:f(new Date(2026,10,12,10)),d13:f(new Date(2026,10,13,10)),d15:f(new Date(2026,10,15,22)),d16:f(new Date(2026,10,16,8))};
  o.today=ddText(ddNow(new Date(2026,10,15,9)));localStorage.setItem('er-dd-done','2026-11');o.done=ddNow(new Date(2026,10,14));localStorage.removeItem('er-dd-done');return o});
 ok('חלון התזכורת: מיומיים לפני ה-15 ועד סוף ה-15; כבויה = כלום',r.off===null&&r.d12===null&&r.d13===2&&r.d15===0&&r.d16===null,JSON.stringify(r));
 ok('ב-15 עצמו כתוב "היום"',/^עד 15\/11\/2026 \(היום\)/.test(r.today),r.today);
 ok('אחרי "סימנתי שטיפלתי" אין תזכורת עד החודש הבא',r.done===null);
 // the banner, with a fake "now" of 14.11.2026 and VAT to pay for September–October
 r=await p.evaluate(()=>{S.vatOn=true;S.vatPer=2;S.vatInc='exc';S.vatR=18;S.cb='work';S.entries.push({id:8801,cid:1,date:'2026-09-10',days:1,rate:1000,amount:1000,receipt:false,note:''});derive();
  const RD=Date,fake=new RD(2026,10,14,10).getTime();window.Date=class extends RD{constructor(...a){a.length?super(...a):super(fake)}static now(){return fake}};
  render();const b=$('ddb'),o={vis:!b.hidden,t:b.textContent};b.querySelector('u').click();o.after=b.hidden;o.nat=ddNat().map(x=>[x.id,x.schedule.at.getMonth(),x.schedule.at.getDate(),x.schedule.at.getHours()]);
  window.Date=RD;localStorage.removeItem('er-dd-done');S.entries=S.entries.filter(e=>e.id!==8801);derive();render();return o});
 ok('פס תזכורת בראש המסך: עד 15/11/2026, עוד יום, מע״מ ספטמבר–אוקטובר בערך 180 ₪ ומקדמות',r.vis&&/עד 15\/11\/2026 \(עוד יום\)/.test(r.t)&&/ספטמבר–אוקטובר 2026/.test(r.t)&&/180/.test(r.t)&&/מקדמות/.test(r.t),r.t);
 ok('"סימנתי שטיפלתי" מסתיר את הפס',r.after);
 ok('באפליקציה בטלפון: התראות ב-9:00 יומיים לפני ה-15 לחודשים הבאים (דצמבר, ינואר, פברואר), מזהים שונים',r.nat.length===3&&r.nat[0][1]===11&&r.nat[0][2]===13&&r.nat[0][3]===9&&new Set(r.nat.map(x=>x[0])).size===3,JSON.stringify(r.nat));
 await p.evaluate(()=>{S.ddOn=false;S.ddAdv=0;S.ddDays=2;S.vatOn=false;save();tab='set';render()});
 await p.selectOption('#sdd','on');
 r=await p.evaluate(()=>[S.ddOn,document.getElementById('sddW').hidden]);
 ok('הגדרות: הפעלת התזכורת מציגה את האפשרויות',r[0]===true&&r[1]===false,JSON.stringify(r));
 await p.selectOption('#sddA','2');await p.selectOption('#sddD','5');
 ok('הגדרות: מקדמות כל חודשיים, 5 ימים לפני; נשמרות בסנכרון',await p.evaluate(()=>S.ddAdv===2&&S.ddDays===5&&['ddOn','ddAdv','ddDays'].every(k=>SETK.indexOf(k)>=0)&&setCont().ddDays===5));
 const en=await p.evaluate(async()=>{setLang('en');tab='set';render();applyLang('en');await new Promise(r=>setTimeout(r,300));const t=document.querySelector('label[for=sdd]').textContent;setLang('he');render();return t});
 ok('באנגלית: התווית מתורגמת',en==='Reminder before the 15th (VAT and advances)',en);
 await p.evaluate(()=>{S.ddOn=false;save();render()});

 // ===== 4. accountant export: advances, deposits, VAT, trips, expense receipts =====
 r=await p.evaluate(y=>{const keep={e:S.entries,x:S.expenses};S.entries=[];S.expenses=[];S.txPaid=[];S.pnDep=[];S.vatOn=false;const plain=accData(y).sheets.length;
  S.entries=[{id:8901,cid:1,date:y+'-01-10',days:1,rate:1000,amount:1000,receipt:false,note:''}];S.expenses=[{id:8902,date:y+'-01-12',amount:118,cat:'ציוד',note:'',cid:0},{id:8903,date:y+'-02-01',amount:30,cat:'נסיעות',note:'לקוח',cid:1,km:20,kmR:1.5,nv:1}];derive();
  S.txPaid=[{id:1,d:y+'-02-15',a:1000,k:'it'},{id:2,d:y+'-03-15',a:500,k:'ni'},{id:3,d:(y-1)+'-12-15',a:999,k:'it'}];S.pnDep=[{id:4,d:y+'-05-01',a:2000,k:'pn'},{id:5,d:y+'-06-01',a:3000,k:'kh'}];
  S.vatOn=true;S.vatPer=2;S.vatInc='exc';S.vatR=18;S.cb='work';const A=accData(y),sh=n=>A.sheets.find(s=>s.name===n),sum=A.sheets[0].rows,g=k=>{const row=sum.find(x=>x[0]===k);return row?row[1]:null};
  const v=sh('מע״מ');const o={plain,names:A.sheets.map(s=>s.name),it:g('מקדמות מס הכנסה ששולמו'),ni:g('מקדמות ביטוח לאומי ובריאות ששולמו'),pn:g('הפקדות לפנסיה'),kh:g('הפקדות לקרן השתלמות'),
   vatNet:g('מע״מ לתשלום בשנה (נטו)'),km:g('נסיעות עסקיות (ק״מ)'),v1:v&&v.rows[1],vRows:v&&v.rows.filter(r=>/\d{4}$/.test(String(r[0]))).length,trip:sh('נסיעות')&&sh('נסיעות').rows[1],adv:sh('מקדמות')&&sh('מקדמות').rows.length};
  S.entries=keep.e;S.expenses=keep.x;S.txPaid=[];S.pnDep=[];S.vatOn=false;derive();return o},y);
 ok('בלי נתונים חדשים: הקובץ נשאר עם 6 גיליונות',r.plain===6,r.plain);
 ok('נוספו גיליונות: מקדמות, פנסיה וקרן השתלמות, מע״מ, נסיעות',['מקדמות','פנסיה וקרן השתלמות','מע״מ','נסיעות'].every(n=>r.names.includes(n))&&r.names.length===10,JSON.stringify(r.names));
 ok('בסיכום: מקדמות של השנה בלבד (מס הכנסה 1,000, ביטוח לאומי 500)',r.it===1000&&r.ni===500&&r.adv===6,JSON.stringify(r));
 ok('בסיכום: פנסיה 2,000, קרן השתלמות 3,000',r.pn===2000&&r.kh===3000,JSON.stringify(r));
 ok('מע״מ לפי תקופות: 6 תקופות; ינואר–פברואר: 180 עסקאות, 18 תשומות (הנסיעה בלי מע״מ), 162 לתשלום',r.vRows===6&&r.v1[2]===180&&r.v1[4]===18&&r.v1[5]===162&&r.vatNet===162,JSON.stringify([r.v1,r.vatNet]));
 ok('גיליון נסיעות: 20 ק״מ, תעריף 1.5, 30 ₪; בסיכום 20 ק״מ',r.trip&&r.trip[1]===20&&r.trip[5]===1.5&&r.trip[6]===30&&r.km===20,JSON.stringify(r.trip));
 if(JSZipN){const w=p.waitForEvent('download',{timeout:8000}).catch(()=>null);await p.evaluate(()=>{tab='dash';render();accGo()});const d=await w;let names=[],sheets=[],ex='';
  if(d){const z=await JSZipN.loadAsync(require('fs').readFileSync(await d.path()));names=Object.keys(z.files);const x=names.find(n=>/\.xlsx$/.test(n));if(x){const w2=await JSZipN.loadAsync(await z.file(x).async('uint8array'));sheets=(await w2.file('xl/workbook.xml').async('string')).match(/<sheet name="[^"]+"/g)||[];ex=await w2.file('xl/sharedStrings.xml')?.async('string')||''}}
  ok('ייצוא לרו״ח: קבלת ההוצאה בתיקייה receipts/הוצאות',names.some(n=>/^receipts\/הוצאות\/.+kabala\.pdf$/.test(n)),JSON.stringify(names));
  ok('ייצוא לרו״ח: בגיליון ההוצאות עמודת "קבלה"',sheets.length>=6&&(ex===''||/קבלה/.test(ex)),JSON.stringify(sheets))}
 else ok('ייצוא לרו״ח: קבלת ההוצאה מסומנת בגיליון ההוצאות',await p.evaluate(y=>{const e=accData(y).sheets.find(s=>s.name==='הוצאות').rows;return e[0][5]==='קבלה'&&e.some(r=>r[5]==='כן')},y));
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R0.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R0.length-f)+'/'+R0.length+' passed');await b.close();process.exit(f?1:0)})();
