

window.RAJ_BOOT_STATE=window.RAJ_BOOT_STATE||{quick:false,hosted:false,app:false,v27:false,ready:false,openedAt:Date.now()};
window.RAJ_BOOT_MARK=window.RAJ_BOOT_MARK||function(key,value=true){
  const s=window.RAJ_BOOT_STATE||(window.RAJ_BOOT_STATE={quick:false,hosted:false,app:false,v27:false,ready:false,openedAt:Date.now()});
  s[key]=!!value;
  // V74: customer never waits for the full 44k cache or hosted refresh.
  // Aayub quick cache is the only technical readiness requirement.
  if(s.quick&&!s.ready){
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
  'NEW PRODUCT LAUNCH','DEAD STOCK','FSN CLASS'
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
// V42: Universal search intentionally excludes GROUP / BRAND itself. Everything
// else in the Excel row remains searchable, including future columns added later.
// This keeps the search product/data-centric while upper GROUP filters still work.
function universalRowValues(row){
  if(Array.isArray(row) && COMPACT_COLUMNS.length){
    return COMPACT_COLUMNS.filter(name=>{
      const k=compactFieldKey(name);
      return k!=='GROUP' && k!=='GROUPBRAND' && k!=='BRANDGROUP';
    }).map(name=>clean(getField(row,name))).filter(Boolean);
  }
  return Object.entries(row||{}).filter(([key])=>{
    const k=compactFieldKey(key);
    return k!=='GROUP' && k!=='GROUPBRAND' && k!=='BRANDGROUP';
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
  if(force || !clean(el.value))el.value=match.value;
  return normalizeSearchText(el.value)===normalizeSearchText(match.value);
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
  ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>$('#'+id).value='');
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
    .print-head{display:grid;grid-template-columns:95px 1fr 95px;align-items:start;border-bottom:3px solid #f5b00e;padding:0 0 8px;margin:0 0 5px;break-after:avoid;page-break-after:avoid}
    .company-logo,.brand-logo{width:88px;height:46px;object-fit:contain;margin-top:0;margin-bottom:4px}
    .brand-logo{justify-self:end}
    .title{text-align:center}
    .kicker{font-size:11px;font-weight:900;letter-spacing:.12em;color:#dc6c0b}
    h1{margin:1px 0;color:#0e337e;font-size:18px;line-height:1.05}
    .sub{font-size:8px;letter-spacing:.18em;font-weight:800;color:#0e337e}
    .meta{display:flex;justify-content:center;gap:5px;margin-top:4px;font-size:6.7px;font-weight:800;flex-wrap:wrap}
    .meta span{border:1px solid #7bb8ee;border-radius:4px;padding:2px 5px;background:#f3f9ff;display:inline-flex;align-items:center;justify-content:center;text-align:center;min-height:18px}
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
const V77_COMPANY_LOGO_JPEG_B64='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';
const V77_AAYUB_LOGO_JPEG_B64='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';

function fastPdfPages(){
  const rows=sortedRows(filtered),grouped=new Map();
  rows.forEach(r=>{const g=clean(getField(r,'GROUP'))||'OTHER';if(!grouped.has(g))grouped.set(g,[]);grouped.get(g).push(r)});
  const selected=clean($('#groupFilter').value);
  const groups=selected?[[selected,grouped.get(selected)||rows]]:[...grouped.entries()].sort((x,y)=>natural(x[0],y[0]));
  const pages=[],W=842,H=595,margin=22,contentTop=86,rowH=9.6,bandH=11.5;
  const esc=pdfAscii;
  const rgb=(r,g,b)=>`${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)}`;
  const approxTextWidth=(text,size,bold=false)=>pdfAscii(text).length*size*(bold?.56:.50);
  const centeredX=(text,size,left,right,bold=false)=>Math.max(left,left+((right-left)-approxTextWidth(text,size,bold))/2);

  for(const [group,sourceRows] of groups){
    // V82: PDF hierarchy is controlled ONLY by Excel VIEW BY, in the exact comma-separated order.
    // Example: SEGMENT,CATEGORY,VEHICLE => Segment > Category > Vehicle > products.
    // Nothing (including MODEL) is injected automatically.
    const hierarchyFields=viewByFields(sourceRows);
    const gr=sortRowsByFields(sourceRows,hierarchyFields);
    const cols=visibleColumnsForRows(gr),weights=printColumnWeights(cols).columns,usable=W-margin*2-18,widths=weights.map(p=>usable*p/100);
    let page=null,y=0,serial=0,lastPath=[];

    const drawColumnHeader=()=>{
      let x=margin;
      page.cmd.push(`${rgb(14,51,126)} rg ${margin} ${H-y-rowH} ${W-margin*2} ${rowH} re f`);
      page.cmd.push(`BT /F2 4.8 Tf 1 1 1 rg ${x+2} ${H-y-6.7} Td (#) Tj ET`);x+=18;
      for(let i=0;i<cols.length;i++){
        const max=Math.max(3,Math.floor(widths[i]/3));
        page.cmd.push(`BT /F2 4.8 Tf 1 1 1 rg ${x+2} ${H-y-6.7} Td (${esc(truncText(cols[i],max))}) Tj ET`);
        x+=widths[i];
      }
      y+=rowH;
    };

    const newPage=()=>{
      page={group,cols,widths,cmd:[],brandLogoB64:pdfEmbeddedLogoB64(group)};pages.push(page);y=contentTop;

      // Fixed professional header. Logos stay clear of the yellow rule.
      page.cmd.push(`${rgb(245,176,14)} rg ${margin} ${H-77} ${W-margin*2} 3 re f`);

      const centerLeft=250,centerRight=592;
      const agency='RAJ AGENCIES', live='LIVE PRICE BOOK';
      page.cmd.push(`BT /F2 7.6 Tf ${rgb(220,108,11)} rg ${centeredX(agency,7.6,centerLeft,centerRight,true).toFixed(1)} ${H-28} Td (${agency}) Tj ET`);
      page.cmd.push(`BT /F2 14.5 Tf ${rgb(14,51,126)} rg ${centeredX(group,14.5,centerLeft,centerRight,true).toFixed(1)} ${H-44} Td (${esc(group)}) Tj ET`);
      page.cmd.push(`BT /F2 6.2 Tf ${rgb(14,51,126)} rg ${centeredX(live,6.2,centerLeft,centerRight,true).toFixed(1)} ${H-55} Td (${live}) Tj ET`);

      // Four equal, centered metadata boxes.
      const metaItems=[
        `COMPANY LIST DATE: ${listDateForRows(gr)}`,
        `LAST UPDATED: ${lastUpdated.toLocaleDateString('en-GB')}`,
        `${gr.length} PRODUCTS`,
        `${cols.length} COLUMNS`
      ];
      const metaLeft=220,metaGap=6,metaWidths=[112,108,70,68],metaY=H-72,metaH=9;
      let mx=metaLeft;
      for(let i=0;i<metaItems.length;i++){
        const mw=metaWidths[i],fs=4.5;
        page.cmd.push(`0.42 0.67 0.88 RG 0.965 0.985 1 rg ${mx} ${metaY} ${mw} ${metaH} re B`);
        page.cmd.push(`BT /F2 ${fs} Tf 0.12 0.20 0.32 rg ${centeredX(metaItems[i],fs,mx,mx+mw,true).toFixed(1)} ${metaY+2.7} Td (${esc(metaItems[i])}) Tj ET`);
        mx+=mw+metaGap;
      }
      drawColumnHeader();
      lastPath=[];
    };

    const band=(label,value,level,count)=>{
      if(!value)return;
      if(y+bandH>H-24)newPage();
      const fills=[[255,243,189],[220,238,255],[237,243,251],[247,248,250]];
      const texts=[[90,59,0],[14,51,126],[39,54,74],[39,54,74]];
      const idx=Math.min(level-1,3),f=fills[idx],tc=texts[idx];
      page.cmd.push(`${rgb(...f)} rg ${margin} ${H-y-bandH} ${W-margin*2} ${bandH} re f`);
      page.cmd.push(`${rgb(122,155,196)} RG ${margin} ${H-y-bandH} ${W-margin*2} ${bandH} re S`);
      page.cmd.push(`BT /F2 ${level===1?6.2:5.7} Tf ${rgb(...tc)} rg ${margin+4+(level-1)*8} ${H-y-7.7} Td (${esc(label+'  '+value)}) Tj ET`);
      if(count)page.cmd.push(`BT /F2 4.9 Tf ${rgb(...tc)} rg ${W-margin-60} ${H-y-7.7} Td (${esc(count+' Products')}) Tj ET`);
      y+=bandH;
    };

    const countPath=path=>gr.filter(row=>path.every((value,index)=>groupValue(row,hierarchyFields[index])===value)).length;

    newPage();
    for(const r of gr){
      const path=hierarchyFields.map(field=>groupValue(r,field));
      let changedAt=0;
      while(changedAt<path.length && lastPath[changedAt]===path[changedAt])changedAt++;
      for(let level=changedAt;level<path.length;level++){
        band(viewByLabel(hierarchyFields[level]),path[level],level+1,countPath(path.slice(0,level+1)));
      }
      lastPath=path;

      if(y+rowH>H-24)newPage();
      serial++;let x=margin;
      if(serial%2===0)page.cmd.push(`0.970 0.980 0.990 rg ${margin} ${H-y-rowH} ${W-margin*2} ${rowH} re f`);
      page.cmd.push(`0.72 0.76 0.82 RG ${margin} ${H-y-rowH} ${W-margin*2} ${rowH} re S`);
      page.cmd.push(`BT /F1 4.9 Tf 0 0 0 rg ${x+2} ${H-y-6.7} Td (${serial}) Tj ET`);x+=18;
      for(let i=0;i<cols.length;i++){
        const val=getField(r,cols[i]),max=Math.max(3,Math.floor(widths[i]/2.8));
        const isPrice=/^(RATE|MRP)$/i.test(cols[i]);
        page.cmd.push(`BT /${isPrice?'F2':'F1'} 4.9 Tf ${isPrice?'0.02 0.34 0.72':'0 0 0'} rg ${x+2} ${H-y-6.7} Td (${esc(truncText(val,max))}) Tj ET`);
        x+=widths[i];
      }
      y+=rowH;
    }
  }
  return pages;
}

async function buildFastPdfBlob(){
  const pages=fastPdfPages(),jpeg=b64Bytes(FAST_WATERMARK_JPEG_B64),company=b64Bytes(V77_COMPANY_LOGO_JPEG_B64),objects=[];
  const add=o=>{objects.push(o);return objects.length};
  const catalog=add(''),pagesObj=add(''),f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const gs=add('<< /Type /ExtGState /ca 0.065 /CA 0.065 >>');
  const wm=add({bin:jpeg,head:`<< /Type /XObject /Subtype /Image /Width 1536 /Height 1024 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`});
  const logo=add({bin:company,head:`<< /Type /XObject /Subtype /Image /Width 300 /Height 160 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${company.length} >>`});

  const brandObjects=new Map();
  for(const p of pages){
    const b64=p.brandLogoB64||'';
    if(b64&&!brandObjects.has(b64)){
      const bytes=b64Bytes(b64);
      brandObjects.set(b64,add({bin:bytes,head:`<< /Type /XObject /Subtype /Image /Width 360 /Height 180 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`}));
    }
  }

  const pageIds=[];
  for(let pageIndex=0;pageIndex<pages.length;pageIndex++){
    const p=pages[pageIndex];
    const generated=new Date().toLocaleString('en-GB',{hour12:true});
    const docTitle=clean($('#groupFilter').value)?clean($('#groupFilter').value)+' Filtered Pricelist':'All Groups Filtered Pricelist';

    // Outer print-header/footer details retained from June look.
    let content=`BT /F1 4.7 Tf 0.20 0.20 0.20 rg 22 586 Td (${pdfAscii(generated)}) Tj ET\n`;
    content+=`BT /F1 4.7 Tf 0.20 0.20 0.20 rg 365 586 Td (${pdfAscii(docTitle)}) Tj ET\n`;
    content+=`BT /F1 4.7 Tf 0.20 0.20 0.20 rg 795 586 Td (${pageIndex+1}/${pages.length}) Tj ET\n`;
    content+=`BT /F1 4.5 Tf 0.25 0.25 0.25 rg 22 7 Td (${pdfAscii(location.href)}) Tj ET\n`;

    // clean watermark + fixed logos
    content+=`q /GS1 gs 520 0 0 347 161 120 cm /ImWM Do Q\n`;
    content+=`q 68 0 0 36 28 526 cm /ImLogo Do Q\n`;
    const brandId=brandObjects.get(p.brandLogoB64||'')||0;
    if(brandId)content+=`q 78 0 0 36 738 528 cm /ImBrand Do Q\n`;
    content+=p.cmd.join('\n');

    const cb=latin1Bytes(content),cobj=add({bin:cb,head:`<< /Length ${cb.length} >>`});
    const brandResource=brandId?` /ImBrand ${brandId} 0 R`:'';
    const pobj=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /ExtGState << /GS1 ${gs} 0 R >> /XObject << /ImWM ${wm} 0 R /ImLogo ${logo} 0 R${brandResource} >> >> /Contents ${cobj} 0 R >>`);
    pageIds.push(pobj);
  }

  objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;

  const chunks=[latin1Bytes('%PDF-1.4\n%V81\n')],offsets=[0];let length=chunks[0].length;
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
  return safePdfName(clean($('#groupFilter').value)||'ALL GROUPS FILTERED PRICELIST')+'.pdf';
}
async function createCompletePriceListPdfBlob(){
  if(!Array.isArray(filtered)||!filtered.length)throw new Error('Current filters me koi product nahi hai');
  // IMPORTANT: buildFastPdfBlob reads the complete `filtered` array, not rendered/current-page DOM rows.
  await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,15)));
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
 const base=FAST_ROWS.length===allData.length?FAST_ROWS:allData.map((row,index)=>({row,index,group:clean(getField(row,'GROUP')),sub:subGroupValue(row),segment:clean(getField(row,'SEGMENT')),vehicle:clean(getField(row,'VEHICLE')),model:clean(getField(row,'MODEL')),category:clean(getField(row,'CATAGORIES','CATEGORIES','CATEGORY'))}));
 const uniq=v=>[...new Set(v.filter(Boolean))].sort(natural);
 options($('#groupFilter'),uniq(base.map(x=>x.group)),'All groups');
 setDefaultGroupBrand(false);
 let r=base;if($('#groupFilter').value)r=r.filter(x=>x.group===$('#groupFilter').value);
 options($('#subGroupFilter'),uniq(r.map(x=>x.sub)),'All sub groups');if($('#subGroupFilter').value)r=r.filter(x=>x.sub===$('#subGroupFilter').value);
 options($('#segmentFilter'),uniq(r.flatMap(x=>segmentTokens(x.segment))),'All segments');if($('#segmentFilter').value)r=r.filter(x=>multiValueMatch(x.segment,$('#segmentFilter').value,'SEGMENT')||multiValueMatch(x.segment,'UNIVERSAL','SEGMENT'));
 options($('#vehicleFilter'),uniq(r.map(x=>x.vehicle)),'All vehicles');if($('#vehicleFilter').value)r=r.filter(x=>multiValueMatch(x.vehicle,$('#vehicleFilter').value,'VEHICLE'));
 options($('#modelFilter'),uniq(r.map(x=>x.model)),'All models');if($('#modelFilter').value)r=r.filter(x=>multiValueMatch(x.model,$('#modelFilter').value,'MODEL'));
 options($('#categoryFilter'),uniq(r.map(x=>x.category)),'All categories');
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
  return ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].some(id=>clean($('#'+id)?.value)) ||
    [...document.querySelectorAll('.filter-search')].some(input=>clean(input.value));
}
function isDefaultAllView(){
  return !hasActiveUpperFilters() && !clean($('#searchInput')?.value) && !clean($('#universalSearchInput')?.value);
}
function currentSortedFiltered(){
  // V40 fast landing mode: when everything is "All", do not sort 40k-60k rows
  // before showing page 1. Excel order is used for the paged grid; heavy sorting is
  // still performed for actual filtered results and PDF generation.
  if(isDefaultAllView() && !printingAll)return filtered;
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
  const qCompact=q.replace(/\s+/g,'');
  const groupText=normalizeSearchText(filterSearchTerm('groupFilter'));
  const subGroupText=normalizeSearchText(filterSearchTerm('subGroupFilter'));
  const segmentText=filterSearchTerm('segmentFilter');
  const vehicleText=filterSearchTerm('vehicleFilter');
  const modelText=filterSearchTerm('modelFilter');
  const categoryText=normalizeSearchText(filterSearchTerm('categoryFilter'));
  const gv=$('#groupFilter').value, sv=$('#subGroupFilter').value, segv=$('#segmentFilter').value, vv=$('#vehicleFilter').value, mv=$('#modelFilter').value, cv=$('#categoryFilter').value;
  const out=[];
  for(let i=0;i<FAST_ROWS.length;i++){
    const x=FAST_ROWS[i];
    // V40: upper dropdown/search filters always define the scope. With all dropdowns
    // blank this naturally becomes a full-Excel / All-Groups universal search.
    if(gv&&x.group!==gv)continue;if(sv&&x.sub!==sv)continue;
    if(segv&&!(multiValueMatch(x.segment,segv,'SEGMENT')||multiValueMatch(x.segment,'UNIVERSAL','SEGMENT')))continue;
    if(vv&&!multiValueMatch(x.vehicle,vv,'VEHICLE'))continue;if(mv&&!multiValueMatch(x.model,mv,'MODEL'))continue;if(cv&&x.category!==cv)continue;
    if(groupText&&!x.groupN.includes(groupText))continue;if(subGroupText&&!x.subN.includes(subGroupText))continue;
    if(segmentText&&!multiValueMatch(x.segment,segmentText,'SEGMENT'))continue;if(vehicleText&&!multiValueMatch(x.vehicle,vehicleText,'VEHICLE'))continue;if(modelText&&!multiValueMatch(x.model,modelText,'MODEL'))continue;if(categoryText&&!x.categoryN.includes(categoryText))continue;
    // SEARCH ANYTHING checks every Excel column, but only after the optional upper
    // filter scope above. Space/punctuation-insensitive fallback supports 12-10 / 1210.
    if(q && !smartUniversalRowMatch(x,q))continue;
    out.push(x.row);
  }
  filtered=out;sortedFilteredSource=null;
  // On the huge default All-Groups landing view, infer columns from a representative
  // sample so the first 50 rows appear immediately. Filtered views use exact rows.
  const columnRows=(isDefaultAllView()&&filtered.length>2500)?filtered.slice(0,1200):filtered;
  visibleColumns=visibleColumnsForRows(columnRows);document.body.classList.toggle('table-compact',visibleColumns.length>12);if(resetPage)page=1;render();
}

function gridProductRow(row,serial){
  return '<tr><td class="index-col">'+serial+'</td>'+visibleColumns.map(column=>{
    const value=getField(row,column);
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
    return `<th class="${cls}" data-col="${escapeHtml(key)}">${escapeHtml(c)}</th>`;
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
  ['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>$('#'+id).value='');
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
    USER_FILTER_SCOPE_ACTIVE=true;
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
    allData=records;window.RAJ_BOOT_MARK?.('v27',false);V68_PRELOAD.ready=false;V68_PRELOAD.running=false;v68StartBackgroundPreload();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
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
['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>$('#'+id).onchange=()=>{USER_FILTER_SCOPE_ACTIVE=true;flushPendingFilterApply();applyFilters(true,true)});
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
    const response=await fetch('assets/data/price-book.xlsx?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('Hosted price-book.xlsx not found');
    const records=await readPriceWorkbookBuffer(await response.arrayBuffer());
    const previousGroup=clean($('#groupFilter').value);
    allData=records;window.RAJ_BOOT_MARK?.('v27',false);V68_PRELOAD.ready=false;V68_PRELOAD.running=false;v68StartBackgroundPreload();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
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
  window.addEventListener('raj-auth-ready',v65StartAfterAuth,{once:true});
  if(window.RAJ_AUTH_READY)v65StartAfterAuth();

  const V71_BUNDLED_PRICEBOOK_SHA256='88ec6f77150cb0f1799567ef9fc79c462eef8dddb4785cf91c12ba1d1b0ac4cc';
  async function v71Sha256Hex(buf){
    try{const dig=await crypto.subtle.digest('SHA-256',buf);return [...new Uint8Array(dig)].map(b=>b.toString(16).padStart(2,'0')).join('')}catch(e){return ''}
  }
  async function v71ApplyHostedBuffer(buf){
    try{
      const records=await readPriceWorkbookBuffer(buf);if(!records?.length)return false;
      const previousGroup=clean($('#groupFilter')?.value);
      allData=records;window.RAJ_BOOT_MARK?.('v27',false);V68_PRELOAD.ready=false;V68_PRELOAD.running=false;v68StartBackgroundPreload();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
      if(typeof window.RAJ_V45_DATA_RELOADED==='function')window.RAJ_V45_DATA_RELOADED();
      buildCatalogMenu();const groups=masterValuesForFilter('groupFilter').length?masterValuesForFilter('groupFilter'):unique(allData,'GROUP');options($('#groupFilter'),groups,'All groups');$('#groupFilter').value=groups.includes(previousGroup)?previousGroup:'';if(!$('#groupFilter').value)setDefaultGroupBrand(true);cascade();applyFilters();return true;
    }catch(e){console.warn('Hosted Excel apply skipped',e);return false}
  }
  const v71CheckHostedPrice=async()=>{
    if(!/^https?:$/.test(location.protocol))return;
    try{
      const r=await fetch('assets/data/price-book.xlsx?ts='+Date.now(),{cache:'no-store'});if(!r.ok)return;
      const buf=await r.arrayBuffer(),hash=await v71Sha256Hex(buf);
      if(hash&&hash===V71_BUNDLED_PRICEBOOK_SHA256)return;
      const apply=()=>v71ApplyHostedBuffer(buf);
      const afterAuth=()=>{if('requestIdleCallback' in window)requestIdleCallback(apply,{timeout:5000});else setTimeout(apply,2500)};
      if(window.RAJ_AUTH_READY)afterAuth();else window.addEventListener('raj-auth-ready',afterAuth,{once:true});
    }catch(e){console.warn('Hosted Excel check skipped',e)}
  };
  v71CheckHostedPrice();
})();
