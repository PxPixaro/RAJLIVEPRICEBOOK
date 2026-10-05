#!/usr/bin/env python3
"""Rebuild V121 catalogue image packs after product images change.
Run from repository root: python tools/build-catalog-packs-v121.py
Requires Pillow. Existing mappings come from js/catalog-pdf-v120.js; newly added
GROUP/CODE_1.(webp|png|jpg|jpeg) files are added automatically.
"""
from pathlib import Path
from PIL import Image, ImageOps
import io, json, re, urllib.parse
ROOT=Path(__file__).resolve().parents[1]
old=(ROOT/'js/catalog-pdf-v120.js').read_text('utf-8')
m=re.search(r'const V119_IMAGE_MANIFEST=Object\.freeze\((\{.*?\})\);\n\s*const V116_IMAGE_CACHE',old,re.S)
manifest=json.loads(m.group(1)) if m else {}
def norm(v): return re.sub(r'[^A-Z0-9]','',str(v).upper())
imgroot=ROOT/'assets/Products Images'
for fp in imgroot.rglob('*'):
    if not fp.is_file() or fp.suffix.lower() not in {'.webp','.png','.jpg','.jpeg'}: continue
    rel=fp.relative_to(imgroot)
    if len(rel.parts)<2: continue
    group=norm(rel.parts[0]); stem=re.sub(r'_[0-9]+$','',fp.stem,flags=re.I); code=norm(stem)
    encoded='assets/Products Images/'+urllib.parse.quote(str(rel).replace('\\','/'),safe='/')
    manifest.setdefault(group+'|'+code,encoded)
by={}
for k,p in manifest.items():
    if '|' not in k: continue
    g,c=k.split('|',1);by.setdefault(g,[]).append((c,p))
out=ROOT/'assets/catalog-packs-v121';out.mkdir(parents=True,exist_ok=True)
idx={}
for g in sorted(by):
    fn=re.sub(r'[^A-Z0-9]+','_',g).strip('_')+'.bin';off=0;images={}
    with (out/fn).open('wb') as f:
        for c,p in by[g]:
            fp=ROOT/urllib.parse.unquote(p)
            if not fp.exists(): continue
            try:
                im=ImageOps.exif_transpose(Image.open(fp))
                if im.mode in ('RGBA','LA') or (im.mode=='P' and 'transparency' in im.info):
                    rgba=im.convert('RGBA');bg=Image.new('RGB',rgba.size,'white');bg.paste(rgba,mask=rgba.getchannel('A'));im=bg
                else: im=im.convert('RGB')
                im.thumbnail((480,340),Image.Resampling.LANCZOS)
                b=io.BytesIO();im.save(b,'JPEG',quality=65,optimize=False,progressive=False,subsampling='4:2:0');data=b.getvalue()
                f.write(data);images[c]=[off,len(data),im.width,im.height];off+=len(data)
            except Exception as e: print('skip',fp,e)
    idx[g]={'file':'assets/catalog-packs-v121/'+fn,'bytes':off,'count':len(images),'images':images}
(ROOT/'js/catalog-pack-index-v121.js').write_text('/* Generated V121 catalogue image packs. */\nwindow.RAJ_CATALOG_PACK_INDEX_V121='+json.dumps(idx,separators=(',',':'))+';\n','utf-8')
print('built',len(idx),'group packs',sum(x['count'] for x in idx.values()),'images')
