/**
 * Écran admin · Diagnostic réseau.
 *
 * Permet de mesurer en conditions réelles (depuis n'importe quel device en Mali / Sénégal /
 * Côte d'Ivoire ou ailleurs) :
 *  - Latence backend (5 pings vers `/health`)
 *  - Jitter (instabilité réseau)
 *  - Taux de réussite
 *  - Débit upload (test 100 Ko vers `/api/proxy/health` en POST factice)
 *
 * Usage : ouvrir `/(admin)/network-diagnostic`. Le rapport généré est copiable
 * dans le presse-papier pour partage rapide via WhatsApp / mail support.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { getBackendOrigin } from '../../src/config/backendBase';
import { applyAfriDeviceTrustToFetchInit } from '../../src/utils/afwDeviceRequestId';
import {
  classifyNetwork,
  computePingStats,
  computeThroughputKbps,
  formatDiagnosticReport,
  type DiagnosticReport,
  type NetworkClassification,
  type PingSample,
  type PingStats,
  type ThroughputStats,
} from '../../src/lib/networkDiagnostic';

const PING_COUNT = 5;
const PING_TIMEOUT_MS = 8_000;
const THROUGHPUT_BYTES = 100_000;
const THROUGHPUT_TIMEOUT_MS = 30_000;

async function pingHealthOnce(origin: string, timeoutMs: number): Promise<PingSample> {
  const url = `${origin.replace(/\/$/, '')}/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      /* */
    }
  }, timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(
      url,
      applyAfriDeviceTrustToFetchInit({
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }),
    );
    clearTimeout(timer);
    return {
      durationMs: Date.now() - t0,
      ok: res.ok,
      statusCode: res.status,
    };
  } catch (e: unknown) {
    clearTimeout(timer);
    return {
      durationMs: Date.now() - t0,
      ok: false,
      errorMessage: e instanceof Error ? e.message : 'unknown',
    };
  }
}

async function measureThroughput(origin: string): Promise<ThroughputStats> {
  const url = `${origin.replace(/\/$/, '')}/health`;
  const payload = new Uint8Array(THROUGHPUT_BYTES).fill(65);
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch {
      /* */
    }
  }, THROUGHPUT_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(
      url,
      applyAfriDeviceTrustToFetchInit({
        method: 'POST',
        signal: controller.signal,
        body: payload,
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    );
    clearTimeout(timer);
    return computeThroughputKbps({
      bytes: THROUGHPUT_BYTES,
      durationMs: Date.now() - t0,
      ok: res.status < 500,
    });
  } catch {
    clearTimeout(timer);
    return computeThroughputKbps({
      bytes: THROUGHPUT_BYTES,
      durationMs: Date.now() - t0,
      ok: false,
    });
  }
}

export default function NetworkDiagnosticScreen() {
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [classification, setClassification] = useState<NetworkClassification | null>(null);
  const [stats, setStats] = useState<PingStats | null>(null);
  const [throughput, setThroughput] = useState<ThroughputStats | null>(null);

  const runDiagnostic = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setReport(null);
    setStats(null);
    setClassification(null);
    setThroughput(null);
    const origin = getBackendOrigin();
    try {
      const samples: PingSample[] = [];
      for (let i = 0; i < PING_COUNT; i += 1) {
        setProgress(`Ping ${i + 1}/${PING_COUNT}…`);
        const sample = await pingHealthOnce(origin, PING_TIMEOUT_MS);
        samples.push(sample);
      }
      const pingStats = computePingStats(samples);
      const cls = classifyNetwork(pingStats);
      setStats(pingStats);
      setClassification(cls);

      setProgress('Test de débit (100 Ko)…');
      const tp = await measureThroughput(origin);
      setThroughput(tp);

      const finalReport: DiagnosticReport = {
        generatedAt: new Date().toISOString(),
        backendOrigin: origin,
        pingStats,
        classification: cls,
        throughput: tp,
        notes: {
          appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'unknown',
        },
      };
      setReport(finalReport);
      setProgress('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      Alert.alert('Diagnostic interrompu', msg);
    } finally {
      setRunning(false);
    }
  }, [running]);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    try {
      await Clipboard.setStringAsync(formatDiagnosticReport(report));
      Alert.alert('Diagnostic', 'Rapport copié dans le presse-papier.');
    } catch {
      Alert.alert('Diagnostic', 'Impossible de copier le rapport.');
    }
  }, [report]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnostic réseau</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>À quoi ça sert</Text>
          <Text style={styles.cardText}>
            Mesure la latence et la stabilité de la connexion entre cet appareil et le serveur AfriWonder.
            Lance le test depuis le Mali / Sénégal / CI pour avoir des chiffres réels et identifier si une
            erreur d'upload vient du réseau, du serveur, ou de l'app.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.runBtn, running && styles.runBtnDisabled]}
          onPress={runDiagnostic}
          disabled={running}
        >
          {running ? (
            <>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.runBtnText}>{progress || 'Test en cours…'}</Text>
            </>
          ) : (
            <>
              <Ionicons name="speedometer" size={20} color="#FFF" />
              <Text style={styles.runBtnText}>Lancer le diagnostic</Text>
            </>
          )}
        </TouchableOpacity>

        {classification ? (
          <View
            style={[
              styles.qualityBox,
              { backgroundColor: qualityColor(classification.quality) },
            ]}
          >
            <Text style={styles.qualityLabel}>{classification.quality.toUpperCase()}</Text>
            <Text style={styles.qualityReason}>{classification.reason}</Text>
          </View>
        ) : null}

        {stats ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Latence backend</Text>
            <Row label="Tentatives" value={String(stats.attempts)} />
            <Row label="Réussites" value={`${stats.successes} / ${stats.attempts}`} />
            <Row label="Taux succès" value={`${Math.round(stats.successRate * 100)}%`} />
            <Row label="Latence moyenne" value={`${stats.avgMs ?? '—'} ms`} />
            <Row label="Latence min" value={`${stats.minMs ?? '—'} ms`} />
            <Row label="Latence max" value={`${stats.maxMs ?? '—'} ms`} />
            <Row label="Jitter" value={`${stats.jitterMs ?? '—'} ms`} />
          </View>
        ) : null}

        {throughput ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Débit upload</Text>
            <Row label="Taille testée" value={`${throughput.bytes} octets`} />
            <Row label="Durée" value={`${throughput.durationMs} ms`} />
            <Row label="Débit" value={throughput.kbps != null ? `${throughput.kbps} kbps` : '— (échec)'} />
          </View>
        ) : null}

        {report ? (
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={18} color={Colors.text} />
            <Text style={styles.copyBtnText}>Copier le rapport (presse-papier)</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Repères</Text>
          <Text style={styles.cardText}>
            • Excellent : ‹ 150 ms — fibre / 4G+{'\n'}
            • Good : 150-400 ms — 4G normal{'\n'}
            • Fair : 400-800 ms — 3G ou 4G saturé{'\n'}
            • Poor : › 800 ms ou jitter › 300 ms — 2G / instable{'\n'}
            • Unusable : taux d'échec › 50 %
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function qualityColor(q: NetworkClassification['quality']): string {
  switch (q) {
    case 'excellent':
      return 'rgba(46,204,113,0.18)';
    case 'good':
      return 'rgba(52,152,219,0.18)';
    case 'fair':
      return 'rgba(241,196,15,0.18)';
    case 'poor':
      return 'rgba(230,126,34,0.18)';
    default:
      return 'rgba(231,76,60,0.18)';
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    gap: 6,
  },
  cardTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800', marginBottom: 4 },
  cardText: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 14, borderRadius: BorderRadius.full,
  },
  runBtnDisabled: { opacity: 0.7 },
  runBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.md },
  qualityBox: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    gap: 4,
  },
  qualityLabel: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '900' },
  qualityReason: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  rowValue: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '700' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
  },
  copyBtnText: { color: Colors.text, fontWeight: '700' },
});
