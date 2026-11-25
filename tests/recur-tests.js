/* beta.34: monthly (recurring) expenses (src/js/53-expenses.js expRecur) and the tax card's calendar year, 2027 notice and
   advance payments (src/js/61-tax.js). */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
(async()=>{const b=await chromium.launch();const R=[];const ok=(n,c,d)=>R.push([n,!!c,d]);
 const ctx=await b.newContext({viewport:{width:360,height:780}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(700);await p.evaluate(()=>{gLocal();S.clients.push({id:1,name:'נוח',rate:1000});derive();save();render()});
 // ---- recurring expenses: pure generation, with a fixed "today"
 const g=await p.evaluate(()=>{const T=today;let out={};
  const run=(td,list,tomb)=>{today=()=>td;S.expenses=JSON.parse(JSON.stringify(list));S.tomb=tomb||{};const ch=expRecur();today=T;return {ch,l:S.expenses.map(x=>({id:x.id,date:x.date,rpOf:x.rpOf,amount:x.amount})),t:S.expenses.find(x=>x.rep)}};
  const tpl={id:1000000,date:'2026-01-31',amount:120,cat:'טלפון ואינטרנט',note:'סלולר',cid:0,rep:1,rpTo:'2026-01'};
  out.a=run('2026-04-15',[tpl]);
  out.b=run('2026-04-30',out.a.l.map(x=>x.id===1000000?Object.assign({},tpl,{rpTo:out.a.t.rpTo}):Object.assign({cat:'x',note:'',cid:0},x)));
  out.again=run('2026-04-15',[Object.assign({},tpl,{rpTo:'2026-03'})].concat(out.a.l.filter(x=>x.rpOf)));
  // the user deleted the February copy: not added again
  out.del=run('2026-04-15',[Object.assign({},tpl,{rpTo:'2026-03'})]);
  // a device that never saw rpTo move, with the copy deleted and synced (tombstone): not added again
  out.tomb=run('2026-02-28',[tpl],{x1000001:{t:'x',id:1000001,ver:2,bv:1}});
  out.future=run('2026-01-20',[Object.assign({},tpl,{date:'2026-02-10',rpTo:'2026-02'})]);
  out.off=run('2026-06-01',[Object.assign({},tpl,{rep:undefined})]);
  out.year=run('2027-02-04',[Object.assign({},tpl,{date:'2026-11-05',rpTo:'2026-11'})]);
  RO=true;out.ro=run('2026-04-15',[tpl]);RO=false;
  // beta.36: the user moves the template's date to a later month; no month may be skipped and none doubled
  out.mv1=run('2026-03-20',[Object.assign({},tpl,{date:'2026-01-15',rpTo:'2026-01',rp0:'2026-01'})]);
  const mvL=JSON.parse(JSON.stringify(S.expenses));mvL.find(x=>x.rep).date='2026-02-15';
  out.mv2=run('2026-04-20',mvL);out.mv3=run('2026-05-20',JSON.parse(JSON.stringify(S.expenses)));
  // an older template saved before rp0 existed, its date changed through the edit dialog
  S.expenses=[Object.assign({},tpl,{date:'2026-01-15',rpTo:'2026-03'}),{id:1000001,date:'2026-02-15',amount:120,cat:'x',rpOf:1000000},{id:1000002,date:'2026-03-15',amount:120,cat:'x',rpOf:1000000}];
  today=()=>'2026-03-20';expEdit(1000000);document.getElementById('xeD').value='2026-02-15';expEditGo(1000000);out.legacyRp0=S.expenses.find(x=>x.rep).rp0;
  out.mv4=run('2026-04-20',JSON.parse(JSON.stringify(S.expenses)));
  // a month that already has a copy (any id) does not get a second one
  out.dupM=run('2026-02-20',[Object.assign({},tpl,{date:'2026-01-15',rpTo:'2026-01'}),{id:555,date:'2026-02-03',amount:120,cat:'x',rpOf:1000000}]);
  S.expenses=[];S.tomb={};save();return out});
 ok('הוצאה קבועה מ-31.1: נוספה לפברואר (28), מרץ (31); אפריל עוד לא הגיע (15.4)',g.a.ch&&JSON.stringify(g.a.l.filter(x=>x.rpOf).map(x=>x.date))==='["2026-02-28","2026-03-31"]',JSON.stringify(g.a.l));
 ok('אחרי הוספה: רשום עד איזה חודש נוסף',g.a.t.rpTo==='2026-03',g.a.t.rpTo);
 ok('ב-30.4 נוסף אפריל ביום האחרון של החודש',JSON.stringify(g.b.l.filter(x=>x.rpOf).map(x=>x.date))==='["2026-02-28","2026-03-31","2026-04-30"]',JSON.stringify(g.b.l));
 ok('הרצה שנייה לא מוסיפה כפילויות',!g.again.ch&&g.again.l.length===3,JSON.stringify(g.again.l));
 ok('עותק שנמחק לא חוזר',!g.del.ch&&g.del.l.length===1,JSON.stringify(g.del.l));
 ok('עותק שנמחק וסונכרן לא חוזר גם במכשיר אחר',g.tomb.l.length===1,JSON.stringify(g.tomb.l));
 ok('מזהה קבוע לכל חודש (אותו עותק בשני מכשירים)',g.a.l[1].id===1000001&&g.a.l[2].id===1000002&&g.b.l[3].id===1000003,JSON.stringify(g.b.l.map(x=>x.id)));
 ok('לא נוסף שום דבר עם תאריך עתידי',!g.future.ch&&g.future.l.length===1);
 ok('הוצאה שאינה קבועה לא משתכפלת',!g.off.ch&&g.off.l.length===1);
 ok('מעבר שנה: דצמבר, ינואר; פברואר עוד לא',JSON.stringify(g.year.l.filter(x=>x.rpOf).map(x=>x.date))==='["2026-12-05","2027-01-05"]',JSON.stringify(g.year.l));
 ok('מצב קריאה בלבד: לא מוסיף',!g.ro.ch&&g.ro.l.length===1);
 const mths=l=>JSON.stringify(l.filter(x=>x.rpOf).map(x=>x.date.slice(0,7)).sort());
 ok('שינוי תאריך של הוצאה קבועה לחודש מאוחר: אפריל ומאי נוספים (לא מדלג על חודש)',mths(g.mv3.l)==='["2026-02","2026-03","2026-04","2026-05"]',JSON.stringify(g.mv3.l));
 ok('אחרי שינוי תאריך: אין שני עותקים באותו חודש',g.mv3.l.filter(x=>x.rpOf).length===new Set(g.mv3.l.filter(x=>x.rpOf).map(x=>x.date.slice(0,7))).size,JSON.stringify(g.mv3.l));
 ok('אחרי שינוי תאריך: המזהים לא זזים (אותו עותק בשני מכשירים)',g.mv3.l.find(x=>x.date==='2026-04-15').id===1000003&&g.mv3.l.find(x=>x.date==='2026-05-15').id===1000004,JSON.stringify(g.mv3.l.map(x=>x.id)));
 ok('הוצאה קבועה ישנה (בלי rp0): בעריכת התאריך נשמר החודש המקורי',g.legacyRp0==='2026-01',g.legacyRp0);
 ok('הוצאה קבועה ישנה אחרי שינוי תאריך: אפריל נוסף',g.mv4.ch&&mths(g.mv4.l)==='["2026-02","2026-03","2026-04"]',JSON.stringify(g.mv4.l));
 ok('חודש שכבר יש בו עותק לא מקבל עוד אחד',g.dupM.l.length===2,JSON.stringify(g.dupM.l));
 // ---- recurring expenses: through the screen
 const ds=await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-2);return ds(d)});
 await p.evaluate(()=>{tab='pay';render();pSub('exp')});
 await p.waitForTimeout(200);
 const vis=await p.evaluate(()=>{const e=document.getElementById('xRep');return !!e&&e.offsetParent!==null});
 if(!vis){await p.evaluate(()=>{PSUB='exp';tab='pay';render()})}
 await p.fill('#xA','250');await p.fill('#xD',ds);await p.fill('#xC','ביטוח');await p.selectOption('#xRep','1');
 await p.evaluate(()=>expAdd());
 let s=await p.evaluate(()=>({n:S.expenses.length,t:S.expenses.filter(x=>x.rep).length,c:S.expenses.filter(x=>x.rpOf).length,rep:document.getElementById('xRep').value,list:document.getElementById('expList').textContent,pend:S.expenses.every(x=>x.ver>0)}));
 ok('הוספה עם "כל חודש": ההוצאה ועוד 2 חודשים שעברו',s.n===3&&s.t===1&&s.c===2,JSON.stringify(s));
 ok('השדה חוזר ל"חד-פעמית" אחרי הוספה',s.rep==='0',s.rep);
 ok('ברשימה מסומן 🔁 (העותק של החודש)',s.list.indexOf('🔁')>=0,s.list.slice(0,120));
 ok('העותקים נשמרים ויסתנכרנו (יש להם גרסה)',s.pend);
 await p.evaluate(()=>expEdit(S.expenses.find(x=>x.rep).id));
 ok('בעריכה של ההוצאה הקבועה אפשר לבחור חד-פעמית',await p.evaluate(()=>document.getElementById('xeR').value==='1'));
 await p.selectOption('#xeR','0');await p.evaluate(()=>expEditGo(S.expenses.find(x=>x.rep).id));
 ok('אחרי ביטול: כבר לא קבועה, העותקים נשארים',await p.evaluate(()=>!S.expenses.some(x=>x.rep)&&S.expenses.length===3));
 await p.evaluate(()=>expEdit(S.expenses.find(x=>x.rpOf).id));
 ok('עותק אוטומטי: מוצג "נוספה אוטומטית"',await p.evaluate(()=>!document.getElementById('xeR')&&document.getElementById('sheetBody').textContent.indexOf('נוספה אוטומטית')>=0));
 await p.evaluate(()=>closeS());
 ok('ההוצאות הקבועות נשמרות בגיבוי',await p.evaluate(()=>expV3().expenses.some(x=>x.rpOf)));
 ok('מסך 360px: אין גלילה אופקית במסך ההוצאות',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // ---- tax card: calendar year even when "start of tax year" is another month
 const cy=await p.evaluate(()=>{const now=new Date(),y=now.getFullYear(),d=s=>s;S.expenses=[];
  S.entries.push({id:900,cid:1,date:y+'-01-01',days:1,rate:1000,amount:1000,receipt:false,note:''},{id:901,cid:1,date:(y-1)+'-12-31',days:1,rate:7000,amount:7000,receipt:false,note:''});
  S.fy=6;save();const a=taxInfo();S.fy=0;save();return {inc:a.inc,s:a.r.s.getMonth(),y:a.r.s.getFullYear()===y}});
 ok('שנת מס לחישוב המס: ינואר–דצמבר גם כשתחילת שנת המס בהגדרות היא יולי',cy.inc===1000&&cy.s===0&&cy.y,JSON.stringify(cy));
 // ---- 2027 notice
 const st=await p.evaluate(()=>{const a=taxRates(2026),b=taxRates(2027),c=taxRates(2025);return [a.stale,a.y,b.stale,b.y,c.y]});
 ok('2026: שיעורים עדכניים; 2027: לפי 2026 עם סימון שלא עודכן',JSON.stringify(st)==='[false,2026,true,2026,2026]',JSON.stringify(st));
 const nt=await p.evaluate(()=>{const RD=Date;const fake=new RD(2027,1,10,12).getTime();window.Date=class extends RD{constructor(...a){a.length?super(...a):super(fake)}static now(){return fake}};
  tab='dash';render();const el=document.getElementById('taxStale'),t=el?el.textContent:'';window.Date=RD;render();return [t,!document.getElementById('taxStale')]});
 ok('בינואר 2027 הכרטיס כותב שהשיעורים לפי 2026',nt[0].indexOf('2027')>=0&&nt[0].indexOf('2026')>=0,nt[0]);
 ok('ב-2026 אין הודעה כזו',nt[1]);
 // ---- advance payments
 await p.evaluate(()=>{tab='dash';render()});
 await p.click('#taxPaidBtn');
 await p.fill('#tpA','0');await p.evaluate(()=>taxPaidAdd());
 ok('מקדמה בסכום 0 נדחית',await p.evaluate(()=>document.getElementById('tpE').textContent.length>0&&taxPaidL().length===0));
 const y=await p.evaluate(()=>new Date().getFullYear());
 await p.fill('#tpA','700');await p.fill('#tpD',y+'-01-15');await p.selectOption('#tpK','ni');await p.evaluate(()=>taxPaidAdd());
 await p.fill('#tpA','300');await p.fill('#tpD',(y-1)+'-11-15');await p.evaluate(()=>taxPaidAdd());
 let a=await p.evaluate(()=>{const i=taxInfo();return {paid:i.paid,left:Math.round(i.left),sofar:Math.round(i.sofar),n:taxPaidL().length,rows:document.querySelectorAll('.tpRow').length,box:!!document.getElementById('taxPaidBox'),k:taxPaidL()[0].k}});
 ok('מקדמה נשמרת עם הסוג (ביטוח לאומי)',a.n===2&&a.k==='ni',JSON.stringify(a));
 ok('רק מקדמות של השנה נספרות',a.paid===700,JSON.stringify(a));
 ok('"נשאר לשים בצד" = עד היום פחות מה ששולם (לא פחות מ-0)',a.left===Math.max(a.sofar-700,0),JSON.stringify(a));
 ok('ברשימה בחלון: רק מקדמות השנה',a.rows===1,a.rows);
 ok('בכרטיס מוצגות המקדמות ששולמו',a.box);
 ok('המקדמות נשמרות בסנכרון ובגיבוי',await p.evaluate(()=>SETK.indexOf('txPaid')>=0&&setCont().txPaid.length===2&&expV3().settings.txPaid.length===2));
 await p.evaluate(()=>taxPaidDel(taxPaidL().find(x=>x.a===700).id));
 ok('מחיקת מקדמה',await p.evaluate(()=>taxPaidL().length===1&&taxInfo().paid===0));
 await p.evaluate(()=>{S.txPaid='garbage';});
 ok('ערך פגום לא שובר את הכרטיס',await p.evaluate(()=>{try{tab='dash';render();return taxInfo().paid===0&&!!document.getElementById('taxCard')}catch(e){return false}}));
 await p.evaluate(()=>{S.txPaid=[];closeS();tab='dash';render()});
 ok('מסך 360px: אין גלילה אופקית בדשבורד',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const en=await p.evaluate(async()=>{S.lang='en';save();render();await new Promise(r=>setTimeout(r,300));const t=document.getElementById('taxPaidBtn').textContent;S.lang='he';save();render();return t});
 ok('באנגלית: הכפתור מתורגם',en==='Record an advance payment',en);
 // ---- beta.36: the yearly export for the accountant is by calendar year too
 const ac=await p.evaluate(()=>{S.fy=6;const r=accRange(2026),y=new Date().getFullYear();S.entries.push({id:950,cid:1,date:y+'-02-01',days:1,rate:500,amount:500,receipt:false,note:''},{id:951,cid:1,date:y+'-08-01',days:1,rate:300,amount:300,receipt:false,note:''},{id:952,cid:1,date:(y+1)+'-02-01',days:1,rate:900,amount:900,receipt:false,note:''});
  const d=accData(y),j=JSON.stringify(d);S.fy=0;S.entries=S.entries.filter(e=>e.id<950);save();return {s:r.s.getMonth(),e:r.e.getMonth(),ey:r.e.getFullYear(),label:r.label,has500:j.indexOf('500')>=0,has900:j.indexOf('900')>=0,fy:j.indexOf('שנת המס מתחילה')>=0}});
 ok('ייצוא לרו״ח: ינואר–דצמבר גם כשתחילת שנת המס היא יולי',ac.s===0&&ac.e===0&&ac.ey===2027&&ac.label==='2026',JSON.stringify(ac));
 ok('ייצוא לרו״ח: כולל פברואר של השנה, לא כולל פברואר של השנה הבאה',ac.has500&&!ac.has900&&!ac.fy,JSON.stringify(ac));
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R.length-f)+'/'+R.length+' passed');await b.close();process.exit(f?1:0)})();
