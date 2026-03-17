import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function formatPrice(amount, currency) {
  if (currency?.code) {
    return `${Number(amount).toFixed(0)} ${currency.code}`;
  }
  return `${Number(amount).toFixed(0)}`;
}

export default function GroupBuysScreen({ navigation }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await api.me
          .getGroupBuys({ page: 1, limit: 50 })
          .catch(() => null);
        if (!cancelled) {
          const list = res?.groups ?? res?.data?.groups ?? [];
          setGroups(Array.isArray(list) ? list : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const currency = null; // mobile: placeholder, reuse server-side FCFA by default

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
        <Text style={styles.headerTitle}>Mes groupes d'achat</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="people-outline"
            size={52}
            color="#d1d5db"
          />
          <Text style={styles.emptyTitle}>
            Vous n'avez rejoint aucun groupe d'achat.
          </Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.secondaryBtnText}>
              Voir le marketplace
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const product = item.product || item;
            const totalQty = (item.participants || []).reduce(
              (s, p) => s + (p.quantity || 0),
              0,
            );
            const img =
              (Array.isArray(product.image)
                ? product.image[0]
                : product.image) || null;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('Product', {
                    id: product.id,
                  })
                }
              >
                {img ? (
                  <Image
                    source={{ uri: img }}
                    style={styles.cardImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.cardImage,
                      styles.cardImagePlaceholder,
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color="#9ca3af"
                    />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={2}
                  >
                    {product.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {totalQty} / {item.min_quantity} participants
                  </Text>
                  <Text style={styles.cardPrice}>
                    {formatPrice(
                      product.price,
                      currency,
                    )}{' '}
                    × {item.my_quantity || 1}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryBtnText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 10,
  },
  cardImagePlaceholder: {
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  cardPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
});

