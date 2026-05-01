import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, TextInput, FlatList, Modal } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COUNTRIES } from '../../src/data/countries';
import { SocialOAuthButtons } from '../../src/components/auth/SocialOAuthButtons';
import { getPostAuthRoute } from '../../src/utils/onboardingFlow';

const AFW_APP_LOGO = require('../../assets/images/pwa-icon-192.png');

type LoginMethod = 'phone' | 'email';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForceResetModal, setShowForceResetModal] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (loginMethod === 'email') {
      if (!email) {
        newErrors.identifier = 'Email requis';
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.identifier = 'Email invalide';
      }
    } else {
      if (!phone) {
        newErrors.identifier = 'Numero de telephone requis';
      } else if (phone.length < 8) {
        newErrors.identifier = 'Numero invalide';
      }
    }

    if (!password) {
      newErrors.password = 'Mot de passe requis';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const identifier = loginMethod === 'email' ? email : `${selectedCountry.dial}${phone}`;
      const response = await authApi.login({ identifier, password });
      await setAuth(response.user, response.accessToken, response.refreshToken);
      router.replace((await getPostAuthRoute()) as Parameters<typeof router.replace>[0]);
    } catch (error: any) {
      const apiError = error?.response?.data?.error;
      const apiMessage = String(apiError?.message || error?.response?.data?.message || '');
      const forcedChange =
        apiError?.code === 'PASSWORD_CHANGE_REQUIRED' ||
        /changement de mot de passe requis/i.test(apiMessage);
      const tokenFromError =
        apiError?.data?.resetToken ||
        error?.response?.data?.data?.resetToken ||
        '';
      if (forcedChange && tokenFromError) {
        setResetToken(String(tokenFromError));
        setNewPassword('');
        setConfirmNewPassword('');
        setShowForceResetModal(true);
        return;
      }
      const message = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Erreur de connexion';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceResetSubmit = async () => {
    if (!newPassword || !confirmNewPassword) {
      Alert.alert('Erreur', 'Renseigne les deux champs de mot de passe.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setResetLoading(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setShowForceResetModal(false);
      Alert.alert('Succès', 'Mot de passe changé. Connecte-toi avec ton nouveau mot de passe.');
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Impossible de changer le mot de passe';
      Alert.alert('Erreur', message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    const identifier = forgotIdentifier.trim();
    if (!identifier) {
      Alert.alert('Erreur', 'Entre ton email ou ton identifiant.');
      return;
    }
    setForgotLoading(true);
    try {
      await authApi.forgotPassword({ identifier });
      setShowForgotModal(false);
      setForgotIdentifier('');
      Alert.alert(
        'Vérifie ta boîte mail',
        "Si un compte existe, un lien de réinitialisation vient d'être envoyé."
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Impossible d'envoyer la demande.";
      Alert.alert('Erreur', message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle} accessibilityRole="image" accessibilityLabel="AfriWonder">
            <Image source={AFW_APP_LOGO} style={styles.logoImage} contentFit="contain" />
          </View>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Bienvenue sur AfriWonder</Text>
        </View>

        {/* Method Toggle */}
        <View style={styles.methodToggle}>
          <TouchableOpacity
            testID="login-method-phone"
            style={[styles.methodTab, loginMethod === 'phone' && styles.methodTabActive]}
            onPress={() => { setLoginMethod('phone'); setErrors({}); }}
          >
            <Ionicons name="call" size={18} color={loginMethod === 'phone' ? '#FFF' : '#C8C8D4'} />
            <Text style={[styles.methodTabText, loginMethod === 'phone' && styles.methodTabTextActive]}>Telephone</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="login-method-email"
            style={[styles.methodTab, loginMethod === 'email' && styles.methodTabActive]}
            onPress={() => { setLoginMethod('email'); setErrors({}); }}
          >
            <Ionicons name="mail" size={18} color={loginMethod === 'email' ? '#FFF' : '#C8C8D4'} />
            <Text style={[styles.methodTabText, loginMethod === 'email' && styles.methodTabTextActive]}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {loginMethod === 'phone' ? (
            <>
              {/* Country Selector */}
              <Text style={styles.label}>Pays</Text>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => { setShowCountryPicker(true); setCountrySearch(''); }}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryName}>{selectedCountry.name}</Text>
                <Text style={styles.countryDial}>{selectedCountry.dial}</Text>
                <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Country Picker Modal */}
              <Modal visible={showCountryPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Choisir un pays</Text>
                      <TouchableOpacity onPress={() => setShowCountryPicker(false)} style={styles.modalClose}>
                        <Ionicons name="close" size={26} color={Colors.text} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={Colors.textSecondary} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un pays..."
                        placeholderTextColor={Colors.textSecondary}
                        value={countrySearch}
                        onChangeText={setCountrySearch}
                      />
                      {countrySearch.length > 0 && (
                        <TouchableOpacity onPress={() => setCountrySearch('')}>
                          <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <FlatList
                      data={filteredCountries}
                      keyExtractor={(item) => item.code}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.countryItem, item.code === selectedCountry.code && styles.countryItemActive]}
                          onPress={() => { setSelectedCountry(item); setShowCountryPicker(false); }}
                        >
                          <Text style={styles.countryItemFlag}>{item.flag}</Text>
                          <Text style={styles.countryItemName}>{item.name}</Text>
                          <Text style={styles.countryItemDial}>{item.dial}</Text>
                          {item.code === selectedCountry.code && (
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyList}>
                          <Ionicons name="globe-outline" size={40} color={Colors.textSecondary} />
                          <Text style={styles.emptyListText}>Aucun pays trouve</Text>
                        </View>
                      }
                    />
                  </View>
                </View>
              </Modal>

              {/* Phone Input */}
              <Text style={styles.label}>Numero de telephone</Text>
              <View style={[styles.phoneInputContainer, errors.identifier && styles.inputError]}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>{selectedCountry.dial}</Text>
                </View>
                <View style={styles.phoneDivider} />
                <Input
                  placeholder="XX XX XX XX"
                  value={phone}
                  onChangeText={(text) => { setPhone(text); setErrors({}); }}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
              </View>
              {errors.identifier && <Text style={styles.errorText}>{errors.identifier}</Text>}
            </>
          ) : (
            <Input
              testID="login-email-input"
              label="Email"
              placeholder="votre@email.com"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrors({}); }}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail"
              error={errors.identifier}
            />
          )}

          <Input
            testID="login-password-input"
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={password}
            onChangeText={(text) => { setPassword(text); setErrors({}); }}
            secureTextEntry
            icon="lock-closed"
            error={errors.password}
          />

          <View style={styles.loginHelpRow}>
            <TouchableOpacity style={styles.forgotPassword} onPress={() => setShowForgotModal(true)}>
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/support-page')}>
              <Text style={styles.forgotPasswordText}>Besoin d'aide pour vous connecter ?</Text>
            </TouchableOpacity>
          </View>

          <Button
            testID="login-submit-button"
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            size="large"
            style={styles.loginButton}
          />
        </View>

        <SocialOAuthButtons
          onAuthenticated={async () => {
            router.replace((await getPostAuthRoute()) as Parameters<typeof router.replace>[0]);
          }}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity testID="login-link-register" onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}> Creer un compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showForceResetModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changement obligatoire</Text>
              <TouchableOpacity
                onPress={() => setShowForceResetModal(false)}
                style={styles.modalClose}
                disabled={resetLoading}
              >
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg }}>
              <Text style={styles.subtitle}>
                Votre compte utilise un mot de passe temporaire. Définissez un nouveau mot de passe maintenant.
              </Text>
            </View>
            <View style={{ paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xl }}>
              <Input
                label="Nouveau mot de passe"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                icon="lock-closed"
              />
              <Input
                label="Confirmer le mot de passe"
                placeholder="Confirmer le mot de passe"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                icon="lock-closed"
              />
              <Button
                title={resetLoading ? 'Changement...' : 'Changer le mot de passe'}
                onPress={handleForceResetSubmit}
                loading={resetLoading}
                size="large"
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showForgotModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mot de passe oublié</Text>
              <TouchableOpacity
                onPress={() => setShowForgotModal(false)}
                style={styles.modalClose}
                disabled={forgotLoading}
              >
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg }}>
              <Text style={styles.subtitle}>
                Entre ton email (ou identifiant) pour recevoir un lien de réinitialisation.
              </Text>
            </View>
            <View style={{ paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xl }}>
              <Input
                label="Email ou identifiant"
                placeholder="votre@email.com"
                value={forgotIdentifier}
                onChangeText={setForgotIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                icon="mail"
              />
              <Button
                title={forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
                onPress={handleForgotPasswordSubmit}
                loading={forgotLoading}
                size="large"
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.xxl, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoImage: { width: '100%', height: '100%' },
  title: { fontSize: FontSizes.xxxl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSizes.md, color: '#B8B8C4' },

  // Method toggle
  methodToggle: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.xxl },
  methodTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  methodTabActive: { backgroundColor: Colors.primary },
  /** Inactif : meilleur contraste sur fond `#1E1E1E` que `Colors.textSecondary`. */
  methodTabText: { color: '#C8C8D4', fontSize: FontSizes.md, fontWeight: '600' },
  methodTabTextActive: { color: '#FFF' },

  // Form
  form: { marginBottom: Spacing.xxl },
  label: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '500', marginBottom: Spacing.sm },

  // Country selector
  countrySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  countryFlag: { fontSize: 22 },
  countryName: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  countryDial: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  modalClose: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginHorizontal: Spacing.xl, marginVertical: Spacing.md, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, paddingVertical: Spacing.md },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  countryItemActive: { backgroundColor: Colors.primary + '15' },
  countryItemFlag: { fontSize: 24 },
  countryItemName: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  countryItemDial: { color: Colors.textSecondary, fontSize: FontSizes.md, marginRight: Spacing.sm },
  emptyList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyListText: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: Spacing.md },

  // Phone input
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, overflow: 'hidden' },
  inputError: { borderColor: Colors.error },
  phonePrefix: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.border + '40' },
  phonePrefixText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  phoneDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  phoneInput: { flex: 1, marginBottom: 0 },
  errorText: { color: Colors.error, fontSize: FontSizes.xs, marginBottom: Spacing.md },
  loginHelpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },

  forgotPassword: { alignSelf: 'auto' },
  forgotPasswordText: { color: Colors.primary, fontSize: FontSizes.sm },
  loginButton: { width: '100%' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  footerLink: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600' },
});
