import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const JOBS = [
  {
    id: 'j1',
    title: 'Developpeur Mobile',
    company: 'TechMali',
    location: 'Bamako',
    salary: '500 000 - 800 000 FCFA',
    type: 'CDI',
    posted: 'Il y a 2h',
    urgent: true,
  },
  {
    id: 'j2',
    title: 'Comptable',
    company: 'Sahel Finance',
    location: 'Bamako',
    salary: '350 000 - 500 000 FCFA',
    type: 'CDI',
    posted: 'Il y a 5h',
    urgent: false,
  },
  {
    id: 'j3',
    title: 'Community Manager',
    company: 'AfriWonder',
    location: 'Remote',
    salary: '200 000 - 400 000 FCFA',
    type: 'Freelance',
    posted: 'Il y a 1j',
    urgent: false,
  },
  {
    id: 'j4',
    title: 'Chauffeur Livreur',
    company: 'AfriDeliver',
    location: 'Bamako',
    salary: '150 000 - 250 000 FCFA',
    type: 'CDD',
    posted: 'Il y a 2j',
    urgent: true,
  },
  {
    id: 'j5',
    title: 'Graphiste',
    company: 'Creative Sahel',
    location: 'Dakar',
    salary: '300 000 - 600 000 FCFA',
    type: 'CDI',
    posted: 'Il y a 3j',
    urgent: false,
  },
];

const JOB_TYPES = [
  { id: 'all', name: 'Tout' },
  { id: 'CDI', name: 'CDI' },
  { id: 'CDD', name: 'CDD' },
  { id: 'Freelance', name: 'Freelance' },
];

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all' ? JOBS : JOBS.filter(j => j.type === activeFilter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emploi</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        {JOB_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.filterChip, activeFilter === type.id && styles.filterChipActive]}
            onPress={() => setActiveFilter(type.id)}
          >
            <Text style={[styles.filterText, activeFilter === type.id && styles.filterTextActive]}>
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filtered.map((job) => (
          <TouchableOpacity key={job.id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View style={styles.companyIcon}>
                <Ionicons name="business" size={24} color={Colors.primary} />
              </View>
              <View style={styles.jobHeaderInfo}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobCompany}>{job.company}</Text>
              </View>
              {job.urgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>Urgent</Text>
                </View>
              )}
            </View>
            <View style={styles.jobDetails}>
              <View style={styles.jobDetail}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.jobDetailText}>{job.location}</Text>
              </View>
              <View style={styles.jobDetail}>
                <Ionicons name="cash-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.jobDetailText}>{job.salary}</Text>
              </View>
              <View style={styles.jobDetail}>
                <Ionicons name="briefcase-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.jobDetailText}>{job.type}</Text>
              </View>
            </View>
            <View style={styles.jobFooter}>
              <Text style={styles.jobPosted}>{job.posted}</Text>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyText}>Postuler</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobHeaderInfo: {
    flex: 1,
  },
  jobTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  jobCompany: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  urgentBadge: {
    backgroundColor: Colors.live,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  urgentText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  jobDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  jobDetailText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  jobPosted: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  applyText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
