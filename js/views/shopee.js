/* ─── SHOPEE CHARTS ─── */
function renderShopee(){
  const sf=filteredShopee();
  const pf=getPrevShopee();
  // Current period totals
  const totCO=sf.reduce((a,r)=>a+(r.co||0),0);
  const totCS=sf.reduce((a,r)=>a+(r.cs||0),0);
  const totRO=sf.reduce((a,r)=>a+(r.ro||0),0);
  const totRS=sf.reduce((a,r)=>a+(r.rs||0),0);
  const totCL=sf.reduce((a,r)=>a+(r.cl||0),0);
  const totBU=sf.reduce((a,r)=>a+(r.bu||0),0);
  const totO=sf.reduce((a,r)=>a+r.o,0);
  // Previous period totals
  const pCO=pf.reduce((a,r)=>a+(r.co||0),0);
  const pCS=pf.reduce((a,r)=>a+(r.cs||0),0);
  const pRO=pf.reduce((a,r)=>a+(r.ro||0),0);
  const pRS=pf.reduce((a,r)=>a+(r.rs||0),0);
  const pCL=pf.reduce((a,r)=>a+(r.cl||0),0);
  const pBU=pf.reduce((a,r)=>a+(r.bu||0),0);
  const prevLabel=pf.length?` vs ${pf[0].m}`:'';
  const m2El=document.getElementById('shopeeMetrics2');
  if(m2El) m2El.innerHTML=[
    {l:'Cancelled Orders',v:totCO?Num(totCO):'—',...momChip(totCO,pCO,true),sub:`Total cancelled${prevLabel}`,ico:'❌'},
    {l:'Cancelled Sales',v:totCS?RMfull(totCS):'—',...momChip(totCS,pCS,true),sub:`MYR cancelled${prevLabel}`,ico:'💸'},
    {l:'Return/Refund Orders',v:totRO?Num(totRO):'—',...momChip(totRO,pRO,true),sub:`Returned orders${prevLabel}`,ico:'↩️'},
    {l:'Return/Refund Sales',v:totRS?RMfull(totRS):'—',...momChip(totRS,pRS,true),sub:`MYR refunded${prevLabel}`,ico:'🔄'},
    {l:'Product Clicks',v:totCL?Num(totCL):'—',...momChip(totCL,pCL,false),sub:`Total clicks${prevLabel}`,ico:'👆'},
    {l:'Unique Buyers',v:totBU?Num(totBU):'—',...momChip(totBU,pBU,false),sub:`Monthly buyers${prevLabel}`,ico:'👥'},
  ].map(k=>`<div class="kpi"><div class="kpi-ico">${k.ico}</div><div class="kpi-label">${k.l}</div><div class="kpi-val" style="font-size:18px">${k.v}</div><span class="chip ${k.dir}">${k.ch}</span><div class="kpi-sub">${k.sub}</div></div>`).join('');

  // Store performance chart:
  //   Monthly grain → daily bars for selected month
  //   Daily grain   → daily bars for selected date's month (selected day highlighted)
  //   Custom / All  → monthly bars
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let chartRows, isDailyChart=false;
  if(S.grain==='daily'&&S.selectedDate&&D.shopee.daily.length){
    const[cy,cmo]=S.selectedDate.split('-').map(Number);
    chartRows=D.shopee.daily.filter(r=>r.y===cy&&r.m===mNames[cmo-1]);
    isDailyChart=chartRows.length>0;
  } else if(S.grain==='monthly'&&S.selectedMonth&&D.shopee.daily.length){
    const{month,year}=S.selectedMonth;
    chartRows=D.shopee.daily.filter(r=>r.y===year&&r.m===mNames[month]);
    isDailyChart=chartRows.length>0;
  }
  if(!isDailyChart) chartRows=sf;
  const chartLabs=isDailyChart
    ? chartRows.map(r=>r.date.slice(8)+' '+r.m)
    : chartRows.map(r=>D.shopee.m2025.includes(r)?r.m+"'25":r.m+"'26");
  const selDayIdx=isDailyChart&&S.selectedDate?chartRows.findIndex(r=>r.date===S.selectedDate):-1;
  mkChart('shopeeRevChart',{type:'bar',data:{
    labels:chartLabs,
    datasets:[
      {label:'Sales',data:chartRows.map(r=>r.s),backgroundColor:chartRows.map((_,i)=>i===selDayIdx?'rgba(59,130,246,1)':'rgba(59,130,246,.55)'),borderRadius:3,maxBarThickness:isDailyChart?8:12,yAxisID:'y',order:2},
      {label:'Visitors',data:chartRows.map(r=>r.v),backgroundColor:chartRows.map((_,i)=>i===selDayIdx?'rgba(234,179,8,1)':'rgba(234,179,8,.5)'),borderRadius:3,maxBarThickness:isDailyChart?8:12,yAxisID:'y',order:2},
      {label:'Orders',data:chartRows.map(r=>r.o),backgroundColor:chartRows.map((_,i)=>i===selDayIdx?'rgba(249,115,22,1)':'rgba(249,115,22,.55)'),borderRadius:3,maxBarThickness:isDailyChart?8:12,yAxisID:'y',order:2},
      {label:'Basket Size',data:chartRows.map(r=>r.b),type:'line',borderColor:'#22d3ee',borderWidth:2,pointRadius:isDailyChart?2:3,pointBackgroundColor:'#22d3ee',tension:.4,yAxisID:'y3',fill:false,order:1},
      {label:'Order CR',data:chartRows.map(r=>r.cr),type:'line',borderColor:'#6b7280',borderWidth:2,borderDash:[4,3],pointStyle:'triangle',pointRadius:isDailyChart?2:4,pointBackgroundColor:'#6b7280',tension:.4,yAxisID:'y2',fill:false,order:1},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>{
      if(c.dataset.label==='Sales') return ` Sales: RM${Math.round(c.raw).toLocaleString()}`;
      if(c.dataset.label==='Basket Size') return ` AOV: RM${c.raw.toFixed(2)}`;
      if(c.dataset.label==='Order CR') return ` CR: ${c.raw}%`;
      return ` ${c.dataset.label}: ${Math.round(c.raw).toLocaleString()}`;
    }}}},
    scales:{
      x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:9},maxRotation:isDailyChart?45:0}},
      y:{position:'left',grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:9},callback:v=>RMk(v)}},
      y2:{position:'right',grid:{display:false},border:{display:false},ticks:{font:{size:9},callback:v=>v+'%'},min:0},
      y3:{display:false}
    }}});

  // Detail metrics table (buyers, clicks, cancelled, returns) per row
  const tblEl=document.getElementById('shopeeDetailTbl');
  if(tblEl){
    const tblRows=isDailyChart?chartRows:sf;
    const labelFn=r=>isDailyChart?(r.date.slice(8)+'/'+r.date.slice(5,7))+(r.date===S.selectedDate?' ★':''):D.shopee.m2025.includes(r)?r.m+" '25":r.m+" '26";
    const th=s=>`<th style="padding:5px 7px;text-align:right;white-space:nowrap">${s}</th>`;
    const td=(v,style='')=>`<td style="padding:5px 7px;text-align:right${style?';'+style:''}">${v}</td>`;
    tblEl.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead style="position:sticky;top:0;z-index:1;background:var(--bg2)"><tr style="color:var(--t3);text-transform:uppercase;letter-spacing:.4px">
        <th style="padding:5px 7px;text-align:left;white-space:nowrap">Period</th>
        ${th('Sales')}${th('Visitors')}${th('Orders')}${th('Basket Size')}${th('Order CR')}
        ${th('Buyers')}${th('Clicks')}
        ${th('Cancelled Ord')}${th('Cancelled Sales')}${th('Return Ord')}${th('Return Sales')}
      </tr></thead>
      <tbody>${tblRows.map((r,i)=>`<tr style="border-top:1px solid var(--border);${i===selDayIdx?'background:rgba(59,130,246,.06);font-weight:600':''}">
        <td style="padding:5px 7px;color:var(--t1);font-weight:600;white-space:nowrap">${labelFn(r)}</td>
        ${td(r.s?RMk(r.s):'—')}
        ${td(r.v?Num(r.v):'—')}
        ${td(r.o?Num(r.o):'—')}
        ${td(r.b?'RM'+r.b.toFixed(2):'—')}
        ${td(r.cr?r.cr+'%':'—')}
        ${td(r.bu?Num(r.bu):'—')}
        ${td(r.cl?Num(r.cl):'—')}
        ${td(r.co?Num(r.co):'—',r.co?'color:var(--red)':'color:var(--t3)')}
        ${td(r.cs?RMk(r.cs):'—',r.cs?'color:var(--red)':'color:var(--t3)')}
        ${td(r.ro?Num(r.ro):'—',r.ro?'color:var(--amber)':'color:var(--t3)')}
        ${td(r.rs?RMk(r.rs):'—',r.rs?'color:var(--amber)':'color:var(--t3)')}
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Pick channel/traffic data for selected period
  const _getChannelData=()=>{
    const cbm=D.shopee.channelByMonth||{}, tbm=D.shopee.trafficSourcesByMonth||{};
    const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if(S.grain==='monthly'&&S.selectedMonth){
      const key=mNames[S.selectedMonth.month]+S.selectedMonth.year;
      if(cbm[key]) return{ch:cbm[key],ts:tbm[key]||null,label:key.slice(0,3)+' '+S.selectedMonth.year};
    }
    // For multi-month views: collect all months in the filtered set and aggregate
    const months=sf.map(r=>({m:r.m,yr:D.shopee.m2025.includes(r)?2025:2026}));
    // Aggregate channel bar data (sum sales per channel across months)
    let aggMar=null, chTemplate=null;
    for(const{m,yr}of months){
      const cd=cbm[m+yr];
      if(!cd) continue;
      if(!aggMar){aggMar=[...cd.mar];chTemplate=cd;}
      else cd.mar.forEach((v,i)=>{aggMar[i]=(aggMar[i]||0)+v;});
    }
    // Aggregate traffic sources (sum sales per source, recalculate pct)
    let aggTs=null;
    for(const{m,yr}of months){
      const td=tbm[m+yr];
      if(!td) continue;
      if(!aggTs){aggTs={};for(const sk of Object.keys(td)) aggTs[sk]=td[sk].map(r=>({...r}));}
      else{
        for(const sk of Object.keys(td)){
          if(!aggTs[sk]){aggTs[sk]=td[sk].map(r=>({...r}));continue;}
          for(const row of td[sk]){
            const ex=aggTs[sk].find(r=>r.src===row.src);
            if(ex) ex.s+=row.s; else aggTs[sk].push({...row});
          }
        }
      }
    }
    // Recalculate pct based on aggregated sales
    if(aggTs){
      for(const sk of Object.keys(aggTs)){
        const tot=aggTs[sk].reduce((a,r)=>a+r.s,0);
        if(tot>0) aggTs[sk].forEach(r=>{r.pct=+(r.s/tot*100).toFixed(2);});
        aggTs[sk].sort((a,b)=>b.s-a.s);
      }
    }
    if(aggMar&&chTemplate){
      const rangeLabel=months.length===1?`${months[0].m} ${months[0].yr}`:`${months[0].m}–${months[months.length-1].m} ${months[0].yr===months[months.length-1].yr?months[0].yr:months[0].yr+'–'+months[months.length-1].yr}`;
      return{ch:{...chTemplate,mar:aggMar},ts:aggTs,label:rangeLabel};
    }
    return{ch:D.shopee.channel,ts:D.shopee.trafficSources,label:''};
  };
  const{ch,ts,label:chLabel}=_getChannelData();
  const affMonths=sf.map(r=>({m:r.m,yr:D.shopee.m2025.includes(r)?2025:2026}));
  renderShopeeAffiliate(affMonths);

  // Sales Channel Mix
  if(ch&&ch.mar&&ch.mar.some(v=>v>0)){
    const tot=ch.mar.reduce((a,v)=>a+v,0);
    const subEl=document.getElementById('channelMixSub');
    if(subEl) subEl.textContent=(chLabel?chLabel+' · ':'')+'Confirmed orders by channel';
    mkChart('channelBarChart',{type:'bar',data:{
      labels:ch.labels,
      datasets:[{label:'Sales (MYR)',data:ch.mar,backgroundColor:ch.colors,borderRadius:4,maxBarThickness:22}]
    },options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false},
      tooltip:{...cTooltip,callbacks:{label:c=>` ${RMfull(c.raw)} (${tot?+(c.raw/tot*100).toFixed(1):0}%)`}}},
      scales:{x:{grid:{color:'#f1f5f9'},border:{display:false},ticks:{font:{size:9},callback:v=>RMk(v)}},
        y:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}}}}});
    // Pie chart
    const pieWrap=document.getElementById('channelPieWrap');
    if(pieWrap) pieWrap.style.display='block';
    mkChart('channelPieChart',{type:'doughnut',data:{
      labels:ch.labels,
      datasets:[{data:ch.mar,backgroundColor:ch.colors,borderWidth:2,borderColor:'#fff',hoverOffset:6}]
    },options:{responsive:true,cutout:'52%',plugins:{legend:{display:false},tooltip:{...cTooltip,
      callbacks:{label:c=>` ${c.label}: ${RMfull(c.raw)} (${tot?+(c.raw/tot*100).toFixed(1):0}%)`}}}}});
    const pieLeg=document.getElementById('channelPieLegend');
    if(pieLeg) pieLeg.innerHTML=ch.labels.map((l,i)=>`
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
        <span style="display:flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;background:${ch.colors[i]};border-radius:50%;display:inline-block;flex-shrink:0"></span>
          <span style="color:var(--t2)">${l}</span>
        </span>
        <span style="font-weight:600;color:var(--t1);white-space:nowrap">${RMfull(ch.mar[i])} <span style="color:var(--t3);font-weight:400">${tot?+(ch.mar[i]/tot*100).toFixed(1):0}%</span></span>
      </div>`).join('');
  }
  // Traffic source breakdown — all 4 sections
  const tsWrap=document.getElementById('trafficSourceWrap');
  if(tsWrap){
    const secDefs=[
      {key:'productCard',title:'Product Card',color:'#f97316'},
      {key:'sellerLive',title:'Seller Live',color:'#6366f1'},
      {key:'sellerVideo',title:'Seller Video',color:'#f43f5e'},
      {key:'shopeeAffiliate',title:'Shopee Affiliate',color:'#3fb950'},
    ];
    const rendered=secDefs.filter(d=>ts&&ts[d.key]&&ts[d.key].length).map(d=>{
      const maxPct=Math.max(...ts[d.key].map(s=>s.pct),1);
      return`<div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:${d.color};margin-bottom:6px">${d.title} Traffic Sources</div>
        ${ts[d.key].map(s=>`
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:5px">
            <span style="color:var(--t2);width:100px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.src}</span>
            <div style="flex:1;background:#f1f5f9;border-radius:3px;height:6px;overflow:hidden">
              <div style="width:${(s.pct/maxPct*100).toFixed(1)}%;height:100%;background:${d.color};border-radius:3px"></div>
            </div>
            <span style="color:var(--t1);font-weight:600;width:56px;text-align:right;white-space:nowrap">${RMk(s.s)}</span>
            <span style="color:var(--t3);width:36px;text-align:right">${s.pct.toFixed(1)}%</span>
          </div>`).join('')}
      </div>`;
    }).join('');
    if(rendered){tsWrap.style.display='block';tsWrap.innerHTML=rendered;}
    else tsWrap.style.display='none';
  }

  renderShopeeAds();

  // Buyers composition
  renderBuyersComp(0);

  // Ads table
  renderTbody('shopeeAdsTbl', D.shopee.ads, 'No Ads data available for the selected period.', r=>{
    const rc=r.roas>=5?'roi-good':r.roas>=3.5?'roi-warn':'roi-bad';
    const impStr=r.imp>=1000000?(r.imp/1000000).toFixed(1)+'M':r.imp>=1000?(r.imp/1000).toFixed(1)+'k':Num(r.imp);
    return `<tr>
      <td>${r.m} ${r.year}</td>
      <td>RM${Math.round(r.s).toLocaleString()}</td>
      <td>${impStr}</td>
      <td>${Num(r.o)}</td>
      <td>RM${Math.round(r.exp).toLocaleString()}</td>
      <td class="${rc}">${r.roas}x</td>
    </tr>`;
  });
}



function renderShopeeAffiliate(months) {
  const RMk=v=>'RM'+(v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(0));
  const Num=v=>v>=1000?(v/1000).toFixed(1)+'k':Math.round(v);
  const upDn=(c,p)=>{if(!p)return{c:'up',t:'—'};const d=(c-p)/p*100;return{c:d>=0?'up':'dn',t:(d>=0?'↑ ':'↓ ')+Math.abs(d).toFixed(2)+'%'};};
  
  let gmv=0, orders=0, clicks=0, views=0, cr=0, aov=0;
  let pGmv=0, pOrders=0, pClicks=0, pViews=0, pCr=0, pAov=0;
  
  for(const {m,yr} of months){
    const td = D.shopee.trafficSourcesByMonth?.[m+yr];
    if(td && td.shopeeAffiliate){
      for(const row of td.shopeeAffiliate) {
        gmv += row.s;
        orders += row.o || 0;
        clicks += row.cl || 0;
        views += row.v || 0;
      }
    }
  }
  
  if (orders > 0) {
    aov = gmv / orders;
    cr = clicks > 0 ? (orders / clicks * 100) : 0;
  }
  
  const setEl=(id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  const setDiff=(id, c, p) => {
    const el = document.getElementById(id);
    if(!el) return;
    const {c: cls, t} = upDn(c, p);
    el.className = 'stat-change ' + cls;
    el.textContent = p ? t + ' vs prev' : '—';
  };
  
  const subEl = document.getElementById('shopeeAffSub');
  if (months.length === 0) {
     if (subEl) subEl.textContent = 'No period selected';
     setEl('shopeeAffGmv', '—'); setEl('shopeeAffOrders', '—');
     setEl('shopeeAffClicks', '—'); setEl('shopeeAffViews', '—');
     setEl('shopeeAffAov', '—'); setEl('shopeeAffCr', '—');
     ['shopeeAffGmvDiff','shopeeAffOrdersDiff','shopeeAffClicksDiff','shopeeAffViewsDiff','shopeeAffAovDiff','shopeeAffCrDiff'].forEach(id=>setDiff(id,0,0));
     return;
  }
  
  if (subEl) {
     const rangeLabel = months.length===1?`${months[0].m} ${months[0].yr}`:`${months[0].m} ${months[0].yr} – ${months[months.length-1].m} ${months[months.length-1].yr}`;
     subEl.textContent = rangeLabel;
  }
  
  setEl('shopeeAffGmv', gmv ? RMk(gmv) : '—');
  setEl('shopeeAffOrders', orders ? Num(orders) : '—');
  setEl('shopeeAffClicks', clicks ? Num(clicks) : '—');
  setEl('shopeeAffViews', views ? Num(views) : '—');
  setEl('shopeeAffAov', aov ? 'RM' + aov.toFixed(1) : '—');
  setEl('shopeeAffCr', cr ? cr.toFixed(2) + '%' : '—');
  
  const prevMonths = getPrevShopee().map(r=>({m:r.m,yr:D.shopee.m2025.includes(r)?2025:2026}));
  for(const {m,yr} of prevMonths){
    const td = D.shopee.trafficSourcesByMonth?.[m+yr];
    if(td && td.shopeeAffiliate){
      for(const row of td.shopeeAffiliate) {
        pGmv += row.s;
        pOrders += row.o || 0;
        pClicks += row.cl || 0;
        pViews += row.v || 0;
      }
    }
  }
  
  if (pOrders > 0) {
    pAov = pGmv / pOrders;
    pCr = pClicks > 0 ? (pOrders / pClicks * 100) : 0;
  }
  
  setDiff('shopeeAffGmvDiff', gmv, pGmv);
  setDiff('shopeeAffOrdersDiff', orders, pOrders);
  setDiff('shopeeAffClicksDiff', clicks, pClicks);
  setDiff('shopeeAffViewsDiff', views, pViews);
  setDiff('shopeeAffAovDiff', aov, pAov);
  setDiff('shopeeAffCrDiff', cr, pCr);
}
