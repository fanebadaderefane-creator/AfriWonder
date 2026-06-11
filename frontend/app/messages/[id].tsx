import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Modal, Alert, Pressable, Animated, Linking, AppState } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import socketService from '../../src/services/socketService';
import ReportModal from '../../src/components/ReportModal';
import { featureFlags } from '../../src/config/featureFlags';
import { devLog } from '../../src/utils/devLog';
import { profileAvatarUri } from '../../src/utils/avatarFallback';
import { getAlertMessageForCaughtError } from '../../src/utils/userFacingError';
import { showMessageSendError } from '../../src/messages/dmAccess';
import { patchInboxConversation, type InboxConversationPatch } from '../../src/messages/inboxSync';
import { formatContactShareLine, openMaps } from '../../src/screens/messages/messageAttachmentUtils';
import NetInfo from '@react-native-community/netinfo';
import {
  ensureCameraPermissionForDm,
  ensureMediaLibraryPermissionForDm,
} from '../../src/messages/dmNativePermissions';
import { sendDmOutboundMedia } from '../../src/messages/sendDmOutboundMedia';
import { startDmVoiceRecording, stopDmVoiceRecording } from '../../src/messages/dmVoiceRecording';
import { isLocalOnlyMessageId } from '../../src/messages/dmMessageLocalId';
import {
  filterOutHiddenDmMessages,
  hideDmMessageForMe,
  loadHiddenDmMessageIds,
} from '../../src/messages/dmHiddenMessages';
import {
  createDmThreadApi,
  isGroupSocketEnvelope,
  parseThreadKind,
} from '../../src/messages/dmThreadApi';
import {
  applyDeletedForAllUi,
  injectDateSeparators,
  mapApiMessageToChatUi,
  mergeThreadMessagesById,
  stripThreadDateSeparators,
} from '../../src/messages/dmChatMessageMapper';
import { callLogTapToRedial, type CallLogMeta } from '../../src/messages/callLogDisplay';
import { CallLogBubble } from '../../src/messages/CallLogBubble';
import { createMessageHighlightDelayedRelease } from '../../src/messages/messageBubbleHighlightTiming';
import { extractMessageReadReaderId, shouldApplyPeerReceiptEvent } from '../../src/messages/dmReadReceipt';
import { formatPeerPresenceLabel } from '../../src/messages/dmPeerPresence';
import { markThreadOpened } from '../../src/messages/dmThreadRuntime';
import {
  loadFailedOutbound,
  removeFailedOutbound,
  upsertFailedOutbound,
  type StoredFailedMessage,
} from '../../src/messages/outboundFailedStore';
import {
  loadPendingOutbound,
  removePendingOutbound,
  upsertPendingOutbound,
  type StoredPendingMessage,
} from '../../src/messages/outboundPendingStore';
import {
  loadThreadMessageCache,
  mergeThreadWithLocalOutbound,
  saveThreadMessageCache,
} from '../../src/messages/dmThreadMessageCache';
import { mergeThreadMessageSources } from '../../src/messages/dmInboxPersistence';
import { navigateToReceiverCallScreen, openNativeCallScreen } from '../../src/call/openNativeCallScreen';
import { prefetchTurnCredentials } from '../../src/call/prefetchTurnCredentials';
import { callUserIdsEqual } from '../../src/call/callSignalingPayload';
import { safeRouterBack, safeRouterPush } from '../../src/utils/safeRouter';
import { ChatWallpaperPattern } from '../../src/components/messages/ChatWallpaperPattern';
import { ReplyQuoteBlock } from '../../src/components/messages/ReplyQuoteBlock';
import { VoiceMessageBubble } from '../../src/components/messages/VoiceMessageBubble';
import { MediaViewerModal, type MediaViewerItem } from '../../src/components/messages/MediaViewerModal';
import { MediaCaptionComposer, type MediaComposerDraft } from '../../src/components/messages/MediaCaptionComposer';
import {
  MessageBubbleMenuChevron,
  MessageContextMenu,
} from '../../src/components/messages/MessageContextMenu';
import {
  parseDmRequestFromApi,
  parsePeerBlockFromApi,
  type DmRequestState,
  type PeerBlockState,
} from '../../src/messages/dmRequestState';

const { width } = Dimensions.get('window');
const THREAD_MESSAGES_PAGE_SIZE = 50;

interface Message {
  id: string;
  text: string;
  isMine: boolean;
  time: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'sending';
  type: 'text' | 'image' | 'voice' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'file' | 'call';
  imageUri?: string;
  thumbnailUri?: string;
  voiceDuration?: string;
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  contactShareLine?: string;
  retryMeta?: {
    kind: 'voice' | 'audio' | 'image' | 'video' | 'document';
    localUri: string;
    fileName?: string;
    mimeType?: string;
    durationSec?: number;
  };
  replyTo?: { id: string; name: string; text: string };
  date?: string;
  reactions?: { emoji: string; count: number; myReaction: boolean }[];
  starred?: boolean;
  pinned?: boolean;
  forwarded?: boolean;
  edited?: boolean;
  deleted?: boolean;
  transcription?: string;
  transcribing?: boolean;
  translation?: { targetLang: string; text: string };
  translating?: boolean;
  /** Fil groupe : nom de l’expéditeur au-dessus de la bulle. */
  senderLabel?: string;
  callLog?: CallLogMeta;
  callLogTitle?: string;
  callLogSubtitle?: string;
  callLogIcon?: 'call' | 'videocam' | 'call-outline' | 'arrow-redo';
  callLogTint?: string;
  createdAt?: string;
}

/** Langues supportées par GPT-5.2 pour la traduction des transcriptions vocales. */
const TRANSLATION_LANGUAGES: { code: 'fr' | 'en' | 'bm' | 'wo'; label: string; flag: string }[] = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'bm', label: 'BM', flag: '🇲🇱' },
  { code: 'wo', label: 'WO', flag: '🇸🇳' },
];

function toStoredPendingMessage(msg: Message): StoredPendingMessage | null {
  if (msg.type === 'call' || !msg.retryMeta?.localUri) return null;
  return {
    id: msg.id,
    text: msg.text,
    isMine: msg.isMine,
    time: msg.time,
    status: 'pending',
    type: msg.type,
    imageUri: msg.imageUri,
    thumbnailUri: msg.thumbnailUri,
    voiceDuration: msg.voiceDuration,
    retryMeta: msg.retryMeta,
  };
}

function toStoredFailedMessage(msg: Message): StoredFailedMessage | null {
  if (msg.type === 'call' || msg.status !== 'failed' || !msg.retryMeta?.localUri) return null;
  return {
    id: msg.id,
    text: msg.text,
    isMine: msg.isMine,
    time: msg.time,
    status: 'failed',
    type: msg.type,
    imageUri: msg.imageUri,
    thumbnailUri: msg.thumbnailUri,
    voiceDuration: msg.voiceDuration,
    retryMeta: msg.retryMeta,
  };
}

function outboundKindFromMessage(msg: Message): 'voice' | 'audio' | 'image' | 'video' | 'document' {
  const k = msg.retryMeta?.kind;
  if (k) return k;
  if (msg.type === 'file') return 'document';
  if (msg.type === 'video') return 'video';
  if (msg.type === 'image') return 'image';
  return 'audio';
}

function inboxPreviewForSend(
  type: string,
  content?: string,
): { text: string; lastMsgType: NonNullable<InboxConversationPatch['lastMsgType']> } {
  const t = String(type || 'text').toLowerCase();
  if (t === 'image') return { text: 'Photo', lastMsgType: 'image' };
  if (t === 'video') return { text: 'Video', lastMsgType: 'video' };
  if (t === 'audio' || t === 'voice') return { text: 'Audio', lastMsgType: 'voice' };
  if (t === 'file') return { text: (content || 'Fichier').slice(0, 200), lastMsgType: 'file' };
  if (t === 'location') return { text: 'Position', lastMsgType: 'text' };
  if (t === 'contact') return { text: 'Contact', lastMsgType: 'text' };
  return { text: (content || '').slice(0, 200) || 'Message', lastMsgType: 'text' };
}

function notifyInboxAfterSend(
  convId: string,
  type: string,
  content?: string,
  lastOutgoingStatus: 'sent' | 'delivered' | 'read' = 'sent',
) {
  if (!convId) return;
  const preview = inboxPreviewForSend(type, content);
  patchInboxConversation({
    conversationId: convId,
    lastMessage: preview.text,
    lastMessageAt: new Date().toISOString(),
    lastMsgType: preview.lastMsgType,
    isMine: true,
    lastOutgoingStatus,
  });
}

function resolvePickerMediaTypes(): any {
  const picker = ImagePicker as unknown as {
    MediaType?: { Images?: unknown; Videos?: unknown };
    MediaTypeOptions?: { All?: unknown };
  };
  // SDK 53+: preferer `MediaType` (nouvelle API), fallback legacy si absent.
  if (picker.MediaType?.Images && picker.MediaType?.Videos) {
    return [picker.MediaType.Images, picker.MediaType.Videos];
  }
  return picker.MediaTypeOptions?.All ?? ['images', 'videos'];
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams();
  const { id, name: paramName, avatar: paramAvatar, otherUserId: paramOtherUserId } = searchParams;
  const conversationId = Array.isArray(id) ? String(id[0] || '') : String(id || '');
  const threadKind = parseThreadKind(searchParams as Record<string, string | string[] | undefined>);
  const isGroupThread = threadKind === 'group';
  const threadApi = useMemo(
    () => createDmThreadApi(conversationId, threadKind),
    [conversationId, threadKind],
  );
  const { user, accessToken, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const currentUserId = user?.id || '';
  const myAvatarUri = profileAvatarUri(
    user?.profile_image as string | undefined,
    String(user?.full_name || user?.username || 'Moi').trim(),
  );
  const ensureAuthenticated = useCallback((action: string): boolean => {
    if (isAuthenticated) return true;
    Alert.alert('Connexion', `Connectez-vous pour ${action}.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se connecter', onPress: () => safeRouterPush('/(auth)/login') },
    ]);
    return false;
  }, [isAuthenticated]);

  const [contact, setContact] = useState({
    name: (paramName as string) || 'Contact',
    username: '' as string,
    avatar: profileAvatarUri(
      paramAvatar as string | undefined,
      String(paramName || '').trim() || 'Contact',
    ),
    online: false,
    lastSeen: '',
    otherUserId: (paramOtherUserId as string) || '',
  });

  const [dmRequest, setDmRequest] = useState<DmRequestState | null>(null);
  const [peerBlock, setPeerBlock] = useState<PeerBlockState | null>(null);
  const [peerMenuOpen, setPeerMenuOpen] = useState(false);
  const [wonderBackLoading, setWonderBackLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [dmActionLoading, setDmActionLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [viewerItem, setViewerItem] = useState<MediaViewerItem | null>(null);
  const [composerDraft, setComposerDraft] = useState<MediaComposerDraft | null>(null);
  /** Évite une boucle infinie : les callbacks lisent les messages via ref, pas via dépendance. */
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'session' | 'network' | 'not_found' | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const nextCursorRef = useRef<string | null>(null);
  const skipScrollToEndRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  /** Même appelant que l’onglet courant : pastille type WhatsApp « Ça sonne » dans le fil. */
  const [peerIncomingCall, setPeerIncomingCall] = useState<{
    callId: string;
    media: 'audio' | 'video';
    fromUserId: string;
    callerName?: string;
    callerAvatar?: string;
  } | null>(null);

  // Context menu state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  /** Bulle survolée / pressée — affiche le chevron menu sans recouvrir le texte au repos. */
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightDelayedReleaseRef = useRef(createMessageHighlightDelayedRelease());
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Forward modal
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [contactsForPick, setContactsForPick] = useState<Contacts.ExistingContact[]>([]);
  const [recipientUserId, setRecipientUserId] = useState<string>(typeof paramOtherUserId === 'string' ? paramOtherUserId : '');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingAnim = useRef(new Animated.Value(1)).current;

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [listenedAudioIds, setListenedAudioIds] = useState<Set<string>>(() => new Set());
  const quoteFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Ephemeral messages

  // Typing indicator
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [peerPresence, setPeerPresence] = useState<{ online: boolean; lastSeen: string | null }>({
    online: false,
    lastSeen: null,
  });

  const autoRetryInFlightRef = useRef(false);

  const markOutboundFailed = useCallback(
    (tempId: string) => {
      void removePendingOutbound(conversationId, tempId);
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m));
        const failed = next.find((m) => m.id === tempId);
        const stored = failed ? toStoredFailedMessage(failed) : null;
        if (stored) void upsertFailedOutbound(conversationId, stored);
        return next;
      });
    },
    [conversationId],
  );

  const applyOutboundSuccess = useCallback(
    (
      tempId: string,
      result: Awaited<ReturnType<typeof sendDmOutboundMedia>>,
      patch?: Partial<Message>,
    ) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                id: result.serverMessageId,
                status: 'sent',
                imageUri: result.mediaUrl,
                thumbnailUri: result.thumbnailUrl ?? m.thumbnailUri,
                ...patch,
              }
            : m,
        ),
      );
      void removeFailedOutbound(conversationId, tempId);
      void removePendingOutbound(conversationId, tempId);
    },
    [conversationId],
  );

  const trackPendingOutbound = useCallback(
    (msg: Message) => {
      const stored = toStoredPendingMessage(msg);
      if (stored) void upsertPendingOutbound(conversationId, stored);
    },
    [conversationId],
  );

  const flatListRef = useRef<FlatList>(null);

  const formatDateLabel = (date: Date) => {
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / 3600000);
    if (diffH < 24) return "Aujourd'hui";
    if (diffH < 48) return 'Hier';
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const mergeThreadWithOutboundLocal = useCallback(async (base: Message[]): Promise<Message[]> => {
    const hiddenIds = await loadHiddenDmMessageIds(conversationId);
    const failedLocal = await loadFailedOutbound(conversationId);
    const pendingLocal = await loadPendingOutbound(conversationId);
    const filtered = filterOutHiddenDmMessages(base, hiddenIds);
    return mergeThreadWithLocalOutbound(filtered, pendingLocal, failedLocal) as Message[];
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoadError('session');
      setLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const cached = await loadThreadMessageCache(conversationId);
      if (cached.length > 0 && messagesRef.current.length === 0) {
        setMessages(await mergeThreadWithOutboundLocal(cached as Message[]));
      }
      const response = await apiClient.get(threadApi.messagesPath, {
        params: { limit: THREAD_MESSAGES_PAGE_SIZE },
      });
      const data = response.data?.data || response.data;
      const backendMsgs = (data?.messages || []) as Record<string, unknown>[];
      nextCursorRef.current = typeof data?.nextCursor === 'string' ? data.nextCursor : null;
      setHasMoreMessages(Boolean(data?.hasMore));
      const peerName = String(contact.name || 'Contact');
      const serverCore =
        backendMsgs.length > 0
          ? backendMsgs.map((m) =>
              mapApiMessageToChatUi(m, currentUserId, peerName, { isGroup: isGroupThread }),
            )
          : [];
      const source = mergeThreadMessageSources(
        serverCore,
        cached as Message[],
        messagesRef.current,
      );
      if (backendMsgs.length === 0 && source.length > 0) {
        devLog('[dm] API messages vide — conservation cache / UI', {
          conversationId,
          sourceCount: source.length,
        });
      }
      const withDates = injectDateSeparators(source, formatDateLabel) as Message[];
      const merged = await mergeThreadWithOutboundLocal(withDates);
      setMessages(merged);
      if (backendMsgs.length > 0) {
        void saveThreadMessageCache(conversationId, merged);
      } else if (merged.length > 0) {
        void saveThreadMessageCache(conversationId, merged);
      }
    } catch (err) {
      devLog('Error loading messages:', err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || !isAuthenticated) {
        setLoadError('session');
      } else if (status === 404) {
        /** Conversation supprimée ou ID obsolète en cache — évite boucle d’erreurs Sentry. */
        setLoadError('not_found');
        setMessages([]);
      } else {
        const cached = await loadThreadMessageCache(conversationId);
        const merged = await mergeThreadWithOutboundLocal(cached as Message[]);
        if (merged.length > 0) {
          setMessages(merged);
          setLoadError('network');
        } else {
          setLoadError('network');
        }
      }
    } finally { setLoading(false); }
  }, [authLoading, isAuthenticated, conversationId, currentUserId, threadApi.messagesPath, contact.name, isGroupThread, mergeThreadWithOutboundLocal]);

  const loadOlderMessages = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (!cursor || loadingOlder || !hasMoreMessages) return;
    skipScrollToEndRef.current = true;
    setLoadingOlder(true);
    try {
      const response = await apiClient.get(threadApi.messagesPath, {
        params: { limit: THREAD_MESSAGES_PAGE_SIZE, cursor },
      });
      const data = response.data?.data || response.data;
      const backendMsgs = (data?.messages || []) as Record<string, unknown>[];
      nextCursorRef.current = typeof data?.nextCursor === 'string' ? data.nextCursor : null;
      setHasMoreMessages(Boolean(data?.hasMore));
      if (backendMsgs.length === 0) return;
      const peerName = String(contact.name || 'Contact');
      const olderUi = backendMsgs.map((m) =>
        mapApiMessageToChatUi(m, currentUserId, peerName, { isGroup: isGroupThread }),
      );
      setMessages((prev) => {
        const core = mergeThreadMessagesById(stripThreadDateSeparators(prev), olderUi);
        return injectDateSeparators(core, formatDateLabel) as Message[];
      });
    } catch (err) {
      devLog('Error loading older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [
    contact.name,
    currentUserId,
    hasMoreMessages,
    isGroupThread,
    loadingOlder,
    threadApi.messagesPath,
  ]);

  const ensureRecipientUserId = useCallback(async (): Promise<string | null> => {
    if (recipientUserId) return recipientUserId;
    try {
      const res = await apiClient.get(`/messages/conversations/id/${encodeURIComponent(conversationId)}`);
      const conv = res.data?.data;
      if (!conv || !currentUserId) return null;
      const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1;
      const rid = typeof other?.id === 'string' ? other.id : '';
      if (!rid) return null;
      setRecipientUserId(rid);
      return rid;
    } catch {
      return null;
    }
  }, [recipientUserId, conversationId, currentUserId]);

  const resolveOutboundRecipient = useCallback(async (): Promise<string | null> => {
    if (isGroupThread) return '';
    const rid = (await ensureRecipientUserId()) || '';
    if (!rid) {
      Alert.alert('Erreur', 'Destinataire introuvable pour cette conversation.');
      return null;
    }
    return rid;
  }, [isGroupThread, ensureRecipientUserId]);

  const flushFailedOutboundQueue = useCallback(async () => {
    if (autoRetryInFlightRef.current) return;
    const pending = messagesRef.current.filter(
      (m) => (m.status === 'failed' || m.status === 'sending') && m.retryMeta?.localUri,
    );
    if (pending.length === 0) return;
    autoRetryInFlightRef.current = true;
    try {
      let rid = '';
      if (!isGroupThread) {
        rid = (await ensureRecipientUserId()) || '';
        if (!rid) return;
      }
      for (const msg of pending) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'sending' as const } : m)));
        try {
          const result = await sendDmOutboundMedia({
            kind: outboundKindFromMessage(msg),
            localUri: msg.retryMeta!.localUri,
            messageId: msg.id,
            recipientId: rid,
            conversationId,
            ...(isGroupThread ? { groupId: conversationId } : {}),
            content: msg.text || (msg.type === 'video' ? 'Video' : msg.type === 'image' ? 'Photo' : 'Audio'),
            fileName: msg.retryMeta?.fileName,
            mimeType: msg.retryMeta?.mimeType,
          });
          applyOutboundSuccess(msg.id, result);
        } catch {
          markOutboundFailed(msg.id);
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    } finally {
      autoRetryInFlightRef.current = false;
    }
  }, [ensureRecipientUserId, conversationId, isGroupThread, applyOutboundSuccess, markOutboundFailed]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const unsubNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flushFailedOutboundQueue();
    });
    const unsubApp = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void flushFailedOutboundQueue();
    });
    return () => {
      unsubNet();
      unsubApp.remove();
    };
  }, [flushFailedOutboundQueue]);

  useEffect(() => {
    void prefetchTurnCredentials();
  }, [conversationId]);

  // Socket.IO real-time connection
  useEffect(() => {
    const token = accessToken || '';
    const peerName = String(contact.name || 'Contact');
    if (token) {
      socketService.connect(token);
      if (isGroupThread) {
        socketService.joinGroup(conversationId);
      } else {
        socketService.joinConversation(conversationId);
      }
      markThreadOpened(threadApi, apiClient).catch(() => {
        /* best effort */
      });
    }

    const appendIncoming = (raw: Record<string, unknown>) => {
      const senderId = String(raw.sender_id || '');
      const isCallLog = String(raw.type || '').toLowerCase() === 'call';
      if (senderId === currentUserId && !isCallLog) return;
      const ui = mapApiMessageToChatUi(raw, currentUserId, peerName, { isGroup: isGroupThread });
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === ui.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = ui as Message;
          return next;
        }
        return [...prev, ui as Message];
      });
      markThreadOpened(threadApi, apiClient).catch(() => {});
    };

    const unsubMsg = socketService.on('new_message', (payload: unknown) => {
      if (isGroupThread) {
        if (!isGroupSocketEnvelope(payload) || payload.groupId !== conversationId) return;
        appendIncoming(payload.message as Record<string, unknown>);
        return;
      }
      const msg = payload as Record<string, unknown>;
      if (String(msg.conversation_id || '') !== conversationId) return;
      appendIncoming(msg);
    });

    const unsubTyping = !isGroupThread
      ? socketService.on('user_typing', () => {
          setIsContactTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsContactTyping(false), 3000);
        })
      : () => {};

    const unsubStopTyping = !isGroupThread
      ? socketService.on('user_stop_typing', () => {
          setIsContactTyping(false);
        })
      : () => {};

    const unsubDelivered = socketService.on('message:delivered', (data: unknown) => {
      const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      const convId = String(row.conversationId || row.conversation_id || '').trim();
      if (convId !== conversationId) return;
      const actorId = extractMessageReadReaderId(data);
      if (!shouldApplyPeerReceiptEvent(actorId, currentUserId)) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.isMine && (m.status === 'sent' || m.status === 'sending')
            ? { ...m, status: 'delivered' as const }
            : m,
        ),
      );
      patchInboxConversation({
        conversationId: convId,
        isMine: true,
        lastOutgoingStatus: 'delivered',
      });
    });

    const unsubRead = socketService.on('messages_read', (data: unknown) => {
      const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      const convId = String(
        row.conversationId || row.conversation_id || row.groupId || row.group_id || '',
      ).trim();
      if (convId !== conversationId) return;
      const readerId = extractMessageReadReaderId(data);
      if (!shouldApplyPeerReceiptEvent(readerId, currentUserId)) return;
      setMessages((prev) => prev.map((m) => (m.isMine ? { ...m, status: 'read' } : m)));
      patchInboxConversation({
        conversationId: convId,
        isMine: true,
        lastOutgoingStatus: 'read',
      });
    });

    const applyDeletedForAll = (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? applyDeletedForAllUi(m) : m)),
      );
    };

    const unsubDeleted = socketService.on('message:deleted', (data: { messageId?: string }) => {
      const messageId = String(data?.messageId || '').trim();
      if (!messageId) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    const unsubDeletedAll = socketService.on('message:deleted_for_all', (data: { messageId?: string }) => {
      const messageId = String(data?.messageId || '').trim();
      if (!messageId) return;
      applyDeletedForAll(messageId);
    });

    const unsubUpdated = socketService.on(
      'message:updated',
      (data: { messageId?: string; content?: string; is_edited?: boolean }) => {
        const messageId = String(data?.messageId || '').trim();
        if (!messageId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  text: String(data.content ?? m.text),
                  edited: data.is_edited !== false,
                }
              : m,
          ),
        );
      },
    );

    return () => {
      if (isGroupThread) {
        socketService.leaveGroup(conversationId);
      } else {
        socketService.leaveConversation(conversationId);
      }
      unsubMsg();
      unsubTyping();
      unsubStopTyping();
      unsubDelivered();
      unsubRead();
      unsubDeleted();
      unsubDeletedAll();
      unsubUpdated();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, currentUserId, accessToken, isGroupThread, threadApi, contact.name]);

  useEffect(() => {
    if (isGroupThread || recipientUserId) return;
    void ensureRecipientUserId();
  }, [isGroupThread, recipientUserId, ensureRecipientUserId]);

  useEffect(() => {
    if (isGroupThread || !recipientUserId) return undefined;
    let cancelled = false;
    void apiClient
      .get(`/messages/presence/${encodeURIComponent(recipientUserId)}`)
      .then((res) => {
        if (cancelled) return;
        const p = res.data?.data;
        setPeerPresence({
          online: Boolean(p?.is_online),
          lastSeen: typeof p?.last_seen === 'string' ? p.last_seen : null,
        });
      })
      .catch(() => {
        if (!cancelled) setPeerPresence({ online: false, lastSeen: null });
      });
    const offPresence = socketService.on(
      'presence:update',
      (payload: { userId?: string; isOnline?: boolean; lastSeen?: string }) => {
        if (payload?.userId !== recipientUserId) return;
        setPeerPresence({
          online: Boolean(payload.isOnline),
          lastSeen:
            typeof payload.lastSeen === 'string'
              ? payload.lastSeen
              : payload.isOnline
                ? null
                : new Date().toISOString(),
        });
      },
    );
    return () => {
      cancelled = true;
      offPresence();
    };
  }, [isGroupThread, recipientUserId]);

  useEffect(() => {
    void loadMessages().then(() => flushFailedOutboundQueue());
  }, [loadMessages, flushFailedOutboundQueue]);

  /** Persiste les messages confirmés (URLs https) pour réouverture hors ligne. */
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    void saveThreadMessageCache(conversationId, messages);
  }, [conversationId, messages]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages().then(() => flushFailedOutboundQueue());
      if (conversationId) {
        markThreadOpened(threadApi, apiClient).catch(() => {});
      }
      void flushFailedOutboundQueue();
    }, [conversationId, loadMessages, flushFailedOutboundQueue, isGroupThread, threadApi]),
  );

  useEffect(() => {
    if (isGroupThread || !currentUserId || !recipientUserId) return;
    const onInvite = (p: {
      callId?: string;
      fromUserId?: string;
      toUserId?: string;
      type?: string;
      callerName?: string;
      callerAvatar?: string;
    }) => {
      if (!callUserIdsEqual(p?.toUserId, currentUserId) || !callUserIdsEqual(p?.fromUserId, recipientUserId)) return;
      if (!p?.callId) return;
      setPeerIncomingCall({
        callId: String(p.callId),
        media: p.type === 'video' ? 'video' : 'audio',
        fromUserId: String(p.fromUserId || recipientUserId),
        callerName: p.callerName,
        callerAvatar: p.callerAvatar,
      });
      void loadMessages();
    };
    const clearSame = (p: { callId?: string }) => {
      if (!p?.callId) return;
      setPeerIncomingCall((cur) => (cur?.callId === p.callId ? null : cur));
    };
    const refreshCallLog = (p: { callId?: string; fromUserId?: string; toUserId?: string }) => {
      if (!p?.callId) return;
      const involvesPeer =
        p.fromUserId === recipientUserId ||
        p.toUserId === recipientUserId ||
        p.fromUserId === currentUserId ||
        p.toUserId === currentUserId;
      if (!involvesPeer) return;
      void loadMessages();
    };
    const offInvite = socketService.on('call:invite', onInvite);
    type CallSocketPayload = {
      callId?: string;
      fromUserId?: string;
      toUserId?: string;
    };
    const offEnd = socketService.on('call:end', (p: CallSocketPayload) => {
      clearSame(p);
      refreshCallLog(p);
    });
    const offDecline = socketService.on('call:decline', (p: CallSocketPayload) => {
      clearSame(p);
      refreshCallLog(p);
    });
    const offMissed = socketService.on('call:missed', (p: CallSocketPayload) => {
      clearSame(p);
      refreshCallLog(p);
    });
    return () => {
      offInvite();
      offEnd();
      offDecline();
      offMissed();
    };
  }, [currentUserId, recipientUserId, isGroupThread, loadMessages]);

  useEffect(() => {
    const p = typeof paramOtherUserId === 'string' ? paramOtherUserId : '';
    if (p) setRecipientUserId(p);
  }, [paramOtherUserId]);

  useEffect(() => {
    if (!isGroupThread || !conversationId) return;
    let cancelled = false;
    const loadGroup = async () => {
      try {
        const res = await apiClient.get(`/messages/group/${encodeURIComponent(conversationId)}`);
        const g = res.data?.data ?? res.data;
        if (!g || cancelled) return;
        const displayName = String(g.name || '').trim() || 'Groupe';
        setContact((c) => ({
          ...c,
          name: displayName,
          username: g.members_count ? `${g.members_count} membres` : '',
          avatar: profileAvatarUri(g.avatar_url, displayName),
        }));
      } catch {
        /* ignore */
      }
    };
    void loadGroup();
    return () => {
      cancelled = true;
    };
  }, [conversationId, isGroupThread]);

  useEffect(() => {
    let cancelled = false;
    const resolveRecipient = async () => {
      if (isGroupThread || recipientUserId || !conversationId || !currentUserId) return;
      try {
        const res = await apiClient.get(`/messages/conversations/id/${encodeURIComponent(conversationId)}`);
        const conv = res.data?.data;
        if (!conv || cancelled) return;
        const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1;
        if (other?.id) setRecipientUserId(other.id);
        if (other && (other.full_name || other.username || other.id)) {
          setContact((c) => ({
            ...c,
            name: other.full_name || other.username || c.name,
            username: other.username ? `@${other.username}` : c.username,
            avatar: other.profile_image || c.avatar,
            otherUserId: other.id || c.otherUserId,
          }));
        }
        setDmRequest(parseDmRequestFromApi(conv.dm_request));
        setPeerBlock(parsePeerBlockFromApi(conv.peer_block));
      } catch {
        /* ignore */
      }
    };
    void resolveRecipient();
    return () => { cancelled = true; };
  }, [conversationId, currentUserId, recipientUserId, isGroupThread]);

  const handleAcceptDm = async () => {
    if (!conversationId || dmActionLoading) return;
    setDmActionLoading(true);
    try {
      await apiClient.post(`/messages/conversations/${encodeURIComponent(conversationId)}/dm-request/accept`, {});
      const resConv = await apiClient.get(`/messages/conversations/id/${encodeURIComponent(conversationId)}`);
      const conv = resConv.data?.data;
      setDmRequest(parseDmRequestFromApi(conv?.dm_request));
      setPeerBlock(parsePeerBlockFromApi(conv?.peer_block));
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    } finally {
      setDmActionLoading(false);
    }
  };

  const handleDeclineDm = async () => {
    if (!conversationId || dmActionLoading) return;
    setDmActionLoading(true);
    try {
      await apiClient.post(`/messages/conversations/${encodeURIComponent(conversationId)}/dm-request/decline`, {});
      safeRouterBack('/messages');
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    } finally {
      setDmActionLoading(false);
    }
  };

  const handleWonderBack = async () => {
    if (!recipientUserId || wonderBackLoading) return;
    setWonderBackLoading(true);
    try {
      await apiClient.post(`/users/${encodeURIComponent(recipientUserId)}/wonder`, {});
      setDmRequest((prev) => (prev ? { ...prev, viewer_wonders_initiator: true } : prev));
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    } finally {
      setWonderBackLoading(false);
    }
  };

  const handleBlockPeer = () => {
    if (!recipientUserId || isGroupThread) return;
    Alert.alert(
      'Bloquer ce contact',
      `${contact.name} ne pourra plus vous écrire ni vous appeler.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await apiClient.post('/messages/block', { userId: recipientUserId });
                setPeerBlock({ viewer_blocked_peer: true, peer_blocked_viewer: false });
                setPeerMenuOpen(false);
                safeRouterBack('/messages');
              } catch (e: unknown) {
                Alert.alert('Erreur', getAlertMessageForCaughtError(e));
              }
            })();
          },
        },
      ],
    );
  };

  const handleUnblockPeer = async () => {
    if (!recipientUserId || isGroupThread) return;
    try {
      await apiClient.delete(`/me/settings/blocked/${encodeURIComponent(recipientUserId)}`);
      setPeerBlock({ viewer_blocked_peer: false, peer_blocked_viewer: peerBlock?.peer_blocked_viewer ?? false });
      setPeerMenuOpen(false);
    } catch (e: unknown) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(e));
    }
  };

  const peerMessagingBlocked =
    !isGroupThread &&
    (peerBlock?.viewer_blocked_peer === true || peerBlock?.peer_blocked_viewer === true);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return;
    if (!ensureAuthenticated('envoyer un message')) return;
    let rid = recipientUserId;
    if (!isGroupThread) {
      rid = rid || (await ensureRecipientUserId()) || '';
      if (!rid) {
        Alert.alert('Erreur', 'Destinataire introuvable pour cette conversation.');
        return;
      }
    }
    const tempId = Date.now().toString();
    const msgText = newMessage.trim();
    const replyTarget = replyingTo;
    const msg: Message = {
      id: tempId,
      text: msgText,
      isMine: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text',
      replyTo: replyTarget
        ? { id: replyTarget.id, name: replyTarget.isMine ? 'Vous' : contact.name, text: replyTarget.text }
        : undefined,
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setReplyingTo(null);
    setSending(true);

    try {
      const body: Record<string, unknown> = isGroupThread
        ? { content: msgText, type: 'text' }
        : {
            recipientId: rid,
            content: msgText,
            type: 'text',
            ...(conversationId ? { conversationId } : {}),
          };
      if (replyTarget && replyTarget.id && !String(replyTarget.id).startsWith('date-')) {
        body.reply_to_id = replyTarget.id;
        if (!isGroupThread) body.reply_to_message_id = replyTarget.id;
      }
      const response = await apiClient.post(isGroupThread ? threadApi.sendPath : '/messages/send', body);
      const sentMsg = response.data?.data;
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: sentMsg?.id || tempId, status: 'sent' } : m));
      notifyInboxAfterSend(conversationId, 'text', msgText, 'sent');
      if (!isGroupThread) {
        try {
          const resConv = await apiClient.get(`/messages/conversations/id/${encodeURIComponent(conversationId)}`);
          const conv = resConv.data?.data;
          setDmRequest(parseDmRequestFromApi(conv?.dm_request));
          setPeerBlock(parsePeerBlockFromApi(conv?.peer_block));
        } catch {
          /* ignore */
        }
      }
    } catch (err: unknown) {
      showMessageSendError(err, { peerName: contact.name });
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally { setSending(false); }
  }, [
    newMessage,
    conversationId,
    sending,
    replyingTo,
    contact.name,
    recipientUserId,
    ensureAuthenticated,
    ensureRecipientUserId,
    isGroupThread,
    threadApi.sendPath,
  ]);

  // ===== VOICE RECORDING =====

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!ensureAuthenticated('envoyer un vocal')) return;
    try {
      const recording = await startDmVoiceRecording();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(recordingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();

      // Timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      devLog('Recording error:', err);
      const code = String((err as Error)?.message || '');
      if (code.includes('DM_MIC_PERMISSION')) {
        Alert.alert('Permission', 'Autorisez le microphone pour envoyer des vocaux');
      } else {
        Alert.alert('Erreur', 'Impossible de demarrer l\'enregistrement');
      }
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      recordingAnim.stopAnimation();
      recordingAnim.setValue(1);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const active = recordingRef.current;
      recordingRef.current = null;
      const uri = active ? await stopDmVoiceRecording(active) : null;
      const duration = recordingDuration;

      if (uri && duration >= 1) {
        const tempId = Date.now().toString();
        const voiceMsg: Message = {
          id: tempId,
          text: `Vocal ${formatDuration(duration)}`,
          isMine: true,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          status: 'sending',
          type: 'audio',
          voiceDuration: formatDuration(duration),
          imageUri: uri,
          retryMeta: {
            kind: 'voice',
            localUri: uri,
            mimeType: 'audio/m4a',
            durationSec: duration,
          },
        };
        setMessages(prev => [...prev, voiceMsg]);
        trackPendingOutbound(voiceMsg);

        try {
          const rid = await resolveOutboundRecipient();
          if (rid === null) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            return;
          }
          const result = await sendDmOutboundMedia({
            kind: 'voice',
            localUri: uri,
            messageId: tempId,
            recipientId: rid,
            conversationId,
            ...(isGroupThread ? { groupId: conversationId } : {}),
            content: `Vocal ${formatDuration(duration)}`,
            fileName: `voice_${tempId}.m4a`,
            mimeType: 'audio/mp4',
          });
          applyOutboundSuccess(tempId, result, { type: 'audio' });
          notifyInboxAfterSend(conversationId, 'audio', `Vocal ${formatDuration(duration)}`);
        } catch (err) {
          markOutboundFailed(tempId);
          showMessageSendError(err, { peerName: contact.name });
        }
      }
    } catch (err) {
      devLog('Stop recording error:', err);
    }
  };

  const cancelRecording = async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      recordingAnim.stopAnimation();
      recordingAnim.setValue(1);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {}
  };

  // ===== AUDIO PLAYBACK =====

  const playAudio = async (msg: Message) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (playingAudioId === msg.id) {
        setPlayingAudioId(null);
        return;
      }
      const uri = msg.imageUri;
      if (!uri) return;
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status) => {
        if (status.isLoaded) {
          if (status.durationMillis) {
            setAudioProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            setPlayingAudioId(null);
            setAudioProgress(0);
            setListenedAudioIds((prev) => new Set(prev).add(msg.id));
          }
        }
      });
      soundRef.current = sound;
      setPlayingAudioId(msg.id);
    } catch (err) {
      devLog('Playback error:', err);
    }
  };

  // ===== IMAGE/VIDEO PICKER =====

  const pickImage = useCallback(async (useCamera: boolean = false) => {
    if (!ensureAuthenticated('envoyer une image')) return;
    setShowAttach(false);
    try {
      let result;
      if (useCamera) {
        const granted = await ensureCameraPermissionForDm();
        if (!granted) { Alert.alert('Permission', 'Autorisez la camera'); return; }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: resolvePickerMediaTypes(),
          quality: 0.7,
          allowsEditing: false,
        });
      } else {
        const granted = await ensureMediaLibraryPermissionForDm();
        if (!granted) { Alert.alert('Permission', 'Autorisez la galerie'); return; }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: resolvePickerMediaTypes(),
          quality: 0.7,
          allowsMultipleSelection: false,
        });
      }
      if (!result.canceled && result.assets[0]) {
        const pickedAsset = result.assets[0];
        const isVideo = pickedAsset.type === 'video';
        let mediaUri = pickedAsset.uri;
        let mediaMimeType = pickedAsset.mimeType ?? null;
        let mediaFileName = pickedAsset.fileName ?? null;

        // Standardiser les images en JPEG pour limiter les rejets MIME/signature côté backend.
        if (!isVideo) {
          try {
            const transformed = await ImageManipulator.manipulateAsync(
              pickedAsset.uri,
              [],
              { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
            );
            mediaUri = transformed.uri;
            mediaMimeType = 'image/jpeg';
            mediaFileName = mediaFileName || `photo_${Date.now()}.jpg`;
          } catch {
            // fallback sur le fichier d'origine si la conversion échoue
          }
        }

        // Aperçu + légende avant l'envoi (façon WhatsApp) — l'envoi réel se fait dans sendComposedMedia.
        setComposerDraft({
          uri: mediaUri,
          isVideo,
          fileName: mediaFileName || undefined,
          mimeType: mediaMimeType || undefined,
        });
      }
    } catch (err: any) {
      devLog('Picker error:', err);
      const msg =
        err?.message ||
        "Impossible d'ouvrir la caméra/galerie sur cet appareil.";
      Alert.alert('Erreur', String(msg));
    }
  }, [ensureAuthenticated]);

  const sendComposedMedia = useCallback(
    async (draft: MediaComposerDraft, caption: string) => {
      setComposerDraft(null);
      const isVideo = draft.isVideo;
      const rid = await resolveOutboundRecipient();
      if (rid === null) return;
      const tempId = Date.now().toString();
      const fallbackLabel = isVideo ? 'Video' : 'Photo';
      const content = caption || fallbackLabel;
      const mediaMsg: Message = {
        id: tempId,
        text: content,
        isMine: true,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
        type: isVideo ? 'video' : 'image',
        imageUri: draft.uri,
        retryMeta: {
          kind: isVideo ? 'video' : 'image',
          localUri: draft.uri,
          fileName: draft.fileName,
          mimeType: draft.mimeType,
        },
      };
      setMessages((prev) => [...prev, mediaMsg]);
      trackPendingOutbound(mediaMsg);
      try {
        const resultSend = await sendDmOutboundMedia({
          kind: isVideo ? 'video' : 'image',
          localUri: draft.uri,
          messageId: tempId,
          recipientId: rid,
          conversationId,
          ...(isGroupThread ? { groupId: conversationId } : {}),
          content,
          fileName: draft.fileName,
          mimeType: draft.mimeType,
        });
        applyOutboundSuccess(tempId, resultSend, { type: isVideo ? 'video' : 'image', text: content });
        notifyInboxAfterSend(conversationId, isVideo ? 'video' : 'image', content);
      } catch (err: unknown) {
        markOutboundFailed(tempId);
        showMessageSendError(err, { peerName: contact.name });
      }
    },
    [resolveOutboundRecipient, conversationId, isGroupThread, applyOutboundSuccess, markOutboundFailed, contact.name],
  );

  const pickDocumentAttachment = useCallback(async () => {
    if (!ensureAuthenticated('envoyer un document')) return;
    setShowAttach(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const rid = await resolveOutboundRecipient();
      if (rid === null) return;
      const tempId = Date.now().toString();
      const label = asset.name || 'Document';
      const optimistic: Message = {
        id: tempId,
        text: label,
        isMine: true,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
        type: 'file',
        imageUri: asset.uri,
        retryMeta: {
          kind: 'document',
          localUri: asset.uri,
          fileName: asset.name || 'document.pdf',
          mimeType: asset.mimeType || 'application/pdf',
        },
      };
      setMessages((prev) => [...prev, optimistic]);
      trackPendingOutbound(optimistic);
      try {
        const resultSend = await sendDmOutboundMedia({
          kind: 'document',
          localUri: asset.uri,
          messageId: tempId,
          recipientId: rid,
          conversationId,
          ...(isGroupThread ? { groupId: conversationId } : {}),
          content: label.slice(0, 500),
          fileName: asset.name || 'document.pdf',
          mimeType: asset.mimeType || 'application/pdf',
        });
        applyOutboundSuccess(tempId, resultSend, { type: 'file' });
        notifyInboxAfterSend(conversationId, 'file', label);
      } catch (err) {
        markOutboundFailed(tempId);
        showMessageSendError(err, { peerName: contact.name });
      }
    } catch {
      Alert.alert('Erreur', 'Sélection du document annulée ou impossible.');
    }
  }, [resolveOutboundRecipient, conversationId, ensureAuthenticated, isGroupThread, contact.name, applyOutboundSuccess, markOutboundFailed]);

  const shareLocationAttachment = useCallback(async () => {
    setShowAttach(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Autorisez la localisation pour envoyer votre position.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const p = places[0];
        if (p) {
          const bits = [p.street, p.city || p.subregion, p.region].filter(Boolean);
          if (bits.length) label = bits.join(', ').slice(0, 400);
        }
      } catch {
        /* géocodage optionnel */
      }
      const rid = await resolveOutboundRecipient();
      if (rid === null) return;
      const tempId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          text: label,
          isMine: true,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          type: 'location',
          locationLat: lat,
          locationLng: lng,
          locationLabel: label,
        },
      ]);
      try {
        const response = await apiClient.post(isGroupThread ? threadApi.sendPath : '/messages/send', {
          ...(isGroupThread
            ? {}
            : { recipientId: rid, ...(conversationId ? { conversationId } : {}) }),
          content: label,
          type: 'location',
          location_lat: lat,
          location_lng: lng,
          location_label: label,
        });
        const sentMsg = response.data?.data;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, id: sentMsg?.id || tempId, status: 'sent' } : m,
          ),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Alert.alert('Erreur', "Impossible d'envoyer la position.");
      }
    } catch {
      Alert.alert('Erreur', 'Position indisponible. Vérifiez le GPS.');
    }
  }, [resolveOutboundRecipient, conversationId, isGroupThread, threadApi.sendPath]);

  const openNativeContactPicker = useCallback(async () => {
    setShowAttach(false);
    if (Platform.OS === 'web') {
      Alert.alert(
        'Contact',
        "Le partage depuis le carnet d'adresses est disponible sur l'application mobile.",
      );
      return;
    }
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', "Autorisez l'accès aux contacts pour partager une carte contact.");
        return;
      }
      const { data } = await Contacts.getContactsAsync({ pageSize: 250 });
      const usable = data.filter((c) => formatContactShareLine(c).length > 0);
      setContactsForPick(usable);
      setContactPickerOpen(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de lire les contacts.');
    }
  }, []);

  const sendPickedContact = useCallback(
    async (c: Contacts.ExistingContact) => {
      setContactPickerOpen(false);
      const line = formatContactShareLine(c);
      const rid = await resolveOutboundRecipient();
      if (rid === null) return;
      const tempId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          text: line,
          isMine: true,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          type: 'contact',
          contactShareLine: line,
        },
      ]);
      try {
        const response = await apiClient.post(isGroupThread ? threadApi.sendPath : '/messages/send', {
          ...(isGroupThread
            ? {}
            : { recipientId: rid, ...(conversationId ? { conversationId } : {}) }),
          content: line.slice(0, 500),
          type: 'contact',
          contact_name: line.slice(0, 200),
        });
        const sentMsg = response.data?.data;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, id: sentMsg?.id || tempId, status: 'sent' } : m,
          ),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Alert.alert('Erreur', "Impossible d'envoyer le contact.");
      }
    },
    [resolveOutboundRecipient, conversationId, isGroupThread, threadApi.sendPath],
  );

  const pickAudioFileAttachment = useCallback(async () => {
    if (!ensureAuthenticated('envoyer un audio')) return;
    setShowAttach(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const rid = await resolveOutboundRecipient();
      if (rid === null) return;
      const tempId = Date.now().toString();
      const label = asset.name || 'Audio';
      const optimistic: Message = {
        id: tempId,
        text: label,
        isMine: true,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
        type: 'audio',
        imageUri: asset.uri,
        retryMeta: {
          kind: 'audio',
          localUri: asset.uri,
          fileName: asset.name || 'audio.m4a',
          mimeType: asset.mimeType || 'audio/mpeg',
        },
      };
      setMessages((prev) => [...prev, optimistic]);
      trackPendingOutbound(optimistic);
      try {
        const resultSend = await sendDmOutboundMedia({
          kind: 'audio',
          localUri: asset.uri,
          messageId: tempId,
          recipientId: rid,
          conversationId,
          ...(isGroupThread ? { groupId: conversationId } : {}),
          content: label.slice(0, 500),
          fileName: asset.name || 'audio.m4a',
          mimeType: asset.mimeType || 'audio/mpeg',
        });
        applyOutboundSuccess(tempId, resultSend, { type: 'audio' });
      } catch (err) {
        markOutboundFailed(tempId);
        Alert.alert('Erreur', getAlertMessageForCaughtError(err) || "Impossible d'envoyer le fichier audio.");
      }
    } catch {
      Alert.alert('Erreur', 'Sélection audio annulée ou impossible.');
    }
  }, [resolveOutboundRecipient, conversationId, ensureAuthenticated, isGroupThread, applyOutboundSuccess, markOutboundFailed]);

  const retryFailedMessage = useCallback(async (msg: Message) => {
    if (!ensureAuthenticated("renvoyer le message")) return;
    if (msg.status !== 'failed' && msg.status !== 'sending') return;
    const localUri = msg.retryMeta?.localUri || (msg.imageUri && !String(msg.imageUri).startsWith('http') ? msg.imageUri : '');
    if (!localUri) {
      Alert.alert('Réessayer', "Fichier local introuvable. Veuillez sélectionner à nouveau.");
      return;
    }
    const rid = await resolveOutboundRecipient();
    if (rid === null) return;

    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'sending' } : m)));
    try {
      const result = await sendDmOutboundMedia({
        kind: outboundKindFromMessage(msg),
        localUri,
        messageId: msg.id,
        recipientId: rid,
        conversationId,
        ...(isGroupThread ? { groupId: conversationId } : {}),
        content: msg.text || (msg.type === 'video' ? 'Video' : msg.type === 'image' ? 'Photo' : 'Audio'),
        fileName: msg.retryMeta?.fileName,
        mimeType: msg.retryMeta?.mimeType,
      });
      applyOutboundSuccess(msg.id, result);
    } catch (err) {
      markOutboundFailed(msg.id);
      Alert.alert('Réessayer', getAlertMessageForCaughtError(err) || "Impossible de renvoyer ce message.");
    }
  }, [ensureAuthenticated, resolveOutboundRecipient, conversationId, isGroupThread, applyOutboundSuccess, markOutboundFailed]);

  const acceptPeerIncomingCall = useCallback(() => {
    const c = peerIncomingCall;
    if (!c) return;
    setPeerIncomingCall(null);
    navigateToReceiverCallScreen({
      callId: c.callId,
      peerUserId: c.fromUserId,
      peerName: c.callerName || contact.name,
      peerAvatar: c.callerAvatar || contact.avatar || '',
      type: c.media,
    });
  }, [peerIncomingCall, contact.name, contact.avatar]);

  const openCallScreen = useCallback(
    (type: 'audio' | 'video') => {
      if (!contact.otherUserId) return;
      openNativeCallScreen({
        peerUserId: String(contact.otherUserId),
        peerName: contact.name,
        peerAvatar: contact.avatar,
        type,
      });
    },
    [contact.avatar, contact.name, contact.otherUserId],
  );

  const onCallLogPress = useCallback(
    (item: Message) => {
      if (!item.callLog || !contact.otherUserId) return;
      if (!callLogTapToRedial(item.callLog, currentUserId)) return;
      openCallScreen(item.callLog.media === 'video' ? 'video' : 'audio');
    },
    [contact.otherUserId, currentUserId, openCallScreen],
  );

  // ===== CONTEXT MENU ACTIONS =====

  const openMessageMenu = (msg: Message) => {
    if (msg.date) return;
    if (selectionMode) {
      toggleMessageSelection(msg.id);
      return;
    }
    highlightDelayedReleaseRef.current.cancel();
    setHighlightedMessageId(msg.id);
    setSelectedMessage(msg);
    setContextMenuVisible(true);
  };

  const closeMessageMenu = () => {
    setContextMenuVisible(false);
    highlightDelayedReleaseRef.current.cancel();
    setHighlightedMessageId(null);
  };

  const showMessageMenuChevron = useCallback(
    (messageId: string) =>
      highlightedMessageId === messageId ||
      (contextMenuVisible && selectedMessage?.id === messageId),
    [contextMenuVisible, highlightedMessageId, selectedMessage?.id],
  );

  const releaseMessageHighlight = useCallback(
    (messageId: string) => {
      if (contextMenuVisible && selectedMessage?.id === messageId) return;
      setHighlightedMessageId((cur) => (cur === messageId ? null : cur));
    },
    [contextMenuVisible, selectedMessage?.id],
  );

  const highlightMessage = useCallback((messageId: string) => {
    highlightDelayedReleaseRef.current.cancel();
    setHighlightedMessageId(messageId);
  }, []);

  const scheduleHoverReleaseHighlight = useCallback(
    (messageId: string) => {
      highlightDelayedReleaseRef.current.schedule(messageId, releaseMessageHighlight);
    },
    [releaseMessageHighlight],
  );

  const clearMessageHighlight = useCallback(() => {
    highlightDelayedReleaseRef.current.cancel();
    if (!contextMenuVisible) setHighlightedMessageId(null);
  }, [contextMenuVisible]);

  const scrollToQuotedMessage = useCallback(
    (replyId: string) => {
      const idx = messages.findIndex((m) => m.id === replyId && !m.id.startsWith('date-'));
      if (idx < 0) return;
      highlightDelayedReleaseRef.current.cancel();
      if (quoteFlashTimerRef.current) clearTimeout(quoteFlashTimerRef.current);
      setHighlightedMessageId(replyId);
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.45 });
      quoteFlashTimerRef.current = setTimeout(() => {
        setHighlightedMessageId((cur) => (cur === replyId ? null : cur));
        quoteFlashTimerRef.current = null;
      }, 2200);
    },
    [messages],
  );

  useEffect(
    () => () => {
      highlightDelayedReleaseRef.current.cancel();
      if (quoteFlashTimerRef.current) clearTimeout(quoteFlashTimerRef.current);
    },
    [],
  );

  const toggleMessageSelection = (messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleSelectMessages = () => {
    if (!selectedMessage) return;
    setSelectionMode(true);
    setSelectedIds(new Set([selectedMessage.id]));
    setSelectedMessage(null);
  };

  const deleteSelectedMessages = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    for (const id of ids) {
      const msg = messages.find((m) => m.id === id);
      if (!msg) continue;
      await doDelete('me', msg);
    }
    exitSelectionMode();
    setSelectedMessage(null);
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    setContextMenuVisible(false);
  };

  const handleCopy = async () => {
    if (!selectedMessage) return;
    await Clipboard.setStringAsync(selectedMessage.text);
    setContextMenuVisible(false);
    Alert.alert('Copie', 'Message copie dans le presse-papier');
  };

  const handleReact = () => {
    setContextMenuVisible(false);
    setEmojiPickerVisible(true);
  };

  const handleEmojiReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    setEmojiPickerVisible(false);
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id === selectedMessage.id) {
        const existing = m.reactions || [];
        const found = existing.find(r => r.emoji === emoji);
        if (found && found.myReaction) {
          return { ...m, reactions: existing.filter(r => r.emoji !== emoji) };
        }
        if (found) {
          return { ...m, reactions: existing.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, myReaction: true } : r) };
        }
        return { ...m, reactions: [...existing, { emoji, count: 1, myReaction: true }] };
      }
      return m;
    }));
    try {
      await apiClient.post(threadApi.messageReactionPath(selectedMessage.id), { emoji });
    } catch {}
  };

  const handleDeleteForMe = () => {
    if (!selectedMessage) return;
    void doDelete('me');
  };

  const handleDeleteForEveryone = () => {
    if (!selectedMessage) return;
    void doDelete('everyone');
  };

  const doDelete = async (deleteFor: string, targetMsg?: Message) => {
    const target = targetMsg ?? selectedMessage;
    if (!target) return;
    const localOnly = isLocalOnlyMessageId(target.id) || target.status === 'failed';
    try {
      if (localOnly) {
        setMessages((prev) => prev.filter((m) => m.id !== target.id));
        void removeFailedOutbound(conversationId, target.id);
        return;
      }
      if (deleteFor === 'everyone' && target.isMine) {
        if (isGroupThread) {
          await apiClient.delete(threadApi.messageDeletePath(target.id));
        } else {
          await apiClient.post(threadApi.messageDeleteForAllPath(target.id), {});
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === target.id ? applyDeletedForAllUi(m) : m)),
        );
      } else {
        await apiClient.post(threadApi.messageHideForMePath(target.id), {});
        await hideDmMessageForMe(conversationId, target.id);
        setMessages((prev) => prev.filter((m) => m.id !== target.id));
      }
    } catch (_err) {
      Alert.alert('Erreur', getAlertMessageForCaughtError(_err) || 'Impossible de supprimer le message');
    }
  };

  const handlePin = async () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    try {
      if (selectedMessage.pinned) {
        await apiClient.delete(threadApi.pinPath);
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, pinned: false } : m));
        Alert.alert('Désépinglé', 'Message désépinglé');
      } else {
        await apiClient.post(threadApi.pinPath, { messageId: selectedMessage.id });
        setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, pinned: true } : m));
        Alert.alert('Épinglé', 'Message épinglé sur la conversation');
      }
    } catch {}
  };

  const handleStar = async () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    try {
      const nextStar = !selectedMessage.starred;
      await apiClient.patch(`/messages/message/${encodeURIComponent(selectedMessage.id)}/meta`, { is_important: nextStar });
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, starred: nextStar } : m));
    } catch {}
  };

  const openMediaViewer = useCallback(
    (msg: Message) => {
      const uri = msg.imageUri || msg.thumbnailUri || '';
      if (!uri || !String(uri).startsWith('http')) return;
      setViewerItem({
        id: msg.id,
        uri,
        type: msg.type === 'video' ? 'video' : 'image',
        senderLabel: msg.isMine ? 'Vous' : contact.name || 'Contact',
        timeLabel: msg.time,
        caption: msg.text,
        isMine: msg.isMine,
        starred: msg.starred,
      });
    },
    [contact.name],
  );

  const viewerToggleStar = useCallback(async (vi: MediaViewerItem) => {
    const nextStar = !vi.starred;
    setMessages((prev) => prev.map((m) => (m.id === vi.id ? { ...m, starred: nextStar } : m)));
    setViewerItem((cur) => (cur && cur.id === vi.id ? { ...cur, starred: nextStar } : cur));
    try {
      await apiClient.patch(`/messages/message/${encodeURIComponent(vi.id)}/meta`, { is_important: nextStar });
    } catch {
      /* best effort */
    }
  }, []);

  const viewerSetAsProfilePhoto = useCallback((vi: MediaViewerItem) => {
    Alert.alert('Photo de profil', 'Utiliser cette photo comme photo de profil ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          try {
            const res = await apiClient.put('/users/me', { profile_image: vi.uri });
            const updated = res.data?.data || res.data || {};
            const nextUrl = String(updated.profile_image || vi.uri);
            useAuthStore.getState().updateUser({ profile_image: nextUrl, avatar: nextUrl });
            setViewerItem(null);
            Alert.alert('Photo de profil', 'Votre photo de profil a été mise à jour.');
          } catch (e) {
            Alert.alert('Erreur', getAlertMessageForCaughtError(e) || 'Mise à jour impossible.');
          }
        },
      },
    ]);
  }, []);

  const viewerDeleteItem = useCallback(
    (vi: MediaViewerItem) => {
      const target = messagesRef.current.find((m) => m.id === vi.id);
      if (!target) return;
      setViewerItem(null);
      setSelectedMessage(target);
      setTimeout(() => void doDelete('me', target), 50);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleForward = async () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    try {
      const res = await apiClient.get('/messages/conversations', { params: { page: 1, limit: 50 } });
      const convos = res.data?.data?.conversations || [];
      setConversations(convos);
      setForwardModalVisible(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les conversations');
    }
  };

  const handleTranscribe = async () => {
    if (!selectedMessage) return;
    const target = selectedMessage;
    setContextMenuVisible(false);
    if (target.transcription) {
      Alert.alert('Transcription', target.transcription);
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, transcribing: true } : m)));
    try {
      const res = await apiClient.post(
        `/messages/message/${encodeURIComponent(target.id)}/transcribe`,
        {},
      );
      const text = String(res?.data?.data?.text ?? res?.data?.text ?? '').trim();
      if (!text) throw new Error('Transcription vide');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === target.id ? { ...m, transcribing: false, transcription: text } : m,
        ),
      );
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, transcribing: false } : m)));
      Alert.alert(
        'Transcription impossible',
        getAlertMessageForCaughtError(e) || 'Reessayez plus tard.',
      );
    }
  };

  const handleTranslateMessage = useCallback(
    async (messageId: string, targetLang: 'fr' | 'en' | 'bm' | 'wo') => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, translating: true } : m)));
      try {
        const res = await apiClient.post(
          `/messages/message/${encodeURIComponent(messageId)}/translate`,
          { target_lang: targetLang },
        );
        const data = res?.data?.data ?? res?.data ?? {};
        const text = String(data.translation || '').trim();
        const transcribedText = String(data.transcription || '').trim();
        if (!text) throw new Error('Traduction vide');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  translating: false,
                  transcription: m.transcription || transcribedText || undefined,
                  translation: { targetLang, text },
                }
              : m,
          ),
        );
      } catch (e) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, translating: false } : m)));
        Alert.alert(
          'Traduction impossible',
          getAlertMessageForCaughtError(e) || 'Verifiez votre connexion ou reessayez plus tard.',
        );
      }
    },
    [],
  );

  const doForward = async (targetConvId: string) => {
    if (!selectedMessage) return;
    setForwardModalVisible(false);
    try {
      const res = await apiClient.get(`/messages/conversations/id/${encodeURIComponent(targetConvId)}`);
      const conv = res.data?.data;
      if (!conv || !currentUserId) throw new Error('no conv');
      const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1;
      const targetRecipientId = other?.id;
      if (!targetRecipientId) throw new Error('no recipient');
      const fwdText = selectedMessage.text ? `[Transféré] ${selectedMessage.text}` : '[Transféré]';
      await apiClient.post('/messages/send', {
        recipientId: targetRecipientId,
        content: fwdText,
        type: 'text',
        conversationId: targetConvId,
      });
      Alert.alert('Transfere', 'Message transfere avec succes');
    } catch {
      Alert.alert('Erreur', 'Echec du transfert');
    }
  };

  // ===== RENDERERS =====

  const renderStatus = (status: string) => {
    switch (status) {
      case 'sent': return <Ionicons name="checkmark" size={14} color="#8696A0" />;
      case 'delivered': return <Ionicons name="checkmark-done" size={14} color="#8696A0" />;
      case 'read': return <Ionicons name="checkmark-done" size={14} color="#53BDEB" />;
      case 'failed': return <Ionicons name="alert-circle" size={14} color="#FF8A80" />;
      default: return null;
    }
  };

  const renderReactions = (reactions?: Message['reactions']) => {
    if (!reactions || reactions.length === 0) return null;
    return (
      <View style={styles.reactionsRow}>
        {reactions.map((r, i) => (
          <View key={i} style={[styles.reactionBadge, r.myReaction && styles.reactionBadgeMine]}>
            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
            {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    if (item.date) {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateBadge}><Text style={styles.dateText}>{item.date}</Text></View>
        </View>
      );
    }

    if (item.type === 'call' && !item.deleted) {
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const showTail = !prevMsg || prevMsg.isMine !== item.isMine || Boolean(prevMsg.date) || prevMsg.type === 'call';

      if (!item.callLog) return null;

      return (
        <CallLogBubble
          isMine={item.isMine}
          title={item.callLogTitle || 'Appel'}
          subtitle={item.callLogSubtitle || ''}
          time={item.time}
          callLog={item.callLog}
          viewerUserId={currentUserId}
          showTail={showTail}
          onPress={() => onCallLogPress(item)}
          onMenuPress={() => openMessageMenu(item)}
          showMenuChevron={showMessageMenuChevron(item.id)}
          onHighlight={() => highlightMessage(item.id)}
          onHoverLeave={() => scheduleHoverReleaseHighlight(item.id)}
        />
      );
    }

    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showTail = !prevMsg || prevMsg.isMine !== item.isMine || prevMsg.date;

    const isSelected = selectedIds.has(item.id);

    return (
      <View style={[styles.messageRow, item.isMine && styles.messageRowMine]}>
        {selectionMode ? (
          <TouchableOpacity
            style={styles.selectionCheckWrap}
            onPress={() => toggleMessageSelection(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isSelected ? Colors.primary : 'rgba(255,255,255,0.45)'}
            />
          </TouchableOpacity>
        ) : null}
        <Pressable
          onHoverIn={!selectionMode ? () => highlightMessage(item.id) : undefined}
          onHoverOut={!selectionMode ? () => scheduleHoverReleaseHighlight(item.id) : undefined}
        >
          <Pressable
            style={[
              styles.messageBubble,
              item.isMine ? styles.bubbleMine : styles.bubbleTheirs,
              showTail && (item.isMine ? styles.tailMine : styles.tailTheirs),
              item.deleted && styles.deletedBubble,
              isSelected && styles.messageBubbleSelected,
              highlightedMessageId === item.id && styles.messageBubbleFlash,
              !selectionMode && showMessageMenuChevron(item.id) && styles.messageBubbleMenuActive,
            ]}
            onPress={
              selectionMode
                ? () => toggleMessageSelection(item.id)
                : () => highlightMessage(item.id)
            }
            onLongPress={!selectionMode ? () => openMessageMenu(item) : undefined}
            delayLongPress={300}
          >
            {!selectionMode ? (
              <MessageBubbleMenuChevron
                isMine={item.isMine}
                visible={showMessageMenuChevron(item.id)}
                onPress={() => openMessageMenu(item)}
                onPointerDown={() => highlightMessage(item.id)}
              />
            ) : null}
          {!item.isMine && item.senderLabel ? (
            <Text style={styles.groupSenderLabel}>{item.senderLabel}</Text>
          ) : null}

          {/* Forwarded label */}
          {item.forwarded && (
            <View style={styles.forwardedRow}>
              <Ionicons name="arrow-redo" size={12} color="rgba(255,255,255,0.4)" />
              <Text style={styles.forwardedText}>Transféré</Text>
            </View>
          )}

          {/* Reply quote */}
          {item.replyTo ? (
            <ReplyQuoteBlock
              name={item.replyTo.name}
              text={item.replyTo.text}
              isMine={item.isMine}
              onPress={() => scrollToQuotedMessage(item.replyTo!.id)}
            />
          ) : null}

          {/* Deleted message */}
          {item.deleted ? (
            <View style={styles.deletedRow}>
              <Ionicons name="ban-outline" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.deletedText}>{item.text}</Text>
            </View>
          ) : item.type === 'location' &&
            item.locationLat != null &&
            item.locationLng != null &&
            !Number.isNaN(item.locationLat) &&
            !Number.isNaN(item.locationLng) ? (
            <TouchableOpacity
              style={styles.locationBubble}
              onPress={() =>
                openMaps(item.locationLat!, item.locationLng!, item.locationLabel || item.text)
              }
              activeOpacity={0.85}
            >
              <Ionicons name="location" size={22} color={Colors.primary} />
              <Text style={styles.locationBubbleText} numberOfLines={4}>
                {item.locationLabel || item.text}
              </Text>
            </TouchableOpacity>
          ) : item.type === 'contact' ? (
            <View style={styles.contactBubble}>
              <Ionicons name="person-circle" size={32} color={Colors.primary} />
              <Text style={styles.contactBubbleText} numberOfLines={5}>
                {item.contactShareLine || item.text}
              </Text>
            </View>
          ) : item.type === 'file' && item.imageUri ? (
            <TouchableOpacity
              style={styles.fileBubble}
              onPress={() => item.imageUri && Linking.openURL(item.imageUri)}
              activeOpacity={0.85}
            >
              <Ionicons name="document-attach" size={26} color="#FFF" />
              <Text style={styles.fileBubbleName} numberOfLines={2}>
                {item.text}
              </Text>
            </TouchableOpacity>
          ) : item.type === 'voice' || item.type === 'audio' ? (
            <View>
              <VoiceMessageBubble
                messageId={item.id}
                isMine={item.isMine}
                avatarUri={item.isMine ? myAvatarUri : contact.avatar}
                voiceDuration={item.voiceDuration || (item.type === 'audio' ? 'Audio' : '0:00')}
                isPlaying={playingAudioId === item.id}
                progress={playingAudioId === item.id ? audioProgress : 0}
                listened={listenedAudioIds.has(item.id)}
                onPress={() => void playAudio(item)}
              />
              {item.transcribing ? (
                <View style={styles.transcriptionRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.transcriptionPending}>Transcription en cours...</Text>
                </View>
              ) : item.transcription ? (
                <View style={styles.transcriptionBox}>
                  <View style={styles.transcriptionHeader}>
                    <Ionicons name="sparkles" size={12} color={Colors.primary} />
                    <Text style={styles.transcriptionLabel}>Transcription IA</Text>
                  </View>
                  <Text style={styles.transcriptionText}>{item.transcription}</Text>
                  {/* Boutons traduction (GPT-5.2) */}
                  <View style={styles.translateRow}>
                    <Text style={styles.translateRowLabel}>Traduire :</Text>
                    {TRANSLATION_LANGUAGES.map((lang) => {
                      const active = item.translation?.targetLang === lang.code;
                      return (
                        <TouchableOpacity
                          key={lang.code}
                          testID={`translate-${item.id}-${lang.code}`}
                          style={[styles.translateChip, active && styles.translateChipActive]}
                          disabled={item.translating}
                          onPress={() => handleTranslateMessage(item.id, lang.code)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.translateChipFlag}>{lang.flag}</Text>
                          <Text
                            style={[
                              styles.translateChipLabel,
                              active && styles.translateChipLabelActive,
                            ]}
                          >
                            {lang.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {item.translating ? (
                    <View style={styles.transcriptionRow}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.transcriptionPending}>Traduction en cours...</Text>
                    </View>
                  ) : item.translation ? (
                    <View style={styles.translationBox}>
                      <View style={styles.transcriptionHeader}>
                        <Ionicons name="language" size={12} color="#9C27B0" />
                        <Text style={[styles.transcriptionLabel, { color: '#9C27B0' }]}>
                          {(TRANSLATION_LANGUAGES.find((l) => l.code === item.translation?.targetLang)
                            ?.flag ?? '') +
                            ' ' +
                            (TRANSLATION_LANGUAGES.find((l) => l.code === item.translation?.targetLang)
                              ?.label ?? '')}
                        </Text>
                      </View>
                      <Text style={styles.transcriptionText}>{item.translation.text}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : item.type === 'video' && (item.thumbnailUri || item.imageUri) ? (
            <TouchableOpacity
              style={styles.imageBubble}
              activeOpacity={0.85}
              onPress={() => openMediaViewer(item)}
            >
              {item.thumbnailUri || (item.imageUri && !String(item.imageUri).startsWith('file:')) ? (
                <Image
                  source={{ uri: item.thumbnailUri || item.imageUri }}
                  style={styles.chatImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoLocalPlaceholder}>
                  <Ionicons name="videocam" size={28} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.videoLocalPlaceholderText}>Video locale...</Text>
                </View>
              )}
              <View style={styles.videoPlayOverlay}>
                <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.95)" />
              </View>
            </TouchableOpacity>
          ) : item.type === 'image' && item.imageUri ? (
            <TouchableOpacity style={styles.imageBubble} activeOpacity={0.85} onPress={() => openMediaViewer(item)}>
              <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
              {item.text && item.text !== 'Photo' && item.text !== 'Video' && (
                <Text style={[styles.messageText, item.isMine && styles.messageTextMine]}>{item.text}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, item.isMine && styles.messageTextMine]}>{item.text}</Text>
          )}

          {/* Time + status + extras */}
          {item.isMine && item.status === 'failed' && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                void retryFailedMessage(item);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color="#FFF" />
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          )}
          <View style={styles.msgTimeRow}>
            {item.starred && <Ionicons name="star" size={11} color="#FFD700" style={{ marginRight: 3 }} />}
            {item.edited && <Text style={styles.editedLabel}>modifié</Text>}
            <Text style={[styles.msgTimeText, item.isMine && styles.msgTimeTextMine]}>{item.time}</Text>
            {item.isMine && renderStatus(item.status)}
          </View>

          {/* Reactions */}
          {renderReactions(item.reactions)}
          </Pressable>
        </Pressable>
      </View>
    );
  };

  const ATTACHMENT_OPTIONS = useMemo(() => {
    const all = [
      { icon: 'camera', label: 'Camera', color: '#FF6B6B', action: () => pickImage(true) },
      { icon: 'images', label: 'Galerie', color: '#4ECDC4', action: () => pickImage(false) },
      { icon: 'document', label: 'Document', color: '#45B7D1', action: () => void pickDocumentAttachment() },
      { icon: 'location', label: 'Position', color: '#FF6B00', action: () => void shareLocationAttachment() },
      { icon: 'person', label: 'Contact', color: '#96CEB4', action: () => void openNativeContactPicker() },
      { icon: 'musical-notes', label: 'Audio', color: '#DDA0DD', action: () => void pickAudioFileAttachment() },
    ];
    if (isGroupThread) {
      return all.filter((o) => o.icon !== 'location' && o.icon !== 'person');
    }
    return all;
  }, [
    pickImage,
    pickDocumentAttachment,
    shareLocationAttachment,
    openNativeContactPicker,
    pickAudioFileAttachment,
    isGroupThread,
  ]);

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        {selectionMode ? (
          <>
            <TouchableOpacity
              onPress={exitSelectionMode}
              style={styles.backBtn}
              accessibilityLabel="Annuler la sélection"
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.selectionHeaderTitle}>
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => void deleteSelectedMessages()}
              disabled={selectedIds.size === 0}
              accessibilityLabel="Supprimer la sélection"
            >
              <Ionicons name="trash-outline" size={22} color={Colors.error} />
            </TouchableOpacity>
          </>
        ) : (
          <>
        <TouchableOpacity onPress={() => safeRouterBack('/messages')} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#111B21" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerProfile}>
          <Image source={{ uri: contact.avatar }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{contact.name}</Text>
            {contact.username ? (
              <Text style={styles.headerHandle} numberOfLines={1}>{contact.username}</Text>
            ) : null}
            <Text style={styles.headerStatus}>
              {isGroupThread
                ? 'Groupe'
                : formatPeerPresenceLabel({
                    isTyping: isContactTyping,
                    isOnline: peerPresence.online,
                    lastSeen: peerPresence.lastSeen,
                  })}
            </Text>
          </View>
        </TouchableOpacity>
        {featureFlags.callsOnNative && !isGroupThread ? (
          <>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => openCallScreen('video')}
              disabled={!contact.otherUserId}
            >
              <Ionicons name="videocam" size={22} color="#54656F" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => openCallScreen('audio')}
              disabled={!contact.otherUserId}
            >
              <Ionicons name="call" size={22} color="#54656F" />
            </TouchableOpacity>
          </>
        ) : null}
        {!isGroupThread ? (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setPeerMenuOpen(true)}
            accessibilityLabel="Options de conversation"
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#54656F" />
          </TouchableOpacity>
        ) : null}
          </>
        )}
      </View>

      {!isGroupThread &&
        dmRequest &&
        dmRequest.pending_for_user_id &&
        dmRequest.initiator_user_id === currentUserId &&
        !dmRequest.pending_for_viewer && (
          <View style={styles.dmInitiatorBanner}>
            <Text style={styles.dmInitiatorText}>
              {dmRequest.initiator_messages_remaining > 0
                ? `Encore ${dmRequest.initiator_messages_remaining} message${dmRequest.initiator_messages_remaining > 1 ? 's' : ''} possible${dmRequest.initiator_messages_remaining > 1 ? 's' : ''} avant acceptation (${dmRequest.max_messages_before_accept} max).`
                : `Limite de ${dmRequest.max_messages_before_accept} messages atteinte. En attente d'acceptation.`}
            </Text>
          </View>
        )}

      {/* Messages */}
      <View style={styles.chatArea}>
        <ChatWallpaperPattern />
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : loadError === 'session' ? (
          <View style={styles.loadingContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={40}
              color="rgba(255,255,255,0.45)"
            />
            <Text style={styles.loadingText}>
              Session expirée. Reconnectez-vous pour voir vos messages.
            </Text>
            <TouchableOpacity
              style={styles.loadErrorButton}
              onPress={() => safeRouterPush('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel="Se reconnecter"
            >
              <Text style={styles.loadErrorButtonText}>Se reconnecter</Text>
            </TouchableOpacity>
          </View>
        ) : loadError === 'not_found' ? (
          <View style={styles.loadingContainer}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={40}
              color="rgba(255,255,255,0.45)"
            />
            <Text style={styles.loadingText}>
              Cette conversation n’existe plus ou n’est plus accessible.
            </Text>
            <TouchableOpacity
              style={styles.loadErrorButton}
              onPress={() => safeRouterBack('/messages')}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Text style={styles.loadErrorButtonText}>Retour</Text>
            </TouchableOpacity>
          </View>
        ) : loadError === 'network' && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color="rgba(255,255,255,0.45)"
            />
            <Text style={styles.loadingText}>
              Impossible de charger la conversation. Vérifiez votre connexion.
            </Text>
            <TouchableOpacity
              style={styles.loadErrorButton}
              onPress={() => {
                setLoading(true);
                void loadMessages();
              }}
              accessibilityRole="button"
              accessibilityLabel="Réessayer"
            >
              <Text style={styles.loadErrorButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.threadListWrap}>
            {loadError === 'network' ? (
              <TouchableOpacity
                style={styles.offlineBanner}
                onPress={() => {
                  setLoading(true);
                  void loadMessages();
                }}
                accessibilityRole="button"
                accessibilityLabel="Réessayer le chargement"
              >
                <Ionicons name="cloud-offline-outline" size={16} color="#FCD34D" />
                <Text style={styles.offlineBannerText}>
                  Hors ligne — messages en cache. Touchez pour synchroniser.
                </Text>
              </TouchableOpacity>
            ) : null}
            <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesList}
            onScrollBeginDrag={clearMessageHighlight}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: Math.max(0, info.averageItemLength * info.index),
                animated: true,
              });
            }}
            onContentSizeChange={() => {
              if (skipScrollToEndRef.current) {
                skipScrollToEndRef.current = false;
                return;
              }
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            ListHeaderComponent={
              <View>
                {hasMoreMessages ? (
                  <TouchableOpacity
                    style={styles.loadOlderButton}
                    onPress={() => void loadOlderMessages()}
                    disabled={loadingOlder}
                    accessibilityRole="button"
                    accessibilityLabel="Charger les anciens messages"
                  >
                    {loadingOlder ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.loadOlderButtonText}>Charger les anciens messages</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
                {peerIncomingCall ? (
                  <Pressable
                    style={styles.peerIncomingBanner}
                    accessibilityLiveRegion="polite"
                    accessibilityRole="button"
                    accessibilityLabel="Accepter l'appel entrant"
                    onPress={acceptPeerIncomingCall}
                  >
                    <Ionicons
                      name={peerIncomingCall.media === 'video' ? 'videocam' : 'call'}
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={styles.peerIncomingText}>
                      {peerIncomingCall.media === 'video' ? 'Appel vidéo entrant' : 'Appel audio entrant'} · Touchez pour répondre
                    </Text>
                  </Pressable>
                ) : null}
                {!isGroupThread && dmRequest?.pending_for_viewer ? (
                  <View style={styles.dmRequestCard}>
                    <Text style={styles.dmRequestTitle}>
                      {contact.name} souhaite vous écrire
                    </Text>
                    {dmRequest.initiator_wondered_you ? (
                      <Text style={styles.dmRequestBody}>
                        {contact.name} vous a ajouté dans son Wonder ✨
                        {!dmRequest.viewer_wonders_initiator
                          ? ' — Vous pouvez l’ajouter en retour si vous le souhaitez.'
                          : ' — Vous faites aussi partie de son Wonder.'}
                      </Text>
                    ) : (
                      <Text style={styles.dmRequestBody}>
                        Vous n’êtes pas encore dans le Wonder l’un de l’autre. Acceptez pour discuter ou refusez pour
                        ignorer la demande.
                      </Text>
                    )}
                    {dmRequest.initiator_wondered_you && !dmRequest.viewer_wonders_initiator ? (
                      <TouchableOpacity
                        style={styles.dmWonderBtn}
                        onPress={() => void handleWonderBack()}
                        disabled={wonderBackLoading}
                      >
                        {wonderBackLoading ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <Text style={styles.dmWonderBtnText}>Ajouter en retour dans mon Wonder</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    <Text style={styles.dmRequestBody}>
                      Cette personne peut envoyer jusqu’à {dmRequest.max_messages_before_accept} messages avant
                      acceptation.{' '}
                      <Text style={styles.dmReportLink} onPress={() => setReportOpen(true)}>
                        Signaler
                      </Text>
                    </Text>
                    <View style={styles.dmActionsRow}>
                      <TouchableOpacity
                        style={styles.dmDeclineBtn}
                        onPress={handleDeclineDm}
                        disabled={dmActionLoading}
                      >
                        <Text style={styles.dmDeclineBtnText}>Refuser</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dmAcceptBtn}
                        onPress={handleAcceptDm}
                        disabled={dmActionLoading}
                      >
                        <Text style={styles.dmAcceptBtnText}>Accepter</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
                {peerBlock?.peer_blocked_viewer ? (
                  <View style={styles.peerBlockBanner}>
                    <Text style={styles.peerBlockBannerText}>
                      Ce contact vous a bloqué. Vous ne pouvez plus lui écrire.
                    </Text>
                  </View>
                ) : null}
                {peerBlock?.viewer_blocked_peer ? (
                  <View style={styles.peerBlockBanner}>
                    <Text style={styles.peerBlockBannerText}>
                      Vous avez bloqué {contact.name}.{' '}
                      <Text style={styles.dmReportLink} onPress={() => void handleUnblockPeer()}>
                        Débloquer
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </View>
            }
          />
          </View>
        )}
      </View>

      {/* Attachment Panel */}
      {showAttach && (
        <View style={styles.attachPanel}>
          <View style={styles.attachGrid}>
            {ATTACHMENT_OPTIONS.map((opt, i) => (
              <TouchableOpacity key={i} style={styles.attachOption} onPress={opt.action}>
                <View style={[styles.attachIcon, { backgroundColor: opt.color }]}>
                  <Ionicons name={opt.icon as any} size={22} color="#FFF" />
                </View>
                <Text style={styles.attachLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Reply bar */}
      {replyingTo && (
        <View style={styles.replyBar2}>
          <View style={styles.replyBarIndicator} />
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarName}>{replyingTo.isMine ? 'Vous' : contact.name}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>{replyingTo.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      {!dmRequest?.pending_for_viewer && !selectionMode && !peerMessagingBlocked ? (
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.xs }]}>
        {isRecording ? (
          /* Recording Mode */
          <View style={styles.recordingBar}>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecBtn}>
              <Ionicons name="trash-outline" size={22} color={Colors.error} />
            </TouchableOpacity>
            <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: recordingAnim }] }]}>
              <View style={styles.recordDot} />
            </Animated.View>
            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
            <View style={styles.recordingWaves}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={[styles.waveBar, { height: 8 + Math.random() * 16 }]} />
              ))}
            </View>
            <TouchableOpacity onPress={stopRecording} style={styles.stopRecBtn}>
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          /* Normal Input Mode */
          <>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.emojiBtn}>
                <Ionicons name="happy-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                testID="message-input"
                style={styles.textInput}
                placeholder="Message"
                placeholderTextColor="#8696A0"
                value={newMessage}
                onFocus={clearMessageHighlight}
                onChangeText={(text) => {
                  setNewMessage(text);
                  setShowAttach(false);
                  try {
                    if (conversationId) {
                      if (text.length > 0) socketService.startTyping(conversationId);
                      else socketService.stopTyping(conversationId);
                    }
                  } catch {
                    // no-op: typing indicator must never crash chat input
                  }
                }}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                onPress={() => {
                  if (!ensureAuthenticated('envoyer une pièce jointe')) return;
                  setShowAttach(!showAttach);
                }}
              >
                <Ionicons name="attach" size={24} color={Colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
              {!newMessage.trim() && (
                <TouchableOpacity
                  style={styles.cameraInlineBtn}
                  onPress={() => {
                    if (!ensureAuthenticated('envoyer une image')) return;
                    void pickImage(true);
                  }}
                >
                  <Ionicons name="camera" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {newMessage.trim() ? (
              <TouchableOpacity testID="send-button" style={styles.sendBtn} onPress={sendMessage}>
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micBtn}
                onPress={startRecording}
                onLongPress={startRecording}
                accessibilityLabel="Message vocal"
              >
                <Ionicons name="mic" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      ) : null}

      <Modal visible={peerMenuOpen} transparent animationType="fade" onRequestClose={() => setPeerMenuOpen(false)}>
        <Pressable style={styles.contextOverlay} onPress={() => setPeerMenuOpen(false)}>
          <View style={styles.peerMenuSheet}>
            <TouchableOpacity
              style={styles.peerMenuItem}
              onPress={() => {
                setPeerMenuOpen(false);
                router.push(`/user/${recipientUserId}` as never);
              }}
            >
              <Ionicons name="person-outline" size={20} color={Colors.text} />
              <Text style={styles.peerMenuItemText}>Voir le profil</Text>
            </TouchableOpacity>
            {peerBlock?.viewer_blocked_peer ? (
              <TouchableOpacity style={styles.peerMenuItem} onPress={() => void handleUnblockPeer()}>
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
                <Text style={[styles.peerMenuItemText, { color: Colors.primary }]}>Débloquer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.peerMenuItem} onPress={handleBlockPeer}>
                <Ionicons name="ban-outline" size={20} color={Colors.error} />
                <Text style={[styles.peerMenuItemText, { color: Colors.error }]}>Bloquer</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      <ReportModal visible={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={recipientUserId || ''} />

      <MessageContextMenu
        visible={contextMenuVisible}
        message={selectedMessage}
        onClose={closeMessageMenu}
        onEmoji={handleEmojiReaction}
        onMoreEmojis={handleReact}
        onReply={handleReply}
        onPin={handlePin}
        onStar={handleStar}
        onSelect={handleSelectMessages}
        onDeleteForMe={handleDeleteForMe}
        onDeleteForEveryone={selectedMessage?.isMine ? handleDeleteForEveryone : undefined}
        onCopy={
          selectedMessage && selectedMessage.type !== 'voice' && selectedMessage.type !== 'audio'
            ? handleCopy
            : undefined
        }
        onForward={handleForward}
        onTranscribe={
          selectedMessage &&
          (selectedMessage.type === 'voice' || selectedMessage.type === 'audio')
            ? handleTranscribe
            : undefined
        }
      />

      {/* ===== EMOJI PICKER MODAL ===== */}
      <Modal visible={emojiPickerVisible} transparent animationType="fade" onRequestClose={() => setEmojiPickerVisible(false)}>
        <Pressable style={styles.contextOverlay} onPress={() => setEmojiPickerVisible(false)}>
          <View style={styles.emojiPicker}>
            <Text style={styles.emojiPickerTitle}>Choisir une reaction</Text>
            <View style={styles.emojiGrid}>
              {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '💯', '👏', '🤔', '😍', '💪', '🤣', '😡', '👀'].map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.emojiGridItem} onPress={() => handleEmojiReaction(emoji)}>
                  <Text style={styles.emojiGridText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ===== FORWARD MODAL ===== */}
      <Modal visible={forwardModalVisible} transparent animationType="slide" onRequestClose={() => setForwardModalVisible(false)}>
        <View style={styles.forwardModal}>
          <View style={styles.forwardHeader}>
            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.forwardTitle}>Transferer a...</Text>
          </View>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const other = item.other || {};
              const name = item.is_group ? (item.group_name || 'Groupe') : (other.full_name || other.username || 'Contact');
              const avatar = item.is_group
                ? profileAvatarUri(item.group_avatar, name)
                : profileAvatarUri(other.profile_image, name);
              return (
                <TouchableOpacity style={styles.forwardItem} onPress={() => doForward(item.id)}>
                  <Image source={{ uri: avatar }} style={styles.forwardAvatar} />
                  <Text style={styles.forwardName}>{name}</Text>
                  <Ionicons name="send" size={20} color={Colors.primary} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <Modal visible={contactPickerOpen} transparent animationType="slide" onRequestClose={() => setContactPickerOpen(false)}>
        <View style={styles.contactPickerModal}>
          <View style={styles.contactPickerHeader}>
            <TouchableOpacity onPress={() => setContactPickerOpen(false)} accessibilityRole="button">
              <Text style={styles.contactPickerCancel}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.contactPickerTitle}>Choisir un contact</Text>
            <View style={{ width: 72 }} />
          </View>
          <FlatList
            data={contactsForPick}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: c }) => (
              <TouchableOpacity style={styles.contactPickRow} onPress={() => void sendPickedContact(c)}>
                <Ionicons name="person-circle-outline" size={40} color={Colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactPickName} numberOfLines={2}>
                    {formatContactShareLine(c)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.contactPickEmpty}>Aucun contact disponible.</Text>
            }
          />
        </View>
      </Modal>

      {viewerItem ? (
        <MediaViewerModal
          item={viewerItem}
          onClose={() => setViewerItem(null)}
          onToggleStar={(vi) => void viewerToggleStar(vi)}
          onDelete={viewerDeleteItem}
          onShowInChat={() => setViewerItem(null)}
          onSetAsProfilePhoto={viewerSetAsProfilePhoto}
        />
      ) : null}

      {composerDraft ? (
        <MediaCaptionComposer
          draft={composerDraft}
          onSend={(d, caption) => void sendComposedMedia(d, caption)}
          onCancel={() => setComposerDraft(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5DDD5' },
  // Header — barre WhatsApp claire
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D7DB',
    backgroundColor: '#F0F2F5',
  },
  backBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1 },
  headerName: { color: '#111B21', fontSize: 16, fontWeight: '600' },
  headerHandle: { color: '#667781', fontSize: FontSizes.xs, marginTop: 1 },
  headerStatus: { color: '#667781', fontSize: 12 },
  dmInitiatorBanner: {
    backgroundColor: 'rgba(255,106,0,0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dmInitiatorText: { color: Colors.text, fontSize: FontSizes.xs, lineHeight: 18 },
  headerAction: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Chat area
  chatArea: { flex: 1, backgroundColor: '#E5DDD5' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.lg },
  loadingText: { color: '#667781', fontSize: 13, textAlign: 'center' },
  loadErrorButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  loadErrorButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  threadListWrap: { flex: 1 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(252,211,77,0.12)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(252,211,77,0.25)',
  },
  offlineBannerText: { flex: 1, color: '#FCD34D', fontSize: 12 },
  loadOlderButton: {
    alignSelf: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 200,
    alignItems: 'center',
  },
  loadOlderButtonText: { color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.sm, fontWeight: '500' },
  peerIncomingBanner: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  peerIncomingText: { color: 'rgba(255,255,255,0.92)', fontSize: FontSizes.sm, fontWeight: '600' },
  messagesList: { paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Spacing.lg },
  // Date separator — pilule centrée WhatsApp
  dateSeparator: { alignItems: 'center', marginVertical: 10 },
  dateBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  dateText: { color: '#54656F', fontSize: 12, fontWeight: '500' },
  // Message bubble
  messageRow: { flexDirection: 'row', marginBottom: 3 },
  messageRowMine: { justifyContent: 'flex-end' },
  groupSenderLabel: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 7.5,
    paddingHorizontal: 9,
    paddingTop: 6,
    paddingBottom: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  messageBubbleSelected: { borderWidth: 1.5, borderColor: Colors.primary },
  messageBubbleFlash: {
    backgroundColor: 'rgba(255,235,59,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.5)',
  },
  messageBubbleMenuActive: { paddingRight: 28 },
  selectionCheckWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginBottom: 2,
  },
  selectionHeaderTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  bubbleMine: { backgroundColor: '#D9FDD3', borderTopRightRadius: 7.5, borderTopLeftRadius: 7.5 },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderTopRightRadius: 7.5, borderTopLeftRadius: 7.5 },
  tailMine: { borderTopRightRadius: 2 },
  tailTheirs: { borderTopLeftRadius: 2 },
  deletedBubble: { opacity: 0.65 },
  messageText: { color: '#111B21', fontSize: 15, lineHeight: 21 },
  messageTextMine: { color: '#111B21' },
  msgTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 1,
    marginBottom: 1,
    marginLeft: 8,
  },
  msgTimeText: { color: '#667781', fontSize: 11 },
  msgTimeTextMine: { color: '#667781' },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,0,0.9)',
  },
  retryBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  editedLabel: { color: '#8696A0', fontSize: 10, fontStyle: 'italic', marginRight: 3 },
  // Forwarded
  forwardedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  forwardedText: { color: '#667781', fontSize: 11, fontStyle: 'italic' },
  // Deleted message
  deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deletedText: { color: '#8696A0', fontSize: FontSizes.md, fontStyle: 'italic' },
  // Reactions
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  reactionBadgeMine: { backgroundColor: 'rgba(255,106,0,0.2)' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginLeft: 2 },
  // Attachment panel
  attachPanel: { backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.lg },
  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingHorizontal: Spacing.xl },
  attachOption: { alignItems: 'center', width: width / 3 - Spacing.xl, marginBottom: Spacing.lg },
  attachIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  attachLabel: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  // Reply bar (input area)
  replyBar2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#D1D7DB',
  },
  replyBarIndicator: { width: 4, height: 36, backgroundColor: '#00A884', borderRadius: 2, marginRight: Spacing.sm },
  replyBarContent: { flex: 1 },
  replyBarName: { color: '#00A884', fontSize: 12, fontWeight: '600' },
  replyBarText: { color: '#667781', fontSize: 13 },
  replyBarClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingTop: 6,
    gap: 6,
    backgroundColor: '#F0F2F5',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D7DB',
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: Platform.OS === 'ios' ? 6 : 3,
    gap: 2,
  },
  emojiBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  textInput: {
    flex: 1,
    color: '#111B21',
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    paddingHorizontal: 6,
  },
  cameraInlineBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },
  // Context menu
  contextOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  contextMenu: { backgroundColor: Colors.surface || '#1a1a2e', borderRadius: 16, width: width * 0.8, maxWidth: 320, paddingVertical: 8, overflow: 'hidden' },
  quickReactions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  quickReactionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  quickReactionEmoji: { fontSize: 22 },
  contextMenuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  contextMenuText: { color: Colors.text, fontSize: FontSizes.md },
  // Emoji picker
  emojiPicker: { backgroundColor: Colors.surface || '#1a1a2e', borderRadius: 16, width: width * 0.85, padding: 16 },
  emojiPickerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  emojiGridItem: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  emojiGridText: { fontSize: 28 },
  // Forward modal
  forwardModal: { flex: 1, backgroundColor: Colors.background, marginTop: 80, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  forwardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  forwardTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  forwardItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  forwardAvatar: { width: 44, height: 44, borderRadius: 22 },
  forwardName: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  locationBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, maxWidth: 280 },
  locationBubbleText: { color: '#111B21', fontSize: FontSizes.md, flex: 1 },
  contactBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, maxWidth: 280 },
  contactBubbleText: { color: '#111B21', fontSize: FontSizes.md, flex: 1 },
  fileBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, maxWidth: 280 },
  fileBubbleName: { color: '#111B21', fontSize: FontSizes.sm, flex: 1 },
  contactPickerModal: { flex: 1, backgroundColor: Colors.background, marginTop: 72 },
  contactPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contactPickerCancel: { color: Colors.primary, fontSize: FontSizes.md },
  contactPickerTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: 'bold' },
  contactPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  contactPickName: { color: Colors.text, fontSize: FontSizes.md },
  contactPickEmpty: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  // Voice bubble
  voiceBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 210, paddingVertical: 2 },
  voicePlayBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  voiceWaveContainer: { flex: 1, minWidth: 88 },
  voiceWaveTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  voiceWaveProgress: { height: '100%', borderRadius: 2 },
  voiceWaveProgressMine: { backgroundColor: 'rgba(255,255,255,0.85)' },
  voiceWaveProgressTheirs: { backgroundColor: '#53BDEB' },
  voiceDurationText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4 },
  voiceAvatarWrap: { width: 34, height: 34, position: 'relative' },
  voiceAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2A3942' },
  voiceMicBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#202C33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  transcriptionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  transcriptionPending: { color: Colors.textSecondary, fontSize: 12, fontStyle: 'italic' },
  transcriptionBox: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: 6,
  },
  transcriptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  transcriptionLabel: { color: Colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  transcriptionText: { color: Colors.text, fontSize: 13, lineHeight: 18 },
  translateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  translateRowLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginRight: 2,
  },
  translateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 4,
  },
  translateChipActive: {
    backgroundColor: 'rgba(156,39,176,0.18)',
    borderColor: '#9C27B0',
  },
  translateChipFlag: { fontSize: 11 },
  translateChipLabel: { color: Colors.text, fontSize: 10, fontWeight: '700' },
  translateChipLabelActive: { color: '#9C27B0' },
  translationBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(156,39,176,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#9C27B0',
    borderRadius: 6,
  },
  // Image bubble
  imageBubble: { marginBottom: 2, position: 'relative', overflow: 'hidden', borderRadius: 8 },
  chatImage: { width: 220, height: 280, borderRadius: 8, marginBottom: 4 },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
  },
  videoLocalPlaceholder: {
    width: 220,
    height: 280,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#1f2c34',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoLocalPlaceholderText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  dmRequestCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D7DB',
  },
  dmWonderBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,45,85,0.1)',
  },
  dmWonderBtnText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '700' },
  peerBlockBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  peerBlockBannerText: { color: '#54656F', fontSize: FontSizes.sm, lineHeight: 20 },
  peerMenuSheet: {
    position: 'absolute',
    right: Spacing.md,
    top: '18%',
    minWidth: 220,
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  peerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  peerMenuItemText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  dmRequestTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', marginBottom: Spacing.sm },
  dmRequestBody: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: Spacing.sm },
  dmReportLink: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.md },
  dmActionsRow: { flexDirection: 'row', gap: Spacing.sm },
  dmDeclineBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  dmDeclineBtnText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  dmAcceptBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  dmAcceptBtnText: { color: '#FFF', fontSize: FontSizes.md, fontWeight: '700' },
  // Recording bar
  recordingBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  cancelRecBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  recordingIndicator: { width: 12, height: 12, borderRadius: 6, overflow: 'hidden' },
  recordDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF3D00' },
  recordingTime: { color: '#FF3D00', fontSize: FontSizes.md, fontWeight: '600', minWidth: 40 },
  recordingWaves: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 32 },
  waveBar: { width: 3, backgroundColor: Colors.primary, borderRadius: 1.5, opacity: 0.6 },
  stopRecBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
