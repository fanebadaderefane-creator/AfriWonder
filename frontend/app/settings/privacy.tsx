import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';
import usePrivacySettings from '../../src/hooks/usePrivacySettings';

const AUDIENCE_LABEL: Record<string, string> = {
  everyone: 'Everyone',
  friends: 'Friends',
  no_one: 'No one',
  only_me: 'Only you',
};

const TOGGLE_LABEL = (value: boolean) => (value ? 'On' : 'Off');

/**
 * Hub principal "Settings and privacy" (style TikTok). Chaque ligne soit toggle inline,
 * soit ouvre une sous-page dédiée. Tout est persisté via `usePrivacySettings`.
 */
export default function SettingsPrivacyHub() {
  const { settings, loading, update } = usePrivacySettings();

  if (loading) {
    return (
      <SettingsScreen title="Settings and privacy">
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <ActivityIndicator color="#FF2D55" />
        </View>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen title="Settings and privacy">
      <SettingsSection title="Account">
        <SettingsRow
          variant="toggle"
          icon="lock-closed-outline"
          label="Private account"
          value={settings.private_account}
          onValueChange={(v) => void update({ private_account: v })}
        />
        <SettingsRow
          variant="navigate"
          icon="ban-outline"
          label="Blocked accounts"
          onPress={() => router.push('/settings/blocked-accounts')}
        />
      </SettingsSection>

      <SettingsSection title="Privacy">
        <SettingsRow
          variant="navigate"
          icon="time-outline"
          label="Activity status"
          value={AUDIENCE_LABEL[settings.activity_status]}
          onPress={() => router.push('/settings/privacy/activity-status' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="people-outline"
          label="Wonder list"
          value={AUDIENCE_LABEL[settings.following_list_visibility]}
          onPress={() => router.push('/settings/privacy/following-list' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="heart-outline"
          label="Liked videos"
          value={AUDIENCE_LABEL[settings.liked_videos_visibility]}
          onPress={() => router.push('/settings/privacy/liked-videos' as never)}
        />
        <SettingsRow
          variant="toggle"
          icon="footsteps-outline"
          label="Viewers"
          value={settings.viewers}
          onValueChange={(v) => void update({ viewers: v })}
        />
        <SettingsRow
          variant="navigate"
          icon="chatbubble-ellipses-outline"
          label="Comments"
          onPress={() => router.push('/settings/privacy/comments' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="at-outline"
          label="Mentions"
          value={AUDIENCE_LABEL[settings.mentions]}
          onPress={() => router.push('/settings/privacy/mentions' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="paper-plane-outline"
          label="Direct messages"
          onPress={() => router.push('/settings/privacy/direct-messages' as never)}
        />
        <SettingsRow
          variant="toggle"
          icon="download-outline"
          label="Downloads"
          value={settings.downloads}
          onValueChange={(v) => void update({ downloads: v })}
        />
        <SettingsRow
          variant="toggle"
          icon="link-outline"
          label="Display profile when sharing"
          value={settings.display_profile_when_sharing}
          onValueChange={(v) => void update({ display_profile_when_sharing: v })}
        />
        <SettingsRow
          variant="navigate"
          icon="copy-outline"
          label="Reuse of content"
          onPress={() => router.push('/settings/privacy/reuse-of-content' as never)}
        />
      </SettingsSection>

      <SettingsSection title="Security & permissions">
        <SettingsRow
          variant="navigate"
          icon="shield-checkmark-outline"
          label="Security & permissions"
          onPress={() => router.push('/settings/security' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="share-social-outline"
          label="Share profile"
          onPress={() => router.push('/settings/share-profile' as never)}
        />
      </SettingsSection>

      <SettingsSection title="Tools">
        <SettingsRow
          variant="navigate"
          icon="people-circle-outline"
          label="Family Pairing"
          onPress={() => router.push('/settings/family-pairing' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="hourglass-outline"
          label="Time and well-being"
          notificationDot
          onPress={() => router.push('/settings/time-wellbeing' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="megaphone-outline"
          label="Audience controls"
          onPress={() => router.push('/settings/audience-controls' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="options-outline"
          label="Content preferences"
          onPress={() => router.push('/settings/content-preferences' as never)}
        />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow
          variant="navigate"
          icon="language-outline"
          label="Language"
          value={settings.language.app_lang.toUpperCase()}
          onPress={() => router.push('/settings/language' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="moon-outline"
          label="Display"
          value={settings.display.theme[0].toUpperCase() + settings.display.theme.slice(1)}
          onPress={() => router.push('/settings/display' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="accessibility-outline"
          label="Accessibility"
          onPress={() => router.push('/settings/accessibility' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="location-outline"
          label="Contacts and location"
          onPress={() => router.push('/settings/contacts-location' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="cloud-download-outline"
          label="Offline videos"
          onPress={() => router.push('/downloads' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="trash-outline"
          label="Free up space"
          onPress={() => router.push('/settings/free-up-space' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="cellular-outline"
          label="Data Saver"
          value={TOGGLE_LABEL(settings.data_saver)}
          onPress={() => router.push('/settings/data-saver' as never)}
        />
      </SettingsSection>
    </SettingsScreen>
  );
}
