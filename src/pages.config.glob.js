import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Chargement à la demande de toutes les pages via Vite `import.meta.glob`.
// But: éviter l'import statique massif de `src/pages.config.js` (bundle initial lourd).

const pageModulesJsx = import.meta.glob(
  ['./pages/*.jsx', '!./pages/*.test.jsx', '!./pages/__tests__/*.jsx'],
  { eager: false }
);
const pageModulesJs = import.meta.glob(
  ['./pages/*.js', '!./pages/*.test.js', '!./pages/__tests__/*.js'],
  { eager: false }
);

const allPageModules = { ...pageModulesJsx, ...pageModulesJs };
const pageImporters = {};
const pagePreloadPromises = new Map();

const isTestFile = (filePath) => {
  // Ex: About.test.jsx
  return /\.test\.(jsx|js)$/i.test(filePath);
};

const getPageNameFromPath = (filePath) => {
  const fileName = filePath.split('/').pop() || '';
  return fileName.replace(/\.(jsx|js)$/i, '');
};

const Pages = {};

Object.entries(allPageModules).forEach(([filePath, importer]) => {
  if (isTestFile(filePath)) return;

  const pageName = getPageNameFromPath(filePath);
  if (!pageName) return;
  pageImporters[pageName] = importer;

  // importer() -> module { default: Component } (ou parfois le module lui-même)
  Pages[pageName] = lazy(() =>
    Promise.resolve()
      .then(() => importer())
      .then((m) => ({ default: m?.default ?? m }))
  );
});

export const preloadPageByName = (pageName) => {
  const importer = pageImporters[pageName];
  if (!importer) return Promise.resolve(null);
  if (!pagePreloadPromises.has(pageName)) {
    pagePreloadPromises.set(pageName, Promise.resolve().then(() => importer()).catch(() => null));
  }
  return pagePreloadPromises.get(pageName);
};

export const preloadPages = (pageNames = []) =>
  Promise.all(pageNames.map((pageName) => preloadPageByName(pageName)));

export const pagesConfig = {
  mainPage: 'Home',
  Pages,
  Layout: __Layout,
};

