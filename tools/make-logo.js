// Composes the app logo: the orange elephant-head artwork (src/assets/logo/elephant-flat.png) with "ER" underneath, on black. Output: src/assets/logo/logo-1024.png (+ a transparent-safe foreground variant).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..','src','assets','logo'),src='data:image/png;base64,'+fs.readFileSync(path.join(D,'elephant-flat.png')).toString('base64');
const html=(bg,img,txt,word,ls)=>'<html><body style="margin:0;width:1024px;height:1024px;background:'+bg+';display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden">'+
 '<img src="'+src+'" style="width:'+img+'px;height:'+img+'px;display:block;margin-top:-30px">'+
 '<div style="margin-top:-40px;font:900 '+txt+'px/1 \'DejaVu Sans\',Arial,sans-serif;letter-spacing:'+(ls==null?14:ls)+'px;color:#fe7101;white-space:nowrap">'+(word||'ER')+'</div></body></html>';
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1024}});
 await p.setContent(html('#000',760,180));await p.waitForTimeout(150);await p.screenshot({path:path.join(D,'logo-1024.png')});
 await p.setContent(html('#000',700,112,'Easy Record',1));await p.waitForTimeout(150);await p.screenshot({path:path.join(D,'logo-name-1024.png')});await b.close()})();
