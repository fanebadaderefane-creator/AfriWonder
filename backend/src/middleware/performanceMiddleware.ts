import type { Express, Request, Response, NextFunction } from 'express';

function feedCacheHeader(_req: Request, res: Response, next: NextFunction) {
  // Réseau instable: autorise un cache court côté client/CDN pour lisser les pics.
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  next();
}

/** GET /api/videos (liste abonnements / grille) — private car JWT + contenu par utilisateur. */
function videosRootListCacheHeader(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') return next();
  const p = req.path || '';
  if (p === '/api/videos' || p === '/api/videos/') {
    res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
  }
  next();
}

export function applyPerformanceMiddleware(app: Express) {
  app.use('/api/feed', feedCacheHeader);
  app.use('/api/videos/feed', feedCacheHeader);
  app.use(videosRootListCacheHeader);
}
