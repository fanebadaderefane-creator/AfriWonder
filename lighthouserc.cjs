/**
 * Lighthouse CI — mobile-first (PWA). build + preview : npm run lhci
 * Desktop : LHCI_DESKTOP=1 npm run lhci
 * Strict  : LHCI_STRICT=1 npm run lhci  (CI bloquante si < seuil)
 *
 * Cibles : 100/100 Performance · Accessibility · Best Practices · SEO
 */
const baseRaw =
  process.env.LHCI_BUILD_URL?.replace(/\/$/, '') || 'http://localhost:4173';

const base = baseRaw
  .replace(/^https?:\/\/afriwonder\.com\b/i, (m) =>
    m.replace('afriwonder.com', 'www.afriwonder.com')
  );

const paths = [
  '/',
  '/Landing',
  '/News',
  '/Discover',
  '/Marketplace',
  '/FAQ',
  '/Help',
  '/About',
  '/Search',
];

const urls = paths.map((p) => `${base}${p}`);

const isDesktop = process.env.LHCI_DESKTOP === '1' || process.env.LHCI_DESKTOP === 'true';
const strict    = process.env.LHCI_STRICT  === '1' || process.env.LHCI_STRICT  === 'true';
const level     = strict ? 'error' : 'warn';

module.exports = {
  ci: {
    collect: {
      url: urls,
      numberOfRuns: 3,
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
            chromeFlags: ['--disable-gpu', '--no-sandbox', '--disable-crash-reporter'],
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
            chromeFlags: ['--disable-gpu', '--no-sandbox', '--disable-crash-reporter'],
          },
    },
    assert: {
      assertions: {
        // ── Scores globaux (cible 100/100) ─────────────────────────────
        'categories:performance':     [level, { minScore: 0.95 }],
        'categories:accessibility':   [level, { minScore: 1.0  }],
        'categories:seo':             [level, { minScore: 1.0  }],
        'categories:best-practices':  [level, { minScore: 1.0  }],

        // ── Core Web Vitals ───────────────────────────────────────────
        'largest-contentful-paint':   [level, { maxNumericValue: 2500 }],
        'cumulative-layout-shift':    [level, { maxNumericValue: 0.05 }],
        'interactive':                [level, { maxNumericValue: 3000 }],
        'total-blocking-time':        [level, { maxNumericValue: 300  }],
        'first-contentful-paint':     [level, { maxNumericValue: 1800 }],

        // ── Serveur ───────────────────────────────────────────────────
        'server-response-time':       [level, { maxNumericValue: 600 }],

        // ── PWA installabilite ────────────────────────────────────────
        'installable-manifest':       [level, { minScore: 1 }],
        'service-worker':             [level, { minScore: 1 }],
        'splash-screen':              [level, { minScore: 1 }],
        'themed-omnibox':             [level, { minScore: 1 }],

        // ── Accessibilite obligatoire ─────────────────────────────────
        'meta-viewport':              ['error', { minScore: 1 }],
        'document-title':             ['error', { minScore: 1 }],
        'html-has-lang':              ['error', { minScore: 1 }],
        'bypass':                     ['error', { minScore: 1 }],
        'color-contrast':             ['error', { minScore: 1 }],
        'image-alt':                  ['error', { minScore: 1 }],
        'link-name':                  ['error', { minScore: 1 }],
        'button-name':                ['error', { minScore: 1 }],

        // ── SEO technique ─────────────────────────────────────────────
        'meta-description':           ['error', { minScore: 1 }],
        'canonical':                  ['error', { minScore: 1 }],
        'robots-txt':                 ['error', { minScore: 1 }],
        'structured-data':            [level,   { minScore: 1 }],

        // ── Performance reseau ────────────────────────────────────────
        'uses-text-compression':      [level, { minScore: 1 }],
        'uses-long-cache-ttl':        [level, { minScore: 0.9 }],
        'efficient-animated-content': [level, { minScore: 1 }],
        'offscreen-images':           [level, { minScore: 1 }],
        'render-blocking-resources':  [level, { minScore: 1 }],
        'unused-javascript':          [level, { minScore: 0.9 }],
        'unused-css-rules':           [level, { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
