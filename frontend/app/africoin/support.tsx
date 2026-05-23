import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontSizes, Spacing, BorderRadius, Colors } from '../../src/theme/colors';

const FAQ_LEFT = ['Comment se connecter', 'Mots de passe perdus ou volés', 'Comment créer un compte'];
const FAQ_RIGHT = ['Numéro déjà enregistré', 'Réinitialiser le mot de passe', 'Compte suspendu'];

const CATEGORIES = [
  { title: 'Compte', desc: 'Gère ton profil, tes informations de connexion…' },
  { title: 'Utilisation', desc: 'Découvre comment utiliser l’application…' },
  { title: 'Publications', desc: 'Création, modération et visibilité…' },
  { title: 'Live', desc: 'Conseils et aide pour le direct…' },
  { title: 'Monétisation', desc: 'Pièces, cadeaux, retraits…' },
  { title: 'Confidentialité', desc: 'Paramètres et données personnelles…' },
];

export default function AfricoinSupportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.brand}>aFRICOIN Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.hero}>Comment pouvons-nous t&apos;aider ?</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput placeholder="Rechercher des articles d'aide" placeholderTextColor="#999" style={styles.searchInput} />
          </View>
          <TouchableOpacity style={styles.ticketBtn} onPress={() => router.push('/faq' as never)}>
            <Ionicons name="document-text-outline" size={18} color="#111" />
            <Text style={styles.ticketText}>FAQ</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Foire aux questions</Text>
        <View style={styles.faqGrid}>
          <View style={styles.faqCol}>
            {FAQ_LEFT.map((q) => (
              <TouchableOpacity key={q} style={styles.faqItem} onPress={() => router.push('/faq' as never)}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.faqText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.faqCol}>
            {FAQ_RIGHT.map((q) => (
              <TouchableOpacity key={q} style={styles.faqItem} onPress={() => router.push('/faq' as never)}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.faqText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c.title} style={styles.catCard} onPress={() => router.push('/faq' as never)} activeOpacity={0.9}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catTitle}>{c.title}</Text>
                <Text style={styles.catDesc}>{c.desc}</Text>
              </View>
              <Ionicons name="image-outline" size={36} color="#e5e5e5" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.more} onPress={() => router.push('/support-page' as never)}>
          <Text style={styles.moreText}>Voir d&apos;autres sujets →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, textAlign: 'center', fontWeight: '900', fontSize: FontSizes.md, color: '#111' },
  body: { padding: Spacing.lg, paddingBottom: 40 },
  hero: { fontSize: 22, fontWeight: '900', color: '#111', textAlign: 'center', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111' },
  ticketBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: '#ddd' },
  ticketText: { fontWeight: '700', color: '#111', fontSize: 13 },
  section: { fontWeight: '900', fontSize: 16, marginBottom: 10, color: '#111' },
  faqGrid: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  faqCol: { flex: 1, gap: 10 },
  faqItem: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  bullet: { color: Colors.primary, fontWeight: '900', marginTop: 2 },
  faqText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18, fontWeight: '600' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
  },
  catTitle: { fontWeight: '900', color: '#111', marginBottom: 6 },
  catDesc: { fontSize: 12, color: '#666', lineHeight: 16 },
  more: { alignSelf: 'flex-end', marginTop: 16 },
  moreText: { color: '#111', fontWeight: '800' },
});
