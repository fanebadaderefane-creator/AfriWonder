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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!password) {
      newErrors.password = 'Mot de passe requis';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      await setAuth(response.user, response.accessToken, response.refreshToken);
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur de connexion';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert('Info', `Connexion ${provider} bientôt disponible`);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="play" size={30} color={Colors.text} />
          </View>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Bienvenue sur AfriWonder</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="votre@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
            error={errors.email}
          />

          <Input
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon="lock-closed"
            error={errors.password}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            size="large"
            style={styles.loginButton}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: '#DB4437' }]}
            onPress={() => handleSocialLogin('Google')}
          >
            <Ionicons name="logo-google" size={24} color={Colors.text} />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: '#4267B2' }]}
            onPress={() => handleSocialLogin('Facebook')}
          >
            <Ionicons name="logo-facebook" size={24} color={Colors.text} />
            <Text style={styles.socialButtonText}>Facebook</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}> Créer un compte</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
  },
  loginButton: {
    width: '100%',
  },
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
    paddingHorizontal: Spacing.lg,
    fontSize: FontSizes.sm,
  },
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
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
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
