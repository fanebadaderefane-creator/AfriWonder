import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function DriverDashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.transport.drivers.getSummary?.();
      setSummary(res || null);
    } catch {
      setSummary(null);
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
        <Text style={st.title}>Tableau de bord chauffeur</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.content}>
          <View style={st.row}>
            <View style={st.card}>
              <Text style={st.cardLabel}>Courses terminées</Text>
              <Text style={st.cardValue}>{summary?.totalRides ?? 0}</Text>
            </View>
            <View style={st.card}>
              <Text style={st.cardLabel}>Note moyenne</Text>
              <Text style={st.cardValue}>{summary?.rating?.toFixed?.(1) ?? '—'}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
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
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row' },
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
});

