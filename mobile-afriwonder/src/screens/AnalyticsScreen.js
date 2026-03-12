import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function AnalyticsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [stats, setStats] = useState({ videosCount: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalFollowers: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [videos, followers] = await Promise.all([
        api.videos.list?.({ creator_id: user.id }).catch(() => []),
        api.users.getFollowing?.({ following_id: user.id }).catch(() => []),
      ]);
      const list = Array.isArray(videos) ? videos : (videos?.videos ?? []);
      const totalViews = list.reduce((s, v) => s + (v.views_count ?? v.views ?? 0), 0);
      const totalLikes = list.reduce((s, v) => s + (v.likes_count ?? v.likes ?? 0), 0);
      const totalComments = list.reduce((s, v) => s + (v.comments_count ?? v.comments ?? 0), 0);
      const fol = Array.isArray(followers) ? followers : (followers?.followers ?? []);
      setStats({
        videosCount: list.length,
        totalViews,
        totalLikes,
        totalComments,
        totalFollowers: fol.length,
      });
    } catch {
      setStats({ videosCount: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalFollowers: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const engagement = stats.totalViews > 0
    ? Math.round(((stats.totalLikes + stats.totalComments) / stats.totalViews) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.title}>Statistiques</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color="#2563eb" style={styles.loader} />
        ) : (
          <>
            <View style={styles.card}>
              <Ionicons name="videocam" size={28} color="#2563eb" />
              <Text style={styles.cardValue}>{stats.videosCount}</Text>
              <Text style={styles.cardLabel}>Videos</Text>
            </View>
            <View style={styles.card}>
              <Ionicons name="eye" size={28} color="#2563eb" />
              <Text style={styles.cardValue}>{stats.totalViews}</Text>
              <Text style={styles.cardLabel}>Vues</Text>
            </View>
            <View style={styles.card}>
              <Ionicons name="heart" size={28} color="#2563eb" />
              <Text style={styles.cardValue}>{stats.totalLikes}</Text>
              <Text style={styles.cardLabel}>Likes</Text>
            </View>
            <View style={styles.card}>
              <Ionicons name="chatbubbles" size={28} color="#2563eb" />
              <Text style={styles.cardValue}>{stats.totalComments}</Text>
              <Text style={styles.cardLabel}>Commentaires</Text>
            </View>
            <View style={styles.card}>
              <Ionicons name="people" size={28} color="#2563eb" />
              <Text style={styles.cardValue}>{stats.totalFollowers}</Text>
              <Text style={styles.cardLabel}>Abonnes</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{engagement}%</Text>
              <Text style={styles.cardLabel}>Taux d\'engagement</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 32 },
  loader: { marginTop: 24 },
  card: { width: '48%', marginRight: '2%', marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 8 },
  cardLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
});
