// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const os = require('os');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

/**
 * PERF (cold start, Android bas de gamme) : `inlineRequires` reporte le coût de chargement
 * des modules à leur 1ʳᵉ utilisation au lieu de tout résoudre/parser au boot.
 * Gain TTI typique +15–35 % sur device modeste avec un gros bundle (Expo SDK 54 + RN 0.81).
 *
 * `getTransformOptions` doit être préservé en propageant l'éventuelle config par défaut.
 */
const baseGetTransformOptions = config.transformer.getTransformOptions;
config.transformer.getTransformOptions = async (entryPoints, options, getDependenciesOf) => {
  const base = baseGetTransformOptions
    ? await baseGetTransformOptions(entryPoints, options, getDependenciesOf)
    : {};
  return {
    ...base,
    transform: {
      ...(base.transform || {}),
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  };
};

// Workers : 2 en dev (économie RAM), max(2, cpus-1) en build pour accélérer le bundling release.
const isDev = process.env.NODE_ENV !== 'production' && !process.env.EAS_BUILD;
config.maxWorkers = isDev ? 2 : Math.max(2, (os.cpus()?.length || 4) - 1);

// Alias 'crypto' → quick-crypto sur iOS/Android uniquement (le web n'a pas le module natif QuickCrypto).
const origResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto' && platform !== 'web') {
    return origResolveRequest
      ? origResolveRequest(context, 'react-native-quick-crypto', platform)
      : context.resolveRequest(context, 'react-native-quick-crypto', platform);
  }
  /* react-native-webrtc → event-target-shim/index : sous-chemin absent des "exports" du paquet v6. */
  const normalized = String(moduleName || '').replace(/\\/g, '/');
  if (normalized === 'event-target-shim/index' || normalized.endsWith('/event-target-shim/index')) {
    return origResolveRequest
      ? origResolveRequest(context, 'event-target-shim', platform)
      : context.resolveRequest(context, 'event-target-shim', platform);
  }
  return origResolveRequest
    ? origResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
