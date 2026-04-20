import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.date}>Derniere mise a jour: 1er Juin 2025</Text>
        <Text style={styles.paragraph}>En utilisant l'application AfriWonder, vous acceptez les presentes conditions d'utilisation. Veuillez les lire attentivement.</Text>
        {[
          { title: '1. Acceptation des conditions', text: 'En accedant a AfriWonder, vous acceptez d\'etre lie par ces conditions. Si vous n\'acceptez pas, veuillez ne pas utiliser l\'application.' },
          { title: '2. Inscription', text: 'Vous devez fournir des informations exactes lors de l\'inscription. Vous etes responsable de la confidentialite de votre compte.' },
          { title: '3. Utilisation du service', text: 'AfriWonder est une plateforme multiservice. L\'utilisation de chaque service (marketplace, finance, transport, etc.) est soumise a des conditions specifiques.' },
          { title: '4. Contenu utilisateur', text: 'Vous etes responsable du contenu que vous publiez. AfriWonder se reserve le droit de supprimer tout contenu inapproprie.' },
          { title: '5. Paiements', text: 'Les transactions financieres sont soumises aux reglementations locales. Les frais de service sont affiches avant chaque transaction.' },
          { title: '6. Propriete intellectuelle', text: 'L\'application AfriWonder et son contenu sont proteges par les lois sur la propriete intellectuelle.' },
          { title: '7. Limitation de responsabilite', text: 'AfriWonder ne saurait etre tenu responsable des dommages indirects lies a l\'utilisation de la plateforme.' },
          { title: '8. Modification', text: 'Nous nous reservons le droit de modifier ces conditions a tout moment. Les utilisateurs seront notifies des changements.' },
        ].map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionText}>{section.text}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  date: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg },
  paragraph: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22, marginBottom: Spacing.xxl },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', marginBottom: Spacing.sm },
  sectionText: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
});
