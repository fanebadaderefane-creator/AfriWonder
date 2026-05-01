import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import AdminListScreen from '../../src/components/admin/AdminListScreen';
import adminSuperAppApi from '../../src/api/adminSuperAppApi';
import crowdfundingApi from '../../src/api/crowdfundingApi';

type Filter = 'all' | 'pending' | 'active' | 'funded' | 'failed' | 'rejected' | 'suspended' | 'draft';

function moderationErrorMessage(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string }; message?: string } } };
  return (
    ax?.response?.data?.error?.message ||
    ax?.response?.data?.message ||
    (e instanceof Error ? e.message : 'Action impossible.')
  );
}

function CrowdfundingAdminRow({ c, onRefresh }: { c: { id: string; title: string; status: string; current_amount?: number; goal_amount?: number; end_date?: string; creator?: { username?: string } }; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const st = c.status;
  const canModerate = st === 'pending';
  const canSuspend = st !== 'suspended' && st !== 'funded' && st !== 'failed' && st !== 'rejected' && st !== 'pending';

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      onRefresh();
    } catch (e) {
      Alert.alert('Erreur', moderationErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>
          {c.title}
        </Text>
        <Text style={styles.sub}>
          par @{c.creator?.username || '—'} · {Number(c.current_amount || 0).toLocaleString('fr-FR')} /{' '}
          {Number(c.goal_amount || 0).toLocaleString('fr-FR')} FCFA
        </Text>
        <Text style={styles.sub}>
          fin {c.end_date ? new Date(c.end_date).toLocaleDateString('fr-FR') : '—'} · {st}
        </Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} /> : null}
      {canModerate && !busy ? (
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.actionBtn}
            accessibilityLabel="Approuver la campagne"
            onPress={() => {
              Alert.alert('Approuver ?', 'La campagne devient visible et peut recevoir des contributions.', [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Approuver',
                  onPress: () => void run(() => crowdfundingApi.approveCampaign(c.id)),
                },
              ]);
            }}
          >
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            accessibilityLabel="Refuser la campagne"
            onPress={() => {
              Alert.alert('Refuser ?', 'La campagne sera marquée comme refusée.', [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Refuser',
                  style: 'destructive',
                  onPress: () => void run(() => crowdfundingApi.rejectCampaign(c.id)),
                },
              ]);
            }}
          >
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ) : null}
      {canSuspend && !canModerate ? (
        <TouchableOpacity
          style={styles.actionBtn}
          accessibilityLabel="Suspendre la campagne"
          disabled={busy}
          onPress={() => {
            Alert.alert('Suspendre la campagne ?', 'Elle ne sera plus visible publiquement.', [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Suspendre',
                style: 'destructive',
                onPress: () =>
                  void run(() => adminSuperAppApi.suspendCrowdfundingCampaign(c.id, { reason: 'admin_super_app' })),
              },
            ]);
          }}
        >
          <Ionicons name="pause-circle" size={22} color="#FF3B30" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function AdminCrowdfundingScreen() {
  return (
    <AdminListScreen<any, Filter>
      title="Crowdfunding"
      fetch={(f) => adminSuperAppApi.listCrowdfundingCampaigns(f === 'all' ? undefined : f)}
      filters={[
        { id: 'all', label: 'Tous' },
        { id: 'pending', label: 'En attente' },
        { id: 'active', label: 'Actives' },
        { id: 'funded', label: 'Financées' },
        { id: 'failed', label: 'Échouées' },
        { id: 'rejected', label: 'Refusées' },
        { id: 'suspended', label: 'Suspendues' },
        { id: 'draft', label: 'Brouillons' },
      ]}
      initialFilter="pending"
      keyExtractor={(c) => c.id}
      emptyLabel="Aucune campagne"
      renderItem={(c: any, refresh) => (
        <CrowdfundingAdminRow c={c} onRefresh={refresh} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actionGroup: { flexDirection: 'row', alignItems: 'center' },
});
