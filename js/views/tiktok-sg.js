/* ─── TIKTOK SG ─── */
let _ttSgDrillMonth=null;
let _ttSgLastGrainSig=null;
window.ttSgBackToMonths = function(){ _ttSgDrillMonth=null; renderTikTokSG(); return false; };

function renderTikTokSG(){
  const grainSig=JSON.stringify([S.grain,S.selectedMonth,S.selectedDate,S.customStart,S.customEnd,S.selectedCampaignMonth,S.selectedCampaignYear]);
  if(_ttSgLastGrainSig!==null&&_ttSgLastGrainSig!==grainSig) _ttSgDrillMonth=null;
  _ttSgLastGrainSig=grainSig;

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
    {l:'Total GMV',v:SGD(d.reduce((a,r)=>a+r.s,0)),ch:`${d.length} month${d.length>1?'s':''}`,dir:'up',sub:d.map(r=>r.m).join('–')+' 2026',ico:'<span class="material-symbols-outlined">music_note</span>'},
    {l:last.m+' GMV',...momS,v:SGD(last.s),sub:prev?'vs '+SGD(prev.s)+' prev':'First month',ico:'<span class="material-symbols-outlined">trending_up</span>'},
    {l:last.m+' Orders',...momO,v:last.o.toLocaleString(),sub:'Confirmed orders',ico:'<span class="material-symbols-outlined">package</span>'},
    {l:'Conv. Rate ('+last.m+')',v:last.cr+'%',ch:'Latest month',dir:'up',sub:'Buyer conversion',ico:'<span class="material-symbols-outlined">bolt</span>'},
    {l:(lastAff?lastAff.m:last.m)+' Affiliate GMV',v:lastAff?SGD(lastAff.gmv):'—',ch:lastAff?lastAff.creators+' creators':'No affiliate data',dir:'up',sub:'Creator network',ico:'<span class="material-symbols-outlined">handshake</span>'},
  ].map(k=>`
    <div class="kpi">
      <div class="kpi-ico">${k.ico}</div>
      <div class="kpi-label">${k.l}</div>
      <div class="kpi-val">${k.v}</div>
      <span class="chip ${k.dir}">${k.ch}</span>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');

  const labs=d.map(r=>r.m+' 2026');

  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let chartRows, isDailyChart=false;
  if(_ttSgDrillMonth&&(D.tiktokSG.daily||[]).length){
    chartRows=(D.tiktokSG.daily||[]).filter(r=>r.y===_ttSgDrillMonth.year&&r.m===mNames[_ttSgDrillMonth.month-1]);
    isDailyChart=chartRows.length>0;
  }
  if(!isDailyChart) chartRows=d;

  const chartLabs=isDailyChart
    ? chartRows.map(r=>r.date.slice(8)+' '+r.m)
    : labs;

  mkChart('tiktokSgRevChart',{type:'bar',data:{
    labels:chartLabs,
    datasets:[{label:'GMV (SGD)',data:chartRows.map(r=>r.s),backgroundColor:chartRows.map((_,i)=>i===chartRows.length-1&&!isDailyChart?'#e11d48':'rgba(225,29,72,.4)'),borderRadius:5,maxBarThickness:isDailyChart?12:52}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` GMV: ${SGDexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:isDailyChart?8:11},maxRotation:isDailyChart?45:0}},
      y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>SGD(v)},beginAtZero:true}},
    onClick:(evt,els)=>{
      if(isDailyChart || !els.length) return;
      const p=chartRows[els[0].index];
      if(p){
        _ttSgDrillMonth={year:2026,month:mNames.indexOf(p.m)+1}; // Only 2026 for now
        renderTikTokSG();
      }
    }
  }});

  const subEl = document.getElementById('tiktokSgRevSub');
  if(subEl) {
    if(_ttSgDrillMonth) subEl.innerHTML = `Daily breakdown for ${mNames[_ttSgDrillMonth.month-1]} ${_ttSgDrillMonth.year} · <a href="#" onclick="return ttSgBackToMonths()" style="color:var(--t2);text-decoration:underline;cursor:pointer">← Back to months</a>`;
    else subEl.innerHTML = 'Jan–Mar 2026 · SGD';
  }

  const bk=D.tiktokSG.breakdown;
  mkChart('tiktokSgBreakChart',{type:'bar',data:{
    labels:bk.map(r=>r.m+' 2026'),
    datasets:[
      {label:'Product',data:bk.map(r=>r.prod),backgroundColor:'#6366f1',borderRadius:3,maxBarThickness:28},
      {label:'Video',data:bk.map(r=>r.vid),backgroundColor:'#f43f5e',borderRadius:3,maxBarThickness:28},
      {label:'Live',data:bk.map(r=>r.live),backgroundColor:'#f97316',borderRadius:3,maxBarThickness:28},
    ]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${SGDexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>SGD(v)},beginAtZero:true}}}});

  mkChart('tiktokSgCrChart',{type:'line',data:{labels:labs,
    datasets:[{label:'CR%',data:d.map(r=>r.cr),borderColor:'#e11d48',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#e11d48',tension:.4,fill:true,backgroundColor:'rgba(225,29,72,.08)'}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` CR: ${c.raw}%`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>v+'%'},beginAtZero:true}}}});

  mkChart('tiktokSgAovChart',{type:'line',data:{labels:labs,
    datasets:[{label:'AOV (SGD)',data:d.map(r=>r.b),borderColor:'#6366f1',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#6366f1',tension:.4}]
  },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` AOV: ${SGDexact(c.raw)}`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10},callback:v=>'SGD '+v},beginAtZero:true}}}});

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
    scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10}},beginAtZero:true}}}});

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

