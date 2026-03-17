import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { MOCK_JOBS, JOB_CATEGORIES, JOB_TYPE_LABELS } from '../data/jobsMock';

function getTypeLabel(jobType) {
  return JOB_TYPE_LABELS[jobType] || jobType || '—';
}

function getDaysRemaining(expiresAt) {
  if (!expiresAt) return 0;
  const end = new Date(expiresAt);
  const now = new Date();
  return Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
}

export default function JobsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('');
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 30, status: 'open' };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (typeFilter !== 'all') params.jobType = typeFilter;
      if (countryFilter.trim()) params.country = countryFilter.trim();
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.jobs.list(params);
      const list = res?.jobs ?? [];
      if (Array.isArray(list) && list.length > 0) {
        setJobs(list);
        setPagination(res?.pagination ?? { page: 1, totalPages: 1, total: list.length });
      } else {
        setJobs(MOCK_JOBS);
        setPagination({ page: 1, totalPages: 1, total: MOCK_JOBS.length });
      }
    } catch {
      setJobs(MOCK_JOBS);
      setPagination({ page: 1, totalPages: 1, total: MOCK_JOBS.length });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, typeFilter, countryFilter, searchQuery]);

  const loadRecommended = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.jobs.getRecommended(8);
      setRecommended(Array.isArray(list) ? list : []);
    } catch {
      setRecommended([]);
    }
  }, [user]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadRecommended();
  }, [loadRecommended]);

  const typeOptions = [
    { id: 'all', label: 'Tous' },
    { id: 'cdi', label: 'CDI' },
    { id: 'cdd', label: 'CDD' },
    { id: 'freelance', label: 'Freelance' },
    { id: 'stage', label: 'Stage' },
    { id: 'alternance', label: 'Alternance' },
  ];

  const totalJobs = pagination?.total ?? jobs.length;
  const uniqueCompanies = [...new Set(jobs.map((j) => j.employer?.company_profile?.company_name || j.employer?.full_name).filter(Boolean))].length;
  const totalApplications = jobs.reduce((acc, j) => acc + (j._count?.applications ?? 0), 0);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Offres d'emploi</Text>
        </View>
        {user && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerLink} onPress={() => navigation.navigate('CandidateProfile')}>
              <Text style={styles.headerLinkText}>Profil candidat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerLink} onPress={() => navigation.navigate('CompanyProfile')}>
              <Text style={styles.headerLinkText}>Profil entreprise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerLink} onPress={() => navigation.navigate('JobDashboard')}>
              <Text style={styles.headerLinkText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={() => navigation.navigate('PostJob')}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.publishBtnText}>Publier</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher un emploi..."
          placeholderTextColor="#94a3b8"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
        {JOB_CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
            onPress={() => setSelectedCategory(c.id)}
          >
            <Text style={[styles.chipText, selectedCategory === c.id && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.typeRow}>
        {typeOptions.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={[styles.typeChip, typeFilter === o.id && styles.typeChipActive]}
            onPress={() => setTypeFilter(o.id)}
          >
            <Text style={[styles.typeChipText, typeFilter === o.id && styles.typeChipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {user && recommended.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recommandées pour vous</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedRow}>
            {recommended.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.recommendedCard}
                onPress={() => navigation.navigate('JobDetails', { id: job.id })}
              >
                <Image source={{ uri: job.employer?.company_profile?.logo_url || job.employer?.profile_image || job.image }} style={styles.recommendedLogo} />
                <Text style={styles.recommendedTitle} numberOfLines={2}>{job.title}</Text>
                <Text style={styles.recommendedCompany} numberOfLines={1}>{job.employer?.company_profile?.company_name || job.employer?.full_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalJobs}</Text>
          <Text style={styles.statLabel}>Offres actives</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{uniqueCompanies}</Text>
          <Text style={styles.statLabel}>Entreprises</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalApplications}</Text>
          <Text style={styles.statLabel}>Candidatures</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
        ) : (
          jobs.map((job) => {
            const logoUrl = job.employer?.company_profile?.logo_url || job.employer?.profile_image;
            const companyName = job.employer?.company_profile?.company_name || job.employer?.full_name || 'Entreprise';
            const applications = job._count?.applications ?? 0;
            const daysLeft = getDaysRemaining(job.expires_at);
            const salaryStr =
              job.salary_min != null && job.salary_max != null
                ? `${Number(job.salary_min).toLocaleString('fr-FR')} - ${Number(job.salary_max).toLocaleString('fr-FR')} ${job.salary_currency || 'FCFA'}`
                : null;
            return (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => navigation.navigate('JobDetails', { id: job.id })}
              >
                {job.image ? <Image source={{ uri: job.image }} style={styles.jobCover} /> : null}
                <View style={styles.jobRow}>
                  {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.jobLogo} /> : <View style={[styles.jobLogo, styles.jobLogoPlaceholder]}><Ionicons name="business" size={24} color="#94a3b8" /></View>}
                  <View style={styles.jobBody}>
                    <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                    <Text style={styles.jobCompany} numberOfLines={1}>{companyName}</Text>
                    <View style={styles.badgesRow}>
                      <View style={styles.badge}><Text style={styles.badgeText}>{getTypeLabel(job.job_type)}</Text></View>
                      {job.location && <View style={styles.badge}><Text style={styles.badgeText}>{job.location}</Text></View>}
                      {job.remote && <View style={styles.badge}><Text style={styles.badgeText}>Télétravail</Text></View>}
                      {job.premium && <View style={[styles.badge, styles.badgePremium]}><Text style={styles.badgeTextPremium}>Premium</Text></View>}
                      {job.urgent && <View style={[styles.badge, styles.badgeUrgent]}><Text style={styles.badgeTextUrgent}>Urgent</Text></View>}
                    </View>
                    {job.skills && job.skills.length > 0 && (
                      <View style={styles.skillsRow}>
                        {job.skills.slice(0, 3).map((s, i) => (
                          <Text key={i} style={styles.skillTag}>{s}</Text>
                        ))}
                      </View>
                    )}
                    {salaryStr && <Text style={styles.salaryText}>{salaryStr}</Text>}
                    <Text style={styles.jobMeta}>
                      {applications} candidatures · {daysLeft} jours restants
                    </Text>
                    <Text style={styles.jobDate}>
                      {job.posted_at ? new Date(job.posted_at).toLocaleDateString('fr-FR') : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: 12 },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  headerActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  headerLink: { paddingVertical: 4 },
  headerLinkText: { fontSize: 12, color: '#2563eb', fontWeight: '500' },
  publishBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  publishBtnText: { color: '#fff', fontWeight: '600', marginLeft: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 15, color: '#0f172a' },
  categoriesRow: { paddingLeft: 16, paddingBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0', marginRight: 8 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#475569' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  typeChipActive: { backgroundColor: '#2563eb' },
  typeChipText: { fontSize: 12, color: '#64748b' },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginHorizontal: 16, marginBottom: 10 },
  recommendedRow: { paddingLeft: 16, marginBottom: 16 },
  recommendedCard: { width: 160, marginRight: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  recommendedLogo: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e2e8f0' },
  recommendedTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 8 },
  recommendedCompany: { fontSize: 12, color: '#64748b', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loader: { marginVertical: 24 },
  jobCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  jobCover: { width: '100%', height: 100, backgroundColor: '#e2e8f0' },
  jobRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  jobLogo: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e2e8f0', marginRight: 12 },
  jobLogoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  jobBody: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  jobCompany: { fontSize: 13, color: '#64748b', marginTop: 4 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  badgePremium: { backgroundColor: '#fef3c7' },
  badgeTextPremium: { fontSize: 11, color: '#b45309', fontWeight: '600' },
  badgeUrgent: { backgroundColor: '#fee2e2' },
  badgeTextUrgent: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  skillTag: { fontSize: 11, color: '#2563eb', backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  salaryText: { fontSize: 13, color: '#059669', marginTop: 6 },
  jobMeta: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  jobDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
