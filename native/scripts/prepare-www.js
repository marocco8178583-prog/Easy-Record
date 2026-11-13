// Copies the built web app (../deploy) into ./www for Capacitor. Run from native/: node scripts/prepare-www.js
const fs=require('fs'),path=require('path');
const src=path.resolve(__dirname,'..','..','deploy'),dst=path.resolve(__dirname,'..','www');
if(!fs.existsSync(path.join(src,'index.html'))){console.error('deploy/index.html not found. Run "node build.js" in the project root first.');process.exit(1)}
fs.rmSync(dst,{recursive:true,force:true});
(function cp(a,b){fs.mkdirSync(b,{recursive:true});for(const f of fs.readdirSync(a)){if(f==='netlify.toml')continue;const x=path.join(a,f),y=path.join(b,f);fs.statSync(x).isDirectory()?cp(x,y):fs.copyFileSync(x,y)}})(src,dst);
console.log('www/ ready from deploy/ ('+fs.readdirSync(dst).length+' entries). The service worker is not used inside the native app.');
