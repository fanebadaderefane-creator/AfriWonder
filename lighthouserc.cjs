/**
 * Lighthouse CI — mobile-first (PWA). build + preview puis : npm run lhci
 * Desktop : LHCI_DESKTOP=1 npm run lhci
 */
const baseRaw =
  process.env.LHCI_BUILD_URL?.replace(/\/$/, '') || 'http://localhost:4173';

// Lighthouse détecte une redirection `afriwonder.com -> www.afriwonder.com` et peut
// faire échouer certains gatherers. On force donc la version "www" pour réduire
// les redirections.
const base = baseRaw
  .replace(/^https?:\/\/afriwonder\.com\b/i, (m) => m.replace('afriwonder.com', 'www.afriwonder.com'));

const paths = [
  '/',
  '/Landing',
  '/News',
  '/Discover',
  '/Marketplace',
  '/FAQ',
  '/Help',
  '/About',
  '/blog',
  '/articles',
  '/dashboard',
  '/features',
  '/Search',
  '/ArticleDetails',
];

const urls = paths.map((p) => `${base}${p}`);

const isDesktop = process.env.LHCI_DESKTOP === '1' || process.env.LHCI_DESKTOP === 'true';

module.exports = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: 1,
      settings: isDesktop
        ? {
            formFactor: 'desktop',
            screenEmulation: {
              mobile: false,
              width: 1350,
              height: 940,
              deviceScaleFactor: 1,
              disabled: false,
            },
            chromeFlags: ['--disable-gpu', '--no-sandbox', '--disable-crash-reporter', '--disable-breakpad'],
          }
        : {
            formFactor: 'mobile',
            screenEmulation: {
              mobile: true,
              width: 412,
              height: 823,
              deviceScaleFactor: 1.75,
              disabled: false,
            },
            chromeFlags: ['--disable-gpu', '--no-sandbox', '--disable-crash-reporter', '--disable-breakpad'],
          },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.55 }],
        'categories:accessibility': ['warn', { minScore: 0.88 }],
        'categories:seo': ['warn', { minScore: 0.88 }],
        'categories:best-practices': ['warn', { minScore: 0.92 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
