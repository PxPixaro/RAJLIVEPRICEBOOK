from pathlib import Path
from PIL import Image
import numpy as np, math, json, re

ROOT=Path(__file__).resolve().parents[1]
IMG_ROOT=ROOT/'assets'/'Products Images'
OUT=ROOT/'js'/'image-search-index.js'

# Precompute DCT cosine basis matching browser implementation.
N=32
COS=np.zeros((8,N),dtype=np.float64)
for u in range(8):
    for x in range(N):
        COS[u,x]=math.cos(((2*x+1)*u*math.pi)/(2*N))

def auto_crop(im: Image.Image):
    im=im.convert('RGB')
    # work on a moderate thumbnail for background estimation, then map bbox back.
    w,h=im.size
    scale=min(1.0,192/max(w,h))
    sw=max(1,round(w*scale)); sh=max(1,round(h*scale))
    sm=im.resize((sw,sh),Image.Resampling.BILINEAR)
    a=np.asarray(sm,dtype=np.int16)
    border=np.concatenate([a[0,:,:],a[-1,:,:],a[:,0,:],a[:,-1,:]],axis=0)
    bg=np.median(border,axis=0)
    diff=np.sqrt(((a-bg)**2).sum(axis=2))
    # Also count pixels that are sufficiently darker/brighter than border luma.
    lum=(0.299*a[:,:,0]+0.587*a[:,:,1]+0.114*a[:,:,2])
    bgl=0.299*bg[0]+0.587*bg[1]+0.114*bg[2]
    mask=(diff>28) | (np.abs(lum-bgl)>24)
    ys,xs=np.where(mask)
    if len(xs)<max(24, int(sw*sh*0.005)):
        return im
    x0,x1=xs.min(),xs.max()+1; y0,y1=ys.min(),ys.max()+1
    # prevent noisy border from causing a full-frame false crop
    if x0<=1 and y0<=1 and x1>=sw-1 and y1>=sh-1:
        return im
    pad=max(2,round(0.035*max(x1-x0,y1-y0)))
    x0=max(0,x0-pad); y0=max(0,y0-pad); x1=min(sw,x1+pad); y1=min(sh,y1+pad)
    # map to source
    fx=w/sw; fy=h/sh
    box=(max(0,int(x0*fx)),max(0,int(y0*fy)),min(w,int(math.ceil(x1*fx))),min(h,int(math.ceil(y1*fy))))
    if box[2]-box[0]<8 or box[3]-box[1]<8:
        return im
    return im.crop(box)

def grayscale32(im):
    im=auto_crop(im).resize((32,32),Image.Resampling.BILINEAR).convert('RGB')
    a=np.asarray(im,dtype=np.float64)
    return 0.299*a[:,:,0]+0.587*a[:,:,1]+0.114*a[:,:,2]

def phash(gray):
    # first 8x8 DCT coefficients, including DC in bit pool only for fixed 64-bit length;
    # threshold excludes DC.
    # DCT[u,v] = sum_x,y gray[x,y] cos_u[x] cos_v[y]
    d=COS @ gray @ COS.T
    flat=d.flatten()
    med=float(np.median(flat[1:]))
    bits=(flat>med).astype(np.uint8)
    val=0
    for b in bits:
        val=(val<<1)|int(b)
    return f'{val:016x}'

def dhash(im):
    im=auto_crop(im).resize((9,8),Image.Resampling.BILINEAR).convert('RGB')
    a=np.asarray(im,dtype=np.float64)
    g=0.299*a[:,:,0]+0.587*a[:,:,1]+0.114*a[:,:,2]
    bits=(g[:,:-1]>g[:,1:]).flatten().astype(np.uint8)
    val=0
    for b in bits:
        val=(val<<1)|int(b)
    return f'{val:016x}'

def small_features(gray):
    # 16x16 via 2x2 averaging from 32x32, raw 0..255.
    t=gray.reshape(16,2,16,2).mean(axis=(1,3))
    # sobel-ish edge magnitude on 16x16.
    gx=np.zeros_like(t); gy=np.zeros_like(t)
    gx[:,1:-1]=t[:,2:]-t[:,:-2]
    gy[1:-1,:]=t[2:,:]-t[:-2,:]
    e=np.sqrt(gx*gx+gy*gy)
    if e.max()>0:
        e=np.clip(e/e.max()*255,0,255)
    hist,_=np.histogram(gray,bins=16,range=(0,256))
    hist=(hist/hist.sum()*255) if hist.sum() else hist
    return [int(round(x)) for x in t.flatten()], [int(round(x)) for x in e.flatten()], [int(round(x)) for x in hist]

def descriptor(im):
    g=grayscale32(im)
    thumb,edge,hist=small_features(g)
    return {'p':phash(g),'d':dhash(im),'t':thumb,'e':edge,'h':hist}

def variants(im):
    w,h=im.size
    out=[descriptor(im)]
    # Catalog photos commonly contain two side-by-side views. Add halves so a camera photo
    # of just one face can still match a catalog pair image.
    if w/h >= 1.18:
        left=im.crop((0,0,w//2,h))
        right=im.crop((w//2,0,w,h))
        out.extend([descriptor(left),descriptor(right)])
    return out

entries=[]
for f in sorted(IMG_ROOT.rglob('*')):
    if not f.is_file() or f.suffix.lower() not in {'.webp','.jpg','.jpeg','.png'}:
        continue
    stem=f.stem
    code=re.sub(r'_\d+$','',stem).strip()
    brand=f.parent.name
    im=Image.open(f).convert('RGB')
    entries.append({
        'code':code,
        'brand':brand,
        'path':f.relative_to(ROOT).as_posix(),
        'v':variants(im)
    })

payload=json.dumps(entries,separators=(',',':'))
OUT.write_text('/* RAJ Live PriceBook V82 - generated offline visual-search index. */\nwindow.RAJ_IMAGE_SEARCH_INDEX_V82='+payload+';\n',encoding='utf-8')
print('wrote',OUT,'entries',len(entries),'bytes',OUT.stat().st_size)
