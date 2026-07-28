/* ─── NAV ─── */
// ── Sidebar drawer ──
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sbOverlay');
  const isOpen=sb.classList.contains('open');
  if(isOpen){closeSidebar();}else{sb.classList.add('open');ov.classList.add('show');}
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sbOverlay').classList.remove('show');
}
function showPanel(name){
  S.nav=name;
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.remove('active'));
  const panel=document.getElementById('panel-'+name);
  if(panel) panel.classList.add('on');
  document.querySelector(`[data-nav="${name}"]`)?.classList.add('active');
  const titles={overview:'Performance Overview',shopee:'Shopee MY — Deep Dive',tiktok:'TikTok MY — Deep Dive','shopee-sg':'Shopee SG — Deep Dive','tiktok-sg':'TikTok SG — Deep Dive',campaigns:'Campaign Performance',promo:'Promotion Analytics',products:'Product Strategy',reco:'Strategic Recommendations',health:'Account Health',sync:'Data Sync Settings'};
  document.getElementById('pageTitle').textContent=titles[name]||'Dashboard';
  setTimeout(()=>{
    if(name==='overview') renderOverview();
    else if(name==='shopee') renderShopee();
    else if(name==='tiktok') renderTikTok();
    else if(name==='shopee-sg') renderShopeeSG();
    else if(name==='tiktok-sg') renderTikTokSG();
    else if(name==='campaigns') renderCampaigns();
    else if(name==='promo') renderPromos();
    else if(name==='products') renderProducts();
    else if(name==='reco'){renderRecos();renderRecommendations();}
    else if(name==='health') renderHealth();
  },0);
}

/* ─── PLATFORM TABS ─── */
document.querySelectorAll('.ptab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.ptab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    S.platform=t.dataset.p;
    if(S.platform==='shopee') showPanel('shopee');
    else if(S.platform==='tiktok') showPanel('tiktok');
    else if(S.platform==='shopee-sg') showPanel('shopee-sg');
    else if(S.platform==='tiktok-sg') showPanel('tiktok-sg');
    else showPanel('overview');
  });
});

/* ─── PERIOD PICKER ─── */
const PS = { open:false, sub:null, year:2026, selMonth:null, selYear:null, campYear:2026 };

const PRESET_LABELS = {all:'All Time',today:'Today',yesterday:'Yesterday','7d':'Last 7 Days','30d':'Last 30 Days'};

function togglePeriod(e){
  e.stopPropagation();
  PS.open=!PS.open;
  document.getElementById('periodDd').classList.toggle('show',PS.open);
  document.getElementById('periodBtn').classList.toggle('open',PS.open);
  if(PS.open && !PS.sub) showPdSub(null);
}
function closePeriod(){
  PS.open=false;
  document.getElementById('periodDd').classList.remove('show');
  document.getElementById('periodBtn').classList.remove('open');
}
document.addEventListener('click',e=>{
  if(!document.getElementById('periodWrap').contains(e.target)) closePeriod();
});

// Highlight active option in left panel
function setPdActive(opt){
  document.querySelectorAll('.pd-opt').forEach(o=>{
    o.classList.toggle('active', o.dataset.opt===opt);
  });
}

function showPdSub(type){
  PS.sub=type;
  const right=document.getElementById('pdRight');
  if(type==='monthly'){
    renderMonthPicker();
  } else if(type==='campday'){
    renderCampDayPicker();
  } else if(type==='daily'){
    // Default to the latest date with real synced data, not today's calendar date —
    // otherwise "View Day" opens to an empty screen whenever today hasn't synced yet.
    const dates=(D.shopee.daily||[]).map(r=>r.date).sort();
    const def=S.selectedDate||dates[dates.length-1]||new Date().toISOString().slice(0,10);
    right.innerHTML=`
      <div style="font-size:12px;font-weight:700;color:var(--t1);margin-bottom:12px">Daily View</div>
      <div class="cp-field"><label>Select Date</label><input type="date" id="dpDate" value="${def}" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;width:100%;box-sizing:border-box"></div>
      <button class="cp-apply" onclick="applyDailyPeriod()" style="margin-top:10px">View Day</button>`;
  } else if(type==='custom'){
    // Default the range to the actual synced data span instead of a hardcoded Jan–Mar 2026.
    const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const m2026=D.shopee.m2026;
    const startDef=S.customStart||(m2026.length?`2026-${String(mNames.indexOf(m2026[0].m)+1).padStart(2,'0')}`:'2026-01');
    const endDef=S.customEnd||(m2026.length?`2026-${String(mNames.indexOf(m2026[m2026.length-1].m)+1).padStart(2,'0')}`:'2026-03');
    right.innerHTML=`
      <div style="font-size:12px;font-weight:700;color:var(--t1);margin-bottom:12px">Custom Range</div>
      <div class="cp-field"><label>Start Month</label><input type="month" id="cpStart" value="${startDef}"></div>
      <div class="cp-field"><label>End Month</label><input type="month" id="cpEnd" value="${endDef}"></div>
      <button class="cp-apply" onclick="applyCustomPeriod()">Apply Range</button>`;
  } else {
    right.innerHTML='';
  }
}
function applyDailyPeriod(){
  const d=document.getElementById('dpDate')?.value;
  if(!d) return;
  S.grain='daily'; S.selectedDate=d;
  const[y,mo,da]=d.split('-');
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('periodLabel').textContent=`${da} ${mNames[parseInt(mo)-1]} ${y}`;
  renderKPIs(); showPanel(S.nav); closePeriod();
}

function renderMonthPicker(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Determine which month/year to highlight — always read from S, not PS
  const hiMon=(S.grain==='monthly'&&S.selectedMonth!=null)?S.selectedMonth.month:PS.selMonth;
  const hiYear=(S.grain==='monthly'&&S.selectedMonth!=null)?S.selectedMonth.year:(PS.selYear||PS.year);
  // If current selection year differs from viewed year, set PS.year to selection year
  if(S.grain==='monthly'&&S.selectedMonth!=null&&PS.year!==S.selectedMonth.year){
    PS.year=S.selectedMonth.year;
  }
  const right=document.getElementById('pdRight');
  right.innerHTML=`
    <div class="mp-year">
      <button class="mp-ybtn" onclick="pdYear(-1,event)">‹</button>
      <span class="mp-ylabel" id="mpYear">${PS.year}</span>
      <button class="mp-ybtn" onclick="pdYear(1,event)">›</button>
    </div>
    <div class="mp-grid">
      ${months.map((m,i)=>`<div class="mp-m${hiMon===i&&hiYear===PS.year?' sel':''}" onclick="selectMonth(${i})">${m}</div>`).join('')}
    </div>`;
}
function pdYear(d,e){
  // Rebuilding pdRight's innerHTML below detaches the button that's still mid-click-handling;
  // stopPropagation keeps the document-level "click outside closes it" listener from ever seeing
  // that now-detached node and wrongly treating it as an outside click.
  e?.stopPropagation();
  PS.year+=d;
  document.getElementById('mpYear').textContent=PS.year;
  renderMonthPicker();
}
function selectMonth(idx){
  PS.selMonth=idx;
  PS.selYear=PS.year;
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('periodLabel').textContent=months[idx]+' '+PS.year;
  S.grain='monthly';
  S.selectedMonth={month:idx,year:PS.year};
  renderKPIs();
  showPanel(S.nav);
  closePeriod();
}

// "Campaign Day" picker — pick a Shopee double-digit sale (7.7, 8.8, …) and its ±1 day window is applied automatically.
function renderCampDayPicker(){
  const camps=['1.1','2.2','3.3','4.4','5.5','6.6','7.7','8.8','9.9','10.10','11.11','12.12'];
  const hiMon=S.grain==='campday'&&S.selectedCampaignMonth!=null?S.selectedCampaignMonth:null;
  const hiYear=S.grain==='campday'?S.selectedCampaignYear:null;
  const right=document.getElementById('pdRight');
  right.innerHTML=`
    <div class="mp-year">
      <button class="mp-ybtn" onclick="pdCampYear(-1,event)">‹</button>
      <span class="mp-ylabel" id="mpCampYear">${PS.campYear}</span>
      <button class="mp-ybtn" onclick="pdCampYear(1,event)">›</button>
    </div>
    <div class="mp-grid">
      ${camps.map((c,i)=>`<div class="mp-m${hiMon===i+1&&hiYear===PS.campYear?' sel':''}" onclick="selectCampaignDay(${i+1})">${c}</div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--t3);margin-top:10px">Applies the day-before/day-after window (e.g. 7.7 → Jul 6–8)</div>`;
}
function pdCampYear(d,e){
  e?.stopPropagation();
  PS.campYear+=d;
  document.getElementById('mpCampYear').textContent=PS.campYear;
  renderCampDayPicker();
}
function selectCampaignDay(month){
  S.grain='campday';
  S.selectedCampaignMonth=month;
  S.selectedCampaignYear=PS.campYear;
  document.getElementById('periodLabel').textContent=`${month}.${month} (±1 day)`;
  renderKPIs();
  showPanel(S.nav);
  closePeriod();
}

function applyCustomPeriod(){
  const s=document.getElementById('cpStart').value;
  const e=document.getElementById('cpEnd').value;
  if(!s||!e) return;
  S.grain='custom';
  S.customStart=s; S.customEnd=e;
  const fmt=v=>{const[y,m]=v.split('-');return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]+' '+y;};
  document.getElementById('periodLabel').textContent=fmt(s)+' → '+fmt(e);
  renderKPIs(); showPanel(S.nav); closePeriod();
}

// Left panel option clicks
document.querySelectorAll('.pd-opt').forEach(opt=>{
  opt.addEventListener('mouseenter',()=>{
    const o=opt.dataset.opt;
    if(o==='monthly'||o==='custom'||o==='daily'||o==='campday') showPdSub(o);
    else showPdSub(null);
  });
  opt.addEventListener('click',e=>{
    e.stopPropagation();
    const o=opt.dataset.opt;
    if(o==='monthly'||o==='custom'||o==='daily'||o==='campday'){showPdSub(o);setPdActive(o);return;}
    setPdActive(o);
    S.grain=o;
    const labels={all:'All Time',y2025:'Year 2025',y2026:'Year 2026 (YTD)',today:'Today',yesterday:'Yesterday','7d':'Last 7 Days','30d':'Last 30 Days'};
    document.getElementById('periodLabel').textContent=labels[o]||o;
    renderKPIs(); showPanel(S.nav); closePeriod();
  });
});

/* ─── SIDEBAR NAV ─── */
document.querySelectorAll('.sb-item').forEach(i=>{
  i.addEventListener('click',()=>{showPanel(i.dataset.nav);closeSidebar();});
});

