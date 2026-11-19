/* Easy Record service worker. Cache name carries the version; user data lives in IndexedDB/localStorage and is never touched here. */
const V='5.0.0-beta.28',CACHE='er-shell-'+V;
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png?v=5.0.0-beta.28','./icons/icon-512.png?v=5.0.0-beta.28','./icons/icon-maskable-512.png?v=5.0.0-beta.28','./icons/apple-touch-icon.png?v=5.0.0-beta.28'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('er-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(!['script','style','image','font','document','manifest',''].includes(r.destination))return;
  if(u.pathname.endsWith('/config.js')){e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(CACHE).then(k=>k.put(r,c))}return x}).catch(()=>caches.match(r)));return}
  if(r.mode==='navigate'&&!/\/(privacy|terms)\.html$/.test(u.pathname)){e.respondWith(fetch(r).then(x=>{if(x.ok&&(x.headers.get('content-type')||'').includes('text/html')&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))){const c=x.clone();caches.open(CACHE).then(k=>k.put('./index.html',c))}return x}).catch(()=>caches.match('./index.html')));return}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(CACHE).then(k=>k.put(r,c))}return x})))});
