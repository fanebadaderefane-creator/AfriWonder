import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../src/theme/colors';
import { useDownloadedVideos, type DownloadedVideo } from '../src/services/videoDownloadService';
import { toAbsoluteMediaUrl } from '../src/utils/absoluteMediaUrl';

function formatBytes(n: number) {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} Go`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${n} o`;
}

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const { videos, storageInfo, loading, refresh, clearAll } = useDownloadedVideos();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const pct = storageInfo.max > 0 ? Math.min(100, (storageInfo.used / storageInfo.max) * 100) : 0;

  const onClearAll = () => {
    Alert.alert(
      'Tout supprimer ?',
      'Les vidéos seront retirées de cet appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void clearAll().then(() => refresh());
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: DownloadedVideo }) => {
    const thumb = toAbsoluteMediaUrl(item.thumbnailUrl).trim() || undefined;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/watch/[id]', params: { id: item.id } })}
      >
        <View style={styles.thumbWrap}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="videocam" size={28} color={Colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title || 'Vidéo'}
          </Text>
          <Text style={styles.rowMeta}>
            {formatBytes(item.fileSize)} · {item.creatorName || 'Créateur'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes téléchargements</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.storageCard}>
        <Text style={styles.storageLabel}>Espace utilisé</Text>
        <View style={styles.storageBarBg}>
          <View style={[styles.storageBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.storageDetail}>
          {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.max)} · {storageInfo.count} vidéo
          {storageInfo.count > 1 ? 's' : ''}
        </Text>
        {videos.length > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={onClearAll}>
            <Text style={styles.clearBtnText}>Tout effacer</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.hint}>Les téléchargements hors ligne sont disponibles sur l'application mobile.</Text>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="download-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucune vidéo</Text>
              <Text style={styles.hint}>Ouvrez une vidéo et touchez Télécharger (fichier MP4).</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  storageCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  storageLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 8 },
  storageBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  storageDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 8 },
  clearBtn: { marginTop: 12, alignSelf: 'flex-start' },
  clearBtnText: { color: '#FF6B6B', fontWeight: '700', fontSize: 14 },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  thumbWrap: { marginRight: 12 },
  thumb: { width: 88, height: 50, borderRadius: 8, backgroundColor: '#222' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: Colors.text, fontSize: 17, fontWeight: '700', marginTop: 12 },
  hint: { color: Colors.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 20 },
});
