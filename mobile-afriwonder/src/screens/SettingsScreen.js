/**
 * SettingsScreen — Paramètres (réécriture RN depuis PWA Settings.jsx)
 * Menu principal : Modifier le profil, Notifications, Confidentialité, Mode données, Adresses, Langue, Apparence, Aide, Déconnexion.
 * Section Modifier le profil : avatar, nom, bio, lieu, site, sauvegarder.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Constants from 'expo-constants';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const isExpoGo = () => Constants.appOwnership === 'expo';

const menuItems = [
  { id: 'profile', icon: 'person-outline', label: 'Modifier le profil', color: '#3B82F6' },
  { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', color: '#3B82F6' },
  { id: 'privacy', icon: 'shield-checkmark-outline', label: 'Confidentialité', color: '#3B82F6' },
  { id: 'data', icon: 'cellular-outline', label: 'Mode données', color: '#7C3AED' },
  { id: 'addresses', icon: 'location-outline', label: 'Adresses de livraison', color: '#3B82F6' },
  { id: 'language', icon: 'language-outline', label: 'Langue', color: '#06B6D4' },
  { id: 'appearance', icon: 'moon-outline', label: 'Apparence', color: '#6B7280' },
  { id: 'help', icon: 'help-circle-outline', label: 'Aide', color: '#EAB308' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { logout, setUser: setAuthUser } = useAuth();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('main');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    location: '',
    website: '',
    profile_image: '',
  });

  const loadUser = useCallback(async () => {
    try {
      const u = await api.auth.me();
      setUser(u);
      setProfileData({
        full_name: u.full_name || '',
        bio: u.bio || '',
        location: u.location || '',
        website: u.website || '',
        profile_image: u.profile_image || '',
      });
    } catch (_e) {
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    try {
      await api.auth.updateMe(profileData);
      const updated = await api.auth.me();
      setUser(updated);
      setAuthUser?.(updated);
      setActiveSection('main');
    } catch (_err) {
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [profileData, setAuthUser]);

  const handleAvatarPress = useCallback(async () => {
    if (isExpoGo()) {
      Alert.alert('Expo Go', 'Changer la photo de profil necessite un build de dev (npx expo run:android) ou la PWA.');
      return;
    }
    let ImagePicker;
    try {
      const mod = await import('expo-image-picker');
      ImagePicker = mod.default ?? mod;
    } catch (e) {
      Alert.alert(
        'Module indisponible',
        'Mettez à jour Expo Go (Play Store) ou lancez l’app avec un build de développement (npm run android).'
      );
      return;
    }
    if (typeof ImagePicker?.requestMediaLibraryPermissionsAsync !== 'function') {
      Alert.alert('Erreur', 'Sélection d’image non disponible');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Accès à la galerie requis');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      const name = uri.split('/').pop() || `image_${Date.now()}.jpg`;
      const type = 'image/jpeg';
      const res = await api.upload.image({ uri, name, type });
      const fileUrl = res?.file_url || res?.url;
      if (!fileUrl) throw new Error('Pas d’URL reçue');
      await api.auth.updateMe({ profile_image: fileUrl });
      setProfileData((prev) => ({ ...prev, profile_image: fileUrl }));
      const updated = await api.auth.me();
      setUser(updated);
      setAuthUser?.(updated);
    } catch (e) {
      Alert.alert('Erreur', 'Erreur lors du téléchargement');
    }
  }, [setAuthUser]);

  const handleLogout = useCallback(() => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paramètres</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (activeSection === 'profile') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveSection('main')} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le profil</Text>
          <TouchableOpacity onPress={handleSaveProfile} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handleAvatarPress}>
                {profileData.profile_image || user?.profile_image ? (
                  <Image source={{ uri: profileData.profile_image || user?.profile_image }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>{(profileData.full_name || user?.full_name || 'U')[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.changePhotoLabel}>Changer la photo</Text>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.label}>Nom complet</Text>
              <TextInput
                style={styles.input}
                value={profileData.full_name}
                onChangeText={(t) => setProfileData((prev) => ({ ...prev, full_name: t }))}
                placeholder="Nom complet"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profileData.bio}
                onChangeText={(t) => setProfileData((prev) => ({ ...prev, bio: t }))}
                placeholder="Parlez de vous..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
              <Text style={styles.label}>Localisation</Text>
              <TextInput
                style={styles.input}
                value={profileData.location}
                onChangeText={(t) => setProfileData((prev) => ({ ...prev, location: t }))}
                placeholder="Dakar, Sénégal"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.label}>Site web</Text>
              <TextInput
                style={styles.input}
                value={profileData.website}
                onChangeText={(t) => setProfileData((prev) => ({ ...prev, website: t }))}
                placeholder="https://..."
                placeholderTextColor="#6B7280"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (activeSection === 'appearance') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveSection('main')} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apparence</Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionDesc}>Choisir le thème de l'application</Text>
          <Text style={styles.comingSoon}>Thème clair / sombre — à venir</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (activeSection === 'data') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveSection('main')} style={styles.backBtn} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mode données</Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.comingSoon}>Mode données (auto / lite) — à venir</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main menu
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.userCard}>
          {user?.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>{(user?.full_name || 'U')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name || 'Utilisateur'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuRow}
              onPress={() => {
                if (item.id === 'language') navigation.navigate('Support');
                else if (item.id === 'help') navigation.navigate('Support');
                else if (item.id === 'notifications') navigation.navigate('Notifications');
                else if (item.id === 'addresses') navigation.navigate('Support');
                else setActiveSection(item.id);
              }}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={22} color="#3B82F6" />
          </View>
          <Text style={styles.logoutLabel}>Déconnexion</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0 • Fabriqué en Afrique 🌍</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB', flex: 1 },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#3B82F6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  userAvatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 24, fontWeight: '700', color: '#F9FAFB' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 17, fontWeight: '700', color: '#F9FAFB' },
  userEmail: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  menuCard: { backgroundColor: '#111827', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: '#F9FAFB' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 16,
    marginBottom: 24,
  },
  logoutIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logoutLabel: { fontSize: 16, fontWeight: '500', color: '#3B82F6' },
  version: { textAlign: 'center', fontSize: 12, color: '#6B7280' },
  avatarSection: { alignItems: 'center', marginVertical: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoLabel: { marginTop: 8, fontSize: 14, color: '#3B82F6', fontWeight: '500' },
  formCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#9CA3AF', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F9FAFB',
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  sectionCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, margin: 16 },
  sectionDesc: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  comingSoon: { fontSize: 14, color: '#6B7280' },
});
