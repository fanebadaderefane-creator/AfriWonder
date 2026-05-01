import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';

export default function AdminDoctorsPendingScreen() {
  return (
    <AdminListScreen<any, 'pending'>
      title="Médecins — KYC à valider"
      fetch={() => adminSuperAppApi.pendingDoctors()}
      keyExtractor={(d: any) => d.id}
      emptyLabel="Aucun médecin en attente"
      renderItem={(d: any, refresh) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{d.user?.full_name || d.user?.username}</Text>
            <Text style={styles.sub}>{d.user?.email} · {d.city ?? '—'}</Text>
            <Text style={styles.sub}>Status KYC : {d.kyc_status}</Text>
            {d.kyc_document_url ? <Text style={styles.sub}>Document fourni</Text> : null}
          </View>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => {
              Alert.alert(
                'Valider le KYC',
                `Approuver le profil médecin de ${d.user?.full_name || d.user?.username} ?`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Approuver',
                    onPress: () => {
                      void (async () => {
                        try {
                          await adminSuperAppApi.approveDoctorKyc(d.id);
                          await refresh();
                        } catch (e: unknown) {
                          const msg = e && typeof e === 'object' && 'response' in e
                            ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
                            : null;
                          Alert.alert('Action impossible', msg || 'Réessayez dans quelques instants.');
                        }
                      })();
                    },
                  },
                ],
              );
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.approveBtnText}>Approuver</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  approveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSizes.sm },
});
