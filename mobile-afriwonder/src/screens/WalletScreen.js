/**
 * WalletScreen — Mon Portefeuille (live / dons)
 * Réécriture RN depuis PWA RechargeWallet / live.getWallet()
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function WalletScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.live.getWallet();
      setWallet(data);
    } catch (e) {
      setError(e?.message || 'Impossible de charger le portefeuille');
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Portefeuille</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="wallet-outline" size={48} color="#6B7280" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadWallet}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <Text style={styles.balanceValue}>
              {Number(wallet?.balance ?? 0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="information-circle-outline" size={20} color="#60A5FA" />
            <Text style={styles.tipText}>
              Utilisez ce solde pour envoyer des cadeaux et des dons pendant les lives. Rechargez depuis la version web (PWA) ou bientôt depuis cette app.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9CA3AF', marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#2563EB', borderRadius: 12 },
  retryBtnText: { color: '#FFF', fontWeight: '600' },
  content: { padding: 16 },
  balanceCard: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  balanceLabel: { fontSize: 14, color: '#93C5FD', marginBottom: 8 },
  balanceValue: { fontSize: 28, fontWeight: '700', color: '#F9FAFB' },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  tipText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
});
