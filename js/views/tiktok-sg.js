/* ─── TIKTOK SG ─── */
function renderTikTokSG(){
  const d=D.tiktokSG.m2026;
  if(!d||d.length<1){
    const el=document.getElementById('tiktokSgKpi');
    if(el) el.innerHTML='<div class="kpi" style="grid-column:1/-1"><div class="kpi-label">No Data</div><div class="kpi-val" style="font-size:13px;color:var(--t3)">Connect TikTok SG folder to load data</div></div>';
    return;
  }
  const SGD=v=>'SGD '+(v>=1000?(v/1000).toFixed(1)+'k':Math.round(v).toLocaleString());
  const last=d[d.length-1], prev=d.length>1?d[d.length-2]:null;
  const aff=D.tiktokSG.affiliate||[], lastAff=aff.length?aff[aff.length-1]:null;
  const momS=momChip(last.s,prev?prev.s:null,false);
  const momO=momChip(last.o,prev?prev.o:null,false);
  const badge=document.getElementById('tiktokSgMomBadge');
  if(badge) badge.textContent=momS.ch==='—'?'':momS.ch;
  const el=document.getElementById('tiktokSgKpi');
  if(el) el.innerHTML=[
    {l:'Total GMV',v:SGD(d.reduce((a,r)=>a+r.s,0)),ch:`${d.length} month${d.length>1?'s':''}`,dir:'up',sub:d.map(r=>r.m).join('–')+' 2026',ico:'🎵'},
    {l:last.m+' GMV',...momS,v:SGD(last.s),sub:prev?'vs '+SGD(prev.s)+' prev':'First month',ico:'📈'},
    {l:last.m+' Orders',...momO,v:last.o.toLocaleString(),sub:'Confirmed orders',ico:'📦'},
    {l:'Conv. Rate ('+last.m+')',v:last.cr+'%',ch:'Latest month',dir:'up',sub:'Buyer conversion',ico:'⚡'},
    {l:(lastAff?lastAff.m:last.m)+' Affiliate GMV',v:lastAff?SGD(lastAff.gmv):'—',ch:lastAff?lastAff.creators+' creators':'No affiliate data',dir:'up',sub:'Creator network',ico:'🤝'},
  ].map(k=>`
    <div class="kpi">
      <div class="kpi-ico">${k.ico}</div>
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-val">${k.v}</div>
      <span class="chip ${k.dir}">${k.ch}</span>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  const labs=d.map(r=>r.m+' 2026');
  mkChart('tiktokSgRevChart',{type:'bar',data:{
    labels:labs,
    datasets:[{label:'GMV (SGD)',data:d.map(r=>r.s),backgroundColor:d.map((_,i)=>i===d.length-1?'#e11d48':'rgba(225,29,72,.4)'),borderRadius:5,maxBarThickness:52}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` GMV: SGD ${c.raw.toLocaleString()}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>SGD(v)}}}}});

  const bk=D.tiktokSG.breakdown;
  mkChart('tiktokSgBreakChart',{type:'bar',data:{
    labels:bk.map(r=>r.m+' 2026'),
    datasets:[
      {label:'Product',data:bk.map(r=>r.prod),backgroundColor:'#6366f1',borderRadius:3,maxBarThickness:28},
      {label:'Video',data:bk.map(r=>r.vid),backgroundColor:'#f43f5e',borderRadius:3,maxBarThickness:28},
      {label:'Live',data:bk.map(r=>r.live),backgroundColor:'#f97316',borderRadius:3,maxBarThickness:28},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: SGD ${c.raw.toLocaleString()}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>SGD(v)}}}}});

  mkChart('tiktokSgCrChart',{type:'line',data:{labels:labs,
    datasets:[{label:'CR%',data:d.map(r=>r.cr),borderColor:'#e11d48',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#e11d48',tension:.4,fill:true,backgroundColor:'rgba(225,29,72,.08)'}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` CR: ${c.raw}%`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v+'%'}}}}});

  mkChart('tiktokSgAovChart',{type:'line',data:{labels:labs,
    datasets:[{label:'AOV (SGD)',data:d.map(r=>r.b),borderColor:'#6366f1',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#6366f1',tension:.4}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` AOV: SGD ${c.raw}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>'SGD '+v}}}}});

  // MY vs SG index
  const myData=D.tiktok.m2026;
  mkChart('tiktokSgCompChart',{type:'bar',data:{
    labels:labs,
    datasets:[
      {label:'MY (index 100)',data:myData.map(()=>100),backgroundColor:'rgba(225,29,72,.2)',borderRadius:3,maxBarThickness:28},
      {label:'SG index',data:d.map((r,i)=>myData[i]?+(r.s/myData[i].s*100).toFixed(1):0),backgroundColor:'rgba(99,102,241,.65)',borderRadius:3,maxBarThickness:28},
    ]
  },options:{responsive:true,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10}}}}}});

  document.getElementById('tiktokSgAdsTbl').innerHTML=d.map(r=>`<tr>
    <td>${r.m} 2026</td>
    <td style="font-weight:700;color:var(--t1)">SGD ${r.s.toLocaleString()}</td>
    <td>SGD ${r.spend.toLocaleString()}</td>
    <td class="${r.roi>=4.5?'roi-good':'roi-warn'}">${r.roi}x</td>
    <td>${r.o}</td>
    <td>SGD ${r.aff.toLocaleString()}</td>
    <td>${r.creators}</td>
  </tr>`).join('');
}

