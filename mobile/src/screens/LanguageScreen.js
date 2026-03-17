import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const KEY = 'afriwonder_language';
const LANGS = [
  { code: 'fr', name: 'Francais', sub: '300M+ locuteurs' },
  { code: 'en', name: 'English', sub: '1.5B+ speakers' },
  { code: 'ar', name: 'Arabic', sub: '400M+' },
  { code: 'bm', name: 'Bambara', sub: 'Mali' },
];

export default function LanguageScreen() {
  const nav = useNavigation();
  const [sel, setSel] = useState('fr');

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((v) => v && setSel(v)).catch(() => {});
  }, []);

  const pick = (code) => {
    setSel(code);
    SecureStore.setItemAsync(KEY, code).catch(() => {});
  };

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => nav.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title}>Langue</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        {LANGS.map((l) => (
          <TouchableOpacity key={l.code} style={[st.card, sel === l.code && st.cardOn]} onPress={() => pick(l.code)}>
            <Text style={st.name}>{l.name}</Text>
            <Text style={st.sub}>{l.sub}</Text>
            {sel === l.code && <Text style={st.badge}>Selectionne</Text>}
          </TouchableOpacity>
        ))}
        <View style={st.info}>
          <Text style={st.infoT}>A propos des langues</Text>
          <Text style={st.infoB}>Votre selection est enregistree sur l appareil.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff', borderWidth: 2 },
  name: { fontSize: 16, fontWeight: '600', color: '#111' },
  sub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  badge: { position: 'absolute', right: 16, top: 16, fontSize: 12, color: '#2563eb', fontWeight: '600' },
  info: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#93c5fd' },
  infoT: { fontSize: 16, fontWeight: '700', color: '#1d4ed8', marginBottom: 8 },
  infoB: { fontSize: 13, color: '#1e40af' },
});
