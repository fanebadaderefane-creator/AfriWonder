import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const CAMPAIGNS = [
  { id: 'cf1', title: 'Ecole numerique de Bamako', image: 'https://picsum.photos/400/200?random=180', goal: 5000000, raised: 3250000, backers: 189, daysLeft: 12, category: 'Education' },
  { id: 'cf2', title: 'Centre de sante communautaire', image: 'https://picsum.photos/400/200?random=181', goal: 10000000, raised: 7800000, backers: 456, daysLeft: 8, category: 'Sante' },
  { id: 'cf3', title: 'Studio musique pour jeunes artistes', image: 'https://picsum.photos/400/200?random=182', goal: 2000000, raised: 850000, backers: 67, daysLeft: 25, category: 'Culture' },
  { id: 'cf4', title: 'Ferme solaire communautaire', image: 'https://picsum.photos/400/200?random=183', goal: 8000000, raised: 4500000, backers: 234, daysLeft: 18, category: 'Environnement' },
];

export default function CrowdfundingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Crowdfunding</Text>
        <TouchableOpacity><Ionicons name="add-circle" size={24} color={Colors.primary} /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}><Text style={styles.statValue}>45M</Text><Text style={styles.statLabel}>FCFA leves</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>156</Text><Text style={styles.statLabel}>Projets</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>8.5K</Text><Text style={styles.statLabel}>Contributeurs</Text></View>
        </View>

        {CAMPAIGNS.map((campaign) => {
          const progress = (campaign.raised / campaign.goal) * 100;
          return (
            <TouchableOpacity key={campaign.id} style={styles.campaignCard}>
              <Image source={{ uri: campaign.image }} style={styles.campaignImage} />
              <View style={styles.campaignInfo}>
                <View style={styles.categoryBadge}><Text style={styles.categoryText}>{campaign.category}</Text></View>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} /></View>
                <View style={styles.campaignStats}>
                  <View><Text style={styles.raisedAmount}>{(campaign.raised / 1000000).toFixed(1)}M FCFA</Text><Text style={styles.goalAmount}>sur {(campaign.goal / 1000000).toFixed(0)}M</Text></View>
                  <View style={styles.metaRight}>
                    <Text style={styles.metaValue}>{campaign.backers} contributeurs</Text>
                    <Text style={styles.metaValue}>{campaign.daysLeft} jours restants</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
  statsBanner: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xxl },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  campaignCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  campaignImage: { width: '100%', height: 150 },
  campaignInfo: { padding: Spacing.lg },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary + '20', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  categoryText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
  campaignTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginBottom: Spacing.md },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  campaignStats: { flexDirection: 'row', justifyContent: 'space-between' },
  raisedAmount: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  goalAmount: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  metaRight: { alignItems: 'flex-end' },
  metaValue: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
