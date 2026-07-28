/* ─── CAMPAIGNS ─── */
// One combined chart across every synced year (scales to 2027, 2028, … with no new panels needed).
// Click a month's bar to drill into that month's daily sales; campaign-window days are a different
// color so they stand out. _campDrillMonth is separate from the Period filter's own Campaign Day
// picker, but both funnel into the same daily drill-down view below.
let _campDrillMonth=null; // {year,month(1-12)} or null for the monthly overview
let _campMonthlyPoints=[]; // last-rendered monthly bars, so onClick can map a bar index back to {year,month}
let _campLastGrainSig=null; // last-seen Period filter signature — if it changes, the bar-click drill-down is stale and must clear
function campBackToMonths(){ _campDrillMonth=null; renderCampaigns(); return false; }

function renderCampaigns(){
  // Picking a bar drills into that month, but that drill-down has nothing to do with the global
  // Period filter — if the user then picks All Time/Year/Custom Range/etc. from the dropdown,
  // the chart was staying stuck on whatever month was last clicked. Any actual period change here
  // means the drill-down is stale, so drop it and fall back to the monthly overview (or the Period
  // filter's own Campaign Day selection, if that's what's now active).
  const grainSig=JSON.stringify([S.grain,S.selectedMonth,S.selectedDate,S.customStart,S.customEnd,S.selectedCampaignMonth,S.selectedCampaignYear]);
  if(_campLastGrainSig!==null&&_campLastGrainSig!==grainSig) _campDrillMonth=null;
  _campLastGrainSig=grainSig;

  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sub=document.getElementById('campSub');

  if(!D.shopee.daily.length){
    const el=document.getElementById('campChart');
    if(el){const ph=document.createElement('div');ph.style='padding:32px 0;text-align:center;color:var(--t3);font-size:13px';ph.textContent='Connect Shopee MY folder to load campaign data';el.replaceWith(ph);}
    renderPromoVoucherCards();
    return;
  }

  const baseOpts={responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>{
      if(c.dataset.label==='CR%') return ` CR: ${c.raw}%`;
      if(c.dataset.label==='Sales (RM)') return ` Sales: ${RMk(c.raw)}`;
      return ` ${c.dataset.label}: ${Num(c.raw)}`;
    }}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:9},callback:v=>RMk(v)}},
      y2:{position:'right',grid:{display:false},border:{display:false},ticks:{font:{size:9},callback:v=>v+'%'}}}};

  // A month can come from clicking a bar, or from the Period filter's own Campaign Day picker —
  // either way it lands in the same daily drill-down.
  const drill=_campDrillMonth||(S.grain==='campday'&&S.selectedCampaignMonth?{year:S.selectedCampaignYear,month:S.selectedCampaignMonth}:null);

  if(drill){
    const {year,month}=drill;
    const rows=D.shopee.daily.filter(r=>r.y===year&&r.m===mNames[month-1]).sort((a,b)=>a.date.localeCompare(b.date));
    const inWindow=day=>Math.abs(day-month)<=1;
    mkChart('campChart',{type:'bar',data:{
      labels:rows.map(r=>parseInt(r.date.slice(8,10),10)),
      datasets:[
        {label:'Sales (RM)',data:rows.map(r=>r.s),
          backgroundColor:rows.map(r=>inWindow(parseInt(r.date.slice(8,10),10))?'rgba(99,102,241,.85)':'rgba(203,213,225,.7)'),
          borderRadius:3,maxBarThickness:26,yAxisID:'y'},
        {label:'Visitors',data:rows.map(r=>r.v),backgroundColor:'rgba(234,179,8,.6)',borderRadius:3,maxBarThickness:26,yAxisID:'y'},
        {label:'Clicks',data:rows.map(r=>r.cl),backgroundColor:'rgba(59,130,246,.6)',borderRadius:3,maxBarThickness:26,yAxisID:'y'},
        {label:'CR%',data:rows.map(r=>r.cr),borderColor:'#3fb950',borderWidth:2,type:'line',pointRadius:3,yAxisID:'y2',tension:.3},
      ]
    },options:baseOpts});
    const monthTotal=rows.reduce((a,r)=>a+r.s,0);
    const campTotal=rows.filter(r=>inWindow(parseInt(r.date.slice(8,10),10))).reduce((a,r)=>a+r.s,0);
    const pct=monthTotal?(campTotal/monthTotal*100).toFixed(1):'0';
    const back=' · <a href="#" onclick="return campBackToMonths()" style="color:var(--t2);text-decoration:underline">← All months</a>';
    if(sub) sub.innerHTML=rows.length
      ?`${mNames[month-1]} ${year} — every day · <span style="color:#6366f1">■</span> campaign window (${month}.${month}) · Month ${RMk(monthTotal)} vs Campaign ${RMk(campTotal)} (${pct}%)${back}`
      :`No data for ${mNames[month-1]} ${year}${back}`;
  } else {
    const range=getPeriodRange();
    const filteredDaily=range?D.shopee.daily.filter(r=>r.date>=range[0]&&r.date<=range[1]):D.shopee.daily;
    const cd=campaignDaysFromDaily(filteredDaily); // {'2025':[...],'2026':[...],…} — any year present just appears, nothing hardcoded
    const points=[];
    for(const y of Object.keys(cd).sort()) for(const r of cd[y]) points.push({...r,y:+y,moIdx:mNames.indexOf(r.m)+1});
    _campMonthlyPoints=points;
    mkChart('campChart',{type:'bar',data:{
      labels:points.map(p=>`${p.m} '${String(p.y).slice(2)}`),
      datasets:[
        {label:'Sales (RM)',data:points.map(p=>p.s),backgroundColor:'rgba(99,102,241,.7)',borderRadius:3,maxBarThickness:28,yAxisID:'y'},
        {label:'Visitors',data:points.map(p=>p.v),backgroundColor:'rgba(234,179,8,.6)',borderRadius:3,maxBarThickness:28,yAxisID:'y'},
        {label:'Clicks',data:points.map(p=>p.cl),backgroundColor:'rgba(59,130,246,.6)',borderRadius:3,maxBarThickness:28,yAxisID:'y'},
        {label:'CR%',data:points.map(p=>p.cr),borderColor:'#3fb950',borderWidth:2,type:'line',pointRadius:3,yAxisID:'y2',tension:.3},
      ]
    },options:{...baseOpts,onClick:(evt,els)=>{
      if(!els.length) return;
      const p=_campMonthlyPoints[els[0].index];
      if(p){_campDrillMonth={year:p.y,month:p.moIdx};renderCampaigns();}
    }}});
    if(sub) sub.textContent=points.length?'Mega campaign days (1.1–12.12) — click a bar to see every day of that month':'No campaign days in this period';
  }

  renderPromoVoucherCards();
}

function renderPromoVoucherCards(){
  const RMc=v=>'RM'+(v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(0));
  const th=cells=>`<tr style="border-bottom:1px solid var(--border);font-size:10px;color:var(--t3);font-weight:600">${cells.map(c=>`<th style="padding:4px 6px;text-align:right;font-weight:600">${c}</th>`).join('')}</tr>`;
  const td=cells=>`<tr style="border-bottom:1px solid var(--border)">${cells.map((c,i)=>`<td style="padding:4px 6px;font-size:11px;${i===0?'text-align:left;':'text-align:right;'}color:var(--t1)">${c}</td>`).join('')}</tr>`;
  const tbl=(head,rows)=>`<table style="width:100%;border-collapse:collapse">${head}${rows}</table>`;

  const range=getPeriodRange();
  const isCampDay=S.grain==='campday';
  const monthRangeOfCampDay=()=>{
    const mm=String(S.selectedCampaignMonth).padStart(2,'0');
    const lastDay=String(new Date(S.selectedCampaignYear,S.selectedCampaignMonth,0).getDate()).padStart(2,'0');
    return [`${S.selectedCampaignYear}-${mm}-01`,`${S.selectedCampaignYear}-${mm}-${lastDay}`];
  };

  const prBody=document.getElementById('promoRevBody');
  if(prBody){
    // Discount Performance's source file only reports whole-month totals — it can't answer a
    // single campaign day, so don't show a misleading whole-month number for that filter. Still
    // show the month's real total though, so there's something to compare the other cards against.
    if(isCampDay){
      const monthPr=aggregatePromoRevenue(monthRangeOfCampDay());
      const monthTotal=monthPr?monthPr.byType.reduce((a,t)=>a+t.sales,0):0;
      const s=document.getElementById('promoRevSub'); if(s) s.textContent='Not available for a single campaign day';
      prBody.innerHTML=`<div style="color:var(--t3);font-size:12px;padding:8px 0">Promotion Revenue only has monthly data (no daily breakdown in the source file).${monthPr?` ${S.selectedCampaignMonth}.${S.selectedCampaignMonth}'s month total: ${RMc(monthTotal)}.`:''}</div>`;
    } else {
      const pr=aggregatePromoRevenue(range);
      if(!pr||!pr.byType.length){prBody.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">No data — sync a discount_ file</div>';}
      else{
        const s=document.getElementById('promoRevSub'); if(s) s.textContent=pr.period||'Latest month';
        const rows=pr.byType.map(r=>td([r.type,RMc(r.sales),r.orders.toLocaleString(),r.buyers.toLocaleString()])).join('');
        prBody.innerHTML=tbl(th(['Promotion Type','Sales','Orders','Buyers']),rows);
      }
    }
  }

  const vpBody=document.getElementById('voucherPerfBody');
  if(vpBody){
    if(isCampDay){
      // Same day-by-day treatment as the Campaign Sales chart — otherwise Voucher Performance
      // would just repeat whatever Monthly already shows.
      const allDaily=(D.shopee.voucherPerf||[]).flatMap(e=>e.daily||[]);
      const campRows=allDaily.filter(d=>d.date>=range[0]&&d.date<=range[1]).sort((a,b)=>a.date.localeCompare(b.date));
      if(!campRows.length){vpBody.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">No data — sync a voucher_ file</div>';}
      else{
        const monthR=monthRangeOfCampDay();
        const monthTotal=allDaily.filter(d=>d.date>=monthR[0]&&d.date<=monthR[1]).reduce((a,d)=>a+d.sales,0);
        const campTotal=campRows.reduce((a,d)=>a+d.sales,0);
        const pct=monthTotal?(campTotal/monthTotal*100).toFixed(1):'0';
        const s=document.getElementById('voucherPerfSub'); if(s) s.textContent=`Month total ${RMc(monthTotal)} vs Campaign days ${RMc(campTotal)} (${pct}%)`;
        const rows=campRows.map(d=>td([d.date.slice(8)+'-'+d.date.slice(5,7),RMc(d.sales),d.orders.toLocaleString()])).join('');
        vpBody.innerHTML=tbl(th(['Day','Sales','Orders']),rows);
      }
    } else {
      const vp=aggregateVoucherPerf(range);
      if(!vp){vpBody.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">No data — sync a voucher_ file</div>';}
      else{
        const s=document.getElementById('voucherPerfSub'); if(s) s.textContent=vp.period||'Cofund voucher analytics';
        const rows=[
          td(['Sales',RMc(vp.sales)]),
          td(['Orders',vp.orders.toLocaleString()]),
          td(['Claims',vp.claims.toLocaleString()]),
          td(['Usage Rate',vp.usageRate.toFixed(2)+'%']),
          td(['Buyers',vp.buyers.toLocaleString()]),
          td(['Cost',RMc(vp.cost)]),
        ].join('');
        vpBody.innerHTML=tbl(th(['Metric','Value']),rows);
      }
    }
  }

  // Visitors/Clicks are daily-native in D.shopee.daily already, so — unlike Promotion Revenue
  // (monthly-only source) — no campday special-case is needed: `range` filters real days either way.
  const trBody=document.getElementById('trafficBody');
  if(trBody){
    const trows=(range?D.shopee.daily.filter(r=>r.date>=range[0]&&r.date<=range[1]):D.shopee.daily).sort((a,b)=>a.date.localeCompare(b.date));
    if(!trows.length){trBody.innerHTML='<div style="color:var(--t3);font-size:12px;padding:8px 0">No data — sync a Shopee MY Sales Data file</div>';}
    else{
      const v=trows.reduce((a,r)=>a+(r.v||0),0), cl=trows.reduce((a,r)=>a+(r.cl||0),0);
      const fmt=iso=>{const[y,m,d]=iso.split('-');return `${d}-${m}-${y}`;};
      const s=document.getElementById('trafficSub');
      if(s) s.textContent=trows.length===1?fmt(trows[0].date):`${fmt(trows[0].date)} → ${fmt(trows[trows.length-1].date)}`;
      const rows=[
        td(['Visitors',v.toLocaleString()]),
        td(['Clicks',cl.toLocaleString()]),
        td(['Click-Through',v?(cl/v*100).toFixed(2)+'%':'—']),
      ].join('');
      trBody.innerHTML=tbl(th(['Metric','Value']),rows);
    }
  }
}

