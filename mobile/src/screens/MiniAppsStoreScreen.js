import React, { useState, useMemo } from 'react';
import {
  FlatList,
  Image,
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
import { useAuth } from '../context/AuthContext';
import { MOCK_MINI_APPS, MOCK_CATEGORIES, MOCK_INSTALLED_APPS } from '../data/miniAppsMock';

export default function MiniAppsStoreScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [installedApps, setInstalledApps] = useState(new Set(MOCK_INSTALLED_APPS));

  const filteredApps = useMemo(() => {
    return MOCK_MINI_APPS.filter((app) => {
      const matchSearch = !searchQuery.trim() ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [searchQuery, selectedCategory]);

  const featuredApps = useMemo(() => MOCK_MINI_APPS.filter((a) => a.featured), []);
  const trendingApps = useMemo(() => [...MOCK_MINI_APPS].sort((a, b) => b.installs - a.installs).slice(0, 5), []);

  const handleInstall = (appId) => setInstalledApps((prev) => new Set([...prev, appId]));
  const handleUninstall = (appId) => {
    setInstalledApps((prev) => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
  };

  const openDetails = (app) => {
    navigation.navigate('MiniAppDetails', { id: app.id });
  };

  const renderAppCard = ({ item: app }) => {
    const installed = installedApps.has(app.id);
    return (
      <TouchableOpacity style={styles.appCard} onPress={() => openDetails(app)} activeOpacity={0.8}>
        <Image source={{ uri: app.icon }} style={styles.appIcon} />
        <Text style={styles.appName} numberOfLines={2}>{app.name}</Text>
        <Text style={styles.appMeta}>{app.rating?.toFixed(1)} · {app.installs?.toLocaleString?.() ?? app.installs} installs</Text>
        <TouchableOpacity
          style={[styles.installBtn, installed && styles.installedBtn]}
          onPress={(e) => { e.stopPropagation(); installed ? handleUninstall(app.id) : handleInstall(app.id); }}
        >
          <Text style={[styles.installBtnText, installed && styles.installedBtnText]}>{installed ? 'Désinstaller' : 'Installer'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Mini-Apps Store</Text>
          <Text style={styles.subtitle}>Plateforme ouverte de services</Text>
        </View>
        {user && (
          <TouchableOpacity onPress={() => navigation.navigate('DeveloperConsole')}>
            <Text style={styles.devLink}>Développeur</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une mini-app..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesWrap} contentContainerStyle={styles.categoriesContent}>
          {MOCK_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, selectedCategory === cat.id && styles.catLabelActive]} numberOfLines={1}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedCategory === 'all' && featuredApps.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>En vedette</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList} contentContainerStyle={styles.horizontalListContent}>
              {featuredApps.map((app) => (
                <TouchableOpacity key={app.id} style={styles.featuredCard} onPress={() => openDetails(app)}>
                  <Image source={{ uri: app.icon }} style={styles.featuredIcon} />
                  <Text style={styles.featuredName} numberOfLines={2}>{app.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {selectedCategory === 'all' && trendingApps.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Tendances</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList} contentContainerStyle={styles.horizontalListContent}>
              {trendingApps.map((app) => (
                <TouchableOpacity key={app.id} style={styles.trendCard} onPress={() => openDetails(app)}>
                  <Image source={{ uri: app.icon }} style={styles.trendIcon} />
                  <Text style={styles.trendName} numberOfLines={1}>{app.name}</Text>
                  <Text style={styles.trendInstalls}>{app.installs?.toLocaleString?.() ?? app.installs} installs</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Toutes les mini-apps</Text>
        </View>
        <View style={styles.grid}>
          {filteredApps.map((app) => (
            <View key={app.id} style={styles.gridItem}>
              {renderAppCard({ item: app })}
            </View>
          ))}
        </View>
        {filteredApps.length === 0 && (
          <Text style={styles.empty}>Aucune mini-app trouvée.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerCenter: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  devLink: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#111' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  categoriesWrap: { marginTop: 16 },
  categoriesContent: { paddingHorizontal: 16, gap: 8, paddingRight: 24 },
  catChip: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 76, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 10 },
  catChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catIcon: { fontSize: 22, marginBottom: 4 },
  catLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  catLabelActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginLeft: 8 },
  horizontalList: { marginBottom: 8 },
  horizontalListContent: { paddingHorizontal: 16, gap: 12, paddingRight: 24 },
  featuredCard: { width: 160, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginRight: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  featuredIcon: { width: 64, height: 64, borderRadius: 12, marginBottom: 8 },
  featuredName: { fontSize: 13, fontWeight: '600', color: '#111', textAlign: 'center' },
  trendCard: { width: 120, backgroundColor: '#fff', borderRadius: 12, padding: 10, marginRight: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  trendIcon: { width: 48, height: 48, borderRadius: 10, marginBottom: 6 },
  trendName: { fontSize: 12, fontWeight: '600', color: '#111' },
  trendInstalls: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 8 },
  gridItem: { width: '50%', padding: 6 },
  appCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  appIcon: { width: 56, height: 56, borderRadius: 12, marginBottom: 8 },
  appName: { fontSize: 13, fontWeight: '600', color: '#111', textAlign: 'center' },
  appMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  installBtn: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#2563eb', borderRadius: 8 },
  installedBtn: { backgroundColor: '#e5e7eb' },
  installBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  installedBtnText: { color: '#6b7280' },
  empty: { textAlign: 'center', color: '#6b7280', paddingVertical: 24, paddingHorizontal: 16 },
});
