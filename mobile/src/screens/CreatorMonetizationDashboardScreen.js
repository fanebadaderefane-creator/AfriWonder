import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function CreatorMonetizationDashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.creatorDashboard.getDashboard();
      setDashboard(data || null);
    } catch {
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
        <Ionicons name="arrow-back" size={24} color="#2563eb" onPress={() => navigation.goBack()} />
        <Text style={st.title}>Monétisation</Text>
      </View>
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={st.content}>
          <View style={st.card}>
            <Text style={st.cardLabel}>Revenus estimés</Text>
            <Text style={st.cardValue}>{dashboard?.estimatedRevenue ?? 0} FCFA</Text>
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
  title: { marginLeft: 12, fontSize: 18, fontWeight: '700', color: '#111' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#111' },
});

