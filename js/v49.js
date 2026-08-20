/* RAJ LIVE PRICEBOOK V49 — role rights + admin text editor/export */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function openDrawer(html){const c=$('#v45DrawerContent'),d=$('#v45Drawer');if(c)c.innerHTML=html;if(d){d.classList.add('open');d.setAttribute('aria-hidden','false')}}
function notice(msg){if(window.toast)window.toast(msg);else console.log(msg)}
const GROUPS=['salesman','customer','trusted_customer'];
const LABELS={salesman:'Salesman',customer:'Customer',trusted_customer:'Trusted Customer'};
const storeKey='rajAccessRightsV49';
const defaults={salesman:{hidden:[]},customer:{hidden:[]},trusted_customer:{hidden:[]},users:{}};
function load(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(storeKey)||'{}'))}catch(e){return JSON.parse(JSON.stringify(defaults))}}
function save(x){localStorage.setItem(storeKey,JSON.stringify(x))}
function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}
function current(){try{return window.RAJ_V45&&window.RAJ_V45.customer}catch(e){return null}}
function columns(){const a=[...new Set($$('#priceTable thead th[data-col]').map(x=>x.dataset.col).filter(Boolean))];return a.length?a:['CODE','PRODUCT NAME','UNIT','GST','RATE','MRP','CLUTCH DIA','NO. OF TEETH']}
function effective(c){if(!c||c.role==='admin')return [];const r=load(),g=norm(c.accessGroup||'customer');const base=(r[g]&&r[g].hidden)||[];const mobile=String(c.mobile||'').replace(/\D/g,'').slice(-10);const user=(r.users||{})[mobile];return user&&Array.isArray(user.hidden)?user.hidden:base}
function apply(c){
  const hidden=effective(c);let st=$('#v49RightsStyle');if(!st){st=document.createElement('style');st.id='v49RightsStyle';document.head.appendChild(st)}
  st.textContent=hidden.map(k=>`#priceTable [data-col="${CSS.escape(k)}"]{display:none!important}`).join('\n');
  setTimeout(()=>{const cc=$('#columnCount');if(cc)cc.textContent=String(Math.max(0,columns().length-hidden.length));},0);
}
window.RAJ_V49_APPLY_ACCESS=apply;
new MutationObserver(()=>{const c=current();if(c)apply(c)}).observe($('#priceTable')||document.body,{childList:true,subtree:true});

function customerMaster(){try{return JSON.parse(localStorage.getItem('rajCustomerMasterV46')||'[]')}catch(e){return []}}
function rightsPanel(){
  if(current()?.role!=='admin')return;
  const allCols=columns(), data=load(), users=customerMaster();
  const targets=[...GROUPS.map(g=>({id:'g:'+g,label:LABELS[g],type:'group',key:g})),...users.map(u=>({id:'u:'+String(u.mobile||'').replace(/\D/g,'').slice(-10),label:(u.name||u.mobile)+' · '+(u.mobile||''),type:'user',key:String(u.mobile||'').replace(/\D/g,'').slice(-10),group:norm(u.accessGroup||'customer')}))];
  const side=targets.map((t,i)=>`<button data-v49-target="${t.id}" class="${i===0?'active':''}">${t.type==='group'?'👥':'👤'} ${escapeHtml(t.label)}</button>`).join('');
  openDrawer(`<section class="v45-panel"><h2>Access Rights Control</h2><div class="v49-admin-note">यह static/offline rights prototype है। Production hosting में यही rules backend database में save किए जाएंगे। Group पर change करने से उस group के सभी users पर एक साथ लागू होगा; individual user पर अलग override भी कर सकते हैं। Salesman / Customer / Trusted Customer तीन default groups तैयार हैं।</div><div class="v49-rights-grid"><div class="v49-rights-sidebar">${side||'<small>Customer Master import करें.</small>'}</div><div><h3 id="v49RightsTitle">${LABELS.salesman}</h3><div class="v49-rights-cols" id="v49RightsCols"></div><div class="v45-actions"><button id="v49RightsSave" class="v45-primary">Save Rights</button><button id="v49RightsReset" class="v45-secondary">Use Group Default</button></div></div></div></section>`);
  let active=targets[0];
  const render=()=>{if(!active)return;$('#v49RightsTitle').textContent=active.label;let hidden=[];if(active.type==='group')hidden=(data[active.key]?.hidden)||[];else hidden=((data.users?.[active.key]?.hidden) ?? (data[active.group]?.hidden) ?? []);$('#v49RightsCols').innerHTML=allCols.map(c=>`<label><input type="checkbox" value="${escapeHtml(c)}" ${hidden.includes(c)?'':'checked'}> Show ${escapeHtml(c)}</label>`).join('')+'<label><input type="checkbox" value="__IMAGE_ORDER__" checked disabled> Show Image / Order</label>';};
  render();
  $$('.v49-rights-sidebar button').forEach(b=>b.onclick=()=>{ $$('.v49-rights-sidebar button').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=targets.find(t=>t.id===b.dataset.v49Target);render(); });
  $('#v49RightsSave').onclick=()=>{const hidden=allCols.filter(c=>!$('#v49RightsCols input[value="'+CSS.escape(c)+'"]')?.checked);if(active.type==='group'){data[active.key]=data[active.key]||{};data[active.key].hidden=hidden}else{data.users=data.users||{};data.users[active.key]={hidden};}save(data);notice('Access rights saved');apply(current())};
  $('#v49RightsReset').onclick=()=>{if(active?.type==='user'){delete data.users[active.key];save(data);render();notice('Individual override removed; group rights will apply.')}};
}

const contentKey='rajContentOverridesV49';
function content(){try{return JSON.parse(localStorage.getItem(contentKey)||'{}')}catch(e){return {}}}
function applyContent(){const x=Object.assign({},window.RAJ_CONTENT_OVERRIDES||{},content());$$('[data-edit-key]').forEach(el=>{if(x[el.dataset.editKey]!=null)el.innerHTML=x[el.dataset.editKey]})}
function saveContent(){const x={};$$('[data-edit-key]').forEach(el=>x[el.dataset.editKey]=el.innerHTML);localStorage.setItem(contentKey,JSON.stringify(x));return x}
function enterEdit(){if(current()?.role!=='admin'){notice('Website edit mode केवल Pixaro admin के लिए है.');return}document.body.classList.add('v49-editing');const editableSelectors='[data-editable="true"],.header-hero .badge,.header-hero h2,.header-hero p,.panel-title h3,.panel-title p,.v46-section-divider strong,.v46-section-divider span,#voiceStatus,.v45-command b,.v45-fsn>span';$$(editableSelectors).forEach((el,i)=>{el.setAttribute('contenteditable','true');el.dataset.v49TempEdit='1'});if(!$('#v49EditBar'))document.body.insertAdjacentHTML('beforeend','<div id="v49EditBar" class="v49-editbar"><button class="save" id="v49SaveText">Save Text</button><button class="download" id="v49DownloadHtml">Download Updated HTML</button><button class="close" id="v49CloseEdit">Close Edit</button></div>');$('#v49SaveText').onclick=()=>{saveContent();notice('Website text saved in this admin browser')};$('#v49DownloadHtml').onclick=downloadHtml;$('#v49CloseEdit').onclick=exitEdit;notice('Edit mode ON — highlighted text can now be edited.')}
function exitEdit(){document.body.classList.remove('v49-editing');$$('[data-v49-temp-edit]').forEach(el=>{el.removeAttribute('contenteditable');delete el.dataset.v49TempEdit});$('#v49EditBar')?.remove()}
async function downloadHtml(){
  saveContent();
  const clone=document.documentElement.cloneNode(true);
  clone.classList?.remove('v49-editing');
  clone.querySelector('body')?.classList.remove('v49-editing','v46-admin');
  clone.querySelector('#v46LoginGate')?.remove();
  clone.querySelector('#v46UserChip')?.remove();
  clone.querySelector('#v49EditBar')?.remove();
  clone.querySelector('.v50-mobile-dock')?.remove();
  clone.querySelectorAll('[data-v49-temp-edit]').forEach(el=>{el.removeAttribute('contenteditable');el.removeAttribute('data-v49-temp-edit')});
  clone.querySelector('#priceTable tbody')?.replaceChildren();
  clone.querySelector('#v45Drawer')?.classList.remove('open');
  clone.querySelector('#rajAdminOffersSeed')?.remove();
  clone.querySelector('#rajOffersSeedV67')?.remove();clone.querySelector('#rajOffersSeedV68')?.remove();clone.querySelector('#rajOffersSeedV70')?.remove();clone.querySelector('#rajOffersSeedV71')?.remove();
  let offers=[];try{offers=typeof window.RAJ_V71_EXPORT_OFFERS==='function'?await window.RAJ_V71_EXPORT_OFFERS():[]}catch(e){console.error(e)}
  const seed=document.createElement('script');seed.id='rajOffersSeedV71';seed.textContent='window.RAJ_EMBEDDED_OFFERS_V71='+JSON.stringify(offers).replace(/</g,'\\u003c')+';';
  clone.querySelector('head')?.appendChild(seed);
  const source='<!doctype html>\n'+clone.outerHTML;
  const blob=new Blob([source],{type:'text/html;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='RAJLIVEPRICEBOOK-V71-UPDATED.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}

function bind(){
  applyContent();
  $('#v49RightsBtn')?.addEventListener('click',rightsPanel);
  $('#v49EditBtn')?.addEventListener('click',enterEdit);
  let timer=0,logo=$('#v49AdminLogo');
  if(logo){
    logo.title='Hold 5 seconds for Pixaro Admin';
    const holder=logo.closest('.brand-lockup')||logo.parentElement;
    const start=()=>{
      clearTimeout(timer);
      holder?.classList.remove('v73-admin-hold-complete');
      holder?.classList.add('v73-admin-holding');
      timer=setTimeout(()=>{
        holder?.classList.remove('v73-admin-holding');
        holder?.classList.add('v73-admin-hold-complete');
        setTimeout(()=>holder?.classList.remove('v73-admin-hold-complete'),650);
        if(current()?.role==='admin')enterEdit();
        else if(typeof window.RAJ_OPEN_ADMIN_LOGIN==='function')window.RAJ_OPEN_ADMIN_LOGIN();
      },5000);
    };
    const cancel=()=>{
      clearTimeout(timer);
      holder?.classList.remove('v73-admin-holding');
    };
    ['pointerdown','touchstart'].forEach(e=>logo.addEventListener(e,start,{passive:true}));
    ['pointerup','pointercancel','pointerleave','touchend','touchcancel'].forEach(e=>logo.addEventListener(e,cancel,{passive:true}));
  }
  window.addEventListener('raj-admin-login',()=>setTimeout(enterEdit,80));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
