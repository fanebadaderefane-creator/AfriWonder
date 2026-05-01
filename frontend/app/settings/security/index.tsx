import React, { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../../src/components/settings/SettingsRow';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/authStore';

type Session = {
  id: string;
  device_id?: string | null;
  user_agent?: string | null;
  last_seen?: string | null;
};

export default function SecurityPermissionsScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(Boolean(user?.login_alerts_enabled ?? true));
  const [savingAlerts, setSavingAlerts] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const d = res.data?.data ?? res.data;
      if (d && typeof d.login_alerts_enabled === 'boolean') {
        setLoginAlerts(d.login_alerts_enabled);
        updateUser({ login_alerts_enabled: d.login_alerts_enabled });
      }
    } catch {
      /* ignore */
    }
  }, [updateUser]);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe])
  );

  useEffect(() => {
    if (user?.login_alerts_enabled !== undefined) {
      setLoginAlerts(user.login_alerts_enabled);
    }
  }, [user?.login_alerts_enabled]);

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
      Alert.alert('Session', 'Cette session a été déconnectée.');
    } catch {
      Alert.alert('Erreur', 'Impossible de révoquer cette session.');
    }
  };

  const onLoginAlertsChange = (next: boolean) => {
    setLoginAlerts(next);
    setSavingAlerts(true);
    void (async () => {
      try {
        await apiClient.patch('/me/settings/security', { login_alerts_enabled: next });
        updateUser({ login_alerts_enabled: next });
      } catch (e: unknown) {
        setLoginAlerts(!next);
        const ax = e as { response?: { data?: { error?: { message?: string } } } };
        Alert.alert(
          'Alertes de connexion',
          ax.response?.data?.error?.message || 'Synchronisation impossible. Réessayez.',
        );
      } finally {
        setSavingAlerts(false);
      }
    })();
  };

  return (
    <SettingsScreen title="Sécurité et autorisations">
      <SettingsSection title="Compte">
        <SettingsRow
          variant="navigate"
          icon="key-outline"
          label="Changer le mot de passe"
          onPress={() => router.push('/settings/security/password')}
        />
        <SettingsRow
          variant="navigate"
          icon="shield-checkmark-outline"
          label="Validation en deux étapes"
          onPress={() => router.push('/settings/security/two-factor')}
        />
        <SettingsRow
          variant="toggle"
          icon="alert-circle-outline"
          label="Alertes de connexion"
          value={loginAlerts}
          onValueChange={onLoginAlertsChange}
          disabled={savingAlerts}
        />
        <View style={styles.loginAlertsHintWrap}>
          <Text style={styles.loginAlertsHint}>
            Lorsque cette option est activée, nous vous envoyons un e-mail si une connexion à votre compte est
            détectée depuis un navigateur ou un appareil que nous n&apos;avions pas vu récemment (aperçu du navigateur
            et adresse IP dans le message). La préférence est enregistrée sur votre compte ; l&apos;e-mail nécessite
            une clé Resend configurée sur le serveur (RESEND_API_KEY).
          </Text>
        </View>
      </SettingsSection>

      <SettingsSection title="Sessions actives">
        {loading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : sessions.length === 0 ? (
          <Text style={styles.empty}>Aucune autre session enregistrée pour le moment.</Text>
        ) : (
          sessions.map((s) => (
            <SettingsRow
              key={s.id}
              variant="action"
              icon="phone-portrait-outline"
              label={(s.user_agent || s.device_id || 'Appareil').slice(0, 38)}
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
  loginAlertsHintWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  loginAlertsHint: {
    color: '#8C8C8C',
    fontSize: 12,
    lineHeight: 17,
  },
});
