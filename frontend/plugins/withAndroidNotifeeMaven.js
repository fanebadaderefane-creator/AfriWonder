'use strict';

/**
 * @notifee/react-native ships `app.notifee:core` in a local Maven repo under node_modules.
 * Without routing `app.notifee` exclusively to that repo, Gradle queries JitPack for
 * `app.notifee:core:+` metadata and EAS builds can fail with "Read timed out".
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const NOTIFEE_MAVEN_MARKER = 'afw-notifee-local-maven';
const NOTIFEE_MAVEN_BLOCK = `
    // ${NOTIFEE_MAVEN_MARKER} — @notifee/react-native bundles app.notifee:core locally
    exclusiveContent {
      filter {
        includeGroup "app.notifee"
      }
      forRepository {
        maven {
          url "$rootDir/../node_modules/@notifee/react-native/android/libs"
        }
      }
    }`;

/** @param {import('@expo/config-plugins').ExpoConfig} config */
module.exports = function withAndroidNotifeeMaven(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }
    let contents = cfg.modResults.contents;
    if (contents.includes(NOTIFEE_MAVEN_MARKER)) {
      return cfg;
    }

    const jitpackNeedle = "maven { url 'https://www.jitpack.io' }";
    if (contents.includes(jitpackNeedle)) {
      contents = contents.replace(jitpackNeedle, `${NOTIFEE_MAVEN_BLOCK}\n    ${jitpackNeedle}`);
      cfg.modResults.contents = contents;
      return cfg;
    }

    const allprojectsNeedle = 'allprojects {';
    if (contents.includes(allprojectsNeedle)) {
      contents = contents.replace(
        allprojectsNeedle,
        `${allprojectsNeedle}\n  repositories {${NOTIFEE_MAVEN_BLOCK}\n  }`,
      );
      cfg.modResults.contents = contents;
    }
    return cfg;
  });
};
