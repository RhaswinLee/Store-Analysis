/* ─── RECOMMENDATIONS ─── */
function renderRecos(){
  const recos=[
    {ico:'💰',bg:'rgba(99,102,241,.15)',type:'AOV Maximization',title:'Push AOV to RM55–60',
      body:`Current Shopee AOV <span class="reco-metric">RM54.91</span> (Mar 2026) is below the <span class="reco-metric">RM55 target</span>. TikTok AOV at <span class="reco-metric">RM45.55</span> is critically below target.`,
      cta:'<strong>Action:</strong> Highlight the Duo Refill Pack (RM125.90) and Deo Spray + Roll-On bundle. Deploy bundle set: Deo 25g + Sunscreen + Lip Balm (Zen & Crème Cloud). Target AOV uplift of RM5–10 per order.',cclass:''},
    {ico:'🔁',bg:'rgba(249,115,22,.15)',type:'Funnel Recovery',title:'Deo Roll-On: 8,497 ATC → Convert',
      body:`Roll-On generated <span class="reco-metric">8,497 ATC</span> in March — the highest across all products — but shows a conversion gap. Deploy a targeted <span class="reco-metric">Chat Broadcast</span> to lapsed buyers.`,
      cta:'<strong>Action:</strong> Target customers who purchased 3+ months ago (All Products). Offer Min Spend RM50 get RM10 off co-funded voucher. Also target Refillable Deo 3-Pack buyers — sales dropped RM41.8k → RM36.3k in March.',cclass:'o'},
    {ico:'🎁',bg:'rgba(244,63,94,.15)',type:'Conversion Rate Driver',title:'Free Gift → 59.21% CR Spike',
      body:`Historical data shows Free Gift promotions drive exceptional CR. The <span class="reco-metric">FREE GIFT Plushie</span> achieved a <span class="reco-metric">59.21% conversion rate</span> — the highest recorded metric.`,
      cta:'<strong>Action:</strong> Pair Deo Stick 25g (bounce: 20.93%) and Refillable Deo Stick 40g (bounce: 21.65%) with a free gift mechanism. Deodorant buyers → Free Lip Sample. Lip Balm buyers → Free Deodorant Sample.',cclass:'p'},
    {ico:'📉',bg:'rgba(248,81,73,.15)',type:'Bounce Rate Alert',title:'Reduce Deo Stick Bounce to <18%',
      body:`Deo Stick 25g bounce rate at <span class="reco-metric">20.93%</span> and Refillable Stick 40g at <span class="reco-metric">21.65%</span> (March) are significantly above the <span class="reco-metric">18% threshold</span>.`,
      cta:'<strong>Action:</strong> Optimize product listing images, add size comparison visuals, clarify refill compatibility. Increase ATC-to-checkout rate by featuring co-fund voucher RM0 min spend in product page.',cclass:'p'},
    {ico:'📢',bg:'rgba(63,185,80,.15)',type:'Affiliate Amplification',title:'Scale TikTok Affiliate Network',
      body:`TikTok affiliate GMV recovered to <span class="reco-metric">RM168.8k</span> in March (↑10.37%) after 3 months of decline. Creator count rose to <span class="reco-metric">922 creators</span> with sales.`,
      cta:'<strong>Action:</strong> Prioritize inviting creators in Beauty+4 categories (yatyalishcosmetics tier: 103k followers, >5k orders, >50k GMV). Focus on Shopee Live affiliate: Feb sales RM150.2k → maintain 28%+ growth.',cclass:'g'},
    {ico:'🚚',bg:'rgba(210,153,34,.15)',type:'Account Health Risk',title:'Fast Handover Rate: FAILING at 61.83%',
      body:`Fast Handover Rate is at <span class="reco-metric">61.83%</span> (weekly) vs target of <span class="reco-metric">≥75%</span>. This threatens <strong style="color:var(--amber)">Preferred Seller status</strong>. On-time Pickup Failure is at 99.58% vs <5% target.`,
      cta:'<strong>Immediate Action:</strong> Review courier handover SOP. Coordinate with logistics team to ensure same-day pickup. Failure to resolve before next weekly evaluation will remove Preferred Badge and Search Filter benefits.',cclass:'o'},
    {ico:'📊',bg:'rgba(99,102,241,.15)',type:'TikTok Ads Efficiency',title:'GMV Max ROI Declining — Restructure',
      body:`TikTok GMV Max ROI fell from <span class="reco-metric">4.50x (Nov)</span> to <span class="reco-metric">3.27x (Mar)</span> — a 27% decline over 5 months. Ad spend increased to <span class="reco-metric">RM146k</span> while GMV efficiency dropped.`,
      cta:'<strong>Action:</strong> Review creative refresh cadence — CTR declining signals creative fatigue. Test product-specific campaigns for Roll-On (highest ATC) vs broad GMV Max. Target CPO below RM12 (currently RM12.82).',cclass:''},
  ];
  document.getElementById('recoGrid').innerHTML=recos.map(r=>`
    <div class="reco">
      <div class="reco-hd">
        <div class="reco-ico" style="background:${r.bg}">${r.ico}</div>
        <div><div class="reco-ttl">${r.title}</div><div class="reco-type">${r.type}</div></div>
      </div>
      <div class="reco-body">${r.body}</div>
      <div class="reco-cta ${r.cclass}">${r.cta}</div>
    </div>`).join('');
}

/* ─── DATA-DRIVEN RECOMMENDATIONS ─── */
function renderRecommendations(){
  const el=document.getElementById('recoContent');
  if(!el) return;
  const recos=[];

  // Shopee MY analysis
  const sm=D.shopee.m2026;
  if(sm.length>=2){
    const latest=sm[sm.length-1];
    const prev=sm[sm.length-2];
    const growthPct=prev.s?((latest.s-prev.s)/prev.s*100):0;
    if(growthPct<-5) recos.push({icon:'⚠️',title:`Shopee MY Revenue Declined ${Math.abs(growthPct).toFixed(1)}%`,body:`${latest.m} GMV dropped from RM${(prev.s/1000).toFixed(0)}K to RM${(latest.s/1000).toFixed(0)}K. Review campaign spend and traffic sources.`,type:'warn'});
    else if(growthPct>10) recos.push({icon:'✅',title:`Shopee MY Growing ${growthPct.toFixed(1)}% MoM`,body:`Strong momentum in ${latest.m}. Consider scaling ad budget to capture demand.`,type:'good'});
    if(latest.cr>0&&latest.cr<3) recos.push({icon:'🎯',title:'Low Shopee Conversion Rate',body:`${latest.m} CVR is ${latest.cr.toFixed(2)}% — below 3% threshold. Improve product images and pricing.`,type:'warn'});
    if(latest.b>0) recos.push({icon:'📦',title:`Shopee AOV: RM${latest.b.toFixed(2)}`,body:`Bundle deals and GWP campaigns can push AOV above RM65. Current: RM${latest.b.toFixed(2)}.`,type:'info'});
  }

  // TikTok MY analysis
  const tt=D.tiktok.m2026;
  if(tt.length>=2){
    const latest=tt[tt.length-1];
    const prev=tt[tt.length-2];
    const growthPct=prev.s?((latest.s-prev.s)/prev.s*100):0;
    if(growthPct<-5) recos.push({icon:'⚠️',title:`TikTok MY Revenue Declined ${Math.abs(growthPct).toFixed(1)}%`,body:`${latest.m} GMV dropped. Review LIVE schedule and affiliate creator performance.`,type:'warn'});
    else if(growthPct>10) recos.push({icon:'✅',title:`TikTok MY Growing ${growthPct.toFixed(1)}% MoM`,body:`Scale LIVE broadcast frequency and affiliate outreach.`,type:'good'});
  }

  // Product recommendations
  const allProds=[...(D.shopee.products||[]),...(D.tiktok.products||[])].sort((a,b)=>b.gmv-a.gmv);
  if(allProds.length>0){
    const top=allProds[0];
    recos.push({icon:'🏆',title:`Top Product: ${top.name.slice(0,40)}`,body:`GMV RM${(top.gmv/1000).toFixed(1)}K with ${top.orders||0} orders. Scale inventory and ad spend for this SKU.`,type:'good'});
    const lowCr=allProds.filter(p=>p.cr>0&&p.cr<5);
    if(lowCr.length) recos.push({icon:'📉',title:`${lowCr.length} Products with CVR < 5%`,body:`${lowCr.slice(0,3).map(p=>p.name.slice(0,25)).join(', ')} have low conversion. Review listing quality and pricing.`,type:'warn'});
  }

  if(!recos.length){
    el.innerHTML='<p style="color:var(--t3);padding:24px">Connect your platform folders to generate data-driven recommendations.</p>';
    return;
  }

  el.innerHTML=recos.map(r=>`
    <div style="padding:14px 16px;border-radius:8px;margin-bottom:10px;background:${r.type==='warn'?'rgba(220,38,38,.06)':r.type==='good'?'rgba(22,163,74,.06)':'rgba(79,70,229,.06)'};border-left:3px solid ${r.type==='warn'?'var(--red)':r.type==='good'?'var(--green)':'var(--indigo)'}">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px">${r.icon} ${r.title}</div>
      <div style="font-size:12px;color:var(--t2)">${r.body}</div>
    </div>`).join('');
}

/* ─── HEALTH ─── */
function renderHealth(){
  const metrics=[
    {val:'0.14%',label:'Non-Fulfillment Rate',target:'Target <5%',cls:'ok',badge:'✓ Passing'},
    {val:'0.03%',label:'Late Shipment Rate',target:'Target <10%',cls:'ok',badge:'✓ Passing'},
    {val:'0.56d',label:'Preparation Time',target:'Target <1 day',cls:'ok',badge:'✓ Passing'},
    {val:'69.91%',label:'Fast Handover Rate',target:'Target ≥75%',cls:'warn',badge:'⚠ Below Target'},
    {val:'61.83%',label:'Handover (Weekly)',target:'Target ≥75%',cls:'fail',badge:'✕ FAILING'},
  ];
  document.getElementById('healthGrid').innerHTML=metrics.map(m=>`
    <div class="hc">
      <div class="hc-label">${m.label}</div>
      <div class="hc-val ${m.cls}">${m.val}</div>
      <div class="hc-target">${m.target}</div>
      <div class="hc-badge ${m.cls}">${m.badge}</div>
    </div>`).join('');
}

