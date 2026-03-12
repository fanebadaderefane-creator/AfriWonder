import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const FAQ = [
  { q: 'Comment creer un compte ?', a: "Telechargez l'app et inscrivez-vous avec votre numero ou email." },
  { q: 'Comment recharger mon wallet ?', a: 'Allez dans Wallet > Recharger et choisissez Orange Money, Wave, etc.' },
  { q: 'Comment publier une video ?', a: 'Appuyez sur le bouton + en bas, selectionnez votre video et ajoutez une description.' },
  { q: 'Comment vendre sur le marketplace ?', a: 'Creez votre boutique depuis votre profil, puis ajoutez vos produits.' },
];

export default function HelpScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState(null);

  const filtered = search.trim() ? FAQ.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())) : FAQ;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Aide et Support</Text>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#2563eb" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Rechercher une question..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Questions frequentes</Text>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Aucune question trouvee</Text>
        ) : (
          filtered.map((faq, idx) => (
            <TouchableOpacity key={idx} style={styles.faqRow} onPress={() => setOpenIndex(openIndex === idx ? null : idx)}>
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Ionicons name={openIndex === idx ? 'chevron-up' : 'chevron-down'} size={20} color="#2563eb" />
              {openIndex === idx && <Text style={styles.faqA}>{faq.a}</Text>}
            </TouchableOpacity>
          ))
        )}
        <Text style={styles.sectionTitle}>Nous contacter</Text>
        <TouchableOpacity style={styles.contactRow} onPress={() => navigation.navigate('Support')}>
          <Ionicons name="chatbubbles" size={22} color="#2563eb" />
          <Text style={styles.contactText}>Mes tickets support</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('mailto:support@afriwonder.app')}>
          <Ionicons name="mail" size={22} color="#2563eb" />
          <Text style={styles.contactText}>support@afriwonder.app</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('tel:+221771234567')}>
          <Ionicons name="call" size={22} color="#2563eb" />
          <Text style={styles.contactText}>+221 77 123 45 67</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9ff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#93c5fd', paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#111' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2563eb', marginBottom: 12, marginTop: 8 },
  empty: { fontSize: 14, color: '#6b7280', paddingVertical: 16 },
  faqRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0f2fe' },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#111' },
  faqA: { fontSize: 13, color: '#6b7280', marginTop: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0f2fe' },
  contactText: { flex: 1, fontSize: 15, color: '#111', marginLeft: 12 },
});
