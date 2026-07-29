/* ─── GOOGLE DRIVE SYNC ─── */
const GS = { apiKey: localStorage.getItem('hygr_gapi') || '' };
const _ls = k => localStorage.getItem(k) || '';
const PLAT_D = { shopee:'shopee', tiktok:'tiktok', 'shopee-sg':'shopeeSG', 'tiktok-sg':'tiktokSG' };
const PLAT_S = {
  shopee:     { url:_ls('hygr_url_shopee')||_ls('hygr_drive'),    fileId:_ls('hygr_fid_shopee')||_ls('hygr_file_id'),  name:_ls('hygr_fnm_shopee')||_ls('hygr_file_name'), nav:[] },
  tiktok:     { url:_ls('hygr_url_tiktok'),    fileId:_ls('hygr_fid_tiktok'),    name:_ls('hygr_fnm_tiktok'),    nav:[] },
  'shopee-sg':{ url:_ls('hygr_url_shopeesg'),  fileId:_ls('hygr_fid_shopeesg'),  name:_ls('hygr_fnm_shopeesg'),  nav:[] },
  'tiktok-sg':{ url:_ls('hygr_url_tiktoksg'),  fileId:_ls('hygr_fid_tiktoksg'),  name:_ls('hygr_fnm_tiktoksg'),  nav:[] },
};

// ── Cache helpers — persist parsed data across sessions ──
const _CACHE_FIELDS=['m2026','m2025','channelByMonth','trafficSourcesByMonth','adsByMonth','adsDailyByDate','adsDailySrc','adsSrcOrder','buyers','products','breakdown','affiliate','ads','daily','composition','promoRevenue','voucherPerf','promoListArr','voucherListArr'];

// ── Background Worker for XLSX Parsing ──
const xlsxWorker = new Worker('js/worker.js');
let workerReqId = 0;
const workerQueue = new Map();
xlsxWorker.onmessage = function(e) {
  const { id, success, data, error } = e.data;
  if(workerQueue.has(id)){
    const { resolve, reject } = workerQueue.get(id);
    workerQueue.delete(id);
    if(success) resolve(data);
    else reject(new Error(error));
  }
};
function parseXlsxWorker(ab) {
  return new Promise((resolve, reject) => {
    const id = ++workerReqId;
    workerQueue.set(id, { resolve, reject });
    xlsxWorker.postMessage({ id, ab }, [ab]);
  });
}

const CACHE_VER=9; // Bump when adding new parsed fields to force re-sync of old caches
async function saveCache(platform){
  try{
    const dKey=PLAT_D[platform];
    if(!D[dKey]) return;
    const snap={ts:Date.now(),_v:CACHE_VER};
    _CACHE_FIELDS.forEach(f=>{if(D[dKey][f]!==undefined) snap[f]=D[dKey][f];});
    await idbKeyval.set(`hygr_cache_${platform.replace(/-/g,'')}`, snap);
  }catch(e){}
}
async function restoreCache(platform){
  try{
    const snap = await idbKeyval.get(`hygr_cache_${platform.replace(/-/g,'')}`);
    if(!snap) return false;
    // Discard caches written before CACHE_VER was introduced — they lack adsDailyByDate
    if((snap._v||0)<CACHE_VER) return false;
    const dKey=PLAT_D[platform];
    if(!D[dKey]) return false;
    _CACHE_FIELDS.forEach(f=>{
      if(snap[f]!==undefined&&(Array.isArray(snap[f])?snap[f].length:Object.keys(snap[f]).length))
        D[dKey][f]=snap[f];
    });
    const age=snap.ts?Math.round((Date.now()-snap.ts)/60000):0;
    const ageStr=age<1?'just now':age<60?`${age}m ago`:`${Math.round(age/60)}h ago`;
    if(PLAT_S[platform].name) setPlatformStatus(platform,'connected',`${PLAT_S[platform].name} · cached ${ageStr}`);
    if(typeof clearFilterCache === 'function') clearFilterCache();
    return true;
  }catch(e){return false;}
}

function setSyncStatus(status,msg){
  const dot=document.getElementById('syncDot');
  const txt=document.getElementById('syncText');
  const conn=Object.values(PLAT_S).filter(p=>p.name).length;
  if(conn>0){
    dot.className='sync-dot connected';
    txt.innerHTML=`<strong>🟢 Live</strong> — ${conn} platform${conn>1?'s':''} synced from Google Drive`;
  } else if(status==='fetching'){
    dot.className='sync-dot fetching';
    txt.innerHTML=`<strong>🟡 Fetching…</strong> — Reading from Google Drive`;
  } else if(status==='error'){
    dot.className='sync-dot error';
    txt.innerHTML=`<strong>🔴 Error</strong> — ${msg||'Connection failed'}`;
  } else {
    dot.className='sync-dot idle';
    txt.innerHTML=`Not connected — using built-in demo data · <button class="btn-sm ghost" onclick="showPanel('sync')" style="font-size:10px;padding:2px 8px;margin-left:2px">Configure ↗</button>`;
  }
}

function syncLog(msg,isError=false){
  const el=document.getElementById('syncLog');
  if(!el) return;
  const t=new Date().toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const line=`<div style="color:${isError?'var(--red)':'var(--t3)'}">${t} ${msg}</div>`;
  el.innerHTML=(el.innerHTML==='—'?'':el.innerHTML)+line;
  el.scrollTop=el.scrollHeight;
  const lines=el.querySelectorAll('div');
  if(lines.length>30) lines[0].remove();
}

function saveApiKey(){
  const key=document.getElementById('apiKeyInp').value.trim();
  if(!key){syncLog('Please enter an API key.',true);return;}
  GS.apiKey=key;
  localStorage.setItem('hygr_gapi',key);
  const tag=document.getElementById('apiKeyTag');
  tag.textContent='✓ Saved';
  tag.style.cssText='background:var(--green-d);color:var(--green)';
  syncLog('API key saved.');
}

function parseDriveLink(url){
  const sheet=url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if(sheet){const gid=(url.match(/gid=(\d+)/)||[])[1]||'0';return{type:'sheet',id:sheet[1],gid};}
  const folder=url.match(/folders\/([a-zA-Z0-9-_]+)/);
  if(folder) return{type:'folder',id:folder[1]};
  return null;
}

// ── Per-platform status ──
function setPlatformStatus(platform,status,msg=''){
  const k=platform.replace(/-/g,'');
  const el=document.getElementById(`statusLine_${k}`);
  if(!el) return;
  const icons={connected:'🟢 ',fetching:'🟡 ',error:'🔴 ',idle:''};
  const colors={connected:'var(--green)',fetching:'#f59e0b',error:'var(--red)',idle:'var(--t3)'};
  el.style.color=colors[status]||'var(--t3)';
  el.textContent=(icons[status]||'')+msg;
  setSyncStatus();
}

// ── Connect a platform ──
async function connectPlatform(platform){
  const k=platform.replace(/-/g,'');
  const inp=document.getElementById(`pLink_${k}`);
  if(!inp) return;
  const url=inp.value.trim();
  if(!url){syncLog(`⚠ Paste a Drive folder URL for ${platform}.`,true);return;}
  if(!GS.apiKey){syncLog('⚠ Enter and save your Google API key first.',true);return;}
  const parsed=parseDriveLink(url);
  if(!parsed||parsed.type!=='folder'){syncLog('⚠ Unrecognised URL — paste a Drive folder link (not a file link).',true);return;}
  PLAT_S[platform].url=url;
  PLAT_S[platform].nav=[];
  localStorage.setItem(`hygr_url_${k}`,url);
  setPlatformStatus(platform,'fetching','Connecting…');
  syncLog(`[${platform}] Connecting to folder…`);
  await loadPlatformFolder(platform,parsed.id,'My Drive');
}

// ── Disconnect a platform ──
function disconnectPlatform(platform){
  const k=platform.replace(/-/g,'');
  PLAT_S[platform]={url:'',fileId:'',name:'',nav:[]};
  [`hygr_url_${k}`,`hygr_fid_${k}`,`hygr_fnm_${k}`].forEach(key=>localStorage.removeItem(key));
  const inp=document.getElementById(`pLink_${k}`);
  if(inp) inp.value='';
  setPlatformStatus(platform,'idle','Not connected');
  syncLog(`[${platform}] Disconnected.`);
}

// ── Test data: load straight from a local folder, no Google Drive involved ──
// Mirrors loadPlatformFolder's sub-folder routing (Sales Data / Product Performance / everything
// else) so the exact same parse pipeline runs — only the file source changes.
function pickTestDataFolder(platform){
  const inp=document.createElement('input');
  inp.type='file'; inp.webkitdirectory=true; inp.multiple=true;
  inp.onchange=()=>{ if(inp.files.length) loadTestDataFiles(platform,[...inp.files]); };
  inp.click();
}
async function loadTestDataFiles(platform,files){
  const rootName=(files[0].webkitRelativePath||files[0].name).split('/')[0];
  syncLog(`[${platform}] Loading local test data from "${rootName}" (${files.length} file(s))…`);
  setPlatformStatus(platform,'fetching','Loading local test data…');
  const toFileObj=f=>({id:'local:'+(f.webkitRelativePath||f.name),name:f.name,mimeType:XLSX_MIME,_localFile:f});

  const bySub={};
  for(const f of files){
    if(!isLoadable(f)) continue;
    const parts=(f.webkitRelativePath||f.name).split('/');
    const sub=parts.length>=2?parts[parts.length-2]:'';
    (bySub[sub]||(bySub[sub]=[])).push(f);
  }
  const salesFolder=Object.keys(bySub).find(s=>s.toLowerCase()==='sales data');
  let toLoad=[],prodFiles=[];
  PLAT_S[platform]._extraXlsx=[];
  if(salesFolder){
    const rev=filterRevFiles(bySub[salesFolder],platform);
    toLoad=(rev.length?rev:bySub[salesFolder]).map(toFileObj);
    const prodFolder=Object.keys(bySub).find(s=>s!==salesFolder&&s.toLowerCase().includes('product'));
    if(prodFolder) prodFiles=bySub[prodFolder].map(toFileObj);
    for(const sub of Object.keys(bySub)){
      if(sub===salesFolder||sub===prodFolder) continue;
      PLAT_S[platform]._extraXlsx.push(...bySub[sub].map(toFileObj));
    }
  } else {
    const all=files.filter(isLoadable);
    const rev=filterRevFiles(all,platform);
    toLoad=(rev.length?rev:all).map(toFileObj);
  }
  if(!toLoad.length){
    setPlatformStatus(platform,'error','No matching files in folder');
    syncLog(`[${platform}] No revenue files found in "${rootName}".`,true);
    return;
  }
  if(prodFiles.length) await loadProductFiles(prodFiles,platform);
  await loadAllFilesInFolder(toLoad,rootName+' (local test data)',platform);
}

// ── Load a platform's folder ──
// Strategy: if a "Sales Data" sub-folder exists, load ONLY from it (revenue only).
// Otherwise scan all sub-folders and apply filename pattern filter.
async function loadPlatformFolder(platform,folderId,folderName){
  try{
    const fields=encodeURIComponent('files(id,name,mimeType,modifiedTime,webContentLink)');
    const fetchFolder=async id=>{
      const r=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${id}' in parents`)}&key=${GS.apiKey}&fields=${fields}&orderBy=name&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`);
      const d=await r.json();
      if(!r.ok) throw new Error(d.error?.message||'Drive API error '+r.status);
      return d.files||[];
    };

    const rootFiles=await fetchFolder(folderId);
    const loadables=rootFiles.filter(isLoadable);
    const subfolders=rootFiles.filter(f=>f.mimeType===FOLDER_MIME);
    PLAT_S[platform].nav=[{id:folderId,name:folderName}];

    let toLoad=[];

    if(loadables.length>0){
      // Files directly in connected folder — apply filename filter
      const rev=filterRevFiles(loadables,platform);
      toLoad=rev.length?rev:loadables;
      // Non-revenue xlsx files get scanned for extra sheets (sales_composition, Source Contribution, etc.)
      if(rev.length){
        PLAT_S[platform]._extraXlsx=loadables.filter(f=>{
          const isXlsx=f.name.toLowerCase().endsWith('.xlsx')||f.name.toLowerCase().endsWith('.xls')||f.mimeType===XLSX_MIME||f.mimeType===XLS_MIME;
          return isXlsx&&!toLoad.find(t=>t.id===f.id);
        });
      }
      syncLog(`[${platform}] Found ${toLoad.length} revenue file(s) in "${folderName}"${PLAT_S[platform]._extraXlsx?.length?`, ${PLAT_S[platform]._extraXlsx.length} extra xlsx to scan`:''}`);
    } else if(subfolders.length>0){
      // Prefer "Sales Data" sub-folder for revenue data
      const salesFolder=subfolders.find(f=>f.name.toLowerCase()==='sales data');
      if(salesFolder){
        syncLog(`[${platform}] Loading from "Sales Data" sub-folder…`);
        const sfl=(await fetchFolder(salesFolder.id)).filter(isLoadable);
        const rev=filterRevFiles(sfl,platform);
        toLoad=rev.length?rev:sfl;
        // Non-revenue xlsx files also get scanned for extra sheets (Source Contribution, etc.)
        PLAT_S[platform]._extraXlsx=sfl.filter(f=>{
          const isXlsx=f.name.toLowerCase().endsWith('.xlsx')||f.name.toLowerCase().endsWith('.xls')||f.mimeType===XLSX_MIME||f.mimeType===XLS_MIME;
          return isXlsx&&!toLoad.find(t=>t.id===f.id);
        });
        syncLog(`  → ${toLoad.length} revenue file(s) to load${PLAT_S[platform]._extraXlsx.length?`, ${PLAT_S[platform]._extraXlsx.length} extra xlsx to scan`:''}`)
        // Also load product performance data from separate sub-folder
        const prodFolder=subfolders.find(f=>f.name.toLowerCase().includes('product performance')||f.name.toLowerCase().includes('product'));
        if(prodFolder&&prodFolder.id!==salesFolder.id){
          try{
            const pfl=(await fetchFolder(prodFolder.id)).filter(isLoadable);
            if(pfl.length) await loadProductFiles(pfl,platform);
          }catch(e){syncLog(`[${platform}] Product data: ${e.message}`,true);}
        }
        // Also scan sibling sub-folders that feed extra cards (Buyers Composition, Promotion Revenue, Voucher Performance)
        const extraFolderPatterns=[/sales.?composition/i,/discount performance/i,/voucher performance/i];
        for(const pat of extraFolderPatterns){
          const ef=subfolders.find(f=>pat.test(f.name));
          if(!ef||ef.id===salesFolder.id) continue;
          try{
            const efl=(await fetchFolder(ef.id)).filter(isLoadable);
            PLAT_S[platform]._extraXlsx.push(...efl);
            if(efl.length) syncLog(`  → "${ef.name}": ${efl.length} file(s) queued for extra sheets`);
          }catch(e){syncLog(`[${platform}] ${ef.name}: ${e.message}`,true);}
        }
      } else {
        // No "Sales Data" sub-folder — scan all, filter by filename pattern
        syncLog(`[${platform}] Scanning ${subfolders.length} sub-folder(s)…`);
        let all=[];
        for(const sf of subfolders){
          const sfl=(await fetchFolder(sf.id)).filter(isLoadable);
          if(sfl.length) syncLog(`  → "${sf.name}": ${sfl.length} file(s)`);
          all.push(...sfl);
        }
        const rev=filterRevFiles(all,platform);
        toLoad=rev.length?rev:all;
        if(rev.length&&rev.length<all.length)
          syncLog(`[${platform}] Using ${rev.length} revenue file(s) of ${all.length} total`);
      }
    }

    if(!toLoad.length){
      setPlatformStatus(platform,'error','No xlsx/csv files found');
      syncLog(`[${platform}] No data files found.`,true);
      return;
    }
    await loadAllFilesInFolder(toLoad,folderName,platform);
  }catch(e){
    setPlatformStatus(platform,'error',e.message.slice(0,50));
    syncLog(`[${platform}] Error: ${e.message}`,true);
  }
}

// Revenue filename prefixes per platform — only matching files update monthly revenue
const PLAT_REV_PREFIX={
  'shopee':    'hygr.malaysia.shopee-shop-stats.',
  'tiktok':    'sales data',
  'shopee-sg': null,
  'tiktok-sg': null,
};
function filterRevFiles(files,platform){
  const prefix=PLAT_REV_PREFIX[platform];
  if(!prefix) return files;
  return files.filter(f=>f.name.toLowerCase().startsWith(prefix.toLowerCase()));
}

const FOLDER_MIME='application/vnd.google-apps.folder';
const SHEET_MIME='application/vnd.google-apps.spreadsheet';
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIME='text/csv';
const XLS_MIME='application/vnd.ms-excel';

function isLoadable(f){
  return f.mimeType===SHEET_MIME||f.mimeType===XLSX_MIME||f.mimeType===CSV_MIME||f.mimeType===XLS_MIME
    ||f.name.toLowerCase().endsWith('.xlsx')||f.name.toLowerCase().endsWith('.csv')||f.name.toLowerCase().endsWith('.xls');
}

// Extract month abbreviation from filename
// Supports: "Report.20260501_20260531.xlsx", "product_list_20260401.xlsx", "Sales Data April 2026.xlsx"
function monthFromFilename(name){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Pattern 1: YYYYMMDD like _20260401. or _20260401_
  const m1=name.match(/[._\-](\d{4})(\d{2})\d{2}[._\-]/);
  if(m1){const idx=parseInt(m1[2])-1;return(idx>=0&&idx<12)?months[idx]:null;}
  // Pattern 1b: YYYYMM like .202605. (no day component)
  const m1b=name.match(/[._\-](\d{4})(\d{2})[._\-]/);
  if(m1b){const idx=parseInt(m1b[2])-1;return(idx>=0&&idx<12)?months[idx]:null;}
  // Pattern 2: text month like "Sales Data April 2026.xlsx"
  const m2=name.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if(m2){
    const tm={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
    return months[tm[m2[1].toLowerCase()]];
  }
  return null;
}
function yearFromFilename(name){
  const m1=name.match(/[._\-](\d{4})\d{2}\d{0,2}[._\-]/);
  if(m1){const y=parseInt(m1[1]);if(y>=2020&&y<=2099) return y;}
  const m2=name.match(/\b(202[0-9])\b/);
  return m2?parseInt(m2[1]):null;
}

// Find the header row index (handles multi-section TikTok files and Shopee summary-first files)
function findHeaderRow(rows){
  const keywords=['date','gmv','sales','orders','revenue','visitors','product','sku','item','click'];
  let bestScore=-1,bestIdx=0;
  for(let i=0;i<Math.min(15,rows.length);i++){
    const row=rows[i];
    if(!row||!row.length) continue;
    const cells=row.map(c=>String(c||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
    const nonEmpty=cells.filter(c=>c.length>0).length;
    if(nonEmpty<2) continue;
    const score=cells.filter(c=>keywords.some(k=>c===k||c.startsWith(k)&&c.length<k.length+8)).length;
    const first=cells[0]||'';
    const bonus=(first==='date'||first==='day'||first==='productname'||first==='itemid'||first==='productid')?10:0;
    const total=score+bonus;
    if(total>bestScore&&score>=2){bestScore=total;bestIdx=i;}
  }
  return bestScore>=0?bestIdx:0;
}


let _fetchLock = Promise.resolve();
async function acquireFetchLock() {
  let release;
  const p = new Promise(r => release = r);
  const wait = _fetchLock;
  _fetchLock = _fetchLock.then(() => p);
  await wait;
  return () => setTimeout(release, 1500); // 1.5s global stagger for network requests
}

// Download and cache xlsx workbooks (avoids re-downloading the same file)

const _wbCache={};
let _dl403=0; // consecutive all-URL 403 failures — Google's per-IP "automated queries" block trips this
let _dl403CooldownUntil=0; // ponytail: was a permanent session-long lock once tripped (only a full page reload cleared it) — now a real timer that expires on its own, so a passing burst doesn't require manual intervention
async function fetchXlsxWorkbook(file){
  if(_wbCache[file.id]) return _wbCache[file.id];
  if(file._localFile){
    // Test-data mode: read straight from the picked File object — no network, no Drive, no rate limit.
    const ab=await file._localFile.arrayBuffer();
    const workerData = await parseXlsxWorker(ab);
    if(!workerData.sheetNames.length) throw new Error('No sheets in xlsx file.');
    _wbCache[file.id] = workerData;
    return workerData;
  }
  if(_dl403>=3&&Date.now()<_dl403CooldownUntil){
    const waitS=Math.ceil((_dl403CooldownUntil-Date.now())/1000);
    throw new Error(`Google is rate-limiting downloads from this network — retrying automatically in ~${waitS}s.`);
  }
  const releaseLock = await acquireFetchLock();
  try {
  if(typeof XLSX==='undefined') throw new Error('SheetJS not loaded — refresh the page.');
  const urls=[
    // /api/download proxies the request server-side — no CORS, no referrer issues
    `/api/download?fileId=${encodeURIComponent(file.id)}&apiKey=${encodeURIComponent(GS.apiKey)}`,
    // Direct googleapis.com — works locally for small files (<25 MB, no CDN redirect)
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${GS.apiKey}&acknowledgeAbuse=true&supportsAllDrives=true`,
    ...(file.webContentLink?[file.webContentLink]:[]),
  ];
  let ab=null,errors=[];
  for(const url of urls){
    try{
      const r=await fetch(url,{referrerPolicy:'unsafe-url'});
      if(r.ok){ab=await r.arrayBuffer();break;}
      // Non-OK from proxy returns JSON error; direct API also returns JSON
      const ej=await r.json().catch(()=>({}));
      errors.push(ej.error?.message||ej.error||ej.message||('HTTP '+r.status));
    }catch(e){errors.push(e.message);}
  }
  if(!ab){
    // Drive's real permission-denied errors say so in the message (e.g. "insufficient permissions") —
    // that never resolves by waiting, unlike a generic 403 from IP-based rate-limiting. Split them so
    // a permissions gap surfaces a clear one-time message instead of "retrying automatically" forever.
    const permErr=errors.find(e=>/permission/i.test(String(e)));
    if(permErr){
      throw new Error(`Download failed: ${permErr}. This file isn't shared "Anyone with the link can view" — fix sharing in Google Drive; retrying won't help.`);
    }
    if(errors.some(e=>/403/.test(String(e)))){
      _dl403++;
      if(_dl403>=3) _dl403CooldownUntil=Date.now()+60000; // 60s, not the whole rest of the session
    }
    // Show first non-CORS error for a useful message; fall back to last error
    const meaningful=errors.find(e=>e&&e!=='Failed to fetch'&&!e.includes('NetworkError'));
    throw new Error(`Download failed: ${meaningful||errors.at(-1)||'unknown'}. Ensure the file/folder is shared "Anyone with the link can view".`);
  }
  _dl403=0; _dl403CooldownUntil=0;
  releaseLock(); // release lock before heavy parsing
  const workerData = await parseXlsxWorker(ab);
  if(!workerData.sheetNames.length) throw new Error('No sheets in xlsx file.');
  _wbCache[file.id] = workerData;
  return workerData;
  } catch (err) {
    if (typeof releaseLock === 'function') releaseLock();
    throw err;
  }
}

// Scan all non-primary sheets in a workbook and populate D fields (campaign, promo, breakdown, affiliate)
function extractExtraSheets(wb,platform,fname){
  const dKey=PLAT_D[platform];
  if(!D[dKey]) return;
  const num=v=>parseFloat(String(v||'').replace(/[,$%\s]/g,''))||0;
  const str=v=>String(v||'').trim();
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MF={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
  const mAbbr={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  function parseMonth(str){
    if(!str) return null;
    const m1=String(str).match(/(\d{4})[\/\-]?(\d{2})/);
    if(m1){const idx=parseInt(m1[2])-1;return(idx>=0&&idx<12)?MN[idx]:null;}
    const lo=String(str).toLowerCase();
    const m2=lo.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
    if(m2) return MN[MF[m2[1]]];
    const m3=lo.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/);
    if(m3) return MN[mAbbr[m3[1]]];
    return null;
  }
  function getRows(sn){
    const r=(wb.sheets[sn] || []);
    return r.length>=2?r:null;
  }
  function makeGetter(headers){
    return (row,...keys)=>{
      for(const k of keys){const i=headers.findIndex(h=>h===k||h.startsWith(k));if(i>=0&&row[i]!==undefined&&String(row[i]).trim()!=='')return String(row[i]).trim();}
      return '';
    };
  }

  syncLog(`  [${platform}] Scanning "${fname}": sheets=[${(wb.SheetNames||wb.sheetNames).join(', ')}]`);
  console.log(`[AdsDebug] extractExtraSheets: file="${fname}" sheets=`, (wb.SheetNames||wb.sheetNames));
  if(!window._adsParseLog) window._adsParseLog=[];
  window._adsParseLog.push(`FILE: ${fname} | sheets: ${(wb.SheetNames||wb.sheetNames).join(' · ')}`);

  // ── Sales Composition file → Buyers Composition card ──
  if(/sales.?composition/i.test(fname)){
    const csn=(wb.SheetNames||wb.sheetNames).find(s=>s.toLowerCase().replace(/\s/g,'').includes('confirmed'));
    if(csn){
      const rows=(wb.sheets[csn] || []);
      const numC=v=>parseFloat(String(v||'').replace(/[,%\s]/g,''))||0;
      const str=v=>String(v||'').trim();
      // Detect table starts by scanning for known header keywords
      let typeOfBuyers=[],priceRange=[],subCategory=[];
      let mode=null;
      for(let ri=0;ri<rows.length;ri++){
        const row=rows[ri];
        const c0=str(row[0]).toLowerCase();
        // Detect section headers
        if(c0.includes('type of buyer')){mode='type';continue;}
        if(c0.includes('price range')){mode='price';continue;}
        if(c0.includes('shopee category')&&str(row[1]).toLowerCase().includes('sub')){mode='subcat';continue;}
        if(c0.includes('shopee category')&&!str(row[1]).toLowerCase().includes('sub')){mode=null;continue;}
        // Skip empty/header rows without data
        if(!c0||numC(row[1])===0&&numC(row[2])===0) continue;
        if(mode==='type'){
          typeOfBuyers.push({type:str(row[0]),buyers:numC(row[1]),buyersPct:numC(row[2]),sales:numC(row[3]),salesPct:numC(row[4]),cr:numC(row[5])});
        } else if(mode==='price'){
          priceRange.push({range:str(row[0]),buyers:numC(row[1]),buyersPct:numC(row[2]),sales:numC(row[3]),cr:numC(row[4])});
        } else if(mode==='subcat'){
          subCategory.push({category:str(row[0]),subCategory:str(row[1]),buyers:numC(row[2]),sales:numC(row[3]),salesPct:numC(row[4]),cr:numC(row[5])});
        }
      }
      // Extract month label from filename e.g. sales_composition_20260501-20260531.xlsx
      const mMatch=fname.match(/(\d{4})(\d{2})\d{2}-\d{8}/);
      const mLabel=mMatch?((['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[parseInt(mMatch[2])-1]+' '+mMatch[1]):'';
      if(typeOfBuyers.length||priceRange.length||subCategory.length){
        D[dKey].composition={month:mLabel,typeOfBuyers,priceRange,subCategory};
        syncLog(`  [${platform}] Sales Composition "${csn}": ${typeOfBuyers.length} buyer types, ${priceRange.length} price ranges, ${subCategory.length} sub-categories`);
      }
    }
    return;
  }

  // ── Discount Performance file → Promotion Revenue card ──
  if(/discount/i.test(fname)){
    const kmsn=(wb.SheetNames||wb.sheetNames).find(s=>/key metrics/i.test(s));
    if(kmsn){
      const rows=(wb.sheets[kmsn] || []);
      const headers=(rows[0]||[]).map(h=>str(h).toLowerCase().replace(/[^a-z0-9]/g,''));
      const get=makeGetter(headers);
      const period=str(rows[1]?.[0]);
      const [start,end]=periodToRange(period);
      const byType=[];
      for(const row of rows.slice(1)){
        const type=get(row,'promotiontype');
        if(!type||type.toLowerCase()==='all') continue;
        const sales=num(get(row,'salesconfirmedorder'));
        const orders=Math.round(num(get(row,'ordersconfirmedorder')));
        const buyers=Math.round(num(get(row,'buyersconfirmedorder')));
        if(!sales&&!orders) continue;
        byType.push({type,sales,orders,buyers});
      }
      if(byType.length&&start){
        byType.sort((a,b)=>b.sales-a.sales);
        upsertByStart(D[dKey].promoRevenue,{period,start,end,byType});
        syncLog(`  [${platform}] Discount Performance "${kmsn}": ${period}, ${byType.length} promotion type(s)`);
      }
    }
    // Performance List → per-promotion detail (name/type/status/sales/orders/buyers), summed across
    // the months a promotion runs through — the same promo row reappears in every monthly file it
    // overlaps, each time carrying just that file's own period contribution.
    const plsn=(wb.SheetNames||wb.sheetNames).find(s=>/performance list/i.test(s));
    if(plsn){
      const rows=(wb.sheets[plsn] || []);
      const headers=(rows[0]||[]).map(h=>str(h).toLowerCase().replace(/[^a-z0-9]/g,''));
      const get=makeGetter(headers);
      let n=0;
      for(const row of rows.slice(1)){
        const pname=get(row,'promotionname'); if(!pname) continue;
        const sales=num(get(row,'salesconfirmedorder'));
        const orders=Math.round(num(get(row,'ordersconfirmedorder')));
        const buyers=Math.round(num(get(row,'buyersconfirmedorder')));
        if(!sales&&!orders) continue;
        const e=D[dKey].promoList[pname]||(D[dKey].promoList[pname]={name:pname,type:get(row,'promotiontype')||'Discount',period:get(row,'promotionperiod'),status:get(row,'status'),sales:0,orders:0,buyers:0});
        e.sales+=sales; e.orders+=orders; e.buyers+=buyers;
        e.status=get(row,'status')||e.status;
        n++;
      }
      if(n) syncLog(`  [${platform}] Discount Performance List: ${n} row(s)`);
    }
    return;
  }

  // ── Voucher Performance file → Voucher Performance card ──
  if(/voucher/i.test(fname)){
    const kmsn=(wb.SheetNames||wb.sheetNames).find(s=>/key metrics/i.test(s));
    const mtsn=(wb.SheetNames||wb.sheetNames).find(s=>/metric trends/i.test(s));
    if(kmsn){
      const rows=(wb.sheets[kmsn] || []);
      const headers=(rows[0]||[]).map(h=>str(h).toLowerCase().replace(/[^a-z0-9]/g,''));
      const get=makeGetter(headers);
      const row=rows[1]||[];
      const period=str(row[0]);
      const [start,end]=periodToRange(period);
      const sales=num(get(row,'salesconfirmedorder'));
      const orders=Math.round(num(get(row,'ordersconfirmedorder')));
      let daily=[];
      if(mtsn){
        const drows=(wb.sheets[mtsn] || []);
        const dheaders=(drows[0]||[]).map(h=>str(h).toLowerCase().replace(/[^a-z0-9]/g,''));
        const dget=makeGetter(dheaders);
        for(const r of drows.slice(1)){
          const d=parseDate(dget(r,'timeperiod','dateperiod','date'));
          if(!d) continue;
          daily.push({
            date:d,
            sales:num(dget(r,'salesconfirmedorder')),
            orders:Math.round(num(dget(r,'ordersconfirmedorder'))),
            claims:Math.round(num(dget(r,'claims'))),
            usageRate:num(dget(r,'usagerateconfirmedorder')),
            buyers:Math.round(num(dget(r,'buyersconfirmedorder'))),
            cost:num(dget(r,'costconfirmedorder')),
          });
        }
      }
      if((sales||orders)&&start){
        upsertByStart(D[dKey].voucherPerf,{
          period,start,end,sales,orders,
          claims:Math.round(num(get(row,'claims'))),
          usageRate:num(get(row,'usagerateconfirmedorder')),
          buyers:Math.round(num(get(row,'buyersconfirmedorder'))),
          cost:num(get(row,'costconfirmedorder')),
          daily,
        });
        syncLog(`  [${platform}] Voucher Performance "${kmsn}": ${period}, ${daily.length} daily row(s)`);
      }
    }
    // Performance List → per-voucher detail (claims/orders/sales/cost), summed by voucher name across
    // every claim-code row and every monthly file it appears in.
    const plsn=(wb.SheetNames||wb.sheetNames).find(s=>/performance list/i.test(s));
    if(plsn){
      const rows=(wb.sheets[plsn] || []);
      const headers=(rows[0]||[]).map(h=>str(h).toLowerCase().replace(/[^a-z0-9]/g,''));
      const get=makeGetter(headers);
      let n=0;
      for(const row of rows.slice(1)){
        const vname=get(row,'vouchername'); if(!vname) continue;
        const claims=Math.round(num(get(row,'claims')));
        const vorders=Math.round(num(get(row,'ordersconfirmedorder')));
        const vsales=num(get(row,'salesconfirmedorder'));
        const vcost=num(get(row,'costconfirmedorder'));
        if(!claims&&!vorders&&!vsales) continue;
        const e=D[dKey].voucherList[vname]||(D[dKey].voucherList[vname]={name:vname,claims:0,orders:0,sales:0,cost:0});
        e.claims+=claims; e.orders+=vorders; e.sales+=vsales; e.cost+=vcost;
        n++;
      }
      if(n) syncLog(`  [${platform}] Voucher Performance List: ${n} row(s)`);
    }
    return;
  }

  for(const sn of wb.sheetNames){
    const sl=sn.toLowerCase().replace(/\s+/g,'');
    console.log(`[AdsDebug] SHEET: "${sn}" sl="${sl}"`);

    // Skip primary revenue/product sheets already handled (use sl for robustness)
    if(sl==='confirmedorder'||sl==='placedorder'||/topperforming/i.test(sn)){continue;}

    // ── Traffic Sources (Confirmed Order) → Sales Channel Mix ──
    if(/traffic.*source/i.test(sn)&&/confirm/i.test(sn)){
      const rows=getRows(sn); if(!rows) continue;
      const hIdx=findHeaderRow(rows);
      const dr=hIdx>0?rows.slice(hIdx):rows;
      if(dr.length<2) continue;
      const hdrs=dr[0].map(h=>String(h||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
      const numC=v=>parseFloat(String(v||'').replace(/[,$%\s]/g,''))||0;
      const gC=makeGetter(hdrs);
      const sumRow=dr[1]; if(!sumRow) continue;
      const pc=numC(gC(sumRow,'salesfromproductcard','fromproductcard','productcard'));
      const sl2=numC(gC(sumRow,'salesfromsellerlive','fromsellerlive','sellerlive'));
      const sv2=numC(gC(sumRow,'salesfromsellervideo','fromsellervideo','sellervideo'));
      const af=numC(gC(sumRow,'salesfromaffiliate','fromaffiliate','affiliate'));
      const sa=numC(gC(sumRow,'salesfromshopeads','fromshopeads','shopeads'));
      if(pc||sl2||af||sa){
        const chObj={
          labels:['Product Card','Seller Live','Seller Video','Affiliate','Shopee Ads'],
          colors:['#f97316','#6366f1','#f43f5e','#3fb950','#64748b'],
          mar:[pc,sl2,sv2,af,sa]
        };
        D[dKey].channel=chObj;
        const fMonth=monthFromFilename(fname), fYear=yearFromFilename(fname);
        if(fMonth&&fYear){
          if(!D[dKey].channelByMonth) D[dKey].channelByMonth={};
          D[dKey].channelByMonth[fMonth+fYear]=chObj;
        }
      }
      // Parse all 4 section breakdowns
      const sections={productCard:[],sellerLive:[],sellerVideo:[],shopeeAffiliate:[],shopeeAds:[]};
      let curSec=null;
      let curGet=null;
      for(let i=2;i<dr.length;i++){
        const row=dr[i];
        const fc=String(row[0]||'').trim();
        if(!fc) continue;
        // Section header detection
        if(/^product card$/i.test(fc)){curSec='productCard'; continue;}
        if(/^seller live$/i.test(fc)){curSec='sellerLive'; continue;}
        if(/^seller video$/i.test(fc)){curSec='sellerVideo'; continue;}
        if(/^shopee affiliate$/i.test(fc)){curSec='shopeeAffiliate'; continue;}
        if(/^shopee ads$/i.test(fc)){curSec='shopeeAds'; continue;}
        // Detect sub-header row and create a getter for this section
        if(/^(traffic source|live views|video views|content views|ads impressions)$/i.test(fc)){
          const hdrs=row.map(h=>String(h||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
          curGet=makeGetter(hdrs);
          continue;
        }
        if(!curSec) continue;
        if(curSec==='shopeeAds'){
          const s=numC(String(row[2]||''));
          const imp=numC(String(row[3]||''));
          const o=Math.round(numC(String(row[4]||'')));
          const exp=numC(String(row[6]||''));
          const roas=numC(String(row[7]||''));
          if(s===0&&exp===0) continue;
          sections.shopeeAds.push({src:fc,s:+s.toFixed(2),imp:Math.round(imp),o,exp:+exp.toFixed(2),roas:+roas.toFixed(2)});
          continue;
        }
        
        const pct=numC(String(row[1]||'').replace('%',''));
        const sales=numC(String(row[2]||''));
        if(!fc||(pct===0&&sales===0)) continue;
        if(/^100(\.0+)?%?$/.test(String(row[1]||'').trim())) continue;
        
        if(curSec==='shopeeAffiliate') {
          let o=0, cl=0, v=0, cr=0, aov=0;
          if(curGet) {
            o = Math.round(numC(curGet(row,'placedorders','orders','paidorders')));
            cl = Math.round(numC(curGet(row,'productclicks','clicks')));
            v = Math.round(numC(curGet(row,'contentviews','views')));
            cr = numC(String(curGet(row,'orderconversionrate','conversionrate','cr')).replace('%',''));
            aov = numC(curGet(row,'salesperorder','salesperbuyer','aov'));
          }
          if(aov===0 && o>0) aov = +(sales/o).toFixed(2);
          sections.shopeeAffiliate.push({src:fc,pct:+pct.toFixed(2),s:+sales.toFixed(2), o, cl, v, cr, aov});
        } else {
          sections[curSec].push({src:fc,pct:+pct.toFixed(2),s:+sales.toFixed(2)});
        }
      }
      const hasSecData=Object.values(sections).some(a=>a.length>0);
      if(hasSecData){
        D[dKey].trafficSources=sections;
        const fMonth=monthFromFilename(fname), fYear=yearFromFilename(fname);
        if(fMonth&&fYear){
          if(!D[dKey].trafficSourcesByMonth) D[dKey].trafficSourcesByMonth={};
          D[dKey].trafficSourcesByMonth[fMonth+fYear]=sections;
        }
      }
      // Build monthly Shopee Ads summary from this file
      if(sections.shopeeAds.length>0){
        const rs=sections.shopeeAds;
        const totS=rs.reduce((a,r)=>a+r.s,0);
        const totImp=rs.reduce((a,r)=>a+r.imp,0);
        const totO=rs.reduce((a,r)=>a+r.o,0);
        const totExp=rs.reduce((a,r)=>a+r.exp,0);
        const roas=totExp>0?+(totS/totExp).toFixed(2):0;
        const fMonth=monthFromFilename(fname), fYear=yearFromFilename(fname);
        if(fMonth&&fYear){
          if(!D[dKey].adsByMonth) D[dKey].adsByMonth={};
          D[dKey].adsByMonth[fMonth+fYear]={m:fMonth,year:+fYear,s:+totS.toFixed(2),imp:totImp,o:totO,exp:+totExp.toFixed(2),roas};
          syncLog(`  [ads] ${fMonth}${fYear}: Sales=${Math.round(totS).toLocaleString()}, Exp=${Math.round(totExp).toLocaleString()}, ROAS=${roas}x`);
        }
      }
      continue;
    }

    // ── Source Contribution (Confirmed Order) → daily Shopee Ads data (total + per-source) ──
    // Exclude placed/paid order variants — any Source Contribution that is NOT placed/paid is confirmed
    // Using negative check because "confirmed" may use non-ASCII chars in Shopee XLSX exports
    if(sl.includes('source')&&sl.includes('contribution')){
      window._adsParseLog.push(`SC_CAND: "${sn.slice(0,40)}" placed=${sl.includes('place')} paid=${sl.includes('paid')}`);
    }
    if(sl.startsWith('sourcecontribution')&&!sl.includes('place')&&!sl.includes('paid')){
      // Worker always parses raw:false, so dates arrive as formatted strings — toIso()
      // below handles those directly (numeric-serial branch is a harmless fallback).
      const rawRows=(wb.sheets[sn] || []);
      window._adsParseLog.push(`SRC_FOUND: rows=${rawRows.length} sn="${sn.slice(0,30)}"`);
      console.log(`[AdsDebug] Source Contribution sheet found: "${sn}" → ${rawRows.length} rows`);
      if(!rawRows||rawRows.length<2){window._adsParseLog.push('SKIP: <2 rows');continue;}
      const numC=v=>{
        if(typeof v==='number') return v;
        return parseFloat(String(v||'').replace(/[,$%\s]/g,''))||0;
      };
      // Convert a cell value (Excel date serial or date string) to YYYY-MM-DD
      const toIso=v=>{
        if(typeof v==='number'&&v>40000&&v<60000){
          // Excel date serial (covers 2009-2064)
          
          // Fallback manual conversion (Excel epoch Jan 0, 1900, with leap year bug)
          const ms=(v-25569)*86400000;const d=new Date(ms);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        }
        const s=String(v||'').trim();
        // DD-MM-YYYY or DD/MM/YYYY (Shopee export format: day first)
        const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        // M/D/YY or M/D/YYYY (SheetJS raw:false US format fallback)
        const m2=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if(m2){const yr=m2[3].length===2?2000+parseInt(m2[3]):parseInt(m2[3]);return `${yr}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;}
        return null;
      };
      // Find exact row index and cell value where "shopee" appears, for diagnostics
      const shopeeRowIdx=rawRows.findIndex(r=>r&&Array.isArray(r)&&r.some(c=>{const cc=String(c||'');return cc.toLowerCase().includes('shopee');}));
      if(shopeeRowIdx>=0){
        const sv=rawRows[shopeeRowIdx];
        const hits=sv.map((c,i)=>String(c||'').trim().length?`[${i}]="${String(c).slice(0,15)}"`:null).filter(Boolean).join(' ');
        window._adsParseLog.push(`SHOPEE_ROW ${shopeeRowIdx}: ${hits.slice(0,80)}`);
      } else {
        window._adsParseLog.push(`SHOPEE_ROW: not found in ${rawRows.length} rows`);
      }
      let inShopeeAds=false,curSrc=null,dataCol=0,parsedDays=0;
      for(const row of rawRows){
        if(!inShopeeAds){
          // Search ALL columns; normalize non-breaking spaces before matching
          for(let ci=0;ci<row.length;ci++){
            const cell=String(row[ci]||'').split('').map(c=>c.charCodeAt(0)>126?' ':c).join('').trim();
            if(/^shopee\s*ads$/i.test(cell)){
              inShopeeAds=true;dataCol=ci;curSrc=null;
              window._adsParseLog.push(`SHOPEE ADS @ ci=${ci} row=${rawRows.indexOf(row)}`);
              break;
            }
          }
          continue;
        }
        const cv=row[dataCol];
        const fc=String(cv||'').trim();
        if(!fc) continue;
        // Check date FIRST — handles both numeric serials and DD-MM-YYYY strings
        const isoDate=toIso(cv);
        if(!isoDate){
          // Not a date — identify source aggregate rows by % ratio in adjacent col
          const pctRaw=row[dataCol+1];
          const isPct=(typeof pctRaw==='number'&&pctRaw>0&&pctRaw<=1)||(typeof pctRaw==='string'&&/^\d+(\.\d+)?%$/.test(String(pctRaw).trim()));
          if(isPct&&fc.length>4){curSrc=fc;console.log(`[AdsDebug] Source: "${fc}" (pctRaw=${pctRaw})`);}
          continue;
        }
        // Date row — extract metrics
        const s=numC(row[dataCol+2]);   // Sales (MY) = GMV
        const imp=numC(row[dataCol+3]); // Ads Impressions
        const o=Math.round(numC(row[dataCol+4])); // Orders
        const exp=numC(row[dataCol+6]); // Ads Expense
        if(parsedDays===0){window._adsParseLog.push(`FIRST DATE ROW: ${isoDate} | cv=${cv}(${typeof cv}) | s=${s} exp=${exp} | src="${curSrc}"`);console.log(`[AdsDebug] First date row: date=${isoDate} cv=${cv}(type=${typeof cv}) s=${s} exp=${exp} curSrc="${curSrc}"`);}

        if(!s&&!exp) continue;
        parsedDays++;
        if(!D[dKey].adsDailyByDate) D[dKey].adsDailyByDate={};
        const ex=D[dKey].adsDailyByDate[isoDate];
        if(ex){ex.s=+(ex.s+s).toFixed(2);ex.imp+=Math.round(imp);ex.o+=o;ex.exp=+(ex.exp+exp).toFixed(2);ex.roas=ex.exp>0?+(ex.s/ex.exp).toFixed(2):0;}
        else D[dKey].adsDailyByDate[isoDate]={date:isoDate,s:+s.toFixed(2),imp:Math.round(imp),o,exp:+exp.toFixed(2),roas:exp>0?+(s/exp).toFixed(2):0};
        if(curSrc){
          if(!D[dKey].adsDailySrc) D[dKey].adsDailySrc={};
          if(!D[dKey].adsDailySrc[curSrc]) D[dKey].adsDailySrc[curSrc]={};
          const ex2=D[dKey].adsDailySrc[curSrc][isoDate];
          if(ex2){ex2.s=+(ex2.s+s).toFixed(2);ex2.imp+=Math.round(imp);ex2.o+=o;ex2.exp=+(ex2.exp+exp).toFixed(2);ex2.roas=ex2.exp>0?+(ex2.s/ex2.exp).toFixed(2):0;}
          else D[dKey].adsDailySrc[curSrc][isoDate]={date:isoDate,s:+s.toFixed(2),imp:Math.round(imp),o,exp:+exp.toFixed(2),roas:exp>0?+(s/exp).toFixed(2):0};
          if(!D[dKey].adsSrcOrder) D[dKey].adsSrcOrder=[];
          if(!D[dKey].adsSrcOrder.includes(curSrc)) D[dKey].adsSrcOrder.push(curSrc);
        }
      }
      window._adsParseLog.push(`DONE: ${parsedDays} rows parsed | inShopeeAds=${inShopeeAds}`);
      console.log(`[AdsDebug] Done: ${parsedDays} date rows parsed, inShopeeAds was ${inShopeeAds}`);
      syncLog(`  [${platform}] Source Contribution "${sn}": ${parsedDays} daily rows, ${Object.keys(D[dKey].adsDailyByDate||{}).length} total dates, ${(D[dKey].adsSrcOrder||[]).length} sources`);
      continue;
    }

    const rows=getRows(sn); if(!rows) continue;
    const hIdx=findHeaderRow(rows);
    const dataRows=hIdx>0?rows.slice(hIdx):rows;
    if(dataRows.length<2) continue;
    const headers=dataRows[0].map(h=>String(h||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
    const get=makeGetter(headers);

    // ── TikTok breakdown (Product/Video/Live GMV columns in daily sheet) ──
    if((platform==='tiktok'||platform==='tiktok-sg')&&/daily|overview|summary/i.test(sn)){
      const prodCol=headers.findIndex(h=>h.includes('productgmv')||h.includes('gmvproduct'));
      const vidCol=headers.findIndex(h=>h.includes('videogmv')||h.includes('gmvvideo')||h.includes('shortvideo'));
      const liveCol=headers.findIndex(h=>h.includes('livegmv')||h.includes('gmvlive')||h.includes('livestream'));
      if(prodCol>=0||vidCol>=0||liveCol>=0){
        const byMonth={};
        for(const row of dataRows.slice(1)){
          const mk=parseMonth(get(row,'date','day','period'));
          if(!mk) continue;
          if(!byMonth[mk]) byMonth[mk]={m:mk,prod:0,vid:0,live:0};
          if(prodCol>=0) byMonth[mk].prod+=num(row[prodCol]);
          if(vidCol>=0) byMonth[mk].vid+=num(row[vidCol]);
          if(liveCol>=0) byMonth[mk].live+=num(row[liveCol]);
        }
        const arr=MN.filter(m=>byMonth[m]).map(m=>byMonth[m]);
        if(arr.length&&D[dKey].breakdown!==undefined){
          D[dKey].breakdown=arr;
          syncLog(`  [extra] "${sn}": TikTok GMV breakdown for ${arr.length} month(s)`);
        }
      }
    }

    // ── Affiliate sheet ──
    if(/affiliate|creator/i.test(sn)){
      const byMonth={};
      for(const row of dataRows.slice(1)){
        const mk=parseMonth(get(row,'date','month','period'));
        if(!mk) continue;
        const gmv=num(get(row,'gmv','affiliategmv','sales','revenue'));
        const creators=Math.round(num(get(row,'creators','creatorwithsales','activecreatorscount')));
        if(!gmv&&!creators) continue;
        byMonth[mk]={m:mk,gmv,creators};
      }
      const arr=MN.filter(m=>byMonth[m]).map(m=>byMonth[m]);
      if(arr.length&&D[dKey].affiliate!==undefined){
        D[dKey].affiliate=arr;
        syncLog(`  [extra] "${sn}": Affiliate data for ${arr.length} month(s)`);
      }
    }
  }
}

// Fetch raw 2D row array from a Drive file (no side effects)
async function fetchRawRows(file){
  if(file.mimeType===SHEET_MIME){
    const releaseLock = await acquireFetchLock();
    try {
      const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/A1:Z2000?key=${GS.apiKey}`);
      const data=await res.json();
      if(!res.ok) throw new Error(data.error?.message||'Sheets API error '+res.status);
      return data.values||[];
    } finally { releaseLock(); }
  }
  if(file.mimeType===CSV_MIME||file.name.toLowerCase().endsWith('.csv')){
    const releaseLock = await acquireFetchLock();
    try {
      const res=await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${GS.apiKey}`);
      if(!res.ok) throw new Error('HTTP '+res.status);
      const text=await res.text();
      return text.trim().split('\n').map(r=>r.split(',').map(v=>v.trim().replace(/^"|"$/g,'')));
    } finally { releaseLock(); }
  }
  // xlsx: download workbook (cached per fileId) then pick appropriate sheet
  const wb=await fetchXlsxWorkbook(file);
  const fname=file.name||'';
  if(/shopee-shop-stats/i.test(fname)){
    // Shopee shop stats: use "Confirmed Order" sheet
    const sn=wb.sheetNames.find(s=>/confirmed.*order/i.test(s));
    if(sn) return wb.sheets[sn];
  }
  if(/Product Performance/i.test(fname)){
    // Shopee product performance: use "Top Performing Products" sheet
    const sn=wb.sheetNames.find(s=>/top performing/i.test(s))||wb.sheetNames[0];
    return wb.sheets[sn];
  }
  // Default: use first sheet with actual data rows
  for(const sn of wb.sheetNames){
    const rows=wb.sheets[sn] || [];
    if(rows.length>=2) return rows;
  }
  return wb.sheets[wb.sheetNames[0]] || [];
}

// Parse 2D rows → {m2025:[], m2026:[]} separated by year. Each entry: {m,s,o,v,cl,cr,b}.
function rowsToMonths(rows,filename){
  if(!rows||rows.length<2) return {m2025:[],m2026:[]};
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mFull={january:'Jan',february:'Feb',march:'Mar',april:'Apr',may:'May',june:'Jun',
    july:'Jul',august:'Aug',september:'Sep',october:'Oct',november:'Nov',december:'Dec'};
  const hIdx=findHeaderRow(rows);
  const dataRows=hIdx>0?rows.slice(hIdx):rows;
  if(dataRows.length<2) return {m2025:[],m2026:[]};
  const headers=dataRows[0].map(h=>String(h).trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const get=(row,...keys)=>{
    for(const k of keys){
      const i=headers.findIndex(h=>h===k||h.startsWith(k));
      if(i>=0&&row[i]!==undefined&&String(row[i]).trim()!=='') return String(row[i]).trim();
    }
    return '';
  };
  const num=v=>parseFloat(String(v).replace(/[,$%\s]/g,''))||0;
  const acc25={}, acc26={};
  const initA=(acc,mk)=>{if(!acc[mk]) acc[mk]={m:mk,s:0,o:0,v:0,cl:0,crSum:0,crN:0,bSum:0,bN:0,co:0,cs:0,ro:0,rs:0,bu:0,nbu:0,ebu:0};};
  const addRow=(mk,row,yr)=>{
    const acc=yr===2025?acc25:acc26;
    initA(acc,mk);
    const a=acc[mk];
    const s=num(get(row,'confirmedsales','confirmedrevenue','confirmedgmv','confirmedordersales','confirmedorderrevenue','sales','gmv','revenue','salesmyr','gmvmyr','totalsales','netsales','totalrevenue','totalgmv','salessalesvalue','totalrevenuesales','paidgmv','paymentcompletegmv','settlementamount','grossrevenue'));
    const o=Math.round(num(get(row,'confirmedorder','confirmedorders','orders','order','nooforders','successfulorders','ordersplaced','totalorders','noofsuccessfulorders','paidorders','placedorders','numberofpaidorders','paymentcompleteorders')));
    const v=Math.round(num(get(row,'visitors','visits','uniquevisitors','pageviews','productpageviews','traffic','sessioncount','sessions','productviews','productimpressions','impressions')));
    const cl=Math.round(num(get(row,'clicks','click','productclicks','totalclicks')));
    const cr=num(get(row,'orderconversionrate','convrate','conversion','conversionrate','buyerconversionrate','conversionratebasedonsession','cr'));
    const b=num(get(row,'salesperorder','aov','avgorder','averageorder','averagebasketsize','averagebasketsizemyr','avgbasketsize','avgordervalue','basketsize'));
    const co=Math.round(num(get(row,'cancelledorders','cancelledorder','noofcancelledorders','cancelledordercount')));
    const cs=num(get(row,'cancelledsales','cancelledsalesmyr','cancelledsalesamount','cancelledsalesvalue'));
    const ro=Math.round(num(get(row,'returnedrefundedorders','returnedorders','refundedorders','returnorders','noofreturnedorders')));
    const rs=num(get(row,'returnedrefundedsales','returnedsales','refundedsales','returnedrefundedsalesamount','returnedrefundedsalesmyr'));
    const bu=Math.round(num(get(row,'ofbuyers','buyers','numberofbuyers','noofbuyers','uniquebuyers','totalbuyers')));
    const nbu=Math.round(num(get(row,'ofnewbuyers','newbuyers','numberofnewbuyers','noofnewbuyers')));
    const ebu=Math.round(num(get(row,'ofexistingbuyers','existingbuyers','numberofexistingbuyers','noofexistingbuyers')));
    a.s+=s; a.o+=o; a.v+=v; a.cl+=cl;
    a.co+=co; a.cs+=cs; a.ro+=ro; a.rs+=rs; a.bu+=bu; a.nbu+=nbu; a.ebu+=ebu;
    if(cr>0){a.crSum+=cr;a.crN++;}
    if(b>0){a.bSum+=b;a.bN++;}
  };
  const buildFinal=acc=>mNames.map(mk=>{
    const a=acc[mk];
    if(!a||(!a.s&&!a.o)) return null;
    return{m:mk,s:+a.s.toFixed(2),o:a.o,v:a.v,cl:a.cl,
      cr:a.crN?+(a.crSum/a.crN).toFixed(2):(a.o&&a.v?+(a.o/a.v*100).toFixed(2):0),
      b:a.bN?+(a.bSum/a.bN).toFixed(2):(a.o&&a.s?+(a.s/a.o).toFixed(2):0),
      co:a.co,cs:+a.cs.toFixed(2),ro:a.ro,rs:+a.rs.toFixed(2),
      bu:a.bu,nbu:a.nbu,ebu:a.ebu};
  }).filter(Boolean);

  const hasDate=headers.some(h=>h==='date'||h==='day'||h==='reportdate'||h==='time'||h==='period'||h==='orderdate'||h==='createdate'||h==='statisticsdate');
  const hasMonth=headers.some(h=>h==='month'||h==='m'||h==='monthname');
  const fileYear=yearFromFilename(filename);
  const fileMonth=monthFromFilename(filename);
  const isTotalRow=row=>/^(total|grand|sum|subtotal|合计|รวม)/i.test(String(row[0]||'').trim());
  const isDateRange=str=>{
    const p=str.split(/[\/\-\.]/);
    return p.length>=4&&p.some(x=>/^\d{4}$/.test(x));
  };
  // Detect Shopee shop-stats files: duplicate header at dataRows[3] (row 4 of file)
  // When found, use summary row (dataRows[1]) directly — avoids daily-row aggregation issues
  const looksLikeHeader=row=>row&&row.some(c=>/^date$/i.test(String(c||'').trim()));
  const hasDupHeader=dataRows.length>3&&looksLikeHeader(dataRows[3]);
  if(fileMonth&&fileYear&&hasDupHeader&&dataRows.length>1){
    const summaryRow=dataRows[1];
    if(summaryRow&&summaryRow.some(v=>String(v||'').trim()!=='')){
      addRow(fileMonth,summaryRow,fileYear);
    }
    return{m2025:buildFinal(acc25),m2026:buildFinal(acc26)};
  }

  if(hasDate&&!hasMonth){
    for(const row of dataRows.slice(1)){
      if(isTotalRow(row)) continue;
      const dateStr=get(row,'date','day','reportdate','time','period','orderdate','createdate','statisticsdate');
      if(!dateStr) continue;
      if(/^(total|grand|sum|subtotal)/i.test(dateStr)) continue;
      if(isDateRange(dateStr)) continue;
      if(fileMonth){
        const yrMatch=dateStr.match(/\b(20\d{2})\b/);
        const rowYear=yrMatch?parseInt(yrMatch[1]):(fileYear||2026);
        if(fileYear&&rowYear!==fileYear) continue;
        if(!/\b20\d{2}\b/.test(dateStr)&&!/\d{2}[\/\-\.]\d{2}/.test(dateStr)) continue;
        addRow(fileMonth,row,rowYear);
        continue;
      }
      let mIdx=-1,rowYear=null;
      const d=new Date(dateStr);
      if(!isNaN(d.getTime())){mIdx=d.getMonth();rowYear=d.getFullYear();}
      else{
        const parts=dateStr.split(/[\/\-\.]/);
        if(parts.length>=3){
          const y=parseInt(parts[0]);
          if(y>1900){mIdx=parseInt(parts[1])-1;rowYear=y;}
          else{const yl=parseInt(parts[parts.length-1]);if(yl>1900) rowYear=yl; mIdx=parseInt(parts[1])-1;}
        }
        if(mIdx<0){const m2=dateStr.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);if(m2) mIdx=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m2[1]);}
      }
      if(mIdx<0||mIdx>11) continue;
      const yr=rowYear||fileYear||2026;
      if(fileYear&&rowYear&&rowYear!==fileYear) continue;
      addRow(mNames[mIdx],row,yr);
    }
  } else if(hasMonth){
    for(const row of dataRows.slice(1)){
      if(isTotalRow(row)) continue;
      const mRaw=get(row,'month','m','monthname');
      if(!mRaw) continue;
      const mk=mFull[mRaw.toLowerCase()]||mRaw.substring(0,3);
      if(!mNames.includes(mk)) continue;
      addRow(mk,row,fileYear||2026);
    }
  } else {
    const mk=monthFromFilename(filename);
    if(!mk) return {m2025:[],m2026:[]};
    const yr=fileYear||2026;
    for(const row of dataRows.slice(1)){
      if(isTotalRow(row)) continue;
      addRow(mk,row,yr);
    }
  }

  return {m2025:buildFinal(acc25), m2026:buildFinal(acc26)};
}

// Parse a date string → 'YYYY-MM-DD' or null
function parseDate(v){
  const s=String(v||'').trim();
  let m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m=s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

// Parse 2D rows → daily records [{date,m,y,s,o,v,cl,cr,b,co,cs,ro,rs,bu}]
function rowsToDaily(rows){
  if(!rows||rows.length<2) return [];
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hIdx=findHeaderRow(rows);
  const dataRows=hIdx>0?rows.slice(hIdx):rows;
  if(dataRows.length<2) return [];
  const headers=dataRows[0].map(h=>String(h||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const get=(row,...keys)=>{
    for(const k of keys){const i=headers.findIndex(h=>h===k||h.startsWith(k));if(i>=0&&row[i]!==undefined&&String(row[i]).trim()!=='') return String(row[i]).trim();}
    return '';
  };
  const num=v=>parseFloat(String(v).replace(/[,$%\s]/g,''))||0;
  const looksLikeHdr=row=>row&&row.some(c=>/^date$/i.test(String(c||'').trim()));
  const hasDupHdr=dataRows.length>3&&looksLikeHdr(dataRows[3]);
  const result=[];
  for(const row of dataRows.slice(hasDupHdr?4:1)){
    const d=parseDate(get(row,'date','day','orderdate','reportdate','statisticsdate','createtime'));
    if(!d) continue;
    const[y,mo]=d.split('-').map(Number);
    const s=num(get(row,'confirmedsales','confirmedrevenue','confirmedgmv','confirmedordersales','sales','gmv','revenue'));
    const o=Math.round(num(get(row,'confirmedorder','confirmedorders','orders','successfulorders')));
    const v=Math.round(num(get(row,'visitors','visits','uniquevisitors','pageviews','productpageviews','traffic','sessions')));
    const cl=Math.round(num(get(row,'clicks','click','productclicks','totalclicks')));
    const cr=num(get(row,'orderconversionrate','convrate','conversionrate','cr'));
    const b=num(get(row,'salesperorder','aov','avgorder','basketsize','averagebasketsize'));
    const co=Math.round(num(get(row,'cancelledorders','cancelledorder','noofcancelledorders')));
    const cs=num(get(row,'cancelledsales','cancelledsalesmyr','cancelledsalesamount'));
    const ro=Math.round(num(get(row,'returnedrefundedorders','returnedorders','refundedorders')));
    const rs=num(get(row,'returnedrefundedsales','returnedsales','refundedsales'));
    const bu=Math.round(num(get(row,'ofbuyers','buyers','numberofbuyers','uniquebuyers')));
    result.push({date:d,m:mNames[mo-1],y,s:+s.toFixed(2),o,v,cl,cr:+cr.toFixed(2),b:+b.toFixed(2),co,cs:+cs.toFixed(2),ro,rs:+rs.toFixed(2),bu});
  }
  return result.sort((a,b)=>a.date.localeCompare(b.date));
}

// Parse 2D rows into product array. Returns [] on failure.
function rowsToProducts(rows,filename){
  if(!rows||rows.length<3) return [];
  const hIdx=findHeaderRow(rows);
  const dataRows=hIdx>0?rows.slice(hIdx):rows;
  if(dataRows.length<2) return [];
  const headers=dataRows[0].map(h=>String(h||'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const num=v=>parseFloat(String(v).replace(/[,$%\s]/g,''))||0;
  const getI=(...keys)=>{
    for(const k of keys){
      const i=headers.findIndex(h=>h===k||h.startsWith(k));
      if(i>=0) return i;
    }
    return -1;
  };
  const iName=getI('productname','product','productid','itemid','name');
  const iGmv=getI('salesconfirmedorder','salesmyr','confirmedordermyr','gmv','sales','revenue');
  const iOrders=getI('confirmedorder','orders','order','paidorders');
  const iClicks=getI('productclicks','clicks','click');
  const iImp=getI('productimpression','impression','productviews','views');
  const iCtr=getI('ctr','clickthroughrate');
  const iCr=getI('orderconversionrateconfirmed','orderconversionrate','conversionrate','cr','convrate');
  const iUnits=getI('unitsconfirmed','unitssold','unitspaid','units','itemssold');
  const iSku=getI('sku','parentsku','skucode');
  const products=[];
  for(const row of dataRows.slice(1)){
    if(!row||!row[0]) continue;
    const name=iName>=0?String(row[iName]||'').trim():'';
    if(!name||name.length>120) continue; // skip empty or merged header rows
    const gmv=iGmv>=0?num(row[iGmv]):0;
    if(gmv<=0) continue; // skip zero-revenue rows
    products.push({
      name,
      sku:iSku>=0?String(row[iSku]||'').trim():'',
      gmv,
      orders:iOrders>=0?Math.round(num(row[iOrders])):0,
      clicks:iClicks>=0?Math.round(num(row[iClicks])):0,
      impressions:iImp>=0?Math.round(num(row[iImp])):0,
      ctr:iCtr>=0?num(row[iCtr]):0,
      cr:iCr>=0?num(row[iCr]):0,
      units:iUnits>=0?Math.round(num(row[iUnits])):0,
    });
  }
  // Aggregate by product name (same product appears per-variation)
  const agg={};
  for(const p of products){
    if(!agg[p.name]) agg[p.name]={...p};
    else{
      agg[p.name].gmv+=p.gmv;
      agg[p.name].orders+=p.orders;
      agg[p.name].clicks+=p.clicks;
      agg[p.name].impressions+=p.impressions;
      agg[p.name].units+=p.units;
    }
  }
  return Object.values(agg)
    .sort((a,b)=>b.gmv-a.gmv)
    .slice(0,20); // top 20 products
}

// "Double-digit day" campaign aggregates from daily records: for month N (Jan=1…Dec=12),
// Shopee's N.N mega campaign runs on day N — window is day N-1..N+1 (e.g. 7.7 → Jul 6,7,8; 8.8 → Aug 7,8,9), any year.
function campaignDaysFromDaily(daily){
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const byYear={};
  for(const r of daily||[]){
    const day=parseInt(r.date.slice(8,10),10), mo=parseInt(r.date.slice(5,7),10);
    if(Math.abs(day-mo)>1) continue;
    if(!byYear[r.y]) byYear[r.y]={};
    if(!byYear[r.y][mo]) byYear[r.y][mo]={s:0,o:0,v:0,cl:0,crSum:0,crN:0};
    const a=byYear[r.y][mo];
    a.s+=r.s; a.o+=r.o; a.v+=(r.v||0); a.cl+=(r.cl||0);
    if(r.cr){a.crSum+=r.cr; a.crN++;}
  }
  const out={};
  for(const y of Object.keys(byYear)){
    out[y]=mNames.map((m,i)=>{
      const a=byYear[y][i+1]; if(!a) return null;
      return{m,s:+a.s.toFixed(2),o:a.o,v:a.v,cl:a.cl,cr:a.crN?+(a.crSum/a.crN).toFixed(2):0};
    }).filter(Boolean);
  }
  return out;
}

// Parse a "DD-MM-YYYY - DD-MM-YYYY" period string (as found in Discount/Voucher Key Metrics sheets)
// into ['YYYY-MM-DD','YYYY-MM-DD']. Returns [null,null] if unparseable.
function periodToRange(period){
  const [a,b]=String(period||'').split(' - ').map(s=>s.trim());
  const start=parseDate(a), end=parseDate(b)||start;
  return [start,end];
}

// Insert/replace an entry keyed by `start` date, keeping the array sorted by start.
// Re-syncing the same month's file should overwrite its old entry, not duplicate it.
function upsertByStart(arr,entry){
  const i=arr.findIndex(e=>e.start===entry.start);
  if(i>=0) arr[i]=entry; else arr.push(entry);
  arr.sort((a,b)=>a.start.localeCompare(b.start));
}

// Resolve the global Period filter (S.grain + friends) to a ['YYYY-MM-DD','YYYY-MM-DD'] range,
// or null for "All Time" (no filtering). Anchors relative presets (today/yesterday/7d/30d) to the
// latest synced date rather than the real calendar date, same convention as the Daily picker.
function getPeriodRange(){
  const dates=(D.shopee.daily||[]).map(r=>r.date).sort();
  const latest=dates[dates.length-1];
  const addDays=(dateStr,n)=>{const d=new Date(dateStr+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  switch(S.grain){
    case 'y2025': return ['2025-01-01','2025-12-31'];
    case 'y2026': return ['2026-01-01','2026-12-31'];
    case 'today': return latest?[latest,latest]:null;
    case 'yesterday': return latest?[addDays(latest,-1),addDays(latest,-1)]:null;
    case '7d': return latest?[addDays(latest,-6),latest]:null;
    case '30d': return latest?[addDays(latest,-29),latest]:null;
    case 'daily': return S.selectedDate?[S.selectedDate,S.selectedDate]:null;
    case 'monthly': {
      if(!S.selectedMonth) return null;
      const {month,year}=S.selectedMonth;
      const mm=String(month+1).padStart(2,'0');
      const lastDay=String(new Date(year,month+1,0).getDate()).padStart(2,'0');
      return [`${year}-${mm}-01`,`${year}-${mm}-${lastDay}`];
    }
    case 'custom': {
      if(!S.customStart||!S.customEnd) return null;
      const [ey,em]=S.customEnd.split('-').map(Number);
      const lastDay=String(new Date(ey,em,0).getDate()).padStart(2,'0');
      return [`${S.customStart}-01`,`${S.customEnd}-${lastDay}`];
    }
    case 'campday': {
      // Shopee's N.N mega campaign runs on day N of month N — window is day N-1..N+1, any year.
      if(!S.selectedCampaignMonth) return null;
      const mo=S.selectedCampaignMonth, yr=S.selectedCampaignYear;
      const mm=String(mo).padStart(2,'0');
      return [`${yr}-${mm}-${String(Math.max(1,mo-1)).padStart(2,'0')}`,`${yr}-${mm}-${String(mo+1).padStart(2,'0')}`];
    }
    default: return null; // 'all'/'12m' — no filtering
  }
}

// Sum multiple months' Promotion Revenue entries that overlap the period into one view.
function aggregatePromoRevenue(range){
  const arr=D.shopee.promoRevenue||[];
  const matched=range?arr.filter(e=>e.start<=range[1]&&e.end>=range[0]):arr;
  if(!matched.length) return null;
  const byType={};
  for(const e of matched) for(const t of e.byType){
    if(!byType[t.type]) byType[t.type]={type:t.type,sales:0,orders:0,buyers:0};
    byType[t.type].sales+=t.sales; byType[t.type].orders+=t.orders; byType[t.type].buyers+=t.buyers;
  }
  const period=matched.length===1?matched[0].period:`${matched[0].period.split(' - ')[0]} → ${matched[matched.length-1].period.split(' - ')[1]}`;
  return {period,byType:Object.values(byType).sort((a,b)=>b.sales-a.sales)};
}

// Sum Voucher Performance from real daily records so any window (a month, a custom range, or a
// 3-day campaign-day window) is exact — not just whichever whole months happen to overlap it.
function aggregateVoucherPerf(range){
  const allDaily=(D.shopee.voucherPerf||[]).flatMap(e=>e.daily||[]).sort((a,b)=>a.date.localeCompare(b.date));
  if(!allDaily.length) return null;
  const matched=range?allDaily.filter(d=>d.date>=range[0]&&d.date<=range[1]):allDaily;
  if(!matched.length) return null;
  const sum=k=>matched.reduce((a,d)=>a+d[k],0);
  const orders=sum('orders');
  const fmt=iso=>{const[y,m,d]=iso.split('-');return `${d}-${m}-${y}`;};
  const period=matched.length===1?fmt(matched[0].date):`${fmt(matched[0].date)} → ${fmt(matched[matched.length-1].date)}`;
  return {
    period,sales:+sum('sales').toFixed(2),orders,claims:sum('claims'),
    // ponytail: usage rate weighted by orders as a proxy — exact rate needs each day's impression base, not stored
    usageRate:orders?+(matched.reduce((a,d)=>a+d.usageRate*d.orders,0)/orders).toFixed(2):0,
    buyers:sum('buyers'),cost:+sum('cost').toFixed(2),
  };
}

function applyMonths(months,months25,name,fileId,platform='shopee'){
  const k=platform.replace(/-/g,'');
  PLAT_S[platform].fileId=fileId; PLAT_S[platform].name=name;
  localStorage.setItem(`hygr_fid_${k}`,fileId);
  localStorage.setItem(`hygr_fnm_${k}`,name);
  const dKey=PLAT_D[platform];
  if(D[dKey]){
    D[dKey].m2026=months;
    if(months25&&months25.length) D[dKey].m2025=months25;
  }
  setPlatformStatus(platform,'connected',`${months.length} mo 2026 · ${months25?.length||0} mo 2025 · ${name.slice(0,25)}`);
  syncLog(`[${platform}] ✓ 2026: ${months.length} month(s), 2025: ${months25?.length||0} month(s)`);
  if(typeof clearFilterCache === 'function') clearFilterCache();
  saveCache(platform);
  renderKPIs(); showPanel(S.nav);
}

// Load all files in a folder, merge by month+year, apply once
async function loadAllFilesInFolder(loadables,folderName,platform='shopee'){
  if(!loadables.length) return;
  setPlatformStatus(platform,'fetching',`Loading ${loadables.length} file(s)…`);
  syncLog(`[${platform}] Auto-loading all ${loadables.length} file(s) from "${folderName}"…`);
  const sorted=[...loadables].sort((a,b)=>a.name.localeCompare(b.name));
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const merged25={},merged26={};
  const mergeInto=(merged,mo)=>{
    if(!merged[mo.m]) merged[mo.m]={...mo,crSum:mo.cr,crN:mo.cr?1:0,bSum:mo.b,bN:mo.b?1:0};
    else{const a=merged[mo.m];a.s+=mo.s;a.o+=mo.o;a.v+=mo.v;a.cl+=mo.cl;
      a.co=(a.co||0)+(mo.co||0);a.cs=(a.cs||0)+(mo.cs||0);
      a.ro=(a.ro||0)+(mo.ro||0);a.rs=(a.rs||0)+(mo.rs||0);
      a.bu=(a.bu||0)+(mo.bu||0);a.nbu=(a.nbu||0)+(mo.nbu||0);a.ebu=(a.ebu||0)+(mo.ebu||0);
      if(mo.cr){a.crSum+=mo.cr;a.crN++;}if(mo.b){a.bSum+=mo.b;a.bN++;}}
  };
  let ok=0,lastId='';
  const allDailyRows=[];
  for(const f of sorted){
    if(f!==sorted[0]) await new Promise(r=>setTimeout(r,200)); // stagger requests to avoid tripping Google's per-IP rate limit
    try{
      const rows=await fetchRawRows(f);
      // Shopee Live exports share column words with shop stats and parse as garbage — skip with a clear message
      if(rows.slice(0,5).some(r=>Array.isArray(r)&&r.some(c=>/livestream name/i.test(String(c))))){
        syncLog(`  ⚠ Skipped "${f.name}": Shopee Live report — export "Shop Performance" (shop-stats) instead`);
        continue;
      }
      const {m2025,m2026}=rowsToMonths(rows,f.name);
      if(!m2025.length&&!m2026.length){
        const hdrs=rows[0]?rows[0].filter(Boolean).slice(0,6).join(' | '):'empty';
        syncLog(`  ⚠ No data in "${f.name}" — columns: ${hdrs}`);
      } else {
        for(const mo of m2025) mergeInto(merged25,mo);
        for(const mo of m2026) mergeInto(merged26,mo);
        // Also parse daily records from the same rows
        const daily=rowsToDaily(rows);
        if(daily.length) allDailyRows.push(...daily);
        ok++; lastId=f.id;
        const y25=m2025.map(m=>m.m).join(',');
        const y26=m2026.map(m=>m.m).join(',');
        syncLog(`  ✓ ${f.name} → 2025:[${y25||'—'}] 2026:[${y26||'—'}]${daily.length?` · ${daily.length}d`:''}`);}
      // Scan all sheets in xlsx for campaign/promo/affiliate/breakdown data
      const isXlsx=f.name.toLowerCase().endsWith('.xlsx')||f.name.toLowerCase().endsWith('.xls')||f.mimeType===XLSX_MIME||f.mimeType===XLS_MIME;
      if(isXlsx){
        try{const wb=await fetchXlsxWorkbook(f);extractExtraSheets(wb,platform,f.name);}
        catch(e){syncLog(`  ⚠ Extra-sheets parse error in "${f.name}": ${e.message}`);}
      }
    }catch(e){syncLog(`  ⚠ Skipped "${f.name}": ${e.message}`);}
  }
  const buildFinal=merged=>mNames.map(mk=>{
    const a=merged[mk]; if(!a||(!a.s&&!a.o)) return null;
    return{m:mk,s:+a.s.toFixed(2),o:a.o,v:a.v,cl:a.cl,
      cr:a.crN?+(a.crSum/a.crN).toFixed(2):(a.o&&a.v?+(a.o/a.v*100).toFixed(2):0),
      b:a.bN?+(a.bSum/a.bN).toFixed(2):(a.o&&a.s?+(a.s/a.o).toFixed(2):0),
      co:a.co||0,cs:+((a.cs||0).toFixed(2)),ro:a.ro||0,rs:+((a.rs||0).toFixed(2)),
      bu:a.bu||0,nbu:a.nbu||0,ebu:a.ebu||0};
  }).filter(Boolean);
  const final26=buildFinal(merged26);
  const final25=buildFinal(merged25);
  if(!final26.length&&!final25.length){
    setPlatformStatus(platform,'error','No valid data in any file.');
    syncLog(`[${platform}] Could not parse any file. Ensure filenames contain dates like YYYYMMDD-YYYYMMDD or YYYYMM.`,true);
    return;
  }
  syncLog(`[${platform}] ✓ Merged ${ok} file(s) → 2026:${final26.length}mo, 2025:${final25.length}mo`);
  // Store deduplicated daily records
  const _dKey=PLAT_D[platform];
  if(D[_dKey]&&D[_dKey].daily!==undefined&&allDailyRows.length){
    const seen=new Set();
    D[_dKey].daily=allDailyRows.filter(r=>{if(seen.has(r.date)) return false;seen.add(r.date);return true;}).sort((a,b)=>a.date.localeCompare(b.date));
    syncLog(`[${platform}] Daily records: ${D[_dKey].daily.length} day(s)`);
  }
  // Scan any extra xlsx files (non-revenue) for extra sheets (Source Contribution etc.)
  const _extraXlsx=PLAT_S[platform]?._extraXlsx||[];
  if(_extraXlsx.length){
    syncLog(`[${platform}] Scanning ${_extraXlsx.length} extra xlsx file(s) for Source Contribution…`);
    for(const f of _extraXlsx){
      if(f!==_extraXlsx[0]) await new Promise(r=>setTimeout(r,200));
      try{const wb=await fetchXlsxWorkbook(f);extractExtraSheets(wb,platform,f.name);}
      catch(e){syncLog(`  ⚠ Extra-file parse error "${f.name}": ${e.message}`);}
    }
  }
  // Build sorted ads array from per-month data collected in extractExtraSheets
  if(D[_dKey]&&D[_dKey].adsByMonth){
    const _mOrd=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    D[_dKey].ads=Object.values(D[_dKey].adsByMonth)
      .sort((a,b)=>a.year!==b.year?a.year-b.year:_mOrd.indexOf(a.m)-_mOrd.indexOf(b.m));
    syncLog(`[${platform}] Ads data: ${D[_dKey].ads.length} month(s)`);
  }
  // Build sorted promo/voucher detail lists from per-name totals collected in extractExtraSheets
  if(D[_dKey]&&D[_dKey].promoList){
    D[_dKey].promoListArr=Object.values(D[_dKey].promoList).sort((a,b)=>b.sales-a.sales);
  }
  if(D[_dKey]&&D[_dKey].voucherList){
    D[_dKey].voucherListArr=Object.values(D[_dKey].voucherList).sort((a,b)=>b.sales-a.sales);
  }
  applyMonths(final26,final25,folderName+' (all files)',lastId,platform);
  startAutoRefresh();
}

async function loadProductFiles(files,platform){
  const sorted=[...files].sort((a,b)=>a.name.localeCompare(b.name));
  const allProds=[];
  for(const f of sorted){
    if(f!==sorted[0]) await new Promise(r=>setTimeout(r,200));
    try{
      const rows=await fetchRawRows(f);
      const prods=rowsToProducts(rows,f.name);
      if(prods.length){
        syncLog(`  → Products: ${prods.length} from "${f.name}"`);
        allProds.push(...prods);
      }
    }catch(e){syncLog(`  ⚠ Product file skipped "${f.name}": ${e.message}`);}
  }
  if(!allProds.length) return;
  // Aggregate across months — keep top 20 by total GMV
  const agg={};
  for(const p of allProds){
    if(!agg[p.name]) agg[p.name]={...p};
    else{agg[p.name].gmv+=p.gmv;agg[p.name].orders+=p.orders;agg[p.name].clicks+=p.clicks;agg[p.name].units+=p.units;}
  }
  const dKey=PLAT_D[platform];
  if(D[dKey]) D[dKey].products=Object.values(agg).sort((a,b)=>b.gmv-a.gmv).slice(0,20);
  syncLog(`[${platform}] ✓ ${D[dKey]?.products?.length||0} products loaded`);
  if(S.nav==='products') renderProducts();
}

// ── Auto-refresh every 5 min ──
let _autoRefreshTimer=null;
function startAutoRefresh(){
  const intervalMs=5*60*1000;
  if(_autoRefreshTimer) clearInterval(_autoRefreshTimer);
  _autoRefreshTimer=setInterval(async()=>{
    if(!GS.apiKey) return;
    for(const plat of Object.keys(PLAT_S)){
      const ps=PLAT_S[plat];
      if(!ps.url||!ps.nav||!ps.nav.length) continue;
      const cur=ps.nav[ps.nav.length-1];
      try{
        const fields=encodeURIComponent('files(id,name,mimeType,modifiedTime,webContentLink)');
        const q=encodeURIComponent(`'${cur.id}' in parents`);
        const res=await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&key=${GS.apiKey}&fields=${fields}&orderBy=modifiedTime+desc&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true`);
        const data=await res.json();
        if(!res.ok) continue;
        const newFiles=(data.files||[]).filter(isLoadable);
        const newest=newFiles.sort((a,b)=>new Date(b.modifiedTime)-new Date(a.modifiedTime))[0];
        if(newest&&newest.id!==ps.fileId){
          syncLog(`[${plat}] New file detected: "${newest.name}" — reloading…`);
          await loadAllFilesInFolder(newFiles,cur.name,plat);
        }
      }catch(e){}
    }
  },intervalMs);
}

function applyParsedRows(rows,name,fileId,platform='shopee'){
  if(!rows||rows.length<2){
    syncLog('Could not parse rows. File appears empty.',true);
    return;
  }
  const {m2025,m2026}=rowsToMonths(rows,name);
  if(!m2026.length&&!m2025.length){
    const rawHeaders=rows[0].map(h=>String(h).trim()).join(' | ');
    syncLog(`Headers: ${rawHeaders}`,true);
    syncLog('No parseable data. Ensure file has Date/Month and Sales columns.',true);
    return;
  }
  applyMonths(m2026,m2025,name,fileId,platform);
}

