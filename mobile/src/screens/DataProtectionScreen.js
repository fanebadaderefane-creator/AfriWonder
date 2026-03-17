import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const FEATURES = [
  { icon: 'shield-checkmark', title: 'Chiffrement', desc: 'Donnees chiffrees en transit et au repos' },
  { icon: 'lock-closed', title: 'Authentification', desc: 'Acces protege et verification 2 etapes' },
  { icon: 'eye-off', title: 'Controle visibilite', desc: 'Vous controlez qui voit vos donnees' },
  { icon: 'trash', title: 'Suppression', desc: 'Droit de supprimer vos donnees' },
  { icon: 'document-text', title: 'Transparence', desc: 'Acces complet a vos infos' },
];

export default function DataProtectionScreen() {
  const navigation = useNavigation();

  const handleExport = () => {
    Alert.alert('Export', 'Votre demande a ete enregistree. Email sous 24h.', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Protection des donnees</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.card}>
            <Ionicons name={f.icon} size={24} color="#2563eb" style={styles.cardIcon} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{f.title}</Text>
              <Text style={styles.cardDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>Demander un export de mes donnees</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardIcon: { marginRight: 14 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  exportBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  exportBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
