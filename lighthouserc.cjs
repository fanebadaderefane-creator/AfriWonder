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

/** Client strict : LHCI_STRICT=1 → les seuils audit p.13-14 font échouer la CI si non atteints. */
const strict = process.env.LHCI_STRICT === '1' || process.env.LHCI_STRICT === 'true';
const level = strict ? 'error' : 'warn';

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
        // Cibles audit page 13 — `LHCI_STRICT=1` : seuils obligatoires (client exigeant)
        'categories:performance': [level, { minScore: 0.9 }],
        'categories:accessibility': [level, { minScore: 0.95 }],
        'categories:seo': [level, { minScore: 0.95 }],
        'categories:best-practices': [level, { minScore: 0.92 }],
        'largest-contentful-paint': [level, { maxNumericValue: 2500 }],
        'cumulative-layout-shift': [level, { maxNumericValue: 0.1 }],
        interactive: [level, { maxNumericValue: 3000 }],
        'server-response-time': [level, { maxNumericValue: 800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
