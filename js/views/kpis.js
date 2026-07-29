/* ─── RENDER KPIs ─── */
function renderKPIs(){
  const sf=filteredShopee(), tf=filteredTT();
  const pf=getPrevShopee(), ptf=getPrevByKey('tiktok');
  const isYearly=S.grain==='y2026'||S.grain==='y2025';
  const period=isYearly?'YoY':'MoM';

  const sRev=sf.reduce((a,r)=>a+r.s,0), tRev=tf.reduce((a,r)=>a+r.s,0);
  const sOrd=sf.reduce((a,r)=>a+r.o,0), tOrd=tf.reduce((a,r)=>a+r.o,0);
  const sAov=sf.length?sf.reduce((a,r)=>a+r.b,0)/sf.length:0;
  const tAov=tf.length?tf.reduce((a,r)=>a+r.b,0)/tf.length:0;
  const sCr=sf.length?sf.reduce((a,r)=>a+r.cr,0)/sf.length:0;
  const tCr=tf.length?tf.reduce((a,r)=>a+r.cr,0)/tf.length:0;
  const sVis=sf.length?Math.round(sf.reduce((a,r)=>a+r.v,0)/sf.length):0;
  // Previous period aggregates
  const pRev=pf.reduce((a,r)=>a+r.s,0);
  const pOrd=pf.reduce((a,r)=>a+r.o,0);
  const pAov=pf.length?pf.reduce((a,r)=>a+r.b,0)/pf.length:0;
  const pCr=pf.length?pf.reduce((a,r)=>a+r.cr,0)/pf.length:0;
  const pVis=pf.length?Math.round(pf.reduce((a,r)=>a+r.v,0)/pf.length):0;
  const ptRev=ptf.reduce((a,r)=>a+r.s,0);
  const ptOrd=ptf.reduce((a,r)=>a+r.o,0);
  const ptAov=ptf.length?ptf.reduce((a,r)=>a+r.b,0)/ptf.length:0;
  const ptCr=ptf.length?ptf.reduce((a,r)=>a+r.cr,0)/ptf.length:0;

  // A period-over-period % needs a "current" that matches what "previous" actually is. Yearly
  // grains compare a fair YTD-vs-YTD sum (getPrevByKey already matches month-count). Every other
  // grain's "previous" is a single prior month, so "current" must be the latest month's own value —
  // not the multi-month total shown as the headline — otherwise e.g. a 6-month sum gets compared
  // against 1 month and produces a meaningless 500%+ swing.
  const sLast=sf.length?sf[sf.length-1]:null, tLast=tf.length?tf[tf.length-1]:null;
  const sCurR=isYearly?sRev:(sLast?sLast.s:0), tCurR=isYearly?tRev:(tLast?tLast.s:0);
  const sCurO=isYearly?sOrd:(sLast?sLast.o:0), tCurO=isYearly?tOrd:(tLast?tLast.o:0);
  const sCurA=isYearly?sAov:(sLast?sLast.b:0), tCurA=isYearly?tAov:(tLast?tLast.b:0);
  const sCurC=isYearly?sCr:(sLast?sLast.cr:0), tCurC=isYearly?tCr:(tLast?tLast.cr:0);
  const sCurV=isYearly?sVis:(sLast?sLast.v:0);
  const sPartial=!isYearly&&isPartialMonth('shopee',sLast), tPartial=!isYearly&&isPartialMonth('tiktok',tLast);
  const partialChip={ch:'Month in progress',dir:'up'};

  // MoM/YoY chips
  const revMoM=sPartial?partialChip:momChip(sCurR,pRev,false,period);
  const ordMoM=sPartial?partialChip:momChip(sCurO,pOrd,false,period);
  const crChg=pCr?(sCurC-pCr).toFixed(2):null;
  const crChip=sPartial?partialChip:{ch:crChg?(parseFloat(crChg)>=0?'↑':'↓')+Math.abs(crChg)+`%pts ${period}`:(sCr<3?'Below target':'On track'),dir:sCr>=3.5?'up':'warn'};
  const aovMoM=sPartial?partialChip:momChip(sCurA,pAov,false,period);
  const visMoM=sPartial?partialChip:momChip(sCurV,pVis,false,period);
  const prevLabel=isYearly?(pf.length?' vs prior year':''):(pf.length?` vs ${pf[0].m}`:'');
  const tRevMoM=tPartial?partialChip:momChip(tCurR,ptRev,false,period);
  const tOrdMoM=tPartial?partialChip:momChip(tCurO,ptOrd,false,period);
  const tCrChg=ptCr?(tCurC-ptCr).toFixed(2):null;
  const tCrChip=tPartial?partialChip:{ch:tCrChg?(parseFloat(tCrChg)>=0?'↑':'↓')+Math.abs(tCrChg)+`%pts ${period}`:(tf.length>1?'—':'First month'),dir:parseFloat(tCrChg)>=0?'up':'warn'};
  const tAovMoM=tPartial?partialChip:momChip(tCurA,ptAov,true,period);
  const tPrevLabel=isYearly?(ptf.length?' vs prior year':''):(ptf.length?` vs ${ptf[0].m}`:'');

  const all=[
    {l:'Total Revenue',v:RMk(sRev+tRev),...((sPartial||tPartial)?partialChip:momChip(sCurR+tCurR,pRev+ptRev,false,period)),sub:'Shopee+TikTok combined',ico:'💰'},
    {l:'Shopee GMV',v:RMk(sRev),...revMoM,sub:`${sf.length}mo avg ${sf.length?RMk(sRev/sf.length):'RM 0'}/mo`,ico:'🛒'},
    {l:'TikTok GMV',v:RMk(tRev),...tRevMoM,sub:`${tf.length}mo`,ico:'🎵'},
    {l:'Combined Orders',v:Num(sOrd+tOrd),...((sPartial||tPartial)?partialChip:momChip(sCurO+tCurO,pOrd+ptOrd,false,period)),sub:'All channels',ico:'📦'},
    {l:'Avg Conv. Rate',v:Pct((sCr+tCr)/2),ch:sCr>tCr?'Shopee leads':'TikTok leads',dir:'up',sub:'Platform average',ico:'⚡'},
  ];
  const shopee=[
    {l:'Shopee Revenue',v:RMfull(sRev),...revMoM,sub:`${sf.length} month${sf.length>1?'s':''}${prevLabel}`,ico:'💵'},
    {l:'Total Orders',v:Num(sOrd),...ordMoM,sub:`Confirmed orders${prevLabel}`,ico:'📦'},
    {l:'Conv. Rate',v:Pct(sCr),...crChip,sub:`Target 3.80%${prevLabel}`,ico:'⚡'},
    {l:'Avg Order Value',v:'RM'+sAov.toFixed(2),...aovMoM,sub:`Target RM55–60${prevLabel}`,ico:'🎯'},
    {l:'Avg Visitors',v:sVis?Num(sVis):'—',...visMoM,sub:`Unique visits${prevLabel}`,ico:'👥'},
  ];
  const tiktok=[
    {l:'TikTok GMV',v:RMk(tRev),...tRevMoM,sub:`${tf.length} months`,ico:'🎵'},
    {l:'Total Orders',v:Num(tOrd),...tOrdMoM,sub:`Confirmed orders${tPrevLabel}`,ico:'📦'},
    {l:'Conv. Rate',v:Pct(tCr),...tCrChip,sub:`Buyer conversion${tPrevLabel}`,ico:'⚡'},
    {l:'Avg Order Value',v:'RM'+tAov.toFixed(2),...tAovMoM,sub:`vs Shopee RM${sAov.toFixed(2)}`,ico:'🎯'},
    {l:'Affiliate GMV',v:D.tiktok.affiliate&&D.tiktok.affiliate.length?RMk(D.tiktok.affiliate[D.tiktok.affiliate.length-1].gmv||0):'—',ch:'from Drive data',dir:'up',sub:'Connect TikTok MY folder',ico:'🤝'},
  ];

  function renderRow(id, data){
    const el=document.getElementById(id); if(!el) return;
    el.innerHTML=data.map(k=>`
      <div class="kpi">
        <div class="kpi-ico">${k.ico}</div>
        <div class="kpi-label">${k.l}</div>
        <div class="kpi-val">${k.v}</div>
        <span class="chip ${k.dir}">${k.ch}</span>
        <div class="kpi-sub">${k.sub}</div>
      </div>`).join('');
  }
  renderRow('kpiRow', all);
  renderRow('shopeeKpi', shopee);
  renderRow('tiktokKpi', tiktok);
}
