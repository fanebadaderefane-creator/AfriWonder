import React from 'react';
import { Text, StyleSheet, View, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';
import usePrivacySettings from '../../src/hooks/usePrivacySettings';

export default function ContactsLocationScreen() {
  const { settings, update } = usePrivacySettings();
  const cl = settings.contacts_and_location;

  const onContacts = (next: boolean) => {
    void update({ contacts_and_location: { ...cl, contacts_allowed: next } });
    if (next) router.push('/sync-contacts' as never);
  };

  const onLocation = (next: boolean) => {
    void update({ contacts_and_location: { ...cl, location_allowed: next } });
    if (next && Platform.OS === 'web') {
      Alert.alert('Location', 'Location is requested when you open features that need it (e.g. Connect Now).');
    }
  };

  return (
    <SettingsScreen title="Contacts and location">
      <Text style={styles.intro}>
        Allow AfriWonder to access your contacts to find friends, and your location to surface
        nearby content.
      </Text>

      <SettingsSection title="Contacts">
        <SettingsRow
          variant="toggle"
          icon="people-outline"
          label="Sync contacts"
          value={cl.contacts_allowed}
          onValueChange={onContacts}
        />
        <SettingsRow
          variant="navigate"
          icon="search-outline"
          label="Find contacts on AfriWonder"
          onPress={() => router.push('/sync-contacts' as never)}
        />
      </SettingsSection>

      <SettingsSection title="Location">
        <SettingsRow
          variant="toggle"
          icon="location-outline"
          label="Use device location"
          value={cl.location_allowed}
          onValueChange={onLocation}
        />
        <SettingsRow
          variant="navigate"
          icon="radio-outline"
          label="Connect now (nearby people)"
          onPress={() => router.push('/connect-now' as never)}
        />
      </SettingsSection>

      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
});
