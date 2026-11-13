// Native layer tests with a SIMULATED Capacitor runtime (window.Capacitor + plugin mocks) in Chromium. Not a real iOS/Android device.
const path=require('path'),http=require('http'),fs=require('fs');const puppeteer=require(process.env.PUPPETEER||'/opt/npm-tools/node_modules/puppeteer');
const APP=path.resolve(process.argv[2]||'dist/index.html');const res=[];const ok=(n,c,d)=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+d))};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const web=http.createServer((q,s)=>{if(q.url.startsWith('/config.js')){s.setHeader('content-type','text/javascript');return s.end("window.ER_CONFIG={supabaseUrl:'https://x.supabase.co',supabaseAnonKey:'ANON'}")}if(q.url.startsWith('/sw.js')){s.setHeader('content-type','text/javascript');return s.end('')}s.setHeader('content-type','text/html; charset=utf-8');s.end(fs.readFileSync(APP))});await new Promise(r=>web.listen(0,r));
 const b=await puppeteer.launch({args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.evaluateOnNewDocument(()=>{window.__nat={listeners:{},scheduled:[],cancelled:0,exited:0,haptic:0,sb:[]};const L=window.__nat;
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android',Plugins:{
   App:{addListener(n,f){L.listeners[n]=f},exitApp(){L.exited++}},
   LocalNotifications:{checkPermissions:async()=>({display:'prompt'}),requestPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:L.scheduled.map(n=>({id:n.id}))}),cancel:async(o)=>{L.cancelled+=o.notifications.length;L.scheduled=[]},schedule:async(o)=>{L.scheduled=o.notifications}},
   Haptics:{impact(){L.haptic++}},StatusBar:{setBackgroundColor(o){L.sb.push(o.color)},setStyle(){}}}}});
 await p.goto('http://localhost:'+web.address().port+'/');await sleep(900);
 let r=await p.evaluate(()=>[isNative(),document.documentElement.getAttribute('data-native'),__nat.sb[0],natRedirect(),!!__nat.listeners.backButton,!!__nat.listeners.appUrlOpen]);
 ok('בתוך אפליקציה: מזוהה כ-native, צבע שורת מצב, כתובת חזרה לאימות היא סכמת האפליקציה, ונרשמים מאזינים',r[0]&&r[1]==='1'&&r[2]==='#12302d'&&r[3]==='com.easyrecord.app://auth'&&r[4]&&r[5],JSON.stringify(r));
 r=await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()));ok('Service Worker לא נרשם בתוך האפליקציה',r===false);
 r=await p.evaluate(()=>{gLocal();info('x');__nat.listeners.backButton();const a=$('sheet').hidden;tab='set';render();__nat.listeners.backButton();const b=tab;__nat.listeners.backButton();return [a,b,__nat.exited]});
 ok('כפתור חזרה באנדרואיד: סוגר חלון פתוח, אחר כך חוזר ל"היום שלי", ורק אז יוצא',r[0]===true&&r[1]==='clock'&&r[2]===1,JSON.stringify(r));
 r=await p.evaluate(async()=>{S.tasks=[];const d=new Date(Date.now()+86400000);taskAdd('בעתיד',ds(d),'09:15',0);taskAdd('בלי שעה',ds(d),'',0);taskAdd('עבר','2020-01-01','08:00',0);const n=await natSchedule();return [n,__nat.scheduled.length,__nat.scheduled[0]&&__nat.scheduled[0].body,__nat.scheduled[0]&&new Date(__nat.scheduled[0].schedule.at).getHours()]});
 ok('תזכורות משימה מתוזמנות במערכת ההפעלה (יעבדו גם כשהאפליקציה סגורה): רק עתידיות ועם שעה',r[0]===1&&r[1]===1&&r[2]==='בעתיד'&&r[3]===9,JSON.stringify(r));
 r=await p.evaluate(async()=>{S.tasks[0].done=true;await natSchedule();return [__nat.scheduled.length,__nat.cancelled>=1]});
 ok('משימה שסומנה כבוצעה מבוטלת מהתזמון',r[0]===0&&r[1],JSON.stringify(r));
 r=await p.evaluate(()=>{S.clients=[{id:1,name:'נוח',phone:''}];S.sessions=[];tab='clock';render();$('ckClient').value='נוח';const h0=__nat.haptic;startWork();return [!!activeSes(),__nat.haptic>h0]});
 ok('רטט קל בפעולות שעון',r[0]&&r[1],JSON.stringify(r));
 r=await p.evaluate(()=>{let called=0;const orig=authInit;window.authInit=function(){called++;return Promise.resolve()};__nat.listeners.appUrlOpen({url:'com.easyrecord.app://auth#access_token=AAA&type=signup'});const h=location.hash;__nat.listeners.appUrlOpen({url:'https://evil.example/#access_token=BBB'});window.authInit=orig;return [called,h]});
 ok('קישור אימות שחוזר לאפליקציה מועבר לטיפול הכניסה; קישור מכתובת זרה נדחה',r[0]===1&&/access_token=AAA/.test(r[1]),JSON.stringify(r));
 ok('אין שגיאות JS',errs.length===0,errs.join('|'));
 await b.close();web.close();const f=res.filter(x=>!x).length;console.log((res.length-f)+'/'+res.length+' passed');process.exit(f?1:0)})();
