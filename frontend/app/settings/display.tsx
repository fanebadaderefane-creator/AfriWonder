import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { AudiencePicker } from '../../src/components/settings/AudiencePicker';
import usePrivacySettings from '../../src/hooks/usePrivacySettings';

type Theme = 'light' | 'dark' | 'system';

export default function DisplaySettingsScreen() {
  const { settings, update } = usePrivacySettings();

  return (
    <SettingsScreen title="Display">
      <Text style={styles.intro}>Choose how AfriWonder looks on this device.</Text>
      <AudiencePicker<Theme>
        value={settings.display.theme}
        onChange={(v) => void update({ display: { theme: v } })}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'Use device setting' },
        ]}
      />
      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
});
