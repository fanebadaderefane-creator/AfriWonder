import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config.glob';
import { syncDocumentSeoFromRoute } from '@/lib/documentSeo';

function matchPageKey(pathname, pageKeys) {
  const pathSegment = pathname.replace(/^\//, '').split('/')[0];
  if (!pathSegment) return null;
  if (pathSegment.toLowerCase() === 'verify-certificate') {
    return pageKeys.includes('VerifyCertificate') ? 'VerifyCertificate' : null;
  }
  return pageKeys.find((key) => key.toLowerCase() === pathSegment.toLowerCase()) || null;
}

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { Pages, mainPage } = pagesConfig;
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];

  useEffect(() => {
    const pageKeys = Object.keys(Pages);
    const pathname = location.pathname;
    const search = location.search || '';
    let pageName = null;

    if (!isAuthenticated) {
      if (pathname === '/' || pathname === '' || pathname === '/Landing') {
        pageName = 'Landing';
      } else {
        pageName = matchPageKey(pathname, pageKeys);
      }
    } else if (pathname === '/' || pathname === '') {
      pageName = mainPageKey;
    } else {
      pageName = matchPageKey(pathname, pageKeys);
    }

    syncDocumentSeoFromRoute({ pageKey: pageName, pathname, search });

    if (isAuthenticated && pageName) {
      // TODO: Implement navigation tracking in backend
    }
  }, [location.pathname, location.search, isAuthenticated, Pages, mainPageKey]);

  // Hors fil d’accueil : couper tout lecteur marqué feed (évite son en arrière-plan si le DOM garde un <video> un instant).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const pathname = location.pathname || '';
    const onMainFeed =
      pathname === '/' ||
      pathname === '' ||
      (mainPageKey === 'Home' && /^\/Home\/?$/i.test(pathname));

    if (onMainFeed) return;

    document.querySelectorAll('video[data-afw-feed-video="1"]').forEach((node) => {
      try {
        node.pause();
        node.muted = true;
        node.defaultMuted = true;
        try {
          node.volume = 0;
        } catch (_) {
          /* volume lecture seule sur certains navigateurs */
        }
      } catch (_) {
        /* ignore */
      }
    });
  }, [location.pathname, mainPageKey]);

  return null;
}
