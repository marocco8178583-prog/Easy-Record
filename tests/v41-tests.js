/* beta.41: the category buttons have a visible frame (light and dark), "About" in the settings (src/styles/app.css, src/index.template.html). */
const {chromium}=require('playwright'),path=require('path'),fs=require('fs'),URL='file://'+path.join(__dirname,'..','dist','index.html');
const VER=fs.readFileSync(path.join(__dirname,'..','VERSION'),'utf8').trim();
(async()=>{const b=await chromium.launch();const R0=[];const ok=(n,c,d)=>R0.push([n,!!c,d]);const errs=[];
 for(const cs of ['light','dark']){const p=await b.newPage({viewport:{width:360,height:780},colorScheme:cs});p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{gLocal();tab='pay';PSUB='exp';render();
    const rgb=s=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=s;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].slice(0,3)};
    const L=a=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};
    const con=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
    const ch=document.querySelector('#xCK .xcChip'),card=ch.closest('.card'),st=getComputedStyle(ch);
    return {bw:parseFloat(st.borderTopWidth),c:Math.round(con(rgb(st.borderTopColor),rgb(getComputedStyle(card).backgroundColor))*100)/100}});
  ok('כפתורי הקטגוריה עם מסגרת שרואים ('+cs+'): ניגודיות '+r.c,r.bw>=1&&r.c>=3,JSON.stringify(r));
  if(cs==='light'){
   const a=await p.evaluate(()=>{tab='set';ST='main';render();const c=$('aboutCard');return c&&{vis:c.offsetParent!==null,t:c.textContent,ver:$('aboutVer').textContent,sw:document.documentElement.scrollWidth<=innerWidth}});
   ok('בהגדרות יש כרטיס "אודות Easy Record"',a&&a.vis&&/אודות Easy Record/.test(a.t),JSON.stringify(a));
   ok('באודות: מה האפליקציה, ומי הקים אותה (דניאל מרוקו)',a&&/לעצמאים בישראל/.test(a.t)&&/דניאל מרוקו/.test(a.t)&&/אינם ייעוץ מס/.test(a.t));
   ok('באודות: מספר הגרסה הנוכחי ('+VER+')',a&&a.ver.indexOf(VER)>=0,a&&a.ver);
   ok('אין גלילה הצידה ב-360px',a&&a.sw)}
  await p.close()}
 ok('אין שגיאות JavaScript',!errs.length,errs.join('|'));
 let f=0;R0.forEach(x=>{console.log((x[1]?'PASS ':'FAIL ')+x[0]+(x[1]?'':'  -> '+x[2]));if(!x[1])f++});console.log((R0.length-f)+'/'+R0.length+' passed');await b.close();process.exit(f?1:0)})();
