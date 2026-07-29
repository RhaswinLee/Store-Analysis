# Project Handoff Document

## 1. Goals
- **Data Accuracy & Precision:** Ensure all financial metrics (Revenue, GMV, AOV, Orders, Conversion Rates) are mathematically precise, uncorrupted by fallbacks, and formatted according to exact currency standards (`RM exact` for tooltips, `RM compact` for axes).
- **Interactive Drill-Downs:** Provide month-to-day timeline drill-downs across Overview, Shopee MY, TikTok MY, Shopee SG, and TikTok SG with simple "Back to months" navigation.
- **Application Security & Hardening:** Audit and resolve Stored XSS vulnerabilities and sensitive data exposure (Google API keys).
- **Resilience & QA:** Handle empty data states gracefully without breaking chart rendering or throwing JavaScript runtime errors.
- **Data Pipeline Optimization:** Solve Google Drive 403 rate-limit/cooldown blocks and explore automated ingestion from Shopee Seller Center.

---

## 2. Current State
- The HYGR Dashboard is fully functional, responsive, and hardened against Stored XSS attacks.
- Charts render accurately with dynamic data binding.
- Month-to-day drill-down interaction is active on revenue graphs with seamless back navigation.
- Missing data fallbacks (High ATC Products, New vs Existing Buyer, Live Stream GMV) display clean empty-state notices.
- The Google API key status badge renders properly with its checkmark icon.
- Codebase is clean of syntax errors and runs client-side using Vanilla JS and Chart.js.

---

## 3. Active Files
- `index.html`: Main HTML template, structure, and modal containers.
- `style.css`: Design system tokens, Glassmorphism aesthetics, responsive layouts.
- `js/state.js`: Global state management (`S`), data store (`D`), formatting helpers (`RMexact`, `esc`), and Chart.js factory (`mkChart`).
- `js/sync.js`: Google Drive API integration, worker pipeline (`js/worker.js`), `_fetchLock` rate-limiting, and IndexedDB caching.
- `js/main.js`: App initialization, tab switching, and local storage bindings.
- `js/views/overview.js`: Performance Overview view, top-level revenue charts, and month-to-day drill-down logic.
- `js/views/shopee.js`: Shopee MY analytics view and daily drill-down handling.
- `js/views/tiktok.js`: TikTok MY analytics view and daily drill-down handling.
- `js/views/shopee-sg.js`: Shopee SG analytics view.
- `js/views/tiktok-sg.js`: TikTok SG analytics view.
- `js/views/products.js`: Product performance tables and chart renderers.
- `js/views/promotions.js`: Promotion and voucher performance analytics.
- `js/views/campaigns.js`: Campaign analytics view.

---

## 4. Changes Made
- **XSS Mitigation (`js/state.js`):** Added a global `esc(str)` HTML sanitizer to escape raw strings (`<`, `>`, `"`, `'`, `&`, `/`, `=`).
- **DOM Sanitization:** Sanitized dynamic table row generation (`td()`, `th()`, `tbl()`) in `js/state.js`, `js/views/campaigns.js`, `js/views/products.js`, `js/views/promotions.js`, and `js/sync.js`.
- **Bug & Error Fixes:** Resolved `ReferenceError` issues (`useProds`, `buyers`) in `js/views/products.js` to ensure empty states render when data is missing.
- **Drill-Down Feature:** Implemented `_oDrillMonth`, `_sDrillMonth`, and `_tDrillMonth` state variables and added "← Back to months" buttons across timeline charts.
- **UI Icon Formatting Fix:** Updated `js/main.js` and `js/sync.js` badge setting from `textContent` to `innerHTML` so Material Symbols checkmark icons render as icons instead of raw code strings.

---

## 5. Failed Attempts
- **Indiscriminate `.textContent` usage on HTML Badges:** Using `tag.textContent` to prevent XSS on status badges caused `<span class="material-symbols-outlined">check</span> Saved` to render as literal text on screen. *Resolution:* Reverted badge text insertion to `.innerHTML` while keeping dynamic user input values sanitized with `esc()`.
- **Daily Drill-Down for SG Stores:** Attempted to build daily drill-down support for Shopee SG and TikTok SG, but the source files for SG stores only provide monthly aggregate metrics. *Resolution:* Added fallback handlers so the UI gracefully remains on monthly data without breaking when SG datasets are active.

---

## 6. Next Steps
- **Automating Data Ingestion from Shopee Seller Center:**
  1. **Shopee Open API Integration:** Set up an official Shopee Developer account (`open.shopee.com`) to stream live orders, GMV, and performance data directly via REST APIs.
  2. **Chrome Extension Helper:** Build a lightweight Chrome extension that extracts metrics or triggers report exports directly from an active Seller Center browser session.
- **Google Drive Alternatives (Overcoming Rate Limits & 403 Cooldowns):**
  1. **GitHub Repository / Raw Hosting:** Store `.xlsx` files inside a GitHub repo or release asset pipeline, fetching via `raw.githubusercontent.com` (eliminates Google Drive rate limits).
  2. **Local `/data` Directory:** Move source Excel files directly into a `data/` folder inside the web project for instant, zero-latency loading.
  3. **Cloud Object Storage (Cloudflare R2 / S3):** Upload files to Cloudflare R2 or AWS S3 with CORS headers for scalable, reliable API access.
