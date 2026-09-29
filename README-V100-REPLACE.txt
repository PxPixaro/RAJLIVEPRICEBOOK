RAJ LIVE PRICE BOOK — V100 FAST REPLACEMENT
===========================================

Replace on server:
1) index.html -> project root index.html
2) Entire js/ folder contents -> project js/ folder

CSS / assets / product images do NOT need replacement.

Main V100 performance fixes:
- Removed duplicate V99 filter engine from v50.js. v50.js is mobile shell only.
- Segment filtering uses a prebuilt segment-row index instead of rescanning all 44,639 rows.
- Segment exact filtering uses pre-tokenized segment metadata (no repeated regex per row).
- Huge Model/Category native select option lists are lazy-rendered; Segment click no longer creates 2k-5k option nodes immediately.
- All Groups uses master/cached facet lists instead of repeated full-row scans.
- Visible-column checks sample broad result sets instead of scanning every matching row x every column.
- AAYUB first view is built with one quick scan instead of hundreds of idle callbacks.
- Full cache warmup uses larger time-sliced batches.
- app.js full-row universal-search blob is lazy; background metadata is much lighter.
- v45 NEW/DEAD/FSN indexing is delayed until after the main UI is ready.
- Image search index/engine is loaded only when Image Search is actually opened.
- v94 content-match regex is compiled/cached once per selected value.

Behavior preserved:
- Group -> Sub Group -> Segment -> Vehicle -> Model -> Category deep cascade.
- Vehicle/Model content matching (comma/slash/raw Price Book values).
- Clean Vehicle Master values for Segment/Vehicle/Model.
- Category from Price Book.
- PDF/cart/images/login/admin logic unchanged except performance scheduling.

After upload:
- Hard refresh: Ctrl+F5 (or Ctrl+Shift+R)
- If CDN/Cloudflare is used, purge cache once.

Version: V100
