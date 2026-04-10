import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COUNTRIES = [
  { code: 'ML', name: 'Mali', dial: '+223' },
  { code: 'SN', name: 'Sénégal', dial: '+221' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226' },
  { code: 'GN', name: 'Guinée', dial: '+224' },
  { code: 'NE', name: 'Niger', dial: '+227' },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: 'ML',
  });
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCountry = COUNTRIES.find(c => c.code === formData.country);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName) newErrors.firstName = 'Prénom requis';
    if (!formData.lastName) newErrors.lastName = 'Nom requis';
    if (!formData.email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (!formData.phone) newErrors.phone = 'Téléphone requis';
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    if (!acceptTerms) {
      newErrors.terms = 'Veuillez accepter les CGU';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      const response = await authApi.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: `${selectedCountry?.dial}${formData.phone}`,
        password: formData.password,
        country: formData.country,
      });
      await setAuth(response.user, response.accessToken, response.refreshToken);
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.response?.data?.message || "Erreur lors de l'inscription";
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez la communauté AfriWonder</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Prénom"
                placeholder="Votre prénom"
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                autoCapitalize="words"
                error={errors.firstName}
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Nom"
                placeholder="Votre nom"
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                autoCapitalize="words"
                error={errors.lastName}
              />
            </View>
          </View>

          <Input
            label="Email"
            placeholder="votre@email.com"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
            error={errors.email}
          />

          <Text style={styles.label}>Pays</Text>
          <TouchableOpacity 
            style={styles.countrySelector}
            onPress={() => setShowCountryPicker(!showCountryPicker)}
          >
            <Text style={styles.countryText}>
              {selectedCountry?.name} ({selectedCountry?.dial})
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          {showCountryPicker && (
            <View style={styles.countryList}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryItem,
                    country.code === formData.country && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, country: country.code });
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryItemText}>
                    {country.name} ({country.dial})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Input
            label="Téléphone"
            placeholder="XX XX XX XX"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            icon="call"
            error={errors.phone}
          />

          <Input
            label="Mot de passe"
            placeholder="Minimum 6 caractères"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
            icon="lock-closed"
            error={errors.password}
          />

          <Input
            label="Confirmer le mot de passe"
            placeholder="Confirmez votre mot de passe"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            secureTextEntry
            icon="lock-closed"
            error={errors.confirmPassword}
          />

          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Ionicons name="checkmark" size={16} color={Colors.text} />}
            </View>
            <Text style={styles.termsText}>
              J'accepte les{' '}
              <Text style={styles.termsLink}>Conditions Générales d'Utilisation</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

          <Button
            title="S'inscrire"
            onPress={handleRegister}
            loading={loading}
            size="large"
            style={styles.registerButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}> Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  form: {
    marginBottom: Spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  countryText: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  countryList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  countryItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  countryItemActive: {
    backgroundColor: Colors.primary + '20',
  },
  countryItemText: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  termsLink: {
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.md,
  },
  registerButton: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
