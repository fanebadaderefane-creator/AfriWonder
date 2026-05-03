/**
 * Play Console — validation développeur Android (package déjà utilisé).
 * Inclut le fichier exigé dans l’APK/AAB : `app/src/main/assets/adi-registration.properties`.
 *
 * L’APK/AAB doit être signé avec la clé dont l’empreinte SHA-256 correspond à celle
 * sélectionnée dans la console (cf. credentials EAS / keystore upload).
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/** Contenu exact fourni par Google Play (modal « Signer et importer un APK »). */
const ADI_REGISTRATION_SNIPPET = 'CA5EQ6SYAIPGWAAAAAAAAAAAAA';

module.exports = function withAndroidAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.platformProjectRoot;
      const assetsDir = path.join(projectRoot, 'app', 'src', 'main', 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      const target = path.join(assetsDir, 'adi-registration.properties');
      fs.writeFileSync(target, `${ADI_REGISTRATION_SNIPPET}\n`, 'utf8');
      return cfg;
    },
  ]);
};
