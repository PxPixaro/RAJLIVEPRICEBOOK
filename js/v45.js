/* RAJ LIVE PRICEBOOK V45
   New/Dead/FSN filters, cross-reference-ready search, cart/order, customer login hook,
   offer posters, vehicle API hook, image-search API hook and live ERP API hook. */
(function(){
'use strict';
const CFG=window.RAJ_V45_CONFIG||{};
const V45={special:'',customer:null,cart:[],stateCodes:['AN','AP','AR','AS','BR','CG','CH','DD','DL','DN','GA','GJ','HP','HR','JH','JK','KA','KL','LA','LD','MH','ML','MN','MP','MZ','NL','OD','PB','PY','RJ','SK','TN','TR','TS','UK','UP','WB']};
const q=s=>document.querySelector(s);
const field=(row,...names)=>getField(row,...names);
const aliases={
  new:['NEW PRODUCT LAUNCH','NEW PRODUCT','NEW ARRIVAL','NEW LAUNCH','NEW PRODUCT STATUS'],
  dead:['DEAD STOCK','DEADSTOCK','DEAD STOCK STATUS','DEAD PRODUCT'],
  fsn:['FSN CLASS','FSN','F S N CLASS'],
  companyPart:['COMPANY PART NUMBER','COMPANY PART NO','COMPANY CODE','COMPANY PART CODE'],
  competitor:['COMPETITOR PART NUMBER','COMPETITOR PART NO','COMPITATOR PART NUMBER','COMPITATOR','CROSS REFERENCE NO.','CROSS REFERNCE NO.','CROSS REFERENCE','ALTERNATE PART NUMBER','ALTERNATE PART NO','ALT PART NO']
};
let rowMeta=new WeakMap();
const SPECIAL_INDEX={newRows:new WeakSet(),deadRows:new WeakSet(),fsnByRow:new WeakMap(),fsnClasses:[],newCount:0,deadCount:0,fsnCount:0};
function valByAliases(row,list){for(const n of list){const v=clean(field(row,n));if(v)return v}return ''}
function flag(v,kind){const x=normalizeSearchText(v);if(!x)return false;if(kind==='new')return /^(NEW|YES|Y|1|LAUNCH|NEW ARRIVAL|NEW PRODUCT)$/.test(x)||x.includes('NEW');if(kind==='dead')return /^(DS|DEAD|YES|Y|1|DEAD STOCK)$/.test(x)||x.includes('DEAD');return false}
function rebuildSpecialIndex(){
  SPECIAL_INDEX.newRows=new WeakSet();
  SPECIAL_INDEX.deadRows=new WeakSet();
  SPECIAL_INDEX.fsnByRow=new WeakMap();
  SPECIAL_INDEX.newCount=0;SPECIAL_INDEX.deadCount=0;SPECIAL_INDEX.fsnCount=0;
  const classes=new Set();
  for(const row of allData){
    if(!row||typeof row!=='object')continue;
    const nv=valByAliases(row,aliases.new),dv=valByAliases(row,aliases.dead),fv=clean(valByAliases(row,aliases.fsn));
    if(flag(nv,'new')){SPECIAL_INDEX.newRows.add(row);SPECIAL_INDEX.newCount++}
    if(flag(dv,'dead')){SPECIAL_INDEX.deadRows.add(row);SPECIAL_INDEX.deadCount++}
    if(fv){SPECIAL_INDEX.fsnByRow.set(row,fv);SPECIAL_INDEX.fsnCount++;classes.add(normalizeFsnClass(fv)||fv)}
  }
  SPECIAL_INDEX.fsnClasses=[...classes].sort(natural);
  rowMeta=new WeakMap();
  updateSpecialCounts();
}
function meta(row){
  if(!row||typeof row!=='object')return {newFlag:false,deadFlag:false,fsn:''};
  let m=rowMeta.get(row);if(m)return m;
  m={newFlag:SPECIAL_INDEX.newRows.has(row),deadFlag:SPECIAL_INDEX.deadRows.has(row),fsn:SPECIAL_INDEX.fsnByRow.get(row)||''};
  rowMeta.set(row,m);return m
}
function isNew(row){return SPECIAL_INDEX.newRows.has(row)}
function isDead(row){return SPECIAL_INDEX.deadRows.has(row)}
function fsnValue(row){return SPECIAL_INDEX.fsnByRow.get(row)||''}
function normalizeFsnClass(v){
  const x=normalizeSearchText(v);
  if(!x)return '';
  if(/^(F|FAST|FAST MOVING|FAST-MOVING)/.test(x))return 'F';
  if(/^(S|SLOW|SLOW MOVING|SLOW-MOVING)/.test(x))return 'S';
  if(/^(N|NON MOVING|NON-MOVING|NONMOVING)/.test(x))return 'N';
  if(/^(P)(\b|\s|-)/.test(x))return 'P';
  return x;
}
function updateSpecialCounts(){
  const nb=q('#newLaunchBtn'),db=q('#deadStockBtn');
  if(nb){
    nb.dataset.count=String(SPECIAL_INDEX.newCount);
    nb.title='Excel NEW PRODUCT LAUNCH: '+SPECIAL_INDEX.newCount+' products';
    const b=nb.querySelector('b');if(b)b.textContent='New Product Launch'+(SPECIAL_INDEX.newCount?' ('+SPECIAL_INDEX.newCount+')':'');
  }
  if(db){
    db.dataset.count=String(SPECIAL_INDEX.deadCount);
    db.title='Excel DEAD STOCK: '+SPECIAL_INDEX.deadCount+' products';
    const b=db.querySelector('b');if(b)b.textContent='Dead Stock'+(SPECIAL_INDEX.deadCount?' ('+SPECIAL_INDEX.deadCount+')':'');
  }
}
function partCode(row){return clean(field(row,'CODE','PART NUMBER','PART NO'))}
function desc(row){return clean(field(row,'PRODUCT NAME','DESCRIPTION'))}
function gst(row){return clean(field(row,'GST'))}
function unitValue(row){return clean(field(row,'UNIT','UOM','UNIT OF MEASURE'))||'PCS'}
function group(row){return clean(field(row,'GROUP'))}
function notify(msg){if(typeof toast==='function')toast(msg);else alert(msg)}
function uniqueSorted(values){return [...new Set(values.map(clean).filter(Boolean))].sort(natural)}
function setOptions(el,values,label){if(!el)return;const cur=el.value;el.innerHTML='<option value="">'+escapeHtml(label)+'</option>'+values.map(v=>'<option value="'+escapeHtml(v)+'">'+escapeHtml(v)+'</option>').join('');if(values.includes(cur))el.value=cur}
function rowsForSpecial(){let rows=allData;if(V45.special==='new')rows=rows.filter(isNew);else if(V45.special==='dead')rows=rows.filter(isDead);return rows}
function refreshSpecialFacets(preserveGroup=true){
  const gf=q('#groupFilter'); let old=preserveGroup&&gf?gf.value:''; const base=rowsForSpecial();
  if(!old&&gf){const a=[...gf.options].find(o=>normalizeSearchText(o.value)==='AAYUB');if(a)old=a.value}
  const fsn=q('#fsnFilter'), fs=fsn?fsn.value:''; const fsRows=fs?base.filter(r=>normalizeFsnClass(fsnValue(r))===normalizeFsnClass(fs)):base;
  setOptions(gf,uniqueSorted(fsRows.map(group)),'All groups');
  if(old&&[...gf.options].some(o=>o.value===old))gf.value=old;
  else if(gf){const a=[...gf.options].find(o=>normalizeSearchText(o.value)==='AAYUB');if(a)gf.value=a.value}
  const liveFsn=(base===allData&&SPECIAL_INDEX.fsnClasses.length)?SPECIAL_INDEX.fsnClasses:uniqueSorted(base.map(fsnValue));
  const fsnValues=uniqueSorted(['F','S','N','P',...liveFsn]);
  setOptions(fsn,fsnValues,'All FSN Classes'); if(fs&&[...fsn.options].some(o=>o.value===fs))fsn.value=fs;
}
function specialCascade(){
  let r=rowsForSpecial();
  const fs=q('#fsnFilter')?.value||''; if(fs)r=r.filter(row=>normalizeFsnClass(fsnValue(row))===normalizeFsnClass(fs));
  const defs=[
    ['groupFilter','All groups',row=>group(row),(row,v)=>group(row)===v],
    ['subGroupFilter','All sub groups',row=>subGroupValue(row),(row,v)=>subGroupValue(row)===v],
    ['segmentFilter','All segments',row=>clean(field(row,'SEGMENT')),(row,v)=>multiValueMatch(field(row,'SEGMENT'),v,'SEGMENT')||multiValueMatch(field(row,'SEGMENT'),'UNIVERSAL','SEGMENT')],
    ['vehicleFilter','All vehicles',row=>clean(field(row,'VEHICLE')),(row,v)=>multiValueMatch(field(row,'VEHICLE'),v,'VEHICLE')],
    ['modelFilter','All models',row=>clean(field(row,'MODEL')),(row,v)=>multiValueMatch(field(row,'MODEL'),v,'MODEL')],
    ['categoryFilter','All categories',row=>clean(field(row,'CATAGORIES','CATEGORIES','CATEGORY')),(row,v)=>clean(field(row,'CATAGORIES','CATEGORIES','CATEGORY'))===v]
  ];
  for(const [id,label,getter,matcher] of defs){const el=q('#'+id),cur=el?.value||'';const values=id==='segmentFilter'?uniqueSorted(r.flatMap(row=>segmentTokens(getter(row)))):uniqueSorted(r.map(getter));setOptions(el,values,label);if(cur&&values.includes(cur))el.value=cur;const active=el?.value||'';if(active)r=r.filter(row=>matcher(row,active));}
}
window.RAJ_V45_SPECIAL_CONTEXT=function(){
  return {
    special:V45.special||'',
    fsn:q('#fsnFilter')?.value||'',
    isNew:isNew,
    isDead:isDead,
    fsnValue:fsnValue,
    normalizeFsnClass:normalizeFsnClass
  };
};
function updateSpecialNote(){const n=q('#specialFilterNote');if(!n)return;let text='';if(V45.special==='new')text='NEW PRODUCT LAUNCH active — only rows marked New in your Excel are shown. Brand list is limited to brands having New products.';if(V45.special==='dead')text='DEAD STOCK active — only rows marked Dead in your Excel are shown. Brand list is limited to brands having Dead Stock.';const fs=q('#fsnFilter')?.value;if(fs)text+=(text?' ':'')+'FSN Class: '+fs+'.';n.hidden=!text;n.textContent=text;q('#newLaunchBtn')?.classList.toggle('active',V45.special==='new');q('#deadStockBtn')?.classList.toggle('active',V45.special==='dead')}

// V45 filtering: one indexed pass across FAST_ROWS; future Excel columns remain searchable.
applyFilters=function(resetPage=true,doCascade=false){
  if(FAST_ROWS.length!==allData.length || (FAST_ROWS.length && FAST_ROWS[0]?.row!==allData[0]))buildFastRows();
  if(doCascade){if(V45.special)specialCascade();else cascade();}
  const searchEl=q('#searchInput'); const raw=searchEl?searchEl.value:''; const sq=normalizeSearchText(raw);
  const groupText=normalizeSearchText(filterSearchTerm('groupFilter')),subGroupText=normalizeSearchText(filterSearchTerm('subGroupFilter'));
  const segmentText=filterSearchTerm('segmentFilter'),vehicleText=filterSearchTerm('vehicleFilter'),modelText=filterSearchTerm('modelFilter'),categoryText=normalizeSearchText(filterSearchTerm('categoryFilter'));
  const gv=q('#groupFilter')?.value||'',sv=q('#subGroupFilter')?.value||'',segv=q('#segmentFilter')?.value||'',vv=q('#vehicleFilter')?.value||'',mv=q('#modelFilter')?.value||'',cv=q('#categoryFilter')?.value||'',fsn=q('#fsnFilter')?.value||'';
  const out=[];
  for(let i=0;i<FAST_ROWS.length;i++){
    const x=FAST_ROWS[i],r=x.row;
    if(V45.special==='new'&&!isNew(r))continue;if(V45.special==='dead'&&!isDead(r))continue;
    if(fsn&&normalizeFsnClass(fsnValue(r))!==normalizeFsnClass(fsn))continue;
    if(gv&&x.group!==gv)continue;if(sv&&x.sub!==sv)continue;
    if(segv&&!(multiValueMatch(x.segment,segv,'SEGMENT')||multiValueMatch(x.segment,'UNIVERSAL','SEGMENT')))continue;
    if(vv&&!multiValueMatch(x.vehicle,vv,'VEHICLE'))continue;if(mv&&!multiValueMatch(x.model,mv,'MODEL'))continue;if(cv&&x.category!==cv)continue;
    if(groupText&&!x.groupN.includes(groupText))continue;if(subGroupText&&!x.subN.includes(subGroupText))continue;
    if(segmentText&&!multiValueMatch(x.segment,segmentText,'SEGMENT'))continue;if(vehicleText&&!multiValueMatch(x.vehicle,vehicleText,'VEHICLE'))continue;if(modelText&&!multiValueMatch(x.model,modelText,'MODEL'))continue;if(categoryText&&!x.categoryN.includes(categoryText))continue;
    if(sq&&!smartUniversalRowMatch(x,raw))continue;
    out.push(r);
  }
  filtered=out;sortedFilteredSource=null;
  const columnRows=(filtered.length>2500&&!gv)?filtered.slice(0,1200):filtered;
  visibleColumns=visibleColumnsForRows(columnRows);document.body.classList.toggle('table-compact',visibleColumns.length>12);if(resetPage)page=1;render();updateSpecialNote();
};

// Product row retains existing table shape; cart controls live under Image so print hierarchy stays stable.
gridProductRow=function(row,serial){
  const idx=rowSourceIndex(row); const qtyId='v45qty-'+idx;
  return '<tr><td class="index-col">'+serial+'</td>'+visibleColumns.map(column=>{const value=field(row,column),key=keyOf(column),part=key==='CODE',price=key==='RATE'||key==='MRP',left=part||key==='PRODUCT NAME',cls=[part?'part-code':'',price?'price-value':'',left?'cell-left':'cell-right'].filter(Boolean).join(' ');return '<td class="'+cls+'" data-col="'+escAttr(key)+'">'+escapeHtml(value)+'</td>'}).join('')+
  '<td class="image-col"><div class="v46-image-order-line"><div class="v45-product-actions"><button class="v45-qbtn" data-act="minus" data-row-index="'+idx+'" type="button">−</button><input id="'+qtyId+'" class="v45-qty" type="number" min="1" step="1" value="1" inputmode="numeric"><button class="v45-qbtn" data-act="plus" data-row-index="'+idx+'" type="button">+</button><button class="v45-add" data-row-index="'+idx+'" type="button">ADD</button></div><button class="view-image-btn" type="button" data-row-index="'+idx+'" title="View product image">Image</button></div></td></tr>';
};

function loadCart(){try{V45.cart=JSON.parse(localStorage.getItem('rajCartV45')||'[]');if(!Array.isArray(V45.cart))V45.cart=[]}catch(e){V45.cart=[]}updateCartBadge()}
function saveCart(){localStorage.setItem('rajCartV45',JSON.stringify(V45.cart));updateCartBadge()}
function updateCartBadge(){const count=V45.cart.length,el=q('#cartCount');if(el)el.textContent=String(count)}
function addToCart(row,qty){qty=Math.max(1,Math.floor(Number(qty)||1));const code=partCode(row),key=group(row)+'|'+code;let item=V45.cart.find(x=>x.key===key);if(item)item.qty+=qty;else V45.cart.push({key,group:group(row),code,description:desc(row),gst:gst(row),unit:unitValue(row),qty,remark:''});saveCart();notify(code+' × '+qty+' added to cart')}
function drawer(html){q('#v45DrawerContent').innerHTML=html;q('#v45Drawer').classList.add('open');q('#v45Drawer').setAttribute('aria-hidden','false')}
function closeDrawer(){q('#v45Drawer').classList.remove('open');q('#v45Drawer').setAttribute('aria-hidden','true')}
function escAttr(v){return escapeHtml(v).replace(/`/g,'&#96;')}
function customerText(){return V45.customer?V45.customer.name+' · '+V45.customer.mobile:'Customer'}
function openCart(){
  const rows=V45.cart.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+escapeHtml(x.group)+'</b><br>'+escapeHtml(x.code)+'</td><td>'+escapeHtml(x.description)+'</td><td><div class="v45-product-actions"><button class="v45-qbtn" data-cart-act="minus" data-key="'+escAttr(x.key)+'">−</button><input class="v45-cart-qty" data-key="'+escAttr(x.key)+'" type="number" min="1" value="'+x.qty+'"><button class="v45-qbtn" data-cart-act="plus" data-key="'+escAttr(x.key)+'">+</button></div></td><td><input class="v45-cart-remark" data-key="'+escAttr(x.key)+'" value="'+escAttr(x.remark||'')+'" placeholder="Item remark"></td><td><button class="v45-danger" data-cart-act="delete" data-key="'+escAttr(x.key)+'">Delete</button></td></tr>').join('');
  const total=V45.cart.reduce((s,x)=>s+(Number(x.qty)||0),0);
  drawer('<section class="v45-panel"><h2>Order Cart</h2><p class="v45-sub">Customer: <b>'+escapeHtml(customerText())+'</b>. Price totals intentionally not shown; only quantity summary is calculated.</p>'+(V45.cart.length?'<div style="overflow:auto"><table class="v45-cart-table"><thead><tr><th>#</th><th>Brand / Part No.</th><th>Description</th><th>Qty</th><th>Item Remark</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="v45-cart-summary"><span>Products: '+V45.cart.length+'</span><span>Total Quantity: '+total+'</span></div><label class="v45-field"><span>Main Note / Remark</span><textarea id="v45OrderNote" placeholder="Special instruction for complete order"></textarea></label><div class="v45-actions v53-order-actions"><button id="v53ExcelOrderBtn" class="v45-primary v53-excel-order-btn">📤 Share Excel Order</button><button id="v45ClearCart" class="v45-danger">Clear Cart</button></div><p class="v53-order-hint">Mobile par Share dabate hi phone ka Share Sheet khulega. WhatsApp select karke Excel order RAJ Agencies ko share karein. Share successful hone par cart automatically clear ho jayega. Desktop/unsupported browser me Excel download hoga.</p>':'<div class="v45-empty">Your cart is empty. Add products using the + / quantity controls in the price book.</div>')+'</section>');
  bindCartDrawer();
}
function bindCartDrawer(){
  q('#v45DrawerContent').onclick=e=>{const b=e.target.closest('[data-cart-act]');if(!b)return;const it=V45.cart.find(x=>x.key===b.dataset.key);if(!it)return;if(b.dataset.cartAct==='delete')V45.cart=V45.cart.filter(x=>x.key!==it.key);if(b.dataset.cartAct==='plus')it.qty++;if(b.dataset.cartAct==='minus')it.qty=Math.max(1,it.qty-1);saveCart();openCart()};
  q('#v45DrawerContent').onchange=e=>{if(e.target.matches('.v45-cart-qty')){const it=V45.cart.find(x=>x.key===e.target.dataset.key);if(it){it.qty=Math.max(1,Math.floor(Number(e.target.value)||1));saveCart()}}if(e.target.matches('.v45-cart-remark')){const it=V45.cart.find(x=>x.key===e.target.dataset.key);if(it){it.remark=e.target.value;saveCart()}}};
  q('#v45ClearCart')?.addEventListener('click',()=>{if(confirm('Clear complete cart?')){V45.cart=[];saveCart();openCart()}});
  q('#v53ExcelOrderBtn')?.addEventListener('click',shareOrDownloadExcelOrder);
}


function xlsxXmlEscape(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function xlsxColName(n){let s='';for(n++;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+((n-1)%26))+s;return s}
function xlsxCrc32(bytes){
  if(!xlsxCrc32.table){
    const t=new Uint32Array(256);
    for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0}
    xlsxCrc32.table=t;
  }
  let c=0xFFFFFFFF,t=xlsxCrc32.table;
  for(let i=0;i<bytes.length;i++)c=t[(c^bytes[i])&255]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function xlsxU16(n){return new Uint8Array([n&255,(n>>>8)&255])}
function xlsxU32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function xlsxConcat(parts){
  const len=parts.reduce((n,p)=>n+p.length,0), out=new Uint8Array(len);let pos=0;
  parts.forEach(p=>{out.set(p,pos);pos+=p.length});return out
}
function xlsxDosDateTime(d){
  d=d||new Date();
  const time=((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31);
  const date=(((Math.max(1980,d.getFullYear())-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31);
  return {date,time}
}
function xlsxZipStore(entries){
  const enc=new TextEncoder(), locals=[], centrals=[];let offset=0;
  const dt=xlsxDosDateTime(new Date());
  entries.forEach(e=>{
    const name=enc.encode(e.name), data=typeof e.data==='string'?enc.encode(e.data):e.data, crc=xlsxCrc32(data);
    const local=xlsxConcat([
      xlsxU32(0x04034b50),xlsxU16(20),xlsxU16(0),xlsxU16(0),xlsxU16(dt.time),xlsxU16(dt.date),
      xlsxU32(crc),xlsxU32(data.length),xlsxU32(data.length),xlsxU16(name.length),xlsxU16(0),name,data
    ]);
    const central=xlsxConcat([
      xlsxU32(0x02014b50),xlsxU16(20),xlsxU16(20),xlsxU16(0),xlsxU16(0),xlsxU16(dt.time),xlsxU16(dt.date),
      xlsxU32(crc),xlsxU32(data.length),xlsxU32(data.length),xlsxU16(name.length),xlsxU16(0),xlsxU16(0),
      xlsxU16(0),xlsxU16(0),xlsxU32(0),xlsxU32(offset),name
    ]);
    locals.push(local);centrals.push(central);offset+=local.length;
  });
  const centralBlock=xlsxConcat(centrals);
  const eocd=xlsxConcat([
    xlsxU32(0x06054b50),xlsxU16(0),xlsxU16(0),xlsxU16(entries.length),xlsxU16(entries.length),
    xlsxU32(centralBlock.length),xlsxU32(offset),xlsxU16(0)
  ]);
  return xlsxConcat([...locals,centralBlock,eocd]);
}
function excelSafe(v){return String(v==null?'':v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim()}
function orderExcelName(){
  const c=V45.customer||{}, party=(clean(c.name)||'Customer').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'');
  return 'RAJ-Order-'+party+'-'+new Date().toISOString().slice(0,10)+'.xlsx';
}
function xlsxCell(ref,value,style){
  const st=style!=null?' s="'+style+'"':'';
  if(typeof value==='number'&&Number.isFinite(value))return '<c r="'+ref+'"'+st+'><v>'+value+'</v></c>';
  return '<c r="'+ref+'" t="inlineStr"'+st+'><is><t xml:space="preserve">'+xlsxXmlEscape(value)+'</t></is></c>';
}
async function makeOrderExcelBlob(){
  const c=V45.customer||{name:'CUSTOMER',mobile:'-',city:'-'};
  const city=clean(c.city||c.CITY||c.location)||'-', now=new Date(), total=V45.cart.reduce((sum,x)=>sum+Number(x.qty||0),0), lineCount=V45.cart.length;
  const orderNo='RAJ-'+String(now.getFullYear()).slice(-2)+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'-'+String(now.getHours()).padStart(2,'0')+String(now.getMinutes()).padStart(2,'0');
  const itemStart=9, itemEnd=itemStart+Math.max(0,lineCount-1), summaryRow=itemEnd+2, remarkRow=summaryRow+2;
  const rows=[];
  const row=(n,vals)=>{rows[n]=vals;};
  row(1,['','', 'RAJ AGENCIES - CUSTOMER ORDER','','','','ORDER NO.\n'+orderNo]);
  row(2,['','', '','','','','DATE\n'+now.toLocaleDateString('en-IN')]);
  row(3,['','', 'Live Price Book Order Punch','','','','']);
  row(4,['','','','','','','']);
  row(5,['Customer Name',excelSafe(c.name||'CUSTOMER'),'','','Mobile',excelSafe(c.mobile||'-'),'']);
  row(6,['Order Source','RAJ Live Price Book','','','Customer Note',excelSafe(orderNote()||'-'),'']);
  row(7,['','','','','','','']);
  row(8,['Sr.','Code','Product Description','GST','Qty','Unit','Item Remark']);
  V45.cart.forEach((x,i)=>row(itemStart+i,[i+1,excelSafe(x.code),excelSafe(x.description),excelSafe(x.gst||''),Number(x.qty)||0,excelSafe(x.unit||'PCS'),excelSafe(x.remark||'')]));
  row(summaryRow,['','','','Total Qty',total,'','']);
  row(summaryRow+1,['','','','','','','']);
  row(remarkRow,['Main Remark',excelSafe(orderNote()||'-'),'','','','','']);

  const maxRow=remarkRow;
  const makeRowXml=(rn,vals)=>{
    vals=vals||['','','','','','',''];
    const cells=vals.map((v,ci)=>{
      let style=0;
      if((rn===1||rn===2)&&ci===6)style=7;
      else if(rn===1&&ci===2)style=1;
      else if(rn===3&&ci===2)style=2;
      else if(rn===8)style=3;
      else if(rn>=itemStart&&rn<=itemEnd)style=(ci===2?9:(ci===0||ci===3||ci===4||ci===5?10:8));
      else if((rn===5||rn===6)&&(ci===0||ci===4))style=5;
      else if((rn===5||rn===6)&&(ci===1||ci===5))style=8;
      else if(rn===summaryRow)style=4;
      else if(rn===remarkRow&&ci===0)style=5;
      else if(rn===remarkRow&&ci===1)style=11;
      else if(rn<=6)style=6;
      return xlsxCell(xlsxColName(ci)+rn,v,style);
    }).join('');
    let ht='';
    if(rn<=3)ht=' ht="28" customHeight="1"';
    else if(rn===5)ht=' ht="22" customHeight="1"';
    else if(rn===6)ht=' ht="30" customHeight="1"';
    else if(rn===8)ht=' ht="22" customHeight="1"';
    else if(rn>=itemStart&&rn<=itemEnd){const d=String((vals&&vals[2])||'');ht=d.length>55?' ht="32.25" customHeight="1"':' ht="21" customHeight="1"';}
    else if(rn===remarkRow)ht=' ht="28" customHeight="1"';
    return '<row r="'+rn+'"'+ht+'>'+cells+'</row>';
  };
  const rowXml=Array.from({length:maxRow},(_,i)=>makeRowXml(i+1,rows[i+1])).join('');

  const merges=[
    'A1:B3','C1:F2','C3:G3','A4:G4','B5:D5','F5:G5','B6:D6','F6:G6',
    'B'+remarkRow+':G'+remarkRow
  ];
  const mergeXml=merges.map(r=>'<mergeCell ref="'+r+'"/>').join('');

  const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    +'<sheetPr><pageSetUpPr fitToPage="1" autoPageBreaks="0"/></sheetPr>'
    +'<dimension ref="A1:G'+maxRow+'"/>'
    +'<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="8" topLeftCell="A9" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    +'<sheetFormatPr defaultRowHeight="18"/>'
    +'<cols><col min="1" max="1" width="15" customWidth="1"/><col min="2" max="2" width="17" customWidth="1"/><col min="3" max="3" width="48" customWidth="1"/><col min="4" max="4" width="10" customWidth="1"/><col min="5" max="5" width="15" customWidth="1"/><col min="6" max="6" width="12" customWidth="1"/><col min="7" max="7" width="26" customWidth="1"/></cols>'
    +'<sheetData>'+rowXml+'</sheetData>'
    +'<mergeCells count="'+merges.length+'">'+mergeXml+'</mergeCells>'
    +'<printOptions horizontalCentered="1" verticalCentered="0" gridLines="0" headings="0"/>'
    +'<pageMargins left="0.25" right="0.25" top="0.3" bottom="0.3" header="0.15" footer="0.15"/>'
    +'<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1" horizontalDpi="300" verticalDpi="300"/>'
    +'<drawing r:id="rId1"/>'
    +'</worksheet>';


  const bduLastRow=Math.max(1,lineCount+1);
  const bduRows=['<row r="1" ht="22" customHeight="1">'+xlsxCell('A1','Code',3)+xlsxCell('B1','Qty',3)+'</row>']
    .concat(V45.cart.map((x,i)=>'<row r="'+(i+2)+'" ht="20" customHeight="1">'+xlsxCell('A'+(i+2),excelSafe(x.code),8)+xlsxCell('B'+(i+2),Number(x.qty)||0,10)+'</row>'))
    .join('');
  const bduSheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    +'<dimension ref="A1:B'+bduLastRow+'"/>'
    +'<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    +'<sheetFormatPr defaultRowHeight="18"/>'
    +'<cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="12" customWidth="1"/></cols>'
    +'<sheetData>'+bduRows+'</sheetData>'
    +(lineCount?'<autoFilter ref="A1:B'+bduLastRow+'"/>':'')
    +'<printOptions horizontalCentered="1" verticalCentered="0" gridLines="0" headings="0"/>'
    +'<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>'
    +'<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>'
    +'</worksheet>';

  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    +'<fonts count="5">'
    +'<font><sz val="10"/><name val="Arial"/></font>'
    +'<font><b/><sz val="16"/><color rgb="FF0B4F94"/><name val="Arial"/></font>'
    +'<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>'
    +'<font><b/><sz val="9"/><name val="Arial"/></font>'
    +'<font><b/><sz val="9"/><color rgb="FF17395E"/><name val="Arial"/></font>'
    +'</fonts>'
    +'<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B5FAE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF5FC"/><bgColor indexed="64"/></patternFill></fill></fills>'
    +'<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBDD2E8"/></left><right style="thin"><color rgb="FFBDD2E8"/></right><top style="thin"><color rgb="FFBDD2E8"/></top><bottom style="thin"><color rgb="FFBDD2E8"/></bottom><diagonal/></border><border><left style="medium"><color rgb="FF9EBBDC"/></left><right style="medium"><color rgb="FF9EBBDC"/></right><top style="medium"><color rgb="FF9EBBDC"/></top><bottom style="medium"><color rgb="FF9EBBDC"/></bottom><diagonal/></border></borders>'
    +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    +'<cellXfs count="12">'
    +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="center"/></xf>'
    +'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
    +'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
    +'<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
    +'<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
    +'<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>'
    +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>'
    +'<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>'
    +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>'
    +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>'
    +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
    +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
    +'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    +'</styleSheet>';

  const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    +'<sheets><sheet name="Customer Order" sheetId="1" r:id="rId1"/><sheet name="BDU" sheetId="2" r:id="rId2"/></sheets></workbook>';

  const drawing='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    +'<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>65000</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>45000</xdr:rowOff></xdr:from><xdr:to><xdr:col>2</xdr:col><xdr:colOff>-65000</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>-45000</xdr:rowOff></xdr:to>'
    +'<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="RAJ GROUP Logo"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm/><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>'
    +'</xdr:wsDr>';

  const logoB64='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OvzTWy2dyXieWywUTwYNYcjuvPPOfF4PSIL+gf7de3a3TZo0c9YsrYHaiY3H4t+55576+rofPvCDX/3qV5xzPdRu/759Rdft7w9Hu2Qy2fKeu/rqq+/45reEEF+48cannnoKERctXPSpT31q69Zt/3LPPQCgIW+PL3n8kUd+fdlll91www1KKa3GCxcuciJOsVD48Ec+rN/xp58+/5RTTtm7d985555TUVFxsuBHX3Umk84XCpl0Wu9XrQC33npr26RJP/23ny5btsw0Tcuyiq779W98vei63//e9+tq64jonu/cc8ops5c88cRdd93peZ62MAcPdvl+0NfXp7UlCAIhZG9v39DQkE5y7tmz5zOf+dTQ4CCUYC+FQp6IBtND+m1VfvEVCnmllOu5mpTeMAzDMHw/IKLA9xHRMAxEKBSKge/v2bNbCOn7fjqd/unPfvrDBx6IRaOkVCaT8T3f8z0A+MEPHpg3d+7rr7123bXX9vX1GYbxvq4W8m9+85vvERuIiF1dXffee++BA52pVOrNN99c+vzzTz355O8WL37jjTe+eNNNLS0t3/3uv+zZu7cqlVq/ds3LL7/83DPPLHn88eeeffZzn//89BkziGjLli0PPvjDjm1bq6qqurt7lJSTp0w5xl3RtuKX//Eff/rTn/bu3bt8xfJ//dd/nTp12r/9209GjxpdLtZrPRzfMv7iixcU8rlf/epXLyxdunnzpl8/8si2jo4LL7zwYx/7WG1t7ZNPPvnEkiWRaMR1i4g4ceKkCy64oL+/70Bn52uvvprJZKZPn3b5FVc2NDY8+eSTS59fun/fvsW//e3ixYtvuOEz999/fywWIyLd81FXV7d8+fLm5tFf+co/M8akUqZp5gr5DRs23HnnnQ0NDSeEzjDGdu/a9YMHftDRsS2VSnUfOlQoFCZNanMcRylVX1+/cNGi3t6eXzz0UMf27WvXrn3ggQdEIH7yk58sWLBAewq1tbWXXnYZQ3j8sceefvqpDevXP/3075e/8sqUqVP/5mMfa21tff3113/xi59blqWUeunFF5977tk//P73//7ww+mhoX/+6i2JRCKXyz7yyCN/fmFpJOrksrlsJj127LiKigrf93/5n798ZdmyykRicHDQtMyp06YCwG9+85sXXlgaj8UHBwdi0VhjU9MDDzywvWNbTW3Nls2blr+y7I9//OOSxx977NFHr7rqqjlz537nnnv27t2bqEz09fY2NjZOnjxl9pzZ7RvbOzv3v/nmqtHNzc3NY/57kT3/Q2FriFgoFHK5nA7wgiDwfZ8xZpqmYRiRSCQIgr6+vsrKSu1r+b4PQLyEqOacI2Imk8nn8xUVFbpE7nleQ0PD8c8GEXO53NatW7q6uiKRSFvb5HHjxsGJYJDlkGNgYGDT5k35XK62tq61tTWZTGod6OvrM03TtKzA93K5fH19vcYfFwp5KVU6na6pqdENh0EQrFu3tqenp7a2duaMWdFY9Jgz6vUzxoaHuEKITCaTSqXe4tbl8/lMJlNZmUBkrusWCgW9jOHr7+7u3rJlSxAEEyZMaG1tHQ6sK38nk8l0dGzr6+uPRqMTJ05samrS1zg0NKgUad/b8zwpBCAahmHbtuM42k729fXFYjHTNIUQ2Wy2urratm2pVF9vbzQSMUxTO6L1dfUE1NfXp6e1eJ7r+0EymRwaGorH4wAgpfA8HwGQMZ2LJqKBgYF4PA4I2WzONIxUKsUY09WUfC6HjNXU1Lx/jeF7HTv6jjCER8dFJ/z8bc+l44oTRlz6Fh1jTrVneEIY8fGgUF1qO6Y35xj05vBVHY+YfesddjLc+cnWr2O24SvUKZnjG/lPhpt929t+skf2X8WOnuykx6///euO4nuNLPWtdeadaNRb5g+PfZDltME7QUKH+YOjde9kpzseY32yI7ztHn0njtbbXnX5Yt+i/+AdXuNbX+87+fz4D0/6ZAEB3/4g7+s6Ib4fGYtHZET+/yRs5BaMyIiMKOGIjMiIEo7IiIzIiBKOyIiMKOGIjMiIjCjhiIzIiBKOyIiMyIgSjsiIjCjhiIzIiIwo4YiMyIgSjsiIjMiIEo7IiIwo4YiMyIiMKOGIjMiIEo7IiIzIiBKOyIiMKOGIjMiIjCjhiIzIiBKOyIiMyP87+f8AR9MAL2zQjxAAAAAASUVORK5CYII=';
  const logoBytes=Uint8Array.from(atob(logoB64),ch=>ch.charCodeAt(0));
  const entries=[
    {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'},
    {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'},
    {name:'xl/workbook.xml',data:workbook},
    {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name:'xl/worksheets/sheet1.xml',data:sheet},
    {name:'xl/worksheets/sheet2.xml',data:bduSheet},
    {name:'xl/worksheets/_rels/sheet1.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>'},
    {name:'xl/drawings/drawing1.xml',data:drawing},
    {name:'xl/drawings/_rels/drawing1.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>'},
    {name:'xl/media/image1.png',data:logoBytes},
    {name:'xl/styles.xml',data:styles},
    {name:'docProps/core.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>RAJ Agencies Customer Order</dc:title><dc:creator>RAJ Agencies</dc:creator><cp:lastModifiedBy>RAJ Live Price Book</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">'+now.toISOString()+'</dcterms:created></cp:coreProperties>'},
    {name:'docProps/app.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>RAJ Live Price Book</Application></Properties>'}
  ];
  const bytes=xlsxZipStore(entries);
  return new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function makeLegacyExcelBlob(){
  const c=V45.customer||{name:'CUSTOMER',mobile:'-',city:'-'};
  const city=clean(c.city||c.CITY||c.location)||'-', now=new Date(), total=V45.cart.reduce((sum,x)=>sum+Number(x.qty||0),0);
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const items=V45.cart.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.code)+'</td><td>'+esc(x.group)+'</td><td>'+esc(x.description)+'</td><td>'+Number(x.qty||0)+'</td><td>'+esc(x.unit||'PCS')+'</td><td>'+esc(x.remark||'')+'</td></tr>').join('');
  const html='<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #b9cde2;padding:6px}th{background:#0b5fae;color:white}.title{font-size:20px;font-weight:bold;color:#0b4f94;text-align:center}.meta{background:#eef5fc;font-weight:bold}.total{background:#fff2cc;font-weight:bold}</style></head><body>'
    +'<table><tr><td class="title" colspan="7">RAJ AGENCIES - CUSTOMER ORDER</td></tr>'
    +'<tr><td colspan="7" style="text-align:center">Live Price Book Order</td></tr>'
    +'<tr><td class="meta">Party Name</td><td>'+esc(c.name||'CUSTOMER')+'</td><td class="meta">Mobile No.</td><td>'+esc(c.mobile||'-')+'</td><td class="meta">City</td><td colspan="2">'+esc(city)+'</td></tr>'
    +'<tr><td class="meta">Order Date</td><td>'+esc(now.toLocaleDateString('en-IN'))+'</td><td class="meta">Order Time</td><td>'+esc(now.toLocaleTimeString('en-IN'))+'</td><td class="meta">Total Quantity</td><td colspan="2">'+total+'</td></tr>'
    +'<tr><th>Sr.</th><th>Part No.</th><th>Brand / Group</th><th>Product Description</th><th>Qty</th><th>Unit</th><th>Item Remark</th></tr>'
    +items
    +'<tr class="total"><td colspan="4" style="text-align:right">TOTAL QUANTITY</td><td>'+total+'</td><td colspan="2"></td></tr>'
    +'<tr><td class="meta">Main Remark</td><td colspan="6">'+esc(orderNote()||'-')+'</td></tr>'
    +'</table></body></html>';
  return new Blob(['\ufeff',html],{type:'application/vnd.ms-excel;charset=utf-8'});
}
function downloadOrderBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
const RAJ_ORDER_WHATSAPP='917046533330';
function openRajWhatsAppAfterDownload(){
  try{
    const msg=encodeURIComponent('RAJ Agencies Customer Order Excel ready hai. Kripya downloaded Excel file is chat me attach karke send karein.');
    const a=document.createElement('a');
    a.href='https://wa.me/'+RAJ_ORDER_WHATSAPP+'?text='+msg;
    a.target='_blank';a.rel='noopener';
    document.body.appendChild(a);a.click();a.remove();
  }catch(e){console.warn('WhatsApp fallback open failed:',e)}
}
async function shareOrDownloadExcelOrder(){
  if(!V45.cart.length)return;
  const btn=q('#v53ExcelOrderBtn');
  if(btn){btn.disabled=true;btn.textContent='Preparing Excel Order...'}
  let blob=null,name=orderExcelName(),mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',usedFallback=false;
  try{
    try{
      blob=await makeOrderExcelBlob();
      if(!blob||!blob.size)throw new Error('Empty XLSX output');
    }catch(xlsxErr){
      console.warn('V75 XLSX generator fallback:',xlsxErr);
      blob=makeLegacyExcelBlob();
      name=name.replace(/\.xlsx$/i,'.xls');
      mime='application/vnd.ms-excel';
      usedFallback=true;
    }
    if(!blob||!blob.size)throw new Error('Excel file is empty');

    const file=new File([blob],name,{type:mime});
    const nativeShareAvailable=typeof navigator.share==='function' && typeof window.File==='function';
    const canFileShare=nativeShareAvailable && (typeof navigator.canShare!=='function' || navigator.canShare({files:[file]}));

    if(canFileShare){
      try{
        if(btn)btn.textContent='Choose WhatsApp / Share App...';
        await navigator.share({
          title:'RAJ Agencies Customer Order',
          text:'RAJ Agencies Customer Order • Customer Care WhatsApp: +91 70465 33330',
          files:[file]
        });
        V45.cart=[];saveCart();closeDrawer();
        notify('Excel order shared successfully. Cart cleared automatically.');
        return;
      }catch(shareErr){
        if(shareErr?.name==='AbortError'){
          notify('Share cancelled. Cart has not been cleared.');
          return;
        }
        console.warn('Native file share failed; using download fallback:',shareErr);
      }
    }

    // Desktop / unsupported browser fallback:
    // download the exact same Excel, keep a direct RAJ WhatsApp chat ready for manual attachment.
    downloadOrderBlob(blob,name);
    V45.cart=[];saveCart();closeDrawer();
    setTimeout(openRajWhatsAppAfterDownload,250);
    notify((usedFallback?'Compatible Excel (.xls)':'Excel (.xlsx)')+' downloaded. RAJ Agencies WhatsApp chat will open; attach the downloaded Excel file and send.');
  }catch(e){
    console.error('V75 Excel order fatal error:',e);
    notify('Excel order could not be created: '+(e?.message||'Unknown browser error'));
  }finally{
    if(btn){btn.disabled=false;btn.textContent='📤 Share Excel Order'}
  }
}

function orderNote(){return clean(q('#v45OrderNote')?.value)}
function customerMaster(){
  let list=[];
  try{const saved=JSON.parse(localStorage.getItem('rajCustomerMasterV46')||'[]');if(Array.isArray(saved))list=saved}catch(e){}
  return list.length?list:(window.RAJ_CUSTOMER_MASTER||[]);
}
function profileStorageKey(){return 'rajProfileAvatarV55_'+String(V45.customer?.customerId||V45.customer?.mobile||V45.customer?.name||'user').replace(/[^a-z0-9]/gi,'_')}
function profileAvatar(){try{return localStorage.getItem(profileStorageKey())||''}catch(e){return ''}}
function refreshProfileChip(){
  const chip=q('#v46UserChip'),c=V45.customer;if(!chip)return;
  if(!c){chip.hidden=true;return}
  chip.hidden=false;
  const img=chip.querySelector('.v55-profile-avatar'),fallback=chip.querySelector('.v55-profile-fallback'),pic=profileAvatar();
  if(img){img.src=pic||'';img.hidden=!pic}if(fallback)fallback.hidden=!!pic;
  const b=chip.querySelector('b'),sm=chip.querySelector('small');if(b)b.textContent=c.name||'User';if(sm)sm.textContent=c.role==='admin'?'Administrator':(c.accessGroup||'Customer');
}
function setCustomer(c){
  V45.customer=c;
  if(c){
    window.RAJ_AUTH_READY=true;
    setTimeout(()=>window.dispatchEvent(new CustomEvent('raj-auth-ready',{detail:{customer:c}})),0);
  }else{
    // V72 public mode stays active even when Pixaro logs out.
    window.RAJ_AUTH_READY=true;
  }
  try{if(c)sessionStorage.setItem('rajCustomerV45',JSON.stringify(c));else sessionStorage.removeItem('rajCustomerV45')}catch(e){}
  document.body.classList.toggle('v46-admin',c?.role==='admin');if(typeof window.RAJ_V49_APPLY_ACCESS==='function')setTimeout(()=>window.RAJ_V49_APPLY_ACCESS(c),0);
  refreshProfileChip();
}
function restoreCustomer(){try{const c=JSON.parse(sessionStorage.getItem('rajCustomerV45')||'null');if(c?.name)setCustomer(c)}catch(e){}}
function logoutV46(){setCustomer(null);closeDrawer();const gate=q('#v46LoginGate');if(gate){gate.classList.add('open');gate.setAttribute('aria-hidden','false')}const u=q('#v46LoginUser'),p=q('#v46LoginPassword');if(u)u.value='';if(p)p.value=''}
function openUserProfile(){
  const c=V45.customer;if(!c)return;const pic=profileAvatar();
  drawer('<section class="v45-panel v55-profile-panel"><div class="v55-profile-hero"><div class="v55-profile-photo">'+(pic?'<img src="'+escAttr(pic)+'" alt="Profile">':'<span>👤</span>')+'</div><div><small>RAJ AGENCIES ACCOUNT</small><h2>'+escapeHtml(c.name||'User')+'</h2><p>'+escapeHtml(c.role==='admin'?'Administrator':(c.accessGroup||'Customer'))+'</p></div></div><div class="v55-profile-grid"><div><span>Mobile</span><b>'+escapeHtml(c.mobile||'-')+'</b></div><div><span>Customer ID</span><b>'+escapeHtml(c.customerId||'-')+'</b></div><div><span>City</span><b>'+escapeHtml(c.city||'-')+'</b></div><div><span>Access Group</span><b>'+escapeHtml(c.accessGroup||c.role||'-')+'</b></div></div><label class="v55-profile-upload"><span>Profile Image</span><input id="v55ProfileFile" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG / PNG / WEBP. Image isi browser/profile ke liye save hogi.</small></label><div class="v45-actions"><button id="v55ProfileSave" class="v45-primary" type="button">Save Profile Image</button><button id="v55ProfileRemove" class="v45-secondary" type="button">Remove Image</button><button id="v55ProfileLogout" class="v45-danger" type="button">Logout</button></div></section>');
  q('#v55ProfileSave')?.addEventListener('click',()=>{const f=q('#v55ProfileFile')?.files?.[0];if(!f){notify('Select a profile image first.');return}if(f.size>1024*1024){notify('Profile image 1 MB se chhoti rakhein.');return}const r=new FileReader();r.onload=()=>{try{localStorage.setItem(profileStorageKey(),String(r.result));refreshProfileChip();notify('Profile image saved.');openUserProfile()}catch(e){notify('Profile image could not be saved.')}};r.readAsDataURL(f)});
  q('#v55ProfileRemove')?.addEventListener('click',()=>{try{localStorage.removeItem(profileStorageKey())}catch(e){}refreshProfileChip();openUserProfile()});
  q('#v55ProfileLogout')?.addEventListener('click',logoutV46);
}

function loginGateHtml(){return '<div id="v46LoginGate" class="v46-login-gate" aria-hidden="true"><div class="v46-login-card v72-admin-login-card"><button id="v72AdminLoginClose" class="v72-admin-login-close" type="button" aria-label="Close">×</button><img src="assets/company-logo/raj-group-logo-optimized.webp" alt="Raj Group"><div class="v46-login-kicker">RAJ AGENCIES</div><h2>Pixaro Admin Login</h2><p>Administrator access only.</p><label><span>ADMIN USER</span><input id="v46LoginUser" autocomplete="username" placeholder="Pixaro"></label><label><span>PASSWORD</span><input id="v46LoginPassword" type="password" autocomplete="current-password" placeholder="Password"></label><button id="v46LoginGo" type="button">ADMIN LOGIN</button><div id="v46LoginMsg" class="v46-login-msg">Hold the Raj Group logo for 5 seconds to open this admin login.</div></div></div>'}
function v72ShowAdminLogin(){
  if(V45.customer?.role==='admin'){notify('Pixaro admin is already logged in.');return}
  const gate=q('#v46LoginGate');if(!gate)return;
  gate.classList.add('open');gate.setAttribute('aria-hidden','false');
  const u=q('#v46LoginUser'),p=q('#v46LoginPassword'),m=q('#v46LoginMsg');
  if(u)u.value='';if(p)p.value='';if(m)m.textContent='Pixaro administrator credentials enter karein.';
  setTimeout(()=>u?.focus(),40);
}
function v72CloseAdminLogin(){
  const gate=q('#v46LoginGate');if(!gate)return;
  gate.classList.remove('open');gate.setAttribute('aria-hidden','true');
}
window.RAJ_OPEN_ADMIN_LOGIN=v72ShowAdminLogin;

function initAuthGate(){
  document.body.insertAdjacentHTML('beforeend',loginGateHtml());
  const actions=q('.header-actions');
  if(actions&&!q('#v46UserChip'))actions.insertAdjacentHTML('beforeend','<button id="v46UserChip" class="v46-user-chip v55-top-profile" type="button" hidden title="Open Admin Profile"><span class="v55-profile-media"><img class="v55-profile-avatar" alt="" hidden><span class="v55-profile-fallback">👤</span></span><span class="v55-profile-copy"><small>Administrator</small><b>PIXARO</b></span><span class="v55-profile-chevron">⌄</span></button>');
  const go=q('#v46LoginGo');
  if(go)go.onclick=doGateLogin;
  q('#v46LoginPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')doGateLogin()});
  q('#v46LoginUser')?.addEventListener('keydown',e=>{if(e.key==='Enter')q('#v46LoginPassword')?.focus()});
  q('#v72AdminLoginClose')?.addEventListener('click',v72CloseAdminLogin);
  q('#v46LoginGate')?.addEventListener('click',e=>{if(e.target?.id==='v46LoginGate')v72CloseAdminLogin()});
  q('#v46UserChip')?.addEventListener('click',openUserProfile);

  // V74 customer-facing preparation splash.
  if(!q('#v74BootSplash')){
    document.body.insertAdjacentHTML('beforeend','<div id="v74BootSplash" class="v74-boot-splash open"><div class="v74-boot-card"><img src="assets/company-logo/raj-group-logo-optimized.webp" alt="Raj Group"><div class="v46-login-kicker">RAJ AGENCIES</div><h2>Preparing RAJ Live Price Book</h2><p>Loading product data for a faster experience…</p><div class="v74-progress-track"><span></span></div><small>Opening in a few seconds</small></div></div>');
  }

  const splash=q('#v74BootSplash');
  const started=performance.now();
  let quickReady=!!window.RAJ_BOOT_STATE?.quick;
  let opened=false;

  const openPublicDashboard=()=>{
    if(opened)return;
    const elapsed=performance.now()-started;
    // Keep splash for at least ~4.8 sec, but do not wait for full data.
    if(elapsed<4800){setTimeout(openPublicDashboard,4800-elapsed);return}
    if(!quickReady){
      // Hard cap ~6.2 sec so customer is never trapped behind loading.
      if(elapsed<6200){setTimeout(openPublicDashboard,180);return}
    }
    opened=true;
    splash?.classList.remove('open');
    setTimeout(()=>splash?.remove(),350);
    if(!V45.customer?.role){
      V45.customer=null;
      document.body.classList.remove('v46-admin');
      refreshProfileChip();
    }
    if(!window.RAJ_AUTH_READY){
      window.RAJ_AUTH_READY=true;
      setTimeout(()=>window.dispatchEvent(new CustomEvent('raj-auth-ready',{detail:{customer:null,public:true}})),0);
    }
  };

  window.addEventListener('raj-boot-ready',()=>{quickReady=true;openPublicDashboard()},{once:true});
  if(quickReady)openPublicDashboard();
  setTimeout(openPublicDashboard,4800);
}
async function doGateLogin(){
  const rawUser=clean(q('#v46LoginUser')?.value),password=q('#v46LoginPassword')?.value||'',msg=q('#v46LoginMsg');
  if(rawUser.toUpperCase()!=='PIXARO'||String(password)!=='123'){
    if(msg)msg.textContent='Invalid admin ID or password.';
    return;
  }
  const c={name:'PIXARO',mobile:'ADMIN',customerId:'ADMIN',role:'admin',accessGroup:'admin'};
  setCustomer(c);
  v72CloseAdminLogin();
  notify('Pixaro admin login successful');
  setTimeout(()=>window.dispatchEvent(new CustomEvent('raj-admin-login',{detail:{customer:c}})),0);
}
window.RAJ_ADMIN_LOGOUT=function(){
  setCustomer(null);
  window.RAJ_AUTH_READY=true; // public dashboard remains active
  document.body.classList.remove('v46-admin');
  refreshProfileChip();
  notify('Admin logged out. Public mode active.');
};
function logoutV46(){window.RAJ_ADMIN_LOGOUT()}

window.RAJ_V46_IMPORT_CUSTOMERS_FROM_WORKBOOK=function(wb){
  try{
    const name=wb.SheetNames.find(n=>String(n).replace(/[^A-Z0-9]/gi,'').toUpperCase()==='CUSTOMERMASTER');if(!name)return 0;
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false});if(!rows.length)return 0;
    const headers=rows[0].map(x=>String(x).trim().toUpperCase().replace(/[^A-Z0-9]/g,''));
    const col=(...keys)=>{for(const k of keys){const i=headers.indexOf(k);if(i>=0)return i}return -1};
    const ni=col('CUSTOMERNAME','NAME','PARTYNAME'),mi=col('MOBILENUMBER','MOBILE','MOBILENO','PHONE'),pi=col('PASSWORD','PASS','LOGINPASSWORD'),ci=col('CUSTOMERID','PARTYCODE','CUSTOMERCODE'),gi=col('ACCESSGROUP','USERGROUP','GROUP','CUSTOMERGROUP'),ri=col('ROLE','USERTYPE','TYPE'),cti=col('CITY','CUSTOMERCITY','PARTYCITY','LOCATION');
    if(mi<0||pi<0)return 0;
    const list=rows.slice(1).filter(r=>String(r[mi]||'').trim()&&String(r[pi]||'').trim()).map(r=>({name:String(r[ni]||r[mi]).trim(),mobile:String(r[mi]).trim(),password:String(r[pi]).trim(),customerId:ci>=0?String(r[ci]||'').trim():'',city:cti>=0?String(r[cti]||'').trim():'',accessGroup:gi>=0?String(r[gi]||'customer').trim().toLowerCase():'customer',userType:ri>=0?String(r[ri]||'customer').trim().toLowerCase():'customer'}));
    localStorage.setItem('rajCustomerMasterV46',JSON.stringify(list));window.RAJ_CUSTOMER_MASTER=list;return list.length;
  }catch(e){console.error('Customer Master import failed',e);return 0}
};




function offerType(file){
  const x=clean(file).toLowerCase();if(x.startsWith('data:application/pdf')||x.endsWith('.pdf'))return 'pdf';if(x.startsWith('data:image/'))return 'image';return x.includes('pdf')?'pdf':'image';
}
const V71_OFFER_DB='RAJ_OFFERS_DB_V71',V71_OFFER_STORE='offers';let V71_OFFERS=[];
function v71Db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(V71_OFFER_DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(V71_OFFER_STORE))db.createObjectStore(V71_OFFER_STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Offer database unavailable'))})}
async function v71DbAll(){try{const db=await v71Db();return await new Promise((resolve,reject)=>{const tx=db.transaction(V71_OFFER_STORE,'readonly'),r=tx.objectStore(V71_OFFER_STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}catch(e){console.warn(e);return []}}
async function v71DbPut(o){const db=await v71Db();return new Promise((resolve,reject)=>{const tx=db.transaction(V71_OFFER_STORE,'readwrite');tx.objectStore(V71_OFFER_STORE).put(o);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}
async function v71DbDelete(id){try{const db=await v71Db();await new Promise((resolve,reject)=>{const tx=db.transaction(V71_OFFER_STORE,'readwrite');tx.objectStore(V71_OFFER_STORE).delete(id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}catch(e){}}
function v71Embedded(){return Array.isArray(window.RAJ_EMBEDDED_OFFERS_V71)?window.RAJ_EMBEDDED_OFFERS_V71:(Array.isArray(window.RAJ_EMBEDDED_OFFERS_V70)?window.RAJ_EMBEDDED_OFFERS_V70:[])}
function v71Key(o){return clean(o?.id)||[o?.brand,o?.title,o?.validTill,o?.fileName].join('|')}
function v71Expired(o){if(!o?.validTill)return false;const d=new Date(o.validTill+'T23:59:59');return !isNaN(d)&&Date.now()>d.getTime()}
function v71Url(o){if(o.previewUrl)return o.previewUrl;if(o.fileBlob instanceof Blob){o.previewUrl=URL.createObjectURL(o.fileBlob);return o.previewUrl}return o.file||''}
async function v71Load(){const local=await v71DbAll(),embedded=v71Embedded(),current=V71_OFFERS.slice(),out=[],seen=new Set();[...current,...local,...embedded].forEach(o=>{const k=v71Key(o);if(!k||seen.has(k))return;seen.add(k);out.push(o)});V71_OFFERS=out;return out}
function v71Card(o,admin){const url=v71Url(o),pdf=(o.mime||'').includes('pdf')||offerType(url)==='pdf',expired=v71Expired(o);const poster=pdf?'<div class="v50-pdf-poster"><b>PDF</b><span>OFFER / SCHEME</span></div>':'<button class="v52-offer-preview" type="button" data-offer-view="'+escAttr(url)+'"><img src="'+escAttr(url)+'" alt="'+escAttr(o.title||'Offer')+'"></button>';return '<article class="v45-offer v50-offer-card '+(expired?'v67-expired-card':'')+'">'+poster+'<div class="v50-offer-copy"><div class="v67-offer-topline"><span class="v50-offer-brand">'+escapeHtml(o.brand||'ALL BRANDS')+'</span><span class="'+(expired?'v67-expired':'v67-active')+'">'+(expired?'EXPIRED':'ACTIVE')+'</span></div><strong>'+escapeHtml(o.title||'Offer Scheme')+'</strong>'+(o.narration?'<p>'+escapeHtml(o.narration)+'</p>':'')+'<small>'+(o.validTill?'Valid till '+escapeHtml(o.validTill):'Current scheme / offer')+'</small></div><div class="v45-actions v52-offer-actions"><a class="v45-secondary" target="_blank" rel="noopener" href="'+escAttr(url)+'">'+(pdf?'Open PDF':'View Poster')+'</a><a class="v45-primary" download="'+escAttr(o.fileName||'RAJ-Offer')+'" href="'+escAttr(url)+'">Download</a>'+(admin?'<button class="v45-danger v71-offer-delete" data-offer-id="'+escAttr(o.id)+'" type="button">Delete Offer</button>':'')+'</div></article>'}
function v71Render(admin){const grid=q('#v71OfferGrid'),cnt=q('#v71OfferCount');if(cnt)cnt.textContent=V71_OFFERS.length+' Offer'+(V71_OFFERS.length===1?'':'s');if(grid)grid.innerHTML=V71_OFFERS.length?V71_OFFERS.map(o=>v71Card(o,admin)).join(''):'<div class="v45-empty">No offer / scheme published yet.</div>';qa('.v52-offer-preview').forEach(b=>b.onclick=()=>window.open(b.dataset.offerView,'_blank','noopener'));qa('.v71-offer-delete').forEach(b=>b.onclick=async()=>{const id=b.dataset.offerId;V71_OFFERS=V71_OFFERS.filter(o=>String(o.id)!==String(id));await v71DbDelete(id);window.RAJ_EMBEDDED_OFFERS_V71=V71_OFFERS.map(o=>({...o,fileBlob:undefined,previewUrl:undefined,source:'embedded'}));v71Render(admin);notify('Offer deleted. Download Updated HTML to publish this change.')})}
async function v71AddOfferNow(){const admin=V45.customer?.role==='admin'&&normalizeSearchText(V45.customer?.name)==='PIXARO';if(!admin)return;const brand=clean(q('#v50OfferBrand')?.value),title=clean(q('#v50OfferTitle')?.value),narration=clean(q('#v50OfferNarration')?.value),validTill=clean(q('#v50OfferValid')?.value),file=q('#v50OfferFile')?.files?.[0],msg=q('#v71OfferAdminMsg'),btn=q('#v50OfferAdd');if(!brand||!title){if(msg)msg.textContent='Brand Name aur Scheme Title required hai.';return}if(!file){if(msg)msg.textContent='Poster image ya PDF choose karein.';return}if(file.size>15*1024*1024){if(msg)msg.textContent='Poster file 15 MB se chhoti rakhein.';return}if(btn){btn.disabled=true;btn.textContent='Adding…'}const offer={id:'offer_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),brand,title,narration,validTill,fileBlob:file,fileName:file.name,mime:file.type,previewUrl:URL.createObjectURL(file),createdAt:new Date().toISOString(),source:'admin'};V71_OFFERS.unshift(offer);v71Render(true);if(msg)msg.textContent='Offer added. Preview ready below.';try{await v71DbPut({...offer,previewUrl:''});if(msg)msg.textContent='Offer saved. Download Updated HTML to publish on GitHub.'}catch(e){console.error(e);if(msg)msg.textContent='Preview ready. Browser storage failed; export Updated HTML now.'}finally{if(btn){btn.disabled=false;btn.textContent='Add Offer / Scheme'}}}
async function openOffers(){const admin=V45.customer?.role==='admin'&&normalizeSearchText(V45.customer?.name)==='PIXARO';const upload=admin?'<section class="v50-offer-admin"><div class="v50-offer-admin-title"><span>PIXARO ADMIN ONLY</span><h3>Pixaro Offer Upload</h3><p>Brand-wise JPG, PNG, WEBP ya PDF poster add karein.</p></div><div class="v50-offer-form"><label>BRAND NAME<input id="v50OfferBrand" placeholder="Example: BRAVO"></label><label>SCHEME TITLE<input id="v50OfferTitle" placeholder="Example: New Gift Scheme"></label><label class="v50-offer-wide">NARRATION / DETAILS<textarea id="v50OfferNarration" placeholder="Offer details..."></textarea></label><label>VALID TILL (OPTIONAL)<input id="v50OfferValid" type="date"></label><label>POSTER FILE<input id="v50OfferFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label></div><button id="v50OfferAdd" class="v45-primary" type="button">Add Offer / Scheme</button><div id="v71OfferAdminMsg" class="v45-api-note">Image/PDF select karke Add karein. Card turant niche dikhega.</div></section>':'';drawer('<section class="v45-panel v50-offer-panel"><div class="v50-offer-head"><div><h2>Offer / Scheme</h2><p class="v45-sub">Latest brand offers, scheme posters and customer downloads.</p></div><span id="v71OfferCount" class="v50-offer-count">Loading…</span></div>'+upload+'<div id="v71OfferGrid" class="v45-offer-grid"><div class="v45-empty">Loading offers…</div></div></section>');if(admin){const b=q('#v50OfferAdd');if(b)b.onclick=v71AddOfferNow}v71Load().then(()=>v71Render(admin)).catch(()=>v71Render(admin));}
function v71BlobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
window.RAJ_V71_EXPORT_OFFERS=async function(){const out=[];for(const o of V71_OFFERS){let file=o.file||'';if(!file&&o.fileBlob instanceof Blob)file=await v71BlobToDataUrl(o.fileBlob);out.push({id:o.id,brand:o.brand,title:o.title,narration:o.narration,validTill:o.validTill,file,fileName:o.fileName,mime:o.mime,createdAt:o.createdAt,source:'embedded'})}return out};

function openImageSearch(){q('#v45ImageFile').click()}
q('#v45ImageFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const src=URL.createObjectURL(file);drawer('<section class="v45-panel"><h2>Image Search</h2><p class="v45-sub">Photo selected from camera/gallery.</p><img class="v45-preview" src="'+src+'"><div id="v45ImageMsg" class="v45-api-note">Preparing image search…</div><div id="v45ImageHits" class="v45-result-list"></div></section>');const msg=q('#v45ImageMsg'),url=apiUrl(CFG.IMAGE_SEARCH_ENDPOINT);if(!url){const stem=normalizeSearchText(file.name.replace(/\.[^.]+$/,''));const hit=stem&&FAST_ROWS.find(x=>x.codeN&&stem.replace(/\s/g,'').includes(x.codeN.replace(/\s/g,'')));if(hit){msg.textContent='API not connected; filename matched '+hit.code+'. Click result.';q('#v45ImageHits').innerHTML='<div class="v45-result-hit" data-image-code="'+escAttr(hit.code)+'"><b>'+escapeHtml(hit.code)+'</b> '+escapeHtml(hit.product)+'</div>'}else msg.textContent='True image similarity needs the image-search backend/model. Endpoint hook is ready in js/v45-config.js.';return}try{const fd=new FormData();fd.append('image',file);const r=await fetch(url,{method:'POST',body:fd});if(!r.ok)throw new Error('Image search failed');const d=await r.json(),hits=d.results||d.products||[];msg.textContent=hits.length?hits.length+' matching products found.':'No similar product found.';q('#v45ImageHits').innerHTML=hits.slice(0,20).map(h=>'<div class="v45-result-hit" data-image-code="'+escAttr(h.code||h.partNumber||'')+'"><b>'+escapeHtml(h.code||h.partNumber||'')+'</b> '+escapeHtml(h.description||h.productName||'')+' '+(h.score!=null?'('+Math.round(h.score*100)+'%)':'')+'</div>').join('')}catch(err){msg.textContent=err.message}}); 
q('#v45DrawerContent')?.addEventListener('click',e=>{const h=e.target.closest('[data-image-code]');if(h){closeDrawer();q('#searchInput').value=h.dataset.imageCode;applyFilters()}});

async function liveApiSync(){const url=apiUrl(CFG.LIVE_PRODUCTS_ENDPOINT);if(!url){notify('Live ERP API not configured yet. See API Flow Word document and js/v45-config.js.');return}const b=q('#liveApiSyncBtn');b.disabled=true;try{const r=await fetch(url,{headers:{'Accept':'application/json'}});if(!r.ok)throw new Error('API sync failed');const d=await r.json(),rows=Array.isArray(d)?d:(d.products||d.data||[]);if(!rows.length)throw new Error('API returned no products');allData=rows.map(x=>{const o={};Object.keys(x).forEach(k=>o[keyOf(k)]=x[k]);return o});rebuildRowIndexMap();refreshSpecialFacets(false);applyFilters();lastUpdated=new Date();notify(rows.length.toLocaleString('en-IN')+' products loaded from Live API')}catch(e){console.error(e);notify(e.message||'API sync error')}finally{b.disabled=false}}

function setSpecial(type){
  const gf=q('#groupFilter');
  let keepGroup=gf?.value||'';
  if(!keepGroup&&gf){const a=[...gf.options].find(o=>normalizeSearchText(o.value)==='AAYUB');if(a)keepGroup=a.value}
  V45.special=V45.special===type?'':type;
  q('#newLaunchBtn')?.classList.toggle('active',V45.special==='new');
  q('#deadStockBtn')?.classList.toggle('active',V45.special==='dead');
  ['subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>{if(q('#'+id))q('#'+id).value=''});
  refreshSpecialFacets(true);
  if(gf&&keepGroup&&[...gf.options].some(o=>o.value===keepGroup))gf.value=keepGroup;
  if(V45.special)specialCascade();else cascade();
  if(gf&&keepGroup&&[...gf.options].some(o=>o.value===keepGroup))gf.value=keepGroup;
  applyFilters(true,false);
  updateSpecialNote();
}
window.RAJ_V45_DATA_RELOADED=function(){
  rebuildSpecialIndex();
  if(typeof buildFastRows==='function')buildFastRows();
  refreshSpecialFacets(true);
  if(V45.special)specialCascade();
  applyFilters(true,false);
};
function enhanceVoice(){const b=q('#voiceSearchBtn');if(!b)return;b.title='Advanced Voice Search — speak part no., company code, competitor/alternate code, model or product';const s=q('#voiceStatus');if(s)s.textContent='Speak or type: part no., company code, competitor/alternate code, model, vehicle or any Excel detail'}
function bindMain(){
  q('#resetBtn').onclick=()=>{V45.special='';if(q('#fsnFilter'))q('#fsnFilter').value='';USER_FILTER_SCOPE_ACTIVE=false;['groupFilter','subGroupFilter','segmentFilter','vehicleFilter','modelFilter','categoryFilter'].forEach(id=>{if(q('#'+id))q('#'+id).value=''});q('#searchInput').value='';q('#universalSearchInput').value='';document.querySelectorAll('.filter-search').forEach(x=>x.value='');cascade();const gf=q('#groupFilter');if(gf){const a=[...gf.options].find(o=>normalizeSearchText(o.value)==='AAYUB');if(a)gf.value=a.value}cascade();refreshSpecialFacets(true);applyFilters();};q('#newLaunchBtn').onclick=()=>setSpecial('new');q('#deadStockBtn').onclick=()=>setSpecial('dead');q('#fsnFilter').onchange=()=>{
    const gf=q('#groupFilter');let keep=gf?.value||'';
    if(!keep&&gf){const a=[...gf.options].find(o=>normalizeSearchText(o.value)==='AAYUB');if(a)keep=a.value}
    q('#fsnFilter')?.closest('.v45-command,.v45-fsn-card,.filter-item')?.classList.toggle('active',!!q('#fsnFilter')?.value);
    refreshSpecialFacets(true);
    if(gf&&keep&&[...gf.options].some(o=>o.value===keep))gf.value=keep;
    if(V45.special)specialCascade();else cascade();
    if(gf&&keep&&[...gf.options].some(o=>o.value===keep))gf.value=keep;
    applyFilters(true,false);
    updateSpecialNote();
  };q('#offerSchemeBtn').onclick=openOffers;q('#imageSearchBtn').onclick=openImageSearch;q('#cartBtn').onclick=openCart;q('#liveApiSyncBtn')?.addEventListener('click',liveApiSync);q('#v45DrawerClose').onclick=closeDrawer;q('#v45Drawer').onclick=e=>{if(e.target===q('#v45Drawer'))closeDrawer()};
  q('#priceTable tbody').addEventListener('click',e=>{const qb=e.target.closest('.v45-qbtn[data-row-index]');if(qb){const inp=q('#v45qty-'+qb.dataset.rowIndex);if(inp)inp.value=Math.max(1,(Number(inp.value)||1)+(qb.dataset.act==='plus'?1:-1));return}const add=e.target.closest('.v45-add');if(add){const row=allData[Number(add.dataset.rowIndex)],inp=q('#v45qty-'+add.dataset.rowIndex);if(row)addToCart(row,inp?.value||1)}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
}

loadCart();restoreCustomer();bindMain();enhanceVoice();initAuthGate();
let v68SpecialWarmIndex=0,v68SpecialWarming=false,v68SpecialReady=false;
function v68WarmSpecialIndex(){
  if(v68SpecialReady||v68SpecialWarming)return;
  window.RAJ_BOOT_MARK?.('special',false);
  v68SpecialWarming=true;
  SPECIAL_INDEX.newRows=new WeakSet();SPECIAL_INDEX.deadRows=new WeakSet();SPECIAL_INDEX.fsnByRow=new WeakMap();
  SPECIAL_INDEX.newCount=0;SPECIAL_INDEX.deadCount=0;SPECIAL_INDEX.fsnCount=0;const classes=new Set();
  const run=(deadline)=>{
    const started=performance.now();let n=0;
    while(v68SpecialWarmIndex<allData.length&&n<350){
      if(n>30&&deadline&&typeof deadline.timeRemaining==='function'&&!deadline.didTimeout&&deadline.timeRemaining()<3)break;
      if(n>30&&!deadline&&performance.now()-started>4)break;
      const row=allData[v68SpecialWarmIndex++];n++;
      if(!row||typeof row!=='object')continue;
      const nv=valByAliases(row,aliases.new),dv=valByAliases(row,aliases.dead),fv=clean(valByAliases(row,aliases.fsn));
      if(flag(nv,'new')){SPECIAL_INDEX.newRows.add(row);SPECIAL_INDEX.newCount++}
      if(flag(dv,'dead')){SPECIAL_INDEX.deadRows.add(row);SPECIAL_INDEX.deadCount++}
      if(fv){SPECIAL_INDEX.fsnByRow.set(row,fv);SPECIAL_INDEX.fsnCount++;classes.add(normalizeFsnClass(fv)||fv)}
    }
    if(v68SpecialWarmIndex<allData.length){
      if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:120});else setTimeout(()=>run(null),8);
    }else{
      SPECIAL_INDEX.fsnClasses=[...classes].sort(natural);rowMeta=new WeakMap();v68SpecialReady=true;v68SpecialWarming=false;updateSpecialCounts();refreshSpecialFacets(false);window.RAJ_BOOT_MARK?.('special',true);
      if(window.RAJ_AUTH_READY)applyFilters(false,false);
    }
  };
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:120});else setTimeout(()=>run(null),8);
}
v68WarmSpecialIndex();
window.RAJ_V45=V45;
})();
