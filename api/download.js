// Vercel serverless proxy — bypasses CORS for Google Drive file downloads.
// Browser calls /api/download?fileId=X&apiKey=Y; this function fetches from
// googleapis.com server-side (no CORS restriction) and streams the response back.
module.exports = async (req, res) => {
  const { fileId, apiKey } = req.query;
  if (!fileId || !apiKey) {
    return res.status(400).json({ error: 'Missing fileId or apiKey' });
  }

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}&acknowledgeAbuse=true&supportsAllDrives=true`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      let errMsg = `HTTP ${r.status}`;
      try { const j = await r.json(); errMsg = j.error?.message || errMsg; } catch {}
      return res.status(r.status).json({ error: errMsg });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buf.length);
    return res.send(buf);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
