const puppeteer=require('/opt/npm-tools/node_modules/puppeteer');const fs=require('fs');
(async()=>{const b=await puppeteer.launch({args:['--no-sandbox'],executablePath:process.env.CHROME});const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/claude/build/v5/dist/index.html');await new Promise(r=>setTimeout(r,800));
const out=await p.evaluate(async()=>{const R={title:'דוח',sub:'בדיקה',cols:['א','ב'],rows:[{x:['=cmd|x',5]},{x:['נוח',600.5]}],sum:[['סה״כ','','x']],w:[2,2]};
const bl=await xlsxBlob(xlsxRows(R),R.w);const ab=await bl.arrayBuffer();return Array.from(new Uint8Array(ab))});
fs.writeFileSync('/tmp/t.xlsx',Buffer.from(out));console.log('errs',errs);await b.close()})()
