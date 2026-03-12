import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

// expo-clipboard exige un dev build ; en Expo Go le module natif est absent → fallback Share
const copyToClipboard = async (text) => {
  try {
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
};

const REWARD_LABELS = {
  early_supporter: 'Badge Early Supporter',
  visibility_boost: 'Boost visibilité',
  algorithm_priority: 'Priorité algorithme',
  special_badge: 'Badge spécial',
  fast_monetization: 'Accès monétisation rapide',
};

export default function ReferralsScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState(null);
  const [fallbackCode, setFallbackCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const displayCode = stats?.code || fallbackCode || '';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.referrals.getStats();
        if (mounted) {
          setStats(data);
          if (!data?.code) {
            const code = await api.referrals.getCode().catch(() => '');
            if (mounted && code) setFallbackCode(code);
          }
        }
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const copyCode = async () => {
    const text = displayCode || '';
    const ok = await copyToClipboard(text);
    if (ok) {
      Alert.alert('Succès', text ? 'Code copié !' : 'Code non disponible');
    } else {
      Share.share({ message: text || 'Code non disponible' }).catch(() => {});
    }
  };

  const copyLink = async () => {
    const url = `https://afriwonder.com/?ref=${encodeURIComponent(displayCode || '')}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      Alert.alert('Succès', 'Lien copié !');
    } else {
      Share.share({ message: url, url }).catch(() => {});
    }
  };

  const shareMessage = `Rejoins AfriWonder avec mon code: ${displayCode}. Tu peux gagner en créant du contenu !`;
  const shareVia = async (platform) => {
    try {
      if (platform === 'whatsapp') {
        const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
        await Share.share({ message: shareMessage, url });
      } else {
        await Share.share({ message: shareMessage });
      }
    } catch (e) {
      if (e?.code !== 'ERR_CANCELED') Alert.alert('Erreur', 'Partage annulé ou indisponible.');
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.title}>Parrainage</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Impossible de charger les statistiques.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setError(false) || setLoading(true)}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.title}>Parrainage</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Programme de parrainage</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>1 invité = badge • 5 = boost • 10 = priorité algo • 20 = badge spécial • 50 = monétisation rapide</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Parrainés</Text>
            <Text style={styles.statValue}>{stats?.totalReferrals ?? 0}</Text>
            <Ionicons name="people" size={28} color="#2563eb" style={styles.statIcon} />
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Complétés</Text>
            <Text style={styles.statValue}>{stats?.completedReferrals ?? 0}</Text>
            <Ionicons name="trending-up" size={28} color="#2563eb" style={styles.statIcon} />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Récompenses</Text>
            <Text style={styles.statValue}>{stats?.rewards?.length ?? 0}</Text>
            <Ionicons name="trophy" size={28} color="#2563eb" style={styles.statIcon} />
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Mon code</Text>
            <Text style={[styles.statValue, styles.codeValue]} numberOfLines={1}>{displayCode || '-'}</Text>
            <Ionicons name="gift" size={28} color="#2563eb" style={styles.statIcon} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mon code de parrainage</Text>
          <Text style={styles.cardDesc}>Partagez votre code unique. Récompenses en visibilité selon le nombre d'invités.</Text>
          <TextInput value={displayCode} editable={false} style={styles.input} placeholder="Chargement..." />
          <TouchableOpacity style={styles.primaryBtn} onPress={copyCode}>
            <Ionicons name="copy-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Copier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={copyLink}>
            <Text style={styles.outlineBtnText}>Copier le lien</Text>
          </TouchableOpacity>
          <Text style={styles.shareLabel}>Partager via</Text>
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={() => shareVia('whatsapp')}>
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={() => shareVia('default')}>
              <Text style={styles.shareBtnText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Array.isArray(stats?.rewards) && stats.rewards.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mes récompenses débloquées</Text>
            {stats.rewards.map((r) => (
              <View key={r.id || r.reward_type} style={styles.rewardRow}>
                <Text style={styles.rewardName}>{REWARD_LABELS[r.reward_type] || r.reward_type}</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>À partir de {r.invites_count} invités</Text></View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mes parrainages</Text>
          {(stats?.referrals?.length ?? 0) === 0 ? (
            <Text style={styles.emptyText}>Aucun parrainage pour le moment. Commencez à partager !</Text>
          ) : (
            stats.referrals.map((ref) => (
              <View key={ref.id} style={styles.referralRow}>
                <View>
                  <Text style={styles.referralName}>{ref.referred?.username || ref.referred?.email || 'Utilisateur'}</Text>
                  <Text style={styles.referralDate}>{new Date(ref.created_at).toLocaleDateString('fr-FR')}</Text>
                </View>
                <View style={styles.badge}><Text style={styles.badgeText}>{ref.status}</Text></View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#2563eb', marginBottom: 16 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#2563eb', borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111' },
  codeValue: { fontSize: 16, color: '#2563eb', maxWidth: 100 },
  statIcon: { position: 'absolute', top: 16, right: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', padding: 12, borderRadius: 8, marginBottom: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  outlineBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#2563eb', marginBottom: 16, alignItems: 'center' },
  outlineBtnText: { color: '#2563eb', fontWeight: '600' },
  shareLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  shareRow: { flexDirection: 'row', gap: 8 },
  shareBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  shareBtnText: { color: '#374151', fontWeight: '500' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rewardName: { fontWeight: '500', color: '#111' },
  badge: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, color: '#1d4ed8', fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#6b7280', paddingVertical: 24 },
  referralRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 8 },
  referralName: { fontWeight: '600', color: '#111' },
  referralDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
