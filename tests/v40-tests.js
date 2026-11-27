/* beta.40: expense categories like a bank app — category buttons with colour and icon, coloured breakdown that filters the list,
   moving many expenses to another category, category guessed from the business name; import list no longer collapses on a phone
   (src/js/53x-cats.js, 53-expenses.js, 67-plus.js). */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
(async()=>{const b=await chromium.launch();const R0=[];const ok=(n,c,d)=>R0.push([n,!!c,d]);
 const ctx=await b.newContext({viewport:{width:360,height:780}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.waitForTimeout(700);
 await p.evaluate(()=>{gLocal();S.expenses=[];S.vatOn=false;save();tab='pay';PSUB='exp';render()});

 // ===== 1. category from the business name =====
 let r=await p.evaluate(()=>[['פז יקנעם','דלק ונסיעות'],['סונול 1234','דלק ונסיעות'],['שופרסל דיל ת"א','אוכל'],['רמי לוי תקשורת','טלפון ואינטרנט'],['רמי לוי שיווק השקמה','אוכל'],
   ['פזגז','חשמל, מים וארנונה'],['בזק בינלאומי','טלפון ואינטרנט'],['Google Ads 123','פרסום ושיווק'],['GOOGLE *WORKSPACE','תוכנה ומנויים'],['הראל חברה לביטוח','ביטוח'],
   ['עמלת פעולה','עמלות בנק'],['פזית כהן',''],['סופר-פארם',''],['WOLT','אוכל'],['מוסך הצפון','רכב ותחזוקה'],['',''],['טמבור','חומרים'],['ACE חולון','כלים וציוד']]
   .map(x=>[x[0],x[1],catGuess(x[0])]).filter(x=>x[1]!==x[2]));
 ok('זיהוי קטגוריה לפי שם העסק (18 דוגמאות, כולל "פזית" ו"סופר-פארם" שלא מזוהים)',!r.length,JSON.stringify(r));

 // ===== 2. category buttons =====
 r=await p.evaluate(()=>({n:document.querySelectorAll('#xCK .xcChip').length,first:document.querySelector('#xCK .xcChip').dataset.c,last:[...document.querySelectorAll('#xCK .xcChip')].pop().dataset.c,icons:document.querySelectorAll('#xCK .xcChip .xcI svg').length}));
 ok('בטופס: 14 כפתורי קטגוריה עם אייקון, "אחר" בסוף',r.n===14&&r.icons===14&&r.first==='דלק ונסיעות'&&r.last==='אחר',JSON.stringify(r));
 await p.click('#xCK .xcChip[data-c="אוכל"]');
 r=await p.evaluate(()=>({v:$('xC').value,on:[...document.querySelectorAll('#xCK .xcChip.on')].map(b=>b.dataset.c)}));
 ok('לחיצה על "אוכל" ממלאת את הקטגוריה ומסמנת את הכפתור',r.v==='אוכל'&&JSON.stringify(r.on)==='["אוכל"]',JSON.stringify(r));
 await p.fill('#xC','הדפסות');
 ok('הקלדת קטגוריה משלך מבטלת את הסימון',await p.evaluate(()=>!document.querySelector('#xCK .xcChip.on')));
 await p.fill('#xA','45');await p.evaluate(()=>expAdd());
 ok('קטגוריה משלך נוספת ככפתור (לפני "אחר")',await p.evaluate(()=>{const l=[...document.querySelectorAll('#xCK .xcChip')].map(b=>b.dataset.c);return l.length===15&&l[13]==='הדפסות'&&l[14]==='אחר'}));
 await p.fill('#xC','');await p.fill('#xA','300');await p.fill('#xN','פז יקנעם');await p.evaluate(()=>expAdd());
 await p.fill('#xC','');await p.fill('#xA','20');await p.fill('#xN','');await p.evaluate(()=>expAdd());
 r=await p.evaluate(()=>S.expenses.map(x=>x.cat));
 ok('בלי קטגוריה: לפי ההערה ("פז" → דלק ונסיעות), ובלי הערה "אחר"',JSON.stringify(r)==='["הדפסות","דלק ונסיעות","אחר"]',JSON.stringify(r));

 // ===== 3. coloured breakdown and filter =====
 await p.evaluate(()=>{const t=today();S.expenses.push({id:501,date:t,amount:100,cat:'אוכל',note:'שופרסל',cid:0},{id:502,date:t,amount:50,cat:'אוכל',note:'קפה',cid:0},{id:503,date:t,amount:30,cat:'נסיעות',note:'',cid:0,km:20,kmR:1.5});save();render()});
 r=await p.evaluate(()=>({rows:[...document.querySelectorAll('#expSum .xcRow')].map(b=>b.dataset.c),bars:document.querySelectorAll('#expSum .xcBar span').length,cards:document.querySelectorAll('#expList > .card').length}));
 ok('פילוח צבעוני: שורה ופס לכל קטגוריה, מהגדולה לקטנה',JSON.stringify(r.rows)==='["דלק ונסיעות","אוכל","הדפסות","נסיעות","אחר"]'&&r.bars===5&&r.cards===6,JSON.stringify(r));
 await p.click('#expSum .xcRow[data-c="אוכל"]');
 r=await p.evaluate(()=>({cards:[...document.querySelectorAll('#expList > .card b')].filter(x=>!x.classList.contains('xcRn')).map(x=>x.textContent).filter(t=>/אוכל|דלק|הדפסות|אחר|נסיעות/.test(t)),pill:$('xcBar').textContent,sum:$('expSum').textContent}));
 ok('לחיצה על "אוכל" מציגה רק הוצאות אוכל; הסיכום נשאר מלא',r.cards.length===2&&r.cards.every(t=>/אוכל/.test(t))&&/מציג רק: אוכל/.test(r.pill)&&/דלק ונסיעות/.test(r.sum),JSON.stringify(r));
 await p.click('#expSum .xcRow[data-c="אוכל"]');
 ok('לחיצה נוספת מבטלת את הסינון',await p.evaluate(()=>document.querySelectorAll('#expList > .card').length===6&&!/מציג רק/.test($('xcBar').textContent)));
 ok('בכל הוצאה ברשימה יש אייקון בצבע של הקטגוריה',await p.evaluate(()=>document.querySelectorAll('#expList > .card .xcI').length===6));

 // ===== 4. move many expenses =====
 await p.evaluate(()=>xcBulk());
 r=await p.evaluate(()=>({rows:document.querySelectorAll('#xbL .xbRow').length,h:$('xbL').getBoundingClientRect().height,chips:document.querySelectorAll('#xbCK .xcChip').length}));
 ok('חלון "שינוי קטגוריה": כל ההוצאות חוץ מהנסיעה, הרשימה גלויה בטלפון, וכפתורי קטגוריה',r.rows===5&&r.h>60&&r.chips===15,JSON.stringify(r));
 r=await p.evaluate(()=>{xcBGo();return $('xbE').textContent});
 ok('בלי הוצאות מסומנות: הודעה',/לפחות הוצאה/.test(r),r);
 await p.evaluate(()=>{document.querySelector('#xbL input[data-id="501"]').click();document.querySelector('#xbL input[data-id="502"]').click()});
 ok('הכפתור כותב כמה נבחרו',await p.evaluate(()=>/העברת 2 הוצאות/.test($('xbGo').textContent)));
 r=await p.evaluate(()=>{xcBGo();return $('xbE').textContent});
 ok('בלי קטגוריה: הודעה',/בחר קטגוריה/.test(r),r);
 await p.click('#xbCK .xcChip[data-c="כלים וציוד"]');await p.evaluate(()=>xcBGo());
 r=await p.evaluate(()=>({c:S.expenses.filter(x=>x.id===501||x.id===502).map(x=>x.cat),trip:S.expenses.find(x=>x.id===503).cat,closed:$('sheet').hidden,dirty:S.expenses.find(x=>x.id===501).ver>S.expenses.find(x=>x.id===501).bv||!S.expenses.find(x=>x.id===501).bv}));
 ok('שתי ההוצאות עברו ל"כלים וציוד", הנסיעה לא השתנתה, ונשמר לסנכרון',JSON.stringify(r.c)==='["כלים וציוד","כלים וציוד"]'&&r.trip==='נסיעות'&&r.closed&&r.dirty,JSON.stringify(r));
 await p.evaluate(()=>{xcF('הדפסות');xcBulk()});
 ok('מתוך סינון: החלון מציג רק את הקטגוריה המסוננת',await p.evaluate(()=>{const n=document.querySelectorAll('#xbL .xbRow').length;closeS();xcF('');return n===1}));

 // ===== 5. edit sheet =====
 await p.evaluate(()=>expEdit(S.expenses.find(x=>x.cat==='אחר').id));
 await p.click('#xeCK .xcChip[data-c="ביטוח"]');await p.evaluate(()=>expEditGo(S.expenses.find(x=>x.cat==='אחר').id));
 ok('בעריכת הוצאה: כפתורי קטגוריה, והבחירה נשמרת',await p.evaluate(()=>!S.expenses.some(x=>x.cat==='אחר')&&S.expenses.some(x=>x.cat==='ביטוח')));

 // ===== 6. import: guess by name, list visible on a phone =====
 await p.evaluate(async()=>{S.vatOn=true;let c='תאריך,שם בית העסק,סכום חיוב\n01/10/2026,סונול 5,200\n02/10/2026,פלאפון,89\n03/10/2026,מאפה נחמה,30\n';for(let i=4;i<=14;i++)c+=i+'/10/2026,עסק '+i+','+(i*10)+'\n';await impFile(new File([c],'a.csv'))});
 r=await p.evaluate(()=>({h:$('imL').getBoundingClientRect().height,rows:IMP.l.slice(0,4).map(x=>[x.c,x.cs]),chips:document.querySelectorAll('#imCK .xcChip').length,mem:!$('imMemL').hidden}));
 ok('ייבוא בטלפון עם מע״מ פעיל: רשימת השורות גלויה (לא מתכווצת לאפס)',r.h>150,JSON.stringify(r));
 ok('ייבוא: קטגוריה אוטומטית לפי השם (סונול, פלאפון, מאפה), ושורות אחרות בלי',JSON.stringify(r.rows)==='[["דלק ונסיעות","auto"],["טלפון ואינטרנט","auto"],["אוכל","auto"],["",""]]'&&r.mem&&r.chips>=14,JSON.stringify(r));
 await p.evaluate(()=>{impAll(1)});await p.click('#imCK .xcChip[data-c="חומרים"]');await p.evaluate(()=>impSave());
 r=await p.evaluate(()=>S.expenses.filter(x=>x.date>='2026-10-01'&&x.date<='2026-10-14').sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(x=>x.cat));
 ok('בשמירה: הקטגוריה האוטומטית לשורות שזוהו, "חומרים" לשאר',JSON.stringify(r)==='["דלק ונסיעות","טלפון ואינטרנט","אוכל","חומרים"]',JSON.stringify(r));
 const S0=await p.evaluate(()=>{S.vatOn=false;tab='pay';PSUB='exp';render();return document.documentElement.scrollWidth<=innerWidth});
 ok('אין גלילה הצידה ב-360px',S0);
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R0.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R0.length-f)+'/'+R0.length+' passed');await b.close();process.exit(f?1:0)})();
