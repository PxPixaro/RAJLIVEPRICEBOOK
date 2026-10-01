

window.RAJ_BOOT_STATE=window.RAJ_BOOT_STATE||{quick:false,hosted:false,app:false,v27:false,ready:false,openedAt:Date.now()};
window.RAJ_BOOT_MARK=window.RAJ_BOOT_MARK||function(key,value=true){
  const s=window.RAJ_BOOT_STATE||(window.RAJ_BOOT_STATE={quick:false,hosted:false,app:false,v27:false,ready:false,openedAt:Date.now()});
  s[key]=!!value;
  // V114: dashboard opens only after quick Aayub metadata and the hosted workbook
  // check are both complete. This prevents a stale/blank second render after opening.
  if(s.quick&&s.hosted&&window.RAJ_FILTER_MASTER_READY!==false&&!s.ready){
    s.ready=true;
    window.dispatchEvent(new CustomEvent('raj-boot-ready',{detail:{...s}}));
  }
};
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

function pdfLogoKey(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/LIMITED|PVT|LTD|INDIA/g,'')}
function pdfEmbeddedLogoB64(brand){
  const wanted=pdfLogoKey(brand);
  const map=window.PDF_BRAND_LOGOS||{};
  if(map[wanted])return map[wanted];
  const alias=BRAND_LOGO_ALIASES[wanted];
  if(alias&&map[pdfLogoKey(alias)])return map[pdfLogoKey(alias)];
  // Conservative unique fuzzy fallback mirrors website logo resolver.
  if(wanted.length>=5){
    const keys=Object.keys(map),ranked=keys.map(k=>({k,d:logoDistance(wanted,k)})).filter(x=>x.d<=(wanted.length>=8?2:1)).sort((a,b)=>a.d-b.d||a.k.length-b.k.length);
    if(ranked.length===1||(ranked.length>1&&ranked[0].d<ranked[1].d))return map[ranked[0].k]||'';
  }
  return '';
}

function jpegDimensions(bytes){
  try{
    if(!bytes||bytes.length<4||bytes[0]!==0xFF||bytes[1]!==0xD8)return null;
    let i=2;
    while(i+8<bytes.length){
      if(bytes[i]!==0xFF){i++;continue}
      while(i<bytes.length&&bytes[i]===0xFF)i++;
      const marker=bytes[i++];
      if(marker===0xD8||marker===0xD9)continue;
      if(i+1>=bytes.length)break;
      const len=(bytes[i]<<8)|bytes[i+1];
      if(len<2||i+len>bytes.length)break;
      if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){
        const h=(bytes[i+3]<<8)|bytes[i+4],w=(bytes[i+5]<<8)|bytes[i+6];
        if(w>0&&h>0)return {width:w,height:h};
      }
      i+=len;
    }
  }catch(_e){}
  return null;
}

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
  'CATALOG','CATALOG LINK','CATALOG URL','CATALOG NAME','CATALOG FILE',
  'NEW PRODUCT LAUNCH','DEAD STOCK','FSN CLASS','INDEX',
  'VISIBLE / NOT VISIBLE','VISIBLE/NOT VISIBLE','VISIBLE NOT VISIBLE','YES/NO','YES / NO','YES NO'
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
  buildFastRows();
}
function rowSourceIndex(row){
  const cached=row && rowIndexMap.get(row);
  return cached===undefined ? allData.indexOf(row) : cached;
}

let FAST_ROWS=[];
function normalizeSearchText(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim()}

// V102 DOWNLOAD PRICE BOOK INDEX -------------------------------------------
// Excel INDEX is download metadata only. Cells may contain several comma-separated
// tags (MAIN, CAR, HCV-LCV, UNIT-3, ...). The dropdown is generated from the live
// workbook automatically, so future INDEX values appear without code changes.
const V102_INDEX_PREFERRED_ORDER=['MAIN','CAR','HCV-LCV','TRACTOR','HARDWARE','UNIT-3','NASIK','GAUTAM-HO','TWO-WHEELER','THREE-WHEELER'];
const V102_INDEX_CANONICAL=new Map([
  ['MAIN','MAIN'],['CAR','CAR'],['HCVLCV','HCV-LCV'],['TRACTOR','TRACTOR'],['HARDWARE','HARDWARE'],
  ['UNIT3','UNIT-3'],['NASIK','NASIK'],['NASHIK','NASIK'],['GAUTAMHO','GAUTAM-HO'],
  ['TWOWHEELER','TWO-WHEELER'],['2WHEELER','TWO-WHEELER'],['2WHEELERS','TWO-WHEELER'],
  ['THREEWHEELER','THREE-WHEELER'],['3WHEELER','THREE-WHEELER'],['3WHEELERS','THREE-WHEELER']
]);
let V102_INDEX_MAP_SOURCE=null,V102_INDEX_MAP=new Map();
let V102_PDF_CONTEXT=null;
function v102IndexTagKey(value){return normalizeSearchText(value).replace(/\s+/g,'')}
function v102CanonicalIndexTag(value){
  const raw=clean(value);if(!raw)return '';
  const key=v102IndexTagKey(raw);if(!key)return '';
  return V102_INDEX_CANONICAL.get(key)||normalizeSearchText(raw).replace(/\s+/g,'-');
}
function v102IndexTagsForRow(row){
  const raw=clean(getField(row,'INDEX','PRICE BOOK INDEX','PRICEBOOK INDEX'));
  if(!raw)return [];
  const seen=new Set(),out=[];
  String(raw).split(/[,;|]+/).forEach(part=>{
    const tag=v102CanonicalIndexTag(part),key=v102IndexTagKey(tag);
    if(tag&&key&&!seen.has(key)){seen.add(key);out.push(tag)}
  });
  return out;
}
function v102IndexTagSort(a,b){
  const ai=V102_INDEX_PREFERRED_ORDER.indexOf(a),bi=V102_INDEX_PREFERRED_ORDER.indexOf(b);
  if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return -1;if(ai!==bi)return ai-bi}
  return natural(a,b);
}
function v102EnsureIndexMap(){
  if(V102_INDEX_MAP_SOURCE===allData)return V102_INDEX_MAP;
  V102_INDEX_MAP_SOURCE=allData;V102_INDEX_MAP=new Map();
  for(const row of allData){
    for(const tag of v102IndexTagsForRow(row)){
      const key=v102IndexTagKey(tag);let item=V102_INDEX_MAP.get(key);
      if(!item){item={tag,rows:[]};V102_INDEX_MAP.set(key,item)}
      item.rows.push(row);
    }
  }
  return V102_INDEX_MAP;
}
function v102IndexPriceBookTags(){return [...v102EnsureIndexMap().values()].map(x=>x.tag).sort(v102IndexTagSort)}
function v102IndexRows(tag){return (v102EnsureIndexMap().get(v102IndexTagKey(tag))?.rows||[]).slice()}
function v102InvalidateIndexMap(){V102_INDEX_MAP_SOURCE=null;V102_INDEX_MAP=new Map()}
function v102UpdateIndexDownloadState(){
  const select=$('#indexPriceBookFilter'),button=$('#indexPriceBookDownloadBtn'),onlyButton=$('#indexOnlyDownloadBtn'),status=$('#indexPriceBookStatus');
  if(!select)return;
  const tag=clean(select.value),count=tag?v102IndexRows(tag).length:0;
  if(button)button.disabled=!tag||!count;
  if(onlyButton)onlyButton.disabled=!tag||!count;
  if(status)status.textContent=tag?(count.toLocaleString('en-IN')+' products ready for '+tag+' price book'):'Select an INDEX to download its complete price book';
}
function refreshIndexPriceBookOptions(){
  const select=$('#indexPriceBookFilter');if(!select)return;
  const current=clean(select.value),tags=v102IndexPriceBookTags();
  select.innerHTML='<option value="">Select INDEX...</option>'+tags.map(tag=>'<option value="'+escapeHtml(tag)+'">'+escapeHtml(tag)+'</option>').join('');
  if(tags.includes(current))select.value=current;
  v102UpdateIndexDownloadState();
}
window.RAJ_V102_REFRESH_INDEX=function(){v102InvalidateIndexMap();refreshIndexPriceBookOptions()};
// V42: Universal search intentionally excludes GROUP / BRAND itself. Everything
// else in the Excel row remains searchable, including future columns added later.
// This keeps the search product/data-centric while upper GROUP filters still work.
function universalRowValues(row){
  if(Array.isArray(row) && COMPACT_COLUMNS.length){
    return COMPACT_COLUMNS.filter(name=>{
      const k=compactFieldKey(name);
      return k!=='GROUP' && k!=='GROUPBRAND' && k!=='BRANDGROUP' && k!=='INDEX';
    }).map(name=>clean(getField(row,name))).filter(Boolean);
  }
  return Object.entries(row||{}).filter(([key])=>{
    const k=compactFieldKey(key);
    return k!=='GROUP' && k!=='GROUPBRAND' && k!=='BRANDGROUP' && k!=='INDEX';
  }).map(([,value])=>clean(value)).filter(Boolean);
}
function buildFastRows(){
  FAST_ROWS=allData.map((row,index)=>{
    const allValues=universalRowValues(row);
    const allN=normalizeSearchText(allValues.join(' | '));
    const allCompact=allN.replace(/\s+/g,'');
    return {
      row,index,
      group:clean(getField(row,'GROUP')), groupN:normalizeSearchText(getField(row,'GROUP')),
      sub:subGroupValue(row), subN:normalizeSearchText(subGroupValue(row)),
      segment:clean(getField(row,'SEGMENT')), segmentN:normalizeSearchText(getField(row,'SEGMENT')),
      vehicle:clean(getField(row,'VEHICLE')), vehicleN:normalizeSearchText(getField(row,'VEHICLE')),
      model:clean(getField(row,'MODEL')), modelN:normalizeSearchText(getField(row,'MODEL')),
      category:clean(getField(row,'CATAGORIES','CATEGORIES','CATEGORY')), categoryN:normalizeSearchText(getField(row,'CATAGORIES','CATEGORIES','CATEGORY')),
      code:clean(getField(row,'CODE','PART NUMBER','PART NO')), codeN:normalizeSearchText(getField(row,'CODE','PART NUMBER','PART NO')),
      product:clean(getField(row,'PRODUCT NAME','DESCRIPTION')), productN:normalizeSearchText(getField(row,'PRODUCT NAME','DESCRIPTION')),
      codeCompact:normalizeSearchText(getField(row,'CODE','PART NUMBER','PART NO')).replace(/\s+/g,''),
      productCompact:normalizeSearchText(getField(row,'PRODUCT NAME','DESCRIPTION')).replace(/\s+/g,''),
      modelCompact:normalizeSearchText(getField(row,'MODEL')).replace(/\s+/g,''),
      vehicleCompact:normalizeSearchText(getField(row,'VEHICLE')).replace(/\s+/g,''),
      allN, allCompact
    };
  });
}
let V68_PRELOAD={index:0,fast:0,running:false,ready:false,data:null};
function v68FastMeta(row,index){
  const allValues=universalRowValues(row),allN=normalizeSearchText(allValues.join(' | '));
  return {row,index,group:clean(getField(row,'GROUP')),groupN:normalizeSearchText(getField(row,'GROUP')),sub:subGroupValue(row),subN:normalizeSearchText(subGroupValue(row)),segment:clean(getField(row,'SEGMENT')),segmentN:normalizeSearchText(getField(row,'SEGMENT')),vehicle:clean(getField(row,'VEHICLE')),vehicleN:normalizeSearchText(getField(row,'VEHICLE')),model:clean(getField(row,'MODEL')),modelN:normalizeSearchText(getField(row,'MODEL')),category:clean(getField(row,'CATAGORIES','CATEGORIES','CATEGORY')),categoryN:normalizeSearchText(getField(row,'CATAGORIES','CATEGORIES','CATEGORY')),code:clean(getField(row,'CODE','PART NUMBER','PART NO')),codeN:normalizeSearchText(getField(row,'CODE','PART NUMBER','PART NO')),product:clean(getField(row,'PRODUCT NAME','DESCRIPTION')),productN:normalizeSearchText(getField(row,'PRODUCT NAME','DESCRIPTION')),codeCompact:normalizeSearchText(getField(row,'CODE','PART NUMBER','PART NO')).replace(/\s+/g,''),productCompact:normalizeSearchText(getField(row,'PRODUCT NAME','DESCRIPTION')).replace(/\s+/g,''),modelCompact:normalizeSearchText(getField(row,'MODEL')).replace(/\s+/g,''),vehicleCompact:normalizeSearchText(getField(row,'VEHICLE')).replace(/\s+/g,''),allN,allCompact:allN.replace(/\s+/g,'')};
}
function v68StartBackgroundPreload(){
  if(V68_PRELOAD.running||V68_PRELOAD.ready)return;
  window.RAJ_FULL_PRELOAD_READY=false;
  V68_PRELOAD={index:0,fast:0,running:true,ready:false,data:allData};
  rowIndexMap=new WeakMap();FAST_ROWS=new Array(allData.length);
  const run=(deadline)=>{
    if(V68_PRELOAD.data!==allData){V68_PRELOAD.running=false;return v68StartBackgroundPreload()}
    const started=performance.now();let processed=0;
    while(V68_PRELOAD.fast<allData.length&&processed<28){
      if(processed>6&&deadline&&typeof deadline.timeRemaining==='function'&&!deadline.didTimeout&&deadline.timeRemaining()<5)break;
      if(processed>6&&!deadline&&performance.now()-started>2)break;
      const i=V68_PRELOAD.fast++,row=allData[i];processed++;
      if(row&&(typeof row==='object'||typeof row==='function'))rowIndexMap.set(row,i);
      FAST_ROWS[i]=v68FastMeta(row,i);
    }
    if(V68_PRELOAD.fast<allData.length){
      if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:100});else setTimeout(()=>run(null),18);
    }else{
      V68_PRELOAD.ready=true;V68_PRELOAD.running=false;
      window.RAJ_FULL_PRELOAD_READY=true;
      window.dispatchEvent(new CustomEvent('raj-data-preloaded'));
    }
  };
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:100});else setTimeout(()=>run(null),18);
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

const DEFAULT_GROUP_BRAND='Aayub';
function setDefaultGroupBrand(force=false){
  const el=$('#groupFilter');
  if(!el)return false;
  const match=[...el.options].find(o=>normalizeSearchText(o.value)===normalizeSearchText(DEFAULT_GROUP_BRAND));
  if(!match)return false;
  if(force || !clean(el.value)){
    el.value=match.value;
    // V113: default Aayub must never be overridden by stale multi-select state.
    if(window.RAJ_MULTI_FILTERS_V103&&Array.isArray(window.RAJ_MULTI_FILTERS_V103.groupFilter))window.RAJ_MULTI_FILTERS_V103.groupFilter=[];
  }
  return normalizeSearchText(el.value)===normalizeSearchText(match.value);
}

// V35 FILTER MASTER ---------------------------------------------------------
// assets/data/filter-master.xlsx is an optional canonical filter list.
// Each column is independent: GROUP / BRAND, SUB GROUP, SEGMENT, VEHICLE,
// MODEL and CATEGORY. If a column is blank the app falls back to values found
// directly in price-book.xlsx. A master cell may contain one value (407) or
// several OR aliases (407,709,1109).
const FILTER_MASTER_STORAGE='RAJ_FILTER_MASTER_V98';
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
  if(['SUBCATEGORY','SUBCATEGORIES','SUBCATAGORY','SUBCATAGORIES'].includes(key))return 'subCategoryFilter';
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
  if(typeof v97InvalidateFacetEngine==='function')v97InvalidateFacetEngine();
  if(persist){
    try{localStorage.setItem(FILTER_MASTER_STORAGE,JSON.stringify(filterMasterLists))}catch(error){}
  }
  if(rerender&&typeof applyFilters==='function')applyFilters(true,true);
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
// V95 FILTER MASTER MAPPING -------------------------------------------------
// FILTER MASTER provides clean dropdown values. Main price-book.xlsx keeps the
// source SEGMENT / VEHICLE / MODEL / CATAGORIES text. MODEL MAP and CATEGORY MAP
// bridge clean filter values to those source values.
const V94_FILTER_MAP_STORAGE='RAJ_FILTER_MAPS_V98';
let V94_MODEL_TO_SOURCES=new Map();
let V94_SOURCE_TO_MODELS=new Map();
let V94_CATEGORY_BY_SOURCE=new Map();
let V94_CATEGORY_TO_SUBS=new Map();
let V94_CATEGORY_RESOLVE_CACHE=new Map();
function v94Norm(value){return normalizeSearchText(value)}
function v94SourceParts(value){return String(value==null?'':value).split(/[,;|]+/).map(clean).filter(Boolean)}
function v94Contains(source,wanted){
  const h=v94Norm(source),n=v94Norm(wanted);if(!h||!n)return false;
  if(h===n)return true;
  const esc=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(/^\d+(?:\.\d+)?$/.test(n))return new RegExp('(^|[^0-9])'+esc+'(?=$|[^0-9])','i').test(h);
  return new RegExp('(^|[^A-Z0-9])'+esc+'(?=$|[^A-Z0-9])','i').test(h);
}
function v94UniquePush(map,key,value){if(!key||!value)return;if(!map.has(key))map.set(key,new Set());map.get(key).add(value)}
function v94ParseModelMap(rows){
  const byModel=new Map(),bySource=new Map();if(!Array.isArray(rows)||rows.length<2){V94_MODEL_TO_SOURCES=byModel;V94_SOURCE_TO_MODELS=bySource;return}
  const headers=(rows[0]||[]).map(masterHeaderKey),mi=headers.indexOf('MODEL'),si=headers.indexOf('SOURCEMODEL');if(mi<0||si<0)return;
  for(let i=1;i<rows.length;i++){
    const model=clean((rows[i]||[])[mi]),source=clean((rows[i]||[])[si]);if(!model||!source)continue;
    v94UniquePush(byModel,v94Norm(model),source);v94UniquePush(bySource,v94Norm(source),model);
  }
  V94_MODEL_TO_SOURCES=byModel;V94_SOURCE_TO_MODELS=bySource;
}
function v94ParseCategoryMap(rows){
  const bySource=new Map(),byCategory=new Map();if(!Array.isArray(rows)||rows.length<2){V94_CATEGORY_BY_SOURCE=bySource;V94_CATEGORY_TO_SUBS=byCategory;return}
  const headers=(rows[0]||[]).map(masterHeaderKey),ci=headers.indexOf('CATEGORY'),si=headers.indexOf('SUBCATEGORY'),ri=headers.indexOf('SOURCECATEGORY');if(ci<0||si<0||ri<0)return;
  for(let i=1;i<rows.length;i++){
    const category=clean((rows[i]||[])[ci]),subCategory=clean((rows[i]||[])[si]),source=clean((rows[i]||[])[ri]);if(!category||!source)continue;
    const item={category,subCategory:subCategory||source,source};bySource.set(v94Norm(source),item);v94UniquePush(byCategory,v94Norm(category),item.subCategory);
  }
  V94_CATEGORY_BY_SOURCE=bySource;V94_CATEGORY_TO_SUBS=byCategory;V94_CATEGORY_RESOLVE_CACHE=new Map();
}
function v94PersistMaps(){
  try{
    const payload={
      model:[...V94_MODEL_TO_SOURCES].map(([k,v])=>[k,[...v]]),
      category:[...V94_CATEGORY_BY_SOURCE].map(([k,v])=>[k,v]),
      categorySubs:[...V94_CATEGORY_TO_SUBS].map(([k,v])=>[k,[...v]])
    };localStorage.setItem(V94_FILTER_MAP_STORAGE,JSON.stringify(payload));
  }catch(_e){}
}
function v94RestoreMaps(){
  try{
    const p=JSON.parse(localStorage.getItem(V94_FILTER_MAP_STORAGE)||'null');if(!p)return;
    V94_MODEL_TO_SOURCES=new Map((p.model||[]).map(([k,v])=>[k,new Set(v||[])]));
    V94_CATEGORY_BY_SOURCE=new Map(p.category||[]);
    V94_CATEGORY_TO_SUBS=new Map((p.categorySubs||[]).map(([k,v])=>[k,new Set(v||[])]));
  }catch(_e){}
}
function v94CategoryMappings(row){
  const raw=clean(getField(row,'CATAGORIES','CATEGORIES','CATEGORY'));if(!raw)return [];
  const rawKey=v94Norm(raw);if(V94_CATEGORY_RESOLVE_CACHE.has(rawKey))return V94_CATEGORY_RESOLVE_CACHE.get(rawKey);
  const found=[],seen=new Set(),tryAdd=value=>{const item=V94_CATEGORY_BY_SOURCE.get(v94Norm(value));if(item&&!seen.has(v94Norm(item.source))){seen.add(v94Norm(item.source));found.push(item)}};
  tryAdd(raw);v94SourceParts(raw).forEach(tryAdd);
  // CATEGORY MAP is authoritative. When source text differs only by extra words
  // (e.g. COMPRESSOR OIL vs AC Compressor Oil, WATER PUMP ASSEMBLY vs Water Pump),
  // resolve against SOURCE CATEGORY / SUB CATEGORY text from the same master map.
  if(!found.length&&rawKey.length>=4){
    let best=null,bestScore=0;
    for(const item of V94_CATEGORY_BY_SOURCE.values()){
      const candidates=[v94Norm(item.source),v94Norm(item.subCategory)].filter(Boolean);
      for(const candidate of candidates){
        if(candidate.length<4)continue;
        let score=0;
        if(rawKey===candidate)score=100;
        else if(rawKey.includes(candidate)||candidate.includes(rawKey))score=80+20*Math.min(rawKey.length,candidate.length)/Math.max(rawKey.length,candidate.length);
        else{
          const a=new Set(rawKey.split(' ').filter(x=>x.length>2)),b=new Set(candidate.split(' ').filter(x=>x.length>2));
          if(a.size>=2&&b.size>=2){const common=[...a].filter(x=>b.has(x)).length,ratio=common/Math.min(a.size,b.size);if(common>=2&&ratio>=.75)score=60+20*ratio;}
        }
        if(score>bestScore){bestScore=score;best=item}
      }
    }
    if(best&&bestScore>=75)found.push(best);
  }
  V94_CATEGORY_RESOLVE_CACHE.set(rawKey,found);return found;
}
function v94CategoryMatch(row,selected){
  if(!selected)return true;
  return v94Norm(getField(row,'CATAGORIES','CATEGORIES','CATEGORY'))===v94Norm(selected);
}
function v94SubCategoryMatch(row,selected){if(!selected)return true;const n=v94Norm(selected),items=v94CategoryMappings(row);return items.some(item=>v94Norm(item.subCategory)===n)}
function v94ModelMatch(row,selected){
  if(!selected)return true;
  return v94Contains(getField(row,'MODEL'),selected);
}
function v94SegmentMatch(row,selected){
  if(!selected)return true;
  if(typeof v101StrictFacetMatch==='function'){
    const direct=v101StrictFacetMatch(row,'segmentFilter',selected);
    if(direct!==null){
      if(direct)return true;
      if(v94Norm(selected)!=='UNIVERSAL')return !!v101StrictFacetMatch(row,'segmentFilter','UNIVERSAL');
      return false;
    }
  }
  return v94Contains(getField(row,'SEGMENT'),selected)||v94Contains(getField(row,'SEGMENT'),'UNIVERSAL');
}
function v94VehicleMatch(row,selected){
  if(!selected)return true;
  const staticMatch=typeof v101StrictFacetMatch==='function'?v101StrictFacetMatch(row,'vehicleFilter',selected):null;
  if(staticMatch!==null)return staticMatch;
  const source=getField(row,'VEHICLE');if(v94Contains(source,selected))return true;
  return typeof v97VehicleLooseMatch==='function'?v97VehicleLooseMatch(source,selected):false;
}
function v94FilterMatch(row,id,selected){
  if(!selected)return true;
  if(id==='segmentFilter')return v94SegmentMatch(row,selected);
  if(id==='vehicleFilter')return v94VehicleMatch(row,selected);
  if(id==='modelFilter')return v94ModelMatch(row,selected);
  if(id==='categoryFilter')return v94CategoryMatch(row,selected);
  if(id==='subCategoryFilter')return v94SubCategoryMatch(row,selected);
  return true;
}
function v94FilterSearchMatch(row,id,typed){
  if(!typed)return true;const n=v94Norm(typed);
  if(id==='categoryFilter')return v94Norm(getField(row,'CATAGORIES','CATEGORIES','CATEGORY')).includes(n);
  if(id==='subCategoryFilter')return v94CategoryMappings(row).some(item=>v94Norm(item.subCategory).includes(n));
  if(id==='modelFilter')return v94Contains(getField(row,'MODEL'),typed)||v94ModelMatch(row,typed);
  if(id==='vehicleFilter')return v94Contains(getField(row,'VEHICLE'),typed);
  if(id==='segmentFilter')return v94Contains(getField(row,'SEGMENT'),typed);
  return v94FilterMatch(row,id,typed);
}

// V101 STATIC CASCADE INDEX --------------------------------------------------
// The bundled Price Book is indexed at build time. This removes the expensive
// V97 compatibility-engine rebuild from normal Segment -> Vehicle -> Model use.
// If hosted Excel is replaced at runtime (row count/source changes), the code
// automatically falls back to the original dynamic V98 engine below.
let V101_FACET_INDEX_SOURCE=null,V101_FACET_INDEX_VALIDATED=null;
function v101FacetIndex(){
  if(V101_FACET_INDEX_SOURCE===allData)return V101_FACET_INDEX_VALIDATED;
  V101_FACET_INDEX_SOURCE=allData;V101_FACET_INDEX_VALIDATED=null;
  const idx=window.RAJ_V101_FACET_INDEX;
  if(!idx||idx.dataLength!==allData.length)return null;
  if(idx.fingerprint){
    const sampleIdx=[0,100,1000,Math.floor(allData.length/2),allData.length-1];
    const fingerprint=sampleIdx.map(i=>{
      const row=allData[i];return [getField(row,'CODE'),getField(row,'SEGMENT'),getField(row,'VEHICLE'),getField(row,'MODEL')].map(clean).join('~');
    }).join('||');
    if(fingerprint!==idx.fingerprint)return null;
  }
  V101_FACET_INDEX_VALIDATED=idx;return idx;
}
function v101FacetLookup(map,value){
  if(!map)return undefined;
  return map[v94Norm(value)];
}
function v101VehicleMaskHas(maskWords,vehicleIndex){
  if(!Array.isArray(maskWords)||vehicleIndex===undefined||vehicleIndex<0)return false;
  const word=maskWords[vehicleIndex>>>5]>>>0;
  return !!((word>>>(vehicleIndex&31))&1);
}
let V101_ROW_INDEX_SOURCE=null,V101_ROW_INDEX_MAP=new WeakMap();
function v101RowIndex(row){
  if(V101_ROW_INDEX_SOURCE!==allData){
    V101_ROW_INDEX_SOURCE=allData;V101_ROW_INDEX_MAP=new WeakMap();
    for(let i=0;i<allData.length;i++){
      const item=allData[i];if(item&&(typeof item==='object'||typeof item==='function'))V101_ROW_INDEX_MAP.set(item,i);
    }
  }
  const hit=row&&V101_ROW_INDEX_MAP.get(row);return hit===undefined?-1:hit;
}
function v101RowFacetIds(row,id){
  const idx=v101FacetIndex();if(!idx)return null;
  const sourceIndex=v101RowIndex(row);if(sourceIndex<0||sourceIndex>=idx.dataLength)return null;
  if(id==='segmentFilter')return idx.rowSegments[sourceIndex]||[];
  if(id==='vehicleFilter')return idx.rowVehicles[sourceIndex]||[];
  if(id==='modelFilter')return idx.rowModels[sourceIndex]||[];
  return null;
}
function v101FacetValuesForRows(rows,id,{segment='',vehicle=''}={}){
  const idx=v101FacetIndex();if(!idx||!Array.isArray(rows))return null;
  if(id==='categoryFilter'){
    const result=new Map();
    const canonical=new Map(masterValuesForFilter('categoryFilter').map(v=>[v94Norm(v),v]));
    for(const item of rows){
      const row=item&&item.row!==undefined?item.row:item;
      const raw=clean(getField(row,'CATAGORIES','CATEGORIES','CATEGORY'));if(!raw)continue;
      const n=v94Norm(raw);result.set(n,canonical.get(n)||raw);
    }
    return [...result.values()].sort(natural);
  }
  if(!['segmentFilter','vehicleFilter','modelFilter'].includes(id))return null;
  const values=id==='segmentFilter'?idx.segments:id==='vehicleFilter'?idx.vehicles:idx.models;
  const found=new Set();
  const segmentIndex=segment?v101FacetLookup(idx.segmentMap,segment):undefined;
  const vehicleIndex=vehicle?v101FacetLookup(idx.vehicleMap,vehicle):undefined;
  for(const item of rows){
    const row=item&&item.row!==undefined?item.row:item;
    const ids=v101RowFacetIds(row,id);if(!ids)continue;
    for(const valueIndex of ids){
      if(id==='vehicleFilter'&&segmentIndex!==undefined){
        if(!((idx.vehicleSegmentMask[valueIndex]||0)&(1<<segmentIndex)))continue;
      }
      if(id==='modelFilter'&&segmentIndex!==undefined){
        if(!((idx.modelSegmentMask[valueIndex]||0)&(1<<segmentIndex)))continue;
      }
      if(id==='modelFilter'&&vehicleIndex!==undefined){
        if(!v101VehicleMaskHas(idx.modelVehicleMask[valueIndex],vehicleIndex))continue;
      }
      found.add(valueIndex);
    }
  }
  const out=[];for(const valueIndex of found){const value=values[valueIndex];if(value)out.push(value)}
  return out.sort(natural);
}
function v101StrictFacetMatch(row,id,selected){
  const idx=v101FacetIndex();if(!idx||!selected||!['segmentFilter','vehicleFilter'].includes(id))return null;
  const map=id==='segmentFilter'?idx.segmentMap:idx.vehicleMap;
  const wanted=v101FacetLookup(map,selected);if(wanted===undefined)return false;
  const ids=v101RowFacetIds(row,id);return !!ids&&ids.includes(wanted);
}

// V102 segment multi-select helpers. They reuse the same V101 static row index,
// so HCV + LCV + CAR remains a cheap index lookup instead of regex-scanning 44k rows.
function v102SelectedSegments(){
  const list=Array.isArray(window.RAJ_SEGMENT_MULTI_V102)?window.RAJ_SEGMENT_MULTI_V102:[];
  const out=[],seen=new Set();
  for(const value of list){const v=clean(value),k=v94Norm(v);if(v&&k&&!seen.has(k)){seen.add(k);out.push(v)}}
  return out;
}
function v102MultiSegmentMatch(row,selections){
  const wanted=(Array.isArray(selections)?selections:v102SelectedSegments()).filter(Boolean);if(!wanted.length)return true;
  const idx=v101FacetIndex();
  if(idx){
    const ids=v101RowFacetIds(row,'segmentFilter')||[];
    const universal=v101FacetLookup(idx.segmentMap,'UNIVERSAL');
    if(universal!==undefined&&ids.includes(universal))return true;
    for(const value of wanted){const si=v101FacetLookup(idx.segmentMap,value);if(si!==undefined&&ids.includes(si))return true}
    return false;
  }
  return wanted.some(value=>v94Contains(getField(row,'SEGMENT'),value)||v94Contains(getField(row,'SEGMENT'),'UNIVERSAL'));
}
function v102FacetValuesForRowsMulti(rows,id,{segments=[],vehicle=''}={}){
  const selectedSegments=(segments||[]).map(clean).filter(Boolean);
  if(!selectedSegments.length)return v101FacetValuesForRows(rows,id,{segment:'',vehicle});
  const idx=v101FacetIndex();if(!idx||!Array.isArray(rows))return null;
  if(id==='categoryFilter')return v101FacetValuesForRows(rows,id,{segment:'',vehicle});
  if(!['vehicleFilter','modelFilter'].includes(id))return v101FacetValuesForRows(rows,id,{segment:'',vehicle});
  const values=id==='vehicleFilter'?idx.vehicles:idx.models,found=new Set();
  const segmentIds=selectedSegments.map(value=>v101FacetLookup(idx.segmentMap,value)).filter(value=>value!==undefined);
  const vehicleIndex=vehicle?v101FacetLookup(idx.vehicleMap,vehicle):undefined;
  for(const item of rows){
    const row=item&&item.row!==undefined?item.row:item,ids=v101RowFacetIds(row,id);if(!ids)continue;
    for(const valueIndex of ids){
      if(id==='vehicleFilter'&&segmentIds.length){
        const mask=idx.vehicleSegmentMask[valueIndex]||0;
        if(!segmentIds.some(segmentIndex=>mask&(1<<segmentIndex)))continue;
      }
      if(id==='modelFilter'&&segmentIds.length){
        const mask=idx.modelSegmentMask[valueIndex]||0;
        if(!segmentIds.some(segmentIndex=>mask&(1<<segmentIndex)))continue;
      }
      if(id==='modelFilter'&&vehicleIndex!==undefined&&!v101VehicleMaskHas(idx.modelVehicleMask[valueIndex],vehicleIndex))continue;
      found.add(valueIndex);
    }
  }
  const out=[];for(const valueIndex of found){const value=values[valueIndex];if(value)out.push(value)}
  return out.sort(natural);
}
window.RAJ_V102_MULTI_SEGMENT_MATCH=v102MultiSegmentMatch;
window.RAJ_V102_MULTI_FACET_VALUES=v102FacetValuesForRowsMulti;

// V103 generic OR multi-select helpers. UI state lives on window so the fast
// inline cascade and app/PDF logic share one source of truth.
const V103_MULTI_FILTER_IDS=['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'];
window.RAJ_MULTI_FILTERS_V103=window.RAJ_MULTI_FILTERS_V103||Object.fromEntries(V103_MULTI_FILTER_IDS.map(id=>[id,[]]));
function v103MultiValues(id){
  const raw=Array.isArray(window.RAJ_MULTI_FILTERS_V103?.[id])?window.RAJ_MULTI_FILTERS_V103[id]:[];
  const out=[],seen=new Set();for(const value of raw){const v=clean(value),k=v94Norm(v);if(v&&k&&!seen.has(k)){seen.add(k);out.push(v)}}return out;
}
function v103SetMultiValues(id,values){
  if(!V103_MULTI_FILTER_IDS.includes(id))return [];
  const out=[],seen=new Set();for(const value of values||[]){const v=clean(value),k=v94Norm(v);if(v&&k&&!seen.has(k)){seen.add(k);out.push(v)}}
  window.RAJ_MULTI_FILTERS_V103[id]=out;if(id==='segmentFilter')window.RAJ_SEGMENT_MULTI_V102=out.slice();return out;
}
function v103MultiMatch(row,id,selections){
  const values=(Array.isArray(selections)?selections:v103MultiValues(id)).filter(Boolean);if(!values.length)return true;
  if(id==='groupFilter'){const raw=v94Norm(getField(row,'GROUP','GROUP / BRAND','BRAND'));return values.some(v=>raw===v94Norm(v))}
  if(id==='subGroupFilter'){const raw=v94Norm(subGroupValue(row));return values.some(v=>raw===v94Norm(v))}
  if(id==='segmentFilter')return v102MultiSegmentMatch(row,values);
  if(id==='vehicleFilter')return values.some(v=>v94VehicleMatch(row,v));
  if(id==='modelFilter')return values.some(v=>v94ModelMatch(row,v));
  if(id==='categoryFilter')return values.some(v=>v94CategoryMatch(row,v));
  return true;
}
window.RAJ_V103_GET_MULTI_SELECTIONS=id=>v103MultiValues(id);
window.RAJ_V103_GET_ALL_MULTI_SELECTIONS=()=>Object.fromEntries(V103_MULTI_FILTER_IDS.map(id=>[id,v103MultiValues(id)]));
window.RAJ_V103_SET_MULTI_SELECTIONS=(id,values,opts)=>{const out=v103SetMultiValues(id,values);if(!(opts&&opts.silent)&&typeof window.RAJ_V103_RENDER_MULTI==='function')window.RAJ_V103_RENDER_MULTI(id);return out};
window.RAJ_V103_CLEAR_MULTI_FILTERS=(ids)=>{for(const id of (Array.isArray(ids)?ids:V103_MULTI_FILTER_IDS))v103SetMultiValues(id,[]);if(typeof window.RAJ_V103_RENDER_ALL_MULTI==='function')window.RAJ_V103_RENDER_ALL_MULTI()};
window.RAJ_V103_MULTI_MATCH=v103MultiMatch;

// V98 SMART CASCADING FACETS ------------------------------------------------
// Downstream dropdowns are limited to values that occur in the Price Book rows
// left by the filters above them. The clean verified Vehicle Master remains the
// display vocabulary for Segment / Vehicle / Model.
let V97_FACET_ENGINE={data:null,signature:'',automata:{},compat:null};
function v97FacetNorm(value){return v94Norm(value)}
function v97FacetMasterSignature(){
  return ['segmentFilter','vehicleFilter','modelFilter'].map(id=>masterValuesForFilter(id).map(v97FacetNorm).join('\u0001')).join('\u0002');
}
function v97BuildAutomaton(values){
  const next=[Object.create(null)],fail=[0],out=[[]];
  (values||[]).forEach(value=>{
    const norm=v97FacetNorm(value);if(!norm)return;
    const pattern=' '+norm+' ';let state=0;
    for(const ch of pattern){
      let target=next[state][ch];
      if(target===undefined){target=next.length;next[state][ch]=target;next.push(Object.create(null));fail.push(0);out.push([])}
      state=target;
    }
    out[state].push(value);
  });
  const queue=[];
  for(const ch in next[0]){const state=next[0][ch];queue.push(state);fail[state]=0}
  for(let head=0;head<queue.length;head++){
    const parent=queue[head];
    for(const ch in next[parent]){
      const state=next[parent][ch];queue.push(state);let fallback=fail[parent];
      while(fallback&&next[fallback][ch]===undefined)fallback=fail[fallback];
      fail[state]=next[fallback][ch]??0;
      if(out[fail[state]].length)out[state]=out[state].concat(out[fail[state]]);
    }
  }
  return {next,fail,out,cache:new Map()};
}
function v97EnsureFacetEngine(){
  const signature=v97FacetMasterSignature();
  if(V97_FACET_ENGINE.data===allData&&V97_FACET_ENGINE.signature===signature&&V97_FACET_ENGINE.compat)return V97_FACET_ENGINE;
  V97_FACET_ENGINE={
    data:allData,signature,
    automata:{
      segmentFilter:v97BuildAutomaton(masterValuesForFilter('segmentFilter')),
      vehicleFilter:v97BuildAutomaton(masterValuesForFilter('vehicleFilter')),
      modelFilter:v97BuildAutomaton(masterValuesForFilter('modelFilter'))
    },
    compat:{vehicleSegment:new Map(),modelSegment:new Map(),modelVehicle:new Map(),vehicleSegmentEvidence:new Map()}
  };
  const compat=V97_FACET_ENGINE.compat;
  for(const row of allData){
    const segments=v97FacetSourceMatches('segmentFilter',getField(row,'SEGMENT')).filter(v=>v97FacetNorm(v)!=='UNIVERSAL');
    const vehicles=v97FacetSourceMatches('vehicleFilter',getField(row,'VEHICLE')).filter(v=>v97FacetNorm(v)!=='UNIVERSAL');
    const models=v97FacetSourceMatches('modelFilter',getField(row,'MODEL'));
    const strongSegment=segments.length===1,strongVehicle=vehicles.length===1,rawModelEvidence=v97FacetNorm(getField(row,'MODEL'));
    for(const vehicle of vehicles)for(const segment of segments){
      v97CompatRecord(compat.vehicleSegment,vehicle,segment,strongSegment);
      v97VehicleSegmentEvidence(compat.vehicleSegmentEvidence,vehicle,segment,rawModelEvidence);
    }
    for(const model of models){
      for(const segment of segments)v97CompatRecord(compat.modelSegment,model,segment,strongSegment);
      for(const vehicle of vehicles)v97CompatRecord(compat.modelVehicle,model,vehicle,strongVehicle);
    }
  }
  return V97_FACET_ENGINE;
}
function v97EditDistance(a,b){
  a=clean(a);b=clean(b);if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}
  return prev[b.length];
}
function v97VehicleFuzzyCandidates(source,found){
  const master=masterValuesForFilter('vehicleFilter').map(value=>({value,norm:v97FacetNorm(value),compact:v97FacetNorm(value).replace(/\s+/g,'')}));
  const chunks=String(source==null?'':source).split(/[,;|/&+]+/).map(v97FacetNorm).filter(Boolean);
  for(const chunk of chunks){
    if(found.has(chunk))continue;
    const compact=chunk.replace(/\s+/g,'');if(compact.length<4)continue;
    let best=null,bestScore=0;
    for(const item of master){
      const maxLen=Math.max(compact.length,item.compact.length);if(!maxLen)continue;
      if(Math.abs(compact.length-item.compact.length)>Math.max(2,Math.floor(maxLen*.18)))continue;
      const dist=v97EditDistance(compact,item.compact),score=1-dist/maxLen;
      if(score>bestScore){bestScore=score;best=item}
    }
    if(best&&bestScore>=.86)found.set(best.norm,best.value);
  }
}
function v97FacetSourceMatches(id,source){
  const norm=v97FacetNorm(source);if(!norm)return [];
  const engine=(V97_FACET_ENGINE.data===allData&&V97_FACET_ENGINE.automata[id])?V97_FACET_ENGINE:v97EnsureFacetEngine(),automaton=engine.automata[id];if(!automaton)return [];
  if(automaton.cache.has(norm))return automaton.cache.get(norm);
  let state=0;const found=new Map();
  for(const ch of ' '+norm+' '){
    while(state&&automaton.next[state][ch]===undefined)state=automaton.fail[state];
    state=automaton.next[state][ch]??0;
    for(const value of automaton.out[state])found.set(v97FacetNorm(value),value);
  }
  if(id==='vehicleFilter')v97VehicleFuzzyCandidates(source,found);
  const result=[...found.values()];automaton.cache.set(norm,result);return result;
}
function v97VehicleLooseMatch(source,selected){return v97FacetSourceMatches('vehicleFilter',source).some(value=>v97FacetNorm(value)===v97FacetNorm(selected))}
function v97CompatRecord(map,key,value,strong){
  const k=v97FacetNorm(key),v=v97FacetNorm(value);if(!k||!v)return;
  let entry=map.get(k);if(!entry){entry={strong:new Map(),weak:new Map()};map.set(k,entry)}
  const bucket=strong?entry.strong:entry.weak;bucket.set(v,(bucket.get(v)||0)+1);
}
function v97VehicleSegmentEvidence(map,vehicle,segment,rawModel){
  const k=v97FacetNorm(vehicle),s=v97FacetNorm(segment);if(!k||!s)return;
  let bySegment=map.get(k);if(!bySegment){bySegment=new Map();map.set(k,bySegment)}
  let item=bySegment.get(s);if(!item){item={rows:0,models:new Set()};bySegment.set(s,item)}
  item.rows++;if(rawModel)item.models.add(rawModel);
}
function v97CompatAllows(map,key,value){
  const entry=map.get(v97FacetNorm(key));if(!entry)return true;
  const bucket=entry.strong.size?entry.strong:entry.weak;if(!bucket.size)return true;
  const target=v97FacetNorm(value),count=bucket.get(target)||0;if(!count)return false;
  let max=0;for(const n of bucket.values())if(n>max)max=n;
  if(max<=3)return true;
  if(count<2||count<max*0.08)return false;
  // Vehicle -> Segment needs one extra quality check. Price-book cells can contain
  // broad/composite application text, so a repeated generic model must not make a
  // truck brand appear under CAR. Real segment families normally have either a
  // healthy variety of model texts or a dominant share for that vehicle.
  if(V97_FACET_ENGINE.compat&&map===V97_FACET_ENGINE.compat.vehicleSegment){
    if(count===max)return true;
    const evidence=V97_FACET_ENGINE.compat.vehicleSegmentEvidence?.get(v97FacetNorm(key))?.get(target);
    if(!evidence)return true;
    const uniqueModels=evidence.models.size,diversity=uniqueModels/Math.max(1,evidence.rows);
    return uniqueModels>=25||diversity>=0.10||count>=max*0.60;
  }
  return true;
}
function v97FacetRow(item){return item&&item.row!==undefined?item.row:item}

// V98 vehicle/segment compatibility: combine strong single-segment evidence with
// weaker comma/slash multi-segment rows. This keeps legitimate multi-segment makes
// (for example TATA / MAHINDRA / BAJAJ / HONDA) while suppressing noisy composite
// rows that used to leak tractor, two-wheeler and earthmover makes into CAR.
function v98VehicleSegmentAllows(vehicle,segment){
  if(!segment)return true;
  const compat=v97EnsureFacetEngine().compat,entry=compat.vehicleSegment.get(v97FacetNorm(vehicle));
  if(!entry)return false;
  const target=v97FacetNorm(segment),strong=entry.strong.get(target)||0,weak=entry.weak.get(target)||0;
  if(!strong&&!weak)return false;
  const keys=new Set([...entry.strong.keys(),...entry.weak.keys()]);
  let maxScore=0,maxWeak=0,weakPositive=0,weakTies=0;
  for(const key of keys){
    const sv=entry.strong.get(key)||0,wv=entry.weak.get(key)||0,score=sv+wv*.35;
    if(score>maxScore)maxScore=score;
    if(wv>maxWeak){maxWeak=wv;weakTies=1}else if(wv&&wv===maxWeak)weakTies++;
    if(wv)weakPositive++;
  }
  // No clean single-segment evidence: keep only concentrated weak evidence.
  // Broad one-row combinations such as MATADOR/RTV/MINIDOR across every segment
  // are intentionally omitted. Ambiguous weak-only CAR evidence is also omitted.
  if(!entry.strong.size){
    if(target==='CAR'&&weakTies>=2&&weak===maxWeak)return false;
    if(maxWeak<=1&&weakPositive>=4)return false;
    if(maxWeak&&weak<maxWeak*.55)return false;
    return weak>=2||weakPositive<=2;
  }
  const score=strong+weak*.35,ratio=maxScore?score/maxScore:1;
  if(score===maxScore)return true;
  const evidence=compat.vehicleSegmentEvidence?.get(v97FacetNorm(vehicle))?.get(target);
  const uniqueModels=evidence?.models?.size||0,rows=evidence?.rows||0,diversity=uniqueModels/Math.max(1,rows);
  // CAR needs stronger evidence because many source rows contain broad commercial
  // vehicle application text together with CAR. This removes obvious HCV/tractor noise.
  if(target==='CAR'&&ratio<.35)return false;
  // TWO WHEELERS also receives many broad multi-application rows. Keep a secondary
  // make only when it has a meaningful share or a healthy set of distinct 2W models.
  if(target==='2 WHEELERS'){
    if(ratio>=.15&&(uniqueModels>=4||diversity>=.10||strong>=3))return true;
    if(uniqueModels>=8&&diversity>=.12)return true;
    return false;
  }
  if(ratio>=.08&&(uniqueModels>=25||diversity>=.08||strong>=5))return true;
  if(uniqueModels>=12&&diversity>=.12)return true;
  return false;
}

function v97FacetValuesForRows(rows,id,{segment='',vehicle=''}={}){
  const staticValues=v101FacetValuesForRows(rows,id,{segment,vehicle});
  if(staticValues!==null)return staticValues;
  const result=new Map();
  if(id==='categoryFilter'){
    const canonical=new Map(masterValuesForFilter('categoryFilter').map(v=>[v97FacetNorm(v),v]));
    for(const item of rows){
      const raw=clean(getField(v97FacetRow(item),'CATAGORIES','CATEGORIES','CATEGORY'));if(!raw)continue;
      const norm=v97FacetNorm(raw);result.set(norm,canonical.get(norm)||raw);
    }
    return [...result.values()].sort(natural);
  }
  const field=id==='segmentFilter'?'SEGMENT':id==='vehicleFilter'?'VEHICLE':'MODEL';
  const compat=v97EnsureFacetEngine().compat;
  for(const item of rows){
    const row=v97FacetRow(item);
    for(const value of v97FacetSourceMatches(id,getField(row,field))){
      if(id==='vehicleFilter'&&segment&&!v98VehicleSegmentAllows(value,segment))continue;
      if(id==='modelFilter'&&segment&&!v97CompatAllows(compat.modelSegment,value,segment))continue;
      if(id==='modelFilter'&&vehicle&&!v97CompatAllows(compat.modelVehicle,value,vehicle))continue;
      result.set(v97FacetNorm(value),value);
    }
  }
  return [...result.values()].sort(natural);
}
function v97StrictFacetMatch(row,id,selected){
  if(!selected)return true;
  const staticMatch=v101StrictFacetMatch(row,id,selected);
  if(staticMatch!==null)return staticMatch;
  if(id==='segmentFilter')return v97FacetSourceMatches(id,getField(row,'SEGMENT')).some(v=>v97FacetNorm(v)===v97FacetNorm(selected));
  if(id==='vehicleFilter')return v94VehicleMatch(row,selected);
  if(id==='modelFilter')return v94ModelMatch(row,selected);
  if(id==='categoryFilter')return v94CategoryMatch(row,selected);
  return true;
}
function v97InvalidateFacetEngine(){V97_FACET_ENGINE={data:null,signature:'',automata:{},compat:null}}

function v94SubCategoryOptions(categoryValue=''){
  const master=masterValuesForFilter('subCategoryFilter');if(!categoryValue)return master;
  const allowed=V94_CATEGORY_TO_SUBS.get(v94Norm(categoryValue));if(!allowed||!allowed.size)return [];
  const allowedKeys=new Set([...allowed].map(v94Norm));return master.filter(value=>allowedKeys.has(v94Norm(value)));
}
function v94FilterDisplayValue(row,id){
  if(id==='modelFilter')return clean(getField(row,'MODEL'));
  if(id==='categoryFilter')return clean(getField(row,'CATAGORIES','CATEGORIES','CATEGORY'));
  if(id==='subCategoryFilter'){const x=v94CategoryMappings(row)[0];return x?x.subCategory:''}
  if(id==='segmentFilter')return clean(getField(row,'SEGMENT'));
  if(id==='vehicleFilter')return clean(getField(row,'VEHICLE'));
  return '';
}

function parseVoiceAliasRows(rows){
  const out={};if(!Array.isArray(rows)||rows.length<2)return out;
  const headers=(rows[0]||[]).map(masterHeaderKey);const spokenIndex=headers.findIndex(h=>['SPOKENLOCALNAME','SPOKEN','LOCALNAME','ALIAS','VOICEALIAS'].includes(h));const searchIndex=headers.findIndex(h=>['SEARCHAS','ORIGINALSEARCH','CANONICAL','SEARCHVALUE','ORIGINAL'].includes(h));
  if(spokenIndex<0||searchIndex<0)return out;
  for(let i=1;i<rows.length;i++){const spoken=normalizeSearchText((rows[i]||[])[spokenIndex]),search=clean((rows[i]||[])[searchIndex]);if(spoken&&search)out[spoken]=search;}return out;
}
async function readFilterMasterWorkbookBuffer(buffer){
  const ready=await ensureExcelReader();
  if(!ready)throw new Error('Excel reader unavailable');
  const wb=XLSX.read(buffer,{type:'array',cellDates:false});
  const sheetName=wb.SheetNames.find(name=>masterHeaderKey(name)==='FILTERMASTER')||wb.SheetNames[0];
  const sheet=wb.Sheets[sheetName];
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
  const aliasName=wb.SheetNames.find(name=>['VOICEALIASES','VOICEALIAS','ALIASES'].includes(masterHeaderKey(name)));
  if(aliasName){const aliasRows=XLSX.utils.sheet_to_json(wb.Sheets[aliasName],{header:1,defval:'',raw:true});USER_VOICE_ALIASES=parseVoiceAliasRows(aliasRows);try{localStorage.setItem('RAJ_VOICE_ALIASES_V37',JSON.stringify(USER_VOICE_ALIASES))}catch(e){}}
  const categoryMapName=wb.SheetNames.find(name=>masterHeaderKey(name)==='CATEGORYMAP');
  if(categoryMapName)v94ParseCategoryMap(XLSX.utils.sheet_to_json(wb.Sheets[categoryMapName],{header:1,defval:'',raw:true}));
  const modelMapName=wb.SheetNames.find(name=>masterHeaderKey(name)==='MODELMAP');
  if(modelMapName)v94ParseModelMap(XLSX.utils.sheet_to_json(wb.Sheets[modelMapName],{header:1,defval:'',raw:true}));
  v94PersistMaps();
  return parseFilterMasterRows(rows);
}
function v95MarkFilterMasterReady(ok){
  window.RAJ_FILTER_MASTER_READY=true;
  window.RAJ_FILTER_MASTER_OK=!!ok;
  window.dispatchEvent(new CustomEvent('raj-filter-master-ready',{detail:{ok:!!ok,count:filterMasterItemCount()}}));
  // If the Aayub quick cache completed first, release the normal boot-ready event now.
  const state=window.RAJ_BOOT_STATE;
  if(state&&state.quick&&state.hosted&&!state.ready){state.ready=true;window.dispatchEvent(new CustomEvent('raj-boot-ready',{detail:{...state}}));}
}
function v95ApplyBundledFilterMaster(){
  const src=window.RAJ_FILTER_MASTER_V95;if(!src||!Array.isArray(src.filterMaster))return false;
  try{
    if(Array.isArray(src.categoryMap))v94ParseCategoryMap(src.categoryMap);
    if(Array.isArray(src.modelMap))v94ParseModelMap(src.modelMap);
    if(Array.isArray(src.voiceAliases)){
      USER_VOICE_ALIASES=parseVoiceAliasRows(src.voiceAliases);
      try{localStorage.setItem('RAJ_VOICE_ALIASES_V37',JSON.stringify(USER_VOICE_ALIASES))}catch(_e){}
    }
    const lists=parseFilterMasterRows(src.filterMaster);
    setFilterMasterLists(lists,{persist:true,rerender:false});v94PersistMaps();
    return filterMasterItemCount()>0;
  }catch(error){console.warn('Bundled V95 Filter Master failed',error);return false}
}
async function v95LoadHostedFilterMaster(){
  if(window.RAJ_FILTER_MASTER_LOADING)return window.RAJ_FILTER_MASTER_LOADING;
  window.RAJ_FILTER_MASTER_READY=false;window.RAJ_FILTER_MASTER_OK=false;
  window.RAJ_FILTER_MASTER_LOADING=(async()=>{
    // V95 ships a precompiled copy of FILTER MASTER + MODEL MAP + CATEGORY MAP.
    // This makes dropdowns correct immediately and removes the XLSX/CDN race from first load.
    if(v95ApplyBundledFilterMaster()){v95MarkFilterMasterReady(true);return true}
    // Fallback for custom deployments that omit the generated JS file.
    const ok=await refreshHostedFilterMaster();v95MarkFilterMasterReady(ok);return ok;
  })().catch(error=>{console.warn('V95 Filter Master boot failed',error);v95MarkFilterMasterReady(false);return false});
  return window.RAJ_FILTER_MASTER_LOADING;
}

async function refreshHostedFilterMaster(){
  if(!/^https?:$/.test(location.protocol))return false;
  const paths=['data/filter-master.xlsx','assets/data/filter-master.xlsx'];
  for(const path of paths){
    try{
      const response=await fetch(path+'?v=98&ts='+Date.now(),{cache:'no-store'});if(!response.ok)continue;
      const lists=await readFilterMasterWorkbookBuffer(await response.arrayBuffer());
      setFilterMasterLists(lists,{persist:true,rerender:false});
      return true;
    }catch(error){console.warn('Filter Master refresh skipped for '+path,error)}
  }
  return false;
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
  const seen=new Set(), originals=productImageCandidates(row), output=[];
  // Prefer optimized thumbnails, then fall back to the real product image.
  originals.forEach(path=>{
    const thumb=path.replace('assets/Products Images/','assets/Products Thumbs/').replace(/\.(webp|png|jpe?g)$/i,'.webp');
    if(!seen.has(thumb)){seen.add(thumb);output.push(thumb)}
  });
  originals.forEach(path=>{if(!seen.has(path)){seen.add(path);output.push(path)}});
  return output;
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
  ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter','subCategoryFilter'].forEach(id=>$('#'+id).value='');
  document.querySelectorAll('.filter-search').forEach(x=>x.value='');
  $('#searchInput').value='';
}
const BUILTIN_VOICE_ALIASES={
  'CHOTA HATHI':'ACE','CHHOTA HATHI':'ACE','CHOTA HATHI GAADI':'ACE','S GAADI':'ACE','S GADI':'ACE','TATA S':'ACE',
  'BHARAT BENZ':'BHARATBENZ','BHARATBENZ':'BHARATBENZ','EARTH MOVER':'EARTHMOVERS','EARTH MOVERS':'EARTHMOVERS'
};
let USER_VOICE_ALIASES={};try{USER_VOICE_ALIASES=JSON.parse(localStorage.getItem('RAJ_VOICE_ALIASES_V37')||'{}')||{}}catch(e){}
function compactVoice(v){return normalizeSearchText(v).replace(/\s+/g,'')}
function editDistance(a,b){a=compactVoice(a);b=compactVoice(b);let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return prev[b.length]}
function similarity(a,b){a=compactVoice(a);b=compactVoice(b);if(!a||!b)return 0;if(a.includes(b)||b.includes(a))return Math.min(a.length,b.length)/Math.max(a.length,b.length);return 1-editDistance(a,b)/Math.max(a.length,b.length)}
function canonicalVoice(term){const n=normalizeSearchText(term);return USER_VOICE_ALIASES[n]||BUILTIN_VOICE_ALIASES[n]||n}

// V41: voice can contain natural filler words ("Bharat Benz gadi", "KBX group",
// "1109 model"). Build useful candidates instead of forcing the full transcript
// to match one Excel value. User aliases have priority and can be maintained in Excel.
const VOICE_FILLER_WORDS=new Set([
  'GADI','GAADI','GAADIYA','GADIYA','VEHICLE','GAADI','WALA','WALI','WALE','KA','KI','KE',
  'MODEL','SERIES','GROUP','BRAND','PRODUCT','ITEM','PART','NUMBER','NO',
  // Natural request/command words: "mujhe KX 525 ka rate do" -> "KX 525".
  'MUJHE','MUJE','MERE','MERA','MERI','PLEASE','PLS','CHAHIYE','CHAHIE','CHAIYE','DENA','DE','DO',
  'DIKHAO','DIKHA','BATAO','BATA','SEARCH','FIND','DHOONDO','DHUNDO','NIKALO','LAO','LAAO',
  'RATE','PRICE','MRP','COST','VALUE','KITNA','KITNE','KYA','HAI','KAHA','KAHAN','WANT','SHOW','GIVE','ME','THE','OF'
]);
function voiceCandidates(term){
  const n=normalizeSearchText(term);
  const out=[];const add=v=>{v=clean(v);if(v&&!out.some(x=>normalizeSearchText(x)===normalizeSearchText(v)))out.push(v)};
  add(canonicalVoice(n));
  const maps=[USER_VOICE_ALIASES,BUILTIN_VOICE_ALIASES];
  for(const map of maps){for(const [spoken,target] of Object.entries(map||{})){const key=normalizeSearchText(spoken);if(key&&n.includes(key))add(target)}}
  const words=n.split(/\s+/).filter(Boolean);
  const useful=words.filter(w=>!VOICE_FILLER_WORDS.has(w));
  if(useful.length)add(useful.join(' '));
  // Try contiguous phrases first (BHARAT BENZ), then individual significant words.
  for(let size=Math.min(4,useful.length);size>=2;size--){for(let i=0;i+size<=useful.length;i++)add(useful.slice(i,i+size).join(' '))}
  useful.forEach(add);
  return out;
}
function bestVoiceFilter(term){
 const queries=voiceCandidates(term); let best=null;
 // V42: GROUP is not auto-searched from Universal/Voice. Other filter dimensions
 // can still be recognized (CAR -> SEGMENT, BHARATBENZ -> VEHICLE, 1109 -> MODEL).
 const fields=[['segmentFilter','SEGMENT',FAST_ROWS.flatMap(x=>segmentTokens(x.segment))],['vehicleFilter','VEHICLE',FAST_ROWS.map(x=>x.vehicle)],['modelFilter','MODEL',FAST_ROWS.map(x=>x.model)],['categoryFilter','CATEGORY',FAST_ROWS.map(x=>x.category)],['subGroupFilter','SUB GROUP',FAST_ROWS.map(x=>x.sub)]];
 for(const q of queries){const qn=normalizeSearchText(q);for(const [id,name,vals] of fields){for(const v of new Set(vals.filter(Boolean))){const score=similarity(qn,v);if(score>=.82&&(!best||score>best.score))best={id,name,value:v,score,query:q};}}}
 return best;
}
let USER_FILTER_SCOPE_ACTIVE=false;
function clearUpperFilterScope(){
  ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter','subCategoryFilter'].forEach(id=>$('#'+id).value='');
  document.querySelectorAll('.filter-search').forEach(x=>x.value='');
}
// V44: remove known group/brand names from a longer natural query before searching
// product data. GROUP itself stays excluded from Universal Search, but spoken phrases like
// "Aayub group ka AA 1002 product" become "AA 1002" instead of failing on AAYUB.
function stripKnownGroupWords(term){
  let n=normalizeSearchText(term);
  if(!n)return '';
  const groups=[...new Set(FAST_ROWS.map(x=>x.groupN).filter(Boolean))].sort((a,b)=>b.length-a.length);
  for(const g of groups){
    const re=new RegExp(`(^|\\s)${g.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=\\s|$)`,'g');
    const reduced=n.replace(re,' ').replace(/\s+/g,' ').trim();
    if(reduced)n=reduced;
  }
  return n;
}
function smartSearchPhrase(term){
  let n=stripKnownGroupWords(term);
  if(!n)n=normalizeSearchText(term);
  const words=n.split(/\s+/).filter(Boolean);
  const useful=words.filter(w=>!VOICE_FILLER_WORDS.has(w));
  return useful.length?useful.join(' '):n;
}
function bestGlobalVoiceQuery(term){
  const candidates=voiceCandidates(term);
  const smart=smartSearchPhrase(term);
  if(smart)candidates.unshift(smart);
  // Prefer the longest candidate that already occurs, so product codes/models win over
  // generic one-word fragments. Compact comparison ignores spaces and punctuation.
  let found=[];
  for(const c of candidates){const n=normalizeSearchText(c), compact=n.replace(/\s+/g,'');if(!n)continue;if(FAST_ROWS.some(x=>x.allN.includes(n)||(compact&&x.allCompact.includes(compact))))found.push(c)}
  if(found.length)return found.sort((a,b)=>normalizeSearchText(b).length-normalizeSearchText(a).length)[0];
  return smart||candidates[0]||term;
}
function runUniversalSearch(term){
 const q=clean(term);$('#universalSearchInput').value=q;
 if(!q){$('#searchInput').value='';applyFilters();return}
 if(FAST_ROWS.length!==allData.length)buildFastRows();
 // Only a filter explicitly changed by the customer creates a search scope. Programmatic
 // defaults/auto-selections must never trap voice search inside one group.
 const scoped=USER_FILTER_SCOPE_ACTIVE&&hasActiveUpperFilters();
 if(scoped){const cq=bestGlobalVoiceQuery(q);$('#searchInput').value=cq;applyFilters();$('#voiceStatus').textContent=`Searching selected filters: ${cq}`;return}
 // Global voice/universal mode: remove any programmatic/default selection, then search
 // the entire workbook. Clear spoken filter names may auto-select their correct field.
 clearUpperFilterScope();
 const best=bestVoiceFilter(q);
 if(best&&best.score>=.82){$('#'+best.id).value=best.value;cascade();applyFilters();$('#voiceStatus').textContent=`Matched ${best.name}: ${best.value}`;return}
 const cq=bestGlobalVoiceQuery(q);
 $('#searchInput').value=cq;applyFilters();$('#voiceStatus').textContent=`Searching all groups: ${cq}`;
}


function filterSearchTerm(targetId){
  const input=document.querySelector(`.filter-search[data-target="${targetId}"]`);
  // V104: search fields inside checkbox dropdowns only search dropdown options.
  // They must not act as a second product-row filter.
  if(input&&input.classList.contains('v104-panel-search'))return '';
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
v94RestoreMaps();

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
  const shareBtn=$('#priceListShareBtn');
  const card=$('#selectedCatalog');
  if(!title||!status||!catalogBtn||!priceBtn||!shareBtn||!card)return;

  currentCatalogGroup=clean(group);
  currentCatalogUrl=configuredCatalog(currentCatalogGroup);
  card.classList.toggle('catalog-ready',!!currentCatalogUrl);
  card.classList.toggle('catalog-fallback',!!currentCatalogGroup&&!currentCatalogUrl);

  const hasGroup=!!currentCatalogGroup;
  const hasPricelistRows=Array.isArray(filtered) && filtered.length>0;
  catalogBtn.disabled=!hasGroup || !currentCatalogUrl;
  // Pricelist works for a selected group as well as All Groups.
  priceBtn.disabled=!hasPricelistRows;
  shareBtn.disabled=!hasPricelistRows;
  catalogBtn.title=currentCatalogUrl ? 'Open selected group catalog' : 'Add this group Google Drive link in js/catalog-links.js';
  priceBtn.title=hasPricelistRows
    ? (hasGroup ? 'Download the complete current filtered group as PDF' : 'Download all currently filtered groups as one complete PDF')
    : 'Current filters me koi product nahi hai';
  shareBtn.title=hasPricelistRows ? 'Share the complete current filtered pricelist PDF' : 'Current filters me koi product nahi hai';

  if(!hasGroup){
    title.textContent='All Groups Pricelist';
    status.textContent=hasPricelistRows
      ? 'Current filters ka combined PDF ready hai. Har group apne relevant columns ke saath separate pages me print hoga.'
      : 'Current filters me koi product nahi hai.';
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
function formatGstForDisplay(value){
  const raw=clean(value);
  if(!raw)return '';
  const match=raw.match(/-?\d+(?:\.\d+)?/);
  if(!match)return raw.replace(/^GST\s*/i,'').trim();
  const num=Number(match[0]);
  if(!Number.isFinite(num))return raw;
  return `${Number.isInteger(num)?num:num.toString()}%`;
}
function displayFieldValue(row,column){
  const value=getField(row,column);
  return keyOf(column)==='GST'?formatGstForDisplay(value):value;
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
  return `<tr><td class="serial">${serial}</td>${columns.map(column=>`<td class="${printCellClass(column)}">${escapeHtml(displayFieldValue(row,column))}</td>`).join('')}</tr>`;
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
      output.push(`<tr class="pdf-group-heading ${visual.className}" data-group-level="${visual.depth}" style="--view-indent:${visual.indent}px"><td colspan="${columns.length+1}"><span class="pdf-group-title">${escapeHtml(title)}</span><span class="pdf-group-count">${total.toLocaleString('en-IN')} Products</span></td></tr>`);
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
function buildPrintGroupSection(groupName,groupRows,index){
  const rows=sortRowsByFields(groupRows,viewByFields(groupRows));
  const cols=visibleColumnsForRows(groupRows);
  const fontSize=cols.length>15?'6.8px':cols.length>12?'7.3px':cols.length>9?'8px':'8.8px';
  const cellPad=cols.length>15?'2.8px 2.2px':cols.length>12?'3.1px 2.4px':'3.5px 2.8px';
  const widths=printColumnWeights(cols);
  const colgroup=`<colgroup><col style="width:${widths.serial}%">${cols.map((c,colIndex)=>`<col style="width:${widths.columns[colIndex]}%">`).join('')}</colgroup>`;
  const head=cols.map(c=>`<th class="${printCellClass(c)}">${escapeHtml(c)}</th>`).join('');
  const output=[];
  appendPrintHierarchy(output,rows,groupRows,cols,{value:0});
  const logoId=`pdfBrandLogo${index}`;
  const logoCandidates=logoCandidatesForBrand(groupName);
  const logoScript=`<script>(function(){var c=${JSON.stringify(logoCandidates)};var i=0;var img=document.getElementById(${JSON.stringify(logoId)});if(!img)return;function next(){if(i>=c.length){img.removeAttribute('src');img.style.visibility='hidden';return}img.src=c[i++];img.style.visibility='visible'}img.onload=function(){img.style.visibility='visible'};img.onerror=next;next()})()<\/script>`;
  const html=`<section class="print-group-block" style="--pdf-font:${fontSize};--pdf-pad:${cellPad}">
    <div class="print-head">
      <img class="company-logo" src="assets/company-logo/raj-group-logo-optimized.webp" alt="Raj Group">
      <div class="title"><div class="kicker">RAJ AGENCIES</div><h1>${escapeHtml(groupName)}</h1><div class="sub">LIVE PRICE BOOK</div><div class="meta"><span>COMPANY LIST DATE: ${escapeHtml(listDateForRows(groupRows))}</span><span>LAST UPDATED: ${escapeHtml(lastUpdated.toLocaleDateString('en-GB'))}</span><span>${groupRows.length.toLocaleString('en-IN')} PRODUCTS</span><span>${cols.length} COLUMNS</span></div></div>
      <img id="${logoId}" class="brand-logo" alt="" style="visibility:hidden">
    </div>
    <table>${colgroup}<thead><tr><th class="serial">#</th>${head}</tr></thead><tbody>${output.join('')}</tbody></table>
  </section>`;
  return {html,logoScript};
}
function buildLightweightPrintHtml(){
  const selectedGroup=clean($('#groupFilter').value);
  const rows=sortedRows(filtered);
  const grouped=new Map();
  rows.forEach(row=>{
    const group=clean(getField(row,'GROUP'))||'OTHER';
    if(!grouped.has(group))grouped.set(group,[]);
    grouped.get(group).push(row);
  });
  const groups=selectedGroup
    ? [[selectedGroup,grouped.get(selectedGroup)||rows]]
    : [...grouped.entries()].sort((a,b)=>natural(a[0],b[0]));
  const sections=groups.map(([groupName,groupRows],index)=>buildPrintGroupSection(groupName,groupRows,index));
  const base=escapeHtml(document.baseURI);
  const documentLabel=selectedGroup||'All Groups Filtered Pricelist';
  const safeTitle=escapeHtml(safePdfName(documentLabel));
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${base}"><title>${safeTitle}</title><style>
    @page{size:A4 landscape;margin:7mm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-size:8px}
    .watermark-layer{position:fixed;inset:0;z-index:20;overflow:hidden;pointer-events:none}
    .watermark{position:absolute;left:50%;top:57%;width:78vw;height:68vh;max-width:none;max-height:none;object-fit:contain;opacity:.072;pointer-events:none;transform:translate(-50%,-50%) rotate(-10deg)}
    .page-content{position:relative;z-index:1}
    .print-group-block{font-size:var(--pdf-font,8px)}
    .print-group-block+.print-group-block{break-before:page;page-break-before:always}
    .print-head{display:grid;grid-template-columns:95px 1fr 95px;align-items:center;border-bottom:3px solid #f5b00e;padding:0 0 5px;margin:0 0 5px;break-after:avoid;page-break-after:avoid}
    .company-logo,.brand-logo{width:88px;height:50px;object-fit:contain}
    .brand-logo{justify-self:end}
    .title{text-align:center}
    .kicker{font-size:11px;font-weight:900;letter-spacing:.12em;color:#dc6c0b}
    h1{margin:1px 0;color:#0e337e;font-size:18px;line-height:1.05}
    .sub{font-size:8px;letter-spacing:.18em;font-weight:800;color:#0e337e}
    .meta{display:flex;justify-content:center;gap:5px;margin-top:4px;font-size:6.7px;font-weight:800;flex-wrap:wrap}
    .meta span{border:1px solid #7bb8ee;border-radius:4px;padding:2px 5px;background:#f3f9ff}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:var(--pdf-font,8px)}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{break-inside:avoid;page-break-inside:avoid}
    th{background:#0e337e;color:#fff;border:1px solid #355a91;padding:var(--pdf-pad,3px);font-size:var(--pdf-font,8px);font-weight:800;white-space:normal;overflow-wrap:anywhere;line-height:1.08}
    td{border:1px solid #aeb9c7;padding:var(--pdf-pad,3px);line-height:1.15;background:rgba(255,255,255,.90);vertical-align:middle;overflow-wrap:anywhere;word-break:normal}
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
    .footer-note{text-align:center;margin-top:4px;font-size:7.2px;color:#4a5568}
    @media screen{body{padding:10px}}
  </style></head><body>
    <div class="watermark-layer" aria-hidden="true"><img class="watermark" src="assets/company-logo/rajgroup-watermark-93kb.png" alt=""></div>
    <div class="page-content">${sections.map(section=>section.html).join('')}<div class="footer-note">System-generated pricelist. Please confirm Rate / MRP and all details before use.</div></div>
    ${sections.map(section=>section.logoScript).join('')}
  </body></html>`;
}

const FAST_WATERMARK_JPEG_B64='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dlTdGLW+jqupr9MPeI2VsgLmd25w/sWtA8zgNk5AnBGHcl2Q0YDo5Gd5A758bvPzHkVcxm31tqk0zqCmhuNprYnQD0loeyRh5GOQHr5Lffs89pk6UlY375UZbvi5+ZKXpGfThS34coTU9JjXXLhukt6a5uz5r9K22r3S07uzoWPUNic6GZhEVbQSnMtHNjJY7zHi1w5OHxA3hcNav0bqzslbs02v9FSVNy0LWzCnqKeRxcYmOP8AuaYn2/vUp559V35XZ2l9TWbWOkKDU1gq21VvrohLFIOo82uHg4HII8CCFtnULOnTxXtnmlLh0p/lfWvNEXbVpSzTqrE1x6+tdXoZdERRhlhERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAYfVep7RozRVz1TfqkU9ut0DqiZ564A5NHm4nAA8SQuctktE3rXGv6/tK7swx0xqGmXT9uqjllBTAerOQfm4byZ73P6uC2zcC1zb2b3U223E77iNLPiuOpXA+rXVZHHT0OfEBuJHjyc0cjhVd49XsrKsaAtErYqKnYJLrJFyDWgAsgGOmeRI9w811axrNLQ9OnXn96S78c0V+9xfVjrMrS9Lnql3GjHgt+ejpfdwXWR1ujuFV6vvoqKd747bE4stsDuWB0M7h+M78HPQfFRvBThmS/wBYnmSefNX9e2SprXVEkZa3OGjHIDoB9SoYAOV57ub2reVJV6zzKW9/JdiN/WNnSs6MaNFYSX6/mfVdW+nlqawNijLyOZx4K1AJIAGSVS1Pf7zZ5rbpHSFd6Bdq2lkuFZXhjXmKMEshjHECBxvBz44b7Vl6Jol3rt/S0yxS95Ubw3lJJJtttJvCS6OojNpNfttBsKmoXX3Ymz1tmo7tp+sslygE9LWxGGeMkjiafAEcx71AuqdHa20Ox9VbauW+WmLOaecllRE3ww8cngDzAPsU1Q6/tNNtNbNXXmVzamelYJIGNHHLUD1XtaPa9rvcFtGgNhNZ7o1FPqvdWtqbJp2Qd5S6apnOinlbz4TMeXdgjBx84+PD0Vm9n95tHo9/VhYS5EIyamn91uLw93T1rHyKhtZR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OS2UAAYCLq1DVa980p7orhFcEdltZ07dPk72+LfFhERRhlBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAWha92X2z3KY9+rdJ0VVWFhY24QgwVTB7JWYd8CSPYt9RfcKkqb5UHhnDipLDOMdV9hFwdLPoXX7m5dmOjvlPxADy76LB+JYf51Dl12A7Qe2VWbhbLBdiG+sa3S1Y6U8ufNsZbJ4Z5s+temKKbobSXtNcmbU10SWSPqaXQk8xXJfVuPMu39pffjREvydc9VV4ew8JptRUQdID1xmVrZM8/ErfrV25twIInsuek9N3Bxxwvp3zU/wBY4ng59mF3ZW2y23OIRXK30tYwZw2oibIBnkeTgVo102H2YvMYZX7X6WOCXZht8cJyfawArIesWNX+/tFn9l49D4VjcQ/u6z71k5xh7djJKWNtz2rbNKB63d3UcA9wdCSr+m7cOk3Y9N2sro/8TVQyfta1SzcOydsJcJRIdDClI8KOvqYG/ZbIArF3Y82Fd00zcW888rvVf6RcfadFfGjJd/8AMe6v1wqLwIvqO3NYYqvNv2nqJIh82SW4xRP+oRu/asXce3dfXyu+SNubfAzHqmruL5SPeGsb+1TTH2Qdg2Oa46Qq5Mfj3esIPvHerO0/Zp2IppGSM2ysjnMOR3zXyj4hzjn4p9r0aP3beT7ZfzHub6XGql3HH147au79XM001Zpq0DBHBTUXEXeWTK93P3fUtd+6DtJ7vt9Hhm11f6WT1C2lifS0p549ZzGxxfhYOT06r0VtG32g7A0ix6K09bc4yaS3QxE46ZLWjK2Nc/09b0t9taxT6XvOP6OqT/vazfZuPP8A0h2JNy7wY59VXazaWpnkOkhjJranw8G4jB6jPGeniuhtBdkXaPRksNdc7fPqu5R4cJ704SRNcPFsAAj69OIOI81PSKPu9bvbrdOeF0LcvIyaNhQo74x39PEpwQQ01MynpoY4YY2hrI42hrWgdAAOgVREUSZgREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBFb1lfQ26mNRcK2npIR1knkEbR8ScLWRurteZOAbkaRLs44ReKfOfL56+405S+6snDaXE25FaUN1tl0j7y23KkrGYzxU8zZBj3tJV2vlprichERcAIiIAiIgCIiAIiIAiwd31po+wSiK/arsdreeja6vigJ+DnBfm1630XfJu6sur7DcpM44KO4RTH6muK+/dzxnG445S6TPIiL4OQiIgCIiAIiIAiIgCIiAIiIAiIgCIo03o3KuG3+lbfQaXtsV21nqKrFssFtkdhkk5GXSyHwijbl7j7hkZygJBuFzttppPSrpcKWhgzw97Uytibnyy4gKztmqNM3updT2bUVpuMzMl0dHVxzObjrkNJPiFxxrqfb/bDc2z2fe/Seqt7dxr5R/KTTT07aqjpxxPaYaSjLw1jW92TkMJIGSRzAs6HUnZX1vuBQ6Muu0+ptndW1kjW2q6egfI1QyZxwwskidyJOAONpaSgyd0ooP2w1lrTS26c+yG61yF3unorrhp3UgjEfyxRsID2StHIVEfLix84c/aZwQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBQruzGyp3l0jTVIfLTeg1b3Q8RDXHijAJGfapqULbquDd7dJkn/wAnVnL9KJVLbqUo6Fcyi8PHzRMaD/jY9kv9rPrdL6RfEHOts/EeZxM4fzqoNMaSDcfJc+OnOZ3P9auIZG9yBnpyWs6115bdEwwy3J0TGS9HSOcBny5NK8uUL6/rzVGlJuT4LLLXFVpy5MZvx/mZ4aW0aRztVR8J3f0q8pbBZKd3HaLldLPNjAdDUODc+0ZwfiFFdHvrpqsn7uOej64w58jf1lmFIVnv9vvVOJKST1sZ4CQeXmCORHuWfO81bT5KdZSXbleaaZzWtrhQzKTa7eUu9bzZIdX37SkgGsHxXK0EgC70sXC+HyMzByLfNzcY8R4qRI5I5YmyxPa9jwHNc05DgehBUb0k7HtdQ1YElNKOBzXjIGVV28uMlq1DctAVDnGKijFX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iIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAvn4WF9Tx6IAiIgCeCJ1GUAREQDxREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBE+KIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAvn4XivqePX4IAiIgCIiAImOeUQHzHrZ5r6iIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCeKJjnlAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAETxRAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAU+/g+mj+0E7+D6aP7QREA7+D6aP7QQzwA4M0Y/SCIgPvfQ4z3rMfnBfO/g+mj+0ERAfRNEc4lYcdfWCd7F9Iz6wiID73kZxh7efLqvhmiHWVg97giIB3sWT98Zy68+iCaFxAErCT4BwREA76EEgysyOvrBGyxvzwyMdjrg5REB97yPIHG3nzHNA9hGQ9pHnlEQHzvocZ71mOmeIL9F7G/OcB48yiID53kfCHcbeE9DnkvvE0gniGB45REB8a9jyQ17XEdcHOEL2NOHPaD7SiIAJIyzjD28Pnnkvhmib86Vg97giID7xsJwHNzjPVfBLE7HDIw56YPVEQH0vYASXtAHU56L4JYiSBIwkDJwQiIAZogATKwZ6esOad9Dw8XesxnGeIIiA+d/COs0f2gnfwfTR/aCIgHfwfTR/aC/TZI3AlsjSB1weiIgPz38H00f2gvvexcId3rOE+PEMIiA+d/B9NH9oJ38H00f2giID6JoS4NErCT0AcOa+95HjPeNx55REB+TPADgzR/aCGeEDJmjGfygiID9GSMMDzIwNPQk8igkjczia9paPEHkiIB3keAeNuDzByvz6RB9NH9oIiAd/BnHfR/aC+maJrsOlYD5FwREB87+HOO+jz5cQQVEBIAmjJPIAOCIgPpmhGczRjBwfWHJfTJGDgyNBxnr4eaIgPvE3l6w59Oa+GSMDJkaAOWcoiA+lzR1cB7yvjZI3Y4Xtdnpg5yiID4ZYh1kYPeUMsQzmRgxzPMIiA+iSMnAe0nrjKd4zl67efIc+qIgBkjAcS9uG9efRONmSONuR1GeiIgPnexlwaJGZPQZ6p3sQODIzOcYz4oiA/RIHUgL8maFpAdKwE9AXDmiID6HsLeIPaR5gr7xNAJLhy68+iIgPhkYDgvaDjOCfBfnv4R1mj+0ERAfRLEWlwkYWjqQRhO9iyR3jOXXmiID66SNnz5Gt95wvnfRFvEJWY8+IIiA+95GGkl7cDkTnovvE0dXDpnqiID4HsJwHtz5ZX3jb+MPrREA4m4zxDHvQuaDgkZ8kRAONuM8Qx55QvaBkuAHnlEQDibnHEPrQPYejgfcURAONgOC4fWnGz8Zv1oiA+cbPxm/WvvE38YIiAFzR1cByz1XwPYcYe059qIgPoc0nAcPrTib5hEQDI8wnE38YfWiIBxszjiH1oSAMkge9EQDjZ+MPrTib+MPrREA42fjN+tONn4zfrREA4m/jD604m/jD60RAC5oHNwHxXzjZ+M360RAfeNg6ub9acbPxm/WiID5xs/Hb9acbAMl7frREAD2HOHtOOXVfS9oPNwHxREB842fjt+tfeNv4w+tEQDib5j60REB/9k=';
function latin1Bytes(str){const a=new Uint8Array(str.length);for(let i=0;i<str.length;i++)a[i]=str.charCodeAt(i)&255;return a}
function pdfAscii(v){return clean(v).replace(/[^\x20-\x7E]/g,' ').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function b64Bytes(b64){const bin=atob(b64),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}
function truncText(v,max){v=pdfAscii(v);if(v.length<=max)return v;return v.slice(0,Math.max(1,max-2))+'..'}
const V77_COMPANY_LOGO_JPEG_B64='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAGuAk4DASIAAhEBAxEB/8QAHgABAAEFAQEBAQAAAAAAAAAAAAgEBQYHCQMCAQr/xABqEAABAwMCAwQEBwgHEQoOAwEBAgMEAAUGBxEIEiETMUFRCSJhcRQyQoGRobEVFiNSYnKCohczkrLB0tMYJENTY3ODk5SVo6SztMLD0RknNDdVVmR0deElJjU2REZHVGV2hIXE8DhXZuL/xAAdAQEAAQUBAQEAAAAAAAAAAAAABwMEBQYIAQIJ/8QATREAAQIEAgUIBQgGCQUAAwAAAQACAwQFEQYhBxIxQVETYXGBkaGxwRQiMtHwFTVCUmJykuEjQ4KiwtIIFiQlMzZTc7IXNFRj8SZEg//aAAwDAQACEQMRAD8A6oUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlN6IlK1TqfxOaQaUF2JfclROurW+9rtYEmSD5LAPI1/ZFJqKOoXpCNQb0XIun2PwMcjnoiRIAnSyPPqAyj3crnvrMSNBn6jZ0GH6vE5D8+q6s5iflpXKI8X4b10CW422hTji0pQkEqUTsAB5nwrX2VcQ2iGFrU1kmqWORXk/GYRNS86Pe21zK+quVmX6s6jamTjEyLMb7kUlavVhdu7J2PkmO0OQe4IFV9h4bOIzLkpOP6MZOllwbpcnNN21ojz/AA60H9Ws+MJQZYXnpgN5hYd59yxwrbYptAYXfHNdT9vHH1w3Wta0R8ku1y5d+sSzSNle4uBArE5npLdC46+WPjWZvgfK+BxkfUX96jRZ/R48TN39abCw+y77b/DL2t5Q+ZhpQ+usib9GJrY6N5Oo+DMnyRHmu/WQmvDTsPQcnRyev3BXDJubf+rst5xvSaaBL6TrDmUX2/AGHB+q9V/tHpFeF25rCJOVXa2E/wDvllkAD50BQqNj3ottXloPLqthpV4A22WB9PN/BWPXX0XPENHaU5bsx0/nqHcgyJkcn5yyoVTMlh1+QjEdvm1XjIsQ+21T2xnit4csvcS1Y9Y8ZWtXQIky/gqvoeCTWy7ZebTeo4l2a6RJ7B7nYr6XUH50kiuOuR8APFvjwVITplHu7Tfeuz3yM+o+5Dim1n6K1xcrVrrovJTKvmP5rhzjR3D0uBJioB8w8kBP0Lp/VyRmcpSaBPA2PhbwVwHMO+y7u70rjtpx6RHX/ClNImZMnJICCN27kkSwr9MkO/Q781S60m9JtpZlnYW/UOzysdlqCUrlReaXG38SW9g8ge5LgHnWMm8NVCUGtq6w+zn3bV9lpCmfSrLiWa4lnlnbyDDMkt16tzvRMmDIS8gK8UkpPqqHik7EeVXqsCQWmx2r5SlKV4iUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUr8JAG5OwqIPELxzWvH3JeGaMyI9yujSlNSb6QHYkVQ6KSwO59wfjftaSPlncDIU2lzVWjCBKtud/ADiTuCsahUZamQTHmnWHeeYDeVv7VjXTTrRu3pkZfeP59fQVxbZFAdmSQPFLe45U+a1lKB51BTWjjF1G1ID1tttxVitgdJaEKBIKX3wegD0gbLWTvtyN8ifD1++rNpfoHrNxGXd3J1uvsW2c9zzMlvJWsSD4loH15Kh1A5dm093MO6pO41g3DdwzdnJiRBleYsjrcJnK/IbX037Pp2ccb79GxzeZNbFPzOHMDQTGqMQRIw5xqg8OntPMFgpCHX8YRRCpsIw4R329YjjzDnyHOovaccI2uOqCWpUXHW8Zs73ri4X0KY5gevM3GSO1Xv5kIB/GqQmP8ABjw46cR0ydW8sk5bPQN1sSHzGi7+QjMHmI/ri1Uy/iDznK1rjwpItUJXTsoxIUR+UrvNa/dfflr7WS8txajuVLUSag3FH9IKamHGFSWWHHNo7vWPa3oUt0PQ3DgNESpvueG0/wAo7D0rfsHWTSPTiEbRpbp7Bgx0jlAhRG4bZ28TyDdXvJ3q0S+I/Nbi4fgUaFCQe7lb5lD51b1ppKNx3VcYbYBHSoWqmkDEVSJc+ZLb7m+r3jPtKkOXwjRpBgDIINvrZ92zuWx/2V89mq3dyCQAfBB5R9VVcXNsodO7t6lKPtcNYXCQDtV7hIHStJm6rPxzeLHe7pc4+aqvkJOGLNhNH7IWYw8wyNOxF2kfOqr/AAM4yROw+6ClfndawuK2OlXiGjqKxraxUJd14Ud7ehzh5rDTclKOveG3sCz2Fnt42AfQ0581X6PmEaY0WJ0AKbWnlUk9UkeRB6EVr+GjfbpV7itjas/IaRMT09wMObc4cHWcP3rrVJymyh2Mt0LDtQ+D7hU1eU7LvumVrt1zeG33Rs4NslBX4xUxypWfz0qFRN1a9FHlNsQ9ddENQY98YRutFpyFKY8jbwSiU0ns1Hy50I/OqezaQEiqqPcJcQgsukDyPdUw4Y/pB1GRLWVOHdvFhuPwuv3ELARKWG5wXWXGRq78RPCdnLZvEPJsJvPMEoU9uhuYlJ+Kl31mJSOnxT2g9gqdnDz6S7Dst7DHNaWmLBcCQ2m8x0KENZ223fb3Upjr3rBW313Jb7qlfkMHDtQLFIxXP8Zt14tUxPK9EnRkvsL9pSoHYjfoR1HhUHuID0W8N9L2XcM99+BvAl043dZalMKPU7RZR3W0e4BLvMn8pIroWiY4w3juFfXbr/WbkR94HMdYI51j4sOJBNorV0NgT4N0hsXG2zGJcWS2l1l9hxLjbqFDcKSpJIUCO4g7V71xo0Q4pNceD3MH9Pcvsk9qDFfCrli94SpkICj1dYOx7Eq6kON8zS+8pV8YdUdEtfdN9fca++LAryHHGQkTrc/siXBWodEuoBPQ9eVaSUK2PKo9dvup0aPTv0ntQzscNn5KltFwtjUpSsQiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJXlKlxoUZ2ZMfbYYYQpx11xYShtCRupSlHoAACST0Ar7ccQ2krWoJSkEkk7ADzrnxxKa/ZXxIZY3oXoW1JuFiekFiQ7EOxvjqT63r9yYaCNyo7JXtzH1AkKytHpEarx+TYdVjc3OOxreJ8hvWNqlThUuDyj83HJrRtcdwC+eJni0vWr9yVpVouucqwSnfgT0qEhXwq+rUduyZCfWEc+zZTvsR8bJ9HOD3EtNrS1qRxJSYalNJC4uPBQXHaIG6Q/y9H3P6mn8GnbqV+GY4Dptptwa4ojJcoej37UG4sFIcR/QwR6zUcHq20D0U4RzL92yRpjP9UMo1Mu6rlfpqi2DszGQSGmU79yU+H/7vvWKxzpPkcKyxo9AGe8/SceLjtA4DaRwCzmBtFs9i2YFYr2TL5DcBwaDtPEnIHidm1dRuJK75IlVgwtn7j2ZtIZR2YCXFtgbAdOiU7dyR0HtrVAWt5ZcdWVqV1JJ3Jq0RB1FXdhPQVyXWqvO1mMY85ELj3DoGwLp2SpElRoAgSTA0d55ydpVZHQOlViUgDurxjtkjeqkDatcebFfMW69G0AirhEQN9qomh3VdoTW+x2qhEdksdGyV2hNd1X2E13birdb2D0q+xWwNuo3rFRnrER3WVfEb6VeYjW21UMNvuq9RWuo2rGOeL5rATUVV0Rvuq8xU7Ab1RRWdhttVzZbIA6V63MrXJmJcqpT3UoO6v3Y1dNOSx118EV7xLjJguczLh28UnuNeVea6uZScmJCM2YlHljxsINiha141XC4Vh1h0P0i4lcZ+9zUfHm3ZTKVfAbiwQ1OgLPy47wG6fMoO6Fbesk1zL1L0S4huADPYmfWG+SJ2NIk9nAyeA1s3yqP/B5zJ3S2V9N0KJac+SpKgOXqb2i2lBaCQR3EVdfhVmym2ycZyy2xJ8Ge0qPIYltJdZkNqGxQ4hQIUD7a6e0b6aHuLaZXCLuyufYd07mu59h5liJumuh/pIOzgtXcKnF3h/EjYvgawxacwgMhyfagslDqBsDIjlXrKb3ICkn1myQFbgpUqQFcteJ/g5zXhYyhOv3DhLuScWtr/wAOfiRlqcl44od7jZO5eibEghW5QklK+ZskiY3B9xYWLiWw0ommLAzKztI+69vaVsh1B6JlsAnctLPQjcltXqkkcqlTfUKfBML02QN4R2jew8DzcCsUHXUhKUpWEX0lKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJQnYb0rV3EZrKxonptLyRhtEm9zVi32OGoE/CJrgPJukdShABWrbvCdu9QqrAgRJmK2DCF3ONh0lUo0ZkvDdFimzWi5PMFobjE1vyDLcib4X9IESJt4uikR8gciHZYS4kKTASofFKkHneV0CW9gT6ytsjxbGMB4KdN/hMoRrvnd9ZCHHEDYuqH9Cb8W4zZ237is9T12CfjRLTW0cNOndy1o1VLk3N76FSJSnyFSEuvq5/g6T/TnFnmcV4d3xUdY36gZtf9RMnl5RkUjtJMhWyG0n8Gw2PitoHgkD6epPU1jNIGNYWHJEUOlOu45ucPpO3uP2RsYN9rlbFo4wJExVP/AC3VWkQ25NbwH1R9o7XnaAdULzyvL7/m99kZBkU9cqXJXzKUroEjwSkdwAHQAdwqlj+FULQ86r2BXMMzEfGcYkQ3ccyTvK6oZCZBYIUJoDRkANgCvEMdBV8t7LT7mz8hMdpCFuuvKQpYbbQkqUopSCo7JBOwBPSrTBiSjDE8x3BGLnYh3b1Svbfbfz2qsl21u6QHoDji0IfQUFSDsQCPA1h4hbrjX2b7KymLuY4QznnbfYq32rXfQaWyVWe8X+/pSrlL0ZEWE0fd8IcC9vaUir+zqBpjcmDIbXktpaT1VIfisXCOgea1Q1rWke0o2qKepXC9kmLxpecYlOajRIe7jr7ziWWVD8VZUQkKPcPM+HjWBYXmL038NHecg3KIfwgbUUKSfMePf4eFddYH0baL9IdLtIsiMjNyceUJcDxzGr+7bmXJGNMXaQsHVAvjR2Phk3A1Bq24GxuOn4M/XJFri2hvIxkFpfsroKm7o1NbMRQHf+EJABHik9R5Viy+ILTCEssWq4XPJH0Hbs7HbXJKN/LtVcrfzgmo42nNQJTc+fYoN3fYdTKlW+Q2Pg92Sjv507cqJITvyPJHN3g7gkHpzotpvonnOAWLPsMtzci1XmKmSwFoCVNnuW2tI6BaFhSFDwKTWn1/+jtAw5M68zMuiQHH1CAGnodtz6LAjPmGbo2l+NiKWs2CIcZvti9x0t+yfyUYoeu+VS+U49ofeHEq+Ku5XFtk+8pQhRH01kEPWHiEBHwDSSytJ7wFT5Cj9SBU1YWB4pb0hEWyxkAd2yBV0bs1raACIDIA/IFWkLRZhqGM4Tj0vd5EL6mMST8x7RHZ71C6PrnxGxTzTNIrc8nyZuDyf3zZq7ROKLL4JAyzQu7oQPjLhymH9vmWlB+upffc2Btt8Da/cCqd/HrLISUvW2OoHzQK+omi/DjxZrHt6Ir/AAJI7lYmqTDttuweSjpYuKbR65LSxehcMcfWdtrpb3WEg+XaJ5mx86hW1LVf8XvVtVd7LfoUuClBcVJZktuNJSBuSVg7AAdTv3VdbvpHgl3BMqxx+Y+KUAGubvExqXiLudXrTvTe1x4uMWSSYN2fjnkVfpzZ3W04pPfFZUNuX5a0knpy7UaX/R/l8Rz7ZaRjlrdry9jXWbvs5uob8L3ueZYysYoZRpR0zHbc7gDtO4Z/AUtr/wAVumNsW8jGWrjlaWFFDk2AWo9uSsd6fhchSELP9bCx7a17kHpAsLxhoyb1hMVDAOxMXJmpDpPklAZAUfcr56gdleXSVRl3W9SlOojICWWhslCB8lttA9VA9gFZ/wAJ3DnF13ytGRah3NkojpEmPZXNxsxv6rikHqtJ8AOniryqT8W6M9GGiugumqnKGORkLlxe4noIAuegDitEodcxRimcJhRWwoY2gNBtzXde/TYdC6MaJ62Ytr1hYzrD7fdocAyVxeS5MJacUtIBKk8qlBSPW2CvEg+VZ6ateM4tZMOs7FksEJqNFZAAS2gJ3Pmdqr5UqNCivTZslmNGYQp1155YQ22gDcqUo9AAO8muDJ+LBn6i91PgmGx7vUh3LyATk2+0lTJCDocMCI65AzOxfLnjVKtRSeYd9Vbo2JB7xVG7VnrHYdqv4WayKw5C1KSbTdQlaFgoBWNwoHpyqB7we6uffFBw55Vwf6jROKLh4QuJi8aX29ztzKSpuyuOEBe6B8aA9vyLR/QiQRsOQomuslKuZJ2INZVZblAyO2yMZyCKxMZlMLjuMyEBbchlSSlba0nooFJIIPeCa6L0RaUIsrGbRao7W1vVYT9IfUdz/VPVwWHqtMsPSII6ff71bNBNbMX1/wBNbbqJjG7IkgsToK1hTkCYgDtWFkd+xIIV8pCkqHQ1sSueVjslw9HpxOR4iH3zonqg8IrTzilKRaJIJLaHFHuUzzEBR+PHWSd1MmuhiVBSQoEEHxFT5PyzIDw+Abw3ZtPiDzg5Ht3rAg3C/aUpVivUpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlEQnYb1HW244dceIKfqPfiHcM0vecs1gYc/apd2TsZks79ClpYS2D3czXsNbyy6VdouPy/uAkG6Po+DwSobpS+56qFqH4qSec+xJrQOv17haUaY2DQrBZC2Z9+ZMNTwP4VuCnrKkrI+W6oq3V4qWs15MVWHQ5ONPPNiGkA8Bvtzn2R0lVJSkRK9OwpBmwkE9WYvzD2j0DitP6+aqyNVssdVbX1HG7Otce2JB9WQodHJJ8+YjZP5I9prUjrSt+6swlWtqMymOw0ENNpCEJA7gO4VYZUYoJJTXLU9VotVm3zUY3Lj2DcOpdYUmTgUuUZKS4s1ot08SecnMq1JQQd9qrY6HHFJbaSVLWQhKR4qJ2A+mvhKDv3VdLCUMXi3vugcjcxhat/IOJJq1iOuFky/VaSFi1x1jhRNVL1YVySMbxlz73HWUgkBpnb4RPAHetEsqUfEshQ8K2JdL5DxduK29Dcul0uG4ttriLHaTNu9zn6hDI3BLh6bHpuTtUIU3e4Rctvs5L5TOj364KcJ6+uZC+YEHvB3IIPeCalDwe6w6Z4dl6mdSLar7nyW2mIt1PM8u0IRvyx3R1JibklC0jdvfZQ5diOuMW6E5CvSNPn6YNXkYTWxGtGcRrRk4favfWO0g8QuNMOaVJ6gzc9IzxuI0QuY5x9hxNiD9k5EcDcZXCkhpNw25FqBMiZhq8tEks+vCt6UlMKAD4MtHpzebit1nzHdUbuP7hitejma41qth+zULI5q7ZcWE7Dme7MrS5sPEpSoHz2Sa6Xuam6ZW3HRkq88xxmyBvnTN+6bHYFIG/RfNsfcOtc1ONjiAa1zy62Q7A08ziWOFxVrVIaLTtxkOAJcmFCvWQ1yjkbCgCQVK2HNsNh0f0CLLTsOHIQuTgw9thYDmPEk9e9YXF1ZhPlYj5x+tEfkBfMk8BwCjm26ppxLiFbKQQpJHgRU/fRh547OtGf6ZuvlTFlnxrxBbP9DbmIUHUDySHGebbzWfOufiifCpp+ifs0mZetUc3UlXwV1cC0sq8CW+0cV9S0fTUmY+fDNHLX7dYW6b+5aFgtj/AJS127NU3XRSlKVBSltKUpRFh+seWvYFpNmWaxlEP2OxTp7JA/ojbC1I/WAriXYn1vWeI444pxbiO0WtR3K1qJKlE+ZPWu1+teMuZppFmOJMp5l3iyTIKR7XGlJH1muIuINzI9o+589pTcmC85GdSrvCknYj5juPmqVdGUZjHx4f0jbsUe4/hudAhP3AlZRhOEx9S9XcBwCeoCFe70ll8E9FhKCsI/S5SPnrqxL4W8HVYmI1uZXEnxkhbEuOstOsuAdFIWnYpPuNcnYTsqFcYdzt8963z7fJamQprH7ZFkNqCm3U+ZCgOniNxXTbQvjcwLM8eiwNVJ8bE8mZbSiQ4/zC2zlAdXo7+xSkK7y2shSSdvWA3r3SLQJufiCbhs5SERquba9ukcD/APVTwTWZOBB9EiuDIgNxc2v0HiOCtkvUvPdE7qiyauMOXjHnFpbj5Ew0EvR9zsBKQPVUO78Inb2jxrBeL/XK0/cSDphjktMpF6aYuF+dbPRFtUd2Yx/KkK2JHf2SCT0WKzfiM4u9KoeMyrJhcO3ZndX0FoPvsFdqi7jbmdWoASD5NN783copFc88hym65Bc5F1vFwelSJMhUuVJfI7R94/GcXt0HQABI2ShICQABUaaP9AlNlcSw8VzEMw4UP1mwiMjE3PAOYa3aBs1rEZArJYxxsx0i6lybg6K7JzmnY3eMvpHZlsG1dDOEHUWfqRoTZpt4kqk3OxSJWPTXlHdTq4jnI2tR8VKZLRJ8Tua3A5vUWPRpsyZGh2RXV0K7C45jPkR9/FPZMJJHs5gfoqVrrJri/ShLS0jjSpwJQAQ+VcQBsFzcgdBJClSgxHvp0Axfa1RfsVvcFU6X3YzqXmVlC0HmSR3g1VuoIJ6VRuprQy9zCHsNiFscOzhYq6al6d4pxH6SXjTzK2k9lcWOTtkoBchSk9WpLe/cpKtlDzHMk9Cawzg1zjK5mDXLRvU88ud6VS049dd1E/C4oRzQpiSeqkOs7bK8Sgk9Say7GL0bNdUOOr2ju/g3vIJ8D8x/hr6y3BhY9X8f1tx9sIekRfvYyVtsDaXbnF88V9XmuPI22P8AS33fIV2Zozxj/Wyh8lMu/TQ8nfetk7oeMj9ocAtNqkl6FH9X2TmPd1eC2nSlK3VY5KUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlEWheI/ipZ4ebzZLTIwOTfRe4r8lDzc9McNlpaUlOxQrf44NagHpLYh79F5n9/G/5Gs/49tJ7hnulDGY2GE5LumEPuXFTDSeZx6AtHLKQkDvUlKUOgePZEDqa5yRlsymG5Ed1LjTqQtC0ncKB7iKmTBGGcP4gpofMMJjNJDvWcN+RsDw7wouxdX6xRJ3VgvtCcAW+qD0i9uKm//ullvA3Vo1NH/wB7b/kq+f8AdL7YBudHJo/+9t/yNQjcSKpnE9Olbc7Rzh8D/CP4ne9au3HVad+sH4W+5TiPpNLSDsrR+WP/AL2j+Rr9HpNLJ46Syh774j+RqB76e+qRw1YRcA0JuyEfxO96umYzrLh/ij8Lfcp/o9Jjj6vjaWvJ998T/IV7J9JVjah105Cfzr6B/wDj1zyWT315LWrzqzdgaiDZCP4ne9VRi2tO/Xfut9y6Ls+kixl07KwWI3+dkQH/AOPVYn0iWML25cTtPXzyhA+1iuaq3DvXi4+tCFKbQpxYHqoHUrV4JHtJ2Hz1RfgmitFywgfed71XZiitOIHLXv8AZb7l2g0J1sj644rccti2FNrgwrguA278OTIbfU2hKnFpUEp9VJXy77d4PlUUZeUvauamZVqe4pS7cJBs1jB7kw2T1WPLmOyveo1tfLWVcLvA+zjjJDV7FnbtnMkbKXc5u6pCx5kFbxB/IFa7wXFBjOEWWyKQEux4bZeG39FUOZf6yiPmrj/S/VoUGH6FKZNe4kC/0Rs+OddT6NJKJBgGdmjd9g29rZ5F3fYdqtVwh7g7CsanQDudxWxpVuJ39WrJMtW+/q1A0KLqqZ4EyOK16qGpCidqp73dbfjFjl3+6/8AB4qRyo32U86fiNp9pI7/AAAJ8KzF60LK+VKCSSAAB1J8q17b8Xf104g7VpVa93sfxd7tru4g7odeSQHR7RzbND2JWfGtnw9TH16eZKs2bzwCoVutQ6RJPmHbQMvjuUadUsTzHCMjiZvlln+B23PUKujK0NlKG3FElSSPA7evt+KrzBqht812K83LhSVNuIIU260sgj2giuz2s3DrgusGngwW+2hlxhllKGSByqbKR6qkqHVKh4Ed1cudW+BjXLSG5Pqwlk5PZAoqbaPKiS2nyKSQlfvQRv8Ai13XhDFMvIScOnTRtqANBPAZC64pxPQYlSmYk7BAu8kkbs81i0XUTJ2kbNzIqXO/txb4/bb+facnNv7d96tMqZJnvrlS5Dj7zp5luOKKlKPmSepqyfevrYw78GXpHfg4On/AHiPpA2+uvmXPyDFZrdvz/FLjYXXura5DCkoV7t+/5idqkWXr1PjvENkUXK0CNhyclgYghdlleQ3v4b1Pr0XeX2aBjeZaROJZaukK5ffDFV3KlwZKEIKvb2biOU+XOmoEKmQI0I3GRLZRFCebtir1SPYfH3CtscEkDVjNuIXFsz08hyLbjVilrZuNzcZ3TKirGz0cAkBfMNunyDsonmAFYzG0GUi0pzZh4a4Zt6R5HYshg+JNsqF4TLs2O+OI4LsRSg7utKgNTClKUoixrUnOrHpngd8zzI3kogWSE5LdB73Ckeo2nzUtZSgDxKgK4qBcmU9Kuc9CUTblJenykpGwS68srUke4q2rqLx1aTZpq5owm04FdzEutquTV0bjuDePN7NKgGnR4dVBSVdQFJBI8RytZuc+JeH8UzC1PWTI4Z5X4UhPLz/lIPiD39Cd/AmpY0cOkIbYoc/9O7ccvVHDiSdvUo4x6ydiMYWN/RNzJHHn5lW7bHaqmHdbja1FdvnyIyj3lp0p39+1Yzd8ujxZrdls0N673Z9XI1EioK1FXl6oJJ9gBPuq/p0a4ppURu5s6dpDUgcyWFrYS4gflJKwR8/Wt7nq/IU5/Jx4gB6QtJksOT9Sh8oyH6vPvX1Kuc24vdtOmPSXO4KdcKyPprEciuk+7XCPguJRXLjfru6mI0xHHMoKWduXp8o/UNyazuwcL/FHnMtFvftMawsOEJW448ncDx2S1zKP0j31O3g74D8c0XmpzTIt7rkBRy/C5CACgHvDaevID4ncqPifCtSrmOpaFAdCkzrOOXxZbXRMFxWxWxZuwA3BYvwvu3PhuVA0SzRAQ062JSZABDbjj2xWob+SyUn2cp8al26gEdCCCNwfMedYFxV6TuZfiaMlx6MkXqxq+ERykbFaQPWRv5EdPorz0IztOd4OyJDhM63JDTgV8YpA8fb/ALDX566VcKvkKs+oQ7lswXPv9va4de0c+QU+ST2zEk1zMnQ7NI4t2NPke1ZpIZ7+lW19JTv0q+PJGxq0yxtvUOOyNishLvJyVpfHsrY2B3o3S0GI8rmfg7NK37yj5B+gEfNWunztvVfg12FtyiOha9mp4MVe/dzH1kfrDb9KpB0YV00TEUJjj+jjfo3dfsnqdbqJX3VZX0qTcQM25jq29y11m/HXjGE5tkWDzMct6ZeO3FdveEu+/B1uEJSpK0o7BXqqSpJHrGrJ/uiWJAbnGbUfzckB/wDx60F6TDTP71NYbJqfAj8kLNYBiS1JGw+HxANifathSf7Uaia08T4/XX6P0HDNGqshDmSw3Iz9Z20bd650rlYrNOnHwWRrN2j1W7Ds3dS6SSfSQYsx+14PGe/Mv4P/AOPVOfSV42O7TdR918T/ACFc6wskbg17NqUe81nmYHoh2wj+J3vWDOKq03bH/dZ/KuhS/SXWBPxNK31+69o/ka/P90vs+3TSKYT7L2j+RqADZPfVayd/GryHgChO2wj+J3vVF2M60z9aPwt9ynh/ul9t32Gjk0//AHxv+Rr9/wB0tt57tGZ39/G/5KoMNp32qpQirxmjvD52wj+J3vVu7Hdab+sH4W+5TeHpK4ZOw0Vnn2/dxr+Sr9/3SyADsrRa4/37a/kqhMhIFfrUG7Xe7WzF8dgqm36/SUQrVDSPWeeWdgT5IT1UpR6AJJ8K8mdH+GpWC6PGhkNAuTru969gY3r0zFbBhOBc42A1R7l100T1QRrLptatRWrC7Z27qp8IiOvh5SUtPLa35wADuUE93jWdVimlWBxNMNOMc0/hOh5uxW5mGp4DbtnEp/COfpLKlfpVldc8TRhOjvMAWZc2HAXy7lOMuIggtEY3dYXPPbPvSlKVQVZKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlEX4QFAgjcGoMcSXAJc3rnN1B4c34cF+UtUifislQREecJ3UuKruZUTuS2dk7n1SnuqdFKyNMqs3SI4mJN5a7uPSrKfp0tU4JgTTQ5q4dZTPyfALgu0al4Hesdltq5VfCGCEE+aVHYKH5pNW1rNMYlJ3Rc0o38HEKT/BtXb+/wCIYxlMRcHIbHCuEdwbKakMJcSfeFAitIZbwGcNGWLW87pxboTrh3K4IVGO/wDYykVJUnpUmWtDZqEDzj4C0SZ0cyjjeXeW83xdcsl3yyuj8HdYqv7KKpV3CAeqZsc/2VP+2uhl29FtoTLKjbn75D37g3c1kD92DWNyfRQ6bKUewyrIEjw/nts/a3WQOkyTiDOGR8dJVmNH8ZmyIFBBc2J12lMn+yD/AG1TuTowH/CGv3Yqc7nonMJJ/B5jfgP6+1/J15n0TeG7f+eN9/t7X8nVB2kKRd9Eqq3A8w36YUEnJ8cno+3+7FbH4aMXY1E4g8AxFxKX2JN7ZlykA7gx4oVJcB9hDIH6VSjPom8RSd05hez732v5OttcNPAViHD9qMjUiLeLlOnx4T8NhMh5CkIDoAUrYIB32BHf3KNY+o45lZiUiQoIIc4EDrWQkcJRIEwyJENwCD2K38bt2Vkuo+lOkTaiWplwXeZre/QoSoIRuPzUv1dnowJJ5e871rPWW9i8ccMpTi+drF7E2w316JWWOY/rSTWex78y6BuoGuGdJc06YrGqNjRbvt5LqmgyUSBS4GoMi2/W7PwIX09CB8Ktsi3bk+rV8RMjOjvAr7LTTg3SoGo71yFmWTD4W1a3zq7MYFhd9zd8DntMQqiJPy5jh5GB+7UFe5JrI/RsaWmzYDcNS7s0pc/JJKltuuD1iwkkJO5/GPMr9KtRcZsyV96mI6f20/z1kt3U+pCe9SW+Vlr/AAjyj+jXQHSfEYmDaeWLF4TQbbt8JpgADb4qQP4Kn3RXTRCknzzhm42HR8eK0HG9TfHayBfIm/U3Lxv2LLqpplugz0FuZFbeSemy071U0qWVHSxpenOGrX2irDG3/MFYnqTw66Y6lWB+w37GYT8d5JSW1tjl38CPEH2jYjwNbRpXoJabjavCAciuZMT0WEo6pqjy8mefwNpz4QxBUtXb8xPVta+7kHT1h6x32O2256A4Dp3hWkGKtW2zxIVsgW6PspzZLTTTaR1O/QJSKzTYA77da1RkOQ6R67QL9pFcryorccXF5Uu9i4462ro7GXvssocT3eaTukpPXJGLNVRwdHLnMZa5Avqt2X/+9qx8WJLU4ajC1r331QTbWda9v/iwvJuNLA7blkKyWNhU+2/CkNTbirdKQ0VbKW0nvIG/NzK23AOwO+9UvHOb01pfZcmx+7yWGol2Q3I+DPqSh1h9pQSVcp2UOdKNt9/jVEPV7SHMtE8qGP5Sj4VElFS7Xdmmylie2O8fkOpHx2ydx3jdJ3qQ2G5gvWXhDzDB7g4H73iFuC0cx3W5HYIejrHtAaU2fzR51JEah06mCSrNKOvCDmh5OeTja54WuQRuNlFkvXapUnT1ErHqxXNJYALWLRfVG8g2BBudhzWj+Hdd8yTXbCLeq4zFoF1TKeHbK2KGW1ukEb93qCpHcSXFFkemWp0TFsWdbUxboKXJ6ClKgt90hSUqBHUJQB0BSfX7+laO4NURUa5QrvMX2ca1Wi4znHD3JQGggkn3LNaxzu75DqhqNPultgPXG75TdVJgQ2/jurcVs02PIBAG57glJJ6CtjnKVK1HEESNOtBgwYQvfZdxdt6Bc9i1+Rqk1T8PQ5eTcRGjxTaxzs0N2dJt3qfGgXFFYNcbhIxF6xSYd8iQzNkJabU5FLPME8xX/QySdglW++x2J2O2DcW/BVjOuFoVdrM2i35DFSTDmtI9dpXkdtuZBPen5xseteVin4BwN6Vpskt+NfdQ76kTbghk9ZEkjYFZ724zfxUDvVsSBupRGR8L/E+rVefMwzLlNNX5CVy4biUhCJTQ6rQB4KRvuB4o/NJMYTtGmHCLWqVCLJZh9U3zts1hfPVvt4X5jaVJCtwIL4NGqcYPmXD1sha/1SRlrW2cbbri9n4YuB/AtGbOxNuVuam3t1sfCZjyAXnFePX5Kd+5I6e89akqjGbChoMptUcISNgOQVc6VqcSK+M8xIhuTvW3MY1g1WiwVDGsdphnmjW9hs+YQKrQABsBsK/aV8L6XlKjtS47kZ5IUhxJSQaiTAZOjWv0mzEFq1ZAS8ynuTuo+sP3XX9Kpd1Hbi5xpwWi05xCRtIs8xClrHf2ajyn69j81adjyk/K9DjMb7bBrtPBzc/C4WWoscQZxrH+y/1T0Oy7jYrZUoJQpQSd096T5g9RVlmK76+rBd0XrFLVdkqBL8ZIUfaAKpZjvfsa4xnWtEw7VFgbEcwIBt1Xstkl4TmPLDtBt2KgkrHUmrFc5T8WO5JiKIfj7PtEd/Og86frTVylu+2rNKc333PTxq2hvfBiCIw2INx0hbFLQgciqTj2xCNqdwqXLKbe12kjHBFyqEQNz2aNu2HzsOu/QK5RNTGU/wBGRt4HmFdrdNbfAzfRdzDr0C7FdjTrBLSD1LO62tv7WpP1VEuR6JrAUvFETL8iLI6IK5TW+3hv+Cr9MMBY0gy1JZFjAkRA14t9pouoCxVhp85OFsM2LLtPUclBJmbGPTt2x+mKrWpMU90pge9xP+2ptf7k3hIP/ndfv7pa/k6+mvROYOD6+XX7b2SGv5Ot6bpCkm/QK1J+B5h/0woWtyofjOij3voH8NVbM61pP4S92xsfly0D+Gpmp9E5gIUCctvxHjvJa/k6usH0UmkzRBmZBfnfZ8OA+xAq4GkuUYMmFW7tH0d/60dihML9ibA3kZdaht4IWtw/QlJrxe1H05gnZd4nTF+CI0MpB/ScKa6GWb0Y/DxbVJXLtc+eU94k3F5QPzBQFbYwjhB4fMBdblWHTKxNyW+qX1xEuOA+fMvc/XVrMaU3WtAh+A8z4L2FozY43jxzbmt/L5rmnpzh2smtMtELR7SSS1GcISq+XvdMZkH5XMoBB9yQs+yugfC5wbY5oM+5m+UXdWVagT2S0/d3kbNQ21fGZioPxEnuKz6yh09UerUiIkCHAaSxDjNtIQNkpSnYAVUVo1bxbUa4NSM6zOA81uFFwpTaGdeXZd/1jme03KUpStYWypSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJWBaia76TaT3GJadQsyjWaZOYVJjtOsPLLjQVylQ5EKHf0rPag96SnFJkJGD6sMNLXBtzsix3MpG/Zof5XGVn2czax7ykeNZrD0jLVOpQ5SbcWsflcWvexttB3rF1qbmJCRiTMq0Oe0Xsd/Yt6njQ4ZQdv2VIf9wy/5KvscZfDORv8AsqQ9v+pSv5KubMUoeZQ60sLQtIUlSTuFA9xFeq2unSpdOiul7o0T93+VRAdK08DYwGfve9dITxmcM4/9qkP5oMv+Sr8Vxm8M6RudU4nzQZf8lXM6awdiPOrJKaKdxuapv0XUxgvy0T93+VXUHSbPRf1LP3veupqOMvhpWdk6oRv7gl/yVeqeMHhwV8XUyOfdb5h/1Vcl5IWO5ah89W2St7u7Vf7o1ZP0b05uyK/93+VZCHj6fifq2djv5l2Ba4tOHx/9q1DbV7rbM/kazLBNUcE1OjzpGDZA3dEW9xDMnlYdaLS1p5kghxKT1T1rh2+4+O59wfpmujXot46hpfmk5xalKeyVDe6jv0RDZ2/fGtaxJhGUosiZmE9xdcCxtbPoAWxUDEc5VZsQIzWhticgb97j4LTGWXsyOJ7VG8qcJKbg/EQd/kocQ2B9DQrI4uUqBADp+mtX5G+6NYtRJZJ/C3+cN/PaW7VU3cXUeNcW4ngek1KK88V3RQJJnyXABH0W+AW4oeWEAbufXV9iZWnYEud3trR8a9LTsdzVcMgeS2rZZGyTWqvp1yrmLSYUQ2sq3OQrOuLXS7HVfhGbe3b3VIPcP2ySr7UfRXTJlAbZQ2O5KQK5raXxVT+OPHg/1DEFCk7/AJNtb2+010sro/BMAS9Ghsb8ZBc6Y1AZUgwbA1vfc+aUpStsWoJSlKIsI1ryPI8U0syO94jZ5tzvTMJTcGPDb7R0urIQFpSO/k5isjyTXKp68zrJNDN0+H2qYhW4ROacjOhQPf64B338RXS3ia1suuhWGWzKbTZ4lxcm3VFvW3JKglKVMuL5hykHfdsD56jFdOPN7IoyoWT6M4xd2FjZTcpanEke5aVVKuA21mUlXx5GWbFhvOZLg12W7M7M+G9RXjyHSKhMsgT0w6G9gys0ubnvy35cdytWI8TMPJcVXppr3aHMtxmUEpRNSofdCEofFeQ58tSO8K3Cx5kdDt/ht4YrhjGSP6go1D+6OJ3SAti3MMxVNO3WBIb3HwtK0js9txslA3Kk824B5ajsc54c86vlvt974fbfjn3UnMRVzbPkT0AIDriUElAT2ZA5tyNuvmKmHxcZ1edKtGo6MNcXbVz50eyokMeqYrJbWdkH5JIaCAfDm6ddqqV9szDmYdMlIJlnTJs9pc0sOYzAbex42tfhfNUKC2XMtEqU5G9JbLC7DquDxkciTa44XvbjbJXKx8K+iWORbzb8Vt062y7va3bPMlR7s6uSmM4UlYHOpQSTyJ68vduO4mtCZRp/G4MWZuoEVTmS3q7OOW2xXiXFS3FsbCkAq7QA7KkOdQDsElKNum6kqjRC1Ry7Gbk3kdryOXDmQlF9MhLpBBHUlR+UPMHcEb710nzOfcMv4eZOSOYjGud2lY23eGLTItwmpVNDKXm0BhQPOQ5tsnbfcCrSr0+ewpMQoc1H5eDGI1muJF9W3tG5Nsxv5iLK5o87KYrlosWXl/R40EHUc2zra1/ZyaL5cOcG651WbDtYdeb9IuuKY1esnkzXiuTdn924vOfFcl3ZB28k77DoB4VJDR3gkyfT/J7RqRqTq3Es79kktzWoFnSEtFSe9D0l7YqSQSlSUpAIJG9R8y/ib14WfuZkeU5NjbTY7MRBbnLShsD5ISltAAHvrW87N5WRvdrcMqcubh71Pzi8r9ZRNbtHkarXYRgemQ4UIi2rDGtlstc6u7gAFqkrNU2hxBGEnEiRQb60Q6ufGwB38TddnY8iPLjtyojzbzDyA4242oKStJG4II6EEdxr0rWnDVPfuegeBTJC+ZarFFTv5hKeUfUkVsuoCmoPo0d8G99Ukdhsp3lovpEFkW1tYA9oulKUqgqyVhWslhbyPTi+WxaeYuRHOX84JJH17VmtUl3jiVbJMdQ3Djak/VXxEhiKwsdsIsvWuLCHDaFHDQ6+qnaXMIdXuuI8EdfIg1kcmXvv61a20SWqHjd+gk9I8zYfM6pNZg/J3361wbWIPIzjoQ3EjvKllsuHxnP4kHtAPmvSTI7+tWqS9uD1r9kP79N6oXnenfvVk2ESVlITA1bN4dbj2jGW2gq/4JeESEjyS9HbV9qVVdb/AMSeiWL3ifYL5nbEafbH1RpbPwSSstOgAlJKGyN9lDuPjWFcN8v/AMec+gk/Gj2qQB7S26k/YK55cYMJ21cVOpUVLy+V26R5Y9YjbtYTCz9e9d6aGKZBxDRZWBMOItD3W+i628HcoO0hT8ejzEWPLgE6w2gkZi+4jeuliuL3hzQdl6mRk++BLH+qrz/mxuGvx1Tgjbzhyh/qq5DR+0URu4r6TV3ioV03UfpqdoejWnv/AFr+1v8AKooiY/n4e2Gw9Tv5l1gPGXwzjp+yrC+aFK/kq+Txm8Mw79VIf9xS/wCSrlxFQTtvvV4iMk7Vet0WUwj/ABon7v8AKsfF0nT0P9Szv966XDjP4ZieX9lSH/cMv+Sr9VxncMqDsrVWF/cUv+SrnGxHJPWq1DOw7q8Oi2lj9dE/d/lVk7S3OtNuQZ2n3roaONLhiJ5f2VoW/wD1KX/JVs/Cs4xXUXHI2W4XeGrpaJhcSxKbQpKVlCyhQ2UARspJHUeFci8nukaw2t25SVD1QQ2jxcX4JHn/ALK6ecLWD3LTzQLDMZvTRauSLf8ADJyCNiiRIWp9aD7Ulzl/RrS8Y4Wp+HIMMy8VznuOw22W25Ab7LeMGYsncTuiOjQmsY0bRfM8M+ZbVpSlR+t/SlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESsc1DwHGtUMLu+BZfC+FWm8xlRpCAdlp36pWg/JWlQSpJ8FJBrI6V9Me6G4PYbEbF45oeC1wuCuPusGh2r3Cnen4t6tT2Q4Up0mDe2Gz2JQT0DhG/wAHc80K9UnqkkVjFu1Jw+5Np5rj8CcUPiSk8o+ZQ3SfprtLJjR5jDkWWw2+y8kocbcSFIWk94IPQj2Go9aj8BPDZqI89OXg6bFOeJUqRZHlQ91HxKE/gz+5qUKRpKjy0MQp1utbePdl3HqUaVrRtJ1CIY0u7UJ+Ocd1+dc8jLhzUc0KXHkJPUFp1K9/oNWqay4NyWlfualPk3onMbUpbmHaqXqGSd0omw2XwP0kchrXl29FzrVbyfuDq5BkJHcHI8ho/qrUK2tmkilxW+vl2+5ayNGs9APqPBHR+fktAy0KG+6TVnldPCt3yvR08UsclLOa2t0D/pEkfag1bnvR68VSen3w2lz3yHv5OvH46pD/AKSvIWCalD2271o2QrbeukXouJCHNH8sZHxm8oKj7jEj7fZUST6O/ilWdjeLIoHxL7v8lU2+AXQTUrQLD8rsmo023yXbrc2ZsVURa1BKQz2agrmSnrulO229anizEUhVKcYEu67rgrasO0Kaps4IsUZWIUQswZVG1RzxlwbKbym6tke6Ssj6lVToO6ayfW60rs2vupMBaCnnyBU1O/4khhpwH6SqsYbHz1xXX2cnUYzDucfFd9YbiCPRZWIN7G+AVSyCKqDuW1J8wRXiwPGqgVrr3WKypyK2Fp2hMHjTwa4Hoi6WmMUnzK7WB9qDXRquacy4Cw6j6IakqPIy0qJBkOeA7CSuOvf+xuJrpWO6p0wNMiPSw0bj5Bcy49lzBqDHne23W0lp8F+0pStyWjJSlKItJ8X2l+TasaOP2DDYLUy9RblDnQ47jwaS4UrKFgrPROzbiz+jUX4fAxGw+1JyXX7Wy1YzASAVRrS2FOLPihLz3xlexDZNdCyNwRXKHibx/UXBNYLrY9Q75cbwl9S5lluk11SxLt6lersT0SpvfkWkbAEA7bKFSHgeYnJ55pMOb5GHm7IDWdsuATsyH5FaHjKXlpRgqbpYRn+zmTqt4EgbfjNZlcdSdAdNFGNoppbGnTmOoyjKk/DZQI+Wy07ulsjbcKIG34tSswfPcK4gdErZZNb7fCgffWw403FuEhMdVzbaUnlmx+oUjmVspB6HmSSncbGoncOugtoy2wP666yJVC01siDLjx3QUqvq0Hodu8x+bZIHe6rYD1d98TzrML/xA6oxYqW/gq8juEWy26G30RDiqcCENpA6AIQVKPt5jWzT1FptXe+DJkhsvdz45Jc4uA9kEnO202sBbK11q0pVqlSAyNNAF8ezWQQA1obfNxAGV9g3nfeylrjfo8dHLNk0e/3fJcoyK2xXkyGLTcZTZiqKTukOlCAp5I6eqo7HbrvVz4j9T5GaYvM040MyaFcMmaW3KkRIkjkcmRmiVOR4joIQt8FKFcnMN0pUAd+lRj1czmdhnExcrlbp8lqFjWQRC0wH1FtLUVLKCnl32+IhQPTxNfPEvhbmkGsK5mMvLj2m+AX+yPMKKA0Fr3Whsju5HOo27krRVlIYdjzE/LRZ+ZL4j4evD1hcBwsdVwJNwAQcrXz4K8qWIIcGRmIUhLBsNkTUiAGxLTcawIAtcgjO9slQYzxfa04+4uBKvpu8dhZZk26/Re3La09C2sOAOIUO4gkbeVbFh8SHDdnrSYus/DnYy+4eUy7Zb2XipR6DZJCXASfAKUetflks+m3GNaUwchnR8U1igMcka9MNAN3tpA9UPtjYOkD4w6LT8ZB23SKPhy4TtRE66JGquKqgWbCXEXBT4WHIt1lg7xksL71NgjtFbgEFKUkdTV9VY1A5GM2qywgzUMbG3brHcWkWDgTxFxv2K3pMCtcpBdS5gxZZ52us7VG8OBuQRzHPrU9cUx6yYnjVsxrG7aLfa7ZFbjQ4oBHYtJTslGx69B0q7UpULEkm5UwAWFglKUrxepXy4ApBB7j319VR3mYi32idPWdkxozrxPkEoJ/gr5e8Q2l7tgXoBcbBRO00b7KxZLKA2S7dORJ/sriqvDsjbfrVFizKrVptBLqeVy5znZB8yEpA3+lRrxdf38a4Xqw5ebMQb8+0k+BU1y7R6x57dgA8l7OSdztvVO4+Kp1u9eh7qp3XTsdqosgq4FlmvDY+XNXM9bHxW7Vagffs4f4agtxxFP8ANa5+UnvVbB8/wBmp1cKzXwnUHU65p+Kh63wQfahte9R14r+CLXXUzXTKNR8PvllRbr27HWw0tbwcQluO21srZBG+6D3HuIrufQdOwKNSpaNNGw5N3aXKCNI0pFqcaJBgC5u3uaFEGGdyKvkVskbgVsVPo+OKhAHJkFo/RfeH+rqpb9H/AMWA2Ccqtg38pT42/wAHXREPHdIhj2lDMfBNTi7Ld6wiIy7uOVpZ9wNX6JClkBQiuAeZSayqP6PLikkEJkZ/BaBPUiRJP2AVfrf6MHWS5KSL/qzHQ2fjckd90/ruAVVdpGpTRkfH3LGv0cVSMc3AdV/MLAHrlaLUjtLreLfDAHUPSUA/Rvv9VYve9YsUt/4Czh66yFHlR2aC20VeA5ldT8wqV+JeigwiM6h/MdRL9cQOqmorbMVKvn2Wr66ktpRwi6C6OvtXHEsCgm5s/FuM4GXKB80uOb8h/N2rAz2kyCAfR2En43n3LISOiYa4dORbjhs8Ln94KJHCTwhZ3qPl9r1r11ta7ZYLa4mXZrDIaKHJjiTu2440rq2yCArZXrOEDcBPf0cpSosq1WmazMGYmD0DgFLVLpUtSJcS0s2zQlKUrGLIpSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlO7vpWtuJC/ZXi2hWbZNhE16Je7TaHp0V9pCVrbLWy1EBQIPqBXeDVSDCMaI2EDa5Az2Zr4iv5Jhedwutk7jzpuPMVy3hcVnELPjNzI+rlxLTyAtBEOIdwf7FXqvij4ih3as3L+44v8lUkf9K6xa4iQ+138qjw6TqQ12qWPv0D+ZdQtx5inT2Vy1e4ruIxsdNVbh/ccX+Sqge4vOI5o/wDGlcSP+qxR/qq+HaL6uwZxIfa7+VVWaSKU/Yx/YP5l1Z9X2U3HcCK5OucZvEQg7q1JuatvANxRv/gKz3h/4zdVrzrTiGO5tlcqZZrvcRbpKHyzykvIUho+q0kgh0tnfesfN4AqcnBdGc5hDQTkTfIX4K/lMbSE3FbCaxw1iBcgWz/aV44zrKbNxHSJYRyt5Hj0Ock7fGcjuLYX+qW61EhHQCpU+kGxXlZwDUppBCbdc3rHNUO4MTEeoT7A82j91UWkgp3SRsR0PvrlXHUsZWqufueAfI+C7N0aT4ncPshXzhkt6to7ivZoAAVUJSDXg2KqUJ6VocQ2W8kZrIMhhOZLoXMaineZiV6RNQod6I8pISSPYHW0n9KuhOkeZM6g6Z41mLS+ZVztzLrw/FeCeV1PzOJUPmqCGksy2oyN/HL2tKbZlEN2zSir4qC7+1LP5rgQa35wWZHIsbOS6K30lq4WCa7MitrPeytXK6kexLmyvc6KkfRzVRDmHSbz7Yy6R+V1C2kmlF8J8Zgzhu1/2X5O7Hi54BwUoaU38KwvJdatI8PdUxk+peM219JIUy/c2Q6CPyAoq+qpqhQYkd2pCaXHgBdQjEiMhDWeQBz5LNKoL9frNjFmm5DkFyj2+225hcmXKfWEtstIG6lqJ7gBWk8q429BceiOPWq+z8kfSCQzaYDikk+G7zoQ0ke3mqFXENxT5jrqU2d+MizYzHeDzVnYd7UPuJO6HJTmwDxSeoQAG0nY+sQDW10TBVTq0UcpDMOHvc4Wy5gcye7iVrVWxbTaZDOrEER+5rTfPnIyA6V0E0W4h9NtdoEp/DLk63PgH+fLVOR2M2Ogn1HFNk7ltY2IUNx12Ox3FXnVHR/TvWayRsf1GxuPd4cOW1NYSslKkOIUDsFJIPKoDlWnfZSSQdxXIm1Zhf8AH7xCy+zZJJsuRWbdyBe2VfhGk+LbwPR1gjopCtxt7OldJ+DLiiHE/p7NvE6xLgXrHpKLfdHWG1fAJTpTzB2Ms+BHUtn1kbjfcFJN3ivCcTDkQTUq+8InLP1mnuuOcdB57fDOJWYhgmFMMtEbtG1p5wfI5rVvHlL1DiW604vacNnRNPray2+5NgMdpGL6QUpbdS3uWG207cvMAkk779BtqTgVxaNmmvsS8lTciJitufupUlQUgPufgGeo6b+u4ofm10uUlKgQoAgjYg+IrH8d09wXELrc75i2I2m0T70WzcH4URDCpRQVchc5QAojmV19pqjLYxiS1DfRmQgNYEawOeZzuN5Iyvdex8Jw49ZbV3xSbG+qdmQytwA22XKjW66C46y5zK35g5kNwHvAfUn+CpO5djj3EBwW43l9vaMvJcDjr6ISS44iNu1Ia27yVMpQ4B4qQnzrUdjtXCrnXFldMGudpuz+L5BMfh2q8HIZQRMvQcUt4bhYSGXVqW21t3qaG2/ONuhWmmlOA6RY+5jGnlgTaba8+qU6yH3Xed5SUpUslxSjuQlIPurYsTYl9GhSUOHBcyNC1HtJtYt1bEcc946lhqHhkvjTb4kRr4UXWa4C9wda9+GS58cPXCpqzqle7blVwRccIxWM83KTdHkKZuMvlIUn4G0dlN7/ANOWAB3pSqumLTYZaQ1zqXyJCeZZ3UdvEnxNfewFQv4++KfKNJ5lk0ixcS7A7lcZT0nJNhu3H5uRTMU7+q7vsFOK25AtPL1PMnU5yo1DGtRYyKQCcgNgaN/P5lbLI02RwpIvMEEgZk7S4hbWz3jO0gwHUdjT+dMkTGo7yY1+vMYBcGyOr3DTb7g6FRV0UE/tY6q7iBvaPIYlMNyYzyHWnUhaFoUFJUkjcEEdCCOoIri7FvT0JCIVvaQzbkBSDCWO0aeSr45eB/bVK+UpXXy22Fbx0J4qs20XhM41bUM33FGj+BsdzlKbdgJJ6ohy9lfg/Jp0EDuSoCtsrGjaJBl2Opp1ngesCbax4jcOi9rb77dRpOkaHFmXsqTOTYT6pGdhwdbtuLjduF+mtKjZj/HjpLcm0fd3H8tsjh+OV20TGgfYuMte4/RFbGxfiY0HzCY3brLqfZRMdOzcWa4qE8s+SUPhClH3b1H81QanJAmPLvaBv1Tbt2LfpWtU2dyl47HHmcL9l7rZtYTrFcVQcAucdpRD1xCIDQHeS6oJP6vNWapUlQBSQQRuCPEVr7PAzd8igQ31H4FZUG4SfIuEbIB9wBP6VR7jeqCk0OPFBs5w1G9L8u4XceYFbJSYYfOMLtjTrHqzt1nLrWpM1ji2qtePRhsi1wUNr2/pi/WV/BWLq5/EGsru4duU6RPeHryHFOH2b9w+YbVaXoJ7gK4zi1BkeMXN2bugZDuUtywMOC1rtu/pOZ71ZFqIBr4Z/CyWm1bcpWOY+Se8/VvVfIhqHhWN5rcRjeGXy+KPI4zDUyyf6q7+DT9HMo/o1eQHiM4Q27SQB15Kq94YwvW3OC2KuVheT5e6Ot/yKQ6gnxbbSlI+sqqQ248xWhMHmnRPg9GSvqEWTa8ZlXncp3Pwh1C3WxsfHmW2Kgk3xr8RbzTaVai3BLgQkLIai7FW3U7dh0613vgXB03UKTChSxa0Ma0G99pFzsBXP2KsTS1NnXPjAu1ibWtsBtvIXWj1fZTp7K5Po4weI97bl1TuKf8A6aKf9VVa3xZcR6wP99e4j/6SL/JVvrNGFWfsiQ+138q1B2kWls9pj+wfzLqpuPOm4865Yp4q+I9W3++1ch/9FE/kq9P5qTiPWR/vvXMe6FE/kqqf9K6x/qQ+138qpHSXSBta/sHvXUrceYpXM/TfiY4hr7rLgGGytUbhNYv2QRY0mKqJGAcihXM/uUtggdmlXUbV0wB3G/nWn16gzGHpgS0y5pcRf1STbtAW2UStwK9L+ky7SG3tmLX7ylKUrBrMJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiVT3G3w7tb5NruMZEiJMZXHfZWN0uNrSUqSfYQSPnqopQG2YTauN+tWmOW8KGo0zEb/AG+VOw2c+t/H7kBuHY5O4QFd3aoBCVtnY7jmHRQqjtV5seRo57HdY8lRG5ZKuR1PvQev0b118znAMM1LxyTiWeY3BvlolbFyLMa508w7lJPehQ36KSQoeBqDerXoobFcZLt00X1CfsxUStFsvaFSWUHyRIRs4kfnBZ9tS9QNJBgwWy89tGV9x7Mx2EKK8QaOoc9GdMybtUnd+WV+ojrUZp8d5kkOtLQfykkVZJae/esxybgm41cA527Za3b7FbJAXabw3ISoDx7N4pUPdtWtrthPFRYOZF70pyc8p6qcx5To+ltJreIWNKZNN9sdo94PctR/qRVZU7AR1jyPivyUO/rVsRNl22axcre+WZUR1EhhwdChxCgpCh7lAGrNcLtqjE9W44DPZO+x7SzSWz9lWV/IcvWSleLSEnyEN8fwV8Ra1IRgRrZFX8vQKhCIJb3rs/nMWHxS8I0mXaeQycmx5Fxh8v8AQbg0A4Ej2pfbKfmqAuOXX74rBBvpRyOyW9pCD3tvoPK6k+RCgfpqQXordWL3f8KybSfI7ZMjLsEoXS2LdjOpbMaQdnWwpQ23S6Obbff8KfI1rLW3Cv2HeIa/4OljsLJmKlZFYiBshLyifhDI8vWBO35vnXHmlWgfo3xpfPkSSPuH3ZHqK680P4iMtMiTmMhGA6nj37FYG0GqlI22r5QjYdRXsB1rnl8S66PcM1+t7hW6SUnvBHeD51tw5OLZdbDxFx71HtYsLZbyxxaSd+zSEq9QdVmQhSUoSO9wjy3GpkJ5RuawHX3J3bXYsWwmMshu7Pv5BcU79HkMK7CIhQ8UhZfXt57eVblo1oMTE2KJWnMeWgu1nEbQ1uZtz2FhzkKOdKFVZQMPxqmQC9oLWg5h2uLEHm2O6WhZxrNxaah6vSZJn3GZjmML5vgmOwpRZUpjwcnvoIU4tQ69kkhCR9Jjg7q3CYlqtmIWeVPeHxk21jkSfcUpKle/b56+LTjl/wBW83sOl1hdcEi/vqclvJG5Swjqs/b7ztXVLRTgy0900xuNBFubDpQkulI9ZavErV3qPtP1V3hWsTy2DwKZSYQBAzPvOdz03XDFNw3FxMTUKs8uBOQvl1Dd1dd1yof1QWiSiLltnu1pcc+KZjayPf6wB+gGsiZkNSWkPsOocbcAUhaTuFDzBrqlqZwl6Z6gY/Js02yMOodQQEuDfY+BB7wfaOorlnnGlV74f9VbtpTdHXXoJaFwtbrneWVKIKd/Eggg+e2/jVbC2OHVmY9Dm22cdhVtiPBsGmSxmpPY3aFYrlj2Qah5HZdLcXSozr++A6oDfs2En1lH2DYkjx2A8a7EcNWitl0J0utmFWZjsw2jtH1H4zjquqlqPionqT/BUCfR84/bcg4pblJntpcctWJGVHChvsoym0KI+ZQrqWBsNq0fH89FmKq6XcfVZawW44Lk4cvS2RGjN2ZSo68Sef3jK5knh604vCrfc5luXcMuvbR3GP2QJJcVuOofeTulCdwQkk9Nwob8vl1jWKyz73M3+D2+K7Ld27+RtBWr6kmoU6SOSJPBZqnrvcHO2yPUlq73WbKJ3WGuZTLTQPglCebYeANa/RoDTE9IeL2c1rQdms45E8QACbbzYHK6zNUjObDMNmVw4k8zRnbnOQ7SoKS4sN5oxIhdZjoUPgymz2bjISd21pKfiqTskgjuIrp9wV8SjutmFuYrmcpAzvFmm27kdwBcox9Vqe2Py9uVwD4rgPcFJrmB2gB28qzPRLUqXpZrZgmaQ5C2227yxa7glJ2D0CWsMvNqHiBzJcA8FNpNTbjOjwq1T3Pt+khglp6No6/FRRhKsRadPCCc4cQ2PMdx967O1HfjP4bLdxB6bPwkIQ3d7alUi3SOXdTToHTb2HuI8QfdUhx3e7pX4tIUhSVDcEEEVz5CivgvERhsRsU0vaHtLXbCuFGFSrqm3SLNf2ltXOySnLdKQv4wW2dtj7RsR81Xe8ZNacagmfdpPIk9G0J6rcV5JH8PcKy7iLt8HHuKnVq2W1sNR/uyxICE9wW7FbWv9ZRq88HPDuviG1avmU5Iz2uPYk83CjtuDdCn9uYq2PQkd/vUD4CuhI+Jfk6gQqjEF3OaLDnKhH+rLalXosm02Y0knoyyHatTW2XrPljfw/DNMJbkE9UOvpKSseYKlIB+beqeRqFkmO3JGPalY5NsjzvxW57JcjODz5V7jb2pJ29ldobFovgdiiJisWVhewAKlJ3JrWvEBwk4Bqxh0y1LtbaHeRS2VIGymnNui0H5Kh/3HpUey+kiotjh0YAs4fH5Ld42AaU+DqMbZ24/H5qGeifFbneic2K9EkTL9hKSPurjbzxeciMeMm3OKPMnlHUsElJG+23xhPN2/wBrybGot9sVzZuMXIm0XBExg7oeYWAUFPjsRt0PUbbHrXH60W7JNPsgv2nuRFSbjilwVE3UNuZvvT8xTsdvJW1Tg9HrmEi94RlunUx/tW8UuyJFvClblqJMSpzsx+Sl1DpH59Rl/SdwzAqGEIeK6X6uqRrtGwiJZutb6w9m/Bzt6vNHdUmqfUn0Sedransk7cs7Hm2Efkt/OwO/pVE7B/JrMXrf1OyaoXoH5NfnSIm8LoGFP86xB63hQ+LWrdU7W5luXYXo5CJ7a+T25s4J+QwSUo3/AEA8v6K3o/HhxmnZdwdSxEjNqfkOq6BtpA5lKPuANa34UbTI1R1byrXi6R1JhxlqgWlCh0RukAAfmMhCfetVSVoyoj67WoesLsYbn46L9dlb1aqGFLO1Tu793fn1L39I3msfENB7fp/bVhlzKbixDDSem0KMA6583MllP6Vc2YfhvW6vSNayZDl/ENJxix2OVJtOFxU2ppaoTxS5KV+EkrTsNiOYoRuO/sqjLHyjOkEdjh7qvfbX1V+n2DpiUpFNYyKfWd6x69ndZcx4okZ2pzjnQm3aMhn8b1suIk9Ku8ZJ6Vry3XbWqeUt2rTu4OqV0T2OOyHD9aTWX2jTbjKyUpRZNM8raSvuUmzoij904E7fTW4HF1Nl25u7wPNaY/CNVjmzWt7T5NKyqNb5jyedEZwpHUq5dkj3nurHslzzGsXQtt2e1OmJB2jRVhex/LWPVT9Z9lZ7jXo8uMXUhxpWY3KBYYayO0Vd7yX1pT5hljmBPsJFS00N9GTozprKi37UKa/n13jKS4hqYyGLa2sddxGBPabH+mKUPya16paSpWCwtl8zzZ/ksrTtGszFeHTr8uAFu859gHStc+jn0EyfIMmc4ndRLcuIwIzkTFIrqCnmS4OVyUlJ6hHIVIQo/G51q7uUnobXw000w2llltKEIASlKRsAB0AAHcK+6hWqVKNVpp01HOZ7gphp8hBpsu2WgCzQlKUrHq9SlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURfhAUNlAEe2vFcKI5vzRmzv+TXvSiK2v47ZpB3dgoVXgnEMcQeZNraB91XmlEWNZXLOFYrPyCz29TqbWj4a/GZTut5hv1nkoHivswspA71ADxrRnGVpA1rpo7DzfAX25V/x1KL9YJcc7/CWikLKEq8Q4jYj2hNSXUAoEEA++o76T5c3pNq3eOF/Jj2NskBd6wR9zohy3PKUpyACfFhztUoH4gSPxQa7ZNs/AiQ7XIBJHFu/s29FzuXw2ddT48OM02zFjwO7t2dNuKhRieRxMzx6PkEZsNPKPZTI+2xYfA9ZJHeAe8ew7eBq6hPWr1xZaWz+HLV1zU7H7c45guYvbXOMwn1Y0pRJKkjuHMd1J/K50/KFWdtceRGYnwZCJMOW2HY77Z3S4g9xH+zwO4rlzFVAiYfnTD/VuzafLpHh1rrLCOJYWIpBrybRBk4eaGtGcR8nbNsWWVbJVYFxh1+WiU6o/UsVvQnetQcRuIzbxYIOQ2tCly7M6pYSB1U2rbmH1A/NWx6I69Aw7i6Wmpk2Y67CeGsLA9tr8ywWlihRcQYVmJeALvbZ4HHV291178IGU2/BuInGcpuUdL7UiNKtaUn+nL5XEAe1QQpIHidgOtdj7BkFoya1sXiyTW5MWQkKQtB329h8jXATHL8xKSiQ2tY2KStKHChxpaTulSVDqlSVAFKh3EVNvQHjIOJusffO/JeeV0lvwlshM0fjvRHVNpS95rZXyqPXkBJ36wxzhmszFSbWqM3l4L2gRIYID2kbIjLkBwINnNuDkCL5rkPDdcp0rJuptTdyURhJa8glpB2tdYEgg+y7ZnY8R0x7q5Z+kNyux5LxHx7fZuyWvE7Ii3znkHfeW84XVNkjxQgt7+RUR4Vu/V30idtRYHrdpbZHYVzkNlH3Ruy2VGNuNuZqM0tZcX5dopKQdieburnRl+YMxHpN0uEt2XcJrrkhRfcLj8h5aiVOOKPUkqJJPiT0rO4Pw1MU2N8qVEcmGj1QdtzvI3dBzKxGIq/AqML5Pp55Qu2kbLcAd/VkFKX0bj0iVxXXpUfcsxsNfafPgFKksFIP0Gup9QS9GLofecNxy8ao5VEWxeMpKNkOJ2W1GTuUII8CSoqI8NwPCp21pOJp9lSqcWYh7L2HUtsokmZCQhwHbQFRXu1xr5Zp9mmftE+M7Fd/McQUq+omue3Crl6XuH/VzgxzJ74Hm2FRb01b4jx5VToakKWlbQPxuVzqdvkOtq7t9ui1RV4oODGy6s3uPqPiE6bjmZ2/ZUe8Wt3sZI232BI+MBudt9iASN9iRVnT5tsvdkTIEgg8HN2HozIKu5qAYzcttiOo7VzGE5C0hST8YA/TVy0lxyfqxrxg2ndiQp8G9xp9ycQN0sRWHEuOFR8OidvepI8a25H9GtrFcLomFNz+UmEV7LKIBCynfr/ROUVO7hY4Q8E4dbWt+1W8u3iUlIlT5Kg5Id27gVbAAeSUgAe/rUi1vHcvGlXQZO5c4WvwWkUfB75SZEeYIs3MBSHH/fQ9QRSlRQpBXGPi/RJs3GNqdDlJKPh8iHPYJ+W2qK0Nx84I+apCejF1SsmP5Tl2kF2ebjysmeRfrMtR2+EOIa5JLAP44SlDgHiAs+FeXpQNAb5Nu1q15w2Ct+XbY/wO6NNoJU9HBJSrYd5Turp3lJO3cKg1imX9rJi3ayXJ+FcYDyJTDsd4tyYj6DulxtQ6gg+I7/GpfpLpbE9CFLe7Ve0ADmI2H38yj+oNi0OrGotbdjtvWv6Aqt15urdtjkhIcecHK03v8ZX+yoBaY+kpye3WJq06j4xbb5OZQEC6MTDBcd2+U60W1o5vMoKQfxRWFa4ccuR51aZdjx1LNmiT21MylQ5C3pjzZGxb+EFKEsoI6Hs0lRBI5huajir4CxbHcJGmsZDLjYxnOaWsbvcGglz3fVbYC/tEbDnBjCkQ2coXOcdzQ11yeF7WA4m60rr9klnyzXjPctsLiXYlwugYafRtyyBHbS0p1O3elS0rIPiNj41vT0Ywfl5XqpdNyYoRa4qT4FaS+T9R+uoU33IHEui3WpntrjLUGo8aOjcoJ6JASPqFdJ+CHS97R7SBli5bfda/v/dKefJRACU+0JSAPpPjWH0+VOQwzgKFhCWiaznCHDbc3cWw7Eud06uZ4lfGCKbNVerxaxFba9z27vjgpTLbSrvFUzsRKvCvmDcUOpCVGrFqhqHZtMsQl5RdCHFIHZxIwOypL5HqNj7SfAAmvz3i0mK94ZDFyTYKWrRIbtXetLcUucSGokPSDFAqResjcaEttrqoMKVs2z07i4sDf8lJ863xiFlh6D6WYtglvU2u83OUxbGDy7/CJ7+7j7pHiEIS84fyWq0fwi6cXjUDMLjxCZ+gvOOvufcwOJ2St4+qp5IPchCfUR7j5Cs90oywcQXEBkWpNuUXsI00Q7i+OOj9rnXV7lM+Yk9xCG0tsoP4riyPjGuwtE+CxQKUZqMPWIuT07PxG37IvxWBrU7rPbLNN7HPp39gy6VvabidguUlUydbm3nl961DcmvlGG402d02lkfNV6pUjLFKhZsdpY/aoTY+aqpEaO38RhA9ya9KURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURK0Xxc6LXXVXT5q+4MFs53hrxu2PPNL7N11adi7FC/k9qlI5T4OIaV3A1vShG/Q1XlZmJJxmx4Rs5puPjhxVGPAZMwnQYgu0ixUY9HtUMG4y9G5uCZ1HY+74hlm7QXUdmtex5fhLaD1SQsbLT3tuAg9OUmD+SY7lPC1qHK0vz7t38VnPKftVyKCQhJP7YNvLoHED2LHf1kLxh6LZZolnw4rdF3ZEKMqSJWSMREbmBKOyTPCB0Uw6PVkII26856FRTsO23rSfj20nfxjIY0e3ZdAYDr8RCx20Z0DZMqMo9VNEnv8N+VfeCauMMJSeI6aZ2Vb+id7Q3wn8Pu/VPUeethHFk1hqoiWmHeuNh3Pbx+8PpDftHNGtbSm+RYcQ424gONONqCkOIPUKSodCCPGvOTFZmx1xZCApDiSkg+VYBcoOd8MOXL0x1QhSJeOOuqVAnNoJ5E79XWN/12SfaPM7IZTHfiR7lAmMTYMtHPHlMK5m3U+w+BHiD1B6ECuSK3RZqgTHJRxlfJ24+483WLhddUPEMpX5YOYRcjMe5Rq1I0Jn264uXjFy4z2hKiWgSPnSPtH0Vrd2NnVtX2Ei3RpW3ygvlJ+Y7fZU5ktoWOVaAoHwNUsnDceuZ3lWxlZPiUCpDw1pur+HIDZVzuUY3ZrZ28D3qMsT6IaLV47piGNRxzyUJmYmfXEhmLEiwArpzqcBI+Ybn6q2po/oFcZN5Zvt5XIdfaWl5MxxJHIoHcFtJ677/ACj8wFSPtmB4xb1hyNaGEqHjyCspjstMoCGkBKR4AVaYt05V/EMAyzHcm0/Vy8ye+3MsZQ9FlJokURnDWI4rbWlnEHe8ItrGP361MXWCwAlLzQSxIA8zsORfzgH21vTHdedNchCUm9m3Pq2HZT2y1sfz+qD9NQ4SB37VWxWuu+1adStJ1dpYDIjhFaNzxn+IWPbdZWqYMpU4S+G0w3fZ2dhuOyyntEnwbg2HoExiS2e5bLiVj6Qa9/fUIrXIlQlBcSQ6wrzaWUH6qzS1Ztl8dKUtZNcgPIyFKH171t0HTfLsH9qlHD7rgfEN8Vp8fAcVh/RRgekEeBKlRyp33AG9ftR7h55mCwAvIZiveof7KvEbJb/KGz93lrB83T/BSLp5pTR6krEJ59UeZ8FiouE5mD7T29/uW6XHmWRu66hA81KA+2re/kNsa3S2/wBsryaHN9fdWtY7q3FBTqys+ajv9tXiO4ooA36eytan9O0/H9WRlWw+dxLz3aoHerV1GbC9t1+73r2zVhrNrNIx65MoZgShyupPrOKHsPyfm2PtqCnEpwKYpcksXTTexP2qYxzKVMir9Z3frspobJIB8d+b2+FTrJrxeAUCCkEe0VpLdIuI4VRZVYUy8RW7PWNrcNUWZb9nPfdVjJwYsIy72gtO63nt71xivehGtGNvqi/C4chKDsDIbcaV8+6CPrNeNs0N1evzqWJE6MwhZ2IituOr+bZIH112IuFgs80kybcw4T5oFWxVgs8P/gtuZbI8kAVKI/pKYwdL8i5zda3tWF/d3LFQcE0l0TX5NQo4d+DeHik9rJ8oirW8ghYVJ2Lqz5ADohPmBuT4mpdtrEZKW2gEoQOVIHQACq+SgDdIGwFWqUtLaStSgABuSfKolq+IqjiScM9UYpfEO8+A4BSDT5GBJQhBgNsFcVZJCs0F+6XOWiPEiNl151R6JSO8/wDd4npWiLXb8l4uNU223GpEPELMeUgnYNs77kb93bObdfxU7DwG9yns5LrZlQ0/w1KhbY7g+6U7bdpnb6lOfip7h8ZXgKz3XDWvTjge0oZxrG2YsjK5kVSrdCWrmJPUKlyT38gVv5FahsNgFFMw6MtH8xXI7JyYh+qfZB+lz8zeJ3jmuVgMQVWBTmlsM+vvP1fz8FauLvWR3CbTY+E7QmM2rN8yQ1aWWYp5RbYbo5dyR8RS0BR3+Q0lxfT1d5C6G6SWPQ7SywaZ2BXas2iNyvySkJVLkrJW8+oea3FKO3gNh4VGLgF4e8nVKncVuthly82zBDjlpbnj8NChPdVSFg/FdfATsAByNBKRsFFImzXSNTfBlmtp8sbtZ7RH0n7z0DY3rO9aBLNdEJmIm07BwHvO0/klKUrDq8SlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpRF5SosabHdhzGG32H0KbdacQFIWhQ2KVA9CCCQQehBrmzxJ8OOX8LeZNaz6MSZ0bDkSfhCVRCVO408o7FCu/mhr32BVuEb8i/V5SeldeUqLGnRnYcyO2+w+2pp1p1AWhxChspKknoQQSCD0IrLUasR6NH5WFm05OadjhwKx1TpkGqQeTiZEZhw2tPEFQ2wnVfR/jOw8aZar22DbsvWjlbQr1GpjgHR2KvfdDnjyb8w+SVDfaLOqGjOsPB5f5EuIy5kGDS3edxS0lTW2+w7YJ/anB3B1PQ+I+TW1eKTgfyLTWVK1L0IgSrljSXDKm49H5ly7RseYuRAPWdYB69kPXb+RzJ6J9NDeOVifaGcG12jffJYn0di3eEoDsplBG2zyf6OkeJ/bPMLrI4gwLTsYSbpmkt1mn2oZ9pp5uI4b/AKp4W1CxpUMJTLYFSNuDx7Lun6p59nFYXg+ZYxqFEMrFpijJaTzyLY+QJTA8TsOjiPy07jzCe6sqYA3FXDVLggxfJoadXOF3L4qGlKMhhqC+SwHO8hCkeswvzT4dxSK0vB1iyrBbt96uvOLTocps8iLowwA6sD5S0DZt8flIIV5gmuTMUaOqhSXufKtL2Dd9Ic3P0Gx6V0zQsfSlWhtbHdZ3H429IW6GtulVCPCrbYLtZcmt33Wxe8xLvCHVT0VfMW/Y4g7LbPsUBVwQoA7VFkVjobix4sRtByI6ls7ojIrdeGbjmVSgb+FXCKBtVCyd9quEcd1WjysfFKu0Mdwq+QR3VZIYPTer7BHdWOmCLLHRLq+wvCsit6iNqx6GNqvsAncViHEXWDnRcLJIh3ANXiKroKssM7gCrzF7hXrVqc0FVV8rG9egFfC9hV2zJWI2qjdT31bZQ76uju5OyQSfIVrDNtZMYsUxeP2Bp7Kci35Ba7UpK+yV/V3uqGR7CSrySavpGRmqnHEtJQy952BoufyHOcldsitgjWebBXu6yYkCM9OnSmo0dhJW688sIQ2kd5UT0ArV8GNmWvl1+4uDtSbViSV8su9uIKHZiQeoYB+Kg/jnv8BWRwNKL3k8ZeoPERkNutGPW7aWm2dt2FviJHcp1SyC6r8pfzJFaA4kPSOWmyWmTp5w1tCDDaQph7JFt9mop7v51QoboH9VWObr6qR0VXTOjjQhHmIrZqrNDnDPV+g3753n7Iy6VhqtioQGcnLm3PvPR71uvXHiO0n4McN+8PAY0G6ZoWCluEhXMiIojftZSgd9z8YN78yu88oO9aF4P+GLNeJzPBxRcRbsqfYlS/htqhThub2+k+q8tJGwiIIASkAJWUgABtOyqfg84CMl1UuMfWjiSgzGbG84JtvsE7mEm7knmD8wK9ZDBPUNn13e9eyei+nsaNHhR2okRhtlhhCW2220BKEISNglIHQAAAADuroiampWiQDIUw3ecnv/AIW8B8dGnMhxJp4jTGzcPMr0AAGwr9pStWWQSlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURCN++oncSXATh+qMibnGlr8XEcyfUXpCA2fubdHPEvtJ/anD/TmxuT1UlffUsaVdyM/M02MI8q8tcOHnxCt5qUgzsMwY7Q5p4rjpZ8q134Vs7XZrpHuuGXxZ3VGkbOwro2k7czaurMpHtHrJ/JNSItXFBobrdahjHEFhMWzynhyLuUZgyIS1fjLb6uNe8c4HmKm/n2nGC6pY89iuoWK2+/Wp87qjzGQsJV4LQr4zax4KSQoedQZ1m9GvkdoL154f8nTcYg3WMcyCRyuo/JjzduvsS8Pe5W9iv0bEbBDrkLUi7OUbv6dveCOhae6iVOhv5Wjxbs26jvL8rHnVjyLgZShsag8M2o4WwfXYdgzu3a27+XtEHmSPyVc3tFa+l5vrpps8qHqtpou8ssnZU+3J7J7YfKPIChX6SE++tY/fBq7w95T8Euqco06vwOwRJ54yX9vxXAS0+n2gqBrd+L8eWdBpuFqjiFgzWHsAX1NCFLI8+0bBQo+9FaXiPQxTq4zl5bUijcQdV3bs7HDoW10XSfPU94gzjXMdz3I7dvcV9Yrrrpbky0sJygWeSTsY15aMZQPl2nVs/OoVtW3NmZHTLgrblsEbh6M4l5sj85BIrEP2R+CHVhPJlVluOIzXR6xuFuEhlKvY8xzHb2lIqrt3C7o5fCJ2i+uNtYeWfUTachEdzfy7MrCt/YRUDV7QPOS5JlnuZ99tx+IfmpOkdJcvMt/SAHoIv5eCziJsNgSN/Kr3DIGxrCmuHPiksQ/8C6mT7iwBukXKFHnJI/OUnm+uvUYjxZWn1ZFlw+48vynLY8wT/a3dvqqOJ7Q9iaGf0QY8cz7eIHisuMaU2J7Vx1LZkNe+21X6CrurT8d3ifZ9X9jPDVEePazUj6OY1eIbnFU+AGcFweL7S3NeI+YuJFYP/pHi17rCXH42e9WUziWnvHquPYt0QjvtV8h9e7r7q0nBxXi1u/R2+2K0J84NhSSP0nVr+yv25aP5dEYVJ1b4hpkGGobuplXpu3tbe1LfZ9PZWakNCGJJhw5d0Ng+8XHsA81rkzWZd99W62zk2fYXhbJeyzKrVaU7bgS5SG1q/NQTzKPsANa2uXEbEuzyoOl2DXvKpJPKmS60qBB9/O4ntFD81v561fOz7gV0kcXMeyprKbo2TzC0RVS3Fn2vr2R85XWAZf6S6LaWF23RbSy32pOxSmddFfCHdvMNo5UA+9S6lzDf9HEOIfUHPic1uTb3kuPVZYOYrzIeTcu9SIOnOs+osN25at5pFxbGkJ7SVAtizCjhvxDz6ldosbd+6kp9la2zbi94ZOHC2Lx3RqyxczvrAKEuxdm7eyvrupT227nX+lgg/jCoWZVq9xCcUWSoxl655HmVweXzM2W2tKcba/K7FsBttI/GUAB4mpJ6D+i1yy+vM3/iDv4scEkL+4FnkJdmu+x+UN0NDzDfOr8tNTvScD4cwZB1Yoa37DBmek+0ek26VgotSmp42hA24n4so/5bqjxNcb+cs4jb2LhkMhDnbMWW2o7C325BOwddJPI0kb/trqirwBPdU5+FP0cuGaQPw881bdhZfmbJD0djsyq2WpzwU0hY3fdH9NWBsfipSetSi010o060exxvE9NMQt1gtiDzKaiNbKeX+O64d1ur/KWSfbWWUqWIos0z0aUbyUHgMr9NvjpX3AkmwzrxDrO4p3UpStcV8lKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKIlKUoiteR4tjOYWtyyZZj1tvNueGzkS4RUSGVe9CwRUZdRfRuaAZZ2svCRd8CnL6j7jSO0hlXmYr3MgD2IKKldSrmWnJiTdrS7y08xVGNLwpgasVoI51zBzX0aWvePdo/heVYtmEdB9Rt0uWuWofmq52t/0xWi8v4deIPCVOHLND8tZbZ+NIhQRcWB7e0jFfT6K7ZV+bDw6e6tkl8Z1KCLRLPHOM+5Yp9AlSbw7t6PzXB2DqXlmFyOwg5vkOOvNnbszNlQVJI8OVRTtWXROLTXqChKbdr5khSO4Ku4eH6/NXai52SzXprsLxaoc9rbbklR0Op+hQNYbc+HzQe8pUm66LYNK5zuou49EJJ9/Z71eDF8CIP08q0nqPiF8/JEVnsRT8da5NDjZ4m2UBCNcLsR5qTFUfpLVUczjW4j3klEnXm8tg9/I/HaP0pQDXVkcJ3DIFcw0BwDf/sCN/Fq7wOHvQW1hIt2imCR+Xqkox2ICPn7Pen9aKeMxJt7G+5VBTpnfFPf71xjufERrDlizFnayZbdVOdCy3eZDvN7ORtX8FVFj0T1/wBR3g9j+k+c3kuH/hLtsebb6+Jekcifn5q7h2rG8fsSA3ZLFb7ekDYJixW2QB5eqBVw2B6Hr7+tU3YydDFpaA1vxzAKoKYT/iRCVyPwv0ZfEzlbiHcmOM4dGOxUZ88zZIHsajgp39hcFSY0z9Fbo1jim5upuU3zN5KSFKjJP3NgnzBbaJdUPe781TZpWJm8TVOcydE1Rwbl+fermHIQIe6/SsbwXTbANMbOmwae4dZ8dt6QN2LdEQwFkeKykbrPtUSfbWSUpWBc4uN3G5V2ABkEpSleL1KUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKUpREpSlESlKURKVaclyvHsOt6Lpk11agRXHkx0uuAkFxW/KkbAnc7H6KxlWuukyehzSID/Wnf4lWEzVJGTfycxGYx3BzgD2Eq7gyE3Mt14MJzhxDSR3BZ5SsCOu2kwG/36xP7S9/Er8GvOkh7s1if2l7+JVv/AFgpP/lQ/wAbfeq3yPUf/Hf+B3uWfUrAjrvpKO/NIv8AaXv4le8TWvSua4Gmc2tyVKOw7UqaH0rSBXra9SnGzZmH+NvvXjqRUGi5gPt913uWbUrwhzoVwYTKgS2ZLC/iusuBaD7iOle9ZVrg8XabhWBBabFKUpXq8SlK8J86Ha4Mi5XCQhiLEaW+86v4qG0glSj7AATXjnBo1nGwXoBcbBe9KwH9nnSTlCvv1i7Ebj8C9/Er5/Z80jPdmkb+53/4lYn5fpI//ah/jb71kPkeo/8Ajv8AwO9y2BSsHga2aW3ObHt0LLo65Ep1DDKCy6nncUdkp3UgDckgd9ZxV5KT8rPAulYjXgbdUg27CVbTEpHlCGx2FpPEEeKUpSrtW6UpSiJSrVkuVY/h9uF2yW6M2+Ip1DAdd32LizslPQE7nasZVrnpQk7HNIm/9ad/iVYzNUkZN/JzMZjHbbOcAbdBKu4EhNzLdeBCc4cQ0kdwWd0rAzrppOketmkQf2J3+JWU47ktiy21N3vHLmzPguqWhDzRPKVJUUqHXYggggiktU5GddqS0Zjzts1wJt1FI8hNSrdePCc0cS0jxCudKUq+VolKVozVbjU4d9IZjtovucIut4YPK5arEyZ8lB8Ur7P1Gz7FrSauJaVjzj+Tl2FzuAF1TiRWQW60QgDnW86VCeT6UjT0vf8AgzRzPJLG/wC2OfBGjt58van7ayzDvSS8O+QzEQMmTkmGuLOwevVt/nbfw3dYU4E+9QA9tZWLhisQGco+Xdbov4Kyh1eQiu1GRmk9IUrKVQWLILHlFpjX7G7xCultmI7SPLhvpeZdT5pWkkEe41X1gyCDYrIpSlYhnur+l2lqoSdRc+seOKuPaGIm5TUMF8I25ykKPXbmTv7xXrGOiO1WC55l4SGi5WX0rT6uMDheSdjrxhW//ardBxf8L5/9vGFfPdm6ufQJv/Sd+E+5fHLQ/rDtW4KVqD+a94YP/wC+MJ/vs3/tq9WDiN0CylxLNg1owqa8s7JabvkftFH2JKgT9FeOkplgu6G4DoK9ERjsgQti0r4aeafbS8y4lbawFJUk7pUD3EEdCK+6tV9pSlKIlKVZ8rzDFcFscjJcyyK3WS1RBu9MnyEsNI6dBzKIG526AdT4CvWtLiGtFyU2K8UqJGXekx0AsshyJiVsyvMVNq5Q/bLaGYyvzXJCkFQ9oTtWKxvSk4qXt5+hmZsxv6Y3KiOL2/M5h9tZ+FhWtRma7JZ1ui3cc1jYlYp8F2o+M0HpCnDSo3abekD4bdRLg1ZpGTTMSuT6ghqNksT4Elaj4B/dTO/vWKkc080+0h5lxLjbiQtC0ncKSeoII7wfOsTNyUzIv5OZYWHnBCvoUaHHbrwnAjmN190pSrVVEpWC55rno9pfc2LNqHqTj2OzpTHwlmPcZyGXHGuYp5wk9eXmBG/mDWMHjC4Xgdjrxhf99EVcsk5mK3WZDcRxAJXwYrGmxIW4aVqBPF9wwqG412wz++iK2DhOe4bqRYkZPgmSwL7aXHXGUTILwcaUtCuVaQoeIPQ18xZWPAGtFYWjnBCNiMfk03V+pSsIz3W3SPS2bFtuomotgx2XNZVIjsXGallbraVcpWkHqQD0386pw4b4rtWGCTwGa+nODRdxWb0rTf8ANjcLe+37POGb/wDaaK+v5sPheI3/AGd8M/vmirn5Pm/9J34T7l8ctD+sO1bipWPYNqFhOplj++XAMot1/tfbLj/C4Dwda7VG3OjmHiNxuPbVzvt9s2M2ebkGQ3ONbrZbmFyZcuS4G2mGkDdS1qPQADvJq1LHNdqEZ8N6+7gi6rqVp5XGDwvI+NrxhX99WzX4eMThcH/t5wr++qKufQJv/Sd+E+5fHLQ/rDtW4qVp0cYnC4e7XnCv76or0Z4veF99xLSNesI5ld294aSPpJ2p6BN/6Tvwn3JysP6w7Vt6lYzi+p+m2blKcNz/ABy+qUOYJt10YkK2/NQon6qyberZ7HQzqvFjzr7BB2JSlK+V6laL184vNOtDbrDwlqBc8wz26hP3PxSwtdvNc5viqd23DKT4EgqI6hJG5q4cWuua+HzRK8Z1bo6ZV9fW1arDFKeYP3GQeVkFPygn1llPiEbeNWHhM4Zomi+NuZnmzqr7qplv8/5RkEs9rIL7vrKjNrPxW0E7HbbmUNz0CUpIsJGbekizcC449pLpdgkFwdozFyC6PTJnKe4OdieVJ9mwqlncRvGZougXbXnhstmR4wwN5l4wKeqQ9FQPjOrjOEqKQOp+KPbWlk8dnGhm2tOZaTaMaZYbkcjGrjcW0MfBHEvCHGlFkOLUuUhJPVAO3eT0FbR4bOPfM8u1jHDzxGaaNYZmchamIbsYONtqkBvtAw604VFBWgFSFpWpKug6bgnxFKTSLWXTnXPD4+caaZGxdrY/6jnL6j0Z3bctPNn1m1jyPeOo3BBrNqg7xH4irg51TtPF3pTGMDE7tPYtOpOPxU8saRHeXsiehseqhxKidyNvXKT3Lc3m3BmRbjDYuEJ9D8eS2l5l1B3StCgClQPkQQfnr1Fpni3UpOmlvKFFJGQQeo/Tqy4TDtF8tu8+Aj4QyAFLCRssefvq88XJ20ygn/4/B/06suma/wCdnk/kJrk/TwdSrwnfYHiVI9F1m0DWabEPds/ZWSHE8eP/AKGj6Kfeljp/9CR9Ffd3vkayNpdloVyK+Unwq0fsiWA/KX9FQW2I52xt+1ewxPRW6zC4jpVxOI4+D0ho+ivheFY2+kpchIIP5IqnYzqxPqCQ8U7+dXuLNizEBcd5KwfI18mNqH1hbtC8e+dg5vc4LEJGns7HpCr7p7fJFrmtespto+ov2LbPqqB9orYul+qLeaCRYrzGRAyK3JBkxgfUeRvt2zW/Xl36Ed6SR3gg1byFEhTa+RY+Kry/7vZWudSG5WM3C2aoY8gtTbTI5n20/wBEQOjrR8wpO4+cGpX0d6QJrDk5DhRHl0s4gOaTfVvlrN3jnG/w+IsAVxpl5ixi29R+++5rjvB2Z7PGS9KorLdoN/tEK92x0OxJ8duSwseKFpCh9Rqtrs1jg9oc03BUeOaWEtdtCVrLiOvBtOkd5Zbc5XroWba3t3ntnAFfqBdbNrQfFHP+FysPxRC9+3mvXF1P5LSQhO/zuH6K1vGU+KZQZqZvazCB0u9XzWaw5LelVWBDOwOuehvrHwVj06t1qlQxabhAS58FjoUl3bqPDlP8FZi3iuLOEhuE2duh9WrNgcNLMCZNPe45yD3JH+01ccanpfmTGebflX0rgCPMuMY2Hjv6+K3mffFfGivhvIDbb+1YVrXY2rTjzVxszIZXAebloKBsedtQUPsqTFmuTF5tMK7xlAszo7clBH4q0hQ+2tOah25N1xaUwpO/qH7KyPhzvYvOk1naW4VPWsu2x3c9QWVlKf1OSuj9AdStFm6cTkQHjw8+5YCvB0zS4Md2ZY4tP7QuPBbMpSldLLSkpSlEWmuK0b6YM9dtr1AP65rGNPpNqvTSrdcbS0t2MylYf2G6wTtsR5+2so4qxvpgz7LzBP65rCdKwfujK/6qj99XKmnQhlYhvte0MbekqSaE2+H3OvYh7rEG31VkOeWi027GZMyDBaQ6UlIXyDdPTwq48I7va6NxiVblN0uIP90Krw1I/wDM6QP/AN7jXxwd7/sRAH/le4f5Y1W0EgGrTBAt+jHi1WVXe59CBeSTyg2/dK3lXhPnwrXCkXK5S2YsSK0p9995YQ202kEqWpR6JSACST0AFe9QI9IxrnMuM6Jw14jcFNiU03cMrdaVsQwTzMQyR+Pt2ix4p7MdyjXW9IpkWsTjJSDtdtPAbz8b1G1QnoVNlnzMY5NC1vxLcYeZ6+3qbgukV4m2HTthSo79xjlTMy++Clc3RTUc9eVA2UsdVdCEjTNgwSz2SMlpqK2gDr8XqTVysFpYt0NDbbYSEjYDarm6pKBzrUAPbXTlEoMnQ5ZsCXaOc7yeJK5nxHiudrkwbuIZuA2KnRAt7Y2Efce6vGXYrZObU0tlJ5h3KFfZuUMK5e0Fe6FIdHM2oGszdrslrOtGhnWuQV+aS6r6h8KuU/fPg7r1wxqS4FXrGXHSI8tvfq40D0afA+KsDr3K3HSur+muo2Kas4PaNQcKuAmWe8xw+wsjZaD3KbWn5LiFApUnwUkiuT8yKmXGUy6kHcHvrcPo99VnNONWblohd5pTY8z559nQtXqsXNtG7iE79B2rSSdvFTSfFVRNpDwtCiQDU5Vtnt9q28cekeHUpq0eYuizTvkyddc/RPkuktcyPSlpH7OunaunrY5JGxG/dL/766b1zN9KY1trVpq8O9dhnI+iSk/w1HODfnmF1+CkjEPzbG6Foa24vYp0VD64jSVEesOUd9VJwnHyd+xa/civTHyTCSKqZtziwDtIUUjzrpqHDh6gc4BcvRZiaMYshvd2qi+8rHwf2hn9yKpZ2nGNXBJS5AjL380CqtOSWpw7B6q5iZFfALToPz19BkF2WRXvpE/AOtruHavrT3NNa9BLii5aTZ9OiwkKCnbHOWqVbJA/FLKjsjf8ZspUPOukHDHxU4jxE2Z6GI4smY2hpKrvY3XOYoB6duwo7dqyT0323SSAoDoTzqbc5k9m71SfqqxG85NpXmlp1YwN8sXqwPiQhIJCJTPc5HcA70OI3SR7d+8A1o2LMFSlWgOjS7QyMMwRv5jxvx2hb/hDHk1LzDZOoO1oZyudoXaOlY1prn1i1SwKxah4y6V22/wW5rAV8ZvmHrNq/KQoKQR5pNZG44hpCnHFpQhIJUpR2AHiSfKudnsdDcWOFiMutTyCHC4WsOIniAxLh3wF7L8iBmT5CzFs9paWEvXGWRuG0/ipA9Za9tkp8yQDy0zPJNRtf8oVnGr99cuD3OVQbYglEC2tnuQwzvsNh3rO61d6iayHW/VGZxG653jODKW7jVmdXacaZJ9RMRtWynwPxnlguE9/KUD5IrybjpjthCBtU/YFwnBp8u2cmW3iuzz+iOA81B2PcZxnRnU6SdZoyJG8q3RrHbYiAhLKengBXuqHBI27AV+yJTEZJLywKo03mG4rlC9qki7G5EqKRy8X18yqa6YjaLtHWy7GbWlY2IUkVnvDxxKZ1ws3pi13ibPv+mj7gRLta1F161gn9vhk9QB3qZ+Kob7bK2NY0w4lwboVv7RXhdre1cYbjLiAoKSQR51i6vRpSsS7oEy0EHtHODxWeoOJp2hzLXw3nVvmDsK6943kdjy+w2/KMZuke42q6R0S4cthXM280sbpUk+0H3juPWrlXPP0c+s8rE8qn8N+SzVKt88PXXF1OK/anRuqTFHsUN3UjzS7510MrmCt0mJRZ18nEztsPEbj8b103TKhCqkqyag7HD4C5Z+kSShXFpb0KSlQVicEKSobg/h5Na4jYXYpDCHvgbSSobkFArZXpFkcnFnZ1/0zEon1SJArGrO0HLe2dvCp4wIQ6kwgeCgLSZMxZapkw3EbNiwrI8dtFtgOKjRGu15TsrlHq1Pr0aat+F+CCdym/XcH+6Cf4ag9mrITDc/MP2VNz0aH/wDGdtPlkV2H+FTWvaTv+zhgfW8itg0UR3x3xXPJJtvUrq5j+kpYC+JzEVq2Uk4e2nY9R0mSPD566cVzN9JOCOJLDFeeKEfRMd/21HmDDasQuvwUlYrJFIjW4LT8TELHLjofVBZSojqOQd9W+/Y1aLdEU4zDa59jseQdKzKyICre37hVmzRHLFP5tdIvA5K9ty5Zl56O6bEMvNr8VNX0ZYA4c5aQdyMqum/z9ka2BxxpSvhM1PCu77hOf5RFa79GX00BuQB6ffTcf3rNbI43EBfCfqek/wDN94/QpBrmWc+fXE/6n8S60p5vTYZ+wPBco8Bs9uu9tabmsIUoJ6LKevz1l4wXHh3stfuRWOaXdYTPtSK2C4hKUlZHQdTXTcjCY+AC4LmGtTkeFPPYx5AvxVgOD4+P6A1+5FeasIx5aSgx2CD5oFXVVwt4JSqW2D5FQr9bfiu/tb7avcQavBBhHcFYCbnG5l7li0zSywvEPxI6Y76TzIejns3EnzCk9RW0NLOKPiH4fJLSFZDLz/FWiA7Zb5IU4+2j/o8o7uNkDuSrmR7B31jqUkHmST7wa/XkJkNlt4A7jvrG1KgyFUhGHMww4dGfUdyzVKxdVaTFDocUlu8HMLp/oTr5p9xCYYjMMCuKldkoM3C3SAES7dI23LT6N+h8QobpUOqSa2PXGrBdS8j4adSIeq+JNOPxklMe/WxB2RcYBVutBHd2ifjIV4KHkVA9gMVyeyZpjVry7G5yJlqvMNqdDkI7nGXEBSFezoRuPA7iudcW4Zfhyb1Gm8J2bT5HnHeuiMOV6DiCTEzDyOwjgfcouccKU3HVXhlx24bG0ztSmnZSFfFW602FMg/OVfTUtx3D3io6cdmlWT6iaMtZJp+wt3MNO7tFy+xttp3cediklxpI7yVNlRAHUqSkeNbI0F1txLiA0ytGpGJSUluc2EzYpVu5BlpA7WO4O8KST03+MkpUOhrVFn1yr0p1ze4bOLLWnU/7wp+Vwocq9RJrMOUhgxGnbsgJfWpSVepz8iDsOhcTW3OHPA9UeMzivgcZeR45GxfCrNMbdgoRJS6qSuGhTTMZv5SyFkqdcUlI6FKR1G2VcN3CxqAnih1pn6s6Z3GNgucW+/24SZRa7KYzKuCFpCeVZUCWwVgkDYgHoRVZwX6ZcSHCfrTkOkd6wC93zS693BYYv7HZKYjvJT+Am8vPzJS42Etujl3CkpPUJO/gXqk1xrW+23PhO1Uh3YpEf72Jbu6u4OISFtn386U7e2r3wtv3GTw3aYP3VSjKViVq7Qq7z/OyAN/m2rSXHXm0nURux8GenL4lZfqVJZF4DXrC0WRtYcekP7fECgjoD3pSrzTvK3HLHAxjH7ZjdrQUQrTDZgxknvS00gIQPoSK9Xi1Fxd7fsYwd/8Al+D/AKdWDTFQ7F4fkIq+8Xv/ABYQP/mCB/p1j+mRHZv7f0tNcoaevnWF9weJUk0T/Lx++7+FXLUbrZzt/S1VCtvA9Wsplz7rYNQ50OEZbrTTAjl3kCTttzcwqauooBsq9v6WqrXwi2K23jTue/NjpccRfJydyPDmFWWg+mylUqExCm4Ye0NvYi+dwvqdnI8hRBFlnartcC/NZyiEjBeIewKMmFn5mKR1DUqEpKFewkE7fRW49F9V77KmKsGVQV2+8ROUPsk7oWk9y0HxSfOplSMFx99stqgtdRt8Wo2cQWm7GFXax5tamw2EzhCeKRtuhwEgH9JI+mpY0i6O6RNUWNMykEMiQxrC28DaCsbQsQTU7NNkp12u1+Qva4O7vyW3oUlEyOh9B+MOtW3Kbe1Os1yhLSCmTGLoB/HR0P0pI+iqXBZnwq1gE9wBq7Xbqwg+B7Rs+5TSv4QK5Ckg5ryzfmOxXZYZWasNx8M15cLN5M/TH7iuOczmP3GTbtieoRzdogfuXNvmrcNR04TpQbvuodnB9VufElpH56FpP7wVIuu+cFTbp3D8pGdtLAOzLyWr4lhCDVo7Rvdf8Qv5pUYNYJ6L3rW82FcyLBbWYvf0Di93VfPstP0VJ8+VQ4tM1WU5dlORJPMLpeX0MHzbC+RH6qRWj6aqh6Jh8S4NjEeB1DM99lmcEwLzUWYOxjLdbiB4XW1rUgW7EWlkbKU0XD71daxHTy9CRf5rald7xFZdlzyLZjymh0ShvlHuA2rROj2TonZTcwle4bmKSPmNchykq6ZlpiOB7NlttPl/SpSYinepKT46ZUB9hXUKQfsrF+GeULZfM2w9SyOzmM3JlB/FcSUL2+dCfprMGlBxAPgpNa3xGX96vEPBaUeRnIIMiArfuLiQHUfP6hHz1IWiKq/J+J5e5yiAsPXs8Qte5MzNOmpfeAHj9k3PddSTpSldtKPkpSlEWmuK1XLpe17bzBH65rC9KztPk/8AVUfvqzXisAVpe1v/AMswf35rCtK//KEkf9FR++rlLTx87Q/9sf8AIqS6D/l6J94/wLKtR+uIP/8A74Gv3hBAGkadv+Vrh/lzTUQb4k+PYfsNfnCD/wAUm3ld7gP8MaraBzerTH+2PFqx1V+Yh/uj/iVtzJ8htmJY5dMpvTwZt9nhPT5Th+S00grWfoSa4xWu+3jUbLr7qZkhKrnlFxeuTwV/Q0rVuhseSUI5UAeSRXRn0huZrxThnvVsjuhEnK5sSwN9diUOuc7239iacHz1z3w+EI8Rscu3KkCv0G0YU4HlZxwzvqjqzPxzLm3ShUzBl2SjTtzKyRCEoT5ADrWvdRM2ax+G7JJ5uTohG+3MrwFZ7cHewhuLB2O1WbQLTP8AZn4h7da50cSbTjbJu8ttQ3Q46FBLKFDxHOQrbyQaknEtV+SZF8fgFGGDaQ2sVFsOJs3rArPpXxUZTaxk9sxYRorqA8xGkPMsPOoPUcrazzdR3c2xNV2D5ZdS49a8ihOwbnBdUxLjPIKFtuJOxBSeoPsrsDZtJbOzCSmQwlS1J6kjvNc8fSEaSXTTXVDHc2w+xSZ7mXRnbeqLEYU4t6ZH5Sg8qASSWlju8G6inDGNZqLP8nOO9V1+q2fgpkxLg6UjyBEpDAeLbBa613OyuBDSVJ9flHU77AfPWtMj1htmOZDZ8vx6cGr3jdxYukVSDzJ7RlwLCSodwPLsfYTWaYFwacQmrTzUrOZqMQtjhB7KQkuSin2R0EBJ/PUD7KmroV6PbRPBH41zueIjKLi0UrMy/gSQFDruljYMp6+aSfbWdrukGULHS8Ia98j8fmsRh7R46Qismor7Obnl8eSmTjV8j5NjtrySI042xdYTE5pDieVaUOtpWAR4EBQG1c5/Smp/339MT/8ABbj/AJw1XSaO0hhhtltCUJQkJSlI2AA7gAO4Vzh9Kc0f2UtLXgO+13NJPueYP8NRvhAj5ag24nwK3/ERtS43QtA2FRTET81WnNR2sR1J/FPdVzsf/BRVsyw7x3R+Sa6Xjf8Aa9S5olhaeuOKsuIcLWvmZYpAznFcmtDlvubano7T8t1DoSFqTyqHZlO+6T47VZ5TWp+lmSx8Y1PsLsF2SCqLKSQtmQB3lDifVVt03HQjcbjrXUngfw623ThYwKVJaSpbsJ8kkf8ASnh/BWLccug8C96K3+7RIqTJsLJvMRYT1bcZHMvY+HM3zpPvqApHGE9J1Pkorrs1rdV7LoSew5JT0hfUGsW3vbfZQxtM5M2MlYPXava7MplQFoWkHoQaxfT+YZduZWTvzJFZZK6R17+VT9Bi8vA1+IXN83B9Fmiwbipc+jCzd+fp7mGmEt3mOIXsSIgJ6pizElYSPYHW3j+lW1eObUp/TXhwyV+3SVMXPIQ3j0BSTsoOSiUOKHtSyHVfNUWvRqz1xtf89tCV7NzsZYlKTv3qZlJSD9DxrKfSd5KJ2QaZ6dNOnZK5t9kt79DyhLDJI/Se+uufZumNjYtMuB6peHHsue0rpCUqhh4cE445hnfsUXMGtDdttbDCGwkNoAA2rIJbgZZW6r5I3r7tEMNQ09PCqHKXfg1vV12KhXQcK0KFkuYYsUzk4SdpK1Xl+RZHcLzFxfD7a7c73c3eyiRmk86lHz29wJ3PQAEnoK97xolxS4ZaXMqu1kYnRI6C9IjRJTb7zbYG6jyJ6nYd/KTUj/R46SsZ7luY6nXGP2nwJ9FkgLUn4g5e0fI9pBaT7tx410CuelVqdtim22khwJ6HbxqC8SYznYNTdDlj6rD2rpDDuFJJlNZy7AXOF9i5Dad5Y3fYjb3NtzjqN+41sEIBT7DWJ6w4EnRviGyLEYLPwe3TVN3WC0BslDb+5UgDyS4HAPYBWVRl9pGbWD3pFTBh6piqSLI43gKEMX0r5JqDoTdl1il6ud0wPJbJqPj5KbljNxYuccj5RbWFFB9ik7pI8lGuy2M5Bbsrxy15RaHe0g3eExPjL/GadQFp+pQrj9lMMS7e4hSQeZJFdCOAHL15Twz2CDIWVyMZkSrC6SdzysuFTX+CcbHzVGWlCQAMKcaPsnrzHxzqTdFlUdFgRJJ52ZjzUSvSONj+apxxY71YiwD80qRWO4+0DbWj7Ky/0jzLY4m8UdHxlYmjf5pb+1YzjiN7Y3Wz4Edakwzzea0XS0/VqXYsYzxPJFc/MP2VNH0Zqt+Gkf8AzLdv8omoaagp/nZwD8Q/ZUyfRmADhsUkeGTXX9+isLpMzkYZ+15LYdDztYxOhSyrml6ShO3EbgxPysWWP8ccrpbXNb0laD/NC4Cvzxh4f42uo6wflWIXX4KVcV/NEboWv7Aje3I38hVmzpv+diPyav2PD/wag+wVZ85SPgp/NrpBxvC6lyPKO/vDrUwvRkE/sBXZJ+TldwH+DYraHGkgOcKmqKT/AM25R+jY1q70ZCgdBbyPEZZP/wAkxW1uMpAXws6opP8AzZmfva5nnsq47/c/iXYtNP8AdkM/YHguUulu3wFj80VsOSN2Fj2Vr3SpO8COT+KK2PIR+BX08K6dkT/ZwuWK8f7xf0+a0fnFkyi+ZDb7DhNtE+83N4ssRfUBeUElWwKiADsknqfCrNcNKeI/Fm1XG6aWXZDbXrKXFbDikjz2ZWo/VW9NFLc3cuKrS+E+AW3bytKgfL4O7XTe8aMWyWxzMNJS5y9CBsaiDF+I5yj1PkoB9WwKnXB1LlqhSWvjNucwuOWl2qMi5yTbLstaiPV2dGziFA7EHz+3zrcJCVpCkHdKhuDV045NB2dNMltGqVpiJjrnTBb7qG08qXlqBLTx2+UeVSSfH1d+tY7jMhUy1tKUdyEipBwjXzW5IRHbRkVGePqFDo82IkEWa5eN+gNTYLjTqQoFJBqZXowtQpN60jv+l1xkKckYFeFMxQo9RAlAutD3JcD6R5DYVEa4Nbx1nbfYVtH0b98+5HEvmOMlwpavuMCUE+CnY0hvb6EvrrE6R5JszSHRLZsII8+66y+i2fdDnnS9/VcO8LpmRvUStSOFLUzTvUG4638HGWW7G73d3O3v+I3VJ+4l6X1JWAn9pcJJO42G6iQpG6t5a0rndT4oix+MLiGxNsW/VPgc1CFxa9R2TizjVzhuq80EdQD5FR99Utw1143dY1iw6N8My9NYsn8G7k+eS0BcVJP7Y3ESOZSgO7cLHsqYmwHd0psN99qItJ8OXC/jug7V0yS5XyZl+oGTq7bIsruXWTMXvv2bYJPZMggbIBJOwJJ2SBuylKItHcX6uXTGB/8AMEH/AFlY7pf1RIP9TRWQcYP/ABYW/wD+YYH+srHtMeiXx/UkVyhp7+dIf3B4qSqH/l4/fd/CrrqL/wCRl/1tVfnBiB+xtciPG+zv3ya/dQgVWdQH9LV/DXpwbsqa02uO6T1vs7w/KTXn9H8/3pMD7HmFb1n5gH+4PBy33WluKwNO6fW6Gdu2k3yIlvz9ULUfqFbguFygWqKudc5jESO0N1uvuBtCR7SelR5zu/HVvLoP3GStWP2MrLLykkCVIVsFOAH5IA2T57qPiKm/STiKToVAjiM8B8Rpa1t8zfI5cAN6wOGJN8WfZMkfo4Z1id2WwdJNsuvcrtp7Gcj2v1x4AVfb44hi3doo7BJWs/M2v/bX1aoaYMNDIG3nWK6p5BHtFgmFTgBaYKd9/lr67fuU/rCuJaeDEiF+8+eQWzNBnp4Bu8rH+EaUJWfaivIO6d4Dfz/hj9hFSkqLPA1EXJsWS5WpJ5b1eHVNKPymmUhpJ93MHKlNXeuDZN0hQZWA7aGDvz81qOJYzY9WjvbsvbsAHksf1AvgxrCL9feflXCt77rZ/L5CEfrEVGfSSyfBGLPEWncp/DrJ8SBvv9Nbc4nLuqFpym0Nr2cvVxjQwPEoCu0X9TY+msP08iBMtawnpGjobHvJ6/ZUB6fKmXzkCRBya0k9Ljbwstow3D9Go8WY3vdbqAsO9xVPrRdk23HJClL5QllRJ+atEafwJGMP4bc5KSj75LQqYonxcL61/TyOorPeKO5ujGJUCIr8PMCYjQHeVuEIH1qq6634mMUwjTy6Rm+VFlks29atu5tbPIPrbTWvYBw+KhhCqTJGdhbqNz3LLQJn0SLJSx2RNe/W2w7ytwWaT29vYdB33SK1nrA4rHcgx7NGwQbTdI0pSh+IFgL/AFd6zXBpXwm0IG++wBFWzWGypvOISminc9mofVUU0WbdTZ6FMNNjDeD329ytJQNgVEwn7HXaegqQLa0OIS42oFKhukjxHhX1WH6QZB98+mmO3hSt3XIDbT39dbHZr/WQazCv0SlY7ZqAyOzY4AjoIuo1jwnS8V0J+1pIPUbJSlKrqktNcVx20wY2/wCWoP79VYTpUo/dKUP+iI/fVm3Fbt+xezv/AMswdv3ZrCtKk/8AhCT/ANVR++rlLTx86s/2x/yKkug/5ef94/wrLNQztiT3uP2GnCF/xSn/ALYuH+WNfGo24xJ/b2/Ya+uED/ijIPeLxcP8saqaBc6rMH/1jxasdVfmIf7o/wCJUf8A0oN4S+vTDD0ub9tNuF1dR/Wm22kH/DLqNFii8kQdK3R6RiYidxB4daQvm+AYup8p/FL0tz7Q0K1Xao3LETX6V6PIQhUlh43PeuOtKM3epll9gAVryP8AB28+7et8+jAxZq4XLUTNHmuZRuES2trI+S22pxQ+lxP0VoXMj2cBY/JNS99FxawxoTebupPrXDKp69/MIQygfvTVnpLmC2nhg3uHvWS0TQQ+YfFO4eKmUAANhVFc7VFuSAH2UKWnflWUgqTuNjse8bjyqhvecYXjUpMLIsustrkLQHEszbgywsoJICglagdtwevsNW79lrSw/wDtKxX+/Ub+PUGiFEcLhp7FPFwq23YbZ4CudEZG/uq+NstNJ5W0ACsV/Zd0q32/ZLxT+/cX+PQauaVHu1MxT+/cX+PXvIRfqnsKaw4rLa5z+lOR/vg6VrA6mDdU/wCEj10FseUY1k7br2N5BbLq2woJdVBltvhBI3AUUE7EjzqAXpSWyrO9KTt3xbsP141Z/Cd2VmDfifArB4kP91RjzeYUcLC0fgYO1WnLEbMu/mmsnscUiGOlWXLmNmXTt8k10pGdeWtzLmSVjAzvWulHAWd+E/ANvCHJH+OP1sHX5qK5olni5gHZNY1c3FE+AEVysA4EEJa4UsATuN/gcg/44/WIcfmuFjxXS+do5Z7k0/l+btCAIbK93IkBah28h0D4iSgFCd9ior3G4SSOYGSkWeqxl4IuS8/8tvUupjMw5WnCPFNmhgPcueGmMVTdlilSSPwST9VZbdF9nEWd++vqx2QWuC2zy7ciQAKt2Uykx2Oz38NzXUUBno0qGncFytMRxPz5ezYSty+jcQuRxOZS+gnlYxF1K/0pcfb7DVLxy3Ry/cYL9vU5zIsONW6IlP4qnFOvH6Q6mss9FTYXp+Tan6irQfg6jDskZZHeU87zu30tfTWr+IyYbvxkalylq5vg8uFDT7A3CYG3071Dkg9s1i6LEH0QfJTXWA6QweGHaQF6xI3LFQNvCsQ1FPYwlDyQTWfxm0/B2wfKtf6nbCK97EGpcjxNWATzLnijv5WoNB4qbXoyMdRbeGiHeFtAPXm83OYpW3VQD5aT9TVS4IBGx8a0DwH28W7hS0+QBt21uckHp4uSHVfw1v6uV6i8xJyK4/WPiuzpNupLsHMPBc0PSY4y1ZtXMAyplvlNzhTIDqtu8tOIWn/KqrU9pc54DfXuAqTHpVLagYxpvfQn14+QvxubyDkYnb6WxUXrAsqgI6+FTno2jF9Ma07iR3qC9KcENnWvG8BVV2AVFPuqUfoxb6DB1LxAuf8AA7pBuaEex9lbaj9LAqLNzJ+Cmt1ejVuimNds9sgVsibjceWR5lmUE/Y8aqaRoIiUp7uBB71baMIhZVLcQVQekgSn+aTw8+JxQb/3Y9WL44kC1N7VlfpIUj+aPw5Q7/vVP+du1ieNq3tTdfOBDekwx0+KxOl35y7Fj2oP7Q5t+IfsqY/oztv5nB3b/nPdf3zdQ31AI7Be34h+ypkejP2/mcnwPDKLp9rdYjSV/wBiz73kVsWh0+tEH2VLGubnpKk/7/2nxPjjckf42a6R1zh9JaANc9Ol+JsEwf40P9tR1hE2rELr8FLGLPmeP0LXWP8AS3IHuqy5ud45H5NXawKP3PTufKrPmpBYJ3+TXSB/wb8y5HlR/b+tS/8ARibjQzIB5ZdO/wAjHrcXF6kL4YNUEqHT715x/wAGa076MUg6IZGn8XLpn+Qj1uXi2APDJqgCP/Va4f5I1zRUMq0//c812HS86XD+4PBcpdKGd7fHO3yBWx5Lf4FfurXukIK4Eb8wVs+UyOxX7q6WkYl5cLk/EMTVqTxz+asOhKOTiy0rX/8AHSPpYdFdfkfET7hXI7Q5lKeKzS0n/l0/5B2uuKPiJ9wqCNInzsPujxK6M0du16K085US/ST4/Dk8N91uy209rEuVsW2rbqFGUhP2KNQlwdgi1Ng/iCpnekvyuHH0isWnjboVccpv0dxLQ7/g0Xd1xfu5y0n3qqJuNwPglvQgjb1QK3LRlDeyRfEOwuNu4LQtLs2xsaFBBzsvycxvEdJ8EmrxwNvKY4z7Qho9JGPXVtftSEIV9qRVBeimPapLpO2yDV89H5bfutxcSLiEkps2MznCrwSXHGWx9PMqtjxvGAo8YO3hYHRfrPqrXbs/BdT6UpXNq6WSlKURKUpRFo3jA2/Ywt4P/OGB/p1j2mfRL/8AWkfbWQ8YI30xt/syGB/rKxvTVe/b7eDSPtrlDT585w/uDxUlUL/L5++7+FZtcrCi/NpjuucjW2yj41ZYukVitzamLdOmxG1rLikMSVoSVHvOySBufOvDKcvl47KbZZgNvoW2FlSnCkjqR4D2VYjqrNJ2NnY/t6v9lQtT3x5dmvA1gTvD9XwVxLylSdCHIH1D0eaydOluMJcDs/tppSdx8IdU4N/0iavzMGDBbDMNhDaE9AEjYVi+K5qq/wAtcWREbjq5d0cqyrmI7++r1e4E+4xFtW+6Pw3QCQWtt1ezcjp81Wk7MPjxdWYvfiSXK3jtmhEEGaeR07B2L6u+QRLSnkWpLklYJbZ5tj+co/JSPEmoncQeqEjJbvC00w534Zdbs/2CVJ8Vr/bHlDwQkD5kpFU+tepec2C5jAcQxaXMulxUpIfTuoLIHVTiz3Ad/rEAVm/Cpw4zrZdXM1zJwXG/zgO3kkboZQTv2TW/hvturvVt4DpU3aMtHEWrRWVKb/wBmPtKvPzcthyGdR2tHIy5rjaebh8Wk/oPgsPAMAtePwkENRIyGUkjYq2HVR9pO5PtNbIryix0RWEMNpASgAACvXurrNrQxoa3YFF7nFxudpUduJe4GfmuIY0g7iMzIuLo/OUltB/VXVxwJkItL0xQ6uuqIPsT0H8NYPqLd277rTkkwK52rKyzbGyfAoRzLH7tavorYdsR9ycRZC+ikxgT+cobn7a4g0t1H5RxFMEHJrtUfsi3iApSEEytHlpbe4A/i9bzC0fqCn77tXMPxb46HbuiU6nv/BsguHf50D6a33xHY8q5aIXVhpvmegRkTW9h1CmVJX0+ZJ+mtH6TRzk/Es7IUCtqyWpat+8Bx5xKR+qldS6yu1N3jG59qdSFIkxnGCD5KSUn7a6H0W0VsLBwgOH+MHd41Vr2JZsy1Vg6n6kM7b6y0Do9d0zrNGUFb9oykj6KznIIwnWWSwRvug1pPQqa9AiNWuSSHYDy4bgPeFIUUn7K31ypdbW0eoWkiuPqlLOk6hGlzkQT8dy2CsNECd5Vuw5hWThcuX/ixfcXcJDllvDoSD4NvALT+tz1uqo56Nzvvc1xveOrJS1frb8IbHgXmF/xVq+ipGV3Fo3qYquGZWNfMN1T+zl4WWm4og8lU4jhsfZw/aFz33SlKVvK19aY4sTtpex/21B/fKrDNKSfh8r/AKqj99WbcVu37Fze/wDyxB2/dmsJ0oO8+UP+io/fVylp4H96s/2x/wAipKoP+Xon3j/Cso1F/wDNN/5/sNfvCArm0nWPK8T/APK19ajAfek/7/4DXzwfjbSp7/tqeP8ACV96BRaqxx/6x4tVhVfmK/8A7B4FQ248JHa8W6GlKO0fE7ckezd6Sf4axC2uI+CI61f+P2QIvFvudx2mK20+/wDCSBWB2u4c8NBBr9O8BwtekwrcFxbpKl3RKs93R4Knzl4fBHAPxT9lTo9GtFSxwsWeQB1lXi7PH+61J/0agBms4KiuDf5J+yugXo2Hg7wo2FAPVq63ZB/uxw/w1relKE6HKQr/AFvIrbNE8Lk+UvwHiodcc9qtF04z7+zkEBudGVZ7Tsh5PNyI7DuTv8Xrudh03J86x6HoVpNKYRIatMHlWNxu2kVlfH4RE4wZrgGxex21rPt2Dqf4KxK2XSOITYU+gHbuJArZMFQWzFIg3+qFr2kaLPwqo4ysZzBzE27FXDQXSnl5TaLd+4TVJetH9KbLb1SkWKA853NoS2k7n29OgquansO9EPJUfYao73KAikE1tMSQDWkg36go9gzdVMVrXzUQi+zWPvUmPRdNwoaNVbfDjssJTcbY4G20BIALLw7h+bVs9J+2hWY6TqPf2V3H1xq+/RfSQvJtV44PcbQ59UkV4elIdDOVaTrP4t3H+bVAuqW4vI+1/CulHF0TCee3U81omzto+CJ28q/ZmKP5ETGj7JChspZ7hVvsc3mhjrXnectmWIhTDhCdtyN6nsQSYA1lzXyMz6QRL+3uus6scHXLGsah4ZYNccntGPQEKbjwbfJSwG0KUVKSFpSFjcqUfjeNY8zgVpsM1+6yH3ptxkqK5EyU8p595fipa1kqUfaTWI27WVy6SDEZnoWpPxglZJT76yQXZUxtLxWSVDvJqyptMlGPMSXa0E7SABfrV9UZvEcRogVKO4t4bl7XKcxFbLiyEgdwrTupGVrQ0IkNC3505YYjMtjmWtSjsAAOpJJAA8SavuoN3uFtgvzWQHlNJJShSthW9uBvhGyDIMlt2ueq8YF7ZMqxWxYCgwlQ3RJdHcFcpBbR4b8x67AYPGGImUWXLD7R2Ld8C4UNQiiYefVbtUyuCzR1WiuhtlxeYylN0ebVPuyh8qa96zg38eQcrY9iKgDq/JDnFdqqtR6jJHEfMltsD7K65QYbcGEiM2kAITtXHTXGUYXFjqs0o9TkjqvmLbZH21FuAnumKw+I/aQSe0KT8ey96IYTNgss+jyUpZR18K17qa8FRJJ3+Qav8a4EsIPN4VhmoEoORHwTvug1Pk1Kky5PMubaLKFk+08/muo/BsyGOFzTNA8cdjL/AHW5/hrc1aT4KpiZ/CrplIR3CwMt/OhS0H97W7K5LnBaYiD7R8V2NL/4TegeChh6UiOhejmJSFDq1l0YA++NIFQ7x0gwkj2CplelJVy6F40dupzCH/m8ioWYy+DCT+aKm/RcC6RcPtFQppUZeYhnmVyvBCYSiPCthejvmqZ4sZ7AVsJWIzkkefLIjK/grWt6eHwJXWs59HqS5xebp7k4rcif7ZHrOY+h2pEW/BYfRu0ipsPSsw9JMpLfEThKiPjYsv8AzxysIxuQgWtHWsu9J292Ov2CHxOLu/52utXYzcf/AAYgc1WWj6EX0mH1+Ko6VpUxagXDmXpnrwUysA/J/gqZXoylc3DnL9mVXQf5KoP5nNCmlHf5NTd9GK4F8Ok7b5OWXMfqs1idJ0PUkWfe8is5okhGG94P1VLiucPpMjya26bKPjYpw/xlFdHq5telDc7HWTTJzzstwH+MN/7ajPCIvWII6fBSpiduvSYw5lrawvD4Anr4CrLmbwLJH5NfePzd7ekb1bMukAs9/wAmumuRJl78y5RlpctnutTT9F+sq0VykeWXyv8ANo9by4qUBzhr1PQRuDily/yCq0R6Lp1Lmi+WJHejL5G/zxY9b84oNv5nHU4kbgYndD/iy65fqg1a1EH2/NdbUnOmQh9nyXKDSAoRbou/ihNbTfIU0sDyrTWk80fc+L1/oafsraKbilJ9b1h4jeul6fBc6XBC5PxJAeai8jj5q1YzdrvgWrOKamwsYlXxrGbgZjkNhwNreHZrRyhagQD6+/XyqTl19IhqTPiKj4dw2vMS1DZD92vgLSD5lDTXMr3cw94rS9vzqHbmQy3aUHbx3FesjUp5aSmPb2W9/EmteqeD5arzQmJqCXEZe0QLdAKzFJ0gV6iSvocnBbq7icz4qx35OpuqOZu6l6yXhqZd1tBiNGYb7KLAjgkhllvc8qQSSSSVKJJJJqoUppv8G2eienvqlm5FOuJJed6Hryp6CrFd8ng2VntJbpU4ro0yjqtw+QH8PcK2OUp8KmwBDYA1o3DYFrs5MVKvTJmJ12tEduC8s/vLcOAmGXACvd1fXuQn/v2qQXosMTclvZ7qpJYITcZLNmhLI+M2zu46R7Odxse9JqDl2vGR6qZbDwLDmPh15vUhMdIbO6Gx49fBtCd1KV7CfKuyXDPpXbNH9KbHhNrSC3bYqW1u8uyn3j6zrp9q1lSvnA8KijSLW4boQkYRzcbnoH5qeNG2Gn02H6VHFjbxW2aUpUPqWUpSlESlKURaN4wFcumFv/8AmCD/AKysX01UR8I2/pSPtrJ+MIb6X2/2ZBBP+UrFtM1AmRv/AElH21yhp7+cof3B4qS6B8wO++7+FeepxJS6od6YYIPzqqIrGJarZMZd9s2oE2LD+FOtNsBgr5OQ7bc3N1qXmpo3ZkHyhj7VV7cIWMWm+6UyX5sZC3PuzPRuRv05xVDQjTJSqzMaFOQw9oZex43Cr1adjyFHZFl3artYDqsVqPQ/J7imGIt2dUu5Wl8tSCe9ZB2J+cdfnqTTTvaNJfaO4UkLT7fGo+6lYynTnW/eO32VvySKFjpsA+36qvpSUH6a3LhlwMyyttqVuuMezPu8PqrQtJVC/q/XosJgs0OuPunMKpNRRUZGDPt2kZ9Ow94K15ndnttr1Xxq+Tmx9zrpIRBkK7gkPeqhR9yimpUWWyQ7LERGitJTyjboKj9q1jxyHDJjTSSJEFXaNKHekfGSR7jv9Fbo0ry8Z1p/ZcmUR28qMlMlO/xZCPUdH7tKvpqd9BFcExTo1Jec4Z1m/dPwFreJoHLS0CdG0XY7qzb2i/Ysrr4feajMrkPLCG2kla1HuCQNyfor7rCNbL6rHNK8kuTSuV5UFcZnz7R7ZpO3zr3+apznJlsnLRJh+xjS49QutUlYDpqOyA3a4gdpsouYa6/ks+4Xx3cuZDd3ZHX8Vx0n7D9VbmziWYNgUhv5Q2AHl4VrzS+1pjO2mOE7CM0Xz08h0+sityA2d5SHJrXaqb+ICjcJ9vvr8+KvH+Uak6JEcBclxJNtp/JSxWY7YE1DDW3azcOweAWheHq72vCMyyrJ82MqCu4yGW4oEN10qZbQfW9RJ2HMtXf5VIV/X7S8tqQbxO2I26WuSf8AQryLmPE7mGDv/Ua/ObHD0+BJ/tNS/StLlTpElDkoAl9VgsLudda1PQZGoTDpmNCiazttnC3/AAKj7Z34sfUbJZdmU6u0zrkZsN1bK2uYOAKUOVYBBCiod1b8hvdoy06D8ZIpIjYvKbLTsBBB/qWx+mvNlLEZCWY6lFtHRPN3gVEGI541OoOqDtTWeSSGG4FzffnZX83Nsm4bGNYRqADPO4Ate+WfUtZ5LI+9bWbDclHqNm5phvK8OzfBbO/s3WD81SkHdUXtfIDy8dFziA9tGKX21DvC0HmB+kCpGYremsjxq139kgouMNmUNvy0BX2mul9A1S5Wlx5AnOG646D/APAsLieHykCWmhwLT+ybjxKutKUqeVqC0vxZr5NLGj53mCP1zWC6UOn7oSQD/wCiJ/fCs44tv+Kpr/tqB+/NYDpTuLjI/wCqJ/fCuVNPI/vJh/8AWP8AkVJmHhegRPvHwasz1GXviLp3+V/Aa+uD476WSh5XyeP1xXjqKQcScT+X/Aa/eDhYVpjPSD8S/wA8H6UmvnQIb1SMf/X7lY1Yf3F//QeBUL/SXMGDxNY/OKCBMxFhIV4EtypA/wBIVqCwyiu3oO/dUh/SuWdUXM9McpSj1X4txti1beKVtOpH0KXUZsWd54XJv1Br9PdGkwH0tjeFx2FcnaRZa04XnfZfWWbuRFEeKTU/fReTjK4ZFxTvvAye6xz86m3P9ZUDb3HL8Bew7gal96KG9g4VqPh6nPXtuQsXAIJ7kSI4RuB+dHNY/StAMSntifVcO/JXujKMBGfC5lqH0j2D6oy+JJvKMN0zyK/QXMZgsGXCtrzzCXUuP8yStCSOYAg7b+IqJN3tesFlt794vmk97gQYyeeRJlQH222k7gbqUegG5A6+dd7b/ZGb3F+DPDcVFjja0yt9k4XtRLw2kBTFsbKfzjJZA+2oypGK56A2DIw7Btw3tKkWew/JzL3zMUXcc1zy07nFbKVkBJWkFQG+2/z1k2QSymJ31hmnyVdi2rbb1BWRZI7tGSke2uk5Q2k81z5UILTUiBxUoPRXPlzONWUeAjWhX68mvf0rquxvGkrw7yu8J+qLVH6KRCl5lq3J29QM2drf8rmkn7KqfS1K5Jukav6veB+rFrn95BxncfW/hU7Q4f8A+Nhv2PNRmxuXzwR1q1ZvIJQBv8mvXE17wao809bYfkV0A915RQLAhBtR61hFpxZdlw+06nRw4WLtkdzscsk+qh1luO61t5cyHV/uK2jjk/t4oQVb7VnGlWmys+9HrqLLiMdpOxvMpV8iEDdQVHjxlLA97RcFacwK7pkMsrC9w4kVpGDKnysePLOObHkdRzW9Y3pl4MKZaNrR3BZLlsFM+A4gp3C0EEV0N9HPmMTL+HC1wXSk3PE5ciwTNyObZpXOwojv6suNj9E1Ad9sOsKR39K3d6ODPPvS12yfTGW8URMxtguERB7jMiElQHtUy4sn+tCrXSdTPSad6Q0ZsN+rf7186NKlyM26UdscMuldLVdUkeyuMnFYyu08ZGp7KugeuMaUn3ORGFb/AG12cNch/SCWlVk4vLlM5eVF5sVtlg/jFCVsn/JCowwBG5KsAHe0+IUl4thcrTHhY/b5XPEbO/yaxrNCpyK8R4oP2VdLG72luaUD4V4ZBG7eGsgb+qRXTcWzpc23hc5SoECcudxXST0edwTcOEDT8g7qiszoiuvcW5z6fs2qRlQ99FvfET+HGbYS5+FsGUXGKpBPVKXOzfT834VX0VMKuP6vCMGoRmHc53iuqZJ4iy7HjeB4KF/pTJaG9GMRgkjmkZcwoD8yLIJ+2oUY6vlhp91Ss9K1eQmHpZjCF7qlXW4T1p3+S0y22D9LpqKVmHJET7QKnfRVC1KXyh3k+5Q1pOcHTTG8wXtfZG0IjfvraPo3Ipl8Vl3lbdIeIyzv7VyY6a1BkToEYAnvrf8A6La3qmazai30N7og2SFBC9vlOyFLI+hmrrSTGDKTE57DvVto5gXng7hdUHpTnC1r5gCh3KxeQP8AHFf7a03jEkm2JO9bp9Ky0Ua06byCOi8fmo390pJ/0q0NiD3PbuUn4pr50auHyXCHT4lV9JUMOmdboXrlcglpQ3+TU7fRbuFfDpc9/DLrkP1GKgPlJPIr82p6eiyWF8O14A+RmFxB/tUc1idK4/sTPveSvdGLQ2I+3BTGrmn6VRZa1Z0uV52i5D/Ds10srml6V/pqbpUrbqbZdR/hmKivB/zzBtz+BUl18Xp0Ucy0XjkomAnrVHlcj8F3+FMcXtb0irflb2yQN/CuqMmywvwXM8GCDPZcVOb0Vboc0ezQb/FzB7/NI9SL4mxzcOmpw23/APFK6/5quo0eiedLmk2eDwTmC/8AM2Kk3xJgnh61LAG5OJXb/NXK5RrOVbi/f8107Sxanwx9lcbdLZfLCigH5CfsrZL0xSGlrB6pG9an0sVvFiDzQn7K2ZK3EV38w11RSiPRAubMQQW/KDhz+axi6ajuWpW0huKlJOwU44U7n6KtEjWdtpJKHLWNvN1xX1BNWi4WKLleXY1i84OGPeL3DguhtfKvkdeSg8p67HZXfUw4/o4tLW3ClVivb4BI2duzm3f+SBUfYlxq+hTIgPubi4tZb9QsEyVVlhHcLFQ2ueukotqSielA/wCisBB/drJI+ivPF8X1h1ulfAsHxuUIj6gh+5yCpLIH5b6vjfmo3PsrohhHAnppYJDb8PTm1dqggpdltqlLB893Sr7Kknh2i1rs7bReYQA2AEoCQEpHkAOgqP6lpEm5ppbBFucn48Vu1OwXT5FwcGi6jtwa8HNl0gjfdiWgXK/zEATLm63seXv7JoH4je/XzUQCfACbkSOiKwhlAACRtXxBgR4DKWmGwkAbdBVTUex48SZiGLFN3HetwYxsNuq0WCUpSqS+kpSlESlKURaM4wSRpfA28cgg/wCnWJaaEhcj+so+2st4wf8Aiwt42/8AWGB/rKxLTjoqR/WUfbXKGnv5yZ9weKkzD/zC4fbd/CvrUk7xph8oSf3yqvHBGSdKZu//AC9P/fJqzainePMT/wBCT++VV54JSP2MLigfJv076yiq2gE/26N9z3KniL5kaPtt/wCJXpxc4mubh7OXQmSZWPyETklI69mOjo/cEn9EVjOl1/bk9jyuAtzmQR1+WBuPq3qR2Y2WNf8AHptrlNBxqQyttaSO9JBBH0GoVacLm4xcbniUpSvheOT1sp371ISrdB+dOx+es/p2oAjwoNTYPsO8W/HMqOEYwm5ONIOOY9YdByPYbHrUi5LaX0qYWN0SUKYVv5nqn69x89WXhpurtkv2WaazFFIjyfutBSf6W5sl0D2BQQf0jV5S4JkRLzB/bEBxs+3vH11gmQXFGDap4vqC36kKS6IU4juDD45VE/mqKVfo1EOimvmh4hgPiGzHnUd17OzyVw6X9MlI0nbMi4+83MdZFwpQVpHipuqm8WseNtb894uyCsb/ANDZSVn9YordoO43qNXEHcvuvqtZLGlfMizWxUlafBLjy+nz8rafprrHSNUfk3DUzEvm4ao/aNj3XWsYTgcvVoROxt3dgy77L60/i7PSpAT0abQwn7T9grwvucXW2XR+JFbhFltfIlToVudu/wAaveEsCJYFzF/0Vbjx9w6D7KjXrhMul/l2vFLROeiy71OCQ8z8dtO5UpQ7t9gDXFNCpL8QVYSbBm4hovxUgt5F8ePHji7GDwGfgt2/sjXnbcptv638avw6lXbwFu+v+NUZE8OecPbE6gZAN/Jkfxq+lcM2bbb/ALIOQ/2lP8apjGgqob3N+OtYn+sND3t7ipLjUq8eVu+g/wAaslwvJ59+ekMz0MJ5EBbfZAjcb9d9z7qhu/oDm+PpVeFZnfJSIQMhTLjQCXAgcxSSFdx2qRujt7+F/cuTzbiUz2avft0+ytFxvgCPhCEwx7HXvYjm6yr+FFp9Vk4kWTGbea3P5LZmeW8XPFpLPLuQkj6qvXC/el3TSaFb3lbvWSTJtixv1AbcJR+otNfshoSYEmORvzIO1Yhwz3A2rM82wtw7JW4zdWE+/dtzb6G62jQXVfRq66VccorLdYz8u9YCoQvSKPFbvhua7qOR8VIilaf1Z1VyzCtQLDjWPR7dIbusF15TMxKgFuJcCQErSQUkjfzFeg1kzhgBmVpJKW8R8Zm4J7Mn50biuip/H1ApU6+nz0fk4jNoIO8XyIBWuQsPT0eAyYhBpa8XHrNB2kbCRwVv4rpDa8Hs9n5t3Z97j8qfEpbStaj9n01h2mENTUue/seVLLbQ9+5P8FXi+WDLs/uqctzlliCxb2lpt1uaUVJZ5uqlKJ+Mo7Dc9O4AAVccVtBtNtPaJ2dkLLqge8DuSPo+2uVtK2KpfElUdFlL8mAGtJBF7Zki+691ukiGU+leh6wL73NjcAkjK++wAvbK6odSnw3ixSflOH6kmvzgqWpzTW8rPcrI53L7tm/4as+s9zTAsCUqVsENOvHr7Akfw1kHBbFUzoxFlqHW4zpk33hbytvqSK3TQDLuM7GjbgzzCx1bIh0RrT9J/gCtT+lOxJ276H2nLY7JUvFr9HlLUBuUsvJUwv5uZbf0VAfCZgcSEb/HSDXYTiDwBjU/STJsHkJBF4tr8RJI+I4pP4NX6Kwk/NXFTCZU60zXLXeWVR51tkrhy2l9FNuoUUrBHsUDX6GaL6mGMfKuOYN+ornXSFTzGhCO0brLbQZEhtbBHxh0rYvAnnjOk/E+rGrw8I9r1DgG1IWtXKhM9pXaRgfar8K2Pa4keNYBHPKpLieviKud508Yzm0hdtkLjzmVJdjvtKKXGXkndKkqHUEEAgjuIFSbialsq8g+WebawyPA7j2qI8P4kbhuoMmY3+Gciuv4O43FRL9JrmjFg4aJWIofSJ2Z3aDa2Wt/WU2h0SHlAeQSyAfzxWpMH44+JbAcfbxvUHSODm02G32LN5YuCoLskDolT6A2tKleakcu/ftvWl9U8o1c4hMxj5zq2iLBj2xtTNossIK+DQW1EFRBV1W4ogcy1dTygAAACoWoOBKk2pw3TTQIbDe9wb22W37eNlNlWx7RIUg6LAmGvc4ZAHPNa4xO3KhQk7p2PKBXxlL4QlDZO3TespcjNsDsmttk9Ola5z26JYXJWpQCWEbb+01PUy9srLW3KFpBzqhO6/FTf9E5bFmwalZIpGyZ18ixG1bd4ZjlR+t4Vb/S3AdrpEvylXgf4ONW3/RsYg9jPDXY5slrkev70m8r3GxIec2b/wAGhH01qH0uCfU0kX4/DruP8FGrnCRmPSsUiKN7z3AhdDR4PIUYwuDFFDENjBNUuY94/MqqwxO8An3VT5kAOX8yujT/ANqFz4z5xI51Nj0Ylui3zhlzqzTGUvMv5dPadbUNwpC4cYEfOCRUCZ2OTNMdRsl06nhSXceur0RHN3qZCt2le4oKD89T/wDRMkL0Uzdnv2zN/wCuHGqPfpHcCdwziItWcxmCiFlttDLywNk/Cox5TufMtqaP6JqDcP1EyOJo0InJ5PaPgqb63IidojTvaAe5YTDfS8w24OoUmrbbsvk6TanYnqvBCirGrszLfSnoXIxPK+j9JpTg+evPF5YkweTm3KKZXb03G2OtKQFBaCCDU31KXZUZF0N+YcCFBtMmHUqpsiDLVK7WwJsS5Qo9xgPofjSmkPMuoO6VtqAUlQPkQQa5r+lVxtVvz3T/ADdDQCJcaZaHV+1CkvIB+Zbn0VJ/0f2pqtRuGywxJ0ovXTEXHMbm8yt1fzvt2BPj1YU119hrEfSZaeSsx0AlXy3Ry7MxSU1emwkbq7NG6Htv7GtR/RrmOlOdRq2xsT6Dy0+H5rpGeYKhT3av0m3HioDYfITItnID1QavrscPsLb236VrzTe8ocU2grBTISAOvjWzYykpdBV8XfrXU0pFEeWBC5kq8F0pNOHWt6ejTzuPieqmaaR3J5LQyaM1erYFHbnfj7ofQnzUWlpV7mj5V0crkFIwrIPuha8608u67XktjkJm22Y1tuh1PgQeikkbpUk9CCQehrfrvH/xBpxM2NzQC3MZWGy0bubis27n227UR+Tn9vJ2m3t2qDMYYNnZmpGZkG6zX7RcCx2b9yl3B2PaTGpogzcYMiQ8iHG1xzLWvpFswazPiatOHwXA4zhVjbakbHcJlyl9stPvDYY+mtUxWuyYQjbuFfrGLX1y5XDLM0ubtyvt4kuTrjMe+M8+s7qPkPIAdAAANgK9yACT4CpbwpSvkWnQ5Y5kDPp396jfFNehV2fdGgG7BkFi+XSktJCCduVO5qZnon8cdZ0/zbNnmtvu7kPwdlZHxmozIT9HO6v6KgPqVfm4sWZI5+4dmnbxNdcOCHT53Tbhyw7HZbHZTDAE6Ynbr8IkEvOA+0FwD9Go60o1EGCyWBzJ7gpI0cyBhsdMOG6yiz6Wm3LayPSzIAn1QLpBUr39g4B9RqL2Ev8ANGcb38AanL6VnFHbronZcqYbKlY1f48hwgdzL6FMqPu5lN1ATBZyRIQgq6Ooq/0ZzYdIth39kkdufmrXSJLFztcDaPBZVe4ZlMEpG/Tapi+ioyFpvCdQtPnn0iVacibuiWiRv2MqOlIUB37c8dQ+iopRUIcdDTu3Ko7dayLCFao6M6gRNWdIgy/MQyYtxtsgn4PcoiiCppzl6jqApKh1SoA9eoOw45okSsyDocL29ovxG5ahgzE8rQp8MnXarHi1zsC661zC9KFdo1519wTGYziXXrLjr8qQlPXszJk+oD7SGd/cRW2J/pGs8VblRLVww3ZF5U3yhUq9I+Boc27ypLXOpIPhsCfMVFDIrfnWdZrd9UdUJTUjIb44lx/s08rTDaUhLbLadzyoQkBIG5PTckkkmN8F4RqEGpNmZxmo1t9pGZ2blI+KcZ0mFIOhS8dr3vyAabq1WiP2EJCT5VYMwcCXNh4JrLuVKDyJ+KOlYBnU0NPPrB+I2TU4zrxCl7cFDdLBmJsHip+eieiLb0Qy6eoHabmMkp3HgiLHT9tSa4iiU6A6kEDfbE7t/mjlaT9GZYXbJws2aU+3yOXu4T7sfalx4oQf3LSa3fxCjfQXUYf/AOTu3+Zu1ypUYojVaJEH1/NdOSbOTlGN4NHguKGlCt2Ig/qafsraUofzq6T+Ia1VpIf53h7/ANLT9lbVnHaI9+Ya6npTv7IPjcubcRj+8nDn81gOKLSNZ9OSvu+/C0b/AN2NV3TECICVBhG5JPd7a4R4+vbWDTzY/wDrdaP88arvGPH3n7agfSWP7whnmKm/BYtTutfKWWk/FQB81fdKVG629KUpREpSlESlKURKUpRFo7i+/wCLG37/APOCD/rKxHTobfCD/UkfbWXcX237GEAkgAX+Cdyf65WmrdnsezhQtt+tbZUhKV9sA53eWyhXK+nOWiTVWhw4Yz1B4qUMMQnR6KWM2l7v4Vm2oY3jzT4iGn98qrpwQKKtN7yD8nIJg+putev59a71Ems3i/W5b77KWmFM7Np6EnZW6j379DWwuCTlGn9+SnqBkEv963X1oLgRJWqRoUQWOp7l8YnhOg0jk37Q9vgVItaQtJSe4jaoba12cYZrhHuzaOSPksYIc8u2a6fSUFH0VMqtDcWuHquuBnKIbO8zHnkXFtSR15Eftg+dBV9Aqe8bUcVyhTEqBd1tYdIz94WnYbnRI1KG9x9V3qnodl3Gx6l4YPPVKtRjLO64i+Qfmnqn+EfNVv1JsCb9h1zt5TuuNu435hKtyNvceYVgVj1AjwIkebbr5bmVyWE9qh/ZYPiDsFDY9/01f4OpsN15RvV4tb0dxlTSwwORWx6jvUQdj9prhMSMzLRzFY3Yb773B6FJL5KNBmTMQtgN+fn81vLRDL15rplZrrIc55rDPwGZ5/CGTyKJ9+wV+lUecnuqb7qxml8SoKQzMFvaPhysJDfT9JKvprINA88s2HZHmmPKubT1qciLyOEpKxtu0jZ9PsPKEHb8k1riw3K2x7YZMy7w259wfXMdS44DspauY83XzJ6V0Hj7E/yzhKQY03fEzcN92Cxv03usfRaWJCqTTwPVy1eh51u61lu6UDZ8LU2fVWiIlv8ASUBv9ZNaIwG1jMOJO3RFo7SPY4D0hQPUBayG0/Upf0Vnc3UuDdobtuul5tY7QpU2plQQARudjuo9/TaqLg/tBvOc5fmq08yHJiILK+/1WklStv0nPqrUNDNJiRcRCJGb7ALu7LvXxVuUkKTHMT2nkDttfuupUt4fY0pSPgTfQfi19jFbMP8A0Jv9zV4pXYai1Y5dsLsUy3vsOQm+VbZSfV7wR1qHGm5dx2ZOsjiiHMfursY79/KhwgfUBU6VpC0FJ7iNqhZnkSNh+vGTwZz7caLeIzNzbU4oJG6k8itt/HmQfpqH9NFM9MobZgC5hu7nbfALdsExwJiNLO2ObfrafcSt+xVArHilY+o1q6wSl4lxJ2RwkoYvTUi1ueRKk86P1kJ+mqGLqtNZQhpGR2ApbSEgqbJPQbdTz1jeo+d2WRLsmYQbpE+6dmuEaYttpwesELBUU9d9tgfprmnBESPQq7LTLgbNeL7dmW3JbNCpkVjYsF4u2Ixzeu2Xes74nXCjVTEVJ6H7lySD/ZRWUadZZkU6wFcuQxIDL62UKeQSvlAGwJB69/jWJcTUmM5qbhcgvIS09apKkLUrYEF1JH1EVSY7k07H4S4cOLFlsrdU8FB3ruQOnT3VumlWZmZXEsd8q7VcdXPLZYcclQkJUTlDgQ9UEi+37zltiTNlTukpxJTvvyITsn5/E15lQ7ydgO8mteL1HuSUEmyx0keK5BA+ytb6mcQ9vx21Ppvd7gNgpP8AOUFe63PyVrJ328wNt6illOqNZmAHXe89Z7B+QXkOjRhlYNHSPJWzid1BCrY5brQvtplzUiFAaSerm6uVOw/KUr6Nql3odizWG6Z2LHmtj8BhMsKUPlKSkBR+dW5+eoJ8PuE5TrdqZH1UyyA9GtMJfNZorqSOdXcHtj3JSN+XzJ37gN+kFsiIgwWYrY2S2gJFdlaLsJOwxS7xhaJEsTzDgtVxRUIUeIyUlzdkPvO9ekxhMmM4ysbhaSK5Ece2kUnSXWFWpVtiKTYcwdIm8qfVYuCR6xPkHEjmH5SV119rT3Ebo1j2r2C3HF7/AAfhESc1yr5ei21DqhxB8FpUAQfMeW9TJRKo+jzjZluzfzhaRUJJlQl3QH71yqwXJmLxEEJ10fCWUgp6/tjfgoee3cazu1XibZ3w/CeKFb7keB94rQuoeAZxw65qrFMwafMTtVLtN3YSQ3JbB6KQe4KA+M2eoPmCCczx3U2HMioVdmVrAAHwqIjtEH85A9ZB+Yiul6RXpWqSzTrAgj4uuc8TYTmJKM7VZdp3e7j0bVvZrVq4IZ7N+2sOnbbm32rGb9llwvRKVoQyg/JQO/56xBrNMQeTzIyKCPYtzkP0K2NeEvN8aZQoxZa7gsD4sRsrHzq+KPnNZCGySgnXZYHpWlwKDyUS7IBB6D55BVl1nx7bAemyV8qW07+0nwA9tahbx++as55ZtNbElSp18mpS+pPUMt97iz7EIBPze2vzN9SxKWmJHCX5SlhEeJHJcCFnoCoj47nXYAdAfM1Of0fnCtdcOC9Sc8hcuSXhsJSw4N1W+KSFdmf6osgFfkAlPga0PG2J4UnLGFCPrHID4+O1TLgfC8VsQTMwLb/j46OKnPpZi0LDcFs+OW5gMxbfDZisoA25W20BKR9AFQj9LfsIekqvH7o3Yf4GPXQZhpLLSWkjYJG1c/fS2thVr0pcPQIul0G58N2WP9lQ9hc3rEAnifAqVauLSEUcyiThhCYB+aqXNfkEfiVjMLUWHZW/gsZqHJAA3UqaEdfLYJNeNy1DhXpSUS24UVKUkBSJfabn2jlFdLunpbkeTDs+g+Oxc/spU56YZjkzq9Xhe/cug/olF/70uetb92YKV9MNj/ZWQ+k003XlGhUjKoUfnmYlLau7ZA6hoHs3h/a1k/oVi/okXUuaX6ghCgR99iSCO47w2v8AZUx9TMXhZlhl1xy4sh2NcIjsV5JG+7a0FKh9BNc1VWYMpXIkdv0X38F0BJwhGp7Ibt7bdy4pafXNLqWt1ftyNvnrOZDYdYWgjwrUqIc7TLJL3ht7WhqdjdxegrDy+QLLayAd/IgA+41fv2XIoTsqDB38T90P/wDiujqbVpeJKNL3bR0qAa1Q5v01xgMvY8w8VKj0bOfqxDXXKdLJjpRDzK2i5wknu+GxCecD2qZcWT/WhXRHO7BFyXGp1pmx0vsSWFtONqG4WhSSFJPsIJFcTsV1fhYJqLiOqtmktiZjN1ZmyI7bnMpcbm5X0A9OYKaU4n567j2+dBvVrjXO3vokQ5zCJEd1B3S40tIUhQ9hSQagrH8g2VqnpML2Ygv1jb5KZ8ITUSYprYUYWczI37lwhzvCbpodqvetNrnztIhSS/anl9A9FUSWVA+Pq+qfykqFbIsl0ZvFvbmMqHN8VxHihY7wamNx68K/7L+OovuNstsZRZeZ62vn1Q8k9Vx1q8EqIBSfkqAPcVVzNsOa3zD70/Y8hjPWm8Ql/B5caY2UBSk/JcT3pPkoefiKkDBGLYczAEGOfXGR960vGmE4kZxmJYc6kpYcluNjcCozgUnvKFdQayx7VmW/F7BdsaKiNuYmtLWzUSwSmkquPbQFkdStJcaPucSCNvftVz+/HEeXmGRwNv66N/o76kWIJGZIiOIv02KhSboDnxLxYBvxAPiMisju93k3Nwrd2SnfolI6CsVyG6ptkMlJBed9RpPmo/wDvqnuedWqPFW9bkrlAD9sUC0yPaVrA+oGtVXDJL9nd+ZxjDoj94vdzV2DSYyCEoSe9KAfipHepavAbnYVaVGry0hALtYZD4+O1bLQMNzE7FaxrLNHxnw89yzXQ3TeTr9rtZMOaZU/Y7Q8m5Xh0D1Sy2oHkJ/qi+VA9hUfCu3+O29NstEeIlIHIgDYCopcDPDJE0XxBK5gblXq5qTKukwJ6OO7eq2jfr2aASB5kqV41L8AJAA7hXNOI6wazOujD2RkPeukaRT202VbBb1rWPEfp3F1S0jyPCZYARdoDscL2+I4Ru2v9FYSr5q4h49OuNluUiy3RlbFzs0lcaUyobFK21FKx8xBr+gSbGRLiuR1gELSR1rlhx6cKV+seUS9bNOba4+tw897gMIKlrAG3wltI6qOwAWkdegUPlVlcF10UmaMOKbNfbqKscRUoVOXyHrBa1tUxmfDamMLCkrAO4rL8fze52LZCAl5ofJVUccL1Fain+dXEEOftsN1fKCr8ZtXcD7D091bHj6gY6tAVNVKgqPeH46uX90kFJ+muiIFQlZ6EOUI69nb8Fc51jDkdjzCfDLm9GfZt6xkt2v6wuusFsWdAVt38wrCL3kk28OFT3K2g/JTWJpzfDlDcZJC93Od/o2rwl5xjaElUWQ/MUPBiOsj90oBI+mvuEJGW9aGQOu6w8rQDLvvDgOB5wfNXWVIbYZW+4sJQhJJJ7gK05lMu45HcouPWVlT9yvstuLEZSPWKnFBDY+ckVU5rqhFWypl1xtKE9RFacCys+BdWOgH5I+c1JXgD4Z7/lOaRtb8/tzrCGPXsUN9BCiVDb4UpJ+KAkkNg9+5V4J303F+JoEjLODDnawHOpXwdheO6MI8dtgukuhGERdOtK8bwqGB2NmtseEkjuUUIAUr51cx+evTXtBc0N1DbHysVuw/xN2s1gxkxIjUdA2CEgViGt6SvRjPUDvVjF1H+KO1zxCcXRmudtJHipsIs2wXEDSVf4CEPyE/ZW2Zo3iO7fiGtF4Zk0TG7bEkqLDjoQnlZcfDe42799j9lZYvWRLram/uTbxzDbc3Pf8A1ddWSFQl4EuGPdn0E+C52rlInJuedFgMu2/EDfzleVkBTq3p+ryy20/541XegePvP21wLxq8RblqXgUth1rnTlNqU4hDnPyfz4149Nx7dq76Dx95+2oT0kOa+ehuactUqXsHNcyQ1XixBX7SlKjlbalKUoiUpSiJSlKIlKUoi1/rhpTYdZMDew7IX57MYyGpaFwnw06HGySn1iD06kEbd1Qtu3A9aY8pxqNcMjUgH1SZw6/qV0RIChsR0qnVb4azuphJPuqyj06Vmn8pGhhx4kK7gT81LM5ODELRwBXOpngkgqWEKmZDsT/76P4lTD4bdKIGj+DKxm3SJzzb0lctapjocWFrCQQCAPV9UbCtoi2wh3R0/RVQhtDY5UJAFIFOlJZ/KQYYaeIC9jVCamWcnGiFw4Er6q3X+0x73aZNslNJcakNKbWlQ3CkqGxB+Y1caVekXVnsXP7JuBvH4Nxcatk/JCyCeTeeDsPL4lWtPBPAPfcslHntOH8Suh7kOM6eZxlJPur4FuhjuYT9FYv5Ep/+i3sWS+WJ8bIzu1QjwvgoxphclxWQZhCdkRX4bjjFySCpp1BQ4nYtkdUqIrGbzwPWSLMW1BuuUONAnYuTkk/T2ddBURI7fxGkj5q+VQIizuphJPup8i08/qW9ifLE+P1zu1c708E9sWoIXMyTYnrvOH8Spd8OulEDSjDWsfgGStCXFvKckuBbq1rO5KlbDfwA6dwFbU+50If0BP0V7obQ2OVCQB7Kry9OlJV2vBhhp4gKjHqE1NN1I0QuHOV9UpSr1WaVHPii4bMd1inW7JJ0m7MTrdGXER8BkBsLQpfP64KTuQd9u7vNSM3r4cabcTs4kEe2qMeXhTLOTjNuOBVWBHiSz+UhOseIXO1PBFbQTvcMkA8P5+H8Sqy18C+OSZzaZ1xygI370XAAj5+SugHwGET0aR9FfqYMVJ3SykH3VZCi08fqW9ivflif/wBZ3ao/68cOlm1RwnGYUy63tidi8P4LDlxpCQ4pJQhKi6CnZZPZpPh1386iXd+GnVfH31t2LVK5IaSTypkRSTt70r/grpypptaORSQR5Va5mL2mZuXYyCT7KpzlBps+7WmILXHnXstWZ6UbqQYpA4LmK3oDrRdVlm6anyi0ehDUVe5+lYFbC054MrWm4s3K8szL3LSoKDtxVzNpPmGx6u/529TsbwextK5uwb391XeHa4MNISwygbeQr5lMPUyRdrQILWnoX1MVufmm6kWKSOzwWI6eaexcWht7oHaADwrOqAAdBSsysUlfDzKH2y2sbgjavulEWj9Z+H/FdSLTItd/sMS5wn/WXHkN7jm8FJPelQ8FAgjzqAWp3o67pZp70/SrLpNtTuSINzCnEJ9iX0ett+ckn211sUlKhsobirVcMdtdwBDrKCTV9JVKap7taXeR4K3jysKZGrFaCuKL/CtxSwXCy19yJQHQLTdG/wDTSDVfa+CriHyt9tjJcmtVtjKI5gJLklQHsQhIST+kK6/P6XWZ1znDSfoqvgYBZYRChHQSPZWZfjCrRG6hiePvWOZQZCG7XbDF+ge5Qq4b+A7DtOZ0fIJEZ683xvqm4z0Ddk+JZbHqtn8rqr21OLGMcjWCEhhpABA69KucaDFiJCWGkp28hVRWvR5iLNP5SM4k86y0OG2GNVoslaB4uOGbFOJLH7JByi5XmIMfkPyY/wBzXm2ytTqEoUFlaFbjZI222rf1fK0IWNlpBHtr5hRXwHiJDNiN69exsRuq4XC5nJ9GLpmlxXaXLMFDfptPaH+pr0/3MrSru+GZgd/O4tfyNdJ/gEU/0FP0V+fc+J/SU1ffLE//AKp7VR9Eg/VC0jwkcOWK8N+G3THcVk3Z5q8TxcJBuL6HVBwNpbASUoTsnlSOh361vR5tLrSm1DcKG1fqG0NjlQkAV9VYxYr4zzEiG5O9V2tDRYKDfELwCab6nahXPUG4P5DHn3TszIbgS222VKQgI5+VTajzEJG/XrtWrUejO0uI9ebmBPsuLX8jXTF2Mw9+2NpV768jboQ72UirxlVnYbQxsUgDnVAysFxuWhc47N6MPSKVMQibcMzDRPXluTIO39proBpnhkHTrT/H8Etc64TIVgt7NvjPT3Q7IU02nlRzqCUgkJAG+w6AVfkQYiTuhtO/sr3AAGwqjMTsxNANjPLgOK+4cFkL2BZUN4tMe7RFx30A8w2qJPEbwXYBq20qTfbOtu4MoKY90hENSmk+CSrYhxP5KwR5bVMWvJ9hh5JQ6lJB86owor4Dw+GbEcF9uaHizhkuL+U8BGsOJS3Dg2bwLhGSo8iJZchvAe3YKQT84rGU8MXFTz9j2VqTv07T7rNdPoG9dprjg9nuBJLCNz7BVoGk9l7TtC0j6K2KDi+rQG6jYnx1ELFxaHIx3az4YJ6AuT+KcAWrWWyW3M+z2HEYJ9dqCHJbxHkCoJQPr91Te4d+DjCNKY6fuFZil94ASp8k9rKkbeCl7DZO/wAlICfZUnbdhVot5BQwnceyr60w0wnlbQAB5VjJ6sztR/7iISOHx5q7l5KBKi0JoCprTa49qiojMIACRt3VW0pWMV2lY9leKRMiiKadQObbofHeshpRFz+149H5p5m0yVerfb5GPXd5RWqba0pCHVH5TjB9RR8yOVR86irf+A3XawPLRjGa2iewknl7V16Ivb2pKVJ/WrtJIhRpSSl1sK+arDNwS0TFEqYQN/ZWYk69UJEasKIbc/xdWUeny8z/AIjQVxWVwkcUaF9l2ls2/GF4Tt+93q9WPgQ1xyB1KclzO0wGlH1uzcflr+YbJT9ddf8A9i+y82/Yo+iq6LgNljEFLCOnsq9iYtqkRuqX/HWSqDKNJwzrNYO5QB0T9HfguL3CNer41Kya5sqStDtxQkR21j5SWBukkeBWVVPjBsKiYzCQkNjtNup261kUS1w4aQlllI29lVdYGYmY00/XjOJKyLIbYYs0WSrPmNhZyrE7zjEl5xlm72+TAccbAK0JeaU2VJ36bgKJG9XihG/Q1RBINwvtczrj6LPTGC/8GZyjM5AQAntFSI4J26dwaql/3L/TYDpfsy3/AOtsfyNdNFwYrh5lNJJ91fJt0P8ApI+isl8sz/8AqlW/okH6oXPLT30Zumlry2039eQ5ghVqnMTmwZUcpUtpxLiQfwPcSkb+yuiiCSkE95615tw47Z3Q2BXtVrMTkebIMdxdbZdVIcJkLJgslKUq2VRKUpREpSlESlKURKUpREpSlESlKURah4l4ersbT27ZlpLqv96M3GrTOuTkZ2yxZ8e4FpvtAlwupK2+jagCg/L3IO21Qs4JeIzi64sM8vWPXjXeNYLbYbY1cXlxcUt7sh8uO8iG0laOVI6KJUQfAAddxPrXMb6J6gJ88Wuw/wATdrmz6G5O2p2oR8Pvbt/+cqoi6uICkoSlS+YgAFRG25861fxEQ9UBp3c8h0q1O+8+52CDMuSi5Z489maG2StLTgdBKBug+sjr1677bVtGsS1dSF6U5mnfvx65D/FXKIudvB5xI8aHFnl18xZjXqzYyLLaWrmZC8Nhy+053Q2EcoKNu8nfc+6t2a0456RLTHArvnmJ8ReO5ibHHXOk2lrB40WU9HbHM4WTu4FrCQTydCrYgHfYGG/oxcp1MxHUjK5OmGlKc8mSMcjtyoar6xavg7QkJIc7R5JC91Hl5R18am/Y9beI/JOLjT7AtSNK5OmuNv2e9zkxGr03cW7y82ygAreaARszzAhvbcFfMfCvEV24hM34lMgzTSfAOG7I4NiuOS2qde7/ADLjbm5MeLCQmMEuOpWhShst0pSlOxUpQHcCRpjiv1F44+FXBrTmt14jMZyNF1uibWI8fCY8ZTaiy45z8yioEfg9tth310K7Frte37JHacvJz8o5uXffbfv23qCnpfkg6CYmonuy5r/M5FeovTh7ufHRxC6K2vVqzcTWL2Zy7KlIZt8nBo7oQpl9bXrOpUOhKN9wjpv47VUYMOLrXrh81n0fzPUNiyar2PJU2Vm4NNCCymL2UZ7kQ5GQFJbebUvldCSrZ0e0DPvRnf8A8N8K/r90/wA/eqQec4azm+KXfFRfbtYfuyx8HeuVmeTHnNJOwJbdKVcqikFPNtuAo7bHYgigp6LFrWWxZPq3gWXZK9fMVxa4NW1qR8PcmRE3dDjiXxEdX1KCgJKtthvyHYE9fWdxa618U/ElN4e+HPMbdp/jdoMwzcmcgomzpbUVaW3nWUOeokFZCUJA3I9ZSgPVqb2mumWE6Q4Zb8B09sTFpstsQUssNkqKlE7qccWrdTjijuVLUSST1rlHrtwTcTfDvq9cNUtBIN8utnFwkXG03PHFdpcLeh1SlKYfYHrqCQpSCUpWhadtwNyK8RS71V0M4zdOcOnZvpBxfZNlF3s8Zct2yZBZYDjc5CElS0slLeyXNgeVJBCjsOYb71vzhk1Cveq/D/gOouSPMPXW/wBijTJrjDQbbW+U7LUlA6JBUCdvCub2BelS4hsAuKLFrHhtsyVuOoIltvw12i5pT3HfYdnv+c0AfMV0q4f9WtO9a9LbTnemDQjWV8Lj/ASwhhcF9s7OR1to9VKkk+HQghQJBBr1FsXuqGnGD6QBjRPKG9HNIMfYyvUOQppl5LgUuNb3XtgyyUIIU9IVzJIbBSAFJ5j15amUeg3rh3wjzlZ1x+Yres0fMiZcMsudzfW91KpiUSXUb7+IcSnby5R5URdDsV4f+NHNbcxkGrfGBdcXuclsLVZMTskJLEMkb9mp5aT2ik9x2G2++yj3nCM2k8a3DDqZgC7trq1qRpxlWUW+wTXrpYo7UyGqQ6lPKstgEcyebkcSojmGxSNxvOG8XJNls8y7GDMmiFHXIMeEyXpD3IknkbbHVaztsEjvJ2qKec+kK4WIN2XhGpePZhFuMCUw+u13nDpCXWZCFJcZX2Tg3CgoJUhQHfsQaItpcUqNYbTpres+0j1VRikrFLROuj0N+yxpzFxDKO05VqdBW0QlCgCjpurqDtUL+D7iF40eLTIsjsMXX6y4wMegx5pdcwyJLL3auKQE7Ao5duTffc99Ta1hyJrM+FrP8hjWm7Wtufh14WmLdoS4ctsfBXR+EZX6yCdtwD12Irlx6O/XFegd01IzN3TLK8vt7Vihu3BVgaZcNuYbdcUXng4tJ7Pr3p325STsOtEUguIfiE47eDjKLHIzrPML1Axy+qd+BPnHkwgtbXKXGHEtKStpfKpKgoKWCN/IiptcPWtdn4gtI7DqpZ7e7b0XZDiJEJxYWqLJaWpt1vmG3MAtJ2VsN0kHYd1c1c41Gzn0p2q1p0+whFgwayYkw9Pjx71cO1mSEuFKXpAQ2n8MpKUpAaQdkhW5X624nVkenkThd4KMpw3TyXJfdxbEbo4zOcADz0tbTi3JBCfiqK1qUAPigAeFeItKamcd2oOqmt0bht4Podqcub0t2HLyy5t9vHaLW5fdYa+KWmglW7qgrnI2Qk7hR2VO4X+KT7kruFv47MxOSpQXEF6wQE2tTveEGOlHMEb9N+YkDrse6oYeiFtlve4hsmlyEpVIhYe78F5u8c0qOlZH6IH0114r1Fz+0B9IHn+O6wv8OHFzaLdAyGPcvuM3kMFAZZ+FlQDaZDY9Ts3eZBQ8jlT66OZIB3Ffx66qcW3DOmBqBgWrsebiV+ub0Mw5WNQlLtLpSXGWg7y7uIUlK0hSvW3R1J36Rb9K7Z4dp4pl3OCoNv3TFrfMkKQdlB5Cn2go+3laR1/JFdDdWdNrlxHcFJxi6M9tkV6xCBdYqlDdSbq3HbfbO/gVOJ5T7FmvEVr4DdQNVNZ9J4er2o2rqMlcuhlQnLMxY4sJm2vsvlPVxtIccWUJB6kJ2cGw6b1qr0g/HBqBw+57i+A6STbameiIbtfRKiJkc7S1hLEcc37WVBt0lQ67KTWnvRJa2R8ayPNNHMkniHBuEM5JCD6ykMvx0hEtO3gey5FH+sqrwzfQi5cUugmsvGE/Ffdv13v67xibRSSoY/bAphTSfY40HFbDvUwjzNEXS7FMth6q6YW3M8MvKoTGUWZE23zW20PKil5rdC+RQKVKQo9UqG26SDUO8HyrjMz3ifzbQ2zcSEBzGMCQyu6ZCnDoBf5nW0qbjJb5eTtuYrBJPKA2o7dyaxj0ZHExarToDm2E5hckhGmEd/IYnO5sVWlwLcWlO/gh5Kx/ZkCt5ejywi7W7Ru4avZa2r75tXb1Ky6epYIWlh5ZEZs7+ARusf1yvUUoYzbrMdpp+Qp9xCEpW6pISVqA6qIHQbnrsOnWoj5bcOMzUfiWzvDNGtU7Nh+CYmzbWXZdzsDE/wDnx6Ih1bLIKQtavXClbrASFJ8wKl5XylttClqQ2lJcPMogAFR223Pn0Aoi5e8XXEvxqcJ2Y2bELhrtYsmXdrQq7fCGcOixQ2Euqb5OUle/xN99x391SDbw70gt406iZnivE3h864z7UzcotrfwmPH7VTjSXAz2/MpKVHm5Qoo23232HdFP0xqT+zThiv8A/HvD/G3a6g6RgjSrDQe8Y/bR/irdEUe8B4txpzwW4/rlr9cZU3JlmXbZUNLDbEuddW5b7QipbSEobUA0eY7AIShSjvt113oPlXGBxsxp+pburadIdPES3Idsg45bGJE6atsgLPwiSlR5Un1S5sOZYUEoSATWq/TD3W4Jy/TTGG0lq1NwLlcghCeVC5S3mm1KO3QqCB7/AFz51MrgJhxIXCBpc1CCQhyyB9fL4uuPOLcJ9vOpW9EWh+IBPGhweY+NYMU16f1Tw63yGk3q05TZ2O3itLWEpd7VgJUpvmKUqUkpKOYHZQ32kNwncVWH8VOBvZJZIa7Te7S4iNe7O64HFRHVDdC0L2HaNLAJSvYH1VAgFJrNtdrHbsl0UzywXZtC4k7G7ky7z9wBjL9b5iAfmrlz6IW6XVniKvdsjrWYNwxB5yaj5JU3IjlpR9oLiwPzj50RTN4yePSwcN0trT7DLK1lOoM1tDiYKlq+DW9Ln7UqRyesta+nIynZRBBJSCOalwfQ3jU1IszOU6z8Vd3wmdObDyMdxGzw20wQobhDrziFFSx3EDfY/LV31z10uurupHpC7Lec1Pbu3PUp16Qh8bjnakO9i2QfBJaaSB4coFdwZEj4LEdlFl13sm1OFtpHMtew32SnxJ8B4miKAutLPGxwn3LGsttnERM1EwW6X632m6Jvdli/CYHbvobTzlKdyhW5SHEqSUqKQR1FSu4h4mqCdPbpkulmpoxG5Y/bp1xUlyzx57E4ttFaW3A6OZA9QjmQQfW3IO21aZ1L9IDwzWR6Rger+GZvb3lBmQ/ab9hzqSpKVhxpwtuHZQC0BSVDccyeh3Fbmv8AmsXUbh8ynK4NhvtojT8duimY96t6oUrk+DOALUyr1khQ6jfYkHuoighwfcSvGhxZ5hecTja72XGTaLQi6/CF4bEl9pzOpbDfKCjb42++57u6t5a02D0hel2nV71AxjiIxrMF2CKue/aWsGYiyX2G/Wd7EguBSwgFQRsCrYgHfYGF/oycn1OxLUvJZelmljWd3B7GGm5MJy+s2oMMiQ2Q6HHUqC/W2Tyjr13qcVj1t4lMg4sdOsD1O0oe01xyXbr3LRHYvaLi3eHm4w2DjzQCNmtwoN7b7rCvKvAUTVDKuLPUbiBs+CcPOeW7E8fjYVAvd/nXO0NTY7L8p57swlCkFanVJb2CApI2QSdvHSPF3rZxvcJX3qm58Q2P5P8AfQZgQGcLixfg/wAH7Lffcq5ubtfZty+2ulIbbStTqUJC1gBSgOp27tz499c1vTLN/gNJXfN28p/VimvUW2NObVx66o6NY7qljnFHikeZkdmZuse2SsGjpQhTqOZLSn0qO3eBz8nt2rzwbOuKfPuE266hS9XXMT1CwB/JWL9Hfx2DIanPwXVqSy4koHY8qEcgU338wUebpW8+DcbcK2lIP/NO3/5IVkmvbTTOhGpRabQjnxO8rUUpA3UYTvU+Z9tEUEuBriG4tOKzOr3Zsh15RZbZjsCPcXRDxa3OPSi46UBrmW3sgbJVudieo22766B6k49nGS44bfp9qG5ht3DocRcU2tiekgJUOzW08OXlKikkghXq9CN65L+jGyzVTEc0zWTpXpCjP5UizQW5kZWQMWr4K2HllK+Z5JDnMdxsOo238a6Eva1cXzbZUjgnQsgb7DUe3fydEUMeGbi14x9f9fIejM/W232aOtM92VPj4rBdcCIoPMG0qQBupQABV0AJJB22qVvGpfeIXRvSGfrFptrgmGjGYUBmdapuOQn0T3FPJZckBwo5m3FFxKuQeoOUgAb1AT0aTzsnjchPvM9k45b7+4tvm5uRRTuU7+OxO2/jtXRD0jyOfgz1E67bNQD/AI+xXiLQHB9qdxr8WWMZDkzPEpZcXRYbk3buxVg0OWXiplLnPvzI5fjbbde6tiZ6rju0TybCcmvettkz7CZmU2u15FHh4fHgyo0WTJQ0XDy857PdQSVJUCkqSe7ciPXozc/1rw/T/M4WlugX3/w37607Kl/fRFtfwZ34KgBrkeSSvdICuYdOu1Sr4fNYddtQeJ7PcZ1iweRgceyYrbXrZjguAmMqDkp4Kmdsj1HVr25OZIAAbCe8HciuPHDkmuelWl961q0n1abskbG48b4TYpViiS2ZXPIDanEvLSXEL/Cp6dU7I7gTvWheD7VPjT4sscyXIWOI2yYynH7g1ADSsIiSy+pbIc5twpHKBvttsakH6RRBXwa6jpH/ALtCP+PMVBDgT4pUcMOj+e5BdtJMvyWyu36MqRdrSGBEhOqjpQ20+pxYUgqO2yuUp9YDffpRFsjVvjH4zuD/AFcjYZrFccRz+1SY6LhHej2sQPh0NSylXZrb2LLqVJUkpUlYB2PUEGujGAZnadRcHsGe2IOC35DbY9zjJdAC0tvNhYSoDpzDfY+0GuVULG899KvrPKzJ2+Y7g+OYowzbVW34WqVc40Fa1L7RDfKkOrcUpQ7UlKElITseX1uruI4tZ8HxW0Ybj0csWyxwWLdDbJ3KWWkBCAT4nZI3PiaBFd6UpXqJSlKIlKUoiUpSiJSlKIlKUoiUpSiJSlKItQcVWp+n+m+iOZHNsutdoeumPXOJbo8mSlD819cdTaW2W9+ZxXM4geqDtzAnYda5jejO160k0H1Dy6ZqvmUXH4l5skWLElPIW40p1p4qUhRbSopJCtxuNjsevn2LuNls93U2q6WqHMLIIbMiOhwo379uYHbfYd1UKsIw1XxsTsp99vZ/i0RRl1N9JzwsYbjMu44dm6M0vKWyIdstsd5Idd29XtHnEJQ2jfvO5O3cCeleWAavP23gek6ocQeosONd88tN6u7IuMpDQ2lB4xocRsndSUtloIbSCdlfPUnzg+GEbHErKR/2ez/FqqmY5j1xjxok+xW6SxDG0dt6K2tDI229QEEJ6dOm3SiLjf6M7XjSzQrVHI5+qeVR7FAvOPtQo8x1C3Gg+2+lfIsthRTunfYkbbjbfuqfWoHpBODXHrZ998bPrPld7tDTxtcS2xVvTFOOJ2UhtxSAlkLAAUoqA2799tqkaMJw4d2J2Ye63s/xaHCsPI2OK2cj/qDP8WvEWuuErO881Q0BxbUjUh9ld6yhEi69mywlpuPFdkOGMykJA3CWezHMequ89TUP/S0avaZZDpzjGn2PZ1ZLrf4mSKmS4MGc2+5FbajvNq7XkJ7M86wnlVsd9+nQ10bjxo8NhuLEYbZZaSENttoCUoSO4ADoBVrdw3EnnFuvYvaFrcUVrUqC0SpR6kklPU+2vUUSfRi6r6aTuG7FtNo+c2P76oEq5IesqpzaZp5pLrwUlknmWktqCuZII238jtM6rVDxPF7fLbnwMctcaS1v2bzMJpC0bjY7KCQRuCautEQ+HvFQa4ROOLEWpGS6H8Qeo7Fty7GMjukOBdL9LDablDEpzs0qfXskOt9UbKI3QEFO+x2nLWJZVpHpVnTinc001xe/OLGynLjaI8hZ/SWgn66IoN+k41Z4dc60vhYTjF3sGZakybnENmFicROmQ2wvd4qWzzEIWjdAa33UpSSE+ruN1+jh0TzXRLh3bt2oFuetl5yK7P3xy3PnZ2E0tDbbTbifkuFLQWpPeOcA9Qa31iWkulmAuB3BtN8Yx9wAgOWy0sRl7Hv9ZCQfrrLNtu6iIa5B8W/C7q1wvcQaeI7SHHpV1xVN8Tk0V6Gwp4WmV2vaOxpLaAVJZUorCXNuXkcKSQR16+V+EA94oijpo5x88MureNRbo5qXY8Wu3YBc6zX6c3EfiObeskKcIQ6kHfZaCdxtuAdwOcvF1m9g1445IN00dmnMYLDlhgofszS5SHFsuhTpRyA8yU8x3UPV6HrsN6623rQnRLJJxueQaQYXcphVzGRLsMV1xR8ypSNyffWR4/iOK4myqNi2M2qzMq727fCajJPzNpFEWrOLzUnA9PeH/O28xyy12l+8Y3dIVtjypKEPTX3GFNpbZbJ5nFcziAeUHbmBOw61zt9E3nmnmJan5xAzbL7JaHL1YocWEi5TGmUS1JfX2jaS4QlStlJ9Xfcg9AetdbrjZLNeOzN1tMKaWd+z+ER0O8m/ftzA7b7DuqgOC4UrbmxCyHYgje3M947j8WiLktxo8LuVcHerdu4gdDn5NsxaRcxMgvRhv9wLgSSYy/Ax3N1BAV0KSppXyeacPDfxlaMcWmBHDcmulps2W3OG5a7xjMmWlsy+0bKFqiFR3eaWCrYDdaeoUOm5k9LiRZ8dcSbGakMuDZbbqAtKuu/UHoeoq2sYbiMWS1MjYvaGpDCw406iC0laFeaVBO4PtFEXJLGMN1A9GzxUQMuzSw3O4acyVyLV93obCnGZVrf25VKKeiJDRS0pTStiooVy7hQNdJX+L/hgj4eM7c13wv7kFvtA4m6tqePTflDAPbFf5HJzeG1bZmQYdxiuwZ8RmTGfTyOsvNhaFp8lJO4I9hrB43D7oRDuRvMTRfBmZ5PN8JRj8QOb+e/Z0RczI2l2d+kc4rJuqzOL3WzaUtyY8U3ScyWQ5a43RLDO/wAd9485ITulvtTzHdIB62RYseFFahRGUMssIS202gbJQlI2SkDyAAHzV9sssx2kMsNIbbbSEoQhICUgdwAHQCvuiLiFxY6O5dpZxp3vC9NVP2+VncvtsfEc8hcZu4Uy80keKA45IbI8EiuyGm2nFg010yx/S+0xm12uwWli1JQU9HUIbCVqUPErPMT58xq/S8fsU+5R7xNssCRPiDaPKdjIW8yNyfUWRzJ6k9x8ar6IuF+S6BZdg/F/feGDFLhKt8bLLqLAkIVsZFglutyBzeaUsoBJ8CyfbXcOyWi3Y/Z4NhtEdMeDbYzUSK0nubZbQEISPclIFfDmPWB27t392yW9dzaTyNzVRWy+hOxGwc25gNiem/iauFESvORIjxGHJUp9tlllCnHHHFBKUJA3KiT0AABJJr0r5cbbdbU06hK0LBSpKhuFA94I8RRFxu9KxqdgGo+tmPIwHMrPkLVpxcw5b9tmIkMtyFyHVhvtEEpKuUpJ2J25hvXTfhq1g0w1N0vxWPg2d2S8TYmPwfhkGLNbXKiFDLbaw8zvzt8qxynmAG/vFbBGEYakBIxOygDuAt7PT9Wqq3Y3j1nkLl2mxW6E+4js1ux4rbS1J332JSASNwOlEUYPSG8LF84jtMrfc8EYbezDD3nZVvirWlHw+O6kB+MFHoFnkQtG5A5kbEjm3Gn/AEffFthum2FJ4Z9fbkMCyTFpT7dt++EGC2/HccU52KlO7Bt1taljZWwUkpKSdiK6Id/fWPZVp3gOcpSjNcIsN/ShPIkXS2syuUb77DtEnYURRS41OMvTaHpbfNJtHsrhZtnuYxF2aLBx10XFUVp8cjrqyzzDm7MqCUAlRUodNgTXl6N3hEyDQHFrrqJqNBMHLctYZYbtqiC5bLeg86W3CDt2q1kKUn5IShPeFVK/FNNdOsE3+8nA8dx/mHKr7l2tiKSPaW0gmsk2A7qIuS3G3wj6p6K61SOJLRqzTblYJN4RkilQGFPO2S4h0Or7RpA5iwpwFYWBsOZSVbdCZmaH+kK4cdWcYiS79qBZcNyINAXGz3uYmKWXgPX7J1zZDre+/KQd9vjAHpUndhWEX3Q7RfKJTk7JNJMNukl1XO49LsUV1xavMqUjcn30RcpvSKalYTrrxI42dIMgjZkzbbHFtji7LzS0mT8LecU2gtg85CVpJKdx179966ecQuoGE6eaH5NOzjKbZY2pdgmxYwmyUtLkPqirSlppKjzOLJI9VIJ61nGN4LhOHNlrEcQslkQRsU263sxht/Y0irhcrLaLyltN2tUOaGVFTYksId5CRsSOYHY7eVEXGX0Zmueluheq2QXXVXLI1gt91xtECPLeQtbXbofbXyKLYUU7pB2JG3Tbfuqf+e+kM4M8etKsqY1Fs+UXe1NuuW2Hboi3pa3Vp5ShpakBLXMPVUoqSOXfffuqRv3lYd3fepZv73s/xa/FYPhihsrErKR5G3s/xa8Ra34RtQs31a0DxvU/UB5hV0ylUu5tssNJbbjRHJTvwZlPKBzBLIQOY9Vd56moI+ls1V02zebp1juHZxZL5Psi7o9cG7dNbkCKHOwSgLUglKVEtr9Xfccp3ArqZFixYMZuHCjtR2GUhDbTSAhCEjuASOgHsFWo4Vh5JJxWzdSSf5wZ6k95+LXqLRPAnqzpvl/Dtp5ieP5vZJl+s+Oxok+0tzWzNjuMJCHOdnfnAB29bbbYg79RWWcWupOB6f6DZy1mOW2q0SLvjV0hW6PKlIbemvrjqbS2y2TzOK5loHqg7cw32FbSgY1jtrk/DLZYbdEf5SjtWIjba+U945kgHboOlelysVlvJaVdrRCmlnfszJjodKN+/bmB232Hd5URclvRNakYBgWpmaW/Ncys1jdvVngswFXCY3HRIcbfWVtpWshJVstJCd9z4b7GurGbZ9hGm9icybP8rtOP2polKpdylIYbKuUq5ElRHMohJISN1HboDXp95GGnvxOy94P/AJPZ7x+jVxuFrtt2ZTHulvjTGkqC0okMpcSFDuICgRv1PWiLiZ6PzP8ABMH4vbfk+X5XbLLapcW8R2ps+SlhgOPDdpK1qICOYAgFWw32Hea6A+kn1Q08g8K2S4k/mlm+7WUMW9y0QEzW1vzGvhbTnatoBJLfI2s9p8Xp377VKBWDYWsELxKyqB797eyd/wBWqmTi+NzVNrmY/bX1MtJYbLkNtRQ2nuQN09EjwA6V4i5eejI4m9DdFMNzTGNU89hY5MuV4YuENUpDhafa+DpbUAtCVAKCk9QduhBG/XaQeu/pIeGjCcSu+R6TZJa8wz963rg2z4HCXs2eqkF99aE/gULJX2YJKj0AG5IlyMJw4HcYnZt/P7ns/wAWvlWDYWv4+I2VXvt7J/0aIog8bWqVqtHAq5iepmcWo6hZNj9lU5AW40zLmSlOsOPuJjo2KUAodJISEDlI336Vpv0UuS6UXPBNSdJs6vuPLk5RdI6E2S4ym0quUZyN2SkobWR2u6gUlKdyDt06g10tn43j11eTIudit0t1KA2FvxG3FBI6hO6gTt7KpmMKw+NIalx8UszT7Cw406iAylaFjuUkhO4PtFeouOWsmmOpvo4+JG357p5LfVjUl9x6xTJKiWJsMkF62SyPjKSNgfEgNup9YHbqHw68VukPEnjcW5YTkkNm9ljtLhj0iSgT4Kxtzgt77uNgno6kFJBHcdwNtXC1226siNc7fGltBXMG32UuJ389lAjfrVLAxbGrVKE62Y9bIkkIKA8xDbbWEnvHMlIOx2HT2URXSlKURKUpREpSlESlKURKUpREpSlEX//Z';
const V77_AAYUB_LOGO_JPEG_B64='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';

function isPixaroAdminPdfMode(){
  try{
    const customer=window.RAJ_V45&&window.RAJ_V45.customer;
    return customer?.role==='admin' && String(customer?.name||'').trim().toUpperCase()==='PIXARO';
  }catch(e){return false}
}
function adminPdfVisibilityValue(row){
  return clean(getField(row,'YES/NO','YES / NO','YES NO','VISIBLE / NOT VISIBLE','VISIBLE/NOT VISIBLE','VISIBLE NOT VISIBLE'));
}
function isAdminPdfRowVisible(row){
  // V112: Admin physical Price Book prints only products explicitly marked YES/Y/1.
  const value=normalizeSearchText(adminPdfVisibilityValue(row));
  return value==='YES'||value==='Y'||value==='1';
}
function pdfFitFont(text,width,maxSize,minSize=1.55){
  const s=pdfAscii(text);
  if(!s)return maxSize;
  const fit=Math.max(2,width-4)/(Math.max(1,s.length)*0.52);
  return Math.max(minSize,Math.min(maxSize,fit));
}
function pdfFitProductNameFont(text,width,maxSize=8,minSize=3.2){
  const s=pdfAscii(text).replace(/\s+/g,' ').trim();
  if(!s)return maxSize;
  // V86: Product Name uses almost the complete cell width before shrinking.
  const fit=Math.max(2,width-1.6)/(Math.max(1,s.length)*0.465);
  return Math.max(minSize,Math.min(maxSize,fit));
}
function pdfWrapText(value,width,fontSize=10,maxLines=8){
  const text=pdfAscii(value).replace(/\s+/g,' ').trim();
  if(!text)return [''];
  const maxChars=Math.max(2,Math.floor(Math.max(4,width-5)/(fontSize*.52)));
  const tokens=[];
  text.split(' ').forEach(word=>{
    if(word.length<=maxChars){tokens.push(word);return}
    for(let i=0;i<word.length;i+=maxChars)tokens.push(word.slice(i,i+maxChars));
  });
  const lines=[];let line='';
  for(const token of tokens){
    const test=line?line+' '+token:token;
    if(test.length<=maxChars)line=test;
    else{if(line)lines.push(line);line=token}
    if(lines.length>=maxLines-1)break;
  }
  if(line&&lines.length<maxLines)lines.push(line);
  return lines.length?lines:[''];
}
function adminPortraitColumnWidths(columns,rows,usable){
  const mins=[],desired=[];
  columns.forEach(column=>{
    const key=keyOf(column);
    let min=34,max=74,base=9;
    if(key==='CODE'){min=35;max=82;base=7}
    else if(key==='PRODUCT NAME'){min=105;max=185;base=22}
    else if(key==='UNIT'){min=25;max=36;base=4}
    else if(key==='GST'){min=22;max=30;base=3}
    else if(key==='CLUTCH DIA'){min=32;max=44;base=6}
    else if(key==='RATE'||key==='MRP'){min=38;max=54;base=7}
    else if(key==='NO. OF TEETH'){min=38;max=58;base=7}
    let maxLen=base;
    // Scan a representative set; widths are capped so one extreme value cannot waste the page.
    const step=Math.max(1,Math.floor(rows.length/1800));
    for(let i=0;i<rows.length;i+=step){
      const len=pdfAscii(getField(rows[i],column)).length;
      if(len>maxLen)maxLen=len;
    }
    const want=Math.min(max,Math.max(min,maxLen*5.2+7));
    mins.push(min);desired.push(want);
  });
  const minSum=mins.reduce((a,b)=>a+b,0);
  if(minSum>=usable){
    const scale=usable/minSum;
    return mins.map(v=>v*scale);
  }
  const extra=usable-minSum;
  const needs=desired.map((v,i)=>Math.max(0,v-mins[i]));
  const needSum=needs.reduce((a,b)=>a+b,0)||1;
  let widths=mins.map((v,i)=>v+extra*(needs[i]/needSum));
  // If desired widths use less than page width, give the balance mainly to Product Name.
  const used=widths.reduce((a,b)=>a+b,0);
  if(used<usable-.1){
    const productIndex=columns.findIndex(c=>keyOf(c)==='PRODUCT NAME');
    widths[productIndex>=0?productIndex:0]+=usable-used;
  }
  return widths;
}
function adminPdfHeaderLines(column,width){
  const key=keyOf(column);
  if(key==='CLUTCH DIA')return ['CLUTCH','DIA'];
  return pdfWrapText(column,width,8,2);
}

const V86_INDEX_DETAILS={"AAYUB":"FLY WHEEL ASSY.","ALLIED":"BRAKE LINING & BRAKE PAD","APPOLO":"ALL TYPE OF PACKING","APRISTIC":"ALL TYPE OF PACKING","ASHWAMEGH":"GREASE, ULTRAPURE AND DISTILE WATER","ASK":"BRAKE LINING","ATOP":"SPRING WASHAR","BALOON":"SPRING BALOONG","BLUE BIRD":"DIESEL ENGINE OIL,4 STROKE OIL,TRANSMISSION OIL,INDUSTRIAL OIL","BRAVO":"SHOCK ABSORBER, GEAR LEVER, ENGINE MOUNTING, HOSE PIPE","BULLDOG":"GASKET TUBE, RTV & SILK BOTEL","C.I.":"ARM REST/ROOF HANDLES,B.OPENER,DB LOCK/ DOOR LOCK W/K","CHAMPION":"SPRAK PLUG, HEATER PLUG, WIPER BLADE","CHENER":"TIE ROD, DRAG LINK KIT,GEAR LEVER END,BALL JOINT","CRC":"POWER SPRAY","DC":"U.J.CROSS,GEAR JHAMELA,SLEEVE YOKE","DELUX":"KING PIN, CLUTCH & TAPPER BEARING & ALL BERING","ELOFIC":"ALL TYPE FILTER ,COOLANT","EMMBROSS":"REAR AXLE H.C.V. DIVISION","FENNER":"V-BELTS & POLY V-BELTS","GATES":"BELTS, METALS & KITS, TENSIONER","GAUTAM":"SYNCROMIZER RING, WASHER,TATA PARTS,BENJO BOLT, NUT-BOLT,SPRING BALOON,GAPE PLATE,KING PIN KIT,SHIMS,JACK TOMI","GAUTAM B-T":"BERTRY TERMINALS","GCL":"CLUTCH PLATES & PRESSURE PLATES,SPRING SET,LEVER FINGER KIT","GCPA":"CLUTCH PLATES & PRESSURE PLATES","GF":"RADIATOR FAN","GMT":"BOLT,PIN,NUT,WASHERS,NIPPLE,SPANNER","HALDEX":"SLACK ADJ. ASSY","HFL":"HEX BOLT AND FLANGE BOLT","HOLD ON":"HOSE PIPE CLIP","IFLEX":"FUEL LINE & DIESEL PIPE","JHAVERI":"RING PANA & FIX PANA & WHEEL SPANER","JM TOMI":"TOMI","KBX":"BRAKE OIL, BRAKE PARTS, BRAKE SHOE KIT","KBX HITACHI":"PIN HORN, TANK FUEL PUMP, SPEED SENSORS, ELE. REGULATORS","KD":"HOSE PIPE","KLIP-WEL":"HOSE PIPE CLIP","LAPOX":"LA-SEAL & EPOXY PUTTY","LASCO":"AIR FILTER","LGS":"FLY WHEEL RING","LOCTITE":"SUPERFLEX TUBE, RUST BUST SPRAY","LUMAN":"FILTER’S,AIR FILTER,COOLANT","MAGMA":"BRAKE PADS, BRAKE DISC ROTER","MANN-WIX":"FILTERS","MEKO":"WATER PUMP, REPAIR KIT & ROTTER SHAFT","MK GOLD":"WATER PUMP","MONROE":"STRUT KIT,COIL SPRING,TOP MOUNT,SHOCK ABSO.,ELEMENT","NEOLITE":"HEAD LAMP ASSY.","NGK":"SPARK PLUGS & HITER PLUGS","NOVEX":"RUBBER PARTS","OEPLUS":"WIPER BLADE,WIPER ARM","OLMA":"AUTOMOTIV COMPONENTS,TATA PARTS","OSRAM":"BULB","PIONNER":"OIL SEAL, WATER PUMP SEAL, HOSE PIPE","PIPE ROLL":"DIESEL & PETROL PIPE ROLL","PLATINUM":"SIDE GLASS","POLY GRIP":"FOAM FAST & GRIP FAST","POOJA":"UNC, UNF, BSW, BSF,BOLT,NUT,SPECIAL BOLT","PRIMA":"GREASE GUN, BERAL PUMP & OIL CUPPY. LOOSE PARTS","QH":"TIE ROD, SUSP. & JOINT PARTS","RAICAM":"CLUTCH SET","RAJNISH":"DIESEL FUEL INJECTION PUMP PARTS","RAVI JACK":"JACK & POPULAR SHAFT PIPE","RDS":"U.J.CROSS, PROPELLER SHAFTS,BEARING,TIE ROD END","REMSONS":"ACCELERATOR, SPEEDO, BONNET CABLE, DOOR OPENER","REOX":"SIDE MIRROR, SUB MIRROR","RIVIT":"BRACK LINER & CLUCH RIVIT","RKD":"CLUTCH PLATES & PRESSURE PLATES,SPRING SET,LEVER KIT","RM":"ALL TYPE BRAKE DISK & DRUM","RNF":"ADJUSTER, HYDROLIC JACK","ROSE":"SYNCROMIZER RING, WASHER,TATA PARTS,BENJO BOLT, NUT-BOLT,SPRING","SADHU FORGE":"GEAR PARTS & CROWN WHEEL PINION & SPIDER KIT","SHANCO":"WIRE & CABLE","SORL":"VALVE,ADJUSTER,PUMP,AIR COIL","SPICER":"UJ CROSS, SLEVE YOKE, CEN.FLANGE, CEN. BEARING","STAR GOLD":"COOLENT","STL":"UNC, UNF, BSW, BSF,BOLT,NUT,SPECIAL BOLT","SUPER-LAC":"OIL SEAL & FOUNDATION, RUBBER PARTS","SUPER-TIGHT":"CENTER BOLT","SVL":"UJ CROSS, SLEVE YOKE, CEN.FLANGE, CEN. BEARING","UVAL":"BULB","VALEO":"CLUTCH PLATES & PRESSURE PLATES","VEETHREE":"METER, SPEEDO CABLE, TANKE UNIT, DISEL GAJE"};
const V86_INDEX_ALIASES={MANN:'MANNWIX',WIX:'MANNWIX',PIONEER:'PIONNER'};
function indexGroupKey(value){return clean(value).toUpperCase().replace(/[^A-Z0-9]/g,'')}
function groupIndexDetails(group){
  const wanted=V86_INDEX_ALIASES[indexGroupKey(group)]||indexGroupKey(group);
  for(const [name,details] of Object.entries(V86_INDEX_DETAILS)){if(indexGroupKey(name)===wanted)return details}
  return '';
}
function groupIndexSubGroups(groupRows){
  const values=[...new Set((groupRows||[]).map(row=>clean(subGroupValue(row))).filter(Boolean))].sort(natural);
  return values.length?values.join(', '):'-';
}
function pdfIndexFitFont(text,width,maxSize=8,minSize=4.0){
  const s=pdfAscii(text).replace(/\s+/g,' ').trim();
  if(!s)return maxSize;
  const fit=Math.max(2,width-3)/(Math.max(1,s.length)*0.48);
  return Math.max(minSize,Math.min(maxSize,fit));
}
function buildGroupIndexPages(productPages){
  // V102: normal group PDFs keep the old behavior. INDEX-wise downloads force an
  // index page regardless of the currently selected screen Group.
  const forceIndex=!!V102_PDF_CONTEXT?.forceAllGroupsIndex;
  const selectedGroups=v103MultiValues('groupFilter');
  const oneGroupSelected=selectedGroups.length===1||!!clean($('#groupFilter').value);
  if((oneGroupSelected&&!forceIndex)||!productPages.length)return [];
  const portrait=!!productPages[0].adminPortrait,W=productPages[0].W||842,H=productPages[0].H||595;
  const margin=portrait?18:22,baseRowH=portrait?18.5:16.5,wrapRowH=portrait?29:26,heroH=64,headerH=21,top=24,bottom=20;
  const rgb=(r,g,b)=>`${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)}`;
  const usable=W-margin*2;
  // V104: SR NO. / GROUP / DETAILS only. PAGE NO. removed from every index PDF.
  const base=portrait?[34,160,365]:[40,195,563];
  const scale=usable/base.reduce((a,b)=>a+b,0),widths=base.map(v=>v*scale);

  // Merge duplicate group labels (case/punctuation variants) into one index entry.
  const entries=[],byKey=new Map();
  const hasRajGautam=productPages.some(p=>clean(p.group)==='Gautam');
  productPages.forEach((p,i)=>{
    const display=clean(p.group)||'OTHER',key=indexGroupKey(display)||display.toUpperCase();
    if(key==='GAUTAM' && hasRajGautam && display!=='Gautam')return;
    let e=byKey.get(key);
    if(!e){e={key,group:display,first:i+1,last:i+1};byKey.set(key,e);entries.push(e)}
    else{e.first=Math.min(e.first,i+1);e.last=Math.max(e.last,i+1)}
  });

  // Normal descriptions remain shrink-to-fit. Only exceptionally long descriptions wrap to 2 lines.
  const detailsWidth=widths[2];
  entries.forEach(e=>{
    e.details=groupIndexDetails(e.group);
    const fit=pdfIndexFitFont(e.details,detailsWidth,8.1,4.2);
    e.wrapDetails=!!e.details && fit<=4.21 && pdfAscii(e.details).length>70;
    e.rowH=e.wrapDetails?wrapRowH:baseRowH;
  });

  // Paginate by actual row heights so wrapped rows never collide with the footer/page number.
  const available=H-top-heroH-headerH-bottom,indexSlices=[];let slice=[],used=0;
  entries.forEach(e=>{
    if(slice.length && used+e.rowH>available){indexSlices.push(slice);slice=[];used=0}
    slice.push(e);used+=e.rowH;
  });
  if(slice.length)indexSlices.push(slice);
  const pageCount=indexSlices.length;
  const pages=[];

  indexSlices.forEach((slice,pi)=>{
    const cmd=[],indexLogos=[],indexLinks=[];let y=top;
    cmd.push(`0.985 0.975 0.935 rg ${margin} ${H-y-heroH} ${usable} ${heroH} re f`);
    cmd.push(`${rgb(14,51,126)} RG ${margin} ${H-y-heroH} ${usable} ${heroH} re S`);
    cmd.push(`${rgb(245,176,14)} rg ${margin} ${H-y-heroH} 7 ${heroH} re f`);
    const logoBoxX=margin+10,logoBoxW=82,printBoxW=82,printBoxX=margin+usable-printBoxW-8;
    cmd.push(`1 1 1 rg ${logoBoxX} ${H-y-heroH+7} ${logoBoxW} ${heroH-14} re f`);
    cmd.push(`${rgb(245,176,14)} RG ${logoBoxX} ${H-y-heroH+7} ${logoBoxW} ${heroH-14} re S`);
    const titleAreaX=logoBoxX+logoBoxW+8,titleAreaW=printBoxX-titleAreaX-8;
    cmd.push(`${rgb(14,51,126)} rg ${titleAreaX} ${H-y-heroH+7} ${titleAreaW} ${heroH-14} re f`);
    const title='PRICE BOOK INDEX '+(V102_PDF_CONTEXT?.indexLabel||'MAIN');
    const titleSize=pdfIndexFitFont(title,titleAreaW-16,17.5,10.5),approx=title.length*titleSize*0.27;
    cmd.push(`BT /F2 ${titleSize.toFixed(2)} Tf 1 1 1 rg ${Math.max(titleAreaX+8,titleAreaX+titleAreaW/2-approx)} ${H-y-37} Td (${pdfAscii(title)}) Tj ET`);
    cmd.push(`BT /F1 6.3 Tf 1 0.76 0.08 rg ${titleAreaX+titleAreaW/2-61} ${H-y-50} Td (RAJ AGENCIES - LIVE PRICE BOOK) Tj ET`);
    cmd.push(`${rgb(14,51,126)} rg ${printBoxX} ${H-y-heroH+7} ${printBoxW} ${heroH-14} re f`);
    cmd.push(`BT /F2 7.2 Tf 1 1 1 rg ${printBoxX+17} ${H-y-28} Td (PRINT DATE) Tj ET`);
    const printDate=new Date().toLocaleDateString('en-GB');
    cmd.push(`BT /F2 8.2 Tf 1 0.76 0.08 rg ${printBoxX+18} ${H-y-44} Td (${pdfAscii(printDate)}) Tj ET`);
    y+=heroH;
    cmd.push(`${rgb(14,51,126)} rg ${margin} ${H-y-headerH} ${usable} ${headerH} re f`);
    let x=margin;const heads=['SR NO.','GROUP','DETAILS'];
    heads.forEach((h,i)=>{const size=pdfIndexFitFont(h,widths[i],8.3,5.8);cmd.push(`BT /F2 ${size.toFixed(2)} Tf 1 1 1 rg ${x+3} ${H-y-13.2} Td (${pdfAscii(h)}) Tj ET`);x+=widths[i]});y+=headerH;

    slice.forEach(e=>{
      const oi=entries.indexOf(e),rowH=e.rowH;
      const a=e.first+pageCount;
      if(oi%2===1)cmd.push(`0.970 0.980 0.990 rg ${margin} ${H-y-rowH} ${usable} ${rowH} re f`);
      cmd.push(`0.72 0.76 0.82 RG ${margin} ${H-y-rowH} ${usable} ${rowH} re S`);x=margin;
      const vals=[String(oi+1),e.group,e.details];
      for(let i=0;i<widths.length;i++){
        if(i>0)cmd.push(`0.82 0.85 0.89 RG ${x} ${H-y-rowH} m ${x} ${H-y} l S`);
        const val=vals[i];
        if(i===1){
          // V90: slightly larger group logo, vertically centered; group name remains left aligned.
          const logoB64=pdfEmbeddedLogoB64(e.group);
          const logoBoxW=Math.min(39,widths[i]*.27),logoW=logoBoxW-5,logoH=Math.min(17,rowH-3),logoY=H-y-rowH+(rowH-logoH)/2;
          cmd.push(`0.82 0.85 0.89 RG 1 1 1 rg ${x+2} ${H-y-rowH+2} ${logoBoxW} ${rowH-4} re B`);
          if(logoB64)indexLogos.push({b64:logoB64,x:x+4.5,y:logoY,w:logoW,h:logoH});
          const textX=x+logoBoxW+6,textW=widths[i]-logoBoxW-8;
          const size=pdfIndexFitFont(val,textW,8.4,5.2),textY=H-y-rowH/2-size*.34;
          cmd.push(`BT /F2 ${size.toFixed(2)} Tf 0.04 0.20 0.46 rg ${textX} ${textY.toFixed(2)} Td (${pdfAscii(val)}) Tj ET`);
        }else if(i===2){
          if(e.wrapDetails){
            const lines=pdfWrapText(val,widths[i]-2,6.4,2),lineGap=8.2;
            const firstY=H-y-rowH/2+(lines.length-1)*lineGap/2-2.2;
            lines.forEach((line,li)=>{
              const size=pdfIndexFitFont(line,widths[i]-2,6.4,5.0);
              cmd.push(`BT /F1 ${size.toFixed(2)} Tf 0 0 0 rg ${x+3} ${(firstY-li*lineGap).toFixed(2)} Td (${pdfAscii(line)}) Tj ET`);
            });
          }else{
            const size=pdfIndexFitFont(val,widths[i],8.1,4.2),textY=H-y-rowH/2-size*.34;
            cmd.push(`BT /F1 ${size.toFixed(2)} Tf 0 0 0 rg ${x+3} ${textY.toFixed(2)} Td (${pdfAscii(val)}) Tj ET`);
          }
        }else{
          const size=pdfIndexFitFont(val,widths[i],8.1,5.6),textY=H-y-rowH/2-size*.34;
          cmd.push(`BT /F1 ${size.toFixed(2)} Tf 0 0 0 rg ${x+3} ${textY.toFixed(2)} Td (${pdfAscii(val)}) Tj ET`);
        }
        x+=widths[i];
      }
      const groupX=margin+widths[0];
      // Group name/logo remains clickable even though the visible PAGE NO. column is removed.
      indexLinks.push({x:groupX,y:H-y-rowH,w:widths[1],h:rowH,targetPageNumber:a});
      y+=rowH;
    });
    pages.push({group:'INDEX',cols:heads,widths,cmd,brandLogoB64:'',indexLogos,indexLinks,W,H,adminPortrait:portrait,isIndex:true});
  });
  return pages;
}

function fastPdfPages(){
  // V90: every customer and admin PDF uses the same A4 portrait layout.
  // BF visibility remains Pixaro-admin-only.
  const pixaroAdmin=isPixaroAdminPdfMode();
  const adminPortrait=true;
  const basePdfRows=Array.isArray(V102_PDF_CONTEXT?.rows)?V102_PDF_CONTEXT.rows:filtered;
  const sourcePdfRows=pixaroAdmin?basePdfRows.filter(isAdminPdfRowVisible):basePdfRows;
  const rows=sortedRows(sourcePdfRows),grouped=new Map();
  rows.forEach(r=>{const g=clean(getField(r,'GROUP'))||'OTHER';if(!grouped.has(g))grouped.set(g,[]);grouped.get(g).push(r)});
  const selected=V102_PDF_CONTEXT?.forceAllGroupsIndex?'':clean($('#groupFilter').value);
  const groups=selected?[[selected,grouped.get(selected)||rows]]:[...grouped.entries()].sort((x,y)=>natural(x[0],y[0]));
  const pages=[],W=adminPortrait?595:842,H=adminPortrait?842:595,margin=adminPortrait?18:22,contentTop=98,rowH=adminPortrait?14.6:10.5,bandH=adminPortrait?15.6:12.4;
  const esc=pdfAscii;
  const rgb=(r,g,b)=>`${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)}`;

  for(const [group,sourceRows] of groups){
    // Excel VIEW BY is the single source of truth. Column position is irrelevant.
    // First comma-separated heading = level 1, second = level 2, etc.
    // PDF hierarchy must follow exactly what is written in the VIEW BY heading.
    // Do not add fallback levels (VEHICLE/MODEL/etc.) that are not listed there.
    // VIEW BY is located by its heading name, never by Excel column letter.
    // V82.6: VIEW BY is the ONLY hierarchy source. Never inject VEHICLE/MODEL
    // unless those exact headings are present in the comma-separated VIEW BY value.
    // Use the most common nonblank value for the selected group so one stray row cannot
    // change the whole PDF structure. Excel column letters (AY/AZ/BA...) are irrelevant.
    const viewByRaw=mostCommonViewBy(sourceRows);
    const hierarchyFields=parseViewByTitles(viewByRaw)
      .map(resolveViewByField)
      .filter((field,index,array)=>field&&array.findIndex(x=>compactFieldKey(x)===compactFieldKey(field))===index);
    const gr=sortRowsByFields(sourceRows.slice(),hierarchyFields);
    const cols=visibleColumnsForRows(gr),usable=W-margin*2;
    const printWeights=printColumnWeights(cols).columns.map(Number),weightSum=printWeights.reduce((a,b)=>a+b,0)||1;
    // V84: consume the full printable width. The old percentage math left a fake blank column/gap at the right.
    const widths=adminPortrait?adminPortraitColumnWidths(cols,gr,usable):printWeights.map(p=>usable*p/weightSum);
    const headerH=adminPortrait?19:rowH;
    let page=null,y=0,serial=0,lastPath=[];

    const drawColumnHeader=()=>{
      let x=margin;
      page.cmd.push(`${rgb(14,51,126)} rg ${margin} ${H-y-headerH} ${W-margin*2} ${headerH} re f`);
      for(let i=0;i<cols.length;i++){
        if(adminPortrait){
          const lines=adminPdfHeaderLines(cols[i],widths[i]);
          lines.forEach((line,lineIndex)=>page.cmd.push(`BT /F2 7.5 Tf 1 1 1 rg ${x+2} ${H-y-8.5-lineIndex*7.8} Td (${esc(line)}) Tj ET`));
        }else{
          const max=Math.max(3,Math.floor(widths[i]/3));
          page.cmd.push(`BT /F2 4.8 Tf 1 1 1 rg ${x+2} ${H-y-6.7} Td (${esc(truncText(cols[i],max))}) Tj ET`);
        }
        x+=widths[i];
      }
      y+=headerH;
    };

    const newPage=()=>{
      page={group,cols,widths,cmd:[],brandLogoB64:pdfEmbeddedLogoB64(group),W,H,adminPortrait};pages.push(page);y=contentTop;
      page.cmd.push(`${rgb(245,176,14)} rg ${margin} ${H-77} ${W-margin*2} 3 re f`);
      const center=W/2;
      const centerText=(text,font,size,yPos,color)=>{
        const approx=Math.max(0,String(text).length*size*0.27);
        page.cmd.push(`BT /${font} ${size} Tf ${color} rg ${Math.max(margin,center-approx)} ${H-yPos} Td (${esc(text)}) Tj ET`);
      };
      centerText('RAJ AGENCIES','F2',7.6,31,rgb(220,108,11));
      centerText(group,'F2',14.5,47,rgb(14,51,126));
      centerText('LIVE PRICE BOOK','F2',6.2,58,rgb(14,51,126));
      const meta=`COMPANY LIST DATE: ${listDateForRows(gr)}`;
      const boxW=adminPortrait?132:150,boxX=center-boxW/2,boxY=H-72,boxH=9;
      page.cmd.push(`0.42 0.67 0.88 RG 0.965 0.985 1 rg ${boxX} ${boxY} ${boxW} ${boxH} re B`);
      const metaApprox=meta.length*4.5*0.27;
      page.cmd.push(`BT /F2 4.5 Tf 0.12 0.20 0.32 rg ${center-metaApprox} ${boxY+2.9} Td (${esc(meta)}) Tj ET`);
      drawColumnHeader();
      lastPath=[];
    };

    const band=(field,value,level)=>{
      if(!value)return;
      if(y+bandH>H-24)newPage();
      const fills=[[255,243,189],[220,238,255],[237,243,251],[247,248,250]];
      const texts=[[90,59,0],[14,51,126],[39,54,74],[39,54,74]];
      const idx=Math.min(level,3),f=fills[idx],tc=texts[idx];
      page.cmd.push(`${rgb(...f)} rg ${margin} ${H-y-bandH} ${W-margin*2} ${bandH} re f`);
      page.cmd.push(`${rgb(122,155,196)} RG ${margin} ${H-y-bandH} ${W-margin*2} ${bandH} re S`);
      const bandFont=adminPortrait?9:(level===0?6.2:5.7);
      const bandBase=adminPortrait?9.5:7.7;
      // V84: print only the actual hierarchy value (Flywheel Assembly / CAR / SUV), not CATEGORIES/SEGMENT prefixes.
      page.cmd.push(`BT /F2 ${bandFont} Tf ${rgb(...tc)} rg ${margin+4+level*(adminPortrait?6:8)} ${H-y-bandBase} Td (${esc(value)}) Tj ET`);
      y+=bandH;
    };

    newPage();
    for(const r of gr){
      const path=hierarchyFields.map(field=>groupValue(r,field)); // blank hierarchy value => OTHER
      let changedAt=-1;
      for(let i=0;i<path.length;i++){if(path[i]!==lastPath[i]){changedAt=i;break}}
      if(changedAt>=0){
        for(let i=changedAt;i<path.length;i++)band(hierarchyFields[i],path[i],i);
        lastPath=path.slice();
      }
      const wrapped=adminPortrait?cols.map((col,i)=>{
        const key=keyOf(col),value=displayFieldValue(r,col);
        // Product Name is always a single line; it uses shrink-to-fit like Excel.
        if(key==='PRODUCT NAME')return [pdfAscii(value).replace(/\s+/g,' ').trim()];
        return pdfWrapText(value,widths[i],7.5,2);
      }):[];
      const currentRowH=adminPortrait?Math.max(rowH,4.2+Math.max(1,...wrapped.map((lines,i)=>keyOf(cols[i])==='PRODUCT NAME'?1:lines.length))*8.0):rowH;
      if(y+currentRowH>H-24){newPage();for(let i=0;i<path.length;i++)band(hierarchyFields[i],path[i],i);lastPath=path.slice()}
      serial++;let x=margin;
      if(serial%2===0)page.cmd.push(`0.970 0.980 0.990 rg ${margin} ${H-y-currentRowH} ${W-margin*2} ${currentRowH} re f`);
      page.cmd.push(`0.72 0.76 0.82 RG ${margin} ${H-y-currentRowH} ${W-margin*2} ${currentRowH} re S`);
      // light vertical grid lines
      let gx=margin;for(const w of widths){gx+=w;page.cmd.push(`0.82 0.85 0.89 RG ${gx} ${H-y-currentRowH} m ${gx} ${H-y} l S`)}
      const rowBase=H-y-(currentRowH/2)-2.6;
      for(let i=0;i<cols.length;i++){
        const key=keyOf(cols[i]),val=displayFieldValue(r,cols[i]),isPrice=/^(RATE|MRP)$/i.test(cols[i]);
        if(adminPortrait){
          if(key==='PRODUCT NAME'){
            const text=pdfAscii(val).replace(/\s+/g,' ').trim();
            const size=pdfFitProductNameFont(text,widths[i],7.5,3.2);
            page.cmd.push(`BT /F1 ${size.toFixed(2)} Tf 0 0 0 rg ${x+2} ${rowBase} Td (${esc(text)}) Tj ET`);
          }else{
            const lines=wrapped[i];
            const lineStep=7.8,totalTextH=Math.max(0,(lines.length-1)*lineStep),firstBase=rowBase+totalTextH/2;
            lines.forEach((line,lineIndex)=>page.cmd.push(`BT /${isPrice?'F2':'F1'} 7.5 Tf ${isPrice?'0.02 0.34 0.72':'0 0 0'} rg ${x+2} ${firstBase-lineIndex*lineStep} Td (${esc(line)}) Tj ET`));
          }
        }else{
          const max=Math.max(3,Math.floor(widths[i]/2.8));
          page.cmd.push(`BT /${isPrice?'F2':'F1'} 4.9 Tf ${isPrice?'0.02 0.34 0.72':'0 0 0'} rg ${x+2} ${H-y-6.7} Td (${esc(truncText(val,max))}) Tj ET`);
        }
        x+=widths[i];
      }
      y+=currentRowH;
    }
  }
  return pages;
}

async function buildFastPdfBlob(){
  const productPages=fastPdfPages(),indexPages=buildGroupIndexPages(productPages);
  if(V102_PDF_CONTEXT?.onlyIndex)indexPages.forEach(page=>{page.indexLinks=[]});
  const pages=V102_PDF_CONTEXT?.onlyIndex?indexPages:[...indexPages,...productPages],jpeg=b64Bytes(FAST_WATERMARK_JPEG_B64),company=b64Bytes(V77_COMPANY_LOGO_JPEG_B64),objects=[];
  const add=o=>{objects.push(o);return objects.length};
  const catalog=add(''),pagesObj=add(''),f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const gs=add('<< /Type /ExtGState /ca 0.065 /CA 0.065 >>');
  const wmDim=jpegDimensions(jpeg)||{width:1536,height:1024},logoDim=jpegDimensions(company)||{width:300,height:160};
  const wm=add({bin:jpeg,head:`<< /Type /XObject /Subtype /Image /Width ${wmDim.width} /Height ${wmDim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`});
  const logo=add({bin:company,head:`<< /Type /XObject /Subtype /Image /Width ${logoDim.width} /Height ${logoDim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${company.length} >>`});

  const brandObjects=new Map();
  for(const p of pages){
    const allB64=[p.brandLogoB64||'',...(p.indexLogos||[]).map(x=>x.b64||'')];
    for(const b64 of allB64){
      if(b64&&!brandObjects.has(b64)){
        const bytes=b64Bytes(b64),dim=jpegDimensions(bytes);
        // Never embed an invalid/truncated JPEG: Acrobat otherwise reports 'Insufficient data for an image'.
        if(dim)brandObjects.set(b64,add({bin:bytes,head:`<< /Type /XObject /Subtype /Image /Width ${dim.width} /Height ${dim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`}));
      }
    }
  }

  // V87: reserve all Page object IDs first so index annotations can target product pages.
  const pageIds=pages.map(()=>add(''));
  for(let pageIndex=0;pageIndex<pages.length;pageIndex++){
    const p=pages[pageIndex];
    const W=p.W||842,H=p.H||595,portrait=!!p.adminPortrait;
    const pageMargin=portrait?18:22;
    const generated=new Date().toLocaleString('en-GB',{hour12:true});
    const docTitle=p.isIndex?(V102_PDF_CONTEXT?.docTitle||'Group-wise Price Book Index'):(V102_PDF_CONTEXT?.docTitle||(clean($('#groupFilter').value)?clean($('#groupFilter').value)+' Filtered Pricelist':'All Groups Filtered Pricelist'));

    // Outer print-header/footer details retained from June look.
    const topY=H-9,titleX=portrait?Math.round(W*.43):365,pageX=portrait?W-58:795;
    let content=`BT /F1 4.7 Tf 0.20 0.20 0.20 rg 22 ${topY} Td (${pdfAscii(generated)}) Tj ET\n`;
    content+=`BT /F1 4.7 Tf 0.20 0.20 0.20 rg ${titleX} ${topY} Td (${pdfAscii(docTitle)}) Tj ET\n`;
    content+=`BT /F2 ${p.isIndex?'7.4':'8.2'} Tf 0.055 0.200 0.494 rg ${pageX} ${topY} Td (${pageIndex+1}/${pages.length}) Tj ET\n`;
    content+=`BT /F1 4.5 Tf 0.25 0.25 0.25 rg 22 7 Td (${pdfAscii(location.href)}) Tj ET\n`;

    const brandId=brandObjects.get(p.brandLogoB64||'')||0;
    // V89: on full-pricebook product pages the Raj Group logo doubles as an INDEX/Home control.
    // V89: customer and Pixaro Admin now share the same A4 portrait presentation.
    if(portrait){
      if(!p.isIndex){const wmW=420,wmH=280,wmX=(W-wmW)/2,wmY=(H-wmH)/2-10;content+=`q /GS1 gs ${wmW} 0 0 ${wmH} ${wmX} ${wmY} cm /ImWM Do Q\n`;}
      if(!p.isIndex)content+=`q 74 0 0 39 20 ${H-64} cm /ImLogo Do Q\n`;
      if(brandId)content+=`q 74 0 0 34 ${W-98} ${H-60} cm /ImBrand Do Q\n`;
      if(!p.isIndex&&pages.some(pg=>pg.isIndex)){const hbW=78,hbH=11,hbX=W/2-hbW/2,hbY=H-91;content+=`q 0.055 0.200 0.494 rg ${hbX} ${hbY} ${hbW} ${hbH} re f 0.96 0.69 0.05 RG ${hbX} ${hbY} ${hbW} ${hbH} re S Q\n`;content+=`BT /F2 7.2 Tf 1 1 1 rg ${hbX+17} ${hbY+2.6} Td (INDEX HOME) Tj ET\n`;}
    }else{
      if(!p.isIndex)content+=`q /GS1 gs 520 0 0 347 161 120 cm /ImWM Do Q\n`;
      if(!p.isIndex)content+=`q 64 0 0 34 30 ${H-57} cm /ImLogo Do Q\n`;
      if(brandId)content+=`q 78 0 0 34 ${W-104} ${H-57} cm /ImBrand Do Q\n`;
    }
    let indexLogoResources='';
    const deferredIndexLogos=[];
    (p.indexLogos||[]).forEach((item,i)=>{
      const objectId=brandObjects.get(item.b64)||0;if(!objectId)return;
      const name=`IdxLogo${i}`;
      indexLogoResources+=` /${name} ${objectId} 0 R`;
      deferredIndexLogos.push({name,item});
    });
    // V92: draw index backgrounds/borders/text first, then logos on top of their boxes.
    // V91 drew logos first and the white box commands in p.cmd covered them.
    content+=p.cmd.join('\n');
    if(p.isIndex){
      content+=`\nq 64 0 0 46 ${pageMargin+19} ${H-79} cm /ImLogo Do Q\n`;
      deferredIndexLogos.forEach(({name,item})=>{content+=`q ${item.w.toFixed(2)} 0 0 ${item.h.toFixed(2)} ${item.x.toFixed(2)} ${item.y.toFixed(2)} cm /${name} Do Q\n`});
    }

    const cb=latin1Bytes(content),cobj=add({bin:cb,head:`<< /Length ${cb.length} >>`});
    const brandResource=brandId?` /ImBrand ${brandId} 0 R`:'';
    const annotIds=[];
    for(const link of (p.indexLinks||[])){
      const targetIndex=Math.max(0,Math.min(pageIds.length-1,(link.targetPageNumber||1)-1));
      const destPageId=pageIds[targetIndex];
      annotIds.push(add(`<< /Type /Annot /Subtype /Link /Rect [${link.x.toFixed(2)} ${link.y.toFixed(2)} ${(link.x+link.w).toFixed(2)} ${(link.y+link.h).toFixed(2)}] /Border [0 0 0] /A << /S /GoTo /D [${destPageId} 0 R /FitH ${H}] >> >>`));
    }
    if(!p.isIndex&&pages.some(pg=>pg.isIndex)){
      const homeId=pageIds[0];
      annotIds.push(add(`<< /Type /Annot /Subtype /Link /Rect [${(W/2-39).toFixed(2)} ${(H-91).toFixed(2)} ${(W/2+39).toFixed(2)} ${(H-80).toFixed(2)}] /Border [0 0 0] /A << /S /GoTo /D [${homeId} 0 R /FitH ${H}] >> >>`));
    }
    const annots=annotIds.length?` /Annots [${annotIds.map(id=>id+' 0 R').join(' ')}]`:'';
    objects[pageIds[pageIndex]-1]=`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /ExtGState << /GS1 ${gs} 0 R >> /XObject << /ImWM ${wm} 0 R /ImLogo ${logo} 0 R${brandResource}${indexLogoResources} >> >> /Contents ${cobj} 0 R${annots} >>`;
  }

  objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;

  const chunks=[latin1Bytes('%PDF-1.4\n%V94\n')],offsets=[0];let length=chunks[0].length;
  for(let i=0;i<objects.length;i++){
    offsets[i+1]=length;
    const prefix=latin1Bytes(`${i+1} 0 obj\n`);chunks.push(prefix);length+=prefix.length;
    const o=objects[i];
    if(typeof o==='string'){
      const b=latin1Bytes(o+'\nendobj\n');chunks.push(b);length+=b.length;
    }else{
      const hh=latin1Bytes(o.head+'\nstream\n');chunks.push(hh);length+=hh.length;
      chunks.push(o.bin);length+=o.bin.length;
      const e=latin1Bytes('\nendstream\nendobj\n');chunks.push(e);length+=e.length;
    }
  }
  const xrefPos=length;
  let x=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objects.length;i++)x+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  x+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  chunks.push(latin1Bytes(x));
  return new Blob(chunks,{type:'application/pdf'});
}

function priceListPdfFileName(){
  if(V102_PDF_CONTEXT?.fileName)return safePdfName(V102_PDF_CONTEXT.fileName);
  const groups=v103MultiValues('groupFilter');
  const label=groups.length===1?groups[0]:(groups.length>1?'MULTI GROUP FILTERED PRICELIST':clean($('#groupFilter').value)||'ALL GROUPS FILTERED PRICELIST');
  return safePdfName(label)+'.pdf';
}
async function createCompletePriceListPdfBlob(){
  // V102: normal filter downloads use `filtered`; INDEX-wise downloads provide a
  // temporary independent row set without changing the visible product grid.
  const pdfRows=Array.isArray(V102_PDF_CONTEXT?.rows)?V102_PDF_CONTEXT.rows:filtered;
  if(!Array.isArray(pdfRows)||!pdfRows.length)throw new Error('Current filters me koi product nahi hai');
  if(isPixaroAdminPdfMode()&&!pdfRows.some(isAdminPdfRowVisible))throw new Error('Pixaro PDF ke liye koi Visible product nahi hai');
  const blob=await buildFastPdfBlob();
  if(!blob||!blob.size)throw new Error('PDF output is empty');
  return blob;
}
function downloadPdfBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=name;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),120000);
}
async function shareSelectedPriceListPdf(){
  if(!filtered.length){toast('Current filters me koi product nahi hai');return}
  const btn=$('#priceListShareBtn');
  const name=priceListPdfFileName();
  if(btn){btn.disabled=true;btn.textContent='Preparing PDF…'}
  try{
    const blob=await createCompletePriceListPdfBlob();
    const file=new File([blob],name,{type:'application/pdf'});
    const canNativeShare=typeof navigator.share==='function' &&
      (typeof navigator.canShare!=='function' || navigator.canShare({files:[file]}));
    if(canNativeShare){
      if(btn)btn.textContent='Choose Share App…';
      try{
        await navigator.share({
          title:'RAJ Agencies Pricelist',
          text:(clean($('#groupFilter').value)||'All Groups')+' - RAJ Agencies Live Price Book',
          files:[file]
        });
        toast('Pricelist PDF share ready / completed.');
        return;
      }catch(err){
        if(err?.name==='AbortError'){toast('PDF share cancelled.');return}
        console.warn('Native PDF share failed; downloading instead:',err);
      }
    }
    downloadPdfBlob(blob,name);
    toast('Direct file sharing is not supported in this browser. Complete PDF downloaded instead.');
  }catch(err){
    console.error('V76 share PDF error:',err);
    toast('PDF create/share nahi hua. Please try again.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Share PDF'}
  }
}
async function downloadIndexPriceBook(){
  const select=$('#indexPriceBookFilter'),button=$('#indexPriceBookDownloadBtn');
  const tag=clean(select?.value);if(!tag){toast('Download Price Book INDEX select karein.');return}
  const rows=v102IndexRows(tag);if(!rows.length){toast(tag+' INDEX me koi product nahi mila.');return}
  const previous=V102_PDF_CONTEXT;
  V102_PDF_CONTEXT={rows,forceAllGroupsIndex:true,indexLabel:tag,docTitle:tag+' Price Book',fileName:tag+' PRICE BOOK.pdf'};
  if(button){button.disabled=true;button.textContent='Creating '+tag+' PDF…'}
  try{
    const blob=await createCompletePriceListPdfBlob();
    downloadPdfBlob(blob,priceListPdfFileName());
    toast(`${tag} Price Book ready: ${rows.length.toLocaleString('en-IN')} products · ${(blob.size/1024/1024).toFixed(1)} MB`);
  }catch(err){
    console.error('V102 index-wise PDF error:',err);toast('INDEX-wise PDF create nahi hua. Please try again.');
  }finally{
    V102_PDF_CONTEXT=previous;
    if(button){button.disabled=false;button.textContent='Download Index Pricelist'}
    v102UpdateIndexDownloadState();
  }
}

async function downloadOnlyIndex(){
  const select=$('#indexPriceBookFilter'),button=$('#indexOnlyDownloadBtn');
  const tag=clean(select?.value);if(!tag){toast('Download Price Book INDEX select karein.');return}
  const rows=v102IndexRows(tag);if(!rows.length){toast(tag+' INDEX me koi product nahi mila.');return}
  const previous=V102_PDF_CONTEXT;
  V102_PDF_CONTEXT={rows,forceAllGroupsIndex:true,indexLabel:tag,docTitle:tag+' Price Book Index',fileName:tag+' INDEX ONLY.pdf',onlyIndex:true};
  if(button){button.disabled=true;button.textContent='Creating Index…'}
  try{
    const blob=await createCompletePriceListPdfBlob();downloadPdfBlob(blob,priceListPdfFileName());
    toast(tag+' Only Index PDF ready.');
  }catch(err){console.error('V103 only-index PDF error:',err);toast('Only INDEX PDF create nahi hua. Please try again.');}
  finally{V102_PDF_CONTEXT=previous;if(button){button.disabled=false;button.textContent='Download Only Index'}v102UpdateIndexDownloadState()}
}

async function downloadSelectedPriceListFast(){
  if(!filtered.length){toast('Current filters me koi product nahi hai');return}
  const btn=$('#priceListDownloadBtn'),name=priceListPdfFileName();
  if(btn){btn.disabled=true;btn.textContent='Creating Full PDF…'}
  try{
    const blob=await createCompletePriceListPdfBlob();
    downloadPdfBlob(blob,name);
    toast(`Complete PDF ready: ${filtered.length.toLocaleString('en-IN')} products · ${(blob.size/1024/1024).toFixed(1)} MB`);
  }catch(err){
    console.error('V76 full PDF error:',err);
    toast('PDF create nahi hua. Please try again.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Download Pricelist'}
  }
}
function cleanupPrintFrame(){
  document.title=ORIGINAL_DOCUMENT_TITLE;
  if(activePrintFrame){
    activePrintFrame.remove();
    activePrintFrame=null;
  }
  const btn=$('#priceListDownloadBtn'),shareBtn=$('#priceListShareBtn');
  if(btn){btn.disabled=!Array.isArray(filtered)||!filtered.length;btn.textContent='Download Pricelist'}
  if(shareBtn){shareBtn.disabled=!Array.isArray(filtered)||!filtered.length;shareBtn.textContent='Share PDF'}
}
function downloadSelectedPriceList(){
  if(!filtered.length){toast('Current filters me koi product nahi hai');return}
  // V77: desktop and mobile use the same complete professional PDF generator.
  downloadSelectedPriceListFast();
  return;
  cleanupPrintFrame();
  const btn=$('#priceListDownloadBtn');
  if(btn){btn.disabled=true;btn.textContent='Preparing PDF…'}
  const selectedGroup=clean($('#groupFilter').value);
  const filename=safePdfName(selectedGroup||'ALL GROUPS FILTERED PRICELIST');
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
 const base=FAST_ROWS.length===allData.length?FAST_ROWS:allData.map((row,index)=>({row,index,group:clean(getField(row,'GROUP')),sub:subGroupValue(row)}));
 const uniq=v=>[...new Set(v.filter(Boolean))].sort(natural);
 options($('#groupFilter'),uniq(base.map(x=>x.group)),'All groups');
 if(!USER_FILTER_SCOPE_ACTIVE)setDefaultGroupBrand(false);
 let r=base;if($('#groupFilter').value)r=r.filter(x=>x.group===$('#groupFilter').value);
 options($('#subGroupFilter'),uniq(r.map(x=>x.sub)),'All sub groups');if($('#subGroupFilter').value)r=r.filter(x=>x.sub===$('#subGroupFilter').value);
 const segmentEl=$('#segmentFilter');options(segmentEl,v97FacetValuesForRows(r,'segmentFilter'),'All segments');
 const segment=segmentEl.value;if(segment)r=r.filter(x=>v97StrictFacetMatch(x.row,'segmentFilter',segment));
 const vehicleEl=$('#vehicleFilter');options(vehicleEl,v97FacetValuesForRows(r,'vehicleFilter',{segment}),'All vehicles');
 const vehicle=vehicleEl.value;if(vehicle)r=r.filter(x=>v97StrictFacetMatch(x.row,'vehicleFilter',vehicle));
 const modelEl=$('#modelFilter');options(modelEl,v97FacetValuesForRows(r,'modelFilter',{segment,vehicle}),'All models');
 const model=modelEl.value;if(model)r=r.filter(x=>v97StrictFacetMatch(x.row,'modelFilter',model));
 const categoryEl=$('#categoryFilter');options(categoryEl,v97FacetValuesForRows(r,'categoryFilter'),'All categories');
 const category=categoryEl.value;if(category)r=r.filter(x=>v97StrictFacetMatch(x.row,'categoryFilter',category));
 const selectedCategory=$('#categoryFilter').value;options($('#subCategoryFilter'),v94SubCategoryOptions(selectedCategory),'All sub categories');
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
function hasActiveUpperFilters(){
  const multiActive=V103_MULTI_FILTER_IDS.some(id=>v103MultiValues(id).length);
  return multiActive || ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter','subCategoryFilter'].some(id=>clean($('#'+id)?.value)) ||
    [...document.querySelectorAll('.filter-search')].some(input=>!input.classList.contains('v104-panel-search')&&clean(input.value));
}
function isDefaultAllView(){
  return !hasActiveUpperFilters() && !clean($('#searchInput')?.value) && !clean($('#universalSearchInput')?.value);
}
function currentSortedFiltered(){
  // V40 fast landing mode: when everything is "All", do not sort 40k-60k rows
  // before showing page 1. Excel order is used for the paged grid.
  if(isDefaultAllView() && !printingAll)return filtered;
  // V101: Segment-only searches (especially CAR) can return 20k+ rows. Sorting
  // every row before displaying 50 products is wasted screen-time. Keep workbook
  // order for this broad paged view; PDF/Print still uses sortedRows() explicitly.
  const broadSegmentOnly=!printingAll&&filtered.length>2500&&clean($('#segmentFilter')?.value)&&
    !clean($('#groupFilter')?.value)&&!clean($('#subGroupFilter')?.value)&&!clean($('#vehicleFilter')?.value)&&
    !clean($('#modelFilter')?.value)&&!clean($('#categoryFilter')?.value)&&!clean($('#searchInput')?.value)&&
    !clean($('#universalSearchInput')?.value);
  const broadMulti=!printingAll&&filtered.length>2000&&V103_MULTI_FILTER_IDS.some(id=>v103MultiValues(id).length);
  if(broadSegmentOnly||broadMulti)return filtered;
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

function visibleColumnsForRows(rows){
  const keys=dataColumns();
  const activeViewByColumns=viewByColumnKeysForRows(rows);
  const columns=keys.filter(k=>{
    const normalized=keyOf(k);
    if(HIDDEN_COLUMNS.has(normalized))return false;
    if(!ALWAYS.includes(normalized)&&activeViewByColumns.has(normalized))return false;
    return ALWAYS.includes(normalized)||rows.some(r=>!isEmpty(getField(r,k)));
  });
  columns.sort((a,b)=>{
    if(keyOf(a)==='CODE')return -1;
    if(keyOf(b)==='CODE')return 1;
    return keys.indexOf(a)-keys.indexOf(b);
  });
  return columns;
}

// V44 tolerant full-row matcher. Exact/contains remains first and fastest. If speech/text
// contains an extra word or spacing mistake, meaningful tokens and compact code/model
// similarity are used as fallback. Numeric/code tokens are weighted strongly.
function smartUniversalRowMatch(x,rawQuery){
  const q=normalizeSearchText(rawQuery);
  if(!q)return true;
  const compact=q.replace(/\s+/g,'');
  if(x.allN.includes(q)||(compact&&x.allCompact.includes(compact)))return true;

  const cleaned=smartSearchPhrase(q);
  const cq=normalizeSearchText(cleaned);
  const cc=cq.replace(/\s+/g,'');
  if(cq&&(x.allN.includes(cq)||(cc&&x.allCompact.includes(cc))))return true;

  // Compact fuzzy matching catches AA 1000 2 -> AA1002 / KX N 525 -> KX525.
  if(cc.length>=5){
    const targets=[x.codeCompact,x.modelCompact,x.vehicleCompact,x.productCompact].filter(v=>v&&v.length>=3);
    for(const t of targets){
      if(t.includes(cc)||cc.includes(t))return true;
      const maxLen=Math.max(cc.length,t.length);
      if(maxLen<=24 && similarity(cc,t)>=0.84)return true;
    }
  }

  const tokens=cq.split(/\s+/).filter(w=>w.length>=2||/\d/.test(w));
  if(!tokens.length)return false;
  let matched=0,strongMatched=false,longMatched=false;
  for(const tok of tokens){
    const tc=tok.replace(/\s+/g,'');
    let ok=x.allN.includes(tok)||(tc&&x.allCompact.includes(tc));
    if(!ok && tc.length>=4){
      const targets=[x.codeCompact,x.modelCompact,x.vehicleCompact,x.productCompact].filter(Boolean);
      ok=targets.some(t=>{
        if(t.includes(tc))return true;
        if(Math.max(t.length,tc.length)>24)return false;
        return similarity(tc,t)>=0.86;
      });
    }
    if(ok){matched++;if(/\d/.test(tok))strongMatched=true;if(tok.length>=5)longMatched=true;}
  }
  if(strongMatched)return true;
  if(longMatched && matched>=1 && matched/tokens.length>=0.5)return true;
  return matched/tokens.length>=0.72;
}

function applyFilters(resetPage=true,doCascade=false){
  if(doCascade)cascade();
  if(FAST_ROWS.length!==allData.length)buildFastRows();
  const q=normalizeSearchText($('#searchInput').value);
  const groupText=normalizeSearchText(filterSearchTerm('groupFilter'));
  const subGroupText=normalizeSearchText(filterSearchTerm('subGroupFilter'));
  const segmentText=filterSearchTerm('segmentFilter'),vehicleText=filterSearchTerm('vehicleFilter'),modelText=filterSearchTerm('modelFilter'),categoryText=filterSearchTerm('categoryFilter'),subCategoryText=filterSearchTerm('subCategoryFilter');
  const gv=$('#groupFilter').value,sv=$('#subGroupFilter').value,segv=$('#segmentFilter').value,vv=$('#vehicleFilter').value,mv=$('#modelFilter').value,cv=$('#categoryFilter').value,scv=$('#subCategoryFilter')?.value||'';
  const multi=Object.fromEntries(V103_MULTI_FILTER_IDS.map(id=>[id,v103MultiValues(id)]));
  const segmentMulti=multi.segmentFilter;
  const out=[];
  for(let i=0;i<FAST_ROWS.length;i++){
    const x=FAST_ROWS[i],row=x.row;
    if(multi.groupFilter.length){if(!v103MultiMatch(row,'groupFilter',multi.groupFilter))continue}else if(gv&&x.group!==gv)continue;
    if(multi.subGroupFilter.length){if(!v103MultiMatch(row,'subGroupFilter',multi.subGroupFilter))continue}else if(sv&&x.sub!==sv)continue;
    if(segmentMulti.length){if(!v102MultiSegmentMatch(row,segmentMulti))continue}else if(segv&&!v94SegmentMatch(row,segv))continue;
    if(multi.vehicleFilter.length){if(!v103MultiMatch(row,'vehicleFilter',multi.vehicleFilter))continue}else if(vv&&!v94VehicleMatch(row,vv))continue;
    if(multi.modelFilter.length){if(!v103MultiMatch(row,'modelFilter',multi.modelFilter))continue}else if(mv&&!v94ModelMatch(row,mv))continue;
    if(multi.categoryFilter.length){if(!v103MultiMatch(row,'categoryFilter',multi.categoryFilter))continue}else if(cv&&!v94CategoryMatch(row,cv))continue;
    if(scv&&!v94SubCategoryMatch(row,scv))continue;
    if(groupText&&!x.groupN.includes(groupText))continue;if(subGroupText&&!x.subN.includes(subGroupText))continue;
    if(segmentText&&!v94FilterSearchMatch(row,'segmentFilter',segmentText))continue;if(vehicleText&&!v94FilterSearchMatch(row,'vehicleFilter',vehicleText))continue;if(modelText&&!v94FilterSearchMatch(row,'modelFilter',modelText))continue;if(categoryText&&!v94FilterSearchMatch(row,'categoryFilter',categoryText))continue;if(subCategoryText&&!v94FilterSearchMatch(row,'subCategoryFilter',subCategoryText))continue;
    if(q&&!smartUniversalRowMatch(x,q))continue;
    out.push(row);
  }
  filtered=out;sortedFilteredSource=null;
  const columnRows=(isDefaultAllView()&&filtered.length>2500)?filtered.slice(0,1200):filtered;
  visibleColumns=visibleColumnsForRows(columnRows);document.body.classList.toggle('table-compact',visibleColumns.length>12);if(resetPage)page=1;render();
}

function gridProductRow(row,serial){
  return '<tr><td class="index-col">'+serial+'</td>'+visibleColumns.map(column=>{
    const value=displayFieldValue(row,column);
    const key=keyOf(column);
    const part=key==='CODE';
    const price=key==='RATE'||key==='MRP';
    const left=part||key==='PRODUCT NAME';
    const cls=[part?'part-code':'',price?'price-value':'',left?'cell-left':'cell-right'].filter(Boolean).join(' ');
    return `<td class="${cls}" data-col="${escapeHtml(key)}">${escapeHtml(value)}</td>`;
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
  const nativeSelected=clean($('#groupFilter')?.value);
  const filteredGroups=[...new Set((filtered||[]).map(r=>clean(getField(r,'GROUP'))).filter(Boolean))];
  const selectedGroup=nativeSelected&&nativeSelected!=='ALL PRODUCTS'?nativeSelected:(filteredGroups.length===1?filteredGroups[0]:'');
  const selected=selectedGroup||'ALL PRODUCTS';
  renderCatalogCard(selectedGroup);
  [$('#brandLogo'), $('#printBrandLogo')].forEach(img=>setBrandLogoImage(img,selectedGroup));
  $('#selectedBrand').textContent=selectedGroup||'All Products';
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
    const label=key==='CLUTCH DIA'?'CLUTCH<br>DIA':escapeHtml(c);
    return `<th class="${cls}" data-col="${escapeHtml(key)}">${label}</th>`;
  }).join('')+'<th class="image-col">IMAGE / ORDER</th></tr>';

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
  USER_FILTER_SCOPE_ACTIVE=false;
  if(typeof window.RAJ_V103_CLEAR_MULTI_FILTERS==='function')window.RAJ_V103_CLEAR_MULTI_FILTERS();else window.RAJ_SEGMENT_MULTI_V102=[];
  ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter','subCategoryFilter'].forEach(id=>$('#'+id).value='');
  $('#searchInput').value=''; $('#universalSearchInput').value=''; document.querySelectorAll('.filter-search').forEach(x=>x.value='');
  cascade();
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
$('#priceListShareBtn').onclick=shareSelectedPriceListPdf;
if($('#indexPriceBookFilter')){$('#indexPriceBookFilter').onchange=v102UpdateIndexDownloadState;refreshIndexPriceBookOptions()}
if($('#indexPriceBookDownloadBtn'))$('#indexPriceBookDownloadBtn').onclick=downloadIndexPriceBook;
if($('#indexOnlyDownloadBtn'))$('#indexOnlyDownloadBtn').onclick=downloadOnlyIndex;

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
    // V104 dropdown search is local to the option list; selecting the checkbox
    // is what changes products. This keeps Model/Vehicle searching instant.
    if(inp.classList.contains('v104-panel-search'))return;
    USER_FILTER_SCOPE_ACTIVE=true;
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
  recognition.lang='en-IN'; recognition.interimResults=false; recognition.maxAlternatives=3;
  $('#voiceSearchBtn').classList.add('listening');$('#voiceStatus').textContent='Listening… speak product, code, description, MRP, rate, vehicle, model or other detail';
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
  v68StartBackgroundPreload();
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
    if(typeof window.RAJ_V46_IMPORT_CUSTOMERS_FROM_WORKBOOK==='function')window.RAJ_V46_IMPORT_CUSTOMERS_FROM_WORKBOOK(wb);
    const records=normalizeRows(rows);
    if(!records.length||!('GROUP' in records[0]))throw new Error('GROUP column missing');
    allData=records;window.RAJ_V114_INVALIDATE_FAST_ENGINE?.();v102InvalidateIndexMap();refreshIndexPriceBookOptions();window.RAJ_BOOT_MARK?.('v27',false);V68_PRELOAD.ready=false;V68_PRELOAD.running=false;v68StartBackgroundPreload();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
    if(typeof window.RAJ_V45_DATA_RELOADED==='function')window.RAJ_V45_DATA_RELOADED();
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
['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter','subCategoryFilter'].forEach(id=>$('#'+id).onchange=()=>{USER_FILTER_SCOPE_ACTIVE=true;flushPendingFilterApply();applyFilters(true,true)});
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
    const response=await fetch('data/price-book.xlsx?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('Hosted price-book.xlsx not found');
    const records=await readPriceWorkbookBuffer(await response.arrayBuffer());
    const previousGroup=clean($('#groupFilter').value);
    allData=records;window.RAJ_V114_INVALIDATE_FAST_ENGINE?.();v102InvalidateIndexMap();refreshIndexPriceBookOptions();window.RAJ_BOOT_MARK?.('v27',false);V68_PRELOAD.ready=false;V68_PRELOAD.running=false;v68StartBackgroundPreload();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
    if(typeof window.RAJ_V45_DATA_RELOADED==='function')window.RAJ_V45_DATA_RELOADED();
    buildCatalogMenu();
    const masterGroups=masterValuesForFilter('groupFilter');
    const groups=masterGroups.length?masterGroups:unique(allData,'GROUP');
    options($('#groupFilter'),groups,'All groups');
    $('#groupFilter').value=groups.includes(previousGroup)?previousGroup:'';
    if(!$('#groupFilter').value)setDefaultGroupBrand(true);
    cascade();
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
  // V95: Filter Master is a boot dependency. Start it before any model/category cache is built.
  // The Preparing screen remains visible until this resolves (or the existing safety cap opens the UI).
  v95LoadHostedFilterMaster();
  // V63: keep login immediately responsive. Heavy search/index work starts after first paint.
  rowIndexMap=new WeakMap();
  filtered=[];
  visibleColumns=[];
  page=1;
  $('#syncStatus').innerHTML='<span class="dot"></span> Price data ready';
  let v65HeavyStarted=false;
  const v65HeavyInit=()=>{
    if(v65HeavyStarted)return;
    if(!V68_PRELOAD.ready){
      v68StartBackgroundPreload();
      window.addEventListener('raj-data-preloaded',v65HeavyInit,{once:true});
      return;
    }
    v65HeavyStarted=true;
    // Full app indexes are ready now; refresh silently behind the already-visible Aayub view.
    buildCatalogMenu();
  };
  const v65StartAfterAuth=()=>{
    // Do not block the dashboard. V27 shows Aayub first; full app cache finishes invisibly.
    v68StartBackgroundPreload();
    if(V68_PRELOAD.ready)v65HeavyInit();
    else window.addEventListener('raj-data-preloaded',v65HeavyInit,{once:true});
  };
  // V83: build the full product/search metadata while the Preparing screen is visible.
  // Customer sees AAYUB only after the heavy preload has had time to finish.
  window.RAJ_FULL_PRELOAD_READY=false;
  v68StartBackgroundPreload();
  window.addEventListener('raj-auth-ready',v65StartAfterAuth,{once:true});
  if(window.RAJ_AUTH_READY)v65StartAfterAuth();

  const V71_BUNDLED_PRICEBOOK_SHA256='a006cc26b103625a2845b1cbc3f9823def7b59a8e828a0bb30e1697eb633d665';
  async function v71Sha256Hex(buf){
    try{const dig=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(dig)].map(b=>b.toString(16).padStart(2,'0')).join('')}catch(e){return ''}
  }
  async function v71ApplyHostedBuffer(buf){
    try{
      const records=await readPriceWorkbookBuffer(buf);if(!records?.length)return false;
      const previousGroup=clean($('#groupFilter')?.value);
      allData=records;window.RAJ_V114_INVALIDATE_FAST_ENGINE?.();v102InvalidateIndexMap();refreshIndexPriceBookOptions();window.RAJ_BOOT_MARK?.('v27',false);V68_PRELOAD.ready=false;V68_PRELOAD.running=false;v68StartBackgroundPreload();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
      if(typeof window.RAJ_V45_DATA_RELOADED==='function')window.RAJ_V45_DATA_RELOADED();
      buildCatalogMenu();const groups=masterValuesForFilter('groupFilter').length?masterValuesForFilter('groupFilter'):unique(allData,'GROUP');options($('#groupFilter'),groups,'All groups');$('#groupFilter').value=groups.includes(previousGroup)?previousGroup:'';if(!$('#groupFilter').value)setDefaultGroupBrand(true);cascade();applyFilters();return true;
    }catch(e){console.warn('Hosted Excel apply skipped',e);return false}
  }
  const v71MarkHostedReady=()=>{
    window.RAJ_BOOT_MARK?.('hosted',true);
    window.dispatchEvent(new CustomEvent('raj-hosted-price-ready'));
  };
  const v71CheckHostedPrice=async()=>{
    window.RAJ_BOOT_MARK?.('hosted',false);
    if(!/^https?:$/.test(location.protocol)){v71MarkHostedReady();return}
    const controller=typeof AbortController==='function'?new AbortController():null;
    const timer=setTimeout(()=>controller?.abort(),10000);
    try{
      const r=await fetch('data/price-book.xlsx?ts='+Date.now(),{cache:'no-store',signal:controller?.signal});if(!r.ok)return;
      const buf=await r.arrayBuffer(),hash=await v71Sha256Hex(buf);
      if(hash&&hash===V71_BUNDLED_PRICEBOOK_SHA256)return;
      // V114: any newer hosted workbook is fully applied behind the Preparing screen.
      await v71ApplyHostedBuffer(buf);
      if(typeof window.RAJ_V114_WAIT_FAST_ENGINE_READY==='function')await window.RAJ_V114_WAIT_FAST_ENGINE_READY(7000);
    }catch(e){if(e?.name!=='AbortError')console.warn('Hosted Excel check skipped',e)}
    finally{clearTimeout(timer);v71MarkHostedReady()}
  };
  v71CheckHostedPrice();
})();
