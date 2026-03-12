import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const TOOLS = [
  { id: 'monetization', label: 'Monétisation', desc: 'Tableau de bord et missions', icon: 'cash', module: 'CreatorMonetizationDashboard', color: '#16a34a' },
  { id: 'analytics', label: 'Analytics', desc: 'Vues, engagement et tendances', icon: 'bar-chart', module: 'Analytics', color: '#2563eb' },
  { id: 'bulk', label: 'Téléchargement en masse', desc: 'Importer plusieurs vidéos', icon: 'cloud-upload', module: 'BulkUploadManager', color: '#9333ea' },
  { id: 'revenue', label: 'Partage de revenus', desc: 'Configurer le partage', icon: 'share-social', module: 'RevenueSharing', color: '#ca8a04' },
];

export default function CreatorToolsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Outils créateur</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {TOOLS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.card}
            onPress={() => navigation.navigate(t.module)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: t.color + '20' }]}>
              <Ionicons name={t.icon} size={28} color={t.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{t.label}</Text>
              <Text style={styles.cardDesc}>{t.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  iconWrap: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
