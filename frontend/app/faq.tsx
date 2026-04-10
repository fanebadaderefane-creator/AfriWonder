import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const FAQ_DATA = [
  { q: 'Comment creer un compte AfriWonder ?', a: 'Telecharger l\'application, cliquez sur "S\'inscrire" et suivez les etapes. Vous pouvez utiliser votre numero de telephone ou email.' },
  { q: 'Comment recharger mon portefeuille ?', a: 'Allez dans Portefeuille > Recharger. Choisissez Orange Money, Wave ou Moov Money, entrez le montant et confirmez.' },
  { q: 'Comment vendre sur la marketplace ?', a: 'Allez dans votre Profil > Devenir vendeur. Remplissez le formulaire d\'inscription et commencez a ajouter vos produits.' },
  { q: 'Comment fonctionne le microcredit ?', a: 'Le microcredit est base sur votre score de credit. Allez dans Portefeuille > Microcredit pour voir vos options de pret disponibles.' },
  { q: 'Comment faire un live ?', a: 'Appuyez sur le bouton Creer (+) puis selectionnez "Demarrer un Live". Vous pouvez aussi planifier un live a l\'avance.' },
  { q: 'Comment signaler un contenu ?', a: 'Appuyez longuement sur le contenu concerne et selectionnez "Signaler". Notre equipe de moderation examinera le signalement.' },
  { q: 'Comment contacter le support ?', a: 'Allez dans Parametres > Support ou envoyez un email a support@afriwonder.com.' },
  { q: 'Quels sont les frais de transaction ?', a: 'Les transferts entre utilisateurs AfriWonder sont gratuits. Les retraits vers Orange Money/Wave ont des frais de 1%.' },
];

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Questions frequemment posees</Text>
        {FAQ_DATA.map((item, index) => (
          <TouchableOpacity key={index} style={styles.faqItem} onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.q}</Text>
              <Ionicons name={expandedIndex === index ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
            </View>
            {expandedIndex === index && <Text style={styles.faqAnswer}>{item.a}</Text>}
          </TouchableOpacity>
        ))}
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
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.md, marginBottom: Spacing.xl },
  faqItem: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginRight: Spacing.sm },
  faqAnswer: { color: Colors.textSecondary, fontSize: FontSizes.md, marginTop: Spacing.md, lineHeight: 22 },
});
