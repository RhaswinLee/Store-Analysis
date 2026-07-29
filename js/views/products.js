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
  const useProds=allProds.length?allProds:D.products;

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
    renderProductCharts();
    return;
  }

  // Determine if using live data or demo data
  const isLive=allProds.length>0;

  // Update header
  const hdrEl=document.getElementById('prodTblHdr');
  if(hdrEl) hdrEl.innerHTML=`<th>Product</th><th style="text-align:right">GMV</th><th style="text-align:right">Orders</th><th style="text-align:right">Clicks</th><th style="text-align:right">Impressions</th><th style="text-align:right">CTR</th><th style="text-align:right">CVR</th>`;

  if(isLive){
    // Live data from Drive: show clean GMV table
    tblEl.innerHTML=useProds.map((p,i)=>`
      <tr>
        <td><span style="color:var(--t3);font-size:11px;margin-right:6px">#${i+1}</span>${p.name||p.sku||'Unknown'}</td>
        <td style="text-align:right;font-weight:600">${RMf(p.gmv||p.sales||0)}</td>
        <td style="text-align:right">${Numf(p.orders)}</td>
        <td style="text-align:right">${Numf(p.clicks)}</td>
        <td style="text-align:right">${Numf(p.impressions)}</td>
        <td style="text-align:right">${Pctf(p.ctr)}</td>
        <td style="text-align:right">${Pctf(p.cr)}</td>
      </tr>`).join('');
  } else {
    // Demo data: show diagnostics table (legacy format)
    tblEl.innerHTML=useProds.map(p=>{
      const hasBounce=p.bounce&&p.bounce>18;
      let badge='', diag='';
      if(hasBounce && p.bounce>21){badge=`<span class="alert alert-r">⚠ High Bounce ${p.bounce}%</span>`;diag='Checkout resistance — add Free Gift incentive';}
      else if(hasBounce){badge=`<span class="alert alert-a">⚠ Bounce ${p.bounce}%</span>`;diag='Reduce bounce rate below 18%';}
      else if(p.status==='high'){badge=`<span class="alert alert-g">✓ Top Performer</span>`;diag=p.note||'';}
      else if(p.status==='lead'){badge=`<span class="alert alert-a">📢 Lead Gen</span>`;diag=p.note||'';}
      else{badge=`<span class="alert" style="background:var(--indigo-d);color:var(--indigo)">⟳ Monitor</span>`;diag=p.note||'';}
      const crProg=p.cr?`<div class="miniprog"><div class="minifill" style="width:${Math.min(p.cr*4,100)}%;background:${p.cr>=18?'#3fb950':p.cr>=13?'#d29922':'#f85149'}"></div></div>`:''
      return `<tr>
        <td><div class="prod-cell"><span class="prod-em">${p.em||'📦'}</span><div><div class="prod-name">${p.name}</div><div class="prod-sku">${p.sku||''}</div></div></div></td>
        <td style="font-size:10px">${p.ch||''}</td>
        <td style="font-weight:700;color:var(--t1)">${RMk(p.sales||p.gmv||0)}</td>
        <td>${p.cr?`${p.cr}% ${crProg}`:'—'}</td>
        <td style="color:${p.atc&&p.atc>4000?'#d29922':''};font-weight:${p.atc&&p.atc>4000?700:400}">${p.atc?Num(p.atc):'—'}</td>
        <td style="font-size:10px">${p.views?Num(p.views):'—'}</td>
        <td style="color:${p.bounce&&p.bounce>20?'var(--red)':p.bounce?'var(--amber)':''}">${p.bounce?p.bounce+'%':'—'}</td>
        <td>${badge}</td>
        <td style="font-size:10px;color:var(--t3)">${diag}</td>
      </tr>`;
    }).join('');
  }

  renderProductCharts();
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

function renderProductCharts(){

  // ATC chart — atc is only present on demo-mode products; live Drive product exports don't carry it.
  const atcProds=D.products.filter(p=>p.atc).sort((a,b)=>b.atc-a.atc);
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
      scales:{x:{grid:{color:'#e2e8f0'},border:{display:false},ticks:{font:{size:10}}},y:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}}}}});
  });

  // Buyer revenue chart — new/existing buyer split isn't extracted by the current sync pipeline.
  const byers=D.shopee.buyers;
  _chartOrEmpty('buyerRevChart',byers.length>0,'No new-vs-existing buyer data in the connected source files',()=>{
    mkChart('buyerRevChart',{type:'bar',data:{
      labels:byers.map(b=>b.m+' 2026'),
      datasets:[
        {label:'New Buyers',data:byers.map(b=>b.ns),backgroundColor:'rgba(249,115,22,.7)',borderRadius:3,maxBarThickness:36},
        {label:'Existing Buyers',data:byers.map(b=>b.es),backgroundColor:'rgba(99,102,241,.7)',borderRadius:3,maxBarThickness:36},
      ]
    },options:{responsive:true,plugins:{legend:{display:false},tooltip:{...cTooltip,callbacks:{label:c=>` ${c.dataset.label}: ${RMk(c.raw)}`}}},
      scales:{x:{grid:{display:false},border:{display:false},stacked:true,ticks:{font:{size:11}}},y:{grid:{color:'#e2e8f0'},border:{display:false},stacked:true,ticks:{font:{size:10},callback:v=>RMk(v)}}}}});
  });
}

