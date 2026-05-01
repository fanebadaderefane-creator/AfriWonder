import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import apiClient from '../../../src/api/client';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import type { AppPalette } from '../../../src/theme/themePalettes';

export default function ChangePasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = () => {
    if (newPassword.length < 8) {
      Alert.alert('Changer le mot de passe', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert('Changer le mot de passe', 'Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    void (async () => {
      try {
        await apiClient.post('/auth/password/change', {
          currentPassword,
          newPassword,
        });
        Alert.alert('Terminé', 'Votre mot de passe a été mis à jour.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: { message?: string } } } };
        const message =
          ax.response?.data?.error?.message ||
          'Impossible de mettre à jour le mot de passe. Vérifiez le mot de passe actuel et réessayez.';
        Alert.alert('Changer le mot de passe', message);
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <SettingsScreen title="Changer le mot de passe">
      <View style={styles.card}>
        <Text style={styles.hint}>
          Utilisez un mot de passe fort avec des lettres et des chiffres. Si vous vous êtes inscrit uniquement avec
          Google ou Apple, utilisez d&apos;abord « Mot de passe oublié » sur l&apos;écran de connexion.
        </Text>
        <Text style={styles.label}>Mot de passe actuel</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={styles.label}>Nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textSecondary}
        />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }, submitting && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={submitting || !currentPassword || !newPassword || !confirm}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>
    </SettingsScreen>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 12,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    hint: { color: colors.textSecondary, fontSize: 14, marginBottom: 16, lineHeight: 20 },
    label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      marginBottom: 14,
      color: colors.text,
      backgroundColor: colors.background,
    },
    btn: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  });
}
