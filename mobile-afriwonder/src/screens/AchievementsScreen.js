import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_BADGES } from '../data/gamificationMock';

export default function AchievementsScreen() {
  const navigation = useNavigation();

  const earned = MOCK_BADGES.filter((b) => b.earned);
  const locked = MOCK_BADGES.filter((b) => !b.earned);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.title}>Succès & accomplissements</Text>
          <Text style={st.subtitle}>Résumé de vos progrès sur AfriWonder</Text>
        </View>
      </View>
      <ScrollView style={st.scroll} contentContainerStyle={st.content}>
        <View style={st.sectionCard}>
          <Text style={st.sectionTitle}>Succès débloqués</Text>
          {earned.length === 0 ? (
            <Text style={st.emptyText}>Aucun succès débloqué pour l'instant.</Text>
          ) : (
            earned.map((b) => (
              <View key={b.id} style={st.row}>
                <Text style={st.emoji}>{b.icon}</Text>
                <View style={st.rowBody}>
                  <Text style={st.rowTitle}>{b.name}</Text>
                  <Text style={st.rowDesc}>{b.description}</Text>
                </View>
                <Text style={st.points}>+{b.points}</Text>
              </View>
            ))
          )}
        </View>

        <View style={st.sectionCard}>
          <Text style={st.sectionTitle}>A débloquer</Text>
          {locked.length === 0 ? (
            <Text style={st.emptyText}>Vous avez débloqué tous les succès de cette démo.</Text>
          ) : (
            locked.map((b) => (
              <View key={b.id} style={[st.row, st.rowLocked]}>
                <Text style={st.emoji}>{b.icon}</Text>
                <View style={st.rowBody}>
                  <Text style={st.rowTitle}>{b.name}</Text>
                  <Text style={st.rowDesc}>{b.description}</Text>
                </View>
                <Text style={st.points}>+{b.points}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eff6ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#6b7280' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowLocked: {
    opacity: 0.7,
  },
  emoji: { fontSize: 28, marginRight: 12 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  rowDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  points: { fontSize: 12, fontWeight: '700', color: '#2563eb', marginLeft: 8 },
});

