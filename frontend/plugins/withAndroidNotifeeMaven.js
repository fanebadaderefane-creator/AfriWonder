'use strict';

/**
 * @notifee/react-native ships `app.notifee:core` in a local Maven repo under node_modules.
 * Without this repository Gradle resolves against Maven Central only and `expo run:android` fails.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const NOTIFEE_MAVEN_MARKER = 'afw-notifee-local-maven';
const NOTIFEE_MAVEN_BLOCK = `
    // ${NOTIFEE_MAVEN_MARKER}
    maven {
      url "$rootDir/../node_modules/@notifee/react-native/android/libs"
    }`;

/** @param {import('@expo/config-plugins').ExpoConfig} config */
module.exports = function withAndroidNotifeeMaven(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }
    if (cfg.modResults.contents.includes(NOTIFEE_MAVEN_MARKER)) {
      return cfg;
    }
    const jitpackNeedle = "maven { url 'https://www.jitpack.io' }";
    if (cfg.modResults.contents.includes(jitpackNeedle)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        jitpackNeedle,
        `${jitpackNeedle}${NOTIFEE_MAVEN_BLOCK}`,
      );
      return cfg;
    }
    const allprojectsNeedle = 'allprojects {';
    if (cfg.modResults.contents.includes(allprojectsNeedle)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        allprojectsNeedle,
        `${allprojectsNeedle}\n  repositories {${NOTIFEE_MAVEN_BLOCK}\n  }`,
      );
    }
    return cfg;
  });
};
