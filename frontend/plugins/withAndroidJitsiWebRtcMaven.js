'use strict';

/**
 * react-native-webrtc depends on org.jitsi:webrtc:124.+ (Maven Central).
 * Without routing org.jitsi exclusively to mavenCentral(), Gradle also queries JitPack
 * for maven-metadata and EAS builds can fail with "Read timed out".
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const JITSI_MAVEN_MARKER = 'afw-jitsi-maven-central';
const JITSI_MAVEN_BLOCK = `
    // ${JITSI_MAVEN_MARKER} — react-native-webrtc → org.jitsi:webrtc:124.+
    exclusiveContent {
      filter {
        includeGroup "org.jitsi"
      }
      forRepository {
        mavenCentral()
      }
    }`;

const JITSI_FORCE_MARKER = "resolutionStrategy.force 'org.jitsi:webrtc:124.0.0'";

/** @param {import('@expo/config-plugins').ExpoConfig} config */
module.exports = function withAndroidJitsiWebRtcMaven(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }
    let contents = cfg.modResults.contents;

    if (!contents.includes(JITSI_MAVEN_MARKER)) {
      const jitpackNeedle = "maven { url 'https://www.jitpack.io' }";
      if (contents.includes(jitpackNeedle)) {
        contents = contents.replace(jitpackNeedle, `${JITSI_MAVEN_BLOCK}\n    ${jitpackNeedle}`);
      }
    }

    if (!contents.includes(JITSI_FORCE_MARKER)) {
      const subprojectsNeedle = 'subprojects { subproject ->';
      if (contents.includes(subprojectsNeedle)) {
        contents = contents.replace(
          subprojectsNeedle,
          `${subprojectsNeedle}
  subproject.configurations.configureEach {
    ${JITSI_FORCE_MARKER}
  }`,
        );
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
