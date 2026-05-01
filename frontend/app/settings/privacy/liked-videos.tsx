import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import { AudiencePicker } from '../../../src/components/settings/AudiencePicker';
import usePrivacySettings, { type Visibility } from '../../../src/hooks/usePrivacySettings';

export default function LikedVideosScreen() {
  const { settings, update } = usePrivacySettings();

  return (
    <SettingsScreen title="Liked videos">
      <Text style={styles.intro}>Choose who can see the videos you’ve liked.</Text>
      <AudiencePicker<Visibility>
        value={settings.liked_videos_visibility}
        onChange={(v) => void update({ liked_videos_visibility: v })}
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'friends', label: 'Friends', description: 'Only mutual Wonder can see your likes.' },
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
