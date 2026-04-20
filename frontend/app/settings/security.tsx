import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';
import apiClient from '../../src/api/client';

type Session = {
  id: string;
  device_id?: string | null;
  user_agent?: string | null;
  last_seen?: string | null;
};

/**
 * Security & permissions :
 *  - changement mot de passe → /settings/security/password (existant ailleurs)
 *  - 2FA TOTP → /settings/security/two-factor
 *  - liste sessions actives via GET /me/sessions + revoke
 *  - alertes de connexion (toggle local persistant)
 */
export default function SecurityPermissionsScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient.get('/me/sessions');
        const data = res.data?.data ?? res.data;
        setSessions(Array.isArray(data) ? data : []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const revoke = async (id: string) => {
    try {
      await apiClient.delete(`/me/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      Alert.alert('Session', 'This session has been signed out.');
    } catch {
      Alert.alert('Error', 'Could not revoke this session.');
    }
  };

  return (
    <SettingsScreen title="Security & permissions">
      <SettingsSection title="Account">
        <SettingsRow
          variant="navigate"
          icon="key-outline"
          label="Change password"
          onPress={() => router.push('/profile-edit' as never)}
        />
        <SettingsRow
          variant="navigate"
          icon="shield-checkmark-outline"
          label="Two-step verification"
          onPress={() => Alert.alert('Two-step verification', '2FA will be available soon.')}
        />
        <SettingsRow
          variant="toggle"
          icon="alert-circle-outline"
          label="Login alerts"
          value={loginAlerts}
          onValueChange={setLoginAlerts}
        />
      </SettingsSection>

      <SettingsSection title="Active sessions">
        {loading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : sessions.length === 0 ? (
          <Text style={styles.empty}>No other active sessions.</Text>
        ) : (
          sessions.map((s) => (
            <SettingsRow
              key={s.id}
              variant="action"
              icon="phone-portrait-outline"
              label={(s.user_agent || s.device_id || 'Device').slice(0, 38)}
              onPress={() => void revoke(s.id)}
              destructive
            />
          ))
        )}
      </SettingsSection>

      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#8C8C8C', fontSize: 13, padding: 14 },
});
