/* RAJ Live PriceBook V82 - browser/offline visual image similarity engine.
   No external API or secret is required. It compares an uploaded camera/gallery image
   with the pre-generated catalog descriptors in image-search-index.js. */
(function(){
'use strict';
const INDEX=()=>Array.isArray(window.RAJ_IMAGE_SEARCH_INDEX_V82)?window.RAJ_IMAGE_SEARCH_INDEX_V82:[];
const N=32;
const COS=Array.from({length:8},(_,u)=>Array.from({length:N},(_,x)=>Math.cos(((2*x+1)*u*Math.PI)/(2*N))));
const HEX_BITS=[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4];
function dims(img){return {w:img.naturalWidth||img.videoWidth||img.width||0,h:img.naturalHeight||img.videoHeight||img.height||0}}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function median(a){if(!a.length)return 255;a.sort((x,y)=>x-y);const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function detectCrop(img,region){
  const D=dims(img),r=region||{x:0,y:0,w:D.w,h:D.h};
  if(!r.w||!r.h)return r;
  const scale=Math.min(1,192/Math.max(r.w,r.h)),sw=Math.max(1,Math.round(r.w*scale)),sh=Math.max(1,Math.round(r.h*scale));
  const c=canvas(sw,sh),ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,sw,sh);ctx.drawImage(img,r.x,r.y,r.w,r.h,0,0,sw,sh);
  const d=ctx.getImageData(0,0,sw,sh).data,br=[],bg=[],bb=[];
  const add=(x,y)=>{const i=(y*sw+x)*4;br.push(d[i]);bg.push(d[i+1]);bb.push(d[i+2])};
  for(let x=0;x<sw;x++){add(x,0);if(sh>1)add(x,sh-1)}
  for(let y=0;y<sh;y++){add(0,y);if(sw>1)add(sw-1,y)}
  const mr=median(br),mg=median(bg),mb=median(bb),bgl=.299*mr+.587*mg+.114*mb;
  let x0=sw,y0=sh,x1=-1,y1=-1,count=0;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const i=(y*sw+x)*4,rr=d[i],gg=d[i+1],bbb=d[i+2];
    const dr=rr-mr,dg=gg-mg,db=bbb-mb,diff=Math.sqrt(dr*dr+dg*dg+db*db),lum=.299*rr+.587*gg+.114*bbb;
    if(diff>28||Math.abs(lum-bgl)>24){count++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  }
  if(count<Math.max(24,Math.round(sw*sh*.005)))return r;
  x1++;y1++;
  if(x0<=1&&y0<=1&&x1>=sw-1&&y1>=sh-1)return r;
  const pad=Math.max(2,Math.round(.035*Math.max(x1-x0,y1-y0)));
  x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(sw,x1+pad);y1=Math.min(sh,y1+pad);
  const fx=r.w/sw,fy=r.h/sh;
  const out={x:r.x+x0*fx,y:r.y+y0*fy,w:(x1-x0)*fx,h:(y1-y0)*fy};
  return out.w>=8&&out.h>=8?out:r;
}
function grayFrom(img,box,w,h){
  const c=canvas(w,h),ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,box.x,box.y,box.w,box.h,0,0,w,h);
  const d=ctx.getImageData(0,0,w,h).data,g=new Float64Array(w*h);
  for(let i=0,j=0;i<d.length;i+=4,j++)g[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];
  return g;
}
function phash(gray){
  const coeff=[];
  for(let u=0;u<8;u++)for(let v=0;v<8;v++){
    let s=0;
    for(let x=0;x<N;x++){
      const cx=COS[u][x],row=x*N;
      for(let y=0;y<N;y++)s+=gray[row+y]*cx*COS[v][y];
    }
    coeff.push(s);
  }
  const tmp=coeff.slice(1).sort((a,b)=>a-b),med=tmp.length%2?tmp[tmp.length>>1]:(tmp[tmp.length/2-1]+tmp[tmp.length/2])/2;
  let hex='';
  for(let k=0;k<64;k+=4){let n=0;for(let b=0;b<4;b++)n=(n<<1)|(coeff[k+b]>med?1:0);hex+=n.toString(16)}
  return hex;
}
function dhash(img,box){
  const g=grayFrom(img,box,9,8);let hex='',n=0,bits=0;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    n=(n<<1)|(g[y*9+x]>g[y*9+x+1]?1:0);bits++;
    if(bits===4){hex+=n.toString(16);n=0;bits=0}
  }
  return hex;
}
function features(gray){
  const t=new Array(256),e=new Array(256).fill(0),hist=new Array(16).fill(0);
  for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){
    const y=yy*2,x=xx*2,v=(gray[y*N+x]+gray[y*N+x+1]+gray[(y+1)*N+x]+gray[(y+1)*N+x+1])/4;
    t[yy*16+xx]=Math.round(v);
  }
  let mx=0;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const gx=(x>0&&x<15)?t[y*16+x+1]-t[y*16+x-1]:0,gy=(y>0&&y<15)?t[(y+1)*16+x]-t[(y-1)*16+x]:0,v=Math.sqrt(gx*gx+gy*gy);
    e[y*16+x]=v;if(v>mx)mx=v;
  }
  if(mx>0)for(let i=0;i<e.length;i++)e[i]=Math.round(Math.min(255,e[i]/mx*255));
  for(const v of gray)hist[Math.min(15,Math.max(0,Math.floor(v/16)))]++;
  const sum=gray.length||1;for(let i=0;i<16;i++)hist[i]=Math.round(hist[i]/sum*255);
  return {t,e,h:hist};
}
function descriptor(img,region){const box=detectCrop(img,region),g=grayFrom(img,box,32,32),f=features(g);return {p:phash(g),d:dhash(img,box),t:f.t,e:f.e,h:f.h}}
function imageVariants(img){const D=dims(img),out=[descriptor(img,{x:0,y:0,w:D.w,h:D.h})];if(D.w/D.h>=1.18){out.push(descriptor(img,{x:0,y:0,w:D.w/2,h:D.h}));out.push(descriptor(img,{x:D.w/2,y:0,w:D.w/2,h:D.h}))}return out}
function hammingSim(a,b){if(!a||!b||a.length!==b.length)return 0;let diff=0;for(let i=0;i<a.length;i++)diff+=HEX_BITS[parseInt(a[i],16)^parseInt(b[i],16)];return Math.max(0,1-diff/(a.length*4))}
function corr(a,b){if(!a||!b||a.length!==b.length||!a.length)return 0;let ma=0,mb=0;for(let i=0;i<a.length;i++){ma+=a[i];mb+=b[i]}ma/=a.length;mb/=b.length;let num=0,da=0,db=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y}if(!da||!db)return 0;return Math.max(0,num/Math.sqrt(da*db))}
function histSim(a,b){if(!a||!b)return 0;let mn=0,mx=0;for(let i=0;i<Math.min(a.length,b.length);i++){mn+=Math.min(a[i],b[i]);mx+=Math.max(a[i],b[i])}return mx?mn/mx:0}
function score(a,b){return .32*hammingSim(a.p,b.p)+.18*hammingSim(a.d,b.d)+.28*corr(a.t,b.t)+.17*corr(a.e,b.e)+.05*histSim(a.h,b.h)}
function loadFile(file){
  if(window.createImageBitmap)return createImageBitmap(file).then(img=>({img,close:()=>{try{img.close()}catch(_){}}}));
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error||new Error('Image read failed'));r.onload=()=>{const im=new Image();im.onload=()=>resolve({img:im,close:()=>{}});im.onerror=()=>reject(new Error('Image decode failed'));im.src=String(r.result||'')};r.readAsDataURL(file)})
}
async function search(file,opts){
  const entries=INDEX();if(!entries.length)throw new Error('Offline image index is missing.');
  const loaded=await loadFile(file);try{
    const query=imageVariants(loaded.img),results=[];
    for(const item of entries){let best=0;for(const q of query)for(const r of (item.v||[])){const s=score(q,r);if(s>best)best=s}results.push({code:item.code,brand:item.brand,path:item.path,score:best})}
    results.sort((a,b)=>b.score-a.score);
    return results.slice(0,Math.max(1,Math.min(20,opts?.limit||10)));
  }finally{loaded.close()}
}
window.RAJ_IMAGE_SEARCH_V82={search,version:'V82-OFFLINE-VISUAL',count:()=>INDEX().length};
})();
