import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function JobDashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.jobs.getEmployerDashboard();
      setDashboard(data || null);
    } catch (_) {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title}>Dashboard Emplois</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : !dashboard ? (
        <View style={st.center}>
          <Text style={st.empty}>Aucune donnée de dashboard disponible.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.content}>
          <View style={st.rowCards}>
            <View style={st.card}>
              <Text style={st.cardLabel}>Offres actives</Text>
              <Text style={st.cardValue}>{dashboard.activeJobs ?? 0}</Text>
            </View>
            <View style={st.card}>
              <Text style={st.cardLabel}>Candidatures</Text>
              <Text style={st.cardValue}>{dashboard.totalApplications ?? 0}</Text>
            </View>
          </View>
          <View style={st.card}>
            <Text style={st.cardLabel}>Dernières offres</Text>
            {(dashboard.recentJobs || []).slice(0, 5).map((job) => (
              <View key={job.id} style={st.jobRow}>
                <View style={st.jobInfo}>
                  <Text style={st.jobTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={st.jobMeta}>{job.location || '—'}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('JobDetails', { id: job.id })}>
                  <Ionicons name="chevron-forward" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 14, color: '#6b7280' },
  content: { padding: 16, paddingBottom: 32 },
  rowCards: { flexDirection: 'row', marginBottom: 16 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#111' },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  jobInfo: { flex: 1, marginRight: 8 },
  jobTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  jobMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});

