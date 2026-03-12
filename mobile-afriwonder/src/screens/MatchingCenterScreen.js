import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function MatchingCenterScreen() {
  const navigation = useNavigation();

  const links = [
    { label: 'Voir les offres d\'emploi', screen: 'Jobs' },
    { label: 'Formations', screen: 'Courses' },
    { label: 'Marketplace', screen: 'Marketplace' },
    { label: 'Microcredit', screen: 'Microcredit' },
    { label: 'Mon Wallet', screen: 'Wallet' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Parcours Intelligent</Text>
          <Text style={styles.subtitle}>Onboarding et opportunites pour toi</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>Phase 2</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Objectif et niveau</Text>
          <Text style={styles.cardDesc}>
            Completez votre profil (objectif, competences, localisation) pour recevoir des recommandations personnalisees : emplois, formations, marketplace, microcredit.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acces rapide</Text>
          {links.map((l) => (
            <TouchableOpacity key={l.screen} style={styles.linkRow} onPress={() => navigation.navigate(l.screen)}>
              <Text style={styles.linkLabel}>{l.label}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerCenter: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2563eb', marginBottom: 10 },
  cardDesc: { fontSize: 14, color: '#475569', lineHeight: 22 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  linkLabel: { flex: 1, fontSize: 15, color: '#111' },
});
