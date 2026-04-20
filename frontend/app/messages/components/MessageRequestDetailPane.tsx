import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../../src/theme/colors';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/authStore';
import ReportModal from '../../../src/components/ReportModal';

type DmRequestState = {
  pending_for_viewer: boolean;
  pending_for_user_id: string | null;
  initiator_user_id: string | null;
  initiator_messages_remaining: number;
  max_messages_before_accept: number;
};

type UiMsg = {
  id: string;
  type: string;
  text: string;
  time: string;
  createdAt: Date;
  imageUri?: string;
  thumbnailUri?: string;
  isMine: boolean;
};

function formatFrenchDateTime(d: Date) {
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  conversationId: string | null;
  initialName: string;
  initialAvatar: string;
  initialOtherUserId: string;
  onAfterAccept?: () => void;
  onAfterDecline?: () => void;
};

export default function MessageRequestDetailPane({
  conversationId,
  initialName,
  initialAvatar,
  initialOtherUserId,
  onAfterAccept,
  onAfterDecline,
}: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';

  const [contact, setContact] = useState({ name: initialName, handle: '', avatar: initialAvatar });
  const [recipientUserId, setRecipientUserId] = useState(initialOtherUserId);
  const [dmRequest, setDmRequest] = useState<DmRequestState | null>(null);
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [dmActionLoading, setDmActionLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    setLoading(true);
    try {
      const [convRes, msgRes] = await Promise.all([
        apiClient.get(`/messages/conversations/id/${encodeURIComponent(conversationId)}`),
        apiClient.get(`/messages/${encodeURIComponent(conversationId)}`, { params: { limit: 40 } }),
      ]);
      const conv = convRes.data?.data;
      const data = msgRes.data?.data || msgRes.data;
      const backendMsgs = data?.messages || [];

      if (conv) {
        const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1;
        if (other?.id) setRecipientUserId(other.id);
        setContact({
          name: other?.full_name || other?.username || initialName,
          handle: other?.username ? `@${other.username}` : '',
          avatar: other?.profile_image || initialAvatar,
        });
        const dr = conv.dm_request;
        if (dr && typeof dr === 'object') {
          setDmRequest({
            pending_for_viewer: !!dr.pending_for_viewer,
            pending_for_user_id: dr.pending_for_user_id ?? null,
            initiator_user_id: dr.initiator_user_id ?? null,
            initiator_messages_remaining:
              typeof dr.initiator_messages_remaining === 'number' ? dr.initiator_messages_remaining : 0,
            max_messages_before_accept:
              typeof dr.max_messages_before_accept === 'number' ? dr.max_messages_before_accept : 3,
          });
        } else {
          setDmRequest(null);
        }
      }

      const list: UiMsg[] = [];
      backendMsgs.forEach((m: any) => {
        const msgDate = new Date(m.created_at);
        list.push({
          id: m.id,
          type: m.type || 'text',
          text: m.deleted_for_all_at || m.is_deleted ? 'Ce message a été supprimé' : (m.content || ''),
          time: msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          createdAt: msgDate,
          imageUri: m.media_url || undefined,
          thumbnailUri: m.thumbnail_url || undefined,
          isMine: m.sender_id === currentUserId,
        });
      });
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setMessages(list);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId, initialAvatar, initialName]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleAcceptDm = async () => {
    if (!conversationId || dmActionLoading) return;
    setDmActionLoading(true);
    try {
      await apiClient.post(`/messages/conversations/${encodeURIComponent(conversationId)}/dm-request/accept`, {});
      setDmRequest(null);
      onAfterAccept?.();
      Alert.alert('', 'Discussion acceptée.');
    } catch (e: any) {
      Alert.alert(
        'Erreur',
        String(e?.response?.data?.error?.message || e?.response?.data?.error || "Impossible d'accepter.")
      );
    } finally {
      setDmActionLoading(false);
    }
  };

  const handleDeclineDm = async () => {
    if (!conversationId || dmActionLoading) return;
    setDmActionLoading(true);
    try {
      await apiClient.post(`/messages/conversations/${encodeURIComponent(conversationId)}/dm-request/decline`, {});
      onAfterDecline?.();
    } catch (e: any) {
      Alert.alert(
        'Erreur',
        String(e?.response?.data?.error?.message || e?.response?.data?.error || 'Impossible de supprimer.')
      );
    } finally {
      setDmActionLoading(false);
    }
  };

  if (!conversationId) {
    return (
      <View style={[styles.emptyPane, { paddingBottom: insets.bottom }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyPaneText}>Sélectionnez une demande</Text>
      </View>
    );
  }

  const showFooter = dmRequest?.pending_for_viewer === true;
  const maxMsg = dmRequest?.max_messages_before_accept ?? 3;

  return (
    <View style={styles.paneRoot}>
      <View style={[styles.detailHeader, { paddingTop: Spacing.sm }]}>
        <Image source={{ uri: contact.avatar }} style={styles.detailHeaderAvatar} />
        <View style={styles.detailHeaderText}>
          <Text style={styles.detailHeaderName} numberOfLines={1}>
            {contact.name}
          </Text>
          {contact.handle ? (
            <Text style={styles.detailHeaderHandle} numberOfLines={1}>
              {contact.handle}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          messages.map((m, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const showDayHeader =
              i === 0 || !prev || prev.createdAt.toDateString() !== m.createdAt.toDateString();
            return (
              <View key={m.id}>
                {showDayHeader ? (
                  <Text style={styles.dateCenter}>{formatFrenchDateTime(m.createdAt)}</Text>
                ) : null}
                <View style={[styles.msgRow, m.isMine && styles.msgRowMine]}>
                  {!m.isMine && <Image source={{ uri: contact.avatar }} style={styles.msgAvatar} />}
                  <View style={[styles.bubble, m.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {m.type === 'video' && (m.thumbnailUri || m.imageUri) ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => m.imageUri && Linking.openURL(m.imageUri)}
                      >
                        <View style={styles.videoWrap}>
                          <Image
                            source={{ uri: m.thumbnailUri || m.imageUri }}
                            style={styles.videoThumb}
                            resizeMode="cover"
                          />
                          <View style={styles.playOverlay}>
                            <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.95)" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : m.type === 'image' && m.imageUri ? (
                      <Image source={{ uri: m.imageUri }} style={styles.chatImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.bubbleText}>{m.text}</Text>
                    )}
                    <Text style={styles.bubbleTime}>{m.time}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {showFooter && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Text style={styles.footerTitle}>
            {contact.name} veut t&apos;envoyer un message
          </Text>
          <Text style={styles.footerBody}>
            Si tu acceptes, tu pourras chatter immédiatement avec cet utilisateur. Si tu supprimes, ce chat sera retiré
            de tes demandes de messages.{'\n\n'}
            Remarque : cet utilisateur peut envoyer jusqu&apos;à {maxMsg} messages.{' '}
            <Text style={styles.footerLink} onPress={() => setReportOpen(true)}>
              Signale cet utilisateur
            </Text>{' '}
            si tu en reçois un suspect.
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.btnDecline}
              onPress={handleDeclineDm}
              disabled={dmActionLoading}
              accessibilityRole="button"
              accessibilityLabel="Supprimer la demande"
            >
              <Text style={styles.btnDeclineText}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnAccept}
              onPress={handleAcceptDm}
              disabled={dmActionLoading}
              accessibilityRole="button"
              accessibilityLabel="Accepter la demande"
            >
              <Text style={styles.btnAcceptText}>Accepter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={recipientUserId || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  paneRoot: {
    flex: 1,
    backgroundColor: '#000000',
    minWidth: 0,
  },
  emptyPane: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyPaneText: { marginTop: Spacing.md, color: Colors.textMuted, fontSize: FontSizes.md },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    gap: Spacing.md,
  },
  detailHeaderAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222' },
  detailHeaderText: { flex: 1, minWidth: 0 },
  detailHeaderName: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700' },
  detailHeaderHandle: { color: 'rgba(255,255,255,0.45)', fontSize: FontSizes.sm, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  loadingBox: { paddingVertical: Spacing.xl, alignItems: 'center' },
  dateCenter: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: FontSizes.xs,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.sm, gap: Spacing.sm },
  msgRowMine: { justifyContent: 'flex-end' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    overflow: 'hidden',
  },
  bubbleTheirs: { backgroundColor: '#1F2C34' },
  bubbleMine: { backgroundColor: '#005C4B' },
  bubbleText: { color: '#E9EDEF', fontSize: FontSizes.md, lineHeight: 22 },
  bubbleTime: { color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  videoWrap: { position: 'relative', width: 200, height: 280, borderRadius: 8, overflow: 'hidden' },
  videoThumb: { width: 200, height: 280, borderRadius: 8, backgroundColor: '#111' },
  chatImage: { width: 200, height: 200, borderRadius: 8 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: '#000000',
  },
  footerTitle: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700', marginBottom: Spacing.sm },
  footerBody: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm, lineHeight: 20, marginBottom: Spacing.md },
  footerLink: { color: Colors.primary, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: Spacing.md },
  btnDecline: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  btnDeclineText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '600' },
  btnAccept: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  btnAcceptText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700' },
});
