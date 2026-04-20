import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const TABS = ['Actualites', 'Sports', 'Tech', 'Culture', 'Economie'];

const NEWS = [
  { id: 'n1', title: 'AfriWonder atteint 500 000 utilisateurs en Afrique de l\'Ouest', image: 'https://picsum.photos/400/200?random=160', source: 'AfriTech News', time: 'Il y a 2h', category: 'Tech' },
  { id: 'n2', title: 'Les Aigles du Mali qualifies pour la CAN 2026', image: 'https://picsum.photos/400/200?random=161', source: 'Sport Mali', time: 'Il y a 4h', category: 'Sports' },
  { id: 'n3', title: 'Nouveau marche numerique a Bamako: opportunites pour les jeunes', image: 'https://picsum.photos/400/200?random=162', source: 'Mali Economie', time: 'Il y a 6h', category: 'Economie' },
  { id: 'n4', title: 'Festival de musique mandingue: programme complet', image: 'https://picsum.photos/400/200?random=163', source: 'Culture Mali', time: 'Hier', category: 'Culture' },
  { id: 'n5', title: 'Innovation: la startup malienne qui revolutionne le paiement mobile', image: 'https://picsum.photos/400/200?random=164', source: 'AfriTech News', time: 'Hier', category: 'Tech' },
];

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Actualites</Text>
        <TouchableOpacity><Ionicons name="search" size={24} color={Colors.text} /></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === i && styles.tabActive]} onPress={() => setActiveTab(i)}>
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Featured */}
        <TouchableOpacity style={styles.featuredCard} onPress={() => router.push(`/news/${NEWS[0].id}`)}>
          <Image source={{ uri: NEWS[0].image }} style={styles.featuredImage} />
          <View style={styles.featuredOverlay}>
            <View style={styles.sourceBadge}><Text style={styles.sourceText}>{NEWS[0].source}</Text></View>
            <Text style={styles.featuredTitle}>{NEWS[0].title}</Text>
            <Text style={styles.featuredTime}>{NEWS[0].time}</Text>
          </View>
        </TouchableOpacity>

        {/* News List */}
        {NEWS.slice(1).map((article) => (
          <TouchableOpacity key={article.id} style={styles.newsCard} onPress={() => router.push(`/news/${article.id}`)}>
            <View style={styles.newsInfo}>
              <View style={styles.categoryBadge}><Text style={styles.categoryText}>{article.category}</Text></View>
              <Text style={styles.newsTitle} numberOfLines={2}>{article.title}</Text>
              <View style={styles.newsMeta}>
                <Text style={styles.newsSource}>{article.source}</Text>
                <Text style={styles.newsTime}>{article.time}</Text>
              </View>
            </View>
            <Image source={{ uri: article.image }} style={styles.newsImage} />
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
  tabs: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, maxHeight: 40 },
  tab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, marginRight: Spacing.sm },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  tabTextActive: { color: Colors.text, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  featuredCard: { height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: Spacing.lg },
  sourceBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  sourceText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '600' },
  featuredTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: 4 },
  featuredTime: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm },
  newsCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md },
  newsInfo: { flex: 1, padding: Spacing.lg },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary + '20', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs },
  categoryText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
  newsTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: Spacing.sm },
  newsMeta: { flexDirection: 'row', gap: Spacing.sm },
  newsSource: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  newsTime: { color: Colors.textMuted, fontSize: FontSizes.xs },
  newsImage: { width: 100, height: '100%' },
});
