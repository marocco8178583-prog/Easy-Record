// App icons from the ORIGINAL elephant artwork (src/assets/logo/elephant-flat.png = the line art of the supplied logo, pixels taken from the original file, glow removed as requested).
// No text, no frame, no new effects: the elephant is only scaled and centered on plain black. Usage: node tools/make-icons.js <out-icons-dir> [--native]
const {execFileSync}=require('child_process'),path=require('path');
execFileSync('python3',['-c',`
import sys,os
from PIL import Image
A=Image.open(sys.argv[1]).convert('RGBA');A=A.crop(A.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox())
out=sys.argv[2];os.makedirs(out,exist_ok=True)
def icon(size,fill,mode='RGB'):
    c=Image.new('RGBA',(size,size),(0,0,0,255 if mode=='RGB' else 0));w,h=A.size;k=fill*size/max(w,h);im=A.resize((max(1,round(w*k)),max(1,round(h*k))),Image.LANCZOS)
    c.alpha_composite(im,((size-im.size[0])//2,(size-im.size[1])//2));return c.convert(mode)
icon(192,.84).save(os.path.join(out,'icon-192.png'));icon(512,.84).save(os.path.join(out,'icon-512.png'))
icon(512,.66).save(os.path.join(out,'icon-maskable-512.png'));icon(180,.8).save(os.path.join(out,'apple-touch-icon.png'));icon(48,.9).save(os.path.join(out,'favicon-48.png'))
if len(sys.argv)>3:
    R=sys.argv[3];icon(1024,.82).save(os.path.join(R,'icon-only.png'));Image.new('RGB',(1024,1024),(0,0,0)).save(os.path.join(R,'icon-background.png'))
    icon(1024,.6,'RGBA').save(os.path.join(R,'icon-foreground.png'))
    for f in ['splash.png','splash-dark.png']:icon(2732,.25).save(os.path.join(R,f))
`,path.join(__dirname,'..','src','assets','logo','elephant-flat.png'),process.argv[2]].concat(process.argv.includes('--native')?[path.join(__dirname,'..','native','resources')]:[]),{stdio:'inherit'});
