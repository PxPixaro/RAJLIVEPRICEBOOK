(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const HELP_PDF='docs/RAJ-Live-Price-Book-How-To-Use-Hindi-SOP.pdf';
  const HELP_VIDEO='docs/RAJ-Live-Price-Book-Quick-Guide-Hindi.mp4';
  const HELP_POSTER='docs/RAJ-Live-Price-Book-Quick-Guide-Poster.jpg';

  function inject(){
    if($('#v129HelpModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="v129HelpModal" class="v129-help-modal" hidden role="dialog" aria-modal="true" aria-labelledby="v129HelpTitle">
        <div class="v129-help-panel">
          <div class="v129-help-head">
            <img src="assets/company-logo/raj-group-logo-optimized.webp" alt="Raj Group">
            <div class="v129-help-title"><h2 id="v129HelpTitle">How to use this platform</h2><p>इस प्लेटफॉर्म को आसानी से सीखने के लिए कोई एक तरीका चुनें</p></div>
            <button id="v129HelpClose" class="v129-help-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="v129-help-grid">
            <button id="v129StartTour" class="v129-help-card" type="button"><span class="ico">➜</span><strong>Quick Guided Tour</strong><span>स्क्रीन पर हर जरूरी button और feature step-by-step highlight होगा। लगभग 2 मिनट।</span></button>
            <button id="v129WatchVideo" class="v129-help-card" type="button"><span class="ico">▶</span><strong>Watch Quick Video</strong><span>लगभग 1 मिनट का Hindi-caption video: Filter से WhatsApp Order तक पूरा flow।</span></button>
            <button id="v129OpenSop" class="v129-help-card" type="button"><span class="ico">PDF</span><strong>Hindi SOP PDF</strong><span>पूरी detail, screenshots और troubleshooting के साथ professional manual खोलें।</span></button>
          </div>
          <p class="v129-help-tip"><b>Best for new users:</b> पहले Quick Guided Tour चलाएँ, फिर जरूरत होने पर Video या SOP PDF देखें।</p>
        </div>
      </div>
      <div id="v129VideoModal" class="v129-video-modal" hidden role="dialog" aria-modal="true" aria-label="Quick Guide Video">
        <div class="v129-video-panel"><div class="v129-video-head"><strong>RAJ Live Price Book — Quick Hindi Guide</strong><button id="v129VideoClose" type="button" aria-label="Close video">×</button></div><video id="v129HelpVideo" controls playsinline preload="metadata" poster="${HELP_POSTER}"><source src="${HELP_VIDEO}" type="video/mp4">Your browser does not support video playback.</video></div>
      </div>
      <div id="v129TourLayer" class="v129-tour-layer" hidden aria-live="polite">
        <div id="v129TourFocus" class="v129-tour-focus"></div><div id="v129TourArrow" class="v129-tour-arrow"></div>
        <div id="v129TourBubble" class="v129-tour-bubble"><div class="v129-tour-kicker"><span>QUICK TOUR</span><em id="v129TourCount"></em></div><h3 id="v129TourTitle"></h3><p id="v129TourText"></p><div class="v129-tour-actions"><button id="v129TourSkip" class="skip" type="button">Close</button><button id="v129TourPrev" type="button">← Back</button><button id="v129TourNext" class="primary" type="button">Next →</button></div></div>
      </div>`);
  }

  const steps=[
    {sel:'#v129HelpBtn',title:'Help Center',text:'जब भी मदद चाहिए, इसी i button से Quick Tour, Video और Hindi SOP तीनों खोल सकते हैं।'},
    {sel:'.v46-primary-filters',title:'1. Filters लगाएँ',text:'Group / Brand चुनें और जरूरत के अनुसार Sub Group, Segment, Vehicle, Model और Category लगाएँ। Multi-select भी उपलब्ध है।'},
    {sel:'.v47-search-row',title:'2. Product Search',text:'Search Anything में Part No., Product Name या Excel की किसी भी detail से product खोजें।'},
    {sel:'.v47-universal-search',title:'3. Universal + Voice Search',text:'Universal Search में company code, model, vehicle आदि लिखें। Mic button से बोलकर भी search कर सकते हैं।'},
    {sel:'#imageSearchBtn',title:'4. Image Search',text:'Product की photo से matching product खोजने के लिए Image Search खोलें। Camera/Photos permission allow करें।'},
    {sel:'.results-card',title:'5. Product Results',text:'यहाँ filtered products, Code, Product Name, GST, Rate/MRP और बाकी available details दिखाई देती हैं।'},
    {sel:'.view-image-btn',title:'6. Product Image देखें',text:'Thumbnail पर click/tap करके product image बड़ा देखें और visually verify करें।'},
    {sel:'.v45-product-actions',title:'7. Qty और ADD',text:'− / + से quantity set करें और ADD दबाकर item Order Cart में डालें। Mobile detail view में Product Remark भी मिलता है।'},
    {sel:'#selectedCatalog',title:'8. Pricelist और Catalogue',text:'Selected Group के लिए Download Pricelist और Download Catalog यहीं मिलते हैं। Catalogue में clickable index भी है।'},
    {sel:'.v102-index-download',title:'9. Index-wise PDF',text:'Price Book Index चुनकर उस Index की complete Pricelist या Only Index PDF download करें।'},
    {sel:'#cartBtn',title:'10. Order Cart',text:'Cart खोलकर quantities, item remarks और Main Note check करें। Share Excel Order से phone की Share Sheet खुलेगी और WhatsApp पर Excel file भेज सकते हैं।'}
  ];
  let tourIndex=0,resizeTimer=null;

  function openHelp(){inject();$('#v129HelpModal').hidden=false;document.body.style.overflow='hidden';}
  function closeHelp(){const m=$('#v129HelpModal');if(m)m.hidden=true;document.body.style.overflow='';}
  function openVideo(){inject();closeHelp();const m=$('#v129VideoModal'),v=$('#v129HelpVideo');m.hidden=false;document.body.style.overflow='hidden';try{v.currentTime=0}catch(_e){};}
  function closeVideo(){const m=$('#v129VideoModal'),v=$('#v129HelpVideo');if(v)try{v.pause()}catch(_e){};if(m)m.hidden=true;document.body.style.overflow='';}
  function openSop(){window.open(HELP_PDF,'_blank','noopener,noreferrer');}

  function targetFor(step){try{return $(step.sel)}catch(_e){return null}}
  function validTarget(step){const el=targetFor(step);if(!el)return null;const r=el.getBoundingClientRect();if(r.width<3||r.height<3)return null;return el;}
  function nearestStep(dir){let idx=tourIndex;for(let i=0;i<steps.length;i++){idx+=dir;if(idx<0||idx>=steps.length)return null;if(validTarget(steps[idx]))return idx}return null}
  function positionTour(){
    const layer=$('#v129TourLayer');if(!layer||layer.hidden)return;
    const step=steps[tourIndex],el=validTarget(step);if(!el){const n=nearestStep(1);if(n==null){endTour();return}tourIndex=n;return showStep()}
    const r=el.getBoundingClientRect(),pad=7,focus=$('#v129TourFocus'),bubble=$('#v129TourBubble'),arrow=$('#v129TourArrow');
    const left=Math.max(5,r.left-pad),top=Math.max(5,r.top-pad),width=Math.min(innerWidth-left-5,r.width+pad*2),height=Math.min(innerHeight-top-5,r.height+pad*2);
    Object.assign(focus.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
    const bw=Math.min(380,innerWidth-24),bh=bubble.offsetHeight||190,spaceBelow=innerHeight-(r.bottom+pad),spaceAbove=r.top-pad;
    let by,bx=Math.min(Math.max(12,r.left+r.width/2-bw/2),innerWidth-bw-12),below=spaceBelow>bh+24||spaceBelow>=spaceAbove;
    if(below)by=Math.min(innerHeight-bh-12,r.bottom+18);else by=Math.max(12,r.top-bh-18);
    Object.assign(bubble.style,{left:bx+'px',top:by+'px'});
    const ax=Math.min(Math.max(r.left+r.width/2-6,18),innerWidth-24);const ay=below?by-7:by+bh-6;
    Object.assign(arrow.style,{left:ax+'px',top:ay+'px',transform:below?'rotate(45deg)':'rotate(225deg)'});
  }
  function showStep(){
    const layer=$('#v129TourLayer');layer.hidden=false;const step=steps[tourIndex],el=validTarget(step);if(!el){const n=nearestStep(1);if(n==null){endTour();return}tourIndex=n;return showStep()}
    $('#v129TourTitle').textContent=step.title;$('#v129TourText').textContent=step.text;$('#v129TourCount').textContent=(tourIndex+1)+' / '+steps.length;
    $('#v129TourPrev').disabled=nearestStep(-1)==null;$('#v129TourNext').textContent=nearestStep(1)==null?'Finish ✓':'Next →';
    try{el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'})}catch(_e){}
    setTimeout(positionTour,260);
  }
  function startTour(){inject();closeHelp();tourIndex=0;document.body.style.overflow='';showStep();}
  function nextTour(){const n=nearestStep(1);if(n==null){endTour();return}tourIndex=n;showStep()}
  function prevTour(){const n=nearestStep(-1);if(n==null)return;tourIndex=n;showStep()}
  function endTour(){const l=$('#v129TourLayer');if(l)l.hidden=true;}

  function bind(){
    inject();
    const help=$('#v129HelpBtn');if(help){help.addEventListener('click',e=>{e.preventDefault();openHelp()})}
    $('#v129HelpClose')?.addEventListener('click',closeHelp);$('#v129HelpModal')?.addEventListener('click',e=>{if(e.target.id==='v129HelpModal')closeHelp()});
    $('#v129StartTour')?.addEventListener('click',startTour);$('#v129WatchVideo')?.addEventListener('click',openVideo);$('#v129OpenSop')?.addEventListener('click',openSop);
    $('#v129VideoClose')?.addEventListener('click',closeVideo);$('#v129VideoModal')?.addEventListener('click',e=>{if(e.target.id==='v129VideoModal')closeVideo()});
    $('#v129TourSkip')?.addEventListener('click',endTour);$('#v129TourNext')?.addEventListener('click',nextTour);$('#v129TourPrev')?.addEventListener('click',prevTour);
    addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(positionTour,80)});addEventListener('scroll',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(positionTour,60)},{passive:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#v129TourLayer')?.hidden)endTour();else if(!$('#v129VideoModal')?.hidden)closeVideo();else if(!$('#v129HelpModal')?.hidden)closeHelp()}else if(!$('#v129TourLayer')?.hidden&&e.key==='ArrowRight')nextTour();else if(!$('#v129TourLayer')?.hidden&&e.key==='ArrowLeft')prevTour()});
    window.RAJ_HELP_CENTER_OPEN=openHelp;window.RAJ_HELP_TOUR_START=startTour;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
