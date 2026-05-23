import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';
import usePrivacySettings from '../../src/hooks/usePrivacySettings';

/**
 * Audience controls — restreindre l'audience d'une vidéo / globalement.
 *
 * MVP : on expose `restricted_mode` (filtre `mature:false` côté feed) et un raccourci
 * vers le toggle vidéo `is_18_plus` qui sera côté écran d'upload.
 */
export default function AudienceControlsScreen() {
  const { settings, update } = usePrivacySettings();
  const time = settings.time_and_wellbeing;

  return (
    <SettingsScreen title="Audience controls">
      <Text style={styles.intro}>
        Limit who can see your videos based on age. You can also mark a specific video as 18+
        when uploading.
      </Text>

      <SettingsSection title="Mature content">
        <SettingsRow
          variant="toggle"
          icon="warning-outline"
          label="Restricted mode for my feed"
          value={time.restricted_mode}
          onValueChange={(v) =>
            void update({ time_and_wellbeing: { ...time, restricted_mode: v } })
          }
        />
      </SettingsSection>

      <Text style={styles.help}>
        When uploading a video, toggle “18+” to restrict it to viewers over 18 years old.
      </Text>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
  help: { color: '#8C8C8C', fontSize: 12, paddingHorizontal: 18, paddingTop: 18 },
});
