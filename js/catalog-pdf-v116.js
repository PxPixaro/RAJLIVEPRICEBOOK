/* RAJ LIVE PRICE BOOK V116 — image-based group catalogue PDF.
   Adds a generated A4 catalogue without changing the existing pricelist/grid/mobile views. */
(function(){
  'use strict';

  const V116_PER_PAGE=6;
  const V116_IMAGE_CONCURRENCY=7;
  const V116_IMAGE_CACHE=new Map();
  const V116_ORIGINAL_RENDER=window.renderCatalogCard;
  const V116_ORIGINAL_OPEN=window.openSelectedCatalog;

  function v116Clean(v){
    try{return typeof clean==='function'?clean(v):String(v==null?'':v).trim()}catch(_e){return String(v==null?'':v).trim()}
  }
  function v116Key(v){return v116Clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'')}
  function v116SelectedGroup(){
    try{
      if(typeof v103MultiValues==='function'){
        const selected=v103MultiValues('groupFilter');
        if(Array.isArray(selected)&&selected.length===1)return v116Clean(selected[0]);
        if(Array.isArray(selected)&&selected.length>1)return '';
      }
    }catch(_e){}
    return v116Clean(document.getElementById('groupFilter')?.value||'');
  }
  function v116GroupRows(group){
    const wanted=v116Key(group);
    const rows=(Array.isArray(window.allData)?window.allData:(typeof allData!=='undefined'&&Array.isArray(allData)?allData:[]));
    return rows.filter(row=>{
      try{return v116Key(getField(row,'GROUP'))===wanted}catch(_e){return false}
    }).sort((a,b)=>{
      const ac=v116Clean(getField(a,'CODE','PART NUMBER','PART NO'));
      const bc=v116Clean(getField(b,'CODE','PART NUMBER','PART NO'));
      try{return natural(ac,bc)}catch(_e){return ac.localeCompare(bc,undefined,{numeric:true,sensitivity:'base'})}
    });
  }
  function v116SafePart(v){
    try{return safePathPart(v)}catch(_e){return v116Clean(v).replace(/[<>:"/\\|?*]/g,'_').trim()}
  }
  function v116ImageCandidates(row){
    const group=v116SafePart(getField(row,'GROUP'));
    const groupBase=group.replace(/\s*-\s*OK$/i,'').trim();
    const code=v116SafePart(getField(row,'CODE','PART NUMBER','PART NO'));
    const folders=[
      groupBase.toUpperCase(),group,groupBase,groupBase.toLowerCase(),
      groupBase.toUpperCase()+' - OK',groupBase+' - OK'
    ].filter((v,i,a)=>v&&a.indexOf(v)===i);
    const codeForms=[code,code.toUpperCase(),code.toLowerCase()].filter((v,i,a)=>v&&a.indexOf(v)===i);
    const bases=[];
    codeForms.forEach(c=>[c+'_1',c,c+'_01'].forEach(x=>{if(!bases.includes(x))bases.push(x)}));
    const extensions=['webp','png','jpg','jpeg'];
    const paths=[];
    const add=p=>{if(p&&!paths.includes(p))paths.push(p)};
    // Prefer the current project convention first: /GROUP/CODE_1.webp.
    folders.forEach(folder=>{
      bases.forEach(base=>extensions.forEach(ext=>add('assets/Products Images/'+encodeURIComponent(folder)+'/'+encodeURIComponent(base)+'.'+ext)));
    });
    // Keep the existing image resolver as fallback for older folder conventions.
    try{productImageCandidates(row).forEach(add)}catch(_e){}
    return paths.slice(0,48);
  }
  function v116LoadOneImage(path,timeoutMs){
    return new Promise(resolve=>{
      const img=new Image();let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(value)};
      const timer=setTimeout(()=>finish(null),timeoutMs||3500);
      img.decoding='async';
      img.onload=()=>finish(img);
      img.onerror=()=>finish(null);
      img.src=path;
    });
  }
  function v116ImageToJpeg(img){
    try{
      const naturalW=img.naturalWidth||img.width,naturalH=img.naturalHeight||img.height;
      if(!naturalW||!naturalH)return null;
      const maxW=900,maxH=620,scale=Math.min(1,maxW/naturalW,maxH/naturalH);
      const w=Math.max(1,Math.round(naturalW*scale)),h=Math.max(1,Math.round(naturalH*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
      const dataUrl=canvas.toDataURL('image/jpeg',0.82);
      return {dataUrl,width:w,height:h};
    }catch(error){console.warn('V116 catalogue image conversion skipped',error);return null}
  }
  async function v116ResolveProductImage(row){
    const group=v116Clean(getField(row,'GROUP'));
    const code=v116Clean(getField(row,'CODE','PART NUMBER','PART NO'));
    const cacheKey=v116Key(group)+'|'+v116Key(code);
    if(V116_IMAGE_CACHE.has(cacheKey))return V116_IMAGE_CACHE.get(cacheKey);
    const candidates=v116ImageCandidates(row);
    for(const path of candidates){
      const img=await v116LoadOneImage(path,2800);
      if(!img)continue;
      const jpeg=v116ImageToJpeg(img);
      if(jpeg){const result={...jpeg,path};V116_IMAGE_CACHE.set(cacheKey,result);return result}
    }
    V116_IMAGE_CACHE.set(cacheKey,null);return null;
  }
  async function v116CollectItems(rows,onProgress){
    const output=new Array(rows.length);let next=0,done=0;
    async function worker(){
      while(true){
        const index=next++;if(index>=rows.length)return;
        const row=rows[index];
        const image=await v116ResolveProductImage(row);
        if(image)output[index]={row,image};
        done++;if(onProgress)onProgress(done,rows.length,output.filter(Boolean).length);
      }
    }
    await Promise.all(Array.from({length:Math.min(V116_IMAGE_CONCURRENCY,Math.max(1,rows.length))},worker));
    return output.filter(Boolean);
  }

  function v116DetailColumns(rows){
    let visible=[];
    try{if(typeof visibleColumnsForRows==='function')visible=visibleColumnsForRows(rows)||[]}catch(_e){}
    if(!visible.length){try{visible=dataColumns()||[]}catch(_e){}}
    const priorities=['UNIT','GST','HSN','HSN CODE','RATE','MRP','STD PKG','PKG SIZE','CLUTCH DIA','NO. OF TEETH','NUMBER OF TEETH','DIA','SIZE','SIZE MM','THICKNESS MM','WIDTH MM','BOX QTY','PACK'];
    const all=[];
    const add=col=>{if(col&&!all.some(x=>keyOf(x)===keyOf(col)))all.push(col)};
    priorities.forEach(k=>{
      const found=visible.find(c=>keyOf(c)===keyOf(k));if(found)add(found);
      else{
        try{const foundAll=(dataColumns()||[]).find(c=>keyOf(c)===keyOf(k));if(foundAll)add(foundAll)}catch(_e){}
      }
    });
    visible.forEach(add);
    const blocked=/^(GROUP|SUB GROUP|SUB-GROUP|SUBGROUP|CODE|PART NUMBER|PART NO|PRODUCT NAME|DESCRIPTION|IMAGE|IMAGE LINK|CATALOG|CATALOG LINK|CATALOG URL|INDEX|VISIBLE|VISIBILITY)$/i;
    return all.filter(col=>!blocked.test(keyOf(col))).filter(col=>rows.some(row=>v116Clean(displayFieldValue(row,col))));
  }
  function v116Hierarchy(row){
    const parts=[];
    const defs=[['Sub Group',['SUB GROUP','SUB-GROUP','SUBGROUP']],['Category',['CATEGORY','CATEGORIES','CATAGORIES']],['Segment',['SEGMENT']],['Vehicle',['VEHICLE']],['Model',['MODEL']]];
    defs.forEach(([label,keys])=>{
      const value=v116Clean(getField(row,...keys));if(value&&!parts.some(x=>x.value===value))parts.push({label,value});
    });
    return parts;
  }
  function v116ProductDetails(row,columns){
    const details=[];
    columns.forEach(col=>{
      const value=v116Clean(displayFieldValue(row,col));if(!value)return;
      const label=keyOf(col).replace(/\s+/g,' ').trim();
      if(/^https?:\/\//i.test(value))return;
      details.push({label,value});
    });
    return details.slice(0,12);
  }

  function v116BytesFromDataUrl(dataUrl){
    const raw=String(dataUrl||'').split(',').pop()||'';
    const bin=atob(raw),out=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i)&255;
    return out;
  }
  function v116PdfEscape(value){return v116PdfText(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
  function v116PdfText(value){
    try{return pdfAscii(value)}catch(_e){return String(value==null?'':value).replace(/[^\x20-\x7E]/g,' ')}
  }
  function v116Latin1(value){
    try{return latin1Bytes(value)}catch(_e){const s=String(value);const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i)&255;return out}
  }
  function v116Wrap(value,width,fontSize,maxLines){
    try{return pdfWrapText(value,width,fontSize,maxLines)}catch(_e){
      const text=v116PdfText(value).replace(/\s+/g,' ').trim(),max=Math.max(5,Math.floor(width/(fontSize*.52)));const words=text.split(' '),lines=[];let line='';
      for(const word of words){const next=(line+' '+word).trim();if(next.length>max&&line){lines.push(line);line=word}else line=next;if(lines.length>=maxLines-1)break}if(line&&lines.length<maxLines)lines.push(line);return lines;
    }
  }
  function v116FitImage(boxW,boxH,imgW,imgH){
    const scale=Math.min(boxW/imgW,boxH/imgH);return {w:imgW*scale,h:imgH*scale};
  }
  function v116Rgb(r,g,b){return `${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)}`}
  function v116Rect(cmd,H,x,top,w,h,fill,stroke,lineWidth){
    const y=H-top-h;
    if(lineWidth)cmd.push(`${lineWidth} w`);
    if(fill&&stroke)cmd.push(`${fill} rg ${stroke} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
    else if(fill)cmd.push(`${fill} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    else if(stroke)cmd.push(`${stroke} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  }
  function v116Line(cmd,H,x1,top1,x2,top2,stroke,width){cmd.push(`${width||1} w ${stroke} RG ${x1.toFixed(2)} ${(H-top1).toFixed(2)} m ${x2.toFixed(2)} ${(H-top2).toFixed(2)} l S`)}
  function v116Text(cmd,H,text,x,top,size,font,color){
    const y=H-top-size;
    cmd.push(`BT /${font||'F1'} ${size.toFixed(2)} Tf ${color||'0 0 0'} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${v116PdfEscape(text)}) Tj ET`);
  }
  function v116TextLines(cmd,H,lines,x,top,size,font,color,gap){
    const step=gap||size*1.22;lines.forEach((line,i)=>v116Text(cmd,H,line,x,top+i*step,size,font,color));
  }

  async function v116ResolveBrandLogo(group){
    const candidates=[];
    try{(logoCandidatesForBrand(group)||[]).forEach(p=>{if(p&&!candidates.includes(p))candidates.push(p)})}catch(_e){}
    for(const path of candidates.slice(0,12)){const img=await v116LoadOneImage(path,2200);if(img){const jpeg=v116ImageToJpeg(img);if(jpeg)return jpeg}}
    return null;
  }

  function v116BuildPdf(items,group,columns,dynamicBrandLogo){
    const W=595,H=842,margin=22,headerH=78,footerH=32,gapX=10,gapY=9;
    const contentTop=headerH+15,contentBottom=H-footerH-12;
    const cardW=(W-margin*2-gapX)/2,cardH=(contentBottom-contentTop-gapY*2)/3;
    const blue=v116Rgb(8,78,153),deep=v116Rgb(8,51,112),orange=v116Rgb(245,166,20),pale=v116Rgb(245,249,253),line=v116Rgb(192,210,229),muted=v116Rgb(94,113,136);
    const chunks=[];for(let i=0;i<items.length;i+=V116_PER_PAGE)chunks.push(items.slice(i,i+V116_PER_PAGE));
    const objects=[];const add=o=>{objects.push(o);return objects.length};
    const catalog=add(''),pagesObj=add(''),f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    let rajBytes=null,rajDim=null,brandBytes=null,brandDim=null;
    try{rajBytes=b64Bytes(V77_COMPANY_LOGO_JPEG_B64);rajDim=jpegDimensions(rajBytes)}catch(_e){}
    const brandB64=(typeof pdfEmbeddedLogoB64==='function'?pdfEmbeddedLogoB64(group):'');
    try{
      if(dynamicBrandLogo?.dataUrl){brandBytes=v116BytesFromDataUrl(dynamicBrandLogo.dataUrl);brandDim=jpegDimensions(brandBytes)||{width:dynamicBrandLogo.width,height:dynamicBrandLogo.height}}
      else if(brandB64){brandBytes=b64Bytes(brandB64);brandDim=jpegDimensions(brandBytes)}
    }catch(_e){}
    const rajObj=rajBytes&&rajDim?add({bin:rajBytes,head:`<< /Type /XObject /Subtype /Image /Width ${rajDim.width} /Height ${rajDim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${rajBytes.length} >>`}):0;
    const brandObj=brandBytes&&brandDim?add({bin:brandBytes,head:`<< /Type /XObject /Subtype /Image /Width ${brandDim.width} /Height ${brandDim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${brandBytes.length} >>`}):0;

    const imageObjects=new Map();
    items.forEach((item,index)=>{
      const bytes=v116BytesFromDataUrl(item.image.dataUrl),dim=jpegDimensions(bytes)||{width:item.image.width,height:item.image.height};
      const id=add({bin:bytes,head:`<< /Type /XObject /Subtype /Image /Width ${dim.width} /Height ${dim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`});
      imageObjects.set(item,id);item._v116PdfIndex=index;item._v116Dim=dim;
    });

    const pageIds=chunks.map(()=>add(''));
    chunks.forEach((pageItems,pageIndex)=>{
      const cmd=[];
      // Header shell.
      v116Rect(cmd,H,margin,14,W-margin*2,headerH-15,pale,blue,1.2);
      v116Rect(cmd,H,margin,14,6,headerH-15,orange,null,0);
      v116Rect(cmd,H,margin+14,24,75,42,'1 1 1',line,.8);
      if(rajObj)cmd.push(`q 64 0 0 34 ${margin+19} ${H-61} cm /RajLogo Do Q`);
      v116Text(cmd,H,'RAJ GROUP CATALOGUE',margin+102,30,17,'F2',deep);
      v116Text(cmd,H,'RAJ AGENCIES  |  PROFESSIONAL PRODUCT CATALOGUE',margin+102,52,6.6,'F1',orange);
      const brandBoxX=W-margin-88;
      v116Rect(cmd,H,brandBoxX,22,78,42,'1 1 1',orange,.8);
      if(brandObj)cmd.push(`q 66 0 0 30 ${brandBoxX+6} ${H-58} cm /BrandLogo Do Q`);
      const brandLines=v116Wrap(group,80,8,2);
      v116TextLines(cmd,H,brandLines,brandBoxX+2,67,7.2,'F2',deep,8.2);

      pageItems.forEach((item,localIndex)=>{
        const col=localIndex%2,row=Math.floor(localIndex/2),x=margin+col*(cardW+gapX),top=contentTop+row*(cardH+gapY);
        const data=item.row,code=v116Clean(getField(data,'CODE','PART NUMBER','PART NO'))||'—';
        const name=v116Clean(getField(data,'PRODUCT NAME','DESCRIPTION'))||code;
        const hierarchy=v116Hierarchy(data),details=v116ProductDetails(data,columns);
        v116Rect(cmd,H,x,top,cardW,cardH,'1 1 1',line,.85);
        v116Rect(cmd,H,x,top,cardW,4,orange,null,0);
        // Image zone.
        const imgTop=top+10,imgH=90,imgX=x+10,imgW=cardW-20;
        v116Rect(cmd,H,imgX,imgTop,imgW,imgH,'1 1 1',v116Rgb(224,233,243),.55);
        const dim=item._v116Dim||{width:item.image.width,height:item.image.height},fit=v116FitImage(imgW-8,imgH-8,dim.width,dim.height);
        const drawX=imgX+(imgW-fit.w)/2,drawTop=imgTop+(imgH-fit.h)/2,drawY=H-drawTop-fit.h;
        cmd.push(`q ${fit.w.toFixed(2)} 0 0 ${fit.h.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /P${localIndex} Do Q`);
        // Code badge and product name.
        v116Rect(cmd,H,x+10,top+107,72,14,blue,null,0);
        v116Text(cmd,H,code,x+15,top+110,7.2,'F2','1 1 1');
        const nameLines=v116Wrap(name,cardW-103,8.1,2);
        v116TextLines(cmd,H,nameLines,x+91,top+107,7.5,'F2',deep,9.2);
        let infoTop=top+131;
        if(hierarchy.length){
          const hierarchyText=hierarchy.slice(0,3).map(h=>h.value).join('  •  ');
          const hLines=v116Wrap(hierarchyText,cardW-20,6.4,2);
          v116TextLines(cmd,H,hLines,x+10,infoTop,5.9,'F1',muted,7.1);infoTop+=hLines.length*7.1+3;
        }
        v116Line(cmd,H,x+10,infoTop,x+cardW-10,infoTop,line,.65);infoTop+=5;
        // Two-column details grid.
        const detailCols=2,detailGap=7,detailW=(cardW-20-detailGap)/2;
        const maxRows=Math.max(1,Math.floor((top+cardH-8-infoTop)/15));
        const maxItems=Math.min(details.length,maxRows*detailCols);
        for(let i=0;i<maxItems;i++){
          const d=details[i],dc=i%2,dr=Math.floor(i/2),dx=x+10+dc*(detailW+detailGap),dt=infoTop+dr*15;
          if(dc===1)v116Line(cmd,H,dx-detailGap/2,dt-1,dx-detailGap/2,dt+12,v116Rgb(224,232,241),.45);
          const label=v116PdfText(d.label).toUpperCase(),value=v116PdfText(d.value);
          v116Text(cmd,H,label,dx,dt,4.7,'F2',muted);
          const valueLines=v116Wrap(value,detailW,6.3,1);
          v116Text(cmd,H,valueLines[0]||'',dx,dt+6.1,6.0,/^(RATE|MRP)$/.test(label)?'F2':'F1',/^(RATE|MRP)$/.test(label)?blue:'0.10 0.14 0.20');
        }
      });

      // Footer: branded lines with centered page number.
      const footerTop=H-footerH+7;
      v116Line(cmd,H,margin,footerTop,W/2-34,footerTop,blue,2.2);
      v116Line(cmd,H,W/2+34,footerTop,W-margin,footerTop,orange,2.2);
      v116Rect(cmd,H,W/2-30,footerTop-7,60,17,deep,orange,.8);
      v116Text(cmd,H,'PAGE '+(pageIndex+1),W/2-17,footerTop-3,7.2,'F2','1 1 1');
      v116Text(cmd,H,'RAJ GROUP  •  '+group,margin,footerTop+10,5.3,'F1',muted);
      const right='PRODUCTS '+items.length;
      v116Text(cmd,H,right,W-margin-52,footerTop+10,5.3,'F1',muted);

      const content=v116Latin1(cmd.join('\n')),contentObj=add({bin:content,head:`<< /Length ${content.length} >>`});
      let xObjects='';if(rajObj)xObjects+=` /RajLogo ${rajObj} 0 R`;if(brandObj)xObjects+=` /BrandLogo ${brandObj} 0 R`;
      pageItems.forEach((item,localIndex)=>{xObjects+=` /P${localIndex} ${imageObjects.get(item)} 0 R`});
      objects[pageIds[pageIndex]-1]=`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject <<${xObjects} >> >> /Contents ${contentObj} 0 R >>`;
    });
    objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
    const out=[v116Latin1('%PDF-1.4\n%V116\n')],offsets=[0];let length=out[0].length;
    for(let i=0;i<objects.length;i++){
      offsets[i+1]=length;const prefix=v116Latin1(`${i+1} 0 obj\n`);out.push(prefix);length+=prefix.length;
      const obj=objects[i];
      if(typeof obj==='string'){const b=v116Latin1(obj+'\nendobj\n');out.push(b);length+=b.length}
      else{const h=v116Latin1(obj.head+'\nstream\n');out.push(h);length+=h.length;out.push(obj.bin);length+=obj.bin.length;const e=v116Latin1('\nendstream\nendobj\n');out.push(e);length+=e.length}
    }
    const xrefPos=length;let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<=objects.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    xref+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    out.push(v116Latin1(xref));return new Blob(out,{type:'application/pdf'});
  }

  async function v116DownloadCatalogue(){
    const group=v116SelectedGroup();
    let multi=[];try{multi=typeof v103MultiValues==='function'?v103MultiValues('groupFilter'):[]}catch(_e){}
    if(Array.isArray(multi)&&multi.length>1){toast('Catalogue ke liye ek time par sirf ek Group select karein.');return}
    if(!group){toast('Catalogue download ke liye ek Group select karein.');return}
    const rows=v116GroupRows(group);if(!rows.length){toast(group+' group me product data nahi mila.');return}
    const button=document.getElementById('catalogDownloadBtn');const oldText=button?.textContent||'Download Catalog';
    if(button){button.disabled=true;button.textContent='Scanning Images…'}
    try{
      const items=await v116CollectItems(rows,(done,total,found)=>{if(button)button.textContent=`Images ${done}/${total} · ${found} found`});
      if(!items.length){
        toast(group+' ke uploaded product images nahi mile. Existing catalog link check kiya ja raha hai.');
        if(typeof V116_ORIGINAL_OPEN==='function')V116_ORIGINAL_OPEN();
        return;
      }
      if(button)button.textContent='Creating Catalogue PDF…';
      const columns=v116DetailColumns(rows),brandLogo=await v116ResolveBrandLogo(group),blob=v116BuildPdf(items,group,columns,brandLogo);
      const filename=(typeof safePdfName==='function'?safePdfName(group):group.replace(/[^A-Za-z0-9 _-]+/g,'_'))+' CATALOGUE.pdf';
      if(typeof downloadPdfBlob==='function')downloadPdfBlob(blob,filename);
      else{
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);
      }
      toast(`Catalogue ready: ${items.length.toLocaleString('en-IN')} image products · ${Math.ceil(items.length/V116_PER_PAGE)} pages`);
    }catch(error){
      console.error('V116 catalogue PDF error:',error);toast('Catalogue PDF create nahi hua. Please try again.');
    }finally{
      if(button){button.disabled=false;button.textContent=oldText}
      try{window.renderCatalogCard?.(group)}catch(_e){}
    }
  }

  // Preserve the existing card/status logic, then enable the new image catalogue for any single selected group.
  window.renderCatalogCard=function(group){
    if(typeof V116_ORIGINAL_RENDER==='function')V116_ORIGINAL_RENDER(group);
    const button=document.getElementById('catalogDownloadBtn'),status=document.getElementById('catalogStatus');
    const selected=v116Clean(group)||v116SelectedGroup();
    let multi=[];try{multi=typeof v103MultiValues==='function'?v103MultiValues('groupFilter'):[]}catch(_e){}
    const single=!!selected&&(!Array.isArray(multi)||multi.length<=1);
    if(button){button.disabled=!single;button.title=single?'Uploaded product images se professional A4 catalogue PDF banayein':'Catalogue ke liye ek Group select karein'}
    if(status&&single)status.textContent='Uploaded product images se RAJ GROUP branded A4 Catalogue PDF ready hoga. Pricelist option unchanged hai.';
  };
  window.openSelectedCatalog=v116DownloadCatalogue;
  window.RAJ_V116_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;

  function v116Bind(){
    const button=document.getElementById('catalogDownloadBtn');if(button)button.onclick=v116DownloadCatalogue;
    try{window.renderCatalogCard(v116SelectedGroup())}catch(_e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v116Bind,{once:true});else v116Bind();
})();
