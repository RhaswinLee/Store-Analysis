/* ─── OVERVIEW CHARTS ─── */
function renderOverview(){
  const sf=filteredShopee(), tf=filteredTT();
  const sgf=filteredShopeeSG(), ttsgf=filteredTiktokSG();
  const sLabels=sf.map(r=>r.m);

  // Revenue trend — all 4 platforms, aligned to Shopee MY labels
  mkChart('revChart',{type:'line',data:{
    labels:sLabels,
    datasets:[
      {label:'Shopee MY',data:sf.map(r=>r.s),borderColor:'#f97316',borderWidth:2.5,fill:true,backgroundColor:'rgba(249,115,22,.08)',pointRadius:3,pointBackgroundColor:'#f97316',tension:.4},
      {label:'TikTok MY',data:sLabels.map(m=>{const r=tf.find(x=>x.m===m);return r?r.s:null;}),borderColor:'#f43f5e',borderWidth:2.5,fill:true,backgroundColor:'rgba(244,63,94,.08)',pointRadius:3,pointBackgroundColor:'#f43f5e',tension:.4},
      {label:'Shopee SG',data:sLabels.map(m=>{const r=sgf.find(x=>x.m===m);return r?r.s:null;}),borderColor:'#fb923c',borderWidth:2,borderDash:[4,3],fill:false,pointRadius:3,pointBackgroundColor:'#fb923c',tension:.4},
      {label:'TikTok SG',data:sLabels.map(m=>{const r=ttsgf.find(x=>x.m===m);return r?r.s:null;}),borderColor:'#fb7185',borderWidth:2,borderDash:[4,3],fill:false,pointRadius:3,pointBackgroundColor:'#fb7185',tension:.4},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>' '+c.dataset.label+': '+RMk(c.raw)}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)}}}}});

  // Platform split donut — all 4 platforms
  const shopeeTotal=D.shopee.m2026.reduce((a,r)=>a+r.s,0);
  const ttTotal=D.tiktok.m2026.reduce((a,r)=>a+r.s,0);
  const sgTotal=D.shopeeSG.m2026.reduce((a,r)=>a+r.s,0);
  const ttSGTotal=D.tiktokSG.m2026.reduce((a,r)=>a+r.s,0);
  const grandTotal=shopeeTotal+ttTotal+sgTotal+ttSGTotal||1;
  const allPlatLabels=['Shopee MY','TikTok MY','Shopee SG','TikTok SG'];
  const allPlatData=[shopeeTotal,ttTotal,sgTotal,ttSGTotal];
  const allPlatColors=['#f97316','#f43f5e','#fb923c','#fb7185'];
  mkChart('splitChart',{type:'doughnut',data:{
    labels:allPlatLabels,
    datasets:[{data:allPlatData,backgroundColor:allPlatColors,borderWidth:0,hoverOffset:6}]
  },options:{responsive:true,cutout:'68%',plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.label}: ${RMk(c.raw)}`}}}}});
  document.getElementById('splitLegend').innerHTML=allPlatLabels.map((l,i)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
      <span style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;background:${allPlatColors[i]};border-radius:2px"></span><span style="color:var(--t2)">${l}</span></span>
      <span style="font-weight:700;color:var(--t1)">${RMk(allPlatData[i])} <span style="color:var(--t3);font-weight:400">${(allPlatData[i]/grandTotal*100).toFixed(1)}%</span></span>
    </div>`).join('');

  document.getElementById('revTag').textContent='Combined '+RMk(grandTotal);

  // Orders
  mkChart('ordersChart',{type:'bar',data:{
    labels:sLabels,
    datasets:[
      {label:'Shopee',data:sf.map(r=>r.o),backgroundColor:'rgba(249,115,22,.7)',borderRadius:3,maxBarThickness:20},
      {label:'TikTok',data:sf.map((r,i)=>tf[i]?tf[i].o:0),backgroundColor:'rgba(244,63,94,.7)',borderRadius:3,maxBarThickness:20},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:cTooltip},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}},stacked:true},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10}},stacked:true}}}});

  // CR
  mkChart('crChart',{type:'line',data:{
    labels:sLabels,
    datasets:[
      {label:'Shopee CR',data:sf.map(r=>r.cr),borderColor:'#f97316',borderWidth:2,pointRadius:3,pointBackgroundColor:'#f97316',tension:.4,fill:false},
      {label:'TikTok CR',data:sf.map((r,i)=>tf[i]?tf[i].cr:null),borderColor:'#f43f5e',borderWidth:2,pointRadius:3,pointBackgroundColor:'#f43f5e',tension:.4,fill:false},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}%`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v+'%'}}}}});

  // AOV
  mkChart('aovChart',{type:'line',data:{
    labels:sLabels,
    datasets:[
      {label:'Shopee AOV',data:sf.map(r=>r.b),borderColor:'#f97316',borderWidth:2,pointRadius:3,tension:.4},
      {label:'TikTok AOV',data:sf.map((r,i)=>tf[i]?tf[i].b:null),borderColor:'#f43f5e',borderWidth:2,pointRadius:3,tension:.4},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: RM${c.raw}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>'RM'+v}}}}});
}

