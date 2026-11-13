/* Registers the service worker (only over http/https) and shows an update banner; updating never touches saved data. */
(function(){if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;try{if(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())return}catch(e){}
function banner(w){if(document.getElementById('swb'))return;var d=document.createElement('div');d.id='swb';d.setAttribute('role','status');
 d.style.cssText='position:fixed;left:12px;right:12px;bottom:84px;z-index:9999;background:#12302d;color:#fff;padding:12px 14px;border-radius:12px;display:flex;gap:10px;align-items:center;justify-content:space-between;font:600 15px Assistant,sans-serif;box-shadow:0 4px 18px #0006';
 d.innerHTML='<span>יש גרסה חדשה. הנתונים שלך נשמרים.</span>';var b=document.createElement('button');b.textContent='עדכן עכשיו';b.style.cssText='background:#ff8a1f;border:0;border-radius:8px;padding:8px 12px;font:700 14px Assistant,sans-serif';
 b.onclick=function(){w.postMessage('SKIP_WAITING')};d.appendChild(b);document.body.appendChild(d)}
window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').then(function(reg){
 if(reg.waiting&&navigator.serviceWorker.controller)banner(reg.waiting);
 reg.addEventListener('updatefound',function(){var n=reg.installing;if(!n)return;n.addEventListener('statechange',function(){if(n.state==='installed'&&navigator.serviceWorker.controller)banner(n)})})}).catch(function(){})});
var rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(rl)return;rl=true;location.reload()})})();
