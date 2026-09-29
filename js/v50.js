/* RAJ LIVE PRICE BOOK V50 — mobile app shell */
(function(){
'use strict';
const $=s=>document.querySelector(s);
function go(sel){const el=$(sel);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}
function addDock(){if($('.v50-mobile-dock'))return;document.body.insertAdjacentHTML('beforeend','<nav class="v50-mobile-dock" aria-label="Mobile quick actions"><button data-go="top" type="button"><span>⌂</span><b>Home</b></button><button data-go="filters" type="button"><span>⌕</span><b>Filters</b></button><button data-go="search" type="button"><span>⌕</span><b>Search</b></button><button data-go="offers" type="button"><span>★</span><b>Offers</b></button><button data-go="cart" type="button"><span>🛒</span><b>Cart</b><em id="v50DockCart">0</em></button></nav>');document.querySelectorAll('.v50-mobile-dock button').forEach(b=>b.onclick=()=>{const a=b.dataset.go;if(a==='top')scrollTo({top:0,behavior:'smooth'});else if(a==='filters')go('.filter-panel');else if(a==='search')go('.v46-section-divider');else if(a==='offers')$('#offerSchemeBtn')?.click();else if(a==='cart')$('#cartBtn')?.click()});}
function syncCart(){const n=$('#cartCount')?.textContent||'0',e=$('#v50DockCart');if(e)e.textContent=n}
function bind(){addDock();syncCart();new MutationObserver(syncCart).observe($('#cartCount')||document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
