importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

self.onmessage = function(e) {
  const { id, ab } = e.data;
  try {
    // This is the CPU-heavy operation that freezes the main thread.
    // Running it here in the worker keeps the UI smooth!
    const wb = XLSX.read(ab, { type: 'array' });
    
    const result = {
      sheetNames: wb.SheetNames,
      sheets: {}
    };
    
    // Parse all sheets into 2D arrays
    for (const sn of wb.SheetNames) {
      result.sheets[sn] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' });
    }
    
    self.postMessage({ id, success: true, data: result });
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};
