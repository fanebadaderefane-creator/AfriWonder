import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
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

import { api } from '../api/client';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

const FILTER_ALL = 'all';
const FILTER_VIDEOS = 'videos';
const FILTER_USERS = 'users';

export default function SearchScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState(FILTER_ALL);
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setDebouncedQuery('');
      return;
    }
    debounceRef.current = setTimeout(() => setDebouncedQuery(q), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Recherche globale CDC : un seul appel API pour vidéos + utilisateurs
  const runGlobalSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setVideos([]);
      setUsers([]);
      return;
    }
    setLoadingVideos(true);
    setLoadingUsers(true);
    try {
      const result = await api.search.global({
        q: debouncedQuery.trim(),
        type: filter,
        limit: 30,
      });
      setVideos(Array.isArray(result?.videos) ? result.videos : []);
      setUsers(Array.isArray(result?.users) ? result.users : []);
    } catch (_) {
      setVideos([]);
      setUsers([]);
    } finally {
      setLoadingVideos(false);
      setLoadingUsers(false);
    }
  }, [debouncedQuery, filter]);

  useEffect(() => {
    runGlobalSearch();
  }, [runGlobalSearch]);

  const loading = loadingVideos || loadingUsers;
  const totalResults = videos.length + users.length;
  const showVideos = filter === FILTER_ALL || filter === FILTER_VIDEOS;
  const showUsers = filter === FILTER_ALL || filter === FILTER_USERS;

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setVideos([]);
    setUsers([]);
    Keyboard.dismiss();
  };

  const handleVideoPress = (video) => {
    navigation.navigate('VideoView', { videoId: video.id });
  };

  const handleUserPress = (user) => {
    navigation.navigate('ProfileUser', { userId: user.id });
  };

  const renderContent = () => {
    if (!debouncedQuery) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search" size={40} color="#3B82F6" />
          </View>
          <Text style={styles.emptyTitle}>Que recherchez-vous ?</Text>
          <Text style={styles.emptySubtitle}>
            Vidéos, créateurs — tapez un mot-clé ou choisissez un filtre ci-dessus.
          </Text>
          <View style={styles.filterChips}>
            {[
              { key: FILTER_VIDEOS, label: 'Vidéos', icon: 'videocam-outline' },
              { key: FILTER_USERS, label: 'Utilisateurs', icon: 'person-outline' },
            ].map(({ key, label, icon }) => (
              <TouchableOpacity
                key={key}
                style={styles.chip}
                onPress={() => setFilter(key)}
              >
                <Ionicons name={icon} size={18} color="#F9FAFB" />
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (loading && totalResults === 0) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Recherche en cours…</Text>
        </View>
      );
    }

    if (totalResults === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#6B7280" />
          <Text style={styles.emptyTitle}>Aucun résultat pour « {debouncedQuery} »</Text>
          <Text style={styles.emptySubtitle}>
            Essayez d'autres mots-clés ou le filtre « Tous ».
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsCount}>
          {totalResults} résultat{totalResults > 1 ? 's' : ''} pour « {debouncedQuery} »
        </Text>
        {showVideos && videos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="videocam" size={18} color="#2563eb" /> Vidéos ({videos.length})
            </Text>
            {videos.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.resultRow}
                activeOpacity={0.8}
                onPress={() => handleVideoPress(v)}
              >
                <View style={styles.videoThumb}>
                  {v.thumbnail_url ? (
                    <Image source={{ uri: v.thumbnail_url }} style={styles.thumbImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="videocam-outline" size={24} color="#6B7280" />
                    </View>
                  )}
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={2}>{v.title || 'Sans titre'}</Text>
                  <Text style={styles.resultSub} numberOfLines={1}>{v.creator_name || 'Créateur'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {showUsers && users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="people" size={18} color="#2563eb" /> Utilisateurs ({users.length})
            </Text>
            <View style={styles.userGrid}>
              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.userCard}
                  activeOpacity={0.8}
                  onPress={() => handleUserPress(u)}
                >
                  {u.profile_image ? (
                    <Image source={{ uri: u.profile_image }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarLetter}>
                        {(u.full_name || u.username || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.userName} numberOfLines={1}>
                    {u.full_name || u.username || 'Utilisateur'}
                  </Text>
                  <Text style={styles.userHandle} numberOfLines={1}>
                    @{u.username || 'user'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Vidéos, utilisateurs…"
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          { key: FILTER_ALL, label: 'Tous' },
          { key: FILTER_VIDEOS, label: 'Vidéos' },
          { key: FILTER_USERS, label: 'Utilisateurs' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, filter === key && styles.tabActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.tabLabel, filter === key && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#F9FAFB',
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1F2937',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipText: {
    fontSize: 14,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  resultsContainer: {
    paddingTop: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  videoThumb: {
    width: 96,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  resultSub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resultMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  userCard: {
    width: '47%',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  avatarWrap: {
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  userHandle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
