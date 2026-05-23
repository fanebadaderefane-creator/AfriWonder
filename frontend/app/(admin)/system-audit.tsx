import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import adminSuperAppApi, { type SystemAuditPayload } from '../../src/api/adminSuperAppApi';

const ROWS: { key: keyof SystemAuditPayload; label: string }[] = [
  { key: 'e2eTests', label: 'Tests E2E (Playwright)' },
  { key: 'microservicesReady', label: 'Architecture modulaire (routes domaine)' },
  { key: 'cdnEnabled', label: 'Médias / CDN (R2 configuré)' },
  { key: 'scalableWebSocket', label: 'WebSocket scalable (REDIS_URL)' },
  { key: 'realMobileMoney', label: 'Paiements production (Orange / Wave / MTN)' },
];

export default function SystemAuditScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<SystemAuditPayload | null>(null);
  const [fixBusy, setFixBusy] = useState(false);
  const [fixMsg, setFixMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFixMsg(null);
    try {
      const a = await adminSuperAppApi.systemAudit();
      setAudit(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAutoFixReport = useCallback(async () => {
    setFixBusy(true);
    setFixMsg(null);
    try {
      const r = await adminSuperAppApi.systemAuditAutoFix();
      if (!r) {
        setFixMsg('Réponse vide ou accès refusé.');
        return;
      }
      const applied = r.actions.filter((x) => x.status === 'applied').length;
      const partial = r.actions.filter((x) => x.status === 'partial').length;
      const art = (r.appliedArtifacts?.length ?? 0) > 0 ? `\nFichiers : ${r.appliedArtifacts!.length}` : '';
      const sum = r.summary ? `\n${r.summary}` : '';
      setFixMsg(
        `Auto-fix : ${applied} appliquée(s), ${partial} partielle(s).${art}${sum}`,
      );
      setAudit(r.audit);
    } finally {
      setFixBusy(false);
    }
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Audit système</Text>
        <TouchableOpacity onPress={() => void load()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Actualiser">
          <Ionicons name="refresh" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!audit ? (
            <Text style={styles.err}>Impossible de charger l’audit (droits admin ou API).</Text>
          ) : (
            <>
              <View style={styles.banner}>
                <Text style={styles.env}>Environnement : {audit.environment}</Text>
                <Text style={[styles.ready, { color: audit.productionReady ? '#2e7d32' : '#c62828' }]}>
                  {audit.productionReady ? 'Prêt production (tous les critères)' : 'Non prêt production'}
                </Text>
              </View>

              {ROWS.map(({ key, label }) => {
                const ok = Boolean(audit[key]);
                return (
                  <View key={key} style={styles.row}>
                    <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={26} color={ok ? '#2e7d32' : '#c62828'} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>{label}</Text>
                      <Text style={styles.rowDetail}>{audit.details[key]}</Text>
                    </View>
                  </View>
                );
              })}

              {Array.isArray(audit.deliveryPlan) && audit.deliveryPlan.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.rowLabel, { marginBottom: 8 }]}>Plan de livraison (réel)</Text>
                  {audit.deliveryPlan
                    .slice()
                    .sort((a, b) => a.priority - b.priority)
                    .map((task) => (
                      <View key={task.id} style={styles.row}>
                        <Ionicons
                          name={task.status === 'ok' ? 'checkmark-circle' : task.status === 'partial' ? 'alert-circle' : 'time'}
                          size={24}
                          color={task.status === 'ok' ? '#2e7d32' : task.status === 'partial' ? '#ef6c00' : '#9e9e9e'}
                        />
                        <View style={styles.rowText}>
                          <Text style={styles.rowLabel}>{task.priority}. {task.title}</Text>
                          <Text style={styles.rowDetail}>{task.proof}</Text>
                        </View>
                      </View>
                    ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.btn, fixBusy && { opacity: 0.6 }]}
                onPress={() => void runAutoFixReport()}
                disabled={fixBusy}
                accessibilityRole="button"
                accessibilityLabel="Générer le rapport auto-fix"
              >
                <Text style={styles.btnText}>{fixBusy ? '…' : 'Auto-fix (artefacts + audit)'}</Text>
              </TouchableOpacity>
              {fixMsg ? <Text style={styles.fixMsg}>{fixMsg}</Text> : null}
            </>
          )}
          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  err: { color: Colors.textSecondary, fontSize: FontSizes.md },
  banner: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  env: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  ready: { fontSize: FontSizes.lg, fontWeight: '700', marginTop: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  rowText: { flex: 1 },
  rowLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  rowDetail: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4, lineHeight: 18 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSizes.md },
  fixMsg: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: Spacing.md, lineHeight: 20 },
});
