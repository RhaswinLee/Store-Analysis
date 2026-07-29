/* ─── OVERVIEW CHARTS ─── */
let _oDrillMonth=null;
let _oLastGrainSig=null;
window.oBackToMonths = function(){ _oDrillMonth=null; renderOverview(); return false; };

function renderOverview(){
  const grainSig=JSON.stringify([S.grain,S.selectedMonth,S.selectedDate,S.customStart,S.customEnd,S.selectedCampaignMonth,S.selectedCampaignYear]);
  if(_oLastGrainSig!==null&&_oLastGrainSig!==grainSig) _oDrillMonth=null;
  _oLastGrainSig=grainSig;

  const sf=filteredShopee(), tf=filteredTT();
  const sgf=filteredShopeeSG(), ttsgf=filteredTiktokSG();
  const sLabels=sf.map(r=>r.m);

  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let isDailyChart=false;
  let oLabels, oSf, oTf, oSgf, oTtsgf;
  if(_oDrillMonth){
    const dSf=(D.shopee.daily||[]).filter(r=>r.y===_oDrillMonth.year&&r.m===mNames[_oDrillMonth.month-1]);
    const dTf=(D.tiktok.daily||[]).filter(r=>r.y===_oDrillMonth.year&&r.m===mNames[_oDrillMonth.month-1]);
    const dSgf=(D.shopeeSG.daily||[]).filter(r=>r.y===_oDrillMonth.year&&r.m===mNames[_oDrillMonth.month-1]);
    const dTtsgf=(D.tiktokSG.daily||[]).filter(r=>r.y===_oDrillMonth.year&&r.m===mNames[_oDrillMonth.month-1]);
    
    // gather all dates
    const dateSet=new Set([...dSf.map(r=>r.date),...dTf.map(r=>r.date),...dSgf.map(r=>r.date),...dTtsgf.map(r=>r.date)]);
    const dates=Array.from(dateSet).sort();
    if(dates.length>0){
      isDailyChart=true;
      oLabels=dates.map(d=>d.slice(8)+' '+mNames[_oDrillMonth.month-1]);
      oSf=dates.map(d=>dSf.find(x=>x.date===d)||{s:0,o:0,cr:0,b:0});
      oTf=dates.map(d=>dTf.find(x=>x.date===d)||{s:0,o:0,cr:0,b:0});
      oSgf=dates.map(d=>dSgf.find(x=>x.date===d)||{s:0,o:0,cr:0,b:0});
      oTtsgf=dates.map(d=>dTtsgf.find(x=>x.date===d)||{s:0,o:0,cr:0,b:0});
    }
  }

  if(!isDailyChart) {
    oLabels=sf.map(r=>r.m);
    oSf=sf; oTf=oLabels.map(m=>tf.find(x=>x.m===m)||{s:0,o:0,cr:0,b:0});
    oSgf=oLabels.map(m=>sgf.find(x=>x.m===m)||{s:0,o:0,cr:0,b:0});
    oTtsgf=oLabels.map(m=>ttsgf.find(x=>x.m===m)||{s:0,o:0,cr:0,b:0});
  }

  // Revenue trend — all 4 platforms
  mkChart('revChart',{type:'line',data:{
    labels:oLabels,
    datasets:[
      {label:'Shopee MY',data:oSf.map(r=>r.s),borderColor:'#f97316',borderWidth:isDailyChart?2:2.5,fill:!isDailyChart,backgroundColor:'rgba(249,115,22,.08)',pointRadius:isDailyChart?1:3,pointBackgroundColor:'#f97316',tension:.4},
      {label:'TikTok MY',data:oTf.map(r=>r.s),borderColor:'#f43f5e',borderWidth:isDailyChart?2:2.5,fill:!isDailyChart,backgroundColor:'rgba(244,63,94,.08)',pointRadius:isDailyChart?1:3,pointBackgroundColor:'#f43f5e',tension:.4},
      {label:'Shopee SG',data:oSgf.map(r=>r.s),borderColor:'#fb923c',borderWidth:2,borderDash:[4,3],fill:false,pointRadius:isDailyChart?1:3,pointBackgroundColor:'#fb923c',tension:.4},
      {label:'TikTok SG',data:oTtsgf.map(r=>r.s),borderColor:'#fb7185',borderWidth:2,borderDash:[4,3],fill:false,pointRadius:isDailyChart?1:3,pointBackgroundColor:'#fb7185',tension:.4},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>' '+c.dataset.label+': '+RMexact(c.raw)}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:10},maxRotation:isDailyChart?45:0}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)},beginAtZero:true}},
    onClick:(evt,els)=>{
      if(isDailyChart || !els.length) return;
      const idx=els[0].index;
      const mStr=oLabels[idx];
      const p=sf.find(x=>x.m===mStr);
      if(p){
        const is25 = D.shopee.m2025.includes(p);
        _oDrillMonth={year:is25?2025:2026,month:mNames.indexOf(p.m)+1};
        renderOverview();
      }
    }
  }});

  const subEl = document.getElementById('overviewRevSub');
  if(subEl) {
    if(_oDrillMonth) subEl.innerHTML = `Daily breakdown for ${mNames[_oDrillMonth.month-1]} ${_oDrillMonth.year} · <a href="#" onclick="return oBackToMonths()" style="color:var(--t2);text-decoration:underline;cursor:pointer">← Back to months</a>`;
    else subEl.innerHTML = 'Monthly GMV · All Platforms';
  }

  // Platform split donut — all 4 platforms
  const shopeeTotal=sf.reduce((a,r)=>a+r.s,0);
  const ttTotal=tf.reduce((a,r)=>a+r.s,0);
  const sgTotal=sgf.reduce((a,r)=>a+r.s,0);
  const ttSGTotal=ttsgf.reduce((a,r)=>a+r.s,0);
  const grandTotal=shopeeTotal+ttTotal+sgTotal+ttSGTotal||1;
  const allPlatLabels=['Shopee MY','TikTok MY','Shopee SG','TikTok SG'];
  const allPlatData=[shopeeTotal,ttTotal,sgTotal,ttSGTotal];
  const allPlatColors=['#f97316','#f43f5e','#fb923c','#fb7185'];
  mkChart('splitChart',{type:'doughnut',data:{
    labels:allPlatLabels,
    datasets:[{data:allPlatData,backgroundColor:allPlatColors,borderWidth:0,hoverOffset:6}]
  },options:{responsive:true,cutout:'68%',plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.label}: ${RMexact(c.raw)}`}}}}});
  document.getElementById('splitLegend').innerHTML=allPlatLabels.map((l,i)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
      <span style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;background:${allPlatColors[i]};border-radius:2px"></span><span style="color:var(--t2)">${l}</span></span>
      <span style="font-weight:700;color:var(--t1)">${RMk(allPlatData[i])} <span style="color:var(--t3);font-weight:400">${(allPlatData[i]/grandTotal*100).toFixed(1)}%</span></span>
    </div>`).join('');

  document.getElementById('revTag').textContent='Combined '+RMk(grandTotal);

  // Orders
  mkChart('ordersChart',{type:'bar',data:{
    labels:oLabels,
    datasets:[
      {label:'Shopee',data:oSf.map(r=>r.o),backgroundColor:'rgba(249,115,22,.7)',borderRadius:3,maxBarThickness:isDailyChart?10:20},
      {label:'TikTok',data:oTf.map(r=>r.o),backgroundColor:'rgba(244,63,94,.7)',borderRadius:3,maxBarThickness:isDailyChart?10:20},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:cTooltip},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:10},maxRotation:isDailyChart?45:0},stacked:true},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10}},stacked:true,beginAtZero:true}}}});

  // CR
  mkChart('crChart',{type:'line',data:{
    labels:oLabels,
    datasets:[
      {label:'Shopee CR',data:oSf.map(r=>r.cr),borderColor:'#f97316',borderWidth:2,pointRadius:isDailyChart?1:3,pointBackgroundColor:'#f97316',tension:.4,fill:false},
      {label:'TikTok CR',data:oTf.map(r=>r.cr),borderColor:'#f43f5e',borderWidth:2,pointRadius:isDailyChart?1:3,pointBackgroundColor:'#f43f5e',tension:.4,fill:false},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}%`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:10},maxRotation:isDailyChart?45:0}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v+'%'},beginAtZero:true}}}});

  // AOV
  mkChart('aovChart',{type:'line',data:{
    labels:oLabels,
    datasets:[
      {label:'Shopee AOV',data:oSf.map(r=>r.b),borderColor:'#f97316',borderWidth:2,pointRadius:isDailyChart?1:3,tension:.4},
      {label:'TikTok AOV',data:oTf.map(r=>r.b),borderColor:'#f43f5e',borderWidth:2,pointRadius:isDailyChart?1:3,tension:.4},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:10},maxRotation:isDailyChart?45:0}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>'RM'+v},beginAtZero:true}}}});
}

