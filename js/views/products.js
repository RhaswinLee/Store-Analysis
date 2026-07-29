/* ─── PRODUCTS ─── */
function renderProducts(){
  // Collect products from all connected platforms
  const platProds={};
  for(const [plat,dKey] of Object.entries(PLAT_D)){
    const prods=D[dKey]?.products||[];
    if(prods.length) platProds[plat]=prods;
  }
  let allProds=[];
  if (S.platform === 'all') {
    allProds = Object.values(platProds).flat().sort((a,b)=>b.gmv-a.gmv);
  } else {
    allProds = [...(platProds[S.platform] || [])].sort((a,b)=>b.gmv-a.gmv);
  }
  const useProds=allProds;
  const RMf=v=>'RM '+v.toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
  const Numf=v=>v?v.toLocaleString():'—';
  const Pctf=v=>v?v.toFixed(2)+'%':'—';

  const tblEl=document.getElementById('prodTbl');
  if(!tblEl) return;

  if(!useProds.length){
    tblEl.innerHTML='<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--t3)">Connect your platform folders in Data Sync to load product data.</td></tr>';
    // Update header
    const hdrEl=document.getElementById('prodTblHdr');
    if(hdrEl) hdrEl.innerHTML=`<th>Product</th><th style="text-align:right">GMV</th><th style="text-align:right">Orders</th><th style="text-align:right">Clicks</th><th style="text-align:right">Impressions</th><th style="text-align:right">CTR</th><th style="text-align:right">CVR</th>`;
    // Still render the charts below using D.products fallback
    renderProductCharts(useProds);
    return;
  }

  // Update header
  const hdrEl=document.getElementById('prodTblHdr');
  if(hdrEl) hdrEl.innerHTML=`<th>Product</th><th style="text-align:right">GMV</th><th style="text-align:right">Orders</th><th style="text-align:right">Clicks</th><th style="text-align:right">Impressions</th><th style="text-align:right">CTR</th><th style="text-align:right">CVR</th>`;

  // Live data from Drive: show clean GMV table
  tblEl.innerHTML=useProds.map((p,i)=>`
    <tr>
      <td style="font-weight:600;color:var(--t1)"><span style="color:var(--t3);font-size:11px;margin-right:6px">#${i+1}</span>${esc(p.name||p.sku||'Unknown')}</td>
      <td style="text-align:right;font-weight:700">${RMf(p.gmv||p.sales||0)}</td>
      <td style="text-align:right">${Numf(p.orders)}</td>
      <td style="text-align:right">${Numf(p.clicks)}</td>
      <td style="text-align:right">${Numf(p.impressions)}</td>
      <td style="text-align:right">${Pctf(p.ctr)}</td>
      <td style="text-align:right">${Pctf(p.cr)}</td>
    </tr>`).join('');

  renderProductCharts(useProds);
}

// Toggles a canvas vs. a sibling "no data" message, without ever swapping out the canvas
// element itself — so a later render with real data can still find it by id.
function _chartOrEmpty(canvasId,hasData,emptyMsg,draw){
  const canvas=document.getElementById(canvasId);
  if(!canvas) return;
  let msg=canvas.nextElementSibling;
  if(!msg||!msg.classList||!msg.classList.contains('chart-empty-msg')){
    msg=document.createElement('div');
    msg.className='chart-empty-msg';
    msg.style='padding:32px 0;text-align:center;color:var(--t3);font-size:13px';
    canvas.after(msg);
  }
  if(hasData){
    canvas.style.display='';
    msg.style.display='none';
    draw();
  } else {
    if(charts[canvasId]){charts[canvasId].destroy();delete charts[canvasId];}
    canvas.style.display='none';
    msg.textContent=emptyMsg;
    msg.style.display='';
  }
}

function renderProductCharts(useProds){

  // ATC chart — atc is only present on demo-mode products; live Drive product exports don't carry it.
  const atcProds=(useProds||[]).filter(p=>p.atc).sort((a,b)=>b.atc-a.atc);
  _chartOrEmpty('atcChart',atcProds.length>0,'No add-to-cart data in the connected source files',()=>{
    mkChart('atcChart',{type:'bar',data:{
      labels:atcProds.map(p=>p.name.length>20?p.name.substring(0,18)+'…':p.name),
      datasets:[{
        label:'Add to Cart',
        data:atcProds.map(p=>p.atc),
        backgroundColor:atcProds.map(p=>p.bounce&&p.bounce>20?'rgba(248,81,73,.7)':p.bounce?'rgba(210,153,34,.7)':'rgba(63,185,80,.7)'),
        borderRadius:4,maxBarThickness:28,
      }]
    },options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ATC: ${Num(c.raw)}`}}},
      scales:{x:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10}},beginAtZero:true},y:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}}}}});
  });

  // Buyer revenue chart — new/existing buyer split isn't extracted by the current sync pipeline.
  const byers=D.shopee.buyers||[];
  _chartOrEmpty('buyerRevChart',byers.length>0,'No new-vs-existing buyer data in the connected source files',()=>{
    mkChart('buyerRevChart',{type:'bar',data:{
      labels:byers.map(b=>b.m+' 2026'),
      datasets:[
        {label:'New Buyers',data:byers.map(b=>b.ns),backgroundColor:'rgba(249,115,22,.7)',borderRadius:3,maxBarThickness:36},
        {label:'Existing Buyers',data:byers.map(b=>b.es),backgroundColor:'rgba(99,102,241,.7)',borderRadius:3,maxBarThickness:36},
      ]
    },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMexact(c.raw)}`}}},
      scales:{x:{grid:{display:false},border:{display:false},stacked:true,ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},stacked:true,ticks:{font:{size:10},callback:v=>RMk(v)},beginAtZero:true}}}});
  });
}

