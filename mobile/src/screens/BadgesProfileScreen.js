import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { MOCK_BADGES, MOCK_USER_BADGES, MOCK_USER_POINTS, MOCK_USER_STATS } from '../data/gamificationMock';

export default function BadgesProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [stats, setStats] = useState(MOCK_USER_STATS);
  const [earnedIds, setEarnedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    api.gamification.getMe()
      .then((me) => {
        setPoints(me?.total_points ?? MOCK_USER_POINTS.total_points);
        setStats(me?.stats ?? MOCK_USER_STATS);
        setEarnedIds(MOCK_USER_BADGES.map((b) => b.badge_id));
      })
      .catch(() => {
        setPoints(MOCK_USER_POINTS.total_points);
        setEarnedIds(MOCK_USER_BADGES.map((b) => b.badge_id));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const earned = MOCK_BADGES.filter((b) => earnedIds.includes(b.badge_id) || b.earned);
  const locked = MOCK_BADGES.filter((b) => !earnedIds.includes(b.badge_id) && !b.earned);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Badges</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color="#2563eb" style={styles.loader} />
        ) : (
          <>
            <View style={styles.pointsCard}>
              <Text style={styles.pointsLabel}>Points totaux</Text>
              <Text style={styles.pointsValue}>{points}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statVal}>{stats.videos}</Text><Text style={styles.statLabel}>Videos</Text></View>
              <View style={styles.statBox}><Text style={styles.statVal}>{stats.followers}</Text><Text style={styles.statLabel}>Followers</Text></View>
              <View style={styles.statBox}><Text style={styles.statVal}>{earned.length}</Text><Text style={styles.statLabel}>Badges</Text></View>
            </View>
            <Text style={styles.secTitle}>Vos badges</Text>
            <View style={styles.badgeGrid}>
              {earned.map((b) => (
                <View key={b.id} style={styles.badgeEarned}>
                  <Text style={styles.badgeEmoji}>{b.icon}</Text>
                  <Text style={styles.badgeName}>{b.name}</Text>
                  <Text style={styles.badgePts}>+{b.points}</Text>
                </View>
              ))}
            </View>
            {locked.length > 0 && (
              <>
                <Text style={styles.secTitle}>A debloquer</Text>
                <View style={styles.badgeGrid}>
                  {locked.map((b) => (
                    <View key={b.id} style={styles.badgeLocked}>
                      <Text style={styles.badgeEmoji}>{b.icon}</Text>
                      <Text style={styles.badgeName}>{b.name}</Text>
                      <Text style={styles.badgePts}>+{b.points}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eff6ff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16 },
  loader: { marginTop: 24 },
  pointsCard: { backgroundColor: '#2563eb', borderRadius: 16, padding: 24, marginBottom: 16 },
  pointsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  pointsValue: { fontSize: 36, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginHorizontal: 4, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  secTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  badgeEarned: { width: '48%', marginRight: '2%', marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 2, borderColor: '#2563eb', alignItems: 'center' },
  badgeLocked: { width: '48%', marginRight: '2%', marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db', alignItems: 'center' },
  badgeEmoji: { fontSize: 32, marginBottom: 6 },
  badgeName: { fontSize: 14, fontWeight: '700', color: '#111' },
  badgePts: { fontSize: 12, color: '#2563eb', marginTop: 6 },
});
