
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
  const card=$('#selectedCatalog');
  if(!title||!status||!catalogBtn||!priceBtn||!card)return;

  currentCatalogGroup=clean(group);
  currentCatalogUrl=configuredCatalog(currentCatalogGroup);
  card.classList.toggle('catalog-ready',!!currentCatalogUrl);
  card.classList.toggle('catalog-fallback',!!currentCatalogGroup&&!currentCatalogUrl);

  const hasGroup=!!currentCatalogGroup;
  const hasPricelistRows=Array.isArray(filtered) && filtered.length>0;
  catalogBtn.disabled=!hasGroup || !currentCatalogUrl;
  // Pricelist works for a selected group as well as All Groups.
  priceBtn.disabled=!hasPricelistRows;
  catalogBtn.title=currentCatalogUrl ? 'Open selected group catalog' : 'Add this group Google Drive link in js/catalog-links.js';
  priceBtn.title=hasPricelistRows
    ? (hasGroup ? 'Download the current filtered group as PDF' : 'Download all currently filtered groups as one PDF')
    : 'Current filters me koi product nahi hai';

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

const FAST_WATERMARK_JPEG_B64='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAcFBQYFBAcGBgYIBwcICxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyIyNTEsNSgsLSz/2wBDAQcICAsJCxULCxUsHRkdLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCz/wAARCAQABgADASIAAhEBAxEB/8QAHAABAAEFAQEAAAAAAAAAAAAAAAYBAwQFBwII/8QAXBAAAgEDAgMEBQcFCQ0HAwIHAAECAwQRBSEGEjETQVFhIjJxgZEHFEKhscHRFSNScrIWM1NigpKT4fAkJTQ1NkNUY3ODosLSFyY3VXSz8QhElOJkdYSjwydFRv/EABwBAQACAwEBAQAAAAAAAAAAAAAFBgMEBwECCP/EAD8RAQACAQIDAwoFBAEDAwUBAAABAgMEEQUhMRJBUQYTYXGBkaGx0fAUIjLB4SMzQlIVFjTxJFNiB0NygpLi/9oADAMBAAIRAxEAPwCNFSgPkAAAAAAAAAABUoAAKlAAAAAAAAAAAAFSgAAAAAAAAAAAAAAAAAAAACpQACpQACpQACpQAVBQAVBQAAAAAAAqUAAAABhAABjyAAAAAAAGEAAGF4AAAAAAAAAAAAAAwgAAAAAAAAAGBheAAAYXgAAGAAGF4AAAMLwAADC8AAGF4DC8AAGF4DC8AAAwmgAGF4IYXgAAGF4AAMLwAADC8AAAGEAAwhgAAMLwAAqUwAAAAAYAAAAAMIAAAAGPMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGF4AAAABUoAAAAAqUAAqUAAAAAAAKlAAAAFSgAAqUAFQUAFQUAFQUAAqUAFSgAAAAVKAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHeB3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+gD6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7wAAAAAAAAO8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADvAAAAAAA7wAAAAAAAAO8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVAFAVAFAVAFAVAFAVAFAVAFAVGGBQFcPwAFAVAFAVAFAVAFAVGAKAqMAUBUAUBUoABUAUBXBQACpQACoAoAVAoCoAoAAAKlAAKgCgKgCgKgCgKgCgKgCgKgCgKgCgAAAqAKAqUAAFQKAqUAAqUAAAAAAAAAAqUAAAAAAAGV4gAAAAAyAAAAAAAO/AyAAAAAZXiAAAAAAABlMAAAAAAAAAAMoABleIyAAGV4gAAAAAADIAAAAAAABUCgHuKgUAKgUBUoABUAUBXAwBQFRgCgKlAAKjDAoCuH4DAFAV3AFAVKN4AArh+AAoCuH4ACgAAAqAKArh+Aw/ACgBUCgK4Yw/ACgK4GGBQFRhgUBXD8BhgUBXDAFAVGH4AUBXD8ABQFcPwGH4AUBXDGH4AUBXD8BhgUBUYAoCow/ACgK4fgMPwAoCuH4AD/9k=';
function latin1Bytes(str){const a=new Uint8Array(str.length);for(let i=0;i<str.length;i++)a[i]=str.charCodeAt(i)&255;return a}
function pdfAscii(v){return clean(v).replace(/[^\x20-\x7E]/g,' ').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function b64Bytes(b64){const bin=atob(b64),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a}
function truncText(v,max){v=pdfAscii(v);if(v.length<=max)return v;return v.slice(0,Math.max(1,max-2))+'..'}
function fastPdfPages(){
 const rows=sortedRows(filtered), grouped=new Map();rows.forEach(r=>{const g=clean(getField(r,'GROUP'))||'OTHER';if(!grouped.has(g))grouped.set(g,[]);grouped.get(g).push(r)});
 const selected=clean($('#groupFilter').value);const groups=selected?[[selected,grouped.get(selected)||rows]]:[...grouped.entries()].sort((a,b)=>natural(a[0],b[0]));
 const pages=[]; const W=842,H=595,margin=22,top=52,rowH=10;
 for(const [group,gr] of groups){const cols=visibleColumnsForRows(gr);const weights=printColumnWeights(cols).columns;const usable=W-margin*2-18;const widths=weights.map(p=>usable*p/100);let page=null,y=0,serial=0;
   const newPage=()=>{page={group,cols,widths,cmd:[]};pages.push(page);y=top;page.cmd.push(`BT /F2 13 Tf 0.055 0.2 0.49 rg ${margin} ${H-22} Td (${pdfAscii(group)}) Tj ET`);page.cmd.push(`BT /F1 6 Tf 0 0 0 rg ${margin} ${H-34} Td (${pdfAscii('RAJ AGENCIES  |  '+gr.length+' PRODUCTS  |  COMPANY LIST DATE: '+listDateForRows(gr))}) Tj ET`);drawHeader();};
   const drawHeader=()=>{let x=margin;page.cmd.push(`0.055 0.2 0.49 rg ${margin} ${H-y-rowH} ${W-margin*2} ${rowH} re f`);page.cmd.push(`BT /F2 5 Tf 1 1 1 rg ${x+2} ${H-y-7} Td (#) Tj ET`);x+=18;for(let i=0;i<cols.length;i++){const max=Math.max(3,Math.floor(widths[i]/3));page.cmd.push(`BT /F2 5 Tf 1 1 1 rg ${x+2} ${H-y-7} Td (${truncText(cols[i],max)}) Tj ET`);x+=widths[i]}y+=rowH;};
   newPage();
   for(const r of gr){if(y+rowH>H-20)newPage();serial++;let x=margin;page.cmd.push(`0.82 G ${margin} ${H-y-rowH} ${W-margin*2} ${rowH} re S`);page.cmd.push(`BT /F1 5.2 Tf 0 0 0 rg ${x+2} ${H-y-7} Td (${serial}) Tj ET`);x+=18;for(let i=0;i<cols.length;i++){const val=getField(r,cols[i]);const max=Math.max(3,Math.floor(widths[i]/2.8));page.cmd.push(`BT /F1 5.2 Tf 0 0 0 rg ${x+2} ${H-y-7} Td (${truncText(val,max)}) Tj ET`);x+=widths[i]}y+=rowH;}
 }
 return pages;
}
function buildFastPdfBlob(){
 const pages=fastPdfPages(), jpeg=b64Bytes(FAST_WATERMARK_JPEG_B64), objects=[];const add=o=>{objects.push(o);return objects.length};
 const catalog=add(''), pagesObj=add(''), f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'), f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const gs=add('<< /Type /ExtGState /ca 0.07 /CA 0.07 >>');const img=add({bin:jpeg,head:`<< /Type /XObject /Subtype /Image /Width 1536 /Height 1024 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`});
 const pageIds=[];
 for(const p of pages){let content=`q /GS1 gs 520 0 0 347 161 120 cm /Im1 Do Q\n`+p.cmd.join('\n');const cb=latin1Bytes(content);const cobj=add({bin:cb,head:`<< /Length ${cb.length} >>`});const pobj=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /ExtGState << /GS1 ${gs} 0 R >> /XObject << /Im1 ${img} 0 R >> >> /Contents ${cobj} 0 R >>`);pageIds.push(pobj)}
 objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
 const chunks=[latin1Bytes('%PDF-1.4\n%FAST\n')], offsets=[0];let length=chunks[0].length;
 for(let i=0;i<objects.length;i++){offsets[i+1]=length;const prefix=latin1Bytes(`${i+1} 0 obj\n`);chunks.push(prefix);length+=prefix.length;const o=objects[i];if(typeof o==='string'){const b=latin1Bytes(o+'\nendobj\n');chunks.push(b);length+=b.length}else{let h=latin1Bytes(o.head+'\nstream\n');chunks.push(h);length+=h.length;chunks.push(o.bin);length+=o.bin.length;let e=latin1Bytes('\nendstream\nendobj\n');chunks.push(e);length+=e.length}}
 const xrefPos=length;let x=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)x+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;chunks.push(latin1Bytes(x));return new Blob(chunks,{type:'application/pdf'});
}
async function downloadSelectedPriceListFast(){
 if(!filtered.length){toast('Current filters me koi product nahi hai');return}const btn=$('#priceListDownloadBtn');if(btn){btn.disabled=true;btn.textContent='Creating PDF…'}
 const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);let preview=null;if(!mobile){try{preview=window.open('about:blank','_blank')}catch(e){}}
 try{await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,20)));const blob=buildFastPdfBlob();const url=URL.createObjectURL(blob);const name=safePdfName(clean($('#groupFilter').value)||'ALL GROUPS FILTERED PRICELIST')+'.pdf';const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();if(preview){preview.location=url;preview.document.title=name}else if(!mobile){window.open(url,'_blank','noopener')}setTimeout(()=>URL.revokeObjectURL(url),180000);toast(`PDF ready: ${(blob.size/1024/1024).toFixed(1)} MB`)}catch(err){console.error(err);if(preview)preview.close();toast('PDF create nahi hua. Please try again.')}finally{if(btn){btn.disabled=false;btn.textContent='Download Pricelist'}}
}
function cleanupPrintFrame(){
  document.title=ORIGINAL_DOCUMENT_TITLE;
  if(activePrintFrame){
    activePrintFrame.remove();
    activePrintFrame=null;
  }
  const btn=$('#priceListDownloadBtn');
  if(btn){btn.disabled=!Array.isArray(filtered)||!filtered.length;btn.textContent='Download Pricelist'}
}
function downloadSelectedPriceList(){
  if(!filtered.length){toast('Current filters me koi product nahi hai');return}
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
    allData=records;rebuildRowIndexMap();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
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
    allData=records;rebuildRowIndexMap();catalogUrlCache.clear();brandLogoCandidateCache.clear();lastUpdated=new Date();
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
    v65HeavyStarted=true;
    rebuildRowIndexMap();
    buildFastRows();
    cascade();
    setDefaultGroupBrand(true);
    cascade();
    buildCatalogMenu();
    applyFilters();
  };
  const v65StartAfterAuth=()=>{
    if('requestAnimationFrame' in window)requestAnimationFrame(()=>setTimeout(v65HeavyInit,0));
    else setTimeout(v65HeavyInit,0);
  };
  window.addEventListener('raj-auth-ready',v65StartAfterAuth,{once:true});
  if(window.RAJ_AUTH_READY)v65StartAfterAuth();

  const v66StartDataRestore=()=>{
      // Restore the last synchronized Excel immediately. The bundled data remains visible
      // during the short IndexedDB read, then the saved rows replace it automatically.
      const hosted=/^https?:$/.test(location.protocol);
      const restoreLocal=hosted?Promise.resolve(null):loadDB();
      restoreLocal.then(cached=>{
        if(cached && cached.data && cached.data.length){
          allData=cached.data;rebuildRowIndexMap();catalogUrlCache.clear();brandLogoCandidateCache.clear();
          if(typeof window.RAJ_V45_DATA_RELOADED==='function')window.RAJ_V45_DATA_RELOADED();
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
  };
  window.addEventListener('raj-auth-ready',v66StartDataRestore,{once:true});
  if(window.RAJ_AUTH_READY)v66StartDataRestore();
})();
