import { lazy } from 'react';
import __Layout from './Layout.jsx';
import HomePage from './pages/Home.jsx';
import DiscoverPage from './pages/Discover.jsx';
import ProfilePage from './pages/Profile.jsx';
import InboxPage from './pages/Inbox.jsx';
import SearchPage from './pages/Search.jsx';
import LivesPage from './pages/Lives.jsx';
import CreatePage from './pages/Create.jsx';
import ChatPage from './pages/Chat.jsx';
import GroupChatPage from './pages/GroupChat.jsx';

// Chargement à la demande de toutes les pages via Vite `import.meta.glob`.
// But: éviter l'import statique massif de `src/pages.config.js` (bundle initial lourd).

const pageModulesJsx = import.meta.glob('./pages/*.jsx', { eager: false });
const pageModulesJs = import.meta.glob('./pages/*.js', { eager: false });

const allPageModules = { ...pageModulesJsx, ...pageModulesJs };
const pageImporters = {};
const pagePreloadPromises = new Map();
const eagerPages = {
  Home: HomePage,
  Discover: DiscoverPage,
  Profile: ProfilePage,
  Inbox: InboxPage,
  Search: SearchPage,
  Lives: LivesPage,
  Create: CreatePage,
  /** Éviter Suspense/PageLoader à l’ouverture — navigation type Instagram/WhatsApp. */
  Chat: ChatPage,
  GroupChat: GroupChatPage,
};

const isTestFile = (filePath) => {
  // Ex: About.test.jsx
  return /\.test\.(jsx|js)$/i.test(filePath);
};

const getPageNameFromPath = (filePath) => {
  const fileName = filePath.split('/').pop() || '';
  return fileName.replace(/\.(jsx|js)$/i, '');
};

const Pages = {};

Object.entries(eagerPages).forEach(([pageName, PageComponent]) => {
  Pages[pageName] = PageComponent;
});

Object.entries(allPageModules).forEach(([filePath, importer]) => {
  if (isTestFile(filePath)) return;

  const pageName = getPageNameFromPath(filePath);
  if (!pageName) return;
  if (eagerPages[pageName]) return;
  pageImporters[pageName] = importer;

  // importer() -> module { default: Component } (ou parfois le module lui-même)
  Pages[pageName] = lazy(() =>
    Promise.resolve()
      .then(() => importer())
      .then((m) => ({ default: m?.default ?? m }))
  );
});

export const preloadPageByName = (pageName) => {
  if (eagerPages[pageName]) return Promise.resolve(eagerPages[pageName]);
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

