# Project Handoff Document

## 1. Goals
- **Data Accuracy & Precision:** Ensure all financial metrics (Revenue, GMV, AOV, Orders, Conversion Rates) are mathematically precise, uncorrupted by fallbacks, and formatted according to exact currency standards (`RM exact` for tooltips, `RM compact` for axes).
- **Interactive Drill-Downs:** Provide month-to-day timeline drill-downs across Overview, Shopee MY, TikTok MY, Shopee SG, and TikTok SG with simple "Back to months" navigation.
- **Application Security & Hardening:** Audit and resolve Stored XSS vulnerabilities and sensitive data exposure (Google API keys).
- **Resilience & QA:** Handle empty data states gracefully without breaking chart rendering or throwing JavaScript runtime errors.
- **Automated Data Ingestion (Shopee & TikTok APIs):** Transition from manual `.xlsx` file parsing and Google Drive API sync (which suffers from 403 rate-limit cooldowns) to direct, real-time JSON data streaming via official Shopee Open Platform and TikTok Shop Partner APIs.
- **High-Performance Hosting (Cloudflare Pages):** Deploy and host the web application on Cloudflare Pages for global edge speed and unlimited free bandwidth.

---

## 2. Current State
- **Live Production URL:** [https://store-analysis-hygr.pages.dev](https://store-analysis-hygr.pages.dev)
- The HYGR Dashboard is fully functional, responsive, and hardened against Stored XSS attacks.
- Charts render accurately with dynamic data binding.
- Month-to-day drill-down interaction is active on revenue graphs with seamless back navigation.
- Missing data fallbacks (High ATC Products, New vs Existing Buyer, Live Stream GMV) display clean empty-state notices.
- The Google API key status badge renders properly with its checkmark icon.
- Codebase is clean of syntax errors, hosted on GitHub (`ADM1SH/Store-Analysis`), and live on Cloudflare Pages with automatic CI/CD deployment on every `git push`.

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
- `handoff.md`: Project documentation and roadmap.

---

## 4. Changes Made
- **XSS Mitigation (`js/state.js`):** Added a global `esc(str)` HTML sanitizer to escape raw strings (`<`, `>`, `"`, `'`, `&`, `/`, `=`).
- **DOM Sanitization:** Sanitized dynamic table row generation (`td()`, `th()`, `tbl()`) in `js/state.js`, `js/views/campaigns.js`, `js/views/products.js`, `js/views/promotions.js`, and `js/sync.js`.
- **Bug & Error Fixes:** Resolved `ReferenceError` issues (`useProds`, `buyers`) in `js/views/products.js` to ensure empty states render when data is missing.
- **Drill-Down Feature:** Implemented `_oDrillMonth`, `_sDrillMonth`, and `_tDrillMonth` state variables and added "← Back to months" buttons across timeline charts.
- **UI Icon Formatting Fix:** Updated `js/main.js` and `js/sync.js` badge setting from `textContent` to `innerHTML` so Material Symbols checkmark icons render as icons instead of raw code strings.
- **Git & PR Setup:** Created Pull Request `#3` on GitHub (`feat/campaign-traffic-visitors-clicks` branch).
- **Cloudflare Pages Deployment:** Successfully deployed live production app to [https://store-analysis-hygr.pages.dev](https://store-analysis-hygr.pages.dev).

---

## 5. Failed Attempts
- **Indiscriminate `.textContent` usage on HTML Badges:** Using `tag.textContent` to prevent XSS on status badges caused `<span class="material-symbols-outlined">check</span> Saved` to render as literal text on screen. *Resolution:* Reverted badge text insertion to `.innerHTML` while keeping dynamic user input values sanitized with `esc()`.
- **Daily Drill-Down for SG Stores:** Attempted to build daily drill-down support for Shopee SG and TikTok SG, but the source files for SG stores only provide monthly aggregate metrics. *Resolution:* Added fallback handlers so the UI gracefully remains on monthly data without breaking when SG datasets are active.

---

## 6. Next Steps
- **Cloudflare Pages Maintenance:**
  - App is deployed live at [https://store-analysis-hygr.pages.dev](https://store-analysis-hygr.pages.dev). Any push to `main` or PR merge will automatically trigger production deployments.
- **Shopee Open API Integration:**
  1. Obtain company credentials from the company's existing Shopee Open Platform Developer Account ([open.shopee.com](https://open.shopee.com/)):
     - `Partner ID`, `Partner Key / App Secret`, `Shop ID`
  2. Configure Environment Variables in Cloudflare Pages settings for Partner credentials.
  3. Create Cloudflare Pages Functions (`/functions/api/shopee.js`) to stream live Orders, GMV, and Product data into `D.shopee`.
- **TikTok Shop Partner API Integration:**
  1. Register an In-House Custom App on the TikTok Shop Partner Center ([partner.tiktokshop.com](https://partner.tiktokshop.com/)).
  2. Obtain `App Key` and `App Secret`, and configure Cloudflare Pages Environment Variables.
  3. Create Cloudflare Pages Functions (`/functions/api/tiktok.js`) to stream real-time TikTok Shop Orders, Product Analytics, and Affiliate Creator performance directly into `D.tiktok`.
  4. Both Shopee and TikTok live feeds will stream directly into the **Performance Overview**, completely eliminating manual `.xlsx` file downloads and Google Drive rate limits across both platforms.
