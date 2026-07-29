/* ─── TIKTOK CHARTS ─── */
let _ttDrillMonth=null;
let _ttLastGrainSig=null;
window.ttBackToMonths = function(){ _ttDrillMonth=null; renderTikTok(); return false; };

function renderTikTok(){
  const grainSig=JSON.stringify([S.grain,S.selectedMonth,S.selectedDate,S.customStart,S.customEnd,S.selectedCampaignMonth,S.selectedCampaignYear]);
  if(_ttLastGrainSig!==null&&_ttLastGrainSig!==grainSig) _ttDrillMonth=null;
  _ttLastGrainSig=grainSig;

  const all=[...D.tiktok.m2025,...D.tiktok.m2026];
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let chartRows, isDailyChart=false;
  if(_ttDrillMonth&&D.tiktok.daily.length){
    chartRows=D.tiktok.daily.filter(r=>r.y===_ttDrillMonth.year&&r.m===mNames[_ttDrillMonth.month-1]);
    isDailyChart=chartRows.length>0;
  }
  if(!isDailyChart) chartRows=all;
  const chartLabs=isDailyChart
    ? chartRows.map(r=>r.date.slice(8)+' '+r.m)
    : chartRows.map(r=>r.m);

  mkChart('ttRevChart',{type:isDailyChart?'bar':'line',data:{
    labels:chartLabs,
    datasets:[{
      label:'TikTok GMV',data:chartRows.map(r=>r.s),
      borderColor:'#f43f5e',borderWidth:isDailyChart?0:2.5,
      fill:!isDailyChart,backgroundColor:isDailyChart?'#f43f5e':'rgba(244,63,94,.08)',
      pointRadius:isDailyChart?0:3,pointBackgroundColor:'#f43f5e',tension:isDailyChart?0:.4,
      borderRadius:isDailyChart?3:0,maxBarThickness:isDailyChart?12:undefined
    }]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` GMV: ${RMexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:9},maxRotation:isDailyChart?45:0}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)},beginAtZero:true}},
    onClick:(evt,els)=>{
      if(isDailyChart || !els.length) return;
      const p=chartRows[els[0].index];
      if(p){
        const is25 = D.tiktok.m2025.includes(p);
        _ttDrillMonth={year:is25?2025:2026,month:mNames.indexOf(p.m)+1};
        renderTikTok();
      }
    }
  }});

  const subEl = document.getElementById('ttRevSub');
  if(subEl) {
    if(_ttDrillMonth) subEl.innerHTML = `Daily breakdown for ${mNames[_ttDrillMonth.month-1]} ${_ttDrillMonth.year} · <a href="#" onclick="return ttBackToMonths()" style="color:var(--t2);text-decoration:underline;cursor:pointer">← Back to months</a>`;
    else subEl.innerHTML = '2025 (Apr-Dec) + 2026 (Jan-Mar)';
  }

  // Breakdown grouped bar
  const bk=D.tiktok.breakdown;
  mkChart('ttBreakChart',{type:'bar',data:{
    labels:bk.map(r=>r.m+' 2026'),
    datasets:[
      {label:'Product',data:bk.map(r=>r.prod),backgroundColor:'#6366f1',borderRadius:3,maxBarThickness:28},
      {label:'Video',data:bk.map(r=>r.vid),backgroundColor:'#f43f5e',borderRadius:3,maxBarThickness:28},
      {label:'Live',data:bk.map(r=>r.live),backgroundColor:'#f97316',borderRadius:3,maxBarThickness:28},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)},beginAtZero:true}}}});

  // Ads ROI
  mkChart('ttAdsChart',{type:'line',data:{
    labels:D.tiktok.ads.map(r=>r.m+' '+(r.m==='Oct'||r.m==='Nov'||r.m==='Dec'?'25':'26')),
    datasets:[{
      label:'ROI',data:D.tiktok.ads.map(r=>r.roi),
      borderColor:'#f43f5e',borderWidth:2.5,pointRadius:4,pointBackgroundColor:D.tiktok.ads.map(r=>r.roi>=4?'#3fb950':'#f85149'),tension:.4,
    }]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ROI: ${c.raw}x`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:9}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v+'x'},beginAtZero:true}}}});

  // Affiliate
  const aff=D.tiktok.affiliate;
  mkChart('ttAffChart',{type:'bar',data:{
    labels:aff.map(r=>r.m),
    datasets:[{label:'Affiliate GMV',data:aff.map(r=>r.gmv),backgroundColor:aff.map((r,i)=>i===4?'#f43f5e':'rgba(244,63,94,.4)'),borderRadius:4,maxBarThickness:36}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` GMV: ${RMexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)},beginAtZero:true}}}});

  // Video views — not extracted by the current sync pipeline (no source sheet wired for it yet)
  const vw=D.tiktok.views;
  _chartOrEmpty('ttViewChart',vw.length>0,'No video-view data in the connected source files',()=>{
    mkChart('ttViewChart',{type:'bar',data:{
      labels:vw.map(r=>r.m),
      datasets:[
        {label:'Video Views',data:vw.map(r=>r.views),backgroundColor:['rgba(244,63,94,.5)','rgba(244,63,94,.5)','#f43f5e'],borderRadius:4,maxBarThickness:40}
      ]
    },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` Views: ${(c.raw/1000000).toFixed(2)}M`}}},
      scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>(v/1000000).toFixed(1)+'M'},beginAtZero:true}}}});
  });

  // TikTok ads table
  document.getElementById('ttAdsTbl').innerHTML=D.tiktok.ads.map(r=>{
    const rc=r.roi>=4.5?'roi-good':r.roi>=3.5?'roi-warn':'roi-bad';
    return `<tr>
      <td>${r.m} ${r.m==='Oct'||r.m==='Nov'||r.m==='Dec'?'2025':'2026'}</td>
      <td>${RM(r.spend)}</td><td>${Num(r.o)}</td><td>${RM(r.gmv)}</td>
      <td class="${rc}">${r.roi}x</td>
      <td>RM${r.cpo.toFixed(2)}</td>
    </tr>`;
  }).join('');
}

