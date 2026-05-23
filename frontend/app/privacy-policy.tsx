import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politique de confidentialite</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.date}>Derniere mise a jour: 1er Juin 2025</Text>
        {[
          { title: 'Collecte des donnees', text: 'Nous collectons les informations necessaires au fonctionnement des services: nom, email, numero de telephone, donnees de localisation et d\'utilisation.' },
          { title: 'Utilisation des donnees', text: 'Vos donnees sont utilisees pour fournir nos services, personnaliser votre experience, traiter les paiements et ameliorer notre plateforme.' },
          { title: 'Partage des donnees', text: 'Nous ne vendons pas vos donnees. Elles peuvent etre partagees avec des prestataires de services (paiement, livraison) dans le cadre de l\'execution des services.' },
          { title: 'Securite', text: 'Nous utilisons le chiffrement SSL/TLS et des mesures de securite avancees pour proteger vos donnees personnelles et financieres.' },
          { title: 'Vos droits', text: 'Vous avez le droit d\'acceder, modifier ou supprimer vos donnees personnelles. Contactez-nous a privacy@afriwonder.com.' },
          { title: 'Cookies et traceurs', text: 'Nous utilisons des cookies pour ameliorer votre experience. Vous pouvez gerer vos preferences dans les parametres.' },
          { title: 'Conservation', text: 'Vos donnees sont conservees aussi longtemps que votre compte est actif. Apres suppression, elles sont effacees sous 30 jours.' },
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
  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold', marginBottom: Spacing.sm },
  sectionText: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
});
