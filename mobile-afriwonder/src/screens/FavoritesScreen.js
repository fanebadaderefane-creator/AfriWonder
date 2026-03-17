import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import ProviderCard from '../components/ProviderCard';
import { useAuth } from '../context/AuthContext';

async function fetchFavorites(userEmail) {
  if (!userEmail) return [];
  try {
    if (api.favorites?.list) {
      return await api.favorites.list({ user_email: userEmail });
    }
  } catch (_) {
    // ignore
  }
  return [];
}

async function fetchAllProviders() {
  const data = await api.providers.list({}).catch(() => []);
  return Array.isArray(data)
    ? data
    : data?.providers ?? data?.data ?? [];
}

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fav, cats] = await Promise.all([
          fetchFavorites(user.email),
          (async () => {
            try {
              if (api.serviceCategories?.list) {
                return await api.serviceCategories.list();
              }
            } catch (_) {
              return [];
            }
          })(),
        ]);
        if (cancelled) return;
        setFavorites(Array.isArray(fav) ? fav : []);
        const providerIds = fav.map(
          (f) => f.provider_profile_id || f.providerId,
        );
        if (providerIds.length === 0) {
          setProviders([]);
          setCategories(Array.isArray(cats) ? cats : []);
          return;
        }
        const allProviders = await fetchAllProviders();
        if (cancelled) return;
        const filtered = allProviders.filter((p) =>
          providerIds.includes(p.id),
        );
        setProviders(filtered);
        setCategories(Array.isArray(cats) ? cats : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const categoryMap = {};
  categories.forEach((c) => {
    categoryMap[c.id] = c.name;
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Favoris</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : providers.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="heart-outline"
            size={52}
            color="#9ca3af"
          />
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptyText}>
            Ajoutez des prestataires à vos favoris pour les
            retrouver facilement.
          </Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => String(item.id)}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.providerCardWrap}>
              <ProviderCard
                provider={item}
                categoryName={
                  categoryMap[item.category_id] || ''
                }
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  providerCardWrap: {
    marginBottom: 12,
  },
});

