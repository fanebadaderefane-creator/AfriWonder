import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/common/Button';
import { router } from 'expo-router';

const MENU_ITEMS = [
  { id: 'edit', icon: 'person', label: 'Modifier le profil', screen: 'editProfile' },
  { id: 'wallet', icon: 'wallet', label: 'Portefeuille', screen: 'wallet' },
  { id: 'orders', icon: 'receipt', label: 'Mes commandes', screen: 'orders' },
  { id: 'saved', icon: 'bookmark', label: 'Vid\u00e9os sauvegard\u00e9es', screen: 'saved' },
  { id: 'settings', icon: 'settings', label: 'Param\u00e8tres', screen: 'settings' },
  { id: 'help', icon: 'help-circle', label: 'Aide & Support', screen: 'help' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'D\u00e9connexion',
      '\u00cates-vous s\u00fbr de vouloir vous d\u00e9connecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'D\u00e9connexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleMenuPress = (screen: string) => {
    Alert.alert('Info', `${screen} sera disponible prochainement`);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Ionicons name="person-circle" size={100} color={Colors.textSecondary} />
        <Text style={styles.loginPromptTitle}>Bienvenue sur AfriWonder</Text>
        <Text style={styles.loginPromptSubtitle}>
          Connectez-vous pour acc\u00e9der \u00e0 votre profil et profiter de toutes les fonctionnalit\u00e9s
        </Text>
        <Button
          title="Se connecter"
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginButton}
        />
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.registerLink}>Cr\u00e9er un compte</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: user?.avatar || 'https://i.pravatar.cc/150' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.username}>@{user?.firstName?.toLowerCase()}{user?.lastName?.toLowerCase()}</Text>
          {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.videosCount || 0}</Text>
            <Text style={styles.statLabel}>Vid\u00e9os</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.followers || 0}</Text>
            <Text style={styles.statLabel}>Abonn\u00e9s</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.following || 0}</Text>
            <Text style={styles.statLabel}>Abonnements</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Modifier le profil"
            onPress={() => handleMenuPress('editProfile')}
            variant="outline"
            style={styles.editButton}
          />
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-social" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.screen)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon as any} size={22} color={Colors.text} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color={Colors.error} />
          <Text style={styles.logoutText}>D\u00e9connexion</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>AfriWonder v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  loginPromptTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  loginPromptSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  loginButton: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  bio: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  editButton: {
    flex: 1,
  },
  shareButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
  },
  logoutText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    fontWeight: '600',
  },
  version: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
});
