import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../src/api/client';
import { toAbsoluteMediaUrl } from '../../src/utils/absoluteMediaUrl';

type BlockedUser = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  profile_image?: string | null;
};

export default function BlockedAccountsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BlockedUser[]>([]);

  const load = async () => {
    try {
      const res = await apiClient.get('/me/settings/blocked');
      const data = res.data?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const unblock = async (id: string) => {
    try {
      await apiClient.delete(`/me/settings/blocked/${id}`);
      setItems((prev) => prev.filter((u) => u.id !== id));
    } catch {
      Alert.alert('Déblocage impossible', 'Ce compte n’a pas pu être débloqué. Vérifiez votre connexion et réessayez.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked accounts</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#FF2D55" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListEmptyComponent={<Text style={styles.empty}>No blocked accounts.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.left}>
                <Image
                  source={{ uri: toAbsoluteMediaUrl(item.profile_image || '') || 'https://ui-avatars.com/api/?name=User&background=EAEAEA&color=333' }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.name}>{item.full_name || item.username || 'User'}</Text>
                  <Text style={styles.handle}>@{(item.username || '').replace(/^@+/, '')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => void unblock(item.id)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  empty: { textAlign: 'center', marginTop: 40, color: '#777', fontSize: 15 },
  row: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#F7F7F7',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEE' },
  name: { fontSize: 15, fontWeight: '700', color: '#151515' },
  handle: { fontSize: 13, color: '#777', marginTop: 2 },
  unblockBtn: { backgroundColor: '#FF2D55', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  unblockText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
