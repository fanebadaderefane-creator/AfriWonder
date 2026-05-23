import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import { AudiencePicker } from '../../../src/components/settings/AudiencePicker';
import usePrivacySettings, { type Visibility } from '../../../src/hooks/usePrivacySettings';

export default function FollowingListScreen() {
  const { settings, update } = usePrivacySettings();

  return (
    <SettingsScreen title="Wonder list">
      <Text style={styles.intro}>Choose who can see the accounts you follow.</Text>
      <AudiencePicker<Visibility>
        value={settings.following_list_visibility}
        onChange={(v) => void update({ following_list_visibility: v })}
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'friends', label: 'Friends', description: 'Only mutual Wonder can see this list.' },
          { value: 'only_me', label: 'Only you' },
        ]}
      />
      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
});
