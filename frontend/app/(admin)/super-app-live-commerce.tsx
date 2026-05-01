import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

export default function AdminLiveCommerceScreen() {
  return (
    <AdminListScreen<any, 'top'>
      title="Live commerce — Top produits"
      fetch={() => adminSuperAppApi.topLiveCommerce()}
      keyExtractor={(p: any) => p.id}
      emptyLabel="Aucun produit épinglé"
      renderItem={(p: any) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{p.product?.name}</Text>
            <Text style={styles.sub}>
              Live : {p.live_stream?.title} · créateur {p.live_stream?.creator_name}
            </Text>
            <Text style={styles.sub}>
              {p.clicks_count} clics · {p.product?.price?.toLocaleString('fr-FR')} {p.product?.currency || 'FCFA'}
              {p.is_flash_deal ? ' · ⚡ flash' : ''}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
});
