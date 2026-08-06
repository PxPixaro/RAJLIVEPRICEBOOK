
const $ = s => document.querySelector(s);
const BRAND_LOGOS = {};
function logoKey(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/LIMITED|PVT|LTD|INDIA/g,'')}
function logoForBrand(brand){
  const wanted=logoKey(brand);
  if(!wanted || wanted==='ALLPRODUCTS') return '';
  const files=window.BRAND_LOGO_FILES||[];
  let best=files.find(f=>logoKey(f.replace(/\.[^.]+$/,''))===wanted);
  if(!best)best=files.find(f=>{
    const k=logoKey(f.replace(/\.[^.]+$/,''));
    return k && (k.includes(wanted)||wanted.includes(k));
  });
  return best ? 'assets/brand-logos/'+encodeURIComponent(best).replace(/%2F/g,'/') : '';
}

const CATALOG_LINKS = window.CATALOG_LINKS || {};

// V20 bundled data is dictionary encoded to cut data.js from ~20.6 MB to ~6 MB.
// Excel-synchronized rows remain normal objects, so both formats work together.
const COMPACT_COLUMNS = window.PRICEBOOK_COLUMNS || [];
const COMPACT_DICTIONARIES = window.PRICEBOOK_DICTIONARIES || [];
const COMPACT_COLUMN_INDEX = new Map(COMPACT_COLUMNS.map((name,index)=>[keyOf(name),index]));
const BUNDLED_ROWS = window.PRICEBOOK_ROWS || null;

const HIDDEN_COLUMNS = new Set([
  'GROUP','SEGMENT','VEHICLE','MODEL','CATAGORIES','CATEGORIES','CATEGORY',
  'VIEW BY','VIEWBY','LIST DATE','LISTDATE','SUB GROUP','SUB-GROUP','SUBGROUP','SUB GROUP NAME',
  'CATALOG','CATALOG LINK','CATALOG URL','CATALOG NAME','CATALOG FILE'
]);
const ALWAYS = ['CODE','PRODUCT NAME','UNIT','GST','RATE','MRP'];
const NUMERIC_COLUMNS = new Set(['RATE','MRP','STD PKG','CRT PKG','BOX QTY','PACK']);

let allData = BUNDLED_ROWS || window.PRICEBOOK_DATA || [];
let rowIndexMap = new WeakMap();
function rebuildRowIndexMap(){
  rowIndexMap = new WeakMap();
  allData.forEach((row,index)=>{
    if(row && (typeof row==='object' || typeof row==='function'))rowIndexMap.set(row,index);
  });
}
function rowSourceIndex(row){
  const cached=row && rowIndexMap.get(row);
  return cached===undefined ? allData.indexOf(row) : cached;
}
let filtered = [];
let visibleColumns = [];
let page = 1;
let pageSize = 50;
let lastUpdated = new Date();
let printingAll = false;
const DATA_CACHE_SCHEMA='RAJ_PRICEBOOK_DATA_SCHEMA_1';
const ORIGINAL_DOCUMENT_TITLE = document.title;
function safePdfName(value){
  return (clean(value)||'Raj Agencies Pricelist').replace(/[<>:\"/\\|?*]+/g,' ').replace(/\s+/g,' ').trim();
}
function setSelectedGroupPrintTitle(){
  const group=clean($('#groupFilter')?.value)||clean(currentCatalogGroup)||'Raj Agencies Pricelist';
  document.title=safePdfName(group);
}


function clean(v){return v===null||v===undefined?'':String(v).trim()}
function keyOf(s){return clean(s).toUpperCase().replace(/\s+/g,' ')}
function isEmpty(v){const x=clean(v); return x==='' || x==='0' || x==='0.00'}
function escapeHtml(v){return clean(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function natural(a,b){return clean(a).localeCompare(clean(b),undefined,{numeric:true,sensitivity:'base'})}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}
function getField(row, ...names){
  if(Array.isArray(row) && COMPACT_DICTIONARIES.length){
    for(const n of names){
      const index=COMPACT_COLUMN_INDEX.get(keyOf(n));
      if(index===undefined)continue;
      const dictionary=COMPACT_DICTIONARIES[index]||[];
      const code=row[index];
      return code===undefined ? '' : (dictionary[code] ?? '');
    }
    return '';
  }
  for(const n of names){
    const wanted=keyOf(n);
    const found=Object.keys(row||{}).find(k=>keyOf(k)===wanted);
    if(found!==undefined)return row[found];
  }
  return '';
}
function dataColumns(){
  if(allData[0] && Array.isArray(allData[0]) && COMPACT_COLUMNS.length)return COMPACT_COLUMNS;
  return allData[0] ? Object.keys(allData[0]) : [];
}
function normalizedHeaderList(rawHeaders){
  const seen=new Map();
  return rawHeaders.map((header,index)=>{
    const base=keyOf(header)||`COLUMN ${index+1}`;
    const count=(seen.get(base)||0)+1;
    seen.set(base,count);
    return count===1 ? base : `${base} ${count}`;
  });
}
function unique(rows,key){return [...new Set(rows.map(r=>clean(getField(r,key))).filter(Boolean))].sort(natural)}
function options(el, values, label){
  const current=el.value;
  el.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  if(values.includes(current))el.value=current;
}


function safePathPart(v){return clean(v).replace(/[<>:"/\\|?*]/g,'_').trim()}
function productImageCandidates(row){
  const rawGroup=safePathPart(getField(row,'GROUP'));
  const groupBase=rawGroup.replace(/\s*-\s*OK$/i,'').trim();
  const code=safePathPart(getField(row,'CODE','PART NUMBER','PART NO'));

  // Optimized image folders can be copied directly as GROUP - OK, for example:
  // assets/Products Images/AAYUB - OK/AA201_1.webp
  // The old format (Aayub/AA201.png) remains supported too.
  const folders=[
    `${groupBase.toUpperCase()} - OK`,
    rawGroup,
    groupBase,
    groupBase.toUpperCase(),
    `${groupBase} - OK`
  ].filter((v,i,a)=>v && a.indexOf(v)===i);
  const fileBases=[`${code}_1`,code,`${code}_01`].filter((v,i,a)=>v && a.indexOf(v)===i);
  const extensions=['webp','png','jpg','jpeg','WEBP','PNG','JPG','JPEG'];
  const candidates=[];
  folders.forEach(folder=>fileBases.forEach(fileBase=>extensions.forEach(ext=>{
    candidates.push(`assets/Products Images/${encodeURIComponent(folder)}/${encodeURIComponent(fileBase)}.${ext}`);
  })));
  return candidates;
}
let imageZoom=1;
function closeImageModal(){
  $('#imageModal').classList.remove('open');
  $('#imageModal').setAttribute('aria-hidden','true');
  $('#productImagePreview').src='';
  imageZoom=1;
}
function openProductImage(row){
  const candidates=productImageCandidates(row);
  const img=$('#productImagePreview'),err=$('#imageError');
  $('#imageModalCode').textContent=clean(getField(row,'CODE','PART NUMBER','PART NO'))||'Product Image';
  $('#imageModalName').textContent=clean(getField(row,'PRODUCT NAME','DESCRIPTION'));
  err.hidden=true; imageZoom=1; img.style.transform='scale(1)';
  let pos=0;
  img.onload=()=>{err.hidden=true};
  img.onerror=()=>{pos++; if(pos<candidates.length)img.src=candidates[pos]; else{img.removeAttribute('src');err.hidden=false}};
  img.src=candidates[pos];
  $('#imageModal').classList.add('open');
  $('#imageModal').setAttribute('aria-hidden','false');
}
function clearFilterSelections(){
  ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>$('#'+id).value='');
  document.querySelectorAll('.filter-search').forEach(x=>x.value='');
  $('#searchInput').value='';
}
function runUniversalSearch(term){
  const q=clean(term);
  clearFilterSelections();
  $('#universalSearchInput').value=q;
  if(!q){applyFilters();return}
  const exactGroup=unique(allData,'GROUP').find(g=>g.toLowerCase()===q.toLowerCase());
  if(exactGroup){
    $('#groupFilter').value=exactGroup;
    applyFilters();
  }else{
    $('#searchInput').value=q;
    applyFilters();
  }
}


function filterSearchTerm(targetId){
  const input=document.querySelector(`.filter-search[data-target="${targetId}"]`);
  return input ? clean(input.value).toLowerCase() : '';
}
function containsField(row, term, ...fieldNames){
  if(!term)return true;
  return clean(getField(row,...fieldNames)).toLowerCase().includes(term);
}

function subGroupValue(row){return clean(getField(row,'SUB GROUP','SUB-GROUP','SUBGROUP','SUB GROUP NAME'))}
function catalogKey(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'')}
const catalogUrlCache=new Map();
function configuredCatalog(group){
  const wanted=catalogKey(group);
  if(!wanted)return '';
  if(catalogUrlCache.has(wanted))return catalogUrlCache.get(wanted);
  const configured=Object.entries(CATALOG_LINKS).find(([name,url])=>catalogKey(name)===wanted && clean(url) && !clean(url).includes('PASTE_'));
  if(configured){
    const url=clean(configured[1]);
    catalogUrlCache.set(wanted,url);
    return url;
  }
  const hasCatalogColumn=dataColumns().some(c=>['CATALOG LINK','CATALOG URL','CATALOG','CATALOG FILE'].includes(keyOf(c)));
  if(!hasCatalogColumn){catalogUrlCache.set(wanted,'');return ''}
  const url=allData
    .filter(r=>catalogKey(getField(r,'GROUP'))===wanted)
    .map(r=>clean(getField(r,'CATALOG LINK','CATALOG URL','CATALOG','CATALOG FILE')))
    .find(Boolean)||'';
  catalogUrlCache.set(wanted,url);
  return url;
}
let currentCatalogGroup='';
let currentCatalogUrl='';
function renderCatalogCard(group){
  const title=$('#catalogTitle');
  const status=$('#catalogStatus');
  const catalogBtn=$('#catalogDownloadBtn');
  const priceBtn=$('#priceListDownloadBtn');
  const card=$('#selectedCatalog');
  if(!title||!status||!catalogBtn||!priceBtn||!card)return;

  currentCatalogGroup=clean(group);
  currentCatalogUrl=configuredCatalog(currentCatalogGroup);
  card.classList.toggle('catalog-ready',!!currentCatalogUrl);
  card.classList.toggle('catalog-fallback',!!currentCatalogGroup&&!currentCatalogUrl);

  const hasGroup=!!currentCatalogGroup;
  catalogBtn.disabled=!hasGroup || !currentCatalogUrl;
  priceBtn.disabled=!hasGroup;
  catalogBtn.title=currentCatalogUrl ? 'Open selected group catalog' : 'Add this group Google Drive link in js/catalog-links.js';
  priceBtn.title=hasGroup ? 'Download the products currently visible in the selected grid as PDF' : 'Select a group first';

  if(!hasGroup){
    title.textContent='Select a group';
    status.textContent='Group select karte hi Catalog aur current grid Pricelist dono options yahan milenge.';
    return;
  }

  title.textContent=`${currentCatalogGroup} Downloads`;
  status.textContent=currentCatalogUrl
    ? 'Catalog link ready hai. Pricelist button current filtered grid ke products ka PDF banayega.'
    : 'Catalog link pending hai — js/catalog-links.js me is group ka Google Drive link add karein. Pricelist ready hai.';
}
function buildCatalogMenu(){renderCatalogCard($('#groupFilter')?$('#groupFilter').value:'')}
function openSelectedCatalog(){
  if(!currentCatalogGroup){toast('Please select a group first');return}
  if(!currentCatalogUrl){
    toast('Catalog link not added. js/catalog-links.js me is group ka Google Drive link add karein.');
    return;
  }
  if(/^https?:\/\//i.test(currentCatalogUrl)){
    window.open(currentCatalogUrl,'_blank','noopener,noreferrer');
  }else{
    const link=document.createElement('a');
    link.href=currentCatalogUrl;
    link.download='';
    link.target='_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
let activePrintFrame=null;
function normalizeSegmentToken(value){
  let token=clean(value).toUpperCase().replace(/\s+/g,' ').trim();
  if(!token || token==='-')return '';
  const compact=token.replace(/[^A-Z0-9]/g,'');
  if(['2WHEEL','2WHEELR','2WHEELER','2WHEELERS'].includes(compact))return '2 WHEELERS';
  if(['3WHEEL','3WHEELR','3WHEELER','3WHEELERS'].includes(compact))return '3 WHEELERS';
  if(['EARTHMOVER','EARTHMOVERS','EARTHEMOVER','EARTHEMOVERS'].includes(compact))return 'EARTHMOVERS';
  if(['TRACT0R','TRACTOR','TRACTORS','TRACTRO'].includes(compact))return 'TRACTOR';
  if(compact==='DIESELENGINE')return 'DIESEL ENGINE';
  return token;
}
function segmentTokens(value){
  const raw=clean(value);
  if(!raw)return [];
  return [...new Set(raw.split(/[,;|/&]+/).map(normalizeSegmentToken).filter(Boolean))];
}
function uniqueSegments(rows){
  const found=new Set();
  rows.forEach(row=>segmentTokens(getField(row,'SEGMENT')).forEach(token=>found.add(token)));
  return [...found].sort(natural);
}
function segmentMatch(row, selected){
  if(!selected)return true;
  const wanted=normalizeSegmentToken(selected);
  const tokens=segmentTokens(getField(row,'SEGMENT'));
  if(wanted==='UNIVERSAL')return tokens.includes('UNIVERSAL');
  return tokens.includes(wanted) || tokens.includes('UNIVERSAL');
}
function printCellClass(column){
  const key=keyOf(column);
  if(key==='RATE'||key==='MRP')return 'price';
  if(key==='CODE'||key==='PRODUCT NAME')return 'left';
  return 'right';
}
function printColumnWeights(columns){
  const weights=columns.map(column=>{
    const key=keyOf(column);
    if(key==='PRODUCT NAME')return 5.6;
    if(key==='CODE')return 1.55;
    if(key==='UNIT'||key==='GST')return .82;
    if(key==='RATE'||key==='MRP')return 1.0;
    return 1.18;
  });
  const serialWeight=.45;
  const total=serialWeight+weights.reduce((sum,value)=>sum+value,0);
  return {
    serial:(serialWeight*100/total).toFixed(3),
    columns:weights.map(value=>(value*100/total).toFixed(3))
  };
}
function printProductRow(row,columns,serial){
  return `<tr><td class="serial">${serial}</td>${columns.map(column=>`<td class="${printCellClass(column)}">${escapeHtml(getField(row,column))}</td>`).join('')}</tr>`;
}
function hierarchyVisual(level,mode='grid'){
  const depth=level+1;
  const step=mode==='pdf'?8:13;
  const base=mode==='pdf'?5:12;
  // Keep very deep hierarchies readable without letting headings run off-screen.
  const indent=Math.min(base+level*step,mode==='pdf'?88:180);
  const prefix=mode==='pdf'?'pdf-level':'group-level';
  return {depth,indent,className:depth<=4?`${prefix}-${depth}`:`${prefix}-deep`};
}
function appendPrintHierarchy(output,rows,contextRows,columns,serialState){
  const fields=viewByFields(contextRows);
  const renderProducts=items=>{
    sortRowsByFields(items,[]).forEach(row=>{
      serialState.value++;
      output.push(printProductRow(row,columns,serialState.value));
    });
  };
  const renderLevel=(items,level,path)=>{
    if(level>=fields.length){renderProducts(items);return}
    const field=fields[level];
    groupedEntries(items,field,fields.slice(level+1)).forEach(([title,groupItems])=>{
      const nextPath=[...path,title];
      const total=hierarchyCount(contextRows,fields,nextPath);
      const visual=hierarchyVisual(level,'pdf');
      output.push(`<tr class="pdf-group-heading ${visual.className}" data-group-level="${visual.depth}" style="--view-indent:${visual.indent}px"><td colspan="${columns.length+1}"><span class="pdf-group-label">${escapeHtml(viewByLabel(field))}</span><span class="pdf-group-title">${escapeHtml(title)}</span><span class="pdf-group-count">${total.toLocaleString('en-IN')} Products</span></td></tr>`);
      renderLevel(groupItems,level+1,nextPath);
    });
  };
  if(fields.length)renderLevel(sortRowsByFields(rows,fields),0,[]);
  else renderProducts(rows);
}
function buildPrintBodyRows(rows,columns){
  const output=[];
  const serialState={value:0};
  const selectedGroup=clean($('#groupFilter').value);
  if(selectedGroup){
    appendPrintHierarchy(output,rows,rows,columns,serialState);
  }else{
    const brands=[...new Set(rows.map(row=>clean(getField(row,'GROUP'))).filter(Boolean))].sort(natural);
    brands.forEach(brand=>{
      const brandRows=rows.filter(row=>clean(getField(row,'GROUP'))===brand);
      output.push(`<tr class="pdf-brand-heading"><td colspan="${columns.length+1}"><span>${escapeHtml(brand)}</span><span class="pdf-brand-meta">${brandRows.length.toLocaleString('en-IN')} Products · Company List Date: ${escapeHtml(listDateForRows(brandRows))}</span></td></tr>`);
      appendPrintHierarchy(output,brandRows,brandRows,columns,serialState);
    });
  }
  return output.join('');
}
function buildLightweightPrintHtml(){
  const group=clean($('#groupFilter').value)||clean(currentCatalogGroup)||'Raj Agencies Pricelist';
  const rows=sortedRows(filtered);
  const cols=visibleColumns.slice();
  const logo=logoForBrand(group);
  const fontSize=cols.length>12?'5.8px':cols.length>9?'6.6px':'7.4px';
  const cellPad=cols.length>12?'2.2px 2px':'3px 2.5px';
  const widths=printColumnWeights(cols);
  const colgroup=`<colgroup><col style="width:${widths.serial}%">${cols.map((c,index)=>`<col style="width:${widths.columns[index]}%">`).join('')}</colgroup>`;
  const head=cols.map(c=>`<th class="${printCellClass(c)}">${escapeHtml(c)}</th>`).join('');
  const body=buildPrintBodyRows(rows,cols);
  const base=escapeHtml(document.baseURI);
  const safeTitle=escapeHtml(safePdfName(group));
  const brandLogo=logo?`<img class="brand-logo" src="${escapeHtml(logo)}" alt="">`:'';
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><title>${safeTitle}</title><style>
    @page{size:A4 landscape;margin:7mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-size:${fontSize}}
    .watermark{position:fixed;z-index:0;left:50%;top:52%;transform:translate(-50%,-50%);width:86vw;height:78vh;object-fit:contain;opacity:.024;pointer-events:none}
    .page-content{position:relative;z-index:1}
    .print-head{display:grid;grid-template-columns:95px 1fr 95px;align-items:center;border-bottom:3px solid #f5b00e;padding:0 0 5px;margin:0 0 5px}
    .company-logo,.brand-logo{width:88px;height:50px;object-fit:contain}
    .brand-logo{justify-self:end}
    .title{text-align:center}
    .kicker{font-size:11px;font-weight:900;letter-spacing:.12em;color:#dc6c0b}
    h1{margin:1px 0;color:#0e337e;font-size:18px;line-height:1.05}
    .sub{font-size:8px;letter-spacing:.18em;font-weight:800;color:#0e337e}
    .meta{display:flex;justify-content:center;gap:5px;margin-top:4px;font-size:6.7px;font-weight:800}
    .meta span{border:1px solid #7bb8ee;border-radius:4px;padding:2px 5px;background:#f3f9ff}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fontSize}}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{break-inside:avoid;page-break-inside:avoid}
    th{background:#0e337e;color:#fff;border:1px solid #355a91;padding:${cellPad};font-size:${fontSize};font-weight:800;white-space:normal;overflow-wrap:anywhere;line-height:1.08}
    td{border:1px solid #aeb9c7;padding:${cellPad};line-height:1.15;background:rgba(255,255,255,.90);vertical-align:middle;overflow-wrap:anywhere;word-break:normal}
    tbody tr:nth-child(even) td{background:rgba(245,248,252,.92)}
    .serial{width:24px;text-align:center}
    th.left{text-align:left}th.right,th.price{text-align:right;color:#fff!important}
    td.left{text-align:left}td.right{text-align:right;white-space:nowrap}td.price{text-align:right;color:#0757b8;font-weight:800;white-space:nowrap}
    .pdf-group-heading{break-after:avoid;page-break-after:avoid}
    .pdf-group-heading td{font-weight:800;text-align:left!important;white-space:normal!important;border-color:#7a9bc4!important}
    .pdf-level-1 td{background:#dceeff!important;color:#0e337e;font-size:8.2px;padding:4px 5px}
    .pdf-level-2 td{background:#fff3bd!important;color:#5a3b00;font-size:7.5px;padding:3.5px 5px 3.5px 12px}
    .pdf-level-3 td{background:#edf3fb!important;color:#27364a;font-size:7px;padding:3px 5px 3px 20px}
    .pdf-level-4 td{background:#f7f8fa!important;color:#27364a;font-size:6.8px;padding:3px 5px 3px 28px}
    .pdf-level-deep td{background:#fafbfc!important;color:#27364a;font-size:6.6px;border-color:#d3d9e1!important}
    .pdf-group-heading[data-group-level] td{padding-left:var(--view-indent,5px)!important}
    .pdf-group-label{display:inline-block;margin-right:6px;padding:1px 4px;border:1px solid currentColor;border-radius:3px;font-size:.82em;letter-spacing:.05em}
    .pdf-group-title{font-weight:900}
    .pdf-group-count{float:right;font-size:.85em;font-weight:800}
    .pdf-brand-heading td{background:#0e337e!important;color:#fff!important;font-size:9px;font-weight:900;padding:5px 6px;text-align:left!important}
    .pdf-brand-meta{float:right;font-size:6.8px;font-weight:700}
    .footer-note{text-align:center;margin-top:4px;font-size:6.4px;color:#4a5568}
    @media screen{body{padding:10px}}
  </style></head><body>
    <img class="watermark" src="assets/company-logo/rajgroup-watermark-93kb.png" alt="">
    <div class="page-content">
      <div class="print-head">
        <img class="company-logo" src="assets/company-logo/raj-group-logo-optimized.webp" alt="Raj Group">
        <div class="title"><div class="kicker">RAJ AGENCIES</div><h1>${escapeHtml(group)}</h1><div class="sub">LIVE PRICE BOOK</div><div class="meta"><span>COMPANY LIST DATE: ${escapeHtml(selectedListDate())}</span><span>LAST UPDATED: ${escapeHtml(lastUpdated.toLocaleDateString('en-GB'))}</span><span>${rows.length.toLocaleString('en-IN')} PRODUCTS</span></div></div>
        ${brandLogo}
      </div>
      <table>${colgroup}<thead><tr><th class="serial">#</th>${head}</tr></thead><tbody>${body}</tbody></table>
      <div class="footer-note">System-generated pricelist. Please confirm Rate / MRP and all details before use.</div>
    </div>
  </body></html>`;
}
function cleanupPrintFrame(){
  document.title=ORIGINAL_DOCUMENT_TITLE;
  if(activePrintFrame){
    activePrintFrame.remove();
    activePrintFrame=null;
  }
  const btn=$('#priceListDownloadBtn');
  if(btn){btn.disabled=!currentCatalogGroup;btn.textContent='Download Pricelist'}
}
function downloadSelectedPriceList(){
  if(!currentCatalogGroup){toast('Please select a group first');return}
  if(!filtered.length){toast('Current filters me koi product nahi hai');return}
  cleanupPrintFrame();
  const btn=$('#priceListDownloadBtn');
  if(btn){btn.disabled=true;btn.textContent='Preparing PDF…'}
  const filename=safePdfName(currentCatalogGroup);
  document.title=filename;
  const frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(frame);
  activePrintFrame=frame;
  const doc=frame.contentDocument;
  doc.open();
  doc.write(buildLightweightPrintHtml());
  doc.close();
  let printStarted=false;
  const doPrint=()=>{
    if(printStarted || !activePrintFrame || activePrintFrame!==frame)return;
    printStarted=true;
    try{
      frame.contentWindow.addEventListener('afterprint',cleanupPrintFrame,{once:true});
      const launch=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        frame.contentWindow.focus();
        frame.contentWindow.print();
      }));
      if(doc.fonts && doc.fonts.ready)doc.fonts.ready.then(launch).catch(launch);
      else launch();
      setTimeout(()=>{if(activePrintFrame===frame)cleanupPrintFrame()},120000);
    }catch(err){
      console.error(err);
      cleanupPrintFrame();
      toast('Print preview open nahi hua. Chrome/Edge me dobara try karein.');
    }
  };
  const images=[...doc.images];
  if(!images.length){requestAnimationFrame(doPrint);return}
  let pending=images.length;
  const ready=()=>{pending--;if(pending<=0)setTimeout(doPrint,40)};
  images.forEach(img=>{
    if(img.complete)ready();
    else{img.addEventListener('load',ready,{once:true});img.addEventListener('error',ready,{once:true})}
  });
  setTimeout(()=>{if(pending>0){pending=0;doPrint()}},900);
}
function cascade(){
 const groups=unique(allData,'GROUP');options($('#groupFilter'),groups,'All groups');
 let r=allData;if($('#groupFilter').value)r=r.filter(x=>clean(getField(x,'GROUP'))===$('#groupFilter').value);
 options($('#subGroupFilter'),[...new Set(r.map(subGroupValue).filter(Boolean))].sort(natural),'All sub groups');
 if($('#subGroupFilter').value)r=r.filter(x=>subGroupValue(x)===$('#subGroupFilter').value);
 options($('#segmentFilter'),uniqueSegments(r),'All segments');if($('#segmentFilter').value)r=r.filter(x=>segmentMatch(x,$('#segmentFilter').value));
 options($('#vehicleFilter'),unique(r,'VEHICLE'),'All vehicles');if($('#vehicleFilter').value)r=r.filter(x=>clean(getField(x,'VEHICLE'))===$('#vehicleFilter').value);
 options($('#modelFilter'),unique(r,'MODEL'),'All models');if($('#modelFilter').value)r=r.filter(x=>clean(getField(x,'MODEL'))===$('#modelFilter').value);
 const catKey=dataColumns().some(c=>keyOf(c)==='CATAGORIES')?'CATAGORIES':'CATEGORIES';options($('#categoryFilter'),unique(r,catKey),'All categories');
}

function compactFieldKey(value){return keyOf(value).replace(/[^A-Z0-9]/g,'')}
function existingColumnByAliases(aliases){
  const wanted=aliases.map(compactFieldKey);
  return dataColumns().find(column=>wanted.includes(compactFieldKey(column)))||'';
}
function resolveViewByField(title){
  const token=compactFieldKey(title);
  if(!token)return '';
  const exact=dataColumns().find(column=>compactFieldKey(column)===token);
  if(exact)return exact;

  const aliasGroups=[
    ['CATAGORIES','CATEGORIES','CATEGORY','CATAGORY','CATAGOIRES','CATAGOREIS','CATAGORIE','CATEGORIE','CATEGORES'],
    ['SUB GROUP','SUB-GROUP','SUBGROUP','SUB GROUP NAME'],
    ['CODE','PART NUMBER','PART NO','PARTNUMBER','PARTNO'],
    ['PRODUCT NAME','DESCRIPTION','PRODUCT','ITEM NAME'],
    ['LIST DATE','LISTDATE'],
    ['VIEW BY','VIEWBY']
  ];
  for(const aliases of aliasGroups){
    if(aliases.map(compactFieldKey).includes(token))return existingColumnByAliases(aliases);
  }
  return '';
}
function mostCommonViewBy(rows){
  const counts=new Map();
  let order=0;
  rows.forEach(row=>{
    const value=clean(getField(row,'VIEW BY','VIEWBY'));
    if(!value)return;
    const key=value.toUpperCase().replace(/\s*([,;|>])\s*/g,'$1');
    if(!counts.has(key))counts.set(key,{value,count:0,order:order++});
    counts.get(key).count++;
  });
  return [...counts.values()].sort((a,b)=>b.count-a.count||a.order-b.order)[0]?.value||'';
}
function parseViewByTitles(raw){
  // Comma is the main separator. Semicolon, pipe and > remain supported for old files.
  // No level limit is applied: every valid Excel heading becomes the next nested title.
  return clean(raw)
    .split(/[,;|>]+/)
    .map(title=>clean(title))
    .filter(Boolean);
}
function viewByFields(rows){
  const fields=[];
  parseViewByTitles(mostCommonViewBy(rows)).forEach(title=>{
    const field=resolveViewByField(title);
    if(field&&!fields.some(existing=>compactFieldKey(existing)===compactFieldKey(field)))fields.push(field);
  });
  if(fields.length)return fields;

  const subGroup=existingColumnByAliases(['SUB GROUP','SUB-GROUP','SUBGROUP','SUB GROUP NAME']);
  if(subGroup&&rows.some(row=>!isEmpty(getField(row,subGroup))))return [subGroup];
  const category=existingColumnByAliases(['CATAGORIES','CATEGORIES','CATEGORY']);
  if(category&&rows.some(row=>!isEmpty(getField(row,category))))return [category];
  return [];
}
function viewByField(rows){return viewByFields(rows)[0]||''}
function viewByColumnKeysForRows(rows){
  const keys=new Set();
  const groupMap=new Map();
  rows.forEach(row=>{
    const group=clean(getField(row,'GROUP'));
    if(!groupMap.has(group))groupMap.set(group,[]);
    groupMap.get(group).push(row);
  });
  groupMap.forEach(groupRows=>viewByFields(groupRows).forEach(field=>keys.add(keyOf(field))));
  return keys;
}
function viewByLabel(field){
  const token=compactFieldKey(field);
  if(['CATAGORIES','CATEGORIES','CATEGORY'].map(compactFieldKey).includes(token))return 'CATEGORIES';
  if(['SUB GROUP','SUB-GROUP','SUBGROUP','SUB GROUP NAME'].map(compactFieldKey).includes(token))return 'SUB GROUP';
  if(['CODE','PART NUMBER','PART NO'].map(compactFieldKey).includes(token))return 'PART NUMBER';
  return keyOf(field);
}
function groupValue(row, field){
  const token=compactFieldKey(field);
  if(['SUBGROUP','SUBGROUPNAME'].includes(token))return subGroupValue(row)||'OTHER';
  if(['CATAGORIES','CATEGORIES','CATEGORY'].includes(token))return clean(getField(row,'CATAGORIES','CATEGORIES','CATEGORY'))||'OTHER';
  return clean(getField(row,field))||'OTHER';
}
function partNumberValue(row){return clean(getField(row,'CODE','PART NUMBER','PART NO'))}
function sortRowsByFields(rows,fields){
  return [...rows].sort((a,b)=>{
    for(const field of fields){
      const compare=natural(groupValue(a,field),groupValue(b,field));
      if(compare)return compare;
    }
    const codeCompare=natural(partNumberValue(a),partNumberValue(b));
    if(codeCompare)return codeCompare;
    return natural(getField(a,'PRODUCT NAME','DESCRIPTION'),getField(b,'PRODUCT NAME','DESCRIPTION'));
  });
}
function sortedRows(rows){
  const groupRows=new Map();
  rows.forEach(row=>{
    const group=clean(getField(row,'GROUP'));
    if(!groupRows.has(group))groupRows.set(group,[]);
    groupRows.get(group).push(row);
  });
  const fieldCache=new Map([...groupRows].map(([group,items])=>[group,viewByFields(items)]));
  return [...rows].sort((a,b)=>{
    const ag=clean(getField(a,'GROUP')),bg=clean(getField(b,'GROUP'));
    const groupCompare=natural(ag,bg);if(groupCompare)return groupCompare;
    const fields=fieldCache.get(ag)||[];
    for(const field of fields){
      const compare=natural(groupValue(a,field),groupValue(b,field));
      if(compare)return compare;
    }
    const codeCompare=natural(partNumberValue(a),partNumberValue(b));
    if(codeCompare)return codeCompare;
    return natural(getField(a,'PRODUCT NAME','DESCRIPTION'),getField(b,'PRODUCT NAME','DESCRIPTION'));
  });
}
function groupedEntries(rows,field,remainingFields=[]){
  const map=new Map();
  sortRowsByFields(rows,[field,...remainingFields]).forEach(row=>{
    const title=groupValue(row,field);
    if(!map.has(title))map.set(title,[]);
    map.get(title).push(row);
  });
  return [...map.entries()].sort((a,b)=>natural(a[0],b[0]));
}
function hierarchyCount(contextRows,fields,path){
  return contextRows.filter(row=>path.every((title,index)=>groupValue(row,fields[index])===title)).length;
}
function groupedRows(rows){
  const fields=viewByFields(rows);
  const field=fields[0]||'';
  return {field,fields,groups:field?groupedEntries(rows,field,fields.slice(1)):[['ALL PRODUCTS',sortRowsByFields(rows,[])]]};
}
function totalMiniCount(title,contextRows){
  const fields=viewByFields(contextRows);
  return fields.length?hierarchyCount(contextRows,fields,[title]):contextRows.length;
}
function formatExcelDate(v){
  if(isEmpty(v))return '—';
  if(v instanceof Date && !isNaN(v))return v.toLocaleDateString('en-GB');
  if(typeof v==='number' && v>20000 && v<80000){
    const d=new Date(Date.UTC(1899,11,30)+v*86400000);
    return d.toLocaleDateString('en-GB');
  }
  const s=clean(v);
  const d=new Date(s);
  if(!isNaN(d) && /[-/]/.test(s))return d.toLocaleDateString('en-GB');
  return s;
}
function listDateForRows(rows){
  const values=rows.map(r=>getField(r,'LIST DATE','LISTDATE')).filter(v=>!isEmpty(v));
  if(!values.length)return '—';
  return formatExcelDate(values[values.length-1]);
}
function selectedListDate(){ return listDateForRows(filtered); }

function applyFilters(resetPage=true){
  cascade();

  const q=$('#searchInput').value.trim().toLowerCase();
  const exactCodeExists=!!q && allData.some(r=>
    clean(getField(r,'CODE','PART NUMBER','PART NO')).toLowerCase()===q
  );

  const groupText=filterSearchTerm('groupFilter');
  const subGroupText=filterSearchTerm('subGroupFilter');
  const segmentText=filterSearchTerm('segmentFilter');
  const vehicleText=filterSearchTerm('vehicleFilter');
  const modelText=filterSearchTerm('modelFilter');
  const categoryText=filterSearchTerm('categoryFilter');

  filtered=allData.filter(r=>{
    if($('#groupFilter').value && clean(getField(r,'GROUP'))!==$('#groupFilter').value)return false;
    if($('#subGroupFilter').value && subGroupValue(r)!==$('#subGroupFilter').value)return false;
    if($('#segmentFilter').value && !segmentMatch(r,$('#segmentFilter').value))return false;
    if($('#vehicleFilter').value && clean(getField(r,'VEHICLE'))!==$('#vehicleFilter').value)return false;
    if($('#modelFilter').value && clean(getField(r,'MODEL'))!==$('#modelFilter').value)return false;

    const cat=clean(getField(r,'CATAGORIES','CATEGORIES','CATEGORY'));
    if($('#categoryFilter').value && cat!==$('#categoryFilter').value)return false;

    // Search boxes above dropdowns use partial/contains matching.
    if(!containsField(r,groupText,'GROUP'))return false;
    if(subGroupText && !subGroupValue(r).toLowerCase().includes(subGroupText))return false;
    if(!containsField(r,segmentText,'SEGMENT'))return false;
    if(!containsField(r,vehicleText,'VEHICLE'))return false;
    if(!containsField(r,modelText,'MODEL'))return false;
    if(categoryText && !cat.toLowerCase().includes(categoryText))return false;

    // CODE / PRODUCT search:
    // If an exact code exists, show only that exact code.
    // Otherwise use contains matching, e.g. 1013 finds KX1013 and AA1013.
    if(q){
      const code=clean(getField(r,'CODE','PART NUMBER','PART NO')).toLowerCase();
      const product=clean(getField(r,'PRODUCT NAME','DESCRIPTION')).toLowerCase();
      if(exactCodeExists){
        if(code!==q)return false;
      }else if(!code.includes(q) && !product.includes(q)){
        return false;
      }
    }
    return true;
  });

  const keys=dataColumns();
  const activeViewByColumns=viewByColumnKeysForRows(filtered);
  visibleColumns=keys.filter(k=>{
    const normalized=keyOf(k);
    if(HIDDEN_COLUMNS.has(normalized))return false;
    if(!ALWAYS.includes(normalized)&&activeViewByColumns.has(normalized))return false;
    return ALWAYS.includes(normalized)||filtered.some(r=>!isEmpty(getField(r,k)));
  });
  // Keep part number first.
  visibleColumns.sort((a,b)=>{
    if(keyOf(a)==='CODE')return -1;
    if(keyOf(b)==='CODE')return 1;
    return keys.indexOf(a)-keys.indexOf(b);
  });

  document.body.classList.toggle('table-compact',visibleColumns.length>12);
  if(resetPage)page=1;
  render();
}

function gridProductRow(row,serial){
  return '<tr><td class="index-col">'+serial+'</td>'+visibleColumns.map(column=>{
    const value=getField(row,column);
    const key=keyOf(column);
    const part=key==='CODE';
    const price=key==='RATE'||key==='MRP';
    const left=part||key==='PRODUCT NAME';
    const cls=[part?'part-code':'',price?'price-value':'',left?'cell-left':'cell-right'].filter(Boolean).join(' ');
    return `<td class="${cls}">${escapeHtml(value)}</td>`;
  }).join('')+`<td class="image-col"><button class="view-image-btn" type="button" data-row-index="${rowSourceIndex(row)}">View Image</button></td></tr>`;
}
function miniGroupedBody(rows, startIndex=0, contextRows=rows){
  const fields=viewByFields(contextRows);
  let html='',serial=startIndex;

  const renderProducts=items=>{
    sortRowsByFields(items,[]).forEach(row=>{
      serial++;
      html+=gridProductRow(row,serial);
    });
  };
  const renderLevel=(items,level,path)=>{
    if(level>=fields.length){renderProducts(items);return}
    const field=fields[level];
    groupedEntries(items,field,fields.slice(level+1)).forEach(([title,groupItems])=>{
      const nextPath=[...path,title];
      const total=hierarchyCount(contextRows,fields,nextPath);
      const visual=hierarchyVisual(level,'grid');
      html+=`<tr class="group-heading ${visual.className}" data-group-level="${visual.depth}" style="--view-indent:${visual.indent}px"><td colspan="${visibleColumns.length+2}"><span class="group-field-label">${escapeHtml(viewByLabel(field))}</span><span class="group-title">${escapeHtml(title)}</span><span class="group-count">${total.toLocaleString('en-IN')} Products</span></td></tr>`;
      renderLevel(groupItems,level+1,nextPath);
    });
  };

  if(fields.length)renderLevel(sortRowsByFields(rows,fields),0,[]);
  else renderProducts(rows);
  return {html,serial};
}
function makeBody(rows, startIndex=0, contextRows=filtered){
  const selectedGroup=$('#groupFilter').value;
  if(selectedGroup){
    return miniGroupedBody(rows,startIndex,contextRows).html;
  }
  const brands=[...new Set(rows.map(r=>clean(getField(r,'GROUP'))).filter(Boolean))].sort(natural);
  let html='',serial=startIndex;
  brands.forEach(brand=>{
    const brandRows=rows.filter(r=>clean(getField(r,'GROUP'))===brand);
    const fullBrandRows=contextRows.filter(r=>clean(getField(r,'GROUP'))===brand);
    const brandDate=listDateForRows(fullBrandRows);
    html += `<tr class="brand-section-heading"><td colspan="${visibleColumns.length+2}">${escapeHtml(brand)}<span class="brand-total">${fullBrandRows.length.toLocaleString('en-IN')} Products</span><span class="brand-date">Company List Date: ${escapeHtml(brandDate)}</span></td></tr>`;
    const block=miniGroupedBody(brandRows,serial,fullBrandRows);
    html+=block.html; serial=block.serial;
  });
  return html;
}

function render(){
  const selected=$('#groupFilter').value||'ALL PRODUCTS';
  renderCatalogCard(selected==='ALL PRODUCTS'?'':selected);
  const logo=logoForBrand(selected);
  [$('#brandLogo'), $('#printBrandLogo')].forEach(img=>{
    if(logo){
      img.src=logo;
      img.style.visibility='visible';
      img.onerror=()=>{img.removeAttribute('src');img.style.visibility='hidden'};
    }else{
      img.removeAttribute('src');
      img.style.visibility='hidden';
    }
  });
  $('#selectedBrand').textContent=selected==='ALL PRODUCTS'?'All Products':selected;
  $('#printTitle').textContent=selected;
  const listDate=selectedListDate();
  $('#screenListDate').textContent=`Company List Date: ${listDate}`;
  $('#printListDate').textContent=`COMPANY LIST DATE: ${listDate}`;
  $('#printUpdatedDate').textContent=`LAST UPDATED: ${lastUpdated.toLocaleDateString('en-GB')}`;
  $('#recordCount').textContent=filtered.length.toLocaleString('en-IN');
  $('#columnCount').textContent=visibleColumns.length;
  $('#lastUpdated').textContent=lastUpdated.toLocaleDateString('en-IN');

  const thead=$('#priceTable thead'), tbody=$('#priceTable tbody');
  thead.innerHTML='<tr><th class="index-col">#</th>'+visibleColumns.map(c=>{
    const key=keyOf(c);
    const cls=(key==='CODE'||key==='PRODUCT NAME')?'head-left':'head-right';
    return `<th class="${cls}">${escapeHtml(c)}</th>`;
  }).join('')+'<th class="image-col">IMAGE</th></tr>';

  if(printingAll){
    tbody.innerHTML=makeBody(sortedRows(filtered),0,filtered);
  }else{
    pageSize=Number($('#pageSize').value);
    const pages=Math.max(1,Math.ceil(filtered.length/pageSize)); page=Math.min(page,pages);
    const start=(page-1)*pageSize;
    const slice=sortedRows(filtered).slice(start,start+pageSize);
    tbody.innerHTML=makeBody(slice,start,filtered);
    $('#pageInfo').textContent=`Page ${page} of ${pages}`;
    $('#prevBtn').disabled=page<=1; $('#nextBtn').disabled=page>=pages;
  }

  $('#emptyState').hidden=filtered.length!==0;
  $('#priceTable').style.display=filtered.length?'table':'none';
}

function reset(){
  ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>$('#'+id).value='');
  $('#searchInput').value=''; $('#universalSearchInput').value=''; document.querySelectorAll('.filter-search').forEach(x=>x.value='');
  cascade();
  const firstGroup=unique(allData,'GROUP')[0];
  if(firstGroup)$('#groupFilter').value=firstGroup;
  applyFilters();
}
function normalizeRows(rows){
  if(!rows.length)return [];
  const headers=normalizedHeaderList(rows[0]);
  return rows.slice(1).filter(row=>row.some(value=>!isEmpty(value))).map(row=>{
    const record={};headers.forEach((header,index)=>record[header]=row[index]??'');return record;
  });
}
async function saveDB(data){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('RajPriceBook',1);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('data'))db.createObjectStore('data');
    };
    req.onerror=()=>reject(req.error||new Error('Browser storage unavailable'));
    req.onsuccess=()=>{
      const db=req.result,tx=db.transaction('data','readwrite'),store=tx.objectStore('data');
      store.put(data,'records');
      store.put(new Date().toISOString(),'updated');
      store.put(DATA_CACHE_SCHEMA,'schema');
      // Keep the old key for backward compatibility with earlier ZIP versions.
      store.put(DATA_CACHE_SCHEMA,'version');
      tx.oncomplete=()=>{db.close();resolve(true)};
      tx.onerror=()=>{const error=tx.error;db.close();reject(error)};
      tx.onabort=()=>{const error=tx.error;db.close();reject(error)};
    };
  });
}
async function loadDB(){
  return new Promise(resolve=>{
    const req=indexedDB.open('RajPriceBook',1);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('data'))db.createObjectStore('data');
    };
    req.onerror=()=>resolve(null);
    req.onsuccess=()=>{
      const db=req.result,tx=db.transaction('data'),store=tx.objectStore('data');
      const records=store.get('records'),updated=store.get('updated');
      tx.oncomplete=()=>{
        const data=records.result;
        db.close();
        // App releases no longer invalidate synchronized Excel. If valid rows exist,
        // they are restored automatically on every future start.
        resolve(Array.isArray(data)&&data.length?{data,updated:updated.result}:null);
      };
      tx.onerror=()=>{db.close();resolve(null)};
      tx.onabort=()=>{db.close();resolve(null)};
    };
  });
}

$('#catalogDownloadBtn').onclick=openSelectedCatalog;
$('#priceListDownloadBtn').onclick=downloadSelectedPriceList;
document.querySelectorAll('.filter-search').forEach(inp=>{
  inp.addEventListener('input',()=>{
    // Typed text is a contains-filter; it does not force-select only the first dropdown option.
    const sel=$('#'+inp.dataset.target);
    sel.value='';
    applyFilters();
  });
});

$('#priceTable tbody').addEventListener('click',e=>{
  const btn=e.target.closest('.view-image-btn');
  if(!btn)return;
  const row=allData[Number(btn.dataset.rowIndex)];
  if(row)openProductImage(row);
});
$('#imageCloseBtn').onclick=closeImageModal;
$('#imageModal').onclick=e=>{if(e.target===$('#imageModal'))closeImageModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeImageModal()});
$('#zoomInBtn').onclick=()=>{imageZoom=Math.min(3,imageZoom+.2);$('#productImagePreview').style.transform=`scale(${imageZoom})`};
$('#zoomOutBtn').onclick=()=>{imageZoom=Math.max(.5,imageZoom-.2);$('#productImagePreview').style.transform=`scale(${imageZoom})`};
$('#universalSearchInput').addEventListener('input',e=>runUniversalSearch(e.target.value));
$('#voiceSearchBtn').onclick=()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){toast('Voice search is not supported in this browser. Use Chrome or Edge.');return}
  const recognition=new SpeechRecognition();
  recognition.lang='en-IN'; recognition.interimResults=false; recognition.maxAlternatives=1;
  $('#voiceSearchBtn').classList.add('listening');$('#voiceStatus').textContent='Listening… speak group, part number, vehicle, model or product';
  recognition.onresult=e=>{
    const spoken=e.results[0][0].transcript.trim();
    $('#voiceStatus').textContent=`Heard: ${spoken}`;
    runUniversalSearch(spoken);
  };
  recognition.onerror=e=>{$('#voiceStatus').textContent=`Voice error: ${e.error}`};
  recognition.onend=()=>$('#voiceSearchBtn').classList.remove('listening');
  recognition.start();
};

let xlsxLoaderPromise=null;
function ensureExcelReader(){
  if(window.XLSX)return Promise.resolve(true);
  if(xlsxLoaderPromise)return xlsxLoaderPromise;
  xlsxLoaderPromise=new Promise(resolve=>{
    const script=document.createElement('script');
    let finished=false;
    const done=ok=>{if(finished)return;finished=true;resolve(ok)};
    script.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async=true;
    script.onload=()=>done(!!window.XLSX);
    script.onerror=()=>done(false);
    document.head.appendChild(script);
    setTimeout(()=>done(!!window.XLSX),12000);
  });
  return xlsxLoaderPromise;
}
$('#syncBtn').onclick=async()=>{
  $('#syncStatus').innerHTML='<span class="dot"></span> Loading Excel reader…';
  const ready=await ensureExcelReader();
  if(!ready){
    xlsxLoaderPromise=null;
    $('#syncStatus').innerHTML='<span class="dot"></span> Price data ready';
    toast('Excel sync reader needs internet. Reconnect and try Sync Excel again.');
    return;
  }
  $('#syncStatus').innerHTML='<span class="dot"></span> Excel reader ready';
  $('#excelFile').click();
};
$('#excelFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  $('#syncStatus').innerHTML='<span class="dot"></span> Synchronizing…';
  try{
    const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array',cellDates:true});
    const sheet=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
    const records=normalizeRows(rows);
    if(!records.length||!('GROUP' in records[0]))throw new Error('GROUP column missing');
    allData=records;rebuildRowIndexMap();catalogUrlCache.clear();lastUpdated=new Date();
    let saved=false;
    try{
      await saveDB(allData);
      saved=true;
      if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
    }catch(storageError){
      console.error('Pricebook cache save failed',storageError);
    }
    buildCatalogMenu();
    reset();
    toast(saved
      ? `${records.length.toLocaleString('en-IN')} products synchronized & saved for next start`
      : `${records.length.toLocaleString('en-IN')} products synchronized; browser storage is blocked`);
    $('#syncStatus').innerHTML=saved
      ? '<span class="dot"></span> Synced & saved'
      : '<span class="dot"></span> Synced (not saved)';
  }catch(err){
    console.error(err);toast('Could not read Excel. Keep the same headings.');
    $('#syncStatus').innerHTML='<span class="dot"></span> Error';
  }
  e.target.value='';
};

// Pricelist download uses a dedicated lightweight print iframe above.
$('#resetBtn').onclick=reset;
['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>$('#'+id).onchange=()=>applyFilters());
$('#searchInput').oninput=()=>applyFilters();
$('#pageSize').onchange=()=>{page=1;render()};
$('#prevBtn').onclick=()=>{page--;render()};
$('#nextBtn').onclick=()=>{page++;render()};

(function init(){
  rebuildRowIndexMap();
  // Fill the first dropdown, select the first group and render only once.
  const groups=unique(allData,'GROUP');
  options($('#groupFilter'),groups,'All groups');
  if(groups[0])$('#groupFilter').value=groups[0];
  buildCatalogMenu();
  applyFilters();
  $('#syncStatus').innerHTML='<span class="dot"></span> Price data ready';

  // Restore the last synchronized Excel immediately. The bundled data remains visible
  // during the short IndexedDB read, then the saved rows replace it automatically.
  loadDB().then(cached=>{
    if(cached && cached.data && cached.data.length){
      allData=cached.data;rebuildRowIndexMap();catalogUrlCache.clear();
      const cachedDate=new Date(cached.updated);
      if(!isNaN(cachedDate))lastUpdated=cachedDate;
      $('#syncStatus').innerHTML='<span class="dot"></span> Saved Excel restored';
      buildCatalogMenu();applyFilters();
    }
  });
})();
