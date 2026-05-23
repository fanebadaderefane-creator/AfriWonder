import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import { AudiencePicker } from '../../../src/components/settings/AudiencePicker';
import usePrivacySettings, { type Audience } from '../../../src/hooks/usePrivacySettings';

export default function MentionsScreen() {
  const { settings, update } = usePrivacySettings();

  return (
    <SettingsScreen title="Mentions">
      <Text style={styles.intro}>Choose who can mention you in comments and videos with @username.</Text>
      <AudiencePicker<Audience>
        value={settings.mentions}
        onChange={(v) => void update({ mentions: v })}
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'friends', label: 'Friends' },
          { value: 'no_one', label: 'No one' },
        ]}
      />
      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
});
