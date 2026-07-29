/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const D = {
  shopee:   { m2026:[], m2025:[], products:[], channels:null, ads:[], adsByMonth:{}, adsDailyByDate:{}, adsDailySrc:{}, adsSrcOrder:[], channel:null, channelByMonth:{}, trafficSources:null, trafficSourcesByMonth:{}, buyers:[], daily:[], composition:null, compositionByMonth:{}, promoRevenue:[], voucherPerf:[], promoList:{}, promoListArr:[], voucherList:{}, voucherListArr:[] },
  tiktok:   { m2026:[], m2025:[], products:[], channels:null, breakdown:[], affiliate:[], ads:[], views:[], daily:[] },
  shopeeSG: { m2026:[], m2025:[], products:[], channels:null, channel:null, channelByMonth:{}, trafficSources:null, trafficSourcesByMonth:{}, daily:[] },
  tiktokSG: { m2026:[], m2025:[], products:[], channels:null, breakdown:[], affiliate:[], daily:[] },
  products: [],
};

/* ─── HELPERS ─── */
const RM = v => 'RM'+Math.round(v).toLocaleString();
const RMk = v => v>=1000000?'RM'+(v/1000000).toFixed(2)+'M':v>=1000?'RM'+(v/1000).toFixed(1)+'k':'RM'+v.toFixed(2).replace(/\.00$/,'');
const RMfull = v => 'RM'+Math.round(v).toLocaleString();
const Pct = v => v==null?'—':v.toFixed(2)+'%';
const Num = v => v==null?'—':v.toLocaleString();
const cTooltip = {
  backgroundColor:'#ffffff',
  titleColor:'#0f172a',
  bodyColor:'#475569',
  borderColor:'#e2e8f0',
  borderWidth:1,
  padding:10,
  cornerRadius:7,
  callbacks:{label:ctx=>' '+ctx.dataset.label+': '+ctx.formattedValue}
};
Chart.defaults.font.family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
Chart.defaults.color='#94a3b8';

/* ─── STATE ─── */
const S = {
  nav:'overview',
  platform:'all',
  grain:'all',
  driveUrl: localStorage.getItem('hygr_drive')||'',
  syncStatus:'idle',
  lastSync:null,
  selectedDate:null, // 'YYYY-MM-DD' for daily grain
  adsGrain:'all',       // independent period for Shopee Ads section: 'all'|'monthly'|'custom'|'daily'
  adsMonth:null,        // {month:0-11, year:2026} for 'monthly' grain
  adsDateStart:null,    // 'YYYY-MM' for 'custom' grain
  adsDateEnd:null,      // 'YYYY-MM' for 'custom' grain
  adsDate:null,         // 'YYYY-MM-DD' for 'daily' grain
  adsSrc:'all',         // selected source filter in Summary tab
  adsExpanded:new Set(),// set of expanded source names in monthly accordion
};

/* ─── FILTERED DATA ───
   One shared implementation for all 4 platforms — was 4 near-duplicate copies where
   only Shopee MY's had 'daily'/'custom' grain support, so switching the global period
   picker to Daily or Custom Range on TikTok MY/Shopee SG/TikTok SG silently fell through
   to full-year data instead of respecting the selected period. */
const _filterCache = {};
function clearFilterCache() {
  for (const k in _filterCache) delete _filterCache[k];
}

function filteredByKey(dKey){
  const stateKey = `${S.grain}|${S.selectedDate}|${S.selectedMonth?.month}-${S.selectedMonth?.year}|${S.customStart}|${S.customEnd}|${S.selectedCampaignMonth}-${S.selectedCampaignYear}`;
  if (_filterCache[dKey] && _filterCache[dKey].key === stateKey) {
    return _filterCache[dKey].data;
  }
  
  const Dp=D[dKey];
  const all=[...Dp.m2025,...Dp.m2026];
  let result;
  
  if(S.grain==='all'||S.grain==='12m') result = all;
  else if(S.grain==='y2025') result = Dp.m2025;
  else if(S.grain==='y2026') result = Dp.m2026;
  else if(S.grain==='today'||S.grain==='yesterday'||S.grain==='7d'||S.grain==='30d') result = Dp.m2026.slice(-1);
  else if(S.grain==='daily'&&S.selectedDate){
    // Return the aggregated monthly record for the selected date's month (for KPI context)
    const [y,,mo]=S.selectedDate.split('-').map(Number);
    const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const src=y===2025?Dp.m2025:Dp.m2026;
    const r=src.find(x=>x.m===mNames[mo-1]);
    // Return the specific daily record, fall back to monthly if not available
    const dr=(Dp.daily||[]).find(x=>x.date===S.selectedDate);
    result = dr?[dr]:r?[r]:Dp.m2026.slice(-1);
  }
  else if(S.grain==='monthly'&&S.selectedMonth){
    const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mn=mNames[S.selectedMonth.month];
    const yr=S.selectedMonth.year;
    const src=yr===2025?Dp.m2025:Dp.m2026;
    const r=src.find(x=>x.m===mn);
    result = r?[r]:Dp.m2026.slice(-1);
  }
  else if(S.grain==='custom'&&S.customStart&&S.customEnd){
    const [sy,sm]=S.customStart.split('-').map(Number);
    const [ey,em]=S.customEnd.split('-').map(Number);
    result = all.filter(r=>{
      const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mi=mNames.indexOf(r.m);
      const yr=Dp.m2025.includes(r)?2025:2026;
      return (yr>sy||(yr===sy&&mi+1>=sm))&&(yr<ey||(yr===ey&&mi+1<=em));
    });
  }
  else if(S.grain==='campday'&&S.selectedCampaignMonth){
    // Aggregate the day-before/day/day-after window from real daily records into one
    // monthly-shaped record, so KPIs/charts that only know how to read m2025/m2026-style
    // rows can consume it without their own special case.
    const range=getPeriodRange();
    const rows=range?(Dp.daily||[]).filter(r=>r.date>=range[0]&&r.date<=range[1]):[];
    if(!rows.length) result = [];
    else {
      const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const s=rows.reduce((a,r)=>a+r.s,0), o=rows.reduce((a,r)=>a+r.o,0);
      const v=rows.reduce((a,r)=>a+(r.v||0),0), cl=rows.reduce((a,r)=>a+(r.cl||0),0);
      const cr=rows.reduce((a,r)=>a+(r.cr||0),0)/rows.length;
      result = [{m:mNames[S.selectedCampaignMonth-1],s:+s.toFixed(2),o,v,cl,cr:+cr.toFixed(2),b:o?+(s/o).toFixed(2):0}];
    }
  } else {
    result = Dp.m2026;
  }
  
  _filterCache[dKey] = { key: stateKey, data: result };
  return result;
}
function filteredShopee(){ return filteredByKey('shopee'); }
function filteredTT(){ return filteredByKey('tiktok'); }
function filteredShopeeSG(){ return filteredByKey('shopeeSG'); }
function filteredTiktokSG(){ return filteredByKey('tiktokSG'); }

/* ─── PREV PERIOD HELPERS ─── */
function getPrevByKey(dKey){
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const Dp=D[dKey];
  if(S.grain==='monthly'&&S.selectedMonth){
    const{month,year}=S.selectedMonth;
    const pm=month===0?11:month-1, py=month===0?year-1:year;
    const src=py===2025?Dp.m2025:Dp.m2026;
    const r=src.find(x=>x.m===mNames[pm]);
    return r?[r]:[];
  }
  // Year-to-date views: compare against the *same* number of months from the prior year,
  // not the full 12 — otherwise a 6-month YTD total gets compared against a full prior year
  // and looks like a huge decline even when the business is actually growing.
  if(S.grain==='y2026') return Dp.m2025.slice(0,Dp.m2026.length);
  if(S.grain==='y2025') return [];
  const f=filteredByKey(dKey);
  return f.length>=2?[f[f.length-2]]:[];
}
function getPrevShopee(){ return getPrevByKey('shopee'); }
// A month still mid-sync (e.g. only the first few days of June have arrived) will always look
// like a huge decline when compared against a completed prior month — that's a data-freshness
// gap, not a real trend, so callers should skip the % chip rather than show a false alarm.
function isPartialMonth(dKey,monthRow){
  if(!monthRow) return false;
  const Dp=D[dKey];
  const year=Dp.m2026.includes(monthRow)?2026:(Dp.m2025.includes(monthRow)?2025:null);
  if(!year) return false;
  const daily=(Dp.daily||[]).filter(r=>r.m===monthRow.m&&r.y===year);
  if(!daily.length) return false; // no daily granularity synced — can't tell, assume complete
  const idx=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(monthRow.m);
  const totalDays=new Date(year,idx+1,0).getDate();
  return daily.length<totalDays*0.9;
}

// Returns {ch, dir} for a period-over-period chip. lowerBetter=true inverts direction logic.
// period defaults to 'MoM'; pass 'YoY' for year-to-date comparisons.
function momChip(curr,prev,lowerBetter,period='MoM'){
  if(!prev||prev===0) return{ch:'—',dir:'up'};
  const pct=(curr-prev)/prev*100;
  const up=pct>0, flat=Math.abs(pct)<0.05;
  if(flat) return{ch:`→ flat ${period}`,dir:'up'};
  const label=(up?'↑':'↓')+Math.abs(pct).toFixed(1)+`% ${period}`;
  const dir=lowerBetter?(up?'warn':'up'):(up?'up':'warn');
  return{ch:label,dir};
}

/* ─── CHARTS MAP ─── */
const charts={};
function toggleAdsExpand(idx){
  const src=(D.shopee.adsSrcOrder||[])[parseInt(idx)];
  if(!src) return;
  if(S.adsExpanded.has(src)) S.adsExpanded.delete(src); else S.adsExpanded.add(src);
  renderShopeeAds();
}
// ── Buyers Composition tabs ──
let _buyersTab=0;
function switchBuyersTab(idx){
  _buyersTab=idx;
  [0,1,2].forEach(i=>document.getElementById('bcTab'+i).classList.toggle('active',i===idx));
  renderBuyersComp(idx);
}
// Picks the Buyers Composition month matching the current Period filter (exact month for
// Monthly/Campaign Day/Daily grains) instead of always the last-synced month — Sales Composition
// files only carry monthly-granularity data, so multi-month/All Time views fall back to the
// latest available month, same as before this existed.
function _compositionForPeriod(){
  const cbm=D.shopee.compositionByMonth||{};
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if(S.grain==='monthly'&&S.selectedMonth){
    const key=mNames[S.selectedMonth.month]+S.selectedMonth.year;
    if(cbm[key]) return cbm[key];
  } else if(S.grain==='campday'&&S.selectedCampaignMonth){
    const key=mNames[S.selectedCampaignMonth-1]+S.selectedCampaignYear;
    if(cbm[key]) return cbm[key];
  } else if(S.grain==='daily'&&S.selectedDate){
    const[y,,mo]=S.selectedDate.split('-').map(Number);
    const key=mNames[mo-1]+y;
    if(cbm[key]) return cbm[key];
  }
  return D.shopee.composition;
}
function renderBuyersComp(idx){
  const bl=document.getElementById('buyerList');
  const comp=_compositionForPeriod();
  if(!comp){bl.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">No data — sync a sales_composition file</div>';return;}
  document.getElementById('buyersCompSub').textContent=comp.month||'';
  const fmtN=v=>Math.round(v).toLocaleString();
  const fmtRM=v=>'RM'+(v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v.toFixed(0));
  const fmtP=v=>v.toFixed(2)+'%';
  const th=(cells,extra='')=>`<tr style="border-bottom:1px solid var(--border);font-size:10px;color:var(--t3);font-weight:600">${cells.map(c=>`<th style="padding:4px 6px;text-align:right;font-weight:600;${extra}">${c}</th>`).join('')}</tr>`;
  const td=(cells,bold=false)=>`<tr style="border-bottom:1px solid var(--border)">${cells.map((c,i)=>`<td style="padding:4px 6px;font-size:11px;${i===0?'text-align:left;':'text-align:right;'}${bold?'font-weight:700;':''}color:var(--t1)">${c}</td>`).join('')}</tr>`;
  const tbl=(head,rows)=>`<table style="width:100%;border-collapse:collapse;margin-top:6px">${head}${rows}</table>`;
  if(idx===0){
    // Type of Buyers
    const head=th(['Type','Buyers','Buyers%','Sales','Sales%','Conv%']);
    const rows=comp.typeOfBuyers.map(r=>td([r.type,fmtN(r.buyers),fmtP(r.buyersPct),fmtRM(r.sales),fmtP(r.salesPct),fmtP(r.cr)])).join('');
    bl.innerHTML=tbl(head,rows);
  } else if(idx===1){
    // Price Range
    const head=th(['Price (MYR)','Buyers','Buyers%','Sales','Conv%']);
    const rows=comp.priceRange.map(r=>td([r.range,fmtN(r.buyers),fmtP(r.buyersPct),fmtRM(r.sales),fmtP(r.cr)])).join('');
    bl.innerHTML=tbl(head,rows);
  } else {
    // Sub-Category
    const head=th(['Category','Sub-Category','Buyers','Sales','Sales%','Conv%']);
    const rows=comp.subCategory.map(r=>td([r.category,r.subCategory,fmtN(r.buyers),fmtRM(r.sales),fmtP(r.salesPct),fmtP(r.cr)])).join('');
    bl.innerHTML=tbl(head,rows);
  }
}

function setAdsGrain(grain){
  S.adsGrain=grain;
  S.adsSrc='all'; S.adsExpanded=new Set();
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ads=D.shopee.ads;
  // Default sub-selections to the latest month/day with real data, not today's calendar date —
  // otherwise opening the tab lands on an empty screen whenever this month hasn't synced yet.
  if(grain==='monthly'&&!S.adsMonth)
    S.adsMonth=S.selectedMonth||(ads.length?{month:MN.indexOf(ads[ads.length-1].m),year:ads[ads.length-1].year||2026}:{month:new Date().getMonth(),year:new Date().getFullYear()});
  if(grain==='daily'&&!S.adsDate){
    const dates=Object.keys(D.shopee.adsDailyByDate||{}).sort();
    S.adsDate=S.selectedDate||dates[dates.length-1]||new Date().toISOString().slice(0,10);
  }
  if(grain==='custom'&&(!S.adsDateStart||!S.adsDateEnd)){
    if(S.customStart&&S.customEnd){S.adsDateStart=S.customStart;S.adsDateEnd=S.customEnd;}
    else{
      if(ads.length){
        const f=ads[0],l=ads[ads.length-1];
        S.adsDateStart=`${f.year||2026}-${String(MN.indexOf(f.m)+1).padStart(2,'0')}`;
        S.adsDateEnd=`${l.year||2026}-${String(MN.indexOf(l.m)+1).padStart(2,'0')}`;
      } else {
        const n=new Date();
        S.adsDateStart=`${n.getFullYear()}-01`;
        S.adsDateEnd=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
      }
    }
  }
  document.querySelectorAll('[data-ag]').forEach(b=>b.classList.toggle('active',b.dataset.ag===grain));
  renderAdsSub();
  // Only render content immediately if the grain doesn't need a sub-selection first
  if(grain==='all'||(grain==='monthly'&&S.adsMonth)||(grain==='custom'&&S.adsDateStart&&S.adsDateEnd)||(grain==='daily'&&S.adsDate)){
    renderShopeeAds();
  } else {
    renderShopeeAds(); // still render to show the empty state / prompt
  }
}
function renderAdsSub(){
  const sub=document.getElementById('adsPeriodSub');
  if(!sub) return;
  const MNA=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if(S.adsGrain==='all'){
    sub.style.display='none'; sub.innerHTML=''; return;
  }
  sub.style.display='flex';
  if(S.adsGrain==='monthly'){
    const mv=S.adsMonth?`${S.adsMonth.year}-${String(S.adsMonth.month+1).padStart(2,'0')}`:'';
    sub.innerHTML=`<span style="color:var(--t3)">Month:</span><input class="ads-sub-input" type="month" value="${mv}" onchange="applyAdsMonth(this.value)">`;
  } else if(S.adsGrain==='custom'){
    const sv=S.adsDateStart||'',ev=S.adsDateEnd||'';
    sub.innerHTML=`<span style="color:var(--t3)">From:</span><input class="ads-sub-input" type="month" id="adsCpS" value="${sv}"><span style="color:var(--t3)">To:</span><input class="ads-sub-input" type="month" id="adsCpE" value="${ev}"><button class="ads-grain active" onclick="applyAdsCustom()">Apply</button>`;
  } else if(S.adsGrain==='daily'){
    const today=new Date().toISOString().slice(0,10);
    const dv=S.adsDate||today;
    sub.innerHTML=`<span style="color:var(--t3)">Date:</span><input class="ads-sub-input" type="date" value="${dv}" onchange="applyAdsDate(this.value)">`;
  }
}
function applyAdsMonth(val){
  if(!val) return;
  const[y,m]=val.split('-').map(Number);
  S.adsMonth={month:m-1,year:y};
  S.adsSrc='all'; S.adsExpanded=new Set();
  renderShopeeAds();
}
function applyAdsCustom(){
  const s=document.getElementById('adsCpS')?.value;
  const e=document.getElementById('adsCpE')?.value;
  if(!s||!e) return;
  S.adsDateStart=s; S.adsDateEnd=e;
  S.adsSrc='all';
  renderShopeeAds();
}
function applyAdsDate(val){
  if(!val) return;
  S.adsDate=val;
  S.adsSrc='all';
  renderShopeeAds();
}
function renderShopeeAds(){
  // Sync grain button active states and sub-picker visibility
  document.querySelectorAll('[data-ag]').forEach(b=>b.classList.toggle('active',b.dataset.ag===S.adsGrain));
  renderAdsSub();
  const adArr=D.shopee.ads;
  const MNA=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtI=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(1)+'k':Num(v);
  const rc=v=>v>=5?'roi-good':v>=3.5?'roi-warn':'roi-bad';
  // When adsGrain==='all', auto-follow the main period selector
  let g=S.adsGrain;
  let adsMonth=S.adsMonth, adsDate=S.adsDate, adsDateStart=S.adsDateStart, adsDateEnd=S.adsDateEnd;
  if(g==='all'){
    if(S.grain==='monthly'&&S.selectedMonth){g='monthly';adsMonth=S.selectedMonth;}
    else if(S.grain==='daily'&&S.selectedDate){g='daily';adsDate=S.selectedDate;}
    else if(S.grain==='custom'&&S.customStart&&S.customEnd){g='custom';adsDateStart=S.customStart;adsDateEnd=S.customEnd;}
  }
  // Helper: is a monthly adArr entry within the custom range?
  const inCustom=r=>{
    if(!adsDateStart||!adsDateEnd) return true;
    const[sy,sm]=adsDateStart.split('-').map(Number);
    const[ey,em]=adsDateEnd.split('-').map(Number);
    const ri=MNA.indexOf(r.m),ry=r.year||2026;
    const rn=ry*12+ri,sn=sy*12+(sm-1),en=ey*12+(em-1);
    return rn>=sn&&rn<=en;
  };
  // Helper: aggregate trafficSourcesByMonth for a set of keys
  const aggSrcs=keys=>{
    const seen={};
    const tbm=D.shopee.trafficSourcesByMonth||{};
    keys.forEach(k=>{
      const ts=tbm[k]; if(!ts||!ts.shopeeAds) return;
      ts.shopeeAds.forEach(r=>{
        if(!seen[r.src]) seen[r.src]={src:r.src,s:0,imp:0,o:0,exp:0};
        seen[r.src].s+=r.s; seen[r.src].imp+=r.imp; seen[r.src].o+=r.o; seen[r.src].exp+=r.exp;
      });
    });
    return Object.values(seen).map(r=>({...r,roas:r.exp>0?+(r.s/r.exp).toFixed(2):0,s:+r.s.toFixed(2),exp:+r.exp.toFixed(2)})).sort((a,b)=>b.s-a.s);
  };

  // Subtitle
  const sub=document.getElementById('shopeeAdsSub');
  if(sub){
    if(g==='monthly'&&adsMonth) sub.textContent=`${MNA[adsMonth.month]} ${adsMonth.year} — Daily`;
    else if(g==='custom'&&adsDateStart&&adsDateEnd){
      const fmt=v=>{const[y,m]=v.split('-');return MNA[parseInt(m)-1]+' '+y;};
      sub.textContent=`${fmt(adsDateStart)} → ${fmt(adsDateEnd)}`;
    }
    else if(g==='daily'&&adsDate){
      const[dy,dmo,dd]=adsDate.split('-');
      sub.textContent=`${dd} ${MNA[parseInt(dmo)-1]} ${dy}`;
    }
    else if(adArr.length) sub.textContent=`${adArr[0].m} ${adArr[0].year||''} – ${adArr[adArr.length-1].m} ${adArr[adArr.length-1].year||''}`;
    else sub.textContent='—';
  }

  // TAB 0 — Summary
  {
    if(g==='monthly'&&adsMonth){
      // Accordion: one aggregate row per source, click to expand daily rows
      const{month,year}=adsMonth;
      const pfx=`${year}-${String(month+1).padStart(2,'0')}-`;
      const srcNames=D.shopee.adsSrcOrder||[];
      const allDays=Object.values(D.shopee.adsDailyByDate||{}).filter(r=>r.date.startsWith(pfx)).sort((a,b)=>a.date.localeCompare(b.date));
      const el0=document.getElementById('shopeeAdsTab0');
      if(!allDays.length){
        const _totDates=Object.keys(D.shopee.adsDailyByDate||{}).length;
        const _totSrcs=(D.shopee.adsSrcOrder||[]).length;
        // Full parser trace stays in window._adsParseLog for devtools — never render it, end users don't need SheetJS internals
        const _dbg=_totDates>0
          ? `${_totDates} dates stored (${_totSrcs} sources) — select different month or re-sync`
          : `0 dates parsed — sync log below`;
        el0.innerHTML=`<div style="color:var(--t3);font-size:11px;padding:16px 20px;text-align:center">
          No daily data for this period<br>
          <span style="font-size:9px;opacity:0.7">${_dbg}</span>
          <button class="btn-sm ghost" onclick="showPanel('sync')" style="font-size:10px;padding:2px 8px">Full Sync Log ↗</button>
        </div>`;
      } else {
        const srcData=srcNames.map((src,i)=>{
          const days=Object.values((D.shopee.adsDailySrc||{})[src]||{}).filter(r=>r.date.startsWith(pfx)).sort((a,b)=>a.date.localeCompare(b.date));
          const tS=days.reduce((a,r)=>a+r.s,0),tImp=days.reduce((a,r)=>a+r.imp,0),tO=days.reduce((a,r)=>a+r.o,0),tExp=days.reduce((a,r)=>a+r.exp,0);
          return{src,i,days,tS,tImp,tO,tExp,roas:tExp>0?+(tS/tExp).toFixed(2):0};
        }).filter(d=>d.tS>0||d.tExp>0);
        // Sort: "Others" always last, rest by GMV descending
        srcData.sort((a,b)=>{
          if(/^others$/i.test(a.src)) return 1;
          if(/^others$/i.test(b.src)) return -1;
          return b.tS-a.tS;
        });
        const gS=allDays.reduce((a,r)=>a+r.s,0),gImp=allDays.reduce((a,r)=>a+r.imp,0),gO=allDays.reduce((a,r)=>a+r.o,0),gExp=allDays.reduce((a,r)=>a+r.exp,0);
        const gRoas=gExp>0?+(gS/gExp).toFixed(2):0;
        const nS=srcData.reduce((a,d)=>a+d.tS,0),nImp=srcData.reduce((a,d)=>a+d.tImp,0),nO=srcData.reduce((a,d)=>a+d.tO,0),nExp=srcData.reduce((a,d)=>a+d.tExp,0);
        const othS=+(gS-nS).toFixed(2),othImp=gImp-nImp,othO=gO-nO,othExp=+(gExp-nExp).toFixed(2);
        const othRoas=othExp>0?+(othS/othExp).toFixed(2):0;
        const df=d=>d.date.slice(8)+'/'+d.date.slice(5,7);
        let tb='';
        srcData.forEach(({src,i,days,tS,tImp,tO,tExp,roas})=>{
          const open=S.adsExpanded.has(src),conv=tImp>0?+(tO/tImp*100).toFixed(2):0;
          tb+=`<tr style="border-top:1px solid var(--border-sub);cursor:pointer;background:var(--bg2)" onclick="toggleAdsExpand(${i})">
            <td style="padding:4px 6px 4px 8px;font-weight:600;color:var(--t1)"><span style="font-size:9px;color:var(--indigo);margin-right:3px">${open?'▼':'▶'}</span>${src}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t1)">${RMk(tS)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${RMk(tExp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${fmtI(tImp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${Num(tO)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t3)">${conv?conv+'%':'—'}</td>
            <td style="padding:4px 8px;text-align:right" class="${rc(roas)}">${roas}x</td></tr>`;
          if(open) days.forEach(r=>{
            const dc=r.imp>0?+(r.o/r.imp*100).toFixed(2):0;
            tb+=`<tr style="border-top:1px solid var(--border-sub)">
              <td style="padding:3px 8px 3px 22px;color:var(--t2);font-size:9.5px">${df(r)}</td>
              <td style="padding:3px 8px;text-align:right;color:var(--t1);font-size:9.5px">${RMk(r.s)}</td>
              <td style="padding:3px 8px;text-align:right;color:var(--t2);font-size:9.5px">${RMk(r.exp)}</td>
              <td style="padding:3px 8px;text-align:right;color:var(--t2);font-size:9.5px">${fmtI(r.imp)}</td>
              <td style="padding:3px 8px;text-align:right;color:var(--t2);font-size:9.5px">${Num(r.o)}</td>
              <td style="padding:3px 8px;text-align:right;color:var(--t3);font-size:9.5px">${dc?dc+'%':'—'}</td>
              <td style="padding:3px 8px;text-align:right;font-size:9.5px" class="${rc(r.roas)}">${r.roas}x</td></tr>`;
          });
        });
        if(othS>0.01||othExp>0.01){
          const oc=othImp>0?+(othO/othImp*100).toFixed(2):0;
          tb+=`<tr style="border-top:1px solid var(--border-sub)">
            <td style="padding:4px 8px;color:var(--t3);font-style:italic">Others</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${RMk(othS)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${RMk(othExp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${fmtI(othImp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${Num(othO)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t3)">${oc?oc+'%':'—'}</td>
            <td style="padding:4px 8px;text-align:right" class="${rc(othRoas)}">${othRoas}x</td></tr>`;
        }
        const gc=gImp>0?+(gO/gImp*100).toFixed(2):0;
        tb+=`<tr style="border-top:2px solid var(--border);font-weight:700;background:var(--bg2)">
          <td style="padding:4px 8px;color:var(--t1)">Total</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t1)">${RMk(gS)}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t2)">${RMk(gExp)}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t2)">${fmtI(gImp)}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t2)">${Num(gO)}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t3)">${gc?gc+'%':'—'}</td>
          <td style="padding:4px 8px;text-align:right" class="${rc(gRoas)}">${gRoas}x</td></tr>`;
        el0.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead style="position:sticky;top:0;z-index:1;background:var(--bg2)"><tr style="color:var(--t3);text-transform:uppercase;letter-spacing:.4px">
            <th style="padding:4px 8px;text-align:left">Source / Date</th>
            <th style="padding:4px 8px;text-align:right">GMV</th>
            <th style="padding:4px 8px;text-align:right">Expense</th>
            <th style="padding:4px 8px;text-align:right">Impressions</th>
            <th style="padding:4px 8px;text-align:right">Orders</th>
            <th style="padding:4px 8px;text-align:right">Conv%</th>
            <th style="padding:4px 8px;text-align:right">ROAS</th>
          </tr></thead><tbody>${tb}</tbody></table>`;
      }
    } else {
      // Flat table for all/custom/daily grains
      let rows=[],isDateRows=false;
      if(g==='daily'&&adsDate){
        isDateRows=true;
        const r=(D.shopee.adsDailyByDate||{})[adsDate];
        if(r) rows=[r];
      } else if(g==='custom'){
        rows=adArr.filter(inCustom);
      } else {
        rows=adArr;
      }
      const tS=rows.reduce((a,r)=>a+r.s,0),tImp=rows.reduce((a,r)=>a+r.imp,0),tO=rows.reduce((a,r)=>a+r.o,0),tExp=rows.reduce((a,r)=>a+r.exp,0);
      const tRoas=tExp>0?+(tS/tExp).toFixed(2):0;
      const lbl=r=>isDateRows?(r.date.slice(8)+'/'+r.date.slice(5,7)):(r.m+' '+(r.year||''));
      const noDataMsg=isDateRows
        ?`<div style="color:var(--t3);font-size:11px;padding:20px;text-align:center">No ads data for this date</div>`
        :`<div style="color:var(--t3);font-size:11px;padding:20px;text-align:center">No ads data for this period</div>`;
      document.getElementById('shopeeAdsTab0').innerHTML=rows.length?
        `<table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead style="position:sticky;top:0;z-index:1;background:var(--bg2)"><tr style="color:var(--t3);text-transform:uppercase;letter-spacing:.4px">
            <th style="padding:4px 8px;text-align:left">${isDateRows?'Date':'Month'}</th>
            <th style="padding:4px 8px;text-align:right">GMV</th>
            <th style="padding:4px 8px;text-align:right">Expense</th>
            <th style="padding:4px 8px;text-align:right">Impressions</th>
            <th style="padding:4px 8px;text-align:right">Orders</th>
            <th style="padding:4px 8px;text-align:right">Conv%</th>
            <th style="padding:4px 8px;text-align:right">ROAS</th>
          </tr></thead><tbody>
          ${rows.map(r=>{const conv=r.imp>0?+(r.o/r.imp*100).toFixed(2):0;return`<tr style="border-top:1px solid var(--border-sub)">
            <td style="padding:4px 8px;font-weight:600;color:var(--t1)">${lbl(r)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t1)">${RMk(r.s)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${RMk(r.exp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${fmtI(r.imp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${Num(r.o)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t3)">${conv?conv+'%':'—'}</td>
            <td style="padding:4px 8px;text-align:right" class="${rc(r.roas)}">${r.roas}x</td>
          </tr>`;}).join('')}
          ${rows.length>1?`<tr style="border-top:2px solid var(--border);font-weight:700;background:var(--bg2)">
            <td style="padding:4px 8px;color:var(--t1)">Total</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t1)">${RMk(tS)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${RMk(tExp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${fmtI(tImp)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t2)">${Num(tO)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--t3)">—</td>
            <td style="padding:4px 8px;text-align:right" class="${rc(tRoas)}">${tRoas}x</td>
          </tr>`:''}
          </tbody></table>`:noDataMsg;
    }
  }

  // TAB 1 — By Source
  {
    let srcs=[];
    if(g==='monthly'&&adsMonth){
      const key=MNA[adsMonth.month]+adsMonth.year;
      srcs=aggSrcs([key]);
    } else if(g==='daily'&&adsDate){
      // Build per-source snapshot for this specific date
      const srcData=D.shopee.adsDailySrc||{};
      const seenD={};
      Object.entries(srcData).forEach(([src,days])=>{
        const r=days[adsDate]; if(!r) return;
        seenD[src]={src,s:r.s,imp:r.imp,o:r.o,exp:r.exp,roas:r.roas};
      });
      srcs=Object.values(seenD).sort((a,b)=>b.s-a.s);
    } else if(g==='custom'){
      const filteredAdArr=adArr.filter(inCustom);
      const keys=filteredAdArr.map(r=>r.m+r.year);
      srcs=aggSrcs(keys);
    } else {
      srcs=aggSrcs(Object.keys(D.shopee.trafficSourcesByMonth||{}));
    }
    document.getElementById('shopeeAdsTab1').innerHTML=srcs.length?
      `<table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead style="position:sticky;top:0;z-index:1;background:var(--bg2)"><tr style="color:var(--t3);text-transform:uppercase;letter-spacing:.4px">
          <th style="padding:4px 8px;text-align:left">Source</th>
          <th style="padding:4px 8px;text-align:right">GMV</th>
          <th style="padding:4px 8px;text-align:right">Expense</th>
          <th style="padding:4px 8px;text-align:right">Impressions</th>
          <th style="padding:4px 8px;text-align:right">Orders</th>
          <th style="padding:4px 8px;text-align:right">ROAS</th>
        </tr></thead>
        <tbody>${srcs.map(r=>`<tr style="border-top:1px solid var(--border-sub)">
          <td style="padding:4px 8px;font-weight:600;color:var(--t1)">${r.src}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t1)">${RMk(r.s)}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t2)">${RMk(r.exp)}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t2)">${fmtI(r.imp)}</td>
          <td style="padding:4px 8px;text-align:right;color:var(--t2)">${Num(r.o)}</td>
          <td style="padding:4px 8px;text-align:right" class="${rc(r.roas)}">${r.roas}x</td>
        </tr>`).join('')}</tbody></table>`
      :`<div style="color:var(--t3);font-size:11px;padding:20px;text-align:center">No source data for this period</div>`;
  }

  // TAB 2 — ROAS trend chart (all-time)
  mkChart('shopeeRoiChart',{type:'line',data:{
    labels:adArr.map(r=>r.m+(r.year===2025?" '25":" '26")),
    datasets:[
      {label:'ROAS',data:adArr.map(r=>r.roas),borderColor:'#3fb950',borderWidth:2.5,pointRadius:4,pointBackgroundColor:adArr.map(r=>r.roas>=5?'#3fb950':r.roas>=3.5?'#f59e0b':'#f85149'),tension:.4,yAxisID:'y'},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ROAS: ${(+c.raw).toFixed(2)}x`}}},
    scales:{
      x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>(+v).toFixed(1)+'x'},title:{display:true,text:'ROAS',font:{size:9}}},
    }}});
}
function switchAdsTab(idx){
  document.querySelectorAll('#shopeeAdsTabRow .ads-tab').forEach((b,i)=>b.classList.toggle('active',i===idx));
  for(let i=0;i<3;i++) document.getElementById(`shopeeAdsTab${i}`).style.display=i===idx?'':'none';
  if(idx===2) requestAnimationFrame(()=>{if(charts['shopeeRoiChart']) charts['shopeeRoiChart'].resize();});
}
function mkChart(id,cfg){
  const el=document.getElementById(id);
  if(!el) return;
  if(charts[id] && charts[id].config.type === cfg.type){
    charts[id].data = cfg.data;
    if(cfg.options) charts[id].options = cfg.options;
    charts[id].update();
  } else {
    if(charts[id]) charts[id].destroy();
    charts[id]=new Chart(el,cfg);
  }
}

