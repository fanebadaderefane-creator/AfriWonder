/**
 * Proxy API vers Railway - évite CORS (les rewrites Vercel ne s'appliquent pas correctement)
 * Gère /api/auth/login, /api/xxx, etc.
 */
const BACKEND = 'https://afriwonder-production.up.railway.app';

export default async function handler(req, res) {
  const path = req.query.path;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');
  const targetUrl = `${BACKEND}/api/${pathStr}${req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;

  try {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (k.toLowerCase() !== 'host' && v) headers[k] = v;
    }

    const opts = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const body = req.body;
      if (body != null && body !== '') {
        opts.body = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
      }
    }

    const resp = await fetch(targetUrl, opts);
    const text = await resp.text();
    res.status(resp.status);
    resp.headers.forEach((v, k) => res.setHeader(k, v));
    res.send(text);
  } catch (err) {
    console.error('API proxy error:', err);
    res.status(502).json({ error: 'Proxy failed', message: err?.message });
  }
}
