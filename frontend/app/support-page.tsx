import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const SUPPORT_TOPICS = [
  { icon: 'cart', label: 'Commandes & Livraison', color: '#FF6B6B' },
  { icon: 'wallet', label: 'Paiements & Portefeuille', color: '#4ECDC4' },
  { icon: 'person', label: 'Mon compte', color: '#45B7D1' },
  { icon: 'storefront', label: 'Vendre sur AfriWonder', color: '#FFD700' },
  { icon: 'videocam', label: 'Videos & Lives', color: '#DDA0DD' },
  { icon: 'shield', label: 'Securite & Confidentialite', color: '#96CEB4' },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Comment pouvons-nous vous aider?" placeholderTextColor={Colors.textMuted} />
        </View>

        {/* Topics Grid */}
        <Text style={styles.sectionTitle}>Choisir un sujet</Text>
        <View style={styles.topicsGrid}>
          {SUPPORT_TOPICS.map((topic, i) => (
            <TouchableOpacity key={i} style={styles.topicCard}>
              <View style={[styles.topicIcon, { backgroundColor: topic.color }]}>
                <Ionicons name={topic.icon as any} size={24} color="#FFF" />
              </View>
              <Text style={styles.topicLabel}>{topic.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Options */}
        <Text style={styles.sectionTitle}>Nous contacter</Text>
        <TouchableOpacity style={styles.contactCard}>
          <Ionicons name="chatbubbles" size={24} color={Colors.primary} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Chat en direct</Text>
            <Text style={styles.contactSubtitle}>Reponse en moins de 5 min</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactCard}>
          <Ionicons name="mail" size={24} color={Colors.info} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Email</Text>
            <Text style={styles.contactSubtitle}>support@afriwonder.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactCard}>
          <Ionicons name="call" size={24} color={Colors.success} />
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Telephone</Text>
            <Text style={styles.contactSubtitle}>+223 20 XX XX XX</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.xxl },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl },
  topicCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  topicIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  topicLabel: { color: Colors.text, fontSize: FontSizes.sm, textAlign: 'center', fontWeight: '500' },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md },
  contactInfo: { flex: 1 },
  contactTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  contactSubtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
