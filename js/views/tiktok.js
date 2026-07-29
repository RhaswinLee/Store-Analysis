/* ─── TIKTOK CHARTS ─── */
function renderTikTok(){
  const all=[...D.tiktok.m2025,...D.tiktok.m2026];
  mkChart('ttRevChart',{type:'line',data:{
    labels:all.map(r=>r.m),
    datasets:[{
      label:'TikTok GMV',data:all.map(r=>r.s),
      borderColor:'#f43f5e',borderWidth:2.5,
      fill:true,backgroundColor:'rgba(244,63,94,.08)',
      pointRadius:3,pointBackgroundColor:'#f43f5e',tension:.4
    }]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` GMV: ${RMk(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:9}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)}}}}});

  // Breakdown grouped bar
  const bk=D.tiktok.breakdown;
  mkChart('ttBreakChart',{type:'bar',data:{
    labels:bk.map(r=>r.m+' 2026'),
    datasets:[
      {label:'Product',data:bk.map(r=>r.prod),backgroundColor:'#6366f1',borderRadius:3,maxBarThickness:28},
      {label:'Video',data:bk.map(r=>r.vid),backgroundColor:'#f43f5e',borderRadius:3,maxBarThickness:28},
      {label:'Live',data:bk.map(r=>r.live),backgroundColor:'#f97316',borderRadius:3,maxBarThickness:28},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMk(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)}}}}});

  // Ads ROI
  mkChart('ttAdsChart',{type:'line',data:{
    labels:D.tiktok.ads.map(r=>r.m+' '+(r.m==='Oct'||r.m==='Nov'||r.m==='Dec'?'25':'26')),
    datasets:[{
      label:'ROI',data:D.tiktok.ads.map(r=>r.roi),
      borderColor:'#f43f5e',borderWidth:2.5,pointRadius:4,pointBackgroundColor:D.tiktok.ads.map(r=>r.roi>=4?'#3fb950':'#f85149'),tension:.4,
    }]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ROI: ${c.raw}x`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:9}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v+'x'}}}}});

  // Affiliate
  const aff=D.tiktok.affiliate;
  mkChart('ttAffChart',{type:'bar',data:{
    labels:aff.map(r=>r.m),
    datasets:[{label:'Affiliate GMV',data:aff.map(r=>r.gmv),backgroundColor:aff.map((r,i)=>i===4?'#f43f5e':'rgba(244,63,94,.4)'),borderRadius:4,maxBarThickness:36}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` GMV: ${RMk(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>RMk(v)}}}}});

  // Video views — not extracted by the current sync pipeline (no source sheet wired for it yet)
  const vw=D.tiktok.views;
  _chartOrEmpty('ttViewChart',vw.length>0,'No video-view data in the connected source files',()=>{
    mkChart('ttViewChart',{type:'bar',data:{
      labels:vw.map(r=>r.m),
      datasets:[
        {label:'Video Views',data:vw.map(r=>r.views),backgroundColor:['rgba(244,63,94,.5)','rgba(244,63,94,.5)','#f43f5e'],borderRadius:4,maxBarThickness:40}
      ]
    },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` Views: ${(c.raw/1000000).toFixed(2)}M`}}},
      scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>(v/1000000).toFixed(1)+'M'}}}}});
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

