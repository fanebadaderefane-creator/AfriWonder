import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

type Tab = 'providers' | 'payments';

export default function AdminBillsScreen() {
  return (
    <AdminListScreen<any, Tab>
      title="Factures utilitaires"
      initialFilter="providers"
      filters={[
        { id: 'providers', label: 'Providers' },
        { id: 'payments', label: 'Paiements' },
      ]}
      fetch={async (f) => {
        if (f === 'providers') return adminSuperAppApi.listBillProviders();
        return adminSuperAppApi.listBillPayments();
      }}
      keyExtractor={(r: any) => r.id}
      emptyLabel="Aucune donnée"
      renderItem={(r: any, refresh) => {
        if (r.slug) {
          // Provider
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.name}</Text>
                <Text style={styles.sub}>{r.category} · {r.country} · {r._count?.payments ?? 0} paiements</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(r.is_active ? 'Désactiver ?' : 'Activer ?', r.name, [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Confirmer',
                      onPress: async () => {
                        await adminSuperAppApi.updateBillProvider(r.id, { is_active: !r.is_active });
                        refresh();
                      },
                    },
                  ]);
                }}
                style={styles.actionBtn}
              >
                <Ionicons name={r.is_active ? 'checkmark-circle' : 'close-circle-outline'} size={22} color={r.is_active ? '#4CAF50' : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }
        // Payment
        return (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{r.provider?.name} · {r.amount_fcfa?.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.sub}>
                @{r.user?.username} · {r.account_ref} · {r.status} · {r.payment_method}
              </Text>
              <Text style={styles.sub}>Ref : {r.reference}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
