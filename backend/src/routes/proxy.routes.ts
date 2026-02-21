import { Router, Request, Response as ExpressResponse } from 'express';
import { Readable } from 'stream';

const router = Router();

const ALLOWED_VIDEO_HOSTS = [
  'cdn.africonnect.com',
  'cdn.afriwonder.com',
  'africonnect.com',
  'afriwonder.com',
  'localhost',
  'r2.dev',
  'cloudflarestorage.com',
  'supabase.co',
  'supabase.in',
  'amazonaws.com',
];

function isAllowedVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const ok = ALLOWED_VIDEO_HOSTS.some((h) => host === h || host.endsWith('.' + h));
    return ok && (u.protocol === 'https:' || u.protocol === 'http:');
  } catch {
    return false;
  }
}

/**
 * GET /api/proxy/media?url=...
 * Proxie une vidéo en STREAM depuis le CDN (Range + 206).
 * Headers Content-Range, Accept-Ranges, Content-Length requis pour Firefox et Chrome/mobile.
 */
router.get('/media', async (req: Request, res: ExpressResponse) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) return res.status(400).json({ error: 'URL requise' });

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(rawUrl);
  } catch {
    return res.status(400).json({ error: 'URL invalide' });
  }

  if (!isAllowedVideoUrl(targetUrl)) {
    return res.status(403).json({ error: 'URL non autorisée' });
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Proxy media called:', targetUrl);
  }

  try {
    const headers: Record<string, string> = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range as string;
    }

    const response = await fetch(targetUrl, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 206) {
      return res.status(response.status).json({
        error: `CDN error ${response.status}`,
      });
    }

    // Status exact (200 ou 206)
    res.status(response.status);

    // Headers critiques (Firefox exige Content-Range, Content-Length, Accept-Ranges)
    const importantHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
    ];
    importantHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

    const stream = response.body;
    if (!stream) {
      return res.status(500).end();
    }

    const nodeStream = Readable.fromWeb(stream as any);
    nodeStream.pipe(res);
  } catch (err) {
    console.error('Proxy media error:', err);
    res.status(502).json({ error: 'Impossible de récupérer la vidéo' });
  }
});

export default router;
