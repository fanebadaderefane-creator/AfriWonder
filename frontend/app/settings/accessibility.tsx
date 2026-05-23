import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';
import usePrivacySettings from '../../src/hooks/usePrivacySettings';

export default function AccessibilityScreen() {
  const { settings, update } = usePrivacySettings();
  const a11y = settings.accessibility;

  return (
    <SettingsScreen title="Accessibility">
      <Text style={styles.intro}>Customize accessibility features for AfriWonder.</Text>

      <SettingsSection>
        <SettingsRow
          variant="toggle"
          icon="text-outline"
          label="Auto captions"
          value={a11y.auto_captions}
          onValueChange={(v) => void update({ accessibility: { ...a11y, auto_captions: v } })}
        />
        <SettingsRow
          variant="toggle"
          icon="contrast-outline"
          label="Reduce motion"
          value={a11y.reduce_motion}
          onValueChange={(v) => void update({ accessibility: { ...a11y, reduce_motion: v } })}
        />
        <SettingsRow
          variant="toggle"
          icon="volume-medium-outline"
          label="Text-to-speech"
          value={a11y.tts}
          onValueChange={(v) => void update({ accessibility: { ...a11y, tts: v } })}
        />
      </SettingsSection>

      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
});
