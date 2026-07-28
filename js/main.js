/* ─── INIT ─── */
window.addEventListener('DOMContentLoaded',()=>{
  // Restore API key UI
  if(GS.apiKey){
    const inp=document.getElementById('apiKeyInp');
    if(inp) inp.value=GS.apiKey;
    const tag=document.getElementById('apiKeyTag');
    if(tag){tag.textContent='✓ Saved';tag.style.cssText='background:var(--green-d);color:var(--green)';}
  }
  // Restore platform folder URL inputs
  Object.keys(PLAT_S).forEach(p=>{
    const k=p.replace(/-/g,'');
    const inp=document.getElementById(`pLink_${k}`);
    if(inp&&PLAT_S[p].url) inp.value=PLAT_S[p].url;
  });
  // Step 1: Restore cached data immediately — dashboard is usable right away
  let anyCache=false;
  Object.keys(PLAT_S).forEach(p=>{
    if(PLAT_S[p].url&&restoreCache(p)) anyCache=true;
  });
  setSyncStatus();
  renderKPIs();
  showPanel('overview');
  // Step 2: Background re-sync to get fresh data (runs after render so UI is already visible)
  if(GS.apiKey){
    setTimeout(()=>{
      Object.keys(PLAT_S).forEach(async p=>{
        if(PLAT_S[p].url){
          const parsed=parseDriveLink(PLAT_S[p].url);
          if(parsed&&parsed.type==='folder'){
            if(anyCache) setPlatformStatus(p,'fetching','Refreshing…');
            await loadPlatformFolder(p,parsed.id,'My Drive');
          }
        }
      });
    },anyCache?2000:0); // If cache was restored, wait 2s so UI renders first; otherwise sync immediately
  }
});
