RAJ AGENCIES — LIVE PRICE BOOK DEMO
=====================================

1. index.html को Chrome या Edge में खोलें।
2. Group / Segment / Vehicle / Model / Category से फिल्टर करें।
3. जिस कॉलम में चुने हुए परिणामों में कोई डेटा नहीं है या पूरा 0 है, वह अपने-आप हाइड होगा।
4. Group चुनने के बाद Selected Group Downloads में “Download Pricelist” क्लिक करें और Print dialog में “Save as PDF” चुनें।
5. नई Excel अपडेट करने के लिए “Synchronize Excel” क्लिक करके वही headings वाली XLSX चुनें।
6. Browser नई synchronized data को IndexedDB में save रखता है।

FOLDER STRUCTURE
----------------
index.html
css/style.css
js/app.js
js/data.js
assets/company-logo/
assets/brand-logos/
assets/data/price-book.xlsx

BRAND LOGO NAMING
-----------------
BLUEBIRD.jpg
KLIPWEL.jpg
POOJA.jpg
ATOP.png
HOLDON.png

नई brand जोड़ने के लिए:
- logo assets/brand-logos में रखें
- js/app.js के BRAND_LOGOS object में GROUP नाम और file path जोड़ें

IMPORTANT
---------
Excel synchronization के लिए SheetJS CDN पहली बार internet से load होता है।
Embedded demo data internet के बिना भी दिखेगा।
2 लाख products के production version के लिए server/database API recommended है।


V2 UPDATE
---------
- GROUP, SEGMENT, VEHICLE, MODEL, CATAGORIES/CATEGORIES, VIEW BY और LIST DATE डेटा में उपलब्ध रहेंगे, लेकिन grid/PDF में columns के रूप में नहीं दिखेंगे।
- VIEW BY के अनुसार grid और PDF में automatic mini headings बनेंगी।
- Supported VIEW BY values: Categories, Vehicle, Model, Segment.
- हर mini heading के अंदर products CODE / Part Number के natural order में sort होंगे।
- LIST DATE column का value main heading में highlight होकर screen और PDF दोनों में दिखेगा।
- PDF हमेशा A4 Landscape में पूरा filtered data print करेगा, केवल current page नहीं।


V3 UPDATE
---------
- Hero में RAJ AGENCIES और छोटी tagline “Live Price List”।
- पहली बार dashboard खोलने पर Excel का पहला GROUP default select होगा।
- Group dropdown में “All groups” चुनकर Segment-wise multi-brand PDF बनाया जा सकता है।
- Segment CAR / TRACTOR / LCV / HCV चुनने पर उस segment के साथ UNIVERSAL products भी हमेशा शामिल होंगे।
- All groups + Segment filter पर PDF पहले GROUP-wise और फिर VIEW BY mini-heading-wise बनेगी।
- Company List Date और Last Updated दोनों PDF header में print होंगे।


V4: SUB GROUP filter, dynamic future columns, compact mobile view, every-page PDF watermark, and GROUP-wise Google Drive catalog dropdown added.


V5 FIXED EXCEL MAPPING
-----------------------
Uploaded fixed Excel mapped: 44641 products, 26 columns.
Required fixed headers: GROUP | SUB GROUP | CODE | PRODUCT NAME | UNIT | GST | RATE | MRP | STD PKG | CRT PKG | SIZE MM | SIZE INCH | THICKNESS MM | PERFORATED | SS CLAMP | BOX QTY | PANA NO. | PACK | API GRADE | RANGE K.M | SEGMENT | VEHICLE | MODEL | CATAGORIES | VIEW BY | LIST DATE
Synchronize Excel button reads the first sheet and automatically includes any newly added columns.
All-new columns appear only when the selected data contains a nonblank/nonzero value.


V6 UPDATE
- Product count badge now shows total filtered products for that mini group, not only current page rows.
- All Groups sorting: GROUP, then SUB GROUP, then CODE/Part Number.
- If VIEW BY is blank, SUB GROUP is used as mini heading.
- Company List Date is more bold and highlighted.
- Dynamic future columns remain supported through Synchronize Excel.


V7: All brand logos imported. Selected GROUP logo is automatically matched by filename and printed in PDF upper-right. Every filter has a search field. Embedded data renders immediately; cached sync data loads afterward without initial blank screen.


V8 UPDATE
---------
- UNIVERSAL SEARCH text + voice search added. It searches every Excel value.
- Chrome/Edge microphone permission is required for voice search.
- Product image grid column is screen-only and never prints in PDF.
- Product images folder format (दोनों format supported हैं):
  Optimized: assets/Products Images/<GROUP - OK>/<PART NUMBER>_1.webp
  Example: assets/Products Images/AAYUB - OK/AA201_1.webp
  Old format: assets/Products Images/<GROUP>/<PART NUMBER>.png
  Example: assets/Products Images/Aayub/AA201.png
- Supported image extensions: webp, png, jpg, jpeg (upper/lower case).
- Main image suffix _1 और optional _01 भी auto-detect होंगे।
- Click View Image to open zoom viewer; use +, −, X or Escape.
- Sample Aayub images mapped to AA201, AA202 and AA203.
- PDF right upper logo continues to map from assets/brand-logos.


V9 BRAND LOGO AUTO-MAPPING
--------------------------
- Uploaded brand-logo ZIP से 60 logo files mapped.
- PDF left side हमेशा Raj Group logo रहेगा.
- PDF right side selected GROUP का matching brand logo रहेगा.
- Match uppercase/lowercase, spaces, dots, dashes और common extra text को ignore करके होता है.
- Matching logo न मिले तो right side खाली रहेगा; Raj Group logo repeat नहीं होगा.
- Logo update करने के लिए उसी filename की image assets/brand-logos में replace करें.
- Company logo बदलने पर browser cache से पुराना logo दिखे तो hard refresh करें: Ctrl+F5.
- नया brand logo add करने के बाद brand-logos-manifest.json में filename add करना जरूरी है.
  आसान तरीका: यही ZIP दोबारा भेजें; manifest regenerate हो जाएगा.


V10 LOGO FIX
------------
- brand-logos.js अब index.html में app.js से पहले load होता है.
- 60 logo filenames browser mapping में शामिल हैं.
- Allied group अब Allied.jpg से match होगा.
- Matching brand logo न मिले तो PDF right side खाली रहेगा; Raj Group repeat नहीं होगा.
- Existing logo बदलने के लिए उसी filename को replace करें और Ctrl+F5 करें.


V11 DESIGN + DATA UPDATE
------------------------
- Latest Excel mapped: 44,641 products and 28 columns.
- Table and PDF use Cambria font.
- Only RATE and MRP values are bold blue.
- All other table values are normal black, non-bold, non-italic.
- Serial number, CODE and PRODUCT NAME keep their existing alignment.
- Every other data column is right-aligned.
- Dashboard redesigned with Blue, White, Dark Orange and Dark Yellow.
- Future Excel columns continue to import automatically through Synchronize Excel.


V13 SEARCH + PDF FIX
--------------------
- Segment, Vehicle और अन्य filter search boxes अब contains/partial matching करते हैं.
  Example: 1613 लिखने पर उस field में 1613 जहाँ भी है, सभी matching products आएँगे.
- Search Code / Product:
  * 1013 -> KX1013, AA1013 जैसे सभी contains matches.
  * KX1013 exact code मौजूद है -> केवल exact KX1013.
- PDF note added:
  “આ Pricelist System Generated છે Rate / Mrp All Details Confirm કરી લેવું”
- Dashboard/table में नीचे scroll होने के बाद भी Download PDF हमेशा first page की heading से शुरू होगा.
- Print के बाद dashboard का पुराना scroll position restore होगा.

V14 HEADER + SELECTED GROUP CATALOG
-----------------------------------
- Raj Group logo, Live Price Book heading, sync status, Synchronize Excel,
  Download PDF and hero details are now inside one centered main header frame.
- Header frame maximum width is 1500px, matching the marked desktop area.
- Old Catalog dropdown is removed from the top header.
- Selected Price Book toolbar now shows the selected GROUP catalog in the center.
- If a catalog link/PDF is configured, the customer gets Download Catalog.
- If no external catalog is configured, the same button downloads the selected
  group's complete Price Book through the browser PDF dialog.
- Catalog links can be added in js/catalog-links.js or through Excel columns:
  CATALOG LINK / CATALOG URL / CATALOG.
- Local catalog PDFs can be kept in assets/catalogs/.


V15 WATERMARK + DUAL DOWNLOADS
-------------------------------
- PDF print के हर page पर Raj Group logo अब लगभग full-page size में repeat होगा.
- Watermark content के ऊपर low transparency (3%) में रखा गया है ताकि logo दिखे और text साफ पढ़े.
- Selected Group card में दो अलग blue/white 3D buttons हैं:
  1) Download Catalog
  2) Download Pricelist
- Catalog PDF/link configured होने पर original catalog खुलेगा/download होगा.
- Catalog link pending होने पर Download Catalog selected Pricelist PDF को fallback के रूप में खोलेगा.
- Download Pricelist हमेशा browser print dialog खोलता है; Destination में Save as PDF चुनें.


V16 PROFESSIONAL UI + MOBILE APP VIEW
--------------------------------------
- पूरे dashboard का color combination professional Navy, Azure, Teal और White theme में बदला गया है.
- Header के top से Download PDF button हटाया गया है.
- Catalog और Pricelist downloads अब केवल Selected Group Downloads card से मिलेंगे.
- Desktop layout अधिक clean, balanced और compact बनाया गया है.
- Mobile header, hero, filters, selected group card, summary और pagination को app-style compact layout दिया गया है.
- Mobile form controls 16px रखे गए हैं ताकि iPhone/Android browser input focus पर unwanted auto-zoom न करे.
- Mobile में Catalog और Pricelist buttons एक ही row में compact रूप से दिखाई देंगे.
- Existing PDF watermark, group catalog, pricelist printing, Excel synchronization और filters unchanged हैं.


V18 RAJ GROUP LOGO EXACT COLOR THEME
-------------------------------------
- पूरे dashboard में दिए गए Raj Group 3D logo की exact core palette apply की गई है.
- Primary colors: Bright Blue #0188EE, Medium Blue #025DBE, Navy #0E337E,
  Yellow #FDEF26, Gold #F5B00E, Orange #DC6C0B और Charcoal #322821.
- Header, hero, filters, cards, buttons, table, headings, pagination, modal और mobile view सभी इसी palette में हैं.
- Teal/green professional theme पूरी तरह हटाकर Raj Group blue-yellow-orange identity दी गई है.
- Supplied Raj Group 3D logo assets/company-logo/raj-group-logo.png में installed है.
- Existing mobile app layout, downloads, watermark, filters और Excel sync unchanged हैं.

V18 UPDATE:
- Selected Group Downloads panel se 3D gradient aur raised shadows hata diye gaye hain.
- PDF icon ko standard PDF red color diya gaya hai.
- Download Catalog button flat white/blue outline style me hai.
- Download Pricelist button flat solid Raj Group blue style me hai.
- Desktop aur mobile dono views me clean normal professional format rakha gaya hai.


V19 LIGHT BLUE GROUP BAR + CATALOG LINK + PDF COMPRESSION
---------------------------------------------------------
- Grid ki mini/group heading yellow se light blue ki gayi hai aur text bold black hai.
- Hero ke right-side RAJ AGENCIES aur LIVE PRICE LIST text white hai.
- js/catalog-links.js me sabhi Excel GROUP names ready-to-fill entries ke saath diye gaye hain.
- Download Catalog sirf configured Google Drive/local catalog link kholta hai; missing link par Pricelist fallback nahi hota.
- Download Pricelist current selected/filtered grid ke saare products ko print karta hai, sirf visible page ko nahi.
- Print watermark ab assets/company-logo/raj-group-watermark-small.jpg lightweight compressed file use karta hai.
- Browser Print > Save as PDF ka exact final size browser/version aur products count par depend karega, lekin large original watermark embed nahi hoga.

- Screen/PDF header Raj Group logo ab optimized WebP asset use karta hai; brand logos bhi print-size ke hisaab se optimized hain.


V20 PNG WATERMARK + GROUP PDF NAME + FAST STARTUP
---------------------------------------------------
- Supplied transparent 1536x1024 PNG watermark installed at:
  assets/company-logo/rajgroup-watermark-93kb.png
- Download Pricelist print dialog ka suggested PDF filename selected GROUP name hota hai.
  Example: Aayub group select karne par filename Aayub.pdf.
- Initial dashboard load ab SheetJS CDN ka wait nahi karta. Excel reader sirf Sync Excel click karne par lazy-load hota hai.
- Embedded 44,641-product data repeated object keys ke badle compact dictionary format me store hai.
  js/data.js approximately 20.6 MB se ~6 MB hua, isliye local HTML parse/render kaafi fast hai.
- Cached synchronized Excel first paint ke baad idle time me load hota hai; dashboard opening par blank wait nahi hota.
- Print CSS me system fonts, flat backgrounds aur no-shadow mode use karke PDF size ko aur reduce kiya gaya hai.
- Download Catalog behavior unchanged: js/catalog-links.js me selected GROUP ka Google Drive/local URL add karne par wahi catalog open hota hai.


V21 SUB GROUP GRID + SINGLE SEGMENT + SMOOTH PRINT
---------------------------------------------------
- Screen grid ki light-blue divider row ab hamesha SUB GROUP dikhati hai, jab SUB GROUP data available ho.
- PDF Pricelist me SUB GROUP divider rows intentionally print nahi hoti; sirf clean product rows print hoti hain.
- Segment dropdown combined Excel values ko comma se split karke single normalized options dikhata hai.
- CAR select karne par CAR ke saath CAR,HCV / CAR,LCV jaise multi-segment products bhi include hote hain.
- HCV, LCV, TRACTOR, 2 WHEELERS, 3 WHEELERS aur EARTHMOVERS par bhi wahi token-based matching apply hoti hai.
- Common spelling variants (TRACT0R / TRACTRO / TRACTORS, EARTHMOVER variants) normalized hain.
- Download Pricelist ab main dashboard ke full table ko do baar render nahi karta.
- Ek dedicated lightweight print iframe sirf filtered product rows, required columns aur compressed watermark ke saath banaya jata hai.
- Print CSS me sticky rows, image buttons, subgroup headings, dashboard cards, shadows aur animations nahi hain, isliye preview smoother hota hai.
- Product image button row lookup cache kiya gaya hai, jisse screen grid rendering bhi faster hoti hai.


FINAL V22 UPDATE
----------------
1. Print PDF me RATE aur MRP ke column titles pure white rakhe gaye hain.
2. RATE/MRP ki product values blue aur bold hi rahengi.
3. Print table fixed A4 landscape width me fit hoti hai; horizontal overflow kam kiya gaya hai.
4. Product-name aur long headings safe wrapping ke saath render hote hain.
5. Print preview trigger fonts aur layout ready hone ke baad hota hai, jisse rendering stable rahe.
