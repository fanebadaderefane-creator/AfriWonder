/**
 * Autorise le trafic en clair UNIQUEMENT vers le relais TURN Metered
 * (`*.metered.ca`) via un `network_security_config.xml`, tout en gardant le
 * cleartext interdit par défaut (`base-config cleartextTrafficPermitted=false`).
 *
 * Pourquoi : sur APK Android `usesCleartextTraffic: false` empêchait le relais
 * TURN **UDP** (`turn:global.relay.metered.ca:…`). Sans UDP, tout le média
 * passait en TURN-sur-TLS/TCP (un seul canal, head-of-line blocking) → vidéo
 * noire et audio coupé sur liens internationaux (Maroc↔Mali 4G). Ouvrir le
 * cleartext pour ce seul domaine restaure un chemin média UDP sans rouvrir le
 * cleartext global.
 *
 * Ne touche NI au backend TURN, NI à Metered, NI aux credentials.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NSC_FILENAME = 'network_security_config.xml';
const NSC_RESOURCE = '@xml/network_security_config';

const NSC_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">metered.ca</domain>
    </domain-config>
</network-security-config>
`;

function withTurnCleartextResourceFile(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, NSC_FILENAME), NSC_CONTENT, 'utf8');
      return cfg;
    },
  ]);
}

function withTurnCleartextManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app.$ = app.$ ?? {};
    app.$['android:networkSecurityConfig'] = NSC_RESOURCE;
    return cfg;
  });
}

module.exports = function withAndroidTurnCleartext(config) {
  let next = withTurnCleartextResourceFile(config);
  next = withTurnCleartextManifest(next);
  return next;
};
