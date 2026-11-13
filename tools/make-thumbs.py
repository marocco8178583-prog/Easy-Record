# Builds small thumbnails (one per scene) for the photo-background gallery: src/assets/backgrounds/thumbs/<scene>.webp
import sys,os,glob
from PIL import Image
root=sys.argv[1];out=os.path.join(root,'thumbs');os.makedirs(out,exist_ok=True)
for f in sorted(glob.glob(os.path.join(root,'*','*-portrait.webp'))):
    if os.sep+'thumbs'+os.sep in f: continue
    scene=os.path.basename(f)[:-len('-portrait.webp')]
    im=Image.open(f).convert('RGB');im.thumbnail((168,300));im.save(os.path.join(out,scene+'.webp'),'WEBP',quality=70)
print('thumbs:',len(os.listdir(out)))
