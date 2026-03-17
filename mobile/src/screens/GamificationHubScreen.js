import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ITEMS = [
  { route: 'Achievements', title: 'Succès & Accomplissements', desc: 'Découvrez tous vos badges et accomplissements débloqués', icon: 'trophy', color: '#2563eb', count: '6 badges débloqués' },
  { route: 'Leaderboard', title: 'Classement', desc: 'Consultez le classement des meilleurs créateurs', icon: 'medal', color: '#6366f1', count: 'Top 10 visible' },
  { route: 'BadgesProfile', title: 'Mes Badges', desc: 'Votre collection personnelle de badges et récompenses', icon: 'ribbon', color: '#6366f1', count: '6 badges gagnés' },
];

export default function GamificationHubScreen() {
  const navigation = useNavigation();

  const open = (route) => {
    if (route === 'Leaderboard') {
      navigation.navigate('Leaderboard');
    } else if (route === 'BadgesProfile') {
      navigation.navigate('BadgesProfile');
    } else {
      navigation.navigate('Achievements');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Gamification</Text>
          <Text style={styles.subtitle}>Débloquez des badges et montez en niveau</Text>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => open(item.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardCount}>{item.count}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
          </TouchableOpacity>
        ))}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment ça marche ?</Text>
          <Text style={styles.infoBullet}>• Gagnez des points en utilisant la plateforme</Text>
          <Text style={styles.infoBullet}>• Débloquez des badges en accomplissant des actions</Text>
          <Text style={styles.infoBullet}>• Montez en niveau pour debloquer de nouveaux privilèges</Text>
          <Text style={styles.infoBullet}>• Comparez-vous aux autres dans le classement</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f9ff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerCenter: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb' },
  iconWrap: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  cardCount: { fontSize: 12, color: '#2563eb', marginTop: 2 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  infoCard: { backgroundColor: '#dbeafe', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#93c5fd' },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#1d4ed8', marginBottom: 10 },
  infoBullet: { fontSize: 13, color: '#1e40af', marginBottom: 4 },
});
