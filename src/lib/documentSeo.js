import { getSeoForPageKey, DEFAULT_DESCRIPTION } from '@/lib/pageSeo';
import {
  applyPageMetaTags,
  getSiteOrigin,
  upsertCanonical,
  upsertJsonLdScript,
  removeJsonLdScript,
} from '@/lib/seoUtils';

/** Pages dont le détail SEO vient des données API (titre réel, image, etc.). */
const DYNAMIC_DETAIL_SEO = new Set(['ArticleDetails', 'Product']);

function syncOrganizationJsonLd() {
  const origin = getSiteOrigin();
  upsertJsonLdScript('afriwonder-spa-organization', {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'AfriWonder',
        url: `${origin}/`,
        logo: `${origin}/icon-512.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'AfriWonder',
        url: `${origin}/`,
        publisher: { '@id': `${origin}/#organization` },
        inLanguage: 'fr',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/Search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  });
}

/**
 * Synchronise title / meta / canonical / JSON-LD WebPage selon la route SPA.
 */
export function syncDocumentSeoFromRoute({ pageKey, pathname, search }) {
  if (typeof document === 'undefined') return;

  const origin = getSiteOrigin();
  const url = `${origin}${pathname || ''}${search || ''}`;
  syncOrganizationJsonLd();

  if (!pageKey) {
    applyPageMetaTags({
      title: 'AfriWonder — Super App Africaine',
      description: DEFAULT_DESCRIPTION,
      url,
    });
    return;
  }

  if (DYNAMIC_DETAIL_SEO.has(pageKey)) {
    document.title = pageKey === 'Product' ? 'Produit | AfriWonder' : 'Article | AfriWonder';
    upsertCanonical(url);
    removeJsonLdScript('afriwonder-spa-webpage');
    return;
  }

  const { title, description } = getSeoForPageKey(pageKey);
  applyPageMetaTags({
    title,
    description,
    url,
    ogType: 'website',
    image: `${origin}/icon-512.png`,
  });
}
