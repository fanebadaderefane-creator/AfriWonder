import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_MINI_APPS } from '../data/miniAppsMock';

export default function MiniAppDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id || '';
  const app = MOCK_MINI_APPS.find((a) => a.id === id);

  if (!app) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
          <Text style={styles.title}>Mini-app</Text>
        </View>
        <Text style={styles.empty}>Mini-app introuvable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MiniAppsStore')}><Text style={styles.backBtnText}>Retour</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{app.name}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: app.icon }} style={styles.icon} />
        <Text style={styles.desc}>{app.description}</Text>
        <Text style={styles.meta}>Note {app.rating}</Text>
        <TouchableOpacity style={styles.cta}><Text style={styles.ctaText}>Installer</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },
  backBtn: { marginHorizontal: 24, padding: 14, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center' },
  backBtnText: { color: '#fff', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 32, alignItems: 'center' },
  icon: { width: 80, height: 80, borderRadius: 16, marginBottom: 16, backgroundColor: '#f3f4f6' },
  desc: { fontSize: 15, color: '#374151', lineHeight: 24, textAlign: 'center' },
  meta: { fontSize: 14, color: '#6b7280', marginTop: 12 },
  cta: { marginTop: 24, padding: 16, backgroundColor: '#2563eb', borderRadius: 12, minWidth: 160, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
