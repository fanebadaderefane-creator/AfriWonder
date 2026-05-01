import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

type Filter = 'all' | 'active' | 'blocked' | 'expired';

export default function AdminCardsScreen() {
  return (
    <AdminListScreen<any, Filter>
      title="Cartes virtuelles"
      initialFilter="all"
      filters={[
        { id: 'all', label: 'Toutes' },
        { id: 'active', label: 'Actives' },
        { id: 'blocked', label: 'Bloquées' },
        { id: 'expired', label: 'Expirées' },
      ]}
      fetch={(f) => adminSuperAppApi.listVirtualCards(f === 'all' ? undefined : f)}
      keyExtractor={(c: any) => c.id}
      emptyLabel="Aucune carte"
      renderItem={(c: any, refresh) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>•••• {c.last4}</Text>
            <Text style={styles.sub}>
              @{c.user?.username} · {c.status} · expire {new Date(c.expires_at).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })}
            </Text>
            {c.spending_limit ? <Text style={styles.sub}>Limite : {c.spending_limit.toLocaleString('fr-FR')} FCFA</Text> : null}
          </View>
          {c.status === 'active' ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                Alert.alert('Bloquer cette carte ?', 'Action admin immédiate.', [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Bloquer', style: 'destructive',
                    onPress: async () => {
                      await adminSuperAppApi.forceBlockCard(c.id, 'admin_intervention');
                      refresh();
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="lock-closed" size={20} color="#FF3B30" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', letterSpacing: 2 },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
