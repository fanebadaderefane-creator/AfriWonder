import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontSizes, Spacing } from '../../src/theme/colors';

export default function AfricoinReferralFriendsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ami(e)s ayant rechargé</Text>
        <TouchableOpacity style={styles.iconBtn} accessibilityLabel="Liste">
          <Ionicons name="list-outline" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      <View style={styles.empty}>
        <Ionicons name="happy-outline" size={72} color="#ccc" />
        <Text style={styles.emptyTitle}>Aucun(e) pour le moment</Text>
        <Text style={styles.emptySub}>
          Dès qu’un(e) ami(e) éligible aura rechargé, tu obtiendras du cash back sur ses achats de Pièces pendant les 7 jours
          suivants (règles produit AfriWonder).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: FontSizes.md, color: '#111' },
  empty: { flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '900', color: '#111', textAlign: 'center' },
  emptySub: { marginTop: 10, fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});
