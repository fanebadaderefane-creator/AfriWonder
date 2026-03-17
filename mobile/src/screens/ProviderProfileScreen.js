import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getProviderCardImageUrlExport } from '../components/ProviderCard';

export default function ProviderProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const provider = route.params?.provider;
  const name = route.params?.name || provider?.display_name || 'Prestataire';
  const imageUrl = provider ? getProviderCardImageUrlExport(provider) : null;

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title} numberOfLines={1}>{name}</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <View style={st.hero}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={st.heroImage} />
          ) : (
            <View style={st.heroPlaceholder}>
              <Text style={st.heroLetter}>{name[0]?.toUpperCase?.() || 'P'}</Text>
            </View>
          )}
        </View>
        <Text style={st.sectionTitle}>Profil prestataire</Text>
        <Text style={st.placeholderText}>
          Profil détaillé du prestataire à venir. Cette version affiche un résumé visuel cohérent avec la carte.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', marginBottom: 16 },
  heroImage: { width: '100%', height: 200, borderRadius: 16 },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLetter: { fontSize: 48, fontWeight: '700', color: '#4b5563' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 6, color: '#111' },
  placeholderText: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
});

