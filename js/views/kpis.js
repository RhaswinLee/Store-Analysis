/* ─── RENDER KPIs ─── */
function renderKPIs(){
  const sf=filteredShopee(), tf=filteredTT();
  const pf=getPrevShopee(), ptf=getPrevByKey('tiktok');
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
  // MoM chips
  const revMoM=momChip(sRev,pRev,false);
  const ordMoM=momChip(sOrd,pOrd,false);
  const crChg=pCr?(sCr-pCr).toFixed(2):null;
  const crChip={ch:crChg?(parseFloat(crChg)>=0?'↑':'↓')+Math.abs(crChg)+'%pts MoM':(sCr<3?'Below target':'On track'),dir:sCr>=3.5?'up':'warn'};
  const aovMoM=momChip(sAov,pAov,false);
  const visMoM=momChip(sVis,pVis,false);
  const prevLabel=pf.length?` vs ${pf[0].m}`:'';
  const tRevMoM=momChip(tRev,ptRev,false);
  const tOrdMoM=momChip(tOrd,ptOrd,false);
  const tCrChg=ptCr?(tCr-ptCr).toFixed(2):null;
  const tCrChip={ch:tCrChg?(parseFloat(tCrChg)>=0?'↑':'↓')+Math.abs(tCrChg)+'%pts MoM':(tf.length>1?'—':'First month'),dir:parseFloat(tCrChg)>=0?'up':'warn'};
  const tAovMoM=momChip(tAov,ptAov,true);
  const tPrevLabel=ptf.length?` vs ${ptf[0].m}`:'';

  const all=[
    {l:'Total Revenue',v:RMk(sRev+tRev),...momChip(sRev+tRev,pRev,false),sub:'Shopee+TikTok combined',ico:'💰'},
    {l:'Shopee GMV',v:RMk(sRev),...revMoM,sub:`${sf.length}mo avg ${sf.length?RMk(sRev/sf.length):'RM 0'}/mo`,ico:'🛒'},
    {l:'TikTok GMV',v:RMk(tRev),...tRevMoM,sub:`${tf.length}mo`,ico:'🎵'},
    {l:'Combined Orders',v:Num(sOrd+tOrd),...momChip(sOrd+tOrd,pOrd,false),sub:'All channels',ico:'📦'},
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

