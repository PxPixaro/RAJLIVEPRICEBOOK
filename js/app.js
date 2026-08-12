
const $ = s => document.querySelector(s);
const BRAND_LOGOS = {};
const BRAND_LOGO_EXTENSIONS=['webp','png','jpg','jpeg'];
const BRAND_LOGO_ALIASES={
  APPOLO:'APPOLLO', APRISTIC:'APARSTIC', MONROE:'MOEROE', PIONEER:'PIONNER',
  PLATINUM:'PLATIUAM', NEOLITE:'NEOLIGHT'
};
const brandLogoCandidateCache=new Map();
function logoKey(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/LIMITED|PVT|LTD|INDIA/g,'')}
function logoDistance(a,b){
  a=logoKey(a);b=logoKey(b);
  if(!a||!b)return Math.max(a.length,b.length);
  let previous=Array.from({length:b.length+1},(_,index)=>index);
  for(let i=1;i<=a.length;i++){
    const current=[i];
    for(let j=1;j<=b.length;j++)current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
    previous=current;
  }
  return previous[b.length];
}
function encodedLogoPath(filename){return 'assets/brand-logos/'+encodeURIComponent(filename).replace(/%2F/gi,'/')}
function logoCandidatesForBrand(brand){
  const raw=clean(brand);
  const wanted=logoKey(raw);
  if(!wanted || wanted==='ALLPRODUCTS')return [];
  const cached=brandLogoCandidateCache.get(wanted);
  if(cached)return cached.slice();

  const files=window.BRAND_LOGO_FILES||[];
  const byKey=new Map();
  files.forEach(file=>{
    const key=logoKey(file.replace(/\.[^.]+$/,''));
    if(key&&!byKey.has(key))byKey.set(key,file);
  });
  const output=[];
  const add=file=>{if(file&&!output.includes(file))output.push(file)};

  // Exact filename match first. Known spelling variants are explicit and safe.
  add(byKey.get(wanted));
  const alias=BRAND_LOGO_ALIASES[wanted];
  if(alias)add(byKey.get(alias));

  // Conservative fuzzy match only for longer names. Short names such as KD/RKD
  // must never cross-match. Require a unique close result.
  if(!output.length && wanted.length>=5){
    const ranked=[];
    byKey.forEach((file,key)=>{
      if(key.length<5)return;
      const distance=logoDistance(wanted,key);
      const limit=wanted.length>=8?2:1;
      if(distance<=limit)ranked.push({file,distance,key});
    });
    ranked.sort((a,b)=>a.distance-b.distance||a.key.length-b.key.length||natural(a.key,b.key));
    if(ranked.length && (ranked.length===1 || ranked[0].distance<ranked[1].distance))add(ranked[0].file);
  }

  // Future logos do not need a JS manifest update when the file is named after
  // the Excel GROUP. The browser simply tries common image extensions.
  const directNames=[raw,raw.toUpperCase(),raw.toLowerCase()].filter((v,i,a)=>v&&a.indexOf(v)===i);
  directNames.forEach(name=>BRAND_LOGO_EXTENSIONS.forEach(ext=>add(name+'.'+ext)));

  const paths=output.map(encodedLogoPath);
  brandLogoCandidateCache.set(wanted,paths);
  return paths.slice();
}
function logoForBrand(brand){return logoCandidatesForBrand(brand)[0]||''}
function setBrandLogoImage(img,brand){
  if(!img)return;
  const key=logoKey(brand);
  if(img.dataset.logoBrand===key && img.dataset.logoResolved==='1')return;
  const candidates=logoCandidatesForBrand(brand);
  img.dataset.logoBrand=key;
  img.dataset.logoResolved='0';
  let position=0;
  const hide=()=>{img.removeAttribute('src');img.style.visibility='hidden';img.dataset.logoResolved='1'};
  const next=()=>{
    if(position>=candidates.length){hide();return}
    img.src=candidates[position++];
    img.style.visibility='visible';
  };
  img.onload=()=>{img.style.visibility='visible';img.dataset.logoResolved='1'};
  img.onerror=next;
  if(candidates.length)next();else hide();
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
let sortedFilteredSource = null;
let sortedFilteredCache = [];
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
    // Excel-synchronized rows are normalized to uppercase keys. Fast direct
    // lookup avoids Object.keys(...).find(...) millions of times while filtering.
    if(row && Object.prototype.hasOwnProperty.call(row,wanted))return row[wanted];
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

// V35 FILTER MASTER ---------------------------------------------------------
// assets/data/filter-master.xlsx is an optional canonical filter list.
// Each column is independent: GROUP / BRAND, SUB GROUP, SEGMENT, VEHICLE,
// MODEL and CATEGORY. If a column is blank the app falls back to values found
// directly in price-book.xlsx. A master cell may contain one value (407) or
// several OR aliases (407,709,1109).
const FILTER_MASTER_STORAGE='RAJ_FILTER_MASTER_V35';
const FILTER_MASTER_IDS=['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'];
let filterMasterLists=Object.fromEntries(FILTER_MASTER_IDS.map(id=>[id,[]]));
function masterHeaderKey(value){return keyOf(value).replace(/[^A-Z0-9]/g,'')}
function masterFilterIdForHeader(header){
  const key=masterHeaderKey(header);
  if(['GROUPBRAND','GROUP','BRAND','GROUPNAME','BRANDNAME'].includes(key))return 'groupFilter';
  if(['SUBGROUP','SUBGROUPNAME'].includes(key))return 'subGroupFilter';
  if(['SEGMENT','SEGMENTS'].includes(key))return 'segmentFilter';
  if(['VEHICLE','VEHICLES'].includes(key))return 'vehicleFilter';
  if(['MODEL','MODELS','SERIES','MODELSERIES'].includes(key))return 'modelFilter';
  if(['CATEGORY','CATEGORIES','CATAGORIES','CATAGORY'].includes(key))return 'categoryFilter';
  return '';
}
function normalizeMasterLists(input){
  const out=Object.fromEntries(FILTER_MASTER_IDS.map(id=>[id,[]]));
  FILTER_MASTER_IDS.forEach(id=>{
    const seen=new Set();
    (input&&Array.isArray(input[id])?input[id]:[]).forEach(value=>{
      const item=clean(value);
      const key=looseFieldText(item);
      if(!item||!key||seen.has(key))return;
      seen.add(key);out[id].push(item);
    });
    out[id].sort(natural);
  });
  return out;
}
function masterValuesForFilter(id){return (filterMasterLists[id]||[]).slice()}
function filterMasterHasValues(id){return !!(filterMasterLists[id]&&filterMasterLists[id].length)}
function filterMasterItemCount(){return FILTER_MASTER_IDS.reduce((sum,id)=>sum+(filterMasterLists[id]?.length||0),0)}
function setFilterMasterLists(input,{persist=false,rerender=true}={}){
  filterMasterLists=normalizeMasterLists(input);
  multiValueMatcherCache.clear();
  if(persist){
    try{localStorage.setItem(FILTER_MASTER_STORAGE,JSON.stringify(filterMasterLists))}catch(error){}
  }
  if(rerender&&typeof applyFilters==='function')applyFilters();
}
function restoreSavedFilterMaster(){
  try{
    const saved=JSON.parse(localStorage.getItem(FILTER_MASTER_STORAGE)||'null');
    if(saved)setFilterMasterLists(saved,{persist:false,rerender:false});
  }catch(error){}
}
function parseFilterMasterRows(rows){
  const result=Object.fromEntries(FILTER_MASTER_IDS.map(id=>[id,[]]));
  if(!Array.isArray(rows)||!rows.length)return result;
  const headers=(rows[0]||[]).map(masterFilterIdForHeader);
  headers.forEach((id,index)=>{
    if(!id)return;
    for(let rowIndex=1;rowIndex<rows.length;rowIndex++){
      const value=clean((rows[rowIndex]||[])[index]);
      if(value)result[id].push(value);
    }
  });
  return normalizeMasterLists(result);
}
async function readFilterMasterWorkbookBuffer(buffer){
  const ready=await ensureExcelReader();
  if(!ready)throw new Error('Excel reader unavailable');
  const wb=XLSX.read(buffer,{type:'array',cellDates:false});
  const sheetName=wb.SheetNames.find(name=>masterHeaderKey(name)==='FILTERMASTER')||wb.SheetNames[0];
  const sheet=wb.Sheets[sheetName];
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
  return parseFilterMasterRows(rows);
}
async function refreshHostedFilterMaster(){
  if(!/^https?:$/.test(location.protocol))return false;
  try{
    const response=await fetch('assets/data/filter-master.xlsx?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('filter-master.xlsx not found');
    const lists=await readFilterMasterWorkbookBuffer(await response.arrayBuffer());
    setFilterMasterLists(lists,{persist:false,rerender:true});
    return true;
  }catch(error){
    console.warn('Filter Master refresh skipped',error);
    return false;
  }
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

function productThumbnailCandidates(row){
  const seen=new Set();
  return productImageCandidates(row).map(path=>{
    const thumb=path
      .replace('assets/Products Images/','assets/Products Thumbs/')
      .replace(/\.(webp|png|jpe?g)$/i,'.webp');
    if(seen.has(thumb))return '';
    seen.add(thumb);
    return thumb;
  }).filter(Boolean);
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

// V35: canonical master filtering + OR aliases + conservative typo tolerance.
// Numeric codes use whole-number boundaries: 407 matches "407 TURBO" / "T-407"
// but never 1407 or 4070. Text master values use contains matching first, then
// small edit-distance tolerance for common spelling mistakes.
function looseFieldText(value){
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function addLooseTerm(list,seen,value){
  const term=clean(value);
  const key=looseFieldText(term);
  if(!key || seen.has(key))return;
  if(key.length===1)return;
  seen.add(key);list.push(term);
}
function filterSelectionTerms(value,fieldName=''){
  const raw=clean(value);
  if(!raw)return [];
  const terms=[];const seen=new Set();
  // Strong separators mean OR. The original full cell is intentionally NOT
  // required, so "407,709,1109" behaves exactly as 407 OR 709 OR 1109.
  const pieces=raw.split(/[,;|\/\\&+>:~=_\n\r]+/).map(clean).filter(Boolean);
  (pieces.length?pieces:[raw]).forEach(part=>{
    addLooseTerm(terms,seen,part);
    const dashParts=part.split(/\s*[-–—]\s*/).map(clean).filter(Boolean);
    if(dashParts.length>1 && dashParts.every(piece=>looseFieldText(piece).length>=2))dashParts.forEach(piece=>addLooseTerm(terms,seen,piece));
  });
  // Also expose every multi-digit number found in any filter field. This makes
  // mixed labels such as "TATA 407 / 709 / 1109 O/M" searchable by each series.
  (raw.match(/\d{2,}/g)||[]).forEach(code=>addLooseTerm(terms,seen,code));
  return terms;
}
function fuzzyLimit(length){
  if(length<5)return 0;
  if(length<=7)return 1;
  if(length<=14)return 2;
  return 2;
}
function editDistanceWithin(a,b,limit){
  if(a===b)return true;
  if(!limit||Math.abs(a.length-b.length)>limit)return false;
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const current=[i];let rowMin=current[0];
    for(let j=1;j<=b.length;j++){
      current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
      if(current[j]<rowMin)rowMin=current[j];
    }
    if(rowMin>limit)return false;
    previous=current;
  }
  return previous[b.length]<=limit;
}
function fuzzyTextMatch(normalizedRaw,wanted){
  if(!normalizedRaw||!wanted)return false;
  if(normalizedRaw.includes(wanted))return true;
  const selectedWords=wanted.split(' ').filter(Boolean);
  const rawWords=normalizedRaw.split(' ').filter(Boolean);
  // Each significant master word may occur anywhere in the raw Excel field.
  // Example ALLWYN NISSAN also matches ALWYN NISSAN, DUSTER.
  if(selectedWords.length){
    const allWords=selectedWords.every(selected=>{
      if(/^\d+$/.test(selected)){
        const escaped=selected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        return new RegExp(`(^|\\D)${escaped}(?=\\D|$)`).test(normalizedRaw);
      }
      const limit=fuzzyLimit(selected.length);
      return rawWords.some(rawWord=>rawWord===selected || (limit>0&&editDistanceWithin(selected,rawWord,limit)));
    });
    if(allWords)return true;
  }
  // Phrase-level typo fallback, only when lengths are close enough.
  const compactWanted=wanted.replace(/\s+/g,'');
  const compactRaw=normalizedRaw.replace(/\s+/g,'');
  const limit=fuzzyLimit(compactWanted.length);
  return limit>0 && Math.abs(compactRaw.length-compactWanted.length)<=limit && editDistanceWithin(compactWanted,compactRaw,limit);
}
const multiValueMatcherCache=new Map();
function compiledFilterMatchers(selectedValue,fieldName=''){
  const cacheKey=keyOf(fieldName)+'\u0000'+clean(selectedValue).toUpperCase();
  if(multiValueMatcherCache.has(cacheKey))return multiValueMatcherCache.get(cacheKey);
  const matchers=filterSelectionTerms(selectedValue,fieldName).map(term=>{
    const wanted=looseFieldText(term);
    if(/^\d+$/.test(wanted)){
      const escaped=wanted.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return {numeric:true,regex:new RegExp(`(^|\\D)${escaped}(?=\\D|$)`),text:wanted};
    }
    return {numeric:false,text:wanted};
  });
  if(multiValueMatcherCache.size>400)multiValueMatcherCache.clear();
  multiValueMatcherCache.set(cacheKey,matchers);
  return matchers;
}
function multiValueMatch(rawValue,selectedValue,fieldName=''){
  if(!selectedValue)return true;
  const raw=clean(rawValue);
  if(!raw)return false;
  const matchers=compiledFilterMatchers(selectedValue,fieldName);
  if(!matchers.length)return true;
  const rawUpper=raw.toUpperCase();
  const normalizedRaw=looseFieldText(raw);
  return matchers.some(matcher=>matcher.numeric?matcher.regex.test(rawUpper):fuzzyTextMatch(normalizedRaw,matcher.text));
}
function multiFieldMatch(row,selectedValue,...fieldNames){
  const fieldName=fieldNames.some(name=>keyOf(name)==='MODEL')?'MODEL':(fieldNames[0]||'');
  return multiValueMatch(getField(row,...fieldNames),selectedValue,fieldName);
}

// Matcher cache is initialized now, so restoring a saved local master is safe.
restoreSavedFilterMaster();

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
  const raw=getField(row,'SEGMENT');
  const wanted=normalizeSegmentToken(selected);
  if(wanted==='UNIVERSAL')return multiValueMatch(raw,selected,'SEGMENT');
  // Preserve the old UNIVERSAL behaviour while allowing combined segment
  // selections such as "LCV/HCV" or "2 WHEELERS, 3 WHEELERS" to work as OR.
  return multiValueMatch(raw,selected,'SEGMENT') || multiValueMatch(raw,'UNIVERSAL','SEGMENT');
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
  const logoCandidates=logoCandidatesForBrand(group);
  const fontSize=cols.length>15?'6.8px':cols.length>12?'7.3px':cols.length>9?'8px':'8.8px';
  const cellPad=cols.length>15?'2.8px 2.2px':cols.length>12?'3.1px 2.4px':'3.5px 2.8px';
  const widths=printColumnWeights(cols);
  const colgroup=`<colgroup><col style="width:${widths.serial}%">${cols.map((c,index)=>`<col style="width:${widths.columns[index]}%">`).join('')}</colgroup>`;
  const head=cols.map(c=>`<th class="${printCellClass(c)}">${escapeHtml(c)}</th>`).join('');
  const body=buildPrintBodyRows(rows,cols);
  const base=escapeHtml(document.baseURI);
  const safeTitle=escapeHtml(safePdfName(group));
  const brandLogo=`<img id="pdfBrandLogo" class="brand-logo" alt="" style="visibility:hidden">`;
  const brandLogoScript=`<script>(function(){var c=${JSON.stringify(logoCandidates)};var i=0;var img=document.getElementById('pdfBrandLogo');function next(){if(i>=c.length){img.removeAttribute('src');img.style.visibility='hidden';return}img.src=c[i++];img.style.visibility='visible'}img.onload=function(){img.style.visibility='visible'};img.onerror=next;next()})()<\/script>`;
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><title>${safeTitle}</title><style>
    @page{size:A4 landscape;margin:7mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-size:${fontSize}}
    .watermark-layer{position:fixed;inset:0;z-index:20;overflow:hidden;pointer-events:none}
    .watermark{position:absolute;left:50%;top:57%;width:78vw;height:68vh;max-width:none;max-height:none;object-fit:contain;opacity:.072;pointer-events:none;transform:translate(-50%,-50%) rotate(-10deg)}
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
    .pdf-level-1 td{background:#dceeff!important;color:#0e337e;font-size:9.4px;padding:4.6px 5px}
    .pdf-level-2 td{background:#fff3bd!important;color:#5a3b00;font-size:8.7px;padding:4px 5px 4px 12px}
    .pdf-level-3 td{background:#edf3fb!important;color:#27364a;font-size:8.2px;padding:3.7px 5px 3.7px 20px}
    .pdf-level-4 td{background:#f7f8fa!important;color:#27364a;font-size:7.9px;padding:3.5px 5px 3.5px 28px}
    .pdf-level-deep td{background:#fafbfc!important;color:#27364a;font-size:7.6px;border-color:#d3d9e1!important}
    .pdf-group-heading[data-group-level] td{padding-left:var(--view-indent,5px)!important}
    .pdf-group-label{display:inline-block;margin-right:6px;padding:1px 4px;border:1px solid currentColor;border-radius:3px;font-size:.82em;letter-spacing:.05em}
    .pdf-group-title{font-weight:900}
    .pdf-group-count{float:right;font-size:.85em;font-weight:800}
    .pdf-brand-heading td{background:#0e337e!important;color:#fff!important;font-size:10px;font-weight:900;padding:5.5px 6px;text-align:left!important}
    .pdf-brand-meta{float:right;font-size:7.6px;font-weight:700}
    .footer-note{text-align:center;margin-top:4px;font-size:7.2px;color:#4a5568}
    @media screen{body{padding:10px}}
  </style></head><body>
    <div class="watermark-layer" aria-hidden="true">
      <img class="watermark" src="assets/company-logo/rajgroup-watermark-93kb.png" alt="">
    </div>
    <div class="page-content">
      <div class="print-head">
        <img class="company-logo" src="assets/company-logo/raj-group-logo-optimized.webp" alt="Raj Group">
        <div class="title"><div class="kicker">RAJ AGENCIES</div><h1>${escapeHtml(group)}</h1><div class="sub">LIVE PRICE BOOK</div><div class="meta"><span>COMPANY LIST DATE: ${escapeHtml(selectedListDate())}</span><span>LAST UPDATED: ${escapeHtml(lastUpdated.toLocaleDateString('en-GB'))}</span><span>${rows.length.toLocaleString('en-IN')} PRODUCTS</span></div></div>
        ${brandLogo}
      </div>
      <table>${colgroup}<thead><tr><th class="serial">#</th>${head}</tr></thead><tbody>${body}</tbody></table>
      <div class="footer-note">System-generated pricelist. Please confirm Rate / MRP and all details before use.</div>
    </div>
    ${brandLogoScript}
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
 options($('#vehicleFilter'),unique(r,'VEHICLE'),'All vehicles');if($('#vehicleFilter').value)r=r.filter(x=>multiFieldMatch(x,$('#vehicleFilter').value,'VEHICLE'));
 options($('#modelFilter'),unique(r,'MODEL'),'All models');if($('#modelFilter').value)r=r.filter(x=>multiFieldMatch(x,$('#modelFilter').value,'MODEL'));
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
    .split(/[,;|>\n]+/)
    .map(title=>clean(title).replace(/^[\s\"'([{]+|[\s\"')\]}]+$/g,''))
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
function currentSortedFiltered(){
  if(sortedFilteredSource!==filtered){
    sortedFilteredSource=filtered;
    sortedFilteredCache=sortedRows(filtered);
  }
  return sortedFilteredCache;
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
    if($('#vehicleFilter').value && !multiFieldMatch(r,$('#vehicleFilter').value,'VEHICLE'))return false;
    if($('#modelFilter').value && !multiFieldMatch(r,$('#modelFilter').value,'MODEL'))return false;

    const cat=clean(getField(r,'CATAGORIES','CATEGORIES','CATEGORY'));
    if($('#categoryFilter').value && cat!==$('#categoryFilter').value)return false;

    // Search boxes above dropdowns use partial/contains matching.
    if(!containsField(r,groupText,'GROUP'))return false;
    if(subGroupText && !subGroupValue(r).toLowerCase().includes(subGroupText))return false;
    if(segmentText && !multiFieldMatch(r,segmentText,'SEGMENT'))return false;
    if(vehicleText && !multiFieldMatch(r,vehicleText,'VEHICLE'))return false;
    if(modelText && !multiFieldMatch(r,modelText,'MODEL'))return false;
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
  [$('#brandLogo'), $('#printBrandLogo')].forEach(img=>setBrandLogoImage(img,selected));
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
    tbody.innerHTML=makeBody(currentSortedFiltered(),0,filtered);
  }else{
    pageSize=Number($('#pageSize').value);
    const pages=Math.max(1,Math.ceil(filtered.length/pageSize)); page=Math.min(page,pages);
    const start=(page-1)*pageSize;
    const slice=currentSortedFiltered().slice(start,start+pageSize);
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

let filterInputTimer=0;
function scheduleFilterApply(action,delay=120){
  clearTimeout(filterInputTimer);
  filterInputTimer=setTimeout(()=>{
    filterInputTimer=0;
    (action||applyFilters)();
  },delay);
}
function flushPendingFilterApply(){
  if(filterInputTimer){
    clearTimeout(filterInputTimer);
    filterInputTimer=0;
  }
}

document.querySelectorAll('.filter-search').forEach(inp=>{
  inp.addEventListener('input',()=>{
    // Typed text is a contains-filter; it does not force-select only the first dropdown option.
    const sel=$('#'+inp.dataset.target);
    sel.value='';
    scheduleFilterApply();
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
$('#universalSearchInput').addEventListener('input',e=>{const value=e.target.value;scheduleFilterApply(()=>runUniversalSearch(value));});
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
    allData=records;rebuildRowIndexMap();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
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
    console.error(err);toast('Could not read Excel. GROUP heading is required; other rows/columns may change.');
    $('#syncStatus').innerHTML='<span class="dot"></span> Error';
  }
  e.target.value='';
};

// Optional local Filter Master sync. Hosted GitHub mode auto-loads
// assets/data/filter-master.xlsx; file:// mode can use this button after editing it.
const filterMasterSyncBtn=$('#syncFilterMasterBtn');
const filterMasterFile=$('#filterMasterFile');
if(filterMasterSyncBtn&&filterMasterFile){
  filterMasterSyncBtn.onclick=async()=>{
    const ready=await ensureExcelReader();
    if(!ready){toast('Filter Master reader needs internet once. Reconnect and try again.');return}
    filterMasterFile.click();
  };
  filterMasterFile.onchange=async event=>{
    const file=event.target.files&&event.target.files[0];if(!file)return;
    filterMasterSyncBtn.disabled=true;filterMasterSyncBtn.textContent='Loading Master…';
    try{
      const lists=await readFilterMasterWorkbookBuffer(await file.arrayBuffer());
      setFilterMasterLists(lists,{persist:true,rerender:true});
      toast(`${filterMasterItemCount().toLocaleString('en-IN')} master filter values loaded`);
    }catch(error){console.error(error);toast('Filter Master read nahi hua. Template headings same rakhein.');}
    finally{filterMasterSyncBtn.disabled=false;filterMasterSyncBtn.textContent='↻ Sync Filter Master';filterMasterFile.value='';}
  };
}

// Pricelist download uses a dedicated lightweight print iframe above.
$('#resetBtn').onclick=reset;
['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>$('#'+id).onchange=()=>{flushPendingFilterApply();applyFilters()});
$('#searchInput').oninput=()=>scheduleFilterApply();
$('#pageSize').onchange=()=>{page=1;render()};
$('#prevBtn').onclick=()=>{page--;render()};
$('#nextBtn').onclick=()=>{page++;render()};

async function readPriceWorkbookBuffer(buffer){
  const ready=await ensureExcelReader();
  if(!ready)throw new Error('Excel reader unavailable');
  const wb=XLSX.read(buffer,{type:'array',cellDates:true});
  const sheet=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
  const records=normalizeRows(rows);
  if(!records.length||!Object.prototype.hasOwnProperty.call(records[0],'GROUP'))throw new Error('GROUP column missing');
  return records;
}
async function refreshHostedPriceWorkbook(){
  if(!/^https?:$/.test(location.protocol))return false;
  try{
    $('#syncStatus').innerHTML='<span class="dot"></span> Checking GitHub Excel…';
    const response=await fetch('assets/data/price-book.xlsx',{cache:'no-cache'});
    if(!response.ok)throw new Error('Hosted price-book.xlsx not found');
    const records=await readPriceWorkbookBuffer(await response.arrayBuffer());
    const previousGroup=clean($('#groupFilter').value);
    allData=records;rebuildRowIndexMap();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
    buildCatalogMenu();
    const masterGroups=masterValuesForFilter('groupFilter');
    const groups=masterGroups.length?masterGroups:unique(allData,'GROUP');
    options($('#groupFilter'),groups,'All groups');
    $('#groupFilter').value=groups.includes(previousGroup)?previousGroup:(groups[0]||'');
    applyFilters();
    $('#syncStatus').innerHTML='<span class="dot"></span> GitHub Excel loaded';
    return true;
  }catch(error){
    console.warn('Hosted Excel refresh skipped',error);
    $('#syncStatus').innerHTML='<span class="dot"></span> Price data ready';
    return false;
  }
}

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
  const hosted=/^https?:$/.test(location.protocol);
  const restoreLocal=hosted?Promise.resolve(null):loadDB();
  restoreLocal.then(cached=>{
    if(cached && cached.data && cached.data.length){
      allData=cached.data;rebuildRowIndexMap();catalogUrlCache.clear();brandLogoCandidateCache.clear();
      const cachedDate=new Date(cached.updated);
      if(!isNaN(cachedDate))lastUpdated=cachedDate;
      $('#syncStatus').innerHTML='<span class="dot"></span> Saved Excel restored';
      buildCatalogMenu();applyFilters();
    }
  }).finally(()=>{
    // On GitHub/HTTP hosting, assets/data/price-book.xlsx is authoritative.
    // Replacing that file is enough; no js/data.js rebuild and no fixed row/column count.
    if(!hosted)return;
    const run=()=>{refreshHostedPriceWorkbook();refreshHostedFilterMaster();};
    if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:1200});
    else setTimeout(run,350);
  });
})();
