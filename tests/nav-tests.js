/* Navigation bar position setting (bottom / right side / left side): layout on phones, buttons still work, setting kept. */
const {chromium}=require('playwright'),path=require('path'),URL='file://'+path.join(__dirname,'..','dist','index.html');
(async()=>{const b=await chromium.launch();const R=[];const ok=(n,c,d)=>R.push([n,!!c,d]);const errs=[];
 for(const vp of [{width:360,height:740},{width:320,height:568},{width:740,height:360}]){
  const ctx=await b.newContext({viewport:vp});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.waitForTimeout(700);await p.evaluate(()=>{gLocal();S.clients.push({id:1,name:'נוח',rate:600});derive();save();render()});
  const W=vp.width+'x'+vp.height;
  if(vp.width===360){
   const d=await p.evaluate(()=>{const r=document.getElementById('nav').getBoundingClientRect();return [S.navPos,document.documentElement.getAttribute('data-nav'),Math.round(r.bottom),innerHeight,r.width>r.height]});
   ok('ברירת מחדל: הסרגל למטה ולרוחב',(d[0]||'bottom')==='bottom'&&d[1]===null&&d[4]&&d[3]-d[2]<40,JSON.stringify(d));
  }
  for(const side of ['right','left']){
   await p.evaluate(()=>{tab='set';render()});await p.selectOption('#snav',side);await p.waitForTimeout(150);
   const g=await p.evaluate(()=>{const n=document.getElementById('nav').getBoundingClientRect(),m=document.querySelector('main'),cs=getComputedStyle(m),
     bs=[...document.querySelectorAll('#nav button')].map(x=>x.getBoundingClientRect());
     return {pos:S.navPos,attr:document.documentElement.getAttribute('data-nav'),vert:n.height>n.width,l:n.left,r:innerWidth-n.right,top:n.top,bot:innerHeight-n.bottom,
       pr:parseFloat(cs.paddingRight),pl:parseFloat(cs.paddingLeft),hs:document.documentElement.scrollWidth>innerWidth,
       allIn:bs.every(x=>x.width>0&&x.left>=n.left-1&&x.right<=n.right+1),scrollable:document.getElementById('nav').scrollHeight>document.getElementById('nav').clientHeight}});
   ok(W+' '+side+': הסרגל לאורך ובצד הנכון',g.pos===side&&g.attr===side&&g.vert&&(side==='right'?g.r<20:g.l<20),JSON.stringify(g));
   ok(W+' '+side+': הסרגל בתוך המסך (או נגלל בתוכו)',g.top>=0&&g.bot>=0,JSON.stringify(g));
   ok(W+' '+side+': התוכן לא מוסתר מאחורי הסרגל',(side==='right'?g.pr:g.pl)>=70,JSON.stringify(g));
   ok(W+' '+side+': אין גלילה אופקית',!g.hs,JSON.stringify(g));
   ok(W+' '+side+': כל הכפתורים בתוך הסרגל',g.allIn,JSON.stringify(g));
   for(const t of ['pay','cli','set']){await p.click('#nav button[data-t="'+t+'"]');}
   ok(W+' '+side+': מעבר בין מסכים עובד',await p.evaluate(()=>tab==='set'&&!document.getElementById('v-set').hidden));
  }
  if(vp.width===360){
   // kept after reload, synced/backed-up with the other settings
   await p.evaluate(()=>{S.navPos='right';save()});await p.reload();await p.waitForTimeout(700);
   ok('ההגדרה נשמרת אחרי רענון',await p.evaluate(()=>document.documentElement.getAttribute('data-nav')==='right'&&document.getElementById('snav').value==='right'));
   ok('ההגדרה עוברת בסנכרון ובגיבוי',await p.evaluate(()=>SETK.indexOf('navPos')>=0&&setCont().navPos==='right'));
   await p.evaluate(()=>{applySettings({v:9,u:Date.now(),data:Object.assign(setCont(),{navPos:'left'})});setVals()});
   ok('שינוי ממכשיר אחר מוחל',await p.evaluate(()=>document.documentElement.getAttribute('data-nav')==='left'));
   await p.evaluate(()=>{tab='set';render()});await p.selectOption('#snav','bottom');
   ok('חזרה למטה',await p.evaluate(()=>!document.documentElement.hasAttribute('data-nav')&&S.navPos==='bottom'));
   await p.evaluate(()=>{S.navPos='junk';applyNav()});
   ok('ערך לא מוכר: למטה',await p.evaluate(()=>!document.documentElement.hasAttribute('data-nav')));
  }
  await ctx.close()}
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R.length-f)+'/'+R.length+' passed');await b.close();process.exit(f?1:0)})();
