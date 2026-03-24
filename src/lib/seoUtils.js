/**
 * Utilitaires SEO partagés (meta, canonical, JSON-LD) pour la SPA.
 */

const SITE_ORIGIN = 'https://afriwonder.com';

export function getSiteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return SITE_ORIGIN;
}

/** Met à jour ou crée une balise meta (name ou property). */
export function upsertMeta(attr, key, content) {
  if (typeof document === 'undefined' || content == null || content === '') return;
  const safeKey = String(key).replace(/"/g, '\\"');
  let el = document.querySelector(`meta[${attr}="${safeKey}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Lien canonical unique. */
export function upsertCanonical(href) {
  if (typeof document === 'undefined' || !href) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/** JSON-LD injecté côté client (complète le bloc statique index.html). */
export function upsertJsonLdScript(id, data) {
  if (typeof document === 'undefined' || !data) return;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLdScript(id) {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.remove();
}

/** Applique title + description + OG/Twitter de base + WebPage JSON-LD. */
export function applyPageMetaTags({
  title,
  description,
  url,
  ogType = 'website',
  image,
}) {
  if (typeof document === 'undefined') return;
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:type', ogType);
  upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  if (image) {
    upsertMeta('property', 'og:image', image);
    upsertMeta('name', 'twitter:image', image);
  }
  upsertCanonical(url);

  upsertJsonLdScript('afriwonder-spa-webpage', {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'AfriWonder',
      url: getSiteOrigin() + '/',
    },
  });
}
