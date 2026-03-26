import { Router, Request, Response as ExpressResponse } from 'express';
import { Readable } from 'stream';

const router = Router();

const ALLOWED_VIDEO_HOSTS = [
  'cdn.africonnect.com',
  'cdn.afriwonder.com',
  'africonnect.com',
  'afriwonder.com',
  'localhost',
  /** Lectures dev : URLs stockées en 127.0.0.1 / ::1 alors que le navigateur est sur localhost (ou l’inverse). */
  '127.0.0.1',
  '::1',
  'r2.dev',
  'cloudflarestorage.com',
  'supabase.co',
  'supabase.in',
  'amazonaws.com',
  'cloudfront.net',
  /** Ex. démo / seeds : commondatastorage.googleapis.com */
  'googleapis.com',
  /** Liens directs / aperçus Drive et fichiers utilisateur Google */
  'drive.google.com',
  'docs.google.com',
  'googleusercontent.com',
];

/** Domaines CDN additionnels (ex. sous-domaine R2 custom), CSV sans schéma : media.afriwonder.com,cdn.example.com */
const EXTRA_PROXY_MEDIA_HOSTS = (process.env.PROXY_MEDIA_EXTRA_HOSTS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function normalizeHostname(host: string): string {
  return host.replace(/^\[|\]$/g, '').toLowerCase();
}

function isLoopbackHost(host: string): boolean {
  const h = normalizeHostname(host);
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

function isAllowedVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const ok =
      ALLOWED_VIDEO_HOSTS.some((h) => host === h || host.endsWith('.' + h)) ||
      EXTRA_PROXY_MEDIA_HOSTS.some((h) => host === h || host.endsWith('.' + h));
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

  try {
    const targetHost = new URL(targetUrl).hostname;
    const requestHost = (req.get('host') || '').split(':')[0];
    const t = normalizeHostname(targetHost);
    const r = normalizeHostname(requestHost);
    const sameHost = r && t === r;
    const bothLoopback = r && isLoopbackHost(targetHost) && isLoopbackHost(requestHost);
    if (!sameHost && !bothLoopback && !isAllowedVideoUrl(targetUrl)) {
      return res.status(403).json({ error: 'URL non autorisée' });
    }
  } catch {
    return res.status(400).json({ error: 'URL invalide' });
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
    const passthroughHeaders = ['content-length', 'content-range', 'accept-ranges'];
    passthroughHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    });

    let contentType = response.headers.get('content-type');
    const ctLow = (contentType || '').toLowerCase();
    const badCt = !ctLow || ctLow.includes('octet-stream') || ctLow === 'binary/octet-stream';
    const looksMp4Path = /\.(mp4|m4v)(\?|#|$)/i.test(targetUrl);
    /** Clés R2 souvent sans extension dans l’URL ; Firefox refuse si le bucket renvoie octet-stream. */
    const cdnVideoKey =
      badCt && /\/videos\//i.test(new URL(targetUrl).pathname || '');
    if (badCt && (looksMp4Path || cdnVideoKey)) {
      contentType = 'video/mp4';
    }
    if (contentType?.trim()) {
      res.setHeader('content-type', contentType.trim());
    }

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
