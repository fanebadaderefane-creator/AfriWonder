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
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', dial: '+221' },
  { code: 'CI', name: "Cote d'Ivoire", flag: '🇨🇮', dial: '+225' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { code: 'GN', name: 'Guinee', flag: '🇬🇳', dial: '+224' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227' },
];

type RegisterMethod = 'phone' | 'email';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>('phone');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName) newErrors.firstName = 'Prenom requis';
    if (!formData.lastName) newErrors.lastName = 'Nom requis';

    if (registerMethod === 'email') {
      if (!formData.email) {
        newErrors.identifier = 'Email requis';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.identifier = 'Email invalide';
      }
    } else {
      if (!formData.phone) {
        newErrors.identifier = 'Numero de telephone requis';
      } else if (formData.phone.length < 8) {
        newErrors.identifier = 'Numero invalide';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 caracteres';
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
      const identifier = registerMethod === 'email' ? formData.email : `${selectedCountry.dial}${formData.phone}`;
      const response = await authApi.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: registerMethod === 'email' ? formData.email : '',
        phone: registerMethod === 'phone' ? `${selectedCountry.dial}${formData.phone}` : '',
        password: formData.password,
        country: selectedCountry.code,
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

  const handleSocialRegister = (provider: string) => {
    Alert.alert('Info', `Inscription ${provider} bientot disponible`);
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="person-add" size={28} color="#FFF" />
          </View>
          <Text style={styles.title}>Creer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez la communaute AfriWonder</Text>
        </View>

        {/* Method Toggle */}
        <View style={styles.methodToggle}>
          <TouchableOpacity
            style={[styles.methodTab, registerMethod === 'phone' && styles.methodTabActive]}
            onPress={() => { setRegisterMethod('phone'); setErrors({}); }}
          >
            <Ionicons name="call" size={18} color={registerMethod === 'phone' ? '#FFF' : Colors.textSecondary} />
            <Text style={[styles.methodTabText, registerMethod === 'phone' && styles.methodTabTextActive]}>Telephone</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodTab, registerMethod === 'email' && styles.methodTabActive]}
            onPress={() => { setRegisterMethod('email'); setErrors({}); }}
          >
            <Ionicons name="mail" size={18} color={registerMethod === 'email' ? '#FFF' : Colors.textSecondary} />
            <Text style={[styles.methodTabText, registerMethod === 'email' && styles.methodTabTextActive]}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Row */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Prenom"
                placeholder="Votre prenom"
                value={formData.firstName}
                onChangeText={(text) => { setFormData({ ...formData, firstName: text }); setErrors({}); }}
                autoCapitalize="words"
                error={errors.firstName}
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Nom"
                placeholder="Votre nom"
                value={formData.lastName}
                onChangeText={(text) => { setFormData({ ...formData, lastName: text }); setErrors({}); }}
                autoCapitalize="words"
                error={errors.lastName}
              />
            </View>
          </View>

          {/* Conditional: Phone or Email */}
          {registerMethod === 'phone' ? (
            <>
              {/* Country Selector */}
              <Text style={styles.label}>Pays</Text>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryName}>{selectedCountry.name}</Text>
                <Text style={styles.countryDial}>{selectedCountry.dial}</Text>
                <Ionicons name={showCountryPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {showCountryPicker && (
                <View style={styles.countryList}>
                  {COUNTRIES.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[styles.countryItem, country.code === selectedCountry.code && styles.countryItemActive]}
                      onPress={() => { setSelectedCountry(country); setShowCountryPicker(false); }}
                    >
                      <Text style={styles.countryItemFlag}>{country.flag}</Text>
                      <Text style={styles.countryItemName}>{country.name}</Text>
                      <Text style={styles.countryItemDial}>{country.dial}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Phone Input */}
              <Text style={styles.label}>Numero de telephone</Text>
              <View style={[styles.phoneInputContainer, errors.identifier && styles.inputError]}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>{selectedCountry.dial}</Text>
                </View>
                <View style={styles.phoneDivider} />
                <Input
                  placeholder="XX XX XX XX"
                  value={formData.phone}
                  onChangeText={(text) => { setFormData({ ...formData, phone: text }); setErrors({}); }}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
              </View>
              {errors.identifier && <Text style={styles.errorText}>{errors.identifier}</Text>}
            </>
          ) : (
            <Input
              label="Email"
              placeholder="votre@email.com"
              value={formData.email}
              onChangeText={(text) => { setFormData({ ...formData, email: text }); setErrors({}); }}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail"
              error={errors.identifier}
            />
          )}

          <Input
            label="Mot de passe"
            placeholder="Minimum 6 caracteres"
            value={formData.password}
            onChangeText={(text) => { setFormData({ ...formData, password: text }); setErrors({}); }}
            secureTextEntry
            icon="lock-closed"
            error={errors.password}
          />

          <Input
            label="Confirmer le mot de passe"
            placeholder="Confirmez votre mot de passe"
            value={formData.confirmPassword}
            onChangeText={(text) => { setFormData({ ...formData, confirmPassword: text }); setErrors({}); }}
            secureTextEntry
            icon="lock-closed"
            error={errors.confirmPassword}
          />

          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={() => setAcceptTerms(!acceptTerms)}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <Text style={styles.termsText}>
              J'accepte les{' '}
              <Text style={styles.termsLink}>Conditions Generales d'Utilisation</Text>
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

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou continuer avec</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#DB4437' }]}
            onPress={() => handleSocialRegister('Google')}
          >
            <Ionicons name="logo-google" size={22} color="#FFF" />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: '#4267B2' }]}
            onPress={() => handleSocialRegister('Facebook')}
          >
            <Ionicons name="logo-facebook" size={22} color="#FFF" />
            <Text style={styles.socialButtonText}>Facebook</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Deja un compte ?</Text>
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
    marginBottom: Spacing.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },

  // Method toggle
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.xxl,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  methodTabActive: {
    backgroundColor: Colors.primary,
  },
  methodTabText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  methodTabTextActive: {
    color: '#FFF',
  },

  // Form
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

  // Country selector
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  countryDial: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  countryList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    marginTop: -Spacing.sm,
    overflow: 'hidden',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  countryItemActive: {
    backgroundColor: Colors.primary + '15',
  },
  countryItemFlag: {
    fontSize: 20,
  },
  countryItemName: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  countryItemDial: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },

  // Phone input
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: Colors.error,
  },
  phonePrefix: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.border + '40',
  },
  phonePrefixText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  phoneDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },

  // Terms
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

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
  },

  // Social
  socialButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  socialButtonText: {
    color: '#FFF',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },

  // Footer
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
