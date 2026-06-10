// Vercel serverless proxy — fetches Drive files server-side, bypassing browser
// Referer restrictions. Adds the allowed Referer so Google API key accepts it.
module.exports = async (req, res) => {
  const { fileId, apiKey } = req.query;
  if (!fileId || !apiKey) {
    return res.status(400).json({ error: 'Missing fileId or apiKey' });
  }

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}&acknowledgeAbuse=true&supportsAllDrives=true`;

  try {
    const r = await fetch(url, {
      headers: {
        // Provide a matching Referer so the API key HTTP-referrer restriction passes
        'Referer': 'https://store-analysis-five.vercel.app/',
        'Origin': 'https://store-analysis-five.vercel.app',
      },
    });

    if (!r.ok) {
      let errMsg = `HTTP ${r.status}`;
      try { const j = await r.json(); errMsg = j.error?.message || j.error || errMsg; } catch {}
      return res.status(r.status).json({ error: errMsg });
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(buf);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
