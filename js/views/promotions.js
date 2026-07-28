/* ─── PROMOTIONS ─── */
function promoTypeTagStyle(type){
  const map={
    'Gift with Purchase':'background:var(--green-d);color:var(--green)',
    'Voucher':'background:var(--indigo-d);color:var(--indigo)',
    'Buy 1 Free 1':'background:var(--tiktok-d);color:var(--tiktok)',
    'Free Gift':'background:var(--shopee-d);color:var(--shopee)',
    'Bundle Deal':'background:rgba(99,102,241,.1);color:#6366f1',
    'Live Promotion':'background:var(--amber-d);color:var(--amber)',
  };
  return map[type]||'background:var(--border);color:var(--t3)';
}
function renderPromos(){
  const lv=D.promos.live, vc=D.promos.vouchers, pm=D.promos.monthly;
  if(!lv.length&&!vc.length&&!pm.length){
    const el=document.getElementById('promoKpi');
    if(el) el.innerHTML='<div class="kpi" style="grid-column:1/-1"><div class="kpi-label">No Data</div><div class="kpi-val" style="font-size:13px;color:var(--t3)">Connect platform folders to load promotions data</div></div>';
    return;
  }
  // KPIs
  const marLive=(lv[2]||{shopee:0,tiktok:0}).shopee+(lv[2]||{shopee:0,tiktok:0}).tiktok;
  const marVoucher=(vc[2]||{sales:0}).sales;
  const marPromoTotal=(pm[2]||{discount:0,bundle:0,gwp:0,b1f1:0}).discount+(pm[2]||{}).bundle+(pm[2]||{}).gwp+(pm[2]||{}).b1f1||0;
  const marVoucherRoi=vc[2]&&vc[2].cost?(marVoucher/vc[2].cost).toFixed(1):'N/A';
  const el=document.getElementById('promoKpi');
  if(el) el.innerHTML=[
    {l:'Promo GMV (Mar)',v:RMk(marPromoTotal),ch:'↑ 12.4% MoM',dir:'up',sub:'Discount+Bundle+GWP+B1F1',ico:'🎟️'},
    {l:'Voucher Sales (Mar)',v:RMk(marVoucher),ch:'Usage: 7.76%',dir:'up',sub:'165k claims · RM41.5k cost',ico:'🏷️'},
    {l:'Live Stream GMV (Mar)',v:RMk(marLive),ch:'Shopee+TikTok',dir:'up',sub:'Seller Live + TikTok LIVE',ico:'📺'},
    {l:'Best Promo CR',v:'59.21%',ch:'Free Gift Plushie',dir:'up',sub:'All-time record conversion',ico:'⚡'},
    {l:'Voucher ROI (Mar)',v:marVoucherRoi+(marVoucherRoi==='N/A'?'':'x'),ch:'↓ slight decline',dir:'warn',sub:vc[1]&&vc[1].cost?'vs '+((vc[1].sales||0)/vc[1].cost).toFixed(1)+'x in Feb':'',ico:'📊'},
  ].map(k=>`
    <div class="kpi">
      <div class="kpi-ico">${k.ico}</div>
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-val">${k.v}</div>
      <span class="chip ${k.dir}">${k.ch}</span>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  // Promo revenue stacked bar
  mkChart('promoTrendChart',{type:'bar',data:{
    labels:pm.map(r=>r.m+' 2026'),
    datasets:[
      {label:'Discount',data:pm.map(r=>r.discount),backgroundColor:'rgba(244,63,94,.75)',borderRadius:3,maxBarThickness:48,stack:'p'},
      {label:'Bundle Deal',data:pm.map(r=>r.bundle),backgroundColor:'rgba(99,102,241,.75)',borderRadius:3,maxBarThickness:48,stack:'p'},
      {label:'GWP',data:pm.map(r=>r.gwp),backgroundColor:'rgba(249,115,22,.75)',borderRadius:3,maxBarThickness:48,stack:'p'},
      {label:'B1F1',data:pm.map(r=>r.b1f1),backgroundColor:'rgba(63,185,80,.75)',borderRadius:3,maxBarThickness:48,stack:'p'},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMk(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},stacked:true,ticks:{font:{size:11}}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},stacked:true,ticks:{font:{size:10},callback:v=>RMk(v)}}}}});

  // Promo type donut — Mar 2026
  const mar=pm[2]||{discount:0,bundle:0,gwp:0,b1f1:0};
  const ptTotal=(mar.discount||0)+(mar.bundle||0)+(mar.gwp||0)+(mar.b1f1||0)||1;
  mkChart('promoTypeChart',{type:'doughnut',data:{
    labels:['Discount','Bundle Deal','GWP','B1F1'],
    datasets:[{data:[mar.discount,mar.bundle,mar.gwp,mar.b1f1],backgroundColor:['#f43f5e','#6366f1','#f97316','#3fb950'],borderWidth:0,hoverOffset:4}]
  },options:{responsive:true,cutout:'65%',plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.label}: ${RMk(c.raw)} (${(c.raw/ptTotal*100).toFixed(1)}%)`}}}}});
  const ptColors=['#f43f5e','#6366f1','#f97316','#3fb950'];
  const ptVals=[mar.discount,mar.bundle,mar.gwp,mar.b1f1];
  document.getElementById('promoTypeLegend').innerHTML=['Discount','Bundle Deal','GWP','B1F1'].map((l,i)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;background:${ptColors[i]};border-radius:2px;display:inline-block"></span><span style="color:var(--t2)">${l}</span></span>
      <span style="font-weight:700;color:var(--t1)">${RMk(ptVals[i])} <span style="color:var(--t3)">${(ptVals[i]/ptTotal*100).toFixed(1)}%</span></span>
    </div>`).join('');

  // Voucher claims vs orders (bar + line dual axis)
  mkChart('voucherChart',{type:'bar',data:{
    labels:vc.map(r=>r.m+' 2026'),
    datasets:[
      {label:'Claims',data:vc.map(r=>r.claims),backgroundColor:'rgba(99,102,241,.6)',borderRadius:4,maxBarThickness:42,yAxisID:'y'},
      {label:'Orders',data:vc.map(r=>r.orders),borderColor:'#f97316',borderWidth:2.5,type:'line',pointRadius:4,pointBackgroundColor:'#f97316',tension:.3,yAxisID:'y2'},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${Num(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>Num(v)},title:{display:true,text:'Claims',font:{size:9},color:'#94a3b8'}},
      y2:{position:'right',grid:{display:false},border:{display:false},ticks:{font:{size:10},callback:v=>Num(v)},title:{display:true,text:'Orders',font:{size:9},color:'#94a3b8'}}}}});

  // Live stream GMV grouped bar
  mkChart('liveGmvChart',{type:'bar',data:{
    labels:lv.map(r=>r.m+' 2026'),
    datasets:[
      {label:'Shopee Seller Live',data:lv.map(r=>r.shopee),backgroundColor:'rgba(249,115,22,.75)',borderRadius:4,maxBarThickness:36},
      {label:'TikTok LIVE',data:lv.map(r=>r.tiktok),backgroundColor:'rgba(225,29,72,.75)',borderRadius:4,maxBarThickness:36},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMk(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)}}}}});

  // Voucher detail table
  document.getElementById('voucherDetailTbl').innerHTML=D.promos.voucherDetail.map(v=>{
    const roi=(v.sales/v.cost).toFixed(1);
    const rc=roi>=15?'roi-good':roi>=10?'roi-warn':'roi-bad';
    return `<tr>
      <td style="font-weight:600;color:var(--t1)">${v.name}</td>
      <td>${Num(v.claims)}</td><td>${Num(v.orders)}</td>
      <td><span style="font-weight:700;color:${v.usage>=15?'var(--green)':v.usage>=10?'var(--amber)':'var(--t2)'}">${v.usage}%</span></td>
      <td style="color:var(--green);font-weight:700">${RM(v.sales)}</td>
      <td>${RM(v.cost)}</td>
      <td class="${rc}">${roi}x</td>
    </tr>`;
  }).join('');

  // Promotion types table
  document.getElementById('promoTypesTbl').innerHTML=D.promos.types.map(p=>{
    const badge=p.status==='top'?'<span class="alert alert-g">✓ Top</span>':
                p.status==='highlight'?'<span class="alert" style="background:var(--indigo-d);color:var(--indigo)">★ Record CR</span>':
                p.status==='warn'?'<span class="alert alert-a">⚠ Low Volume</span>':
                '<span class="alert" style="background:var(--border-sub);color:var(--t3);border:1px solid var(--border)">Monitor</span>';
    return `<tr>
      <td style="font-weight:600;color:var(--t1)">${p.name}</td>
      <td><span class="tag" style="${promoTypeTagStyle(p.type)}">${p.type}</span></td>
      <td style="font-size:10px;color:var(--t3)">${p.platform}</td>
      <td style="font-weight:700;color:var(--t1)">${p.sales?RMk(p.sales):'—'}</td>
      <td>${p.orders?Num(p.orders):'—'}</td>
      <td>${p.aov?'RM'+p.aov.toFixed(2):'—'}</td>
      <td>${p.cr?`<span style="color:var(--green);font-weight:700">${p.cr}%</span>`:'—'}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

