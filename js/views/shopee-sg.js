/* ─── SHOPEE SG ─── */
let _sSgDrillMonth=null;
let _sSgLastGrainSig=null;
window.sSgBackToMonths = function(){ _sSgDrillMonth=null; renderShopeeSG(); return false; };

function renderShopeeSG(){
  const grainSig=JSON.stringify([S.grain,S.selectedMonth,S.selectedDate,S.customStart,S.customEnd,S.selectedCampaignMonth,S.selectedCampaignYear]);
  if(_sSgLastGrainSig!==null&&_sSgLastGrainSig!==grainSig) _sSgDrillMonth=null;
  _sSgLastGrainSig=grainSig;

  const d=filteredShopeeSG();
  if(!d||d.length<1){
    const el=document.getElementById('shopeeSgKpi');
    if(el) el.innerHTML='<div class="kpi" style="grid-column:1/-1"><div class="kpi-label">No Data</div><div class="kpi-val" style="font-size:13px;color:var(--t3)">Connect Shopee SG folder to load data</div></div>';
    return;
  }
  const SGD=v=>'SGD '+(v>=1000?(v/1000).toFixed(1)+'k':Math.round(v).toLocaleString());
  const totS=d.reduce((a,r)=>a+r.s,0);
  const totO=d.reduce((a,r)=>a+r.o,0);
  const last=d[d.length-1], prev=d.length>1?d[d.length-2]:null;
  const momS=prev?((last.s-prev.s)/prev.s*100).toFixed(1):null;
  const momO=prev?((last.o-prev.o)/prev.o*100).toFixed(1):null;
  const momSChip=momS?(momS>=0?'↑ ':'↓ ')+Math.abs(momS)+'% MoM':'—';
  const momOChip=momO?(momO>=0?'↑ ':'↓ ')+Math.abs(momO)+'% MoM':'—';
  const badge=document.getElementById('shopeeSgMomBadge');
  if(badge) badge.textContent=momS?(momS>=0?'↑ ':'↓ ')+Math.abs(momS)+'% MoM':'';
  const latestM=last.m+(d===D.shopeeSG.m2026?' 2026':' 2025');
  const el=document.getElementById('shopeeSgKpi');
  if(el) el.innerHTML=[
    {l:'Total Revenue',v:SGD(totS),ch:momSChip,dir:'up',sub:`${d.length} month${d.length>1?'s':''} selected`,ico:'💵'},
    {l:latestM+' Revenue',v:SGD(last.s),ch:momSChip,dir:'up',sub:prev?'vs '+SGD(prev.s)+' prev':'First month',ico:'📈'},
    {l:'Total Orders',v:totO.toLocaleString(),ch:momOChip,dir:'up',sub:'Confirmed orders',ico:'📦'},
    {l:'Conv. Rate',v:last.cr+'%',ch:'Latest month',dir:'up',sub:'Buyer conversion',ico:'⚡'},
    {l:'Avg Order Value',v:'SGD '+last.b.toFixed(2),sub:'Latest month AOV',ico:'🎯',ch:'AOV',dir:'up'},
  ].map(k=>`
    <div class="kpi">
      <div class="kpi-ico">${k.ico}</div>
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-val">${k.v}</div>
      <span class="chip ${k.dir}">${k.ch}</span>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  // 6 extra metrics
  const totCO=d.reduce((a,r)=>a+(r.co||0),0);
  const totCS=d.reduce((a,r)=>a+(r.cs||0),0);
  const totRO=d.reduce((a,r)=>a+(r.ro||0),0);
  const totRS=d.reduce((a,r)=>a+(r.rs||0),0);
  const totCL=d.reduce((a,r)=>a+(r.cl||0),0);
  const totBU=d.reduce((a,r)=>a+(r.bu||0),0);
  const m2El=document.getElementById('shopeeSgMetrics2');
  if(m2El) m2El.innerHTML=[
    {l:'Cancelled Orders',v:totCO?totCO.toLocaleString():'—',ch:'Orders cancelled',dir:'warn'},
    {l:'Cancelled Sales',v:totCS?SGD(totCS):'—',ch:'Sales cancelled',dir:'warn'},
    {l:'Return/Refund Orders',v:totRO?totRO.toLocaleString():'—',ch:'Returned/refunded',dir:'warn'},
    {l:'Return/Refund Sales',v:totRS?SGD(totRS):'—',ch:'Refund value',dir:'warn'},
    {l:'Product Clicks',v:totCL?totCL.toLocaleString():'—',ch:'Total clicks',dir:'up'},
    {l:'Unique Buyers',v:totBU?totBU.toLocaleString():'—',ch:'Confirmed buyers',dir:'up'},
  ].map(k=>`
    <div class="kpi">
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-val" style="font-size:16px">${k.v}</div>
      <span class="chip ${k.dir}">${k.ch}</span>
    </div>`).join('');

  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let chartRows, isDailyChart=false;
  const labs=d.map(r=>r.m);
  if(_sSgDrillMonth&&(D.shopeeSG.daily||[]).length){
    chartRows=(D.shopeeSG.daily||[]).filter(r=>r.y===_sSgDrillMonth.year&&r.m===mNames[_sSgDrillMonth.month-1]);
    isDailyChart=chartRows.length>0;
  }
  if(!isDailyChart) chartRows=d;

  const chartLabs=isDailyChart
    ? chartRows.map(r=>r.date.slice(8)+' '+r.m)
    : d.map(r=>r.m+' 2026');

  mkChart('shopeeSgRevChart',{type:'bar',data:{
    labels:chartLabs,
    datasets:[
      {label:'Sales (SGD)',data:chartRows.map(r=>r.s),backgroundColor:chartRows.map((_,i)=>i===chartRows.length-1&&!isDailyChart?'rgba(59,130,246,1)':'rgba(59,130,246,.5)'),borderRadius:3,maxBarThickness:isDailyChart?12:40,yAxisID:'y'},
      {label:'Orders',data:chartRows.map(r=>r.o),type:'line',borderColor:'#f97316',borderWidth:2.5,pointRadius:isDailyChart?2:4,pointBackgroundColor:'#f97316',tension:.4,yAxisID:'y2',fill:false},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>c.dataset.label==='Orders'?` Orders: ${c.raw.toLocaleString()}`:` Sales: ${SGDexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:11},maxRotation:isDailyChart?45:0}},
      y:{position:'left',grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>SGD(v)},beginAtZero:true},
      y2:{position:'right',grid:{display:false},border:{display:false},ticks:{font:{size:10},callback:v=>v.toLocaleString()},beginAtZero:true}},
    onClick:(evt,els)=>{
      if(isDailyChart || !els.length) return;
      const p=chartRows[els[0].index];
      if(p){
        const is25 = D.shopeeSG.m2025&&D.shopeeSG.m2025.includes(p);
        _sSgDrillMonth={year:is25?2025:2026,month:mNames.indexOf(p.m)+1};
        renderShopeeSG();
      }
    }
  }});

  const subEl = document.getElementById('shopeeSgRevSub');
  if(subEl) {
    if(_sSgDrillMonth) subEl.innerHTML = `Daily breakdown for ${mNames[_sSgDrillMonth.month-1]} ${_sSgDrillMonth.year} · <a href="#" onclick="return sSgBackToMonths()" style="color:var(--t2);text-decoration:underline;cursor:pointer">← Back to months</a>`;
    else subEl.innerHTML = 'Jan–Mar 2026 · SGD';
  }

  const ch=D.shopeeSG.channel;
  if(ch&&ch.mar&&ch.mar.length){
    const tot=ch.mar.reduce((a,v)=>a+v,0);
    mkChart('shopeeSgChannelChart',{type:'doughnut',data:{
      labels:ch.labels,datasets:[{data:ch.mar,backgroundColor:ch.colors,borderWidth:0,hoverOffset:4}]
    },options:{responsive:true,cutout:'65%',plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.label}: SGD ${c.raw.toLocaleString()} (${(c.raw/tot*100).toFixed(1)}%)`}}}}});
    document.getElementById('shopeeSgChannelLegend').innerHTML=ch.labels.map((l,i)=>`
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;background:${ch.colors[i]};border-radius:2px;display:inline-block"></span><span style="color:var(--t2)">${l}</span></span>
        <span style="font-weight:700;color:var(--t1)">SGD ${ch.mar[i].toLocaleString()} <span style="color:var(--t3)">${(ch.mar[i]/tot*100).toFixed(1)}%</span></span>
      </div>`).join('');
  }

  mkChart('shopeeSgCrChart',{type:'line',data:{labels:labs,
    datasets:[{label:'CR%',data:d.map(r=>r.cr),borderColor:'#f97316',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#f97316',tension:.4,fill:true,backgroundColor:'rgba(249,115,22,.08)'}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` CR: ${c.raw}%`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v+'%'}}}}});

  mkChart('shopeeSgAovChart',{type:'line',data:{labels:labs,
    datasets:[{label:'AOV (SGD)',data:d.map(r=>r.b),borderColor:'#6366f1',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#6366f1',tension:.4}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` AOV: SGD ${c.raw}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>'SGD '+v}}}}});

  // MY vs SG index chart (MY=100)
  const myData=D.shopee.m2026;
  mkChart('shopeeSgCompChart',{type:'bar',data:{
    labels:labs,
    datasets:[
      {label:'MY (index 100)',data:myData.map(()=>100),backgroundColor:'rgba(249,115,22,.25)',borderRadius:3,maxBarThickness:28},
      {label:'SG index',data:d.map((r,i)=>myData[i]?+(r.s/myData[i].s*100).toFixed(1):0),backgroundColor:'rgba(99,102,241,.65)',borderRadius:3,maxBarThickness:28},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v}}}}});

  document.getElementById('shopeeSgAdsTbl').innerHTML=d.map(r=>`<tr>
    <td>${r.m}</td>
    <td style="font-weight:700;color:var(--t1)">SGD ${r.s.toLocaleString()}</td>
    <td>${r.o.toLocaleString()}</td>
    <td>${r.cr}%</td>
    <td>SGD ${r.b.toFixed(2)}</td>
    <td>${r.co||'—'}</td>
    <td>${r.ro||'—'}</td>
  </tr>`).join('');
}

