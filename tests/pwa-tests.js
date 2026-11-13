// PWA tests (Chromium via puppeteer, local http server). Automated; not a real iPhone.
const fs=require('fs'),http=require('http'),path=require('path');
const puppeteer=require(process.env.PUPPETEER||'/opt/npm-tools/node_modules/puppeteer');
const DIR=path.resolve(process.argv[2]||'deploy');let ver='A';
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp'};
const srv=http.createServer((q,r)=>{let u=q.url.split('?')[0];if(u==='/')u='/index.html';const f=path.join(DIR,u);if(!f.startsWith(DIR)||!fs.existsSync(f)){r.writeHead(404);return r.end()}
 let b=fs.readFileSync(f);if(u==='/sw.js')b=Buffer.from(b.toString().replace(/const V='[^']*'/,"const V='"+ver+"'"));r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});r.end(b)});
const res=[];const ok=(n,c,d)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+(d||'')))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=8000){const t=Date.now();while(Date.now()-t<ms){try{if(await fn())return true}catch(e){}await sleep(150)}return false}
(async()=>{await new Promise(r=>srv.listen(0,r));const base='http://localhost:'+srv.address().port+'/';
 const b=await puppeteer.launch({args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(base);
 const m=await p.evaluate(async()=>{const r=await fetch('manifest.webmanifest');return r.json()});
 ok('manifest תקין (standalone, rtl, אייקונים)',m.display==='standalone'&&m.dir==='rtl'&&m.icons.length>=3);
 const ic=await p.evaluate(async u=>(await fetch(u)).status,'icons/icon-512.png');ok('אייקון 512 נטען',ic===200);
 const icl=await p.evaluate(async m=>Promise.all(m.icons.map(async i=>{const r=await fetch(i.src);return r.status===200&&/[?]v=/.test(i.src)})),m);ok('כל אייקוני ה-manifest נטענים ומסומנים בגרסה (לרענון המטמון)',icl.length>=3&&icl.every(Boolean),JSON.stringify(m.icons.map(i=>i.src)));
 const px=await p.evaluate(async()=>{const im=new Image();im.src='icons/icon-512.png?x='+Date.now();await im.decode();const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,512,512).data;let or=0,other=0;for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],b=d[i+2];if(r>200&&gg>70&&gg<150&&b<60)or++;else if(!(r<40&&gg<40&&b<40)&&!(r>100&&b<60))other++}return {or:or/(512*512),other:other/(512*512),corner:[d[0],d[1],d[2]]}});
 ok('אייקון: פיל כתום על רקע שחור, בלי צבעים או טקסט נוספים',px.or>0.04&&px.other<0.01&&px.corner.join()==='0,0,0',JSON.stringify(px));
 const at=await p.evaluate(()=>{const l=document.querySelector('link[rel=apple-touch-icon]');return l&&l.getAttribute('href')});ok('אייקון אייפון (apple-touch-icon) מוגדר ומסומן בגרסה',/apple-touch-icon\.png\?v=/.test(at||''),at);
 ok('Service Worker נרשם ופעיל',await until(()=>p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)})));
 await p.reload();await sleep(500);
 ok('SW שולט בדף',await p.evaluate(()=>!!navigator.serviceWorker.controller));
 // a 404 navigation must not poison the cached shell
 const st=await p.goto(base+'no-such-page').then(r=>r.status()).catch(()=>0);await p.goto(base);await sleep(400);
 ok('דף 404 לא נשמר במטמון במקום האפליקציה',st===404&&await p.evaluate(async()=>{const c=await caches.open((await caches.keys()).find(k=>k.startsWith('er-shell-')));const r=await c.match('./index.html');return r&&r.ok&&/Easy Record/.test(await r.text())}),'status '+st);
 ok('תצלום רקע נשמר במטמון אחרי טעינה ראשונה (יעבוד גם בלי אינטרנט)',await p.evaluate(async()=>{const u='backgrounds/nature/06-tropical-beach-portrait.webp';const r=await fetch(u);if(!r.ok)return false;await new Promise(k=>setTimeout(k,300));const c=await caches.open((await caches.keys()).find(k=>k.startsWith('er-shell-')));return !!(await c.match(u))}));
 ok('דפי הטיוטה המשפטיים זמינים ומסומנים כטיוטה',await p.evaluate(async()=>{const a=await (await fetch('privacy.html')).text(),b=await (await fetch('terms.html')).text();return /טיוטה לבדיקה משפטית/.test(a)&&/מדיניות פרטיות/.test(a)&&/טיוטה לבדיקה משפטית/.test(b)&&/תנאי שימוש/.test(b)}));
 // user data marker
 await p.evaluate(()=>localStorage.setItem('er-test-marker','keep-me'));
 await p.setOfflineMode(true);let off=false;try{await p.reload({waitUntil:'domcontentloaded'});off=await p.evaluate(()=>document.body&&document.body.innerText.length>50)}catch(e){}
 ok('האפליקציה נטענת ללא אינטרנט',off);
 ok('config.js זמין גם ללא אינטרנט (מהמטמון)',await p.evaluate(()=>typeof window.ER_CONFIG==='object'));
 ok('נתוני משתמש נשארו אחרי טעינה לא מקוונת',await p.evaluate(()=>localStorage.getItem('er-test-marker')==='keep-me'));
 await p.setOfflineMode(false);
 // simulate new version
 ver='B';await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()});
 ok('גרסה חדשה מתגלה (waiting)',await until(()=>p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!r.waiting})));
 ok('באנר עדכון מוצג',await until(()=>p.evaluate(()=>!!document.getElementById('swb'))));
 await p.evaluate(()=>document.querySelector('#swb button').click());
 await until(()=>p.evaluate(async()=>{const k=await caches.keys();return k.includes('er-shell-B')&&!k.includes('er-shell-A')}),10000);
 const ks=await p.evaluate(()=>caches.keys());ok('מטמון ישן נמחק, חדש נוצר',ks.includes('er-shell-B')&&!ks.includes('er-shell-A'),JSON.stringify(ks));
 await sleep(800);
 ok('נתוני משתמש שרדו עדכון גרסה',await p.evaluate(()=>localStorage.getItem('er-test-marker')==='keep-me'));
 ok('אין שגיאות JS',errs.length===0,errs.join('|'));
 await b.close();srv.close();const f=res.filter(x=>!x[1]).length;console.log(res.length-f+'/'+res.length+' passed');process.exit(f?1:0)})();
