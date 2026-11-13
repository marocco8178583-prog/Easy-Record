# Generates PWA icons (orange "ER" on dark teal) into dist/icons via Pillow
import sys,os
from PIL import Image,ImageDraw,ImageFont
out=sys.argv[1];os.makedirs(out,exist_ok=True)
fp=None
for c in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf']:
    if os.path.exists(c): fp=c;break
def mk(size,name,pad=0.0):
    im=Image.new('RGB',(size,size),'#12302d');d=ImageDraw.Draw(im)
    f=ImageFont.truetype(fp,int(size*(0.46-pad))) if fp else ImageFont.load_default()
    b=d.textbbox((0,0),'ER',font=f);w,h=b[2]-b[0],b[3]-b[1]
    d.text(((size-w)/2-b[0],(size-h)/2-b[1]),'ER',font=f,fill='#ff8a1f');im.save(os.path.join(out,name))
mk(192,'icon-192.png');mk(512,'icon-512.png');mk(512,'icon-maskable-512.png',0.1);mk(180,'apple-touch-icon.png')
