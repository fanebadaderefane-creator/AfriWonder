import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { MOCK_JOBS } from '../data/jobsMock';

export default function JobDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id ?? '';
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    api.jobs.getById(id, true)
      .then((data) => setJob(data))
      .catch(() => setJob(MOCK_JOBS.find((j) => j.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SafeAreaView style={st.root}><View style={st.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity><Text style={st.title}>Offre</Text></View><ActivityIndicator color="#2563eb" style={st.loader} /></SafeAreaView>;
  if (!job) return <SafeAreaView style={st.root}><View style={st.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity><Text style={st.title}>Offre</Text></View><Text style={st.empty}>Offre introuvable</Text><TouchableOpacity style={st.btn} onPress={() => navigation.navigate('Jobs')}><Text style={st.btnText}>Retour Emplois</Text></TouchableOpacity></SafeAreaView>;

  const company = job.employer?.company_profile?.company_name ?? job.employer?.full_name ?? job.company_name ?? 'Entreprise';

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour"><Ionicons name="arrow-back" size={24} color="#2563eb" /></TouchableOpacity>
        <Text style={st.title} numberOfLines={1}>{job.title ?? job.job_title ?? 'Offre'}</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.company}>{company}</Text>
        <Text style={st.desc}>{job.description ?? ''}</Text>
        {job.location && <Text style={st.meta}><Ionicons name="location-outline" size={16} /> {job.location}</Text>}
        {job.salary_min != null && <Text style={st.meta}>Salaire: {job.salary_min} - {job.salary_max ?? ''} FCFA</Text>}
        <TouchableOpacity style={st.cta} onPress={() => navigation.navigate('JobApply', { id, title: job.title })}>
          <Text style={st.ctaText}>Postuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  loader: { marginTop: 24 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },
  btn: { marginHorizontal: 24, padding: 14, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  content: { padding: 16, paddingBottom: 32 },
  company: { fontSize: 16, fontWeight: '600', color: '#2563eb', marginBottom: 12 },
  desc: { fontSize: 15, color: '#374151', lineHeight: 24 },
  meta: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  cta: { marginTop: 24, padding: 16, backgroundColor: '#2563eb', borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
