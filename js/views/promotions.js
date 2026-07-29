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
  const range=getPeriodRange(); // null for 'all'/'12m' — no filtering
  const isCampDay=S.grain==='campday';
  let promoArr=[...(D.shopee.promoRevenue||[])].sort((a,b)=>a.start.localeCompare(b.start));
  let voucherArr=[...(D.shopee.voucherPerf||[])].sort((a,b)=>a.start.localeCompare(b.start));
  if(range){
    promoArr=promoArr.filter(e=>e.start<=range[1]&&e.end>=range[0]);
    voucherArr=voucherArr.filter(e=>e.start<=range[1]&&e.end>=range[0]);
  }
  const hasAnyData=(D.shopee.promoRevenue||[]).length||(D.shopee.voucherPerf||[]).length;
  if(!hasAnyData){
    const el=document.getElementById('promoKpi');
    if(el) el.innerHTML='<div class="kpi" style="grid-column:1/-1"><div class="kpi-label">No Data</div><div class="kpi-val" style="font-size:13px;color:var(--t3)">Connect platform folders to load promotions data</div></div>';
    return;
  }
  if(!promoArr.length&&!voucherArr.length){
    const el=document.getElementById('promoKpi');
    if(el) el.innerHTML='<div class="kpi" style="grid-column:1/-1"><div class="kpi-label">No Data For This Period</div><div class="kpi-val" style="font-size:13px;color:var(--t3)">Discount/Voucher Performance files only have monthly data — try a wider period</div></div>';
    return;
  }
  const mLbl=e=>{const d=new Date(e.start+'T00:00:00Z');return d.toLocaleString('en',{month:'short',timeZone:'UTC'})+" '"+String(d.getUTCFullYear()).slice(2);};
  const promoTotal=e=>e?e.byType.reduce((a,t)=>a+t.sales,0):0;
  const promoOrders=e=>e?e.byType.reduce((a,t)=>a+t.orders,0):0;

  // Discount/Voucher Performance files only report whole-month totals — a Campaign Day window
  // (e.g. 3.3 ±1 day) can't be isolated from them, so show the encompassing month and say so,
  // same treatment as the Campaign Performance tab's Promotion Revenue card.
  const latestPromo=promoArr[promoArr.length-1];
  const latestVoucher=voucherArr[voucherArr.length-1];
  const prevVoucher=voucherArr[voucherArr.length-2];
  const topPromo=(D.shopee.promoListArr||[])[0];

  // KPIs
  const el=document.getElementById('promoKpi');
  if(el) el.innerHTML=[
    {l:`Promo GMV (${latestPromo?mLbl(latestPromo):'—'}${isCampDay?', monthly':''})`,v:RMk(promoTotal(latestPromo)),ch:`${Num(promoOrders(latestPromo))} orders`,dir:'up',sub:'From Discount Performance files',ico:'🎟️'},
    {l:`Voucher Sales (${latestVoucher?mLbl(latestVoucher):'—'}${isCampDay?', monthly':''})`,v:RMk(latestVoucher?.sales||0),ch:latestVoucher?`Usage ${latestVoucher.usageRate.toFixed(2)}%`:'—',dir:'up',sub:latestVoucher?`${Num(latestVoucher.claims)} claims`:'',ico:'🏷️'},
    {l:'Voucher ROI',v:latestVoucher&&latestVoucher.cost?(latestVoucher.sales/latestVoucher.cost).toFixed(1)+'x':'N/A',ch:prevVoucher&&prevVoucher.cost?`vs ${(prevVoucher.sales/prevVoucher.cost).toFixed(1)}x prior mo`:'',dir:'warn',sub:latestVoucher?`${RMk(latestVoucher.cost)} cost`:'',ico:'📊'},
    {l:'Top Promotion (All-Time)',v:topPromo?(topPromo.name.length>18?topPromo.name.slice(0,16)+'…':topPromo.name):'—',ch:topPromo?RMk(topPromo.sales):'',dir:'up',sub:topPromo?.type||'',ico:'🏆'},
  ].map(k=>`
    <div class="kpi">
      <div class="kpi-ico">${k.ico}</div>
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-val">${k.v}</div>
      <span class="chip ${k.dir}">${k.ch}</span>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  // Promo revenue stacked bar — promo types are whatever the connected store's own files contain
  // (e.g. "Discount"/"Add-on Deal"), not a fixed demo set, so build datasets from what's present.
  const promoTypes=[...new Set(promoArr.flatMap(e=>e.byType.map(t=>t.type)))];
  const typeColors=['#f43f5e','#6366f1','#f97316','#3fb950','#eab308','#0ea5e9','#a855f7','#64748b'];
  mkChart('promoTrendChart',{type:'bar',data:{
    labels:promoArr.map(mLbl),
    datasets:promoTypes.map((ty,i)=>({
      label:ty,
      data:promoArr.map(e=>e.byType.find(t=>t.type===ty)?.sales||0),
      backgroundColor:typeColors[i%typeColors.length],borderRadius:3,maxBarThickness:36,stack:'p',
    }))
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMk(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},stacked:true,ticks:{font:{size:10}}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},stacked:true,ticks:{font:{size:10},callback:v=>RMk(v)}}}}});
  const trendLegend=document.getElementById('promoTrendLegend');
  if(trendLegend) trendLegend.innerHTML=promoTypes.map((ty,i)=>`<div class="lg-item"><div class="lg-dot" style="background:${typeColors[i%typeColors.length]}"></div>${ty}</div>`).join('');

  // Promo type mix donut — latest synced month
  const marByType=latestPromo?Object.fromEntries(latestPromo.byType.map(t=>[t.type,t.sales])):{};
  const ptVals=promoTypes.map(t=>marByType[t]||0);
  const ptTotal=ptVals.reduce((a,v)=>a+v,0)||1;
  mkChart('promoTypeChart',{type:'doughnut',data:{
    labels:promoTypes,
    datasets:[{data:ptVals,backgroundColor:promoTypes.map((_,i)=>typeColors[i%typeColors.length]),borderWidth:0,hoverOffset:4}]
  },options:{responsive:true,cutout:'65%',plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.label}: ${RMk(c.raw)} (${(c.raw/ptTotal*100).toFixed(1)}%)`}}}}});
  document.getElementById('promoTypeLegend').innerHTML=promoTypes.map((ty,i)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;background:${typeColors[i%typeColors.length]};border-radius:2px;display:inline-block"></span><span style="color:var(--t2)">${ty}</span></span>
      <span style="font-weight:700;color:var(--t1)">${RMk(ptVals[i])} <span style="color:var(--t3)">${(ptVals[i]/ptTotal*100).toFixed(1)}%</span></span>
    </div>`).join('');

  // Voucher claims vs orders (bar + line dual axis)
  mkChart('voucherChart',{type:'bar',data:{
    labels:voucherArr.map(mLbl),
    datasets:[
      {label:'Claims',data:voucherArr.map(e=>e.claims),backgroundColor:'rgba(99,102,241,.6)',borderRadius:4,maxBarThickness:36,yAxisID:'y'},
      {label:'Orders',data:voucherArr.map(e=>e.orders),borderColor:'#f97316',borderWidth:2.5,type:'line',pointRadius:3,pointBackgroundColor:'#f97316',tension:.3,yAxisID:'y2'},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${Num(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>Num(v)},title:{display:true,text:'Claims',font:{size:9},color:'#94a3b8'}},
      y2:{position:'right',grid:{display:false},border:{display:false},ticks:{font:{size:10},callback:v=>Num(v)},title:{display:true,text:'Orders',font:{size:9},color:'#94a3b8'}}}}});

  // Live Stream GMV — the sync pipeline doesn't yet assemble a reliable per-month Shopee Seller Live +
  // TikTok LIVE series (TikTok's monthly breakdown collapses different years into the same month key),
  // so show an honest empty state instead of a wrong or misleading chart.
  _chartOrEmpty('liveGmvChart',false,"Live-stream GMV isn't assembled from the connected source files yet",()=>{});

  // Voucher detail table — real per-voucher totals from the Voucher Performance "Performance List" sheet
  const voucherList=(D.shopee.voucherListArr||[]).slice(0,20);
  document.getElementById('voucherDetailTbl').innerHTML=voucherList.length?voucherList.map(v=>{
    const roi=v.cost?(v.sales/v.cost).toFixed(1):null;
    const usage=v.claims?(v.orders/v.claims*100):0;
    const rc=roi==null?'':roi>=15?'roi-good':roi>=10?'roi-warn':'roi-bad';
    return `<tr>
      <td style="font-weight:600;color:var(--t1)">${v.name}</td>
      <td>${Num(v.claims)}</td><td>${Num(v.orders)}</td>
      <td><span style="font-weight:700;color:${usage>=15?'var(--green)':usage>=10?'var(--amber)':'var(--t2)'}">${usage.toFixed(2)}%</span></td>
      <td style="color:var(--green);font-weight:700">${RM(v.sales)}</td>
      <td>${RM(v.cost)}</td>
      <td class="${rc}">${roi==null?'—':roi+'x'}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--t3);padding:16px 0">No per-voucher detail in the connected source files</td></tr>';

  // All promotions table — real per-promotion totals from the Discount Performance "Performance List" sheet
  const promoList=(D.shopee.promoListArr||[]).slice(0,20);
  const countTag=document.getElementById('promoCountTag');
  if(countTag) countTag.textContent=`${promoList.length} Promotion${promoList.length===1?'':'s'}`;
  document.getElementById('promoTypesTbl').innerHTML=promoList.length?promoList.map(p=>{
    const aov=p.orders?p.sales/p.orders:0;
    const isActive=/ongoing|active|upcoming/i.test(p.status||'');
    return `<tr>
      <td style="font-weight:600;color:var(--t1)">${p.name}</td>
      <td><span class="tag" style="${promoTypeTagStyle(p.type)}">${p.type}</span></td>
      <td style="font-size:10px;color:var(--t3)">Shopee MY</td>
      <td style="font-weight:700;color:var(--t1)">${p.sales?RMk(p.sales):'—'}</td>
      <td>${p.orders?Num(p.orders):'—'}</td>
      <td>${aov?'RM'+aov.toFixed(2):'—'}</td>
      <td>—</td>
      <td>${isActive?`<span class="alert alert-g">${p.status}</span>`:`<span class="alert" style="background:var(--border-sub);color:var(--t3);border:1px solid var(--border)">${p.status||'—'}</span>`}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--t3);padding:16px 0">No promotion detail in the connected source files</td></tr>';
}
