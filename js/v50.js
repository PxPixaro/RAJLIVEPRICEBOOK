/* RAJ LIVE PRICE BOOK V99 — mobile shell + FAST INDEXED CASCADE */
(function(){
'use strict';

const $=s=>document.querySelector(s);

/* =========================================================
   EXISTING V50 MOBILE SHELL — UNCHANGED
   ========================================================= */
function go(sel){
  const el=$(sel);
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
}

function addDock(){
  if($('.v50-mobile-dock'))return;
  document.body.insertAdjacentHTML(
    'beforeend',
    '<nav class="v50-mobile-dock" aria-label="Mobile quick actions">'+
      '<button data-go="top" type="button"><span>⌂</span><b>Home</b></button>'+
      '<button data-go="filters" type="button"><span>⌕</span><b>Filters</b></button>'+
      '<button data-go="search" type="button"><span>⌕</span><b>Search</b></button>'+
      '<button data-go="offers" type="button"><span>★</span><b>Offers</b></button>'+
      '<button data-go="cart" type="button"><span>🛒</span><b>Cart</b><em id="v50DockCart">0</em></button>'+
    '</nav>'
  );

  document.querySelectorAll('.v50-mobile-dock button').forEach(b=>{
    b.onclick=()=>{
      const a=b.dataset.go;
      if(a==='top')scrollTo({top:0,behavior:'smooth'});
      else if(a==='filters')go('.filter-panel');
      else if(a==='search')go('.v46-section-divider');
      else if(a==='offers')$('#offerSchemeBtn')?.click();
      else if(a==='cart')$('#cartBtn')?.click();
    };
  });
}

function syncCart(){
  const n=$('#cartCount')?.textContent||'0';
  const e=$('#v50DockCart');
  if(e)e.textContent=n;
}

function bind(){
  addDock();
  syncCart();

  new MutationObserver(syncCart).observe(
    $('#cartCount')||document.body,
    {childList:true,subtree:true,characterData:true}
  );
}

/* =========================================================
   V99 FAST INDEXED CASCADE
   GROUP → SUB GROUP → SEGMENT → VEHICLE → MODEL
   ========================================================= */
function installV99FastCascade(){

  if(window.RAJ_V99_FAST_CASCADE_INSTALLED)return;

  if(
    typeof masterValuesForFilter!=='function' ||
    typeof multiValueMatch!=='function' ||
    typeof getField!=='function' ||
    typeof clean!=='function'
  ){
    setTimeout(installV99FastCascade,60);
    return;
  }

  window.RAJ_V99_FAST_CASCADE_INSTALLED=true;

  /* V99 version without requiring config file replacement */
  try{
    if(window.RAJ_V45_CONFIG){
      window.RAJ_V45_CONFIG.VERSION='V99';
    }
  }catch(_e){}

  const originalMasterValues=masterValuesForFilter;

  const SEGMENT_ID='segmentFilter';
  const VEHICLE_ID='vehicleFilter';
  const MODEL_ID='modelFilter';

  const MASTER_IDS=[
    SEGMENT_ID,
    VEHICLE_ID,
    MODEL_ID
  ];

  const FIELD_NAMES={
    segmentFilter:'SEGMENT',
    vehicleFilter:'VEHICLE',
    modelFilter:'MODEL'
  };

  const EMPTY_MASTER=[];

  let sourceRef=null;
  let sourceLength=-1;
  let metaRows=[];

  let rowCache=new Map();
  let optionCache=new Map();

  const rawMatchCache={
    segmentFilter:new Map(),
    vehicleFilter:new Map(),
    modelFilter:new Map()
  };

  let masterIndexes={};
  let masterRefs={};
  let masterLengths={};

  function elementValue(id){
    return clean(document.getElementById(id)?.value||'');
  }

  function normalizeValue(value){
    if(typeof looseFieldText==='function'){
      return looseFieldText(value);
    }

    return clean(value)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function directMasterArray(id){
    try{
      if(
        typeof filterMasterLists!=='undefined' &&
        Array.isArray(filterMasterLists[id])
      ){
        return filterMasterLists[id];
      }
    }catch(_e){}

    return EMPTY_MASTER;
  }

  function addMap(map,key,index){
    if(!key)return;

    let list=map.get(key);

    if(!list){
      list=[];
      map.set(key,list);
    }

    list.push(index);
  }

  function uniqueMasterValues(source){
    const out=[];
    const seen=new Set();

    for(const value of source||[]){
      const item=clean(value);
      const key=normalizeValue(item);

      if(!item || !key || seen.has(key))continue;

      seen.add(key);
      out.push(item);
    }

    if(typeof natural==='function'){
      out.sort(natural);
    }else{
      out.sort();
    }

    return out;
  }

  function buildMasterIndex(source,field){
    const values=uniqueMasterValues(source);

    const tokenMap=new Map();
    const prefixMap=new Map();
    const firstLengthMap=new Map();
    const compactMap=new Map();

    const normalized=[];
    const compactValues=[];

    values.forEach((value,index)=>{
      const n=normalizeValue(value);
      const compact=n.replace(/\s+/g,'');

      normalized[index]=n;
      compactValues[index]=compact;

      addMap(compactMap,compact,index);

      const tokens=[
        ...new Set(
          n.split(/\s+/).filter(Boolean)
        )
      ];

      tokens.forEach(token=>{
        addMap(tokenMap,token,index);

        const prefix=
          token.length>=3
            ? token.slice(0,3)
            : token;

        addMap(prefixMap,prefix,index);

        if(token.length){
          addMap(
            firstLengthMap,
            token[0]+'|'+token.length,
            index
          );
        }
      });
    });

    return {
      field,
      values,
      normalized,
      compactValues,
      tokenMap,
      prefixMap,
      firstLengthMap,
      compactMap
    };
  }

  function ensureMasterIndexes(){
    let changed=false;

    MASTER_IDS.forEach(id=>{
      const ref=directMasterArray(id);
      const len=ref.length;

      if(
        masterRefs[id]!==ref ||
        masterLengths[id]!==len
      ){
        changed=true;
      }
    });

    if(!changed && masterIndexes[MODEL_ID])return;

    MASTER_IDS.forEach(id=>{
      const ref=directMasterArray(id);

      masterRefs[id]=ref;
      masterLengths[id]=ref.length;

      masterIndexes[id]=buildMasterIndex(
        ref,
        FIELD_NAMES[id]
      );

      rawMatchCache[id].clear();
    });

    optionCache.clear();
  }

  function fallbackMeta(row,index){
    return {
      row,
      index,

      group:clean(getField(row,'GROUP')),

      sub:
        typeof subGroupValue==='function'
          ? subGroupValue(row)
          : clean(
              getField(
                row,
                'SUB GROUP',
                'SUB-GROUP',
                'SUBGROUP',
                'SUB GROUP NAME'
              )
            ),

      segment:clean(getField(row,'SEGMENT')),
      vehicle:clean(getField(row,'VEHICLE')),
      model:clean(getField(row,'MODEL'))
    };
  }

  function ensureRows(){
    let source=[];

    try{
      if(
        typeof allData!=='undefined' &&
        Array.isArray(allData)
      ){
        source=allData;
      }
    }catch(_e){}

    if(
      sourceRef===source &&
      sourceLength===source.length
    ){
      return;
    }

    sourceRef=source;
    sourceLength=source.length;

    let usedFastRows=false;

    try{
      if(
        typeof FAST_ROWS!=='undefined' &&
        Array.isArray(FAST_ROWS) &&
        FAST_ROWS.length===source.length &&
        (
          !source.length ||
          FAST_ROWS[0]?.row===source[0]
        )
      ){
        metaRows=FAST_ROWS;
        usedFastRows=true;
      }
    }catch(_e){}

    if(!usedFastRows){
      metaRows=source.map(fallbackMeta);
    }

    rowCache.clear();
    optionCache.clear();

    MASTER_IDS.forEach(id=>{
      rawMatchCache[id].clear();
    });
  }

  function specialContext(){
    try{
      if(typeof window.RAJ_V45_SPECIAL_CONTEXT==='function'){
        return window.RAJ_V45_SPECIAL_CONTEXT()||{};
      }
    }catch(_e){}

    return {};
  }

  function specialSignature(ctx){
    return [
      clean(ctx?.special||''),
      clean(ctx?.fsn||'')
    ].join('|');
  }

  function passesSpecial(meta,ctx){
    try{
      if(
        ctx.special==='new' &&
        typeof ctx.isNew==='function' &&
        !ctx.isNew(meta.row)
      ){
        return false;
      }

      if(
        ctx.special==='dead' &&
        typeof ctx.isDead==='function' &&
        !ctx.isDead(meta.row)
      ){
        return false;
      }

      if(
        ctx.fsn &&
        typeof ctx.fsnValue==='function'
      ){
        const normalizer=
          typeof ctx.normalizeFsnClass==='function'
            ? ctx.normalizeFsnClass
            : value=>normalizeValue(value);

        if(
          normalizer(ctx.fsnValue(meta.row)) !==
          normalizer(ctx.fsn)
        ){
          return false;
        }
      }
    }catch(_e){}

    return true;
  }

  function segmentMatches(raw,selected){
    if(!selected)return true;

    return (
      multiValueMatch(raw,selected,'SEGMENT') ||
      multiValueMatch(raw,'UNIVERSAL','SEGMENT')
    );
  }

  function rowsForInternal(
    group,
    subGroup,
    segment,
    vehicle,
    ctx,
    spKey
  ){
    const key=JSON.stringify([
      spKey,
      group,
      subGroup,
      segment,
      vehicle
    ]);

    if(rowCache.has(key)){
      return rowCache.get(key);
    }

    let rows;

    if(vehicle){
      rows=rowsForInternal(
        group,
        subGroup,
        segment,
        '',
        ctx,
        spKey
      ).filter(meta=>
        multiValueMatch(
          meta.vehicle,
          vehicle,
          'VEHICLE'
        )
      );
    }
    else if(segment){
      rows=rowsForInternal(
        group,
        subGroup,
        '',
        '',
        ctx,
        spKey
      ).filter(meta=>
        segmentMatches(
          meta.segment,
          segment
        )
      );
    }
    else if(subGroup){
      rows=rowsForInternal(
        group,
        '',
        '',
        '',
        ctx,
        spKey
      ).filter(meta=>
        meta.sub===subGroup
      );
    }
    else if(group){
      rows=rowsForInternal(
        '',
        '',
        '',
        '',
        ctx,
        spKey
      ).filter(meta=>
        meta.group===group
      );
    }
    else{
      if(ctx.special || ctx.fsn){
        rows=metaRows.filter(meta=>
          passesSpecial(meta,ctx)
        );
      }else{
        rows=metaRows;
      }
    }

    rowCache.set(key,rows);
    return rows;
  }

  function rowsFor(
    group,
    subGroup,
    segment,
    vehicle
  ){
    ensureRows();

    const ctx=specialContext();
    const spKey=specialSignature(ctx);

    return rowsForInternal(
      group,
      subGroup,
      segment,
      vehicle,
      ctx,
      spKey
    );
  }

  function addCandidateSet(target,list){
    if(!list)return;

    for(const index of list){
      target.add(index);
    }
  }

  function canonicalMatchesForRaw(id,rawValue){
    const raw=clean(rawValue);

    if(!raw)return [];

    const cache=rawMatchCache[id];

    if(cache.has(raw)){
      return cache.get(raw);
    }

    const index=masterIndexes[id];

    if(!index || !index.values.length){
      cache.set(raw,[]);
      return [];
    }

    const normalizedRaw=normalizeValue(raw);
    const rawCompact=normalizedRaw.replace(/\s+/g,'');

    const rawTokens=[
      ...new Set(
        normalizedRaw
          .split(/\s+/)
          .filter(Boolean)
      )
    ];

    const candidates=new Set();

    if(id===SEGMENT_ID){
      for(let i=0;i<index.values.length;i++){
        candidates.add(i);
      }
    }else{
      addCandidateSet(
        candidates,
        index.compactMap.get(rawCompact)
      );

      rawTokens.forEach(token=>{
        addCandidateSet(
          candidates,
          index.tokenMap.get(token)
        );

        const prefix=
          token.length>=3
            ? token.slice(0,3)
            : token;

        addCandidateSet(
          candidates,
          index.prefixMap.get(prefix)
        );

        if(token.length){
          for(let delta=-2;delta<=2;delta++){
            const len=token.length+delta;

            if(len<1)continue;

            addCandidateSet(
              candidates,
              index.firstLengthMap.get(
                token[0]+'|'+len
              )
            );
          }
        }
      });
    }

    const rawDigits=
      String(raw)
        .replace(/\D/g,'');

    const found=[];

    for(const candidateIndex of candidates){
      const value=index.values[candidateIndex];
      const compact=index.compactValues[candidateIndex];

      let matched=false;

      /*
       * Handles 12-10 / 1210 type numeric formatting
       * without making normal text matching loose.
       */
      if(
        compact &&
        /^\d{3,}$/.test(compact) &&
        rawDigits &&
        rawDigits.includes(compact)
      ){
        matched=true;
      }

      if(!matched){
        matched=multiValueMatch(
          raw,
          value,
          index.field
        );
      }

      if(matched){
        found.push(value);
      }
    }

    /*
     * VEHICLE master is small (~114 values).
     * If typo/punctuation produced no candidate,
     * one fallback pass keeps V98 matching behaviour.
     */
    if(
      !found.length &&
      id===VEHICLE_ID &&
      index.values.length<=250
    ){
      for(const value of index.values){
        if(
          multiValueMatch(
            raw,
            value,
            'VEHICLE'
          )
        ){
          found.push(value);
        }
      }
    }

    cache.set(raw,found);
    return found;
  }

  function canonicalFacet(id,rows,property){
    const index=masterIndexes[id];

    if(!index || !index.values.length){
      return [];
    }

    const rawSeen=new Set();
    const found=new Set();

    for(const meta of rows){
      const raw=clean(meta[property]);

      if(!raw || rawSeen.has(raw))continue;

      rawSeen.add(raw);

      const matches=
        canonicalMatchesForRaw(id,raw);

      for(const value of matches){
        found.add(value);
      }
    }

    /*
     * Preserve clean Vehicle Master order;
     * never show raw comma/slash Price Book values.
     */
    return index.values.filter(value=>
      found.has(value)
    );
  }

  function cachedFacet(
    cacheKey,
    id,
    rows,
    property
  ){
    if(optionCache.has(cacheKey)){
      return optionCache.get(cacheKey).slice();
    }

    const values=
      canonicalFacet(
        id,
        rows,
        property
      );

    optionCache.set(cacheKey,values);

    return values.slice();
  }

  function v99MasterValues(id){
    ensureRows();
    ensureMasterIndexes();

    /*
     * GROUP / SUB GROUP / CATEGORY continue to come
     * directly from Price Book facets.
     */
    if(
      id==='groupFilter' ||
      id==='subGroupFilter' ||
      id==='categoryFilter'
    ){
      return [];
    }

    const master=masterIndexes[id];

    if(!master || !master.values.length){
      try{
        const fallback=originalMasterValues(id);
        return Array.isArray(fallback)
          ? fallback.slice()
          : [];
      }catch(_e){
        return [];
      }
    }

    const group=elementValue('groupFilter');
    const subGroup=elementValue('subGroupFilter');
    const segment=elementValue('segmentFilter');
    const vehicle=elementValue('vehicleFilter');

    /*
     * No parent selected:
     * return clean complete master instantly.
     * No Price Book scan is needed.
     */
    if(id===SEGMENT_ID){

      if(!group && !subGroup){
        return master.values.slice();
      }

      const key=JSON.stringify([
        'SEGMENT',
        group,
        subGroup
      ]);

      return cachedFacet(
        key,
        SEGMENT_ID,
        rowsFor(
          group,
          subGroup,
          '',
          ''
        ),
        'segment'
      );
    }

    if(id===VEHICLE_ID){

      if(
        !group &&
        !subGroup &&
        !segment
      ){
        return master.values.slice();
      }

      const key=JSON.stringify([
        'VEHICLE',
        group,
        subGroup,
        segment
      ]);

      return cachedFacet(
        key,
        VEHICLE_ID,
        rowsFor(
          group,
          subGroup,
          segment,
          ''
        ),
        'vehicle'
      );
    }

    if(id===MODEL_ID){

      if(
        !group &&
        !subGroup &&
        !segment &&
        !vehicle
      ){
        return master.values.slice();
      }

      const key=JSON.stringify([
        'MODEL',
        group,
        subGroup,
        segment,
        vehicle
      ]);

      return cachedFacet(
        key,
        MODEL_ID,
        rowsFor(
          group,
          subGroup,
          segment,
          vehicle
        ),
        'model'
      );
    }

    try{
      return originalMasterValues(id);
    }catch(_e){
      return [];
    }
  }

  /*
   * Replace only the expensive dynamic master resolver.
   * Existing V98 product filtering/render/PDF/cart remain untouched.
   */
  masterValuesForFilter=v99MasterValues;

  /*
   * Directional cascade:
   * changing an upper filter clears stale lower selections
   * before existing V98/V27 filter handlers execute.
   */
  const FILTER_ORDER=[
    'groupFilter',
    'subGroupFilter',
    'segmentFilter',
    'vehicleFilter',
    'modelFilter',
    'categoryFilter'
  ];

  document.addEventListener(
    'change',
    event=>{
      const index=
        FILTER_ORDER.indexOf(
          event.target?.id
        );

      if(index<0)return;

      for(
        let i=index+1;
        i<FILTER_ORDER.length;
        i++
      ){
        const id=FILTER_ORDER[i];
        const select=document.getElementById(id);

        if(select)select.value='';

        const typed=
          document.querySelector(
            '.filter-search[data-target="'+id+'"]'
          );

        if(typed)typed.value='';
      }
    },
    true
  );

  window.RAJ_V99_CLEAR_FAST_FILTER_CACHE=()=>{
    sourceRef=null;
    sourceLength=-1;

    rowCache.clear();
    optionCache.clear();

    MASTER_IDS.forEach(id=>{
      rawMatchCache[id].clear();
    });
  };

  console.info(
    '[RAJ V99] Fast indexed cascade enabled'
  );

  /*
   * Re-render once after installer takes control.
   */
  setTimeout(()=>{
    try{
      if(typeof applyFilters==='function'){
        applyFilters(false);
      }
    }catch(_e){}
  },0);
}

/*
 * Register both ways:
 * timer can install before DOMContentLoaded after deferred
 * app scripts are ready; DOMContentLoaded is the safe fallback.
 */
if(document.readyState==='loading'){
  document.addEventListener(
    'DOMContentLoaded',
    bind
  );

  document.addEventListener(
    'DOMContentLoaded',
    installV99FastCascade,
    {once:true}
  );
}else{
  bind();
  installV99FastCascade();
}

setTimeout(
  installV99FastCascade,
  0
);

})();