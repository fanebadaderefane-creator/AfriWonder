import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

function formatStat(n) {
  if (!n || !Number.isFinite(n)) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function AboutScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.platform.getStats?.().then(setStats).catch(() => {});
  }, []);

  const rateApp = () => {
    Alert.alert('Noter l\'application', 'La notation sera bientôt disponible sur le Play Store et l\'App Store. Merci pour votre soutien !', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>À propos</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.logoPlaceholder}><Text style={styles.logoText}>AF</Text></View>
          <Text style={styles.appName}>AfriWonder</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.made}>Fabriqué avec ❤️ en Afrique</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notre mission</Text>
          <Text style={styles.cardText}>
            AfriWonder est la première Super-app vidéo africaine connectant créateurs, commerçants et communauté, optimisée pour les faibles débits, avec paiements mobiles intégrés. Notre mission est de démocratiser l'accès au numérique et de promouvoir l'économie locale.
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Ionicons name="people" size={24} color="#2563eb" /><Text style={styles.statValue}>{formatStat(stats.totalUsers)}</Text><Text style={styles.statLabel}>Utilisateurs</Text></View>
          <View style={styles.statCard}><Ionicons name="globe-outline" size={24} color="#2563eb" /><Text style={styles.statValue}>15</Text><Text style={styles.statLabel}>Pays</Text></View>
          <View style={styles.statCard}><Ionicons name="videocam" size={24} color="#2563eb" /><Text style={styles.statValue}>{formatStat(stats.totalVideos)}</Text><Text style={styles.statLabel}>Vidéos</Text></View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Liens utiles</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Ionicons name="shield-outline" size={20} color="#2563eb" /><Text style={styles.linkText}>Politique de confidentialité</Text><Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('DataProtection')}>
            <Ionicons name="lock-closed-outline" size={20} color="#2563eb" /><Text style={styles.linkText}>Protection des données</Text><Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://afriwonder.com')}>
            <Ionicons name="globe-outline" size={20} color="#2563eb" /><Text style={styles.linkText}>Site web</Text><Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={rateApp}>
            <Ionicons name="star-outline" size={20} color="#2563eb" /><Text style={styles.linkText}>Noter l'application</Text><Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <Text style={styles.footer}>© 2026 AfriWonder. Tous droits réservés.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9ff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  logoPlaceholder: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 22, fontWeight: '700', color: '#2563eb' },
  version: { fontSize: 14, color: '#2563eb', marginTop: 4 },
  made: { fontSize: 13, color: '#6b7280', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e0f2fe' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2563eb', marginBottom: 10 },
  cardText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: '#e0f2fe' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#2563eb', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  linkText: { flex: 1, fontSize: 15, color: '#111', marginLeft: 12 },
  footer: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 16 },
});
