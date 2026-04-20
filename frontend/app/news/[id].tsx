import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

export default function ArticleDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity><Ionicons name="bookmark-outline" size={22} color={Colors.text} /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="share-outline" size={22} color={Colors.text} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView key={String(id)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Image source={{ uri: 'https://picsum.photos/400/250?random=170' }} style={styles.heroImage} />
        <View style={styles.meta}>
          <View style={styles.sourceBadge}><Text style={styles.sourceText}>AfriTech News</Text></View>
          <Text style={styles.date}>25 Juin 2025 - 14h30</Text>
        </View>
        <Text style={styles.title}>AfriWonder atteint 500 000 utilisateurs en Afrique de l'Ouest</Text>
        <View style={styles.authorRow}>
          <Image source={{ uri: 'https://picsum.photos/40/40?random=171' }} style={styles.authorAvatar} />
          <View><Text style={styles.authorName}>Abdoulaye Fane</Text><Text style={styles.authorRole}>Journaliste Tech</Text></View>
        </View>
        <Text style={styles.paragraph}>La super-application africaine AfriWonder vient de franchir le cap symbolique des 500 000 utilisateurs actifs, confirmant son statut de plateforme numerique leader en Afrique de l'Ouest.</Text>
        <Text style={styles.paragraph}>Lancee il y a moins d'un an, la plateforme qui combine commerce, services, divertissement et finance mobile connait une croissance exponentielle au Mali, au Senegal et en Cote d'Ivoire.</Text>
        <Text style={styles.subtitle}>Une adoption rapide</Text>
        <Text style={styles.paragraph}>"Nous sommes fiers de cette etape importante", declare le fondateur. "Notre mission est de creer un ecosysteme numerique qui repond aux besoins reels des communautes africaines."</Text>
        <Text style={styles.paragraph}>La marketplace a elle seule compte plus de 10 000 vendeurs actifs, tandis que le service de paiement mobile traite des millions de transactions chaque mois.</Text>
        <Text style={styles.subtitle}>Perspectives 2026</Text>
        <Text style={styles.paragraph}>L'equipe prevoit d'etendre ses services a d'autres pays d'Afrique de l'Ouest dans les prochains mois, avec un objectif d'un million d'utilisateurs d'ici fin 2026.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  content: { paddingBottom: Spacing.xxxl },
  heroImage: { width: '100%', height: 220, marginBottom: Spacing.lg },
  meta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.md },
  sourceBadge: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  sourceText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  date: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  title: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, lineHeight: 28 },
  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.xxl },
  authorAvatar: { width: 40, height: 40, borderRadius: 20 },
  authorName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  authorRole: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  paragraph: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 24, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  subtitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, marginTop: Spacing.md },
});
