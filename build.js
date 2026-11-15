// Easy Record build: src/ -> dist/ (PWA ready) and deploy/ (Netlify, deploy-only)
// Usage: node build.js        (needs Node; Python+Pillow only for regenerating icons)
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=__dirname,src=path.join(root,'src');
const VERSION=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();
const css=fs.readFileSync(path.join(src,'styles','app.css'),'utf8').trim();
const files=fs.readdirSync(path.join(src,'js')).filter(f=>f.endsWith('.js')).sort();
const js=files.map(f=>'/* ===== module: '+f+' ===== */\n'+fs.readFileSync(path.join(src,'js',f),'utf8').trim()).join('\n\n')+'\n'+fs.readFileSync(path.join(src,'pwa','register-sw.js'),'utf8');
let html=fs.readFileSync(path.join(src,'index.template.html'),'utf8');
const jszip=fs.readFileSync(path.join(src,'vendor','jszip.min.js'),'utf8');
// photo backgrounds pack (optional): src/assets/backgrounds/<category>/<scene>-<variant>.webp + manifest.json
const packDir=path.join(src,'assets','backgrounds');let pack=[];
if(fs.existsSync(path.join(packDir,'manifest.json'))){const seen={};JSON.parse(fs.readFileSync(path.join(packDir,'manifest.json'),'utf8')).forEach(m=>{const mm=/^backgrounds\/([a-z]+)\/(.+)-(landscape|portrait|square|warm|cool)\.webp$/.exec(m.file);if(!mm||!fs.existsSync(path.join(packDir,mm[1],mm[2]+'-'+mm[3]+'.webp')))return;const k=mm[2];if(!seen[k]){seen[k]={k:k,c:mm[1],v:[]};pack.push(seen[k])}seen[k].v.push(mm[3])})}
function copyDir(a,b){fs.mkdirSync(b,{recursive:true});for(const f of fs.readdirSync(a)){const x=path.join(a,f),y=path.join(b,f);if(fs.statSync(x).isDirectory())copyDir(x,y);else if(/\.(webp|json)$/.test(f))fs.copyFileSync(x,y)}}
html=html.replace('<!--@JSZIP-->',()=>jszip).replace('<!--@STYLE-->',()=>css).replace('<!--@SCRIPT-->',()=>js.replace('/*@BGPACK*/[]',()=>JSON.stringify(pack))).split('__VERSION__').join(VERSION);
// Restrained UI: decorative emoji are removed from every label at build time (source strings and translation keys are stripped identically, so translations keep matching).
// Kept on purpose: warning/status marks (⚠️ ⏰ ⛔ ✓ ✕) and the show/hide-password eye.
const DECO=['📞','💬','✉','📍','💵','💸','⬇','📂','🔒','📊','🔄','🔍','🖼','🔐','📎','📄','▶','⏸','⏹','↩','☀','🌙','🌗','🕐','🔔','✎','💾','☁','📴','⏳','🙂'];
const decoRe=new RegExp('(?:'+DECO.join('|')+')\\uFE0F? ?','gu');
html=html.replace(decoRe,'').replace(/👁\uFE0F? /gu,'');
const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,'index.html'),html);
const icons=path.join(dist,'icons');
if(!fs.existsSync(path.join(icons,'favicon-48.png'))||process.env.ICONS){cp.execFileSync('node',[path.join(root,'tools','make-icons.js'),icons],{stdio:'inherit'})}
for(const f of ['netlify.toml','config.js','privacy.html','terms.html'])fs.copyFileSync(path.join(src,'pwa',f),path.join(dist,f));
fs.writeFileSync(path.join(dist,'manifest.webmanifest'),fs.readFileSync(path.join(src,'pwa','manifest.webmanifest'),'utf8').split('__VERSION__').join(VERSION));
fs.writeFileSync(path.join(dist,'sw.js'),fs.readFileSync(path.join(src,'pwa','sw.js'),'utf8').split('__VERSION__').join(VERSION));
if(pack.length){fs.rmSync(path.join(dist,'backgrounds'),{recursive:true,force:true});copyDir(packDir,path.join(dist,'backgrounds'))}
// deploy/: exactly what Netlify needs, nothing else
const dep=path.join(root,'deploy');fs.rmSync(dep,{recursive:true,force:true});fs.mkdirSync(path.join(dep,'icons'),{recursive:true});
for(const f of ['index.html','sw.js','manifest.webmanifest','netlify.toml','config.js','privacy.html','terms.html'])fs.copyFileSync(path.join(dist,f),path.join(dep,f));fs.copyFileSync(path.join(src,'pwa','_headers'),path.join(dep,'_headers'));
for(const f of fs.readdirSync(icons))fs.copyFileSync(path.join(icons,f),path.join(dep,'icons',f));
if(pack.length)copyDir(path.join(dist,'backgrounds'),path.join(dep,'backgrounds'));
console.log('built dist/ and deploy/ v'+VERSION,html.length,'bytes from',files.length,'modules');
