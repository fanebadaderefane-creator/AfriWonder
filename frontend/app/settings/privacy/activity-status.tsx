import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import { AudiencePicker } from '../../../src/components/settings/AudiencePicker';
import usePrivacySettings, { type Audience } from '../../../src/hooks/usePrivacySettings';

export default function ActivityStatusScreen() {
  const { settings, update } = usePrivacySettings();

  return (
    <SettingsScreen title="Activity status">
      <Text style={styles.intro}>
        Choose who can see when you were last active and when you’re online.
        If turned off (No one), you also won’t see other people’s activity status.
      </Text>
      <AudiencePicker<Audience>
        value={settings.activity_status}
        onChange={(v) => void update({ activity_status: v })}
        options={[
          { value: 'everyone', label: 'Everyone', description: 'Anyone on AfriWonder can see when you were active.' },
          { value: 'friends', label: 'Friends', description: 'Only mutual followers can see your activity status.' },
          { value: 'no_one', label: 'No one', description: 'No one can see when you were last active.' },
        ]}
      />
      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: '#5F5F5F',
    fontSize: 13,
    paddingHorizontal: 18,
    paddingTop: 14,
    lineHeight: 19,
  },
});
