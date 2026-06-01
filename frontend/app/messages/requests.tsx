import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Colors, FontSizes, Spacing } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { safeRouterBack } from '../../src/utils/safeRouter';
import apiClient from '../../src/api/client';
import MessageRequestDetailPane from './components/MessageRequestDetailPane';

/** Au-delà de cette largeur : disposition type TikTok (liste + détail côte à côte). */
const SPLIT_LAYOUT_MIN_WIDTH = 720;

interface Row {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  otherUserId?: string;
}

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Maintenant';
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Hier';
  if (diffD < 7) return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function lastMessageLabel(raw: string) {
  const t = (raw || '').trim();
  if (!t) return 'Nouveau message';
  if (t === 'Video' || t === 'Vidéo') return 'A partagé une vidéo…';
  if (t === 'Image') return 'A partagé une image…';
  if (t === 'Audio' || t.startsWith('Vocal')) return 'A envoyé un message vocal…';
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

export default function MessageRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= SPLIT_LAYOUT_MIN_WIDTH;
  const sidebarWidth = isWide ? Math.min(380, Math.round(windowWidth * 0.36)) : windowWidth;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/messages/conversations', {
        params: { inbox: 'requests', page: 1, limit: 50 },
      });
      const data = response.data?.data || response.data;
      const backendConvos = data?.conversations || [];
      const transformed: Row[] = backendConvos.map((c: any) => {
        const other = c.other || {};
        const displayName = other.full_name || other.username || 'Contact';
        const avatar =
          other.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=fff`;
        return {
          id: c.id,
          name: displayName,
          avatar,
          lastMessage: lastMessageLabel(c.last_message_text || ''),
          time: c.last_message_at ? formatTimeAgo(c.last_message_at) : '',
          otherUserId: other.id,
        };
      });
      setRows(transformed);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isWide || rows.length === 0) return;
    setSelectedId((prev) => {
      if (prev && rows.some((r) => r.id === prev)) return prev;
      return rows[0]?.id ?? null;
    });
  }, [isWide, rows]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const openChatMobile = (item: Row) => {
    router.push({
      pathname: '/messages/[id]',
      params: {
        id: item.id,
        name: item.name,
        avatar: item.avatar,
        otherUserId: item.otherUserId || '',
        fromRequest: '1',
      },
    });
  };

  const selectedRow = selectedId ? rows.find((r) => r.id === selectedId) : null;

  const listHeader = (
    <View style={[styles.header, isWide && styles.headerSidebar]}>
      <TouchableOpacity onPress={() => safeRouterBack('/messages')} style={styles.backBtn} accessibilityLabel="Retour">
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        Demandes de messages
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderList = () => {
    if (loading) {
      return (
        <View style={[styles.centered, isWide && styles.listFlex]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.muted}>Chargement…</Text>
        </View>
      );
    }
    if (rows.length === 0) {
      return (
        <View style={[styles.centered, isWide && styles.listFlex]}>
          <Ionicons name="mail-unread-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucune demande</Text>
          <Text style={styles.muted}>Les nouvelles conversations apparaîtront ici.</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={isWide ? styles.listFlex : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={isWide ? null : listHeader}
        renderItem={({ item }) => {
          const selected = isWide && item.id === selectedId;
          return (
            <TouchableOpacity
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => {
                if (isWide) setSelectedId(item.id);
                else openChatMobile(item);
              }}
              activeOpacity={0.7}
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.snippet} numberOfLines={1}>
                  {item.lastMessage} {item.time ? `· ${item.time}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  if (isWide) {
    return (
      <View style={[styles.container, styles.splitRoot, { paddingTop: insets.top }]}>
        <View style={[styles.sidebar, { width: sidebarWidth, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.12)' }]}>
          {listHeader}
          {renderList()}
        </View>
        <View style={styles.detailColumn}>
          <MessageRequestDetailPane
            conversationId={selectedRow?.id ?? null}
            initialName={selectedRow?.name ?? ''}
            initialAvatar={selectedRow?.avatar ?? ''}
            initialOtherUserId={selectedRow?.otherUserId ?? ''}
            onAfterAccept={() => void load()}
            onAfterDecline={() => {
              setSelectedId(null);
              void load();
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {listHeader}
      {renderList()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  splitRoot: { flexDirection: 'row', backgroundColor: '#000' },
  sidebar: { backgroundColor: Colors.background, flex: 0 },
  listFlex: { flex: 1 },
  detailColumn: { flex: 1, minWidth: 0, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerSidebar: {
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm },
  headerTitle: { flex: 1, fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  headerSpacer: { width: 40 },
  list: { paddingVertical: Spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.card },
  rowBody: { flex: 1, minWidth: 0 },
  name: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  snippet: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.md },
  muted: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
});
