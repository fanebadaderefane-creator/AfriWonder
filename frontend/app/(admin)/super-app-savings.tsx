import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

type Filter = 'all' | 'active' | 'paused' | 'closed';

export default function AdminSavingsScreen() {
  return (
    <AdminListScreen<any, Filter>
      title="Plans d'épargne"
      initialFilter="all"
      filters={[
        { id: 'all', label: 'Tous' },
        { id: 'active', label: 'Actifs' },
        { id: 'paused', label: 'Pause' },
        { id: 'closed', label: 'Clôturés' },
      ]}
      fetch={(f) => adminSuperAppApi.listSavingsPlans(f === 'all' ? undefined : f)}
      keyExtractor={(p: any) => p.id}
      emptyLabel="Aucun plan"
      renderItem={(p: any) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{p.name}</Text>
            <Text style={styles.sub}>@{p.user?.username} · {p.frequency} · statut {p.status}</Text>
            <Text style={styles.sub}>
              Solde : {p.balance?.toLocaleString('fr-FR')} {p.currency} · contribution {p.contribution_amount?.toLocaleString('fr-FR')}
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
