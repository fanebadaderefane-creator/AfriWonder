import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes } from '../src/theme/colors';
import apiClient from '../src/api/client';

type Collection = { id: string; name: string; save_count?: number };

export default function SavedCollectionsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/saves/collections');
      const inner = res.data?.data ?? res.data;
      const list = Array.isArray(inner) ? inner : [];
      setItems(list);
    } catch {
      setItems([]);
      Alert.alert('Collections', 'Impossible de charger vos dossiers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCollection = async () => {
    const name = newName.trim();
    if (name.length < 1) return;
    try {
      await apiClient.post('/saves/collections', { name });
      setNewName('');
      await load();
    } catch {
      Alert.alert('Collections', 'Impossible de créer ce dossier.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes collections</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={styles.hint}>
        Organisez vos sauvegardes par thème. Les sauvegardes restent privées (visible uniquement par vous).
      </Text>
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          placeholder="Nouveau dossier…"
          placeholderTextColor={Colors.textMuted}
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={styles.createBtn} onPress={() => void createCollection()}>
          <Text style={styles.createBtnText}>Créer</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun dossier pour l’instant — créez-en un ci-dessus.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Ionicons name="folder-open" size={22} color={Colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.save_count != null ? (
                  <Text style={styles.cardMeta}>{item.save_count} sauvegarde(s)</Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  createRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 8, marginBottom: Spacing.md },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  createBtnText: { color: '#000', fontWeight: '800', fontSize: FontSizes.sm },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  cardMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
});
