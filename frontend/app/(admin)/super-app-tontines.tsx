import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

type Filter = 'all' | 'draft' | 'active' | 'completed' | 'cancelled';

export default function AdminTontinesScreen() {
  return (
    <AdminListScreen<any, Filter>
      title="Tontines"
      fetch={(f) => adminSuperAppApi.listTontines(f === 'all' ? undefined : f)}
      filters={[
        { id: 'all', label: 'Tous' },
        { id: 'draft', label: 'Draft' },
        { id: 'active', label: 'Actives' },
        { id: 'completed', label: 'Terminées' },
        { id: 'cancelled', label: 'Annulées' },
      ]}
      initialFilter="all"
      keyExtractor={(t) => t.id}
      emptyLabel="Aucune tontine"
      renderItem={(t: any, refresh) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t.name}</Text>
            <Text style={styles.sub}>
              par @{t.creator?.username || '—'} · {t._count?.members ?? 0} membres · {t._count?.cycles ?? 0} cycles
            </Text>
            <Text style={styles.sub}>
              {t.contribution_amount?.toLocaleString('fr-FR')} {t.currency} / {t.frequency} · statut {t.status}
            </Text>
          </View>
          {t.status !== 'cancelled' && t.status !== 'completed' ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                Alert.alert('Annuler la tontine ?', 'Cette action est immédiate et loggée.', [
                  { text: 'Fermer', style: 'cancel' },
                  {
                    text: 'Annuler', style: 'destructive',
                    onPress: async () => {
                      await adminSuperAppApi.forceCancelTontine(t.id, 'admin_intervention');
                      refresh();
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
