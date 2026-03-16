import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Image as ImageIcon, Loader2, Mic, Square, MoreVertical, ShieldBan, Flag, Trash2, Reply, Copy, Forward, Pin, Star, CheckSquare, Plus, Search, X, Phone, Video, Clock, Download, MapPin, UserPlus, Timer } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '../components/navigation/BottomNav';
import { useConversationSocket } from '@/hooks/useMessageSocket';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useTranslation } from '@/components/common/useTranslation';
import { useAuth } from '@/lib/AuthContext';

const MESSAGES_LIMIT = 30;
const TYPING_DEBOUNCE_MS = 400;

const chatI18n = {
  fr: {
    loadOlderError: 'Impossible de charger plus de messages',
    sendSuccess: 'Message envoye',
    sendError: "Erreur lors de l'envoi",
    selectImage: 'Veuillez selectionner une image',
    uploadError: 'Erreur upload image',
    selectConversation: 'Selectionnez une conversation depuis Messages.',
    backToMessages: 'Retour aux messages',
    online: 'En ligne',
    offline: 'Hors ligne',
    typingSuffix: 'est en train d ecrire...',
    orderConversation: 'Conversation concernant la commande #',
    viewOrder: 'Voir la commande',
    loadOlder: 'Charger les anciens messages',
    noMessage: 'Aucun message',
    startConversation: 'Commencez la conversation',
    deletedMessage: 'Message supprime',
    read: 'Lu',
    placeholder: 'Votre message...',
    voiceStartError: 'Impossible de demarrer le micro',
    voiceStopError: "Impossible d'envoyer le vocal",
    recording: 'Enregistrement...',
    voiceMessage: 'Message vocal',
    actions: 'Actions',
    blockUser: 'Bloquer cet utilisateur',
    blockSuccess: 'Utilisateur bloque',
    blockError: 'Impossible de bloquer cet utilisateur',
    reportLast: 'Signaler le dernier message',
    reportSuccess: 'Message signale',
    reportError: 'Impossible de signaler ce message',
    reportNoMessage: 'Aucun message a signaler',
    deleteMyLast: 'Supprimer mon dernier message',
    deleteSuccess: 'Message supprime',
    deleteError: 'Impossible de supprimer ce message',
    deleteNoMessage: 'Aucun message personnel a supprimer',
    reportThisMessage: 'Signaler ce message',
    deleteThisMessage: 'Supprimer ce message',
    confirmTitleBlock: 'Bloquer cet utilisateur ?',
    confirmDescBlock: 'Vous ne pourrez plus envoyer ni recevoir de messages avec cet utilisateur.',
    confirmTitleDelete: 'Supprimer ce message ?',
    confirmDescDelete: 'Le message sera masque dans la conversation.',
    confirmTitleReport: 'Signaler ce message ?',
    confirmDescReport: 'Ce message sera envoye a la moderation.',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    copied: 'Message copie',
    noTextToCopy: 'Ce message ne contient pas de texte',
    replyTo: 'Repondre a',
    replyingTo: 'Reponse a',
    cancelReply: 'Annuler la reponse',
    transfer: 'Transferer',
    pinMessage: 'Epingler',
    markImportant: 'Marquer comme important',
    select: 'Selectionner',
    report: 'Signaler',
    delete: 'Supprimer',
    chooseReaction: 'Choisir reaction',
    searchReaction: 'Rechercher reaction',
    reactionsRecent: 'Reactions recentes',
    emojiAndPeople: 'Emojis et personnes',
    actionUnavailable: 'Fonction disponible bientot',
    selectModeOn: 'Mode selection active',
    reactionAdded: 'Reaction ajoutee',
    copy: 'Copier',
    transferTo: 'Transferer a',
    transferSearchPlaceholder: 'Rechercher utilisateur (@nom ou nom)',
    transferNoUser: 'Aucun utilisateur trouve',
    transferSuccess: 'Message transfere',
    transferError: 'Impossible de transferer',
    pinned: 'Epingle',
    unpinned: 'Desepingle',
    deleteForAll: 'Supprimer pour tous',
    deleteForAllConfirm: 'Supprimer ce message pour tout le monde ? (possible uniquement dans les 15 min)',
    deleteForAllSuccess: 'Message supprimé pour tous',
    deleteForAllError: 'Impossible (délai dépassé ou message inexistant)',
    pinnedMessage: 'Message épinglé',
    ephemeralMode: 'Disparaît après lecture',
    shareLocation: 'Partager ma position',
    shareContact: 'Partager un contact',
    locationMessage: 'Position',
    contactMessage: 'Contact partagé',
    markedImportant: 'Marque important',
    unmarkedImportant: 'Important retire',
    voiceCall: 'Appel vocal',
    videoCall: 'Appel video',
    openingCall: 'Ouverture de l appel...',
  },
  bm: {
    loadOlderError: 'Se ka mesaji koro korow soro te',
    sendSuccess: 'Mesaji ci',
    sendError: 'Mesaji ci ye te se',
    selectImage: 'I ka ja beenin do sugandi',
    uploadError: 'Ja upload ye te se',
    selectConversation: 'I ka barokan do sugandi Messages kono.',
    backToMessages: 'Segin ka taa mesajiw ma',
    online: 'A be yan',
    offline: 'A te yan',
    typingSuffix: 'be sebenni ke...',
    orderConversation: 'Barokan min be taara commande #',
    viewOrder: 'Commande laje',
    loadOlder: 'Mesaji koro korow ye',
    noMessage: 'Mesaji si te',
    startConversation: 'Barokan damine',
    deletedMessage: 'Mesaji ye bo',
    read: 'Kalanlen',
    placeholder: 'I ka mesaji...',
    voiceStartError: 'Mikro damine te se',
    voiceStopError: 'Vocal ci te se',
    recording: 'A b enregistrement la',
    voiceMessage: 'Vocal',
    actions: 'Baro',
    blockUser: 'Mogo nin da',
    blockSuccess: 'Mogo da',
    blockError: 'A ma se ka da',
    reportLast: 'Mesaji kora laben',
    reportSuccess: 'Mesaji laben na',
    reportError: 'A ma se ka laben',
    reportNoMessage: 'Mesaji si te ka laben',
    deleteMyLast: 'Ne ka mesaji kora bo',
    deleteSuccess: 'Mesaji bo',
    deleteError: 'A ma se ka mesaji bo',
    deleteNoMessage: 'I ka mesaji si te ka bo',
    reportThisMessage: 'Mesaji nin laben',
    deleteThisMessage: 'Mesaji nin bo',
    confirmTitleBlock: 'Ka mogo nin da wa?',
    confirmDescBlock: 'Aw te se ka ci wala ka soro mesaji tuguni.',
    confirmTitleDelete: 'Ka mesaji nin bo wa?',
    confirmDescDelete: 'Mesaji be dogo la barokan kono.',
    confirmTitleReport: 'Ka mesaji nin laben wa?',
    confirmDescReport: 'Mesaji nin bena taa moderation ma.',
    cancel: 'Foyi',
    confirm: 'Aw ni',
    copied: 'Mesaji copy kera',
    noTextToCopy: 'Sebenni te mesaji nin kono',
    replyTo: 'Jaabi',
    replyingTo: 'Jaabi la',
    cancelReply: 'Jaabi bila',
    transfer: 'Kafoli',
    pinMessage: 'Mesaji sinsin',
    markImportant: 'A ka muhimu taamu',
    select: 'Sugandi',
    report: 'Laben',
    delete: 'Bo',
    chooseReaction: 'Reaction sugandi',
    searchReaction: 'Reaction yiriwa',
    reactionsRecent: 'Reaction kora',
    emojiAndPeople: 'Emojis ni mogow',
    actionUnavailable: 'Fonction bena na sisan koro',
    selectModeOn: 'Sugandi mode dafalen',
    reactionAdded: 'Reaction fara',
    copy: 'Copier',
    transferTo: 'Ka ci ma',
    transferSearchPlaceholder: 'Mogo yiriwa (@nom wala nom)',
    transferNoUser: 'Mogo si te soro',
    transferSuccess: 'Mesaji kafi',
    transferError: 'A ma se ka kafi',
    pinned: 'Sinsinnen',
    unpinned: 'Sinsinbali',
    deleteForAll: 'Ka bo bɛɛ ma',
    deleteForAllConfirm: 'Ka mesaji nin bo bɛɛ ma? (15 min kono doro)',
    deleteForAllSuccess: 'Mesaji bora bɛɛ ma',
    deleteForAllError: 'A ma se (waati tigi wala mesaji te)',
    pinnedMessage: 'Mesaji sinsin',
    ephemeralMode: 'Ka bila kalanden',
    shareLocation: 'N so sigida ci',
    shareContact: 'Mogo ci',
    locationMessage: 'Sigida',
    contactMessage: 'Mogo ci',
    markedImportant: 'Muhimu taara',
    unmarkedImportant: 'Muhimu bo',
    voiceCall: 'Vocal call',
    videoCall: 'Video call',
    openingCall: 'Appel b i na...',
  },
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EMOJI_LIBRARY = ['😀', '😃', '😄', '😁', '😆', '🥲', '😂', '🤣', '😊', '😉', '😍', '😘', '😎', '🤩', '🥳', '🤔', '🤗', '😴', '😡', '😭', '👍', '👎', '👏', '🙌', '🙏', '💪', '🔥', '✨', '💙', '❤️', '💯', '🎉', '🌍', '🇲🇱', '🇸🇳', '🇨🇮'];

export default function Chat() {
  const { language } = useTranslation();
  const labels = chatI18n[language] || chatI18n.fr;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || searchParams.get('_userId');
  const orderId = searchParams.get('orderId') || searchParams.get('_orderId');
  const messageEndRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const { user: currentUser, isAuthenticated, isLoadingAuth } = useAuth();
  const [messageContent, setMessageContent] = useState('');
  const [conversation, setConversation] = useState(null);
  const [olderMessages, setOlderMessages] = useState([]);
  const [cursorForOlder, setCursorForOlder] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeMessage, setActiveMessage] = useState(null);
  const [messageActionsOpen, setMessageActionsOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSearch, setTransferSearch] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [ephemeralMode, setEphemeralMode] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const draftSavedRef = useRef(false);

  const queryClient = useQueryClient();

  // Laisser le garde global gérer les non-authentifiés
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const { data: conversationData, isLoading: loadingConv, isError: isErrorConv, refetch: refetchConv } = useQuery({
    queryKey: ['conversation', currentUser?.id, userId],
    queryFn: () => api.messages.getConversation(userId),
    enabled: !!currentUser?.id && !!userId,
  });

  useEffect(() => {
    if (conversationData) setConversation(conversationData);
  }, [conversationData]);

  const otherUser = conversation
    ? conversation.user1_id === currentUser?.id
      ? conversation.user2
      : conversation.user1
    : null;

  const conversationId = conversation?.id;

  const { data: draftData } = useQuery({
    queryKey: ['conversation-draft', conversationId, currentUser?.id],
    queryFn: () => api.messages.getDraft(conversationId),
    enabled: !!conversationId && !!currentUser?.id,
  });
  useEffect(() => {
    if (!conversationId || !draftData) return;
    const content = draftData?.draft_content ?? draftData?.content ?? '';
    if (typeof content === 'string' && !draftSavedRef.current) {
      setMessageContent(content);
      draftSavedRef.current = true;
    }
  }, [conversationId, draftData]);
  useEffect(() => {
    if (!conversationId) draftSavedRef.current = false;
  }, [conversationId]);

  const putDraftMutation = useMutation({
    mutationFn: ({ cId, content }) => api.messages.putDraft(cId, content),
  });
  const saveDraft = useCallback(() => {
    if (!conversationId || !messageContent.trim()) return;
    putDraftMutation.mutate({ cId: conversationId, content: messageContent });
  }, [conversationId, messageContent]);

  const { data: messagesData, isLoading: loadingMessages, isError: isErrorMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages-list', conversationId],
    queryFn: () => api.messages.getMessages(conversationId, null, MESSAGES_LIMIT),
    enabled: !!conversationId,
  });

  const isPageVisible = usePageVisibility();

  const onNewMessage = useCallback(() => {
    refetchMessages();
    queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
  }, [refetchMessages, queryClient, currentUser?.id]);
  const onMessageRead = useCallback(() => refetchMessages(), [refetchMessages]);

  useEffect(() => {
    if (isErrorConv && userId) {
      toast.error(labels.selectConversation, { action: { label: labels.backToMessages, onClick: () => navigate(createPageUrl('Inbox')) } });
    }
  }, [isErrorConv, userId, labels.selectConversation, labels.backToMessages, navigate]);

  useEffect(() => {
    if (isErrorMessages && conversationId) {
      toast.error(labels.loadOlderError, { action: { label: 'Réessayer', onClick: () => refetchMessages() } });
    }
  }, [isErrorMessages, conversationId, labels.loadOlderError, refetchMessages]);

  const { data: presence } = useQuery({
    queryKey: ['presence', userId],
    queryFn: () => api.messages.getPresence(userId),
    enabled: !!userId,
    refetchInterval: isPageVisible ? 15000 : false,
  });

  const { typingUser, emitTypingStart, emitTypingStop, isConnected } = useConversationSocket({
    userId: currentUser?.id,
    conversationId,
    userName: currentUser?.full_name || currentUser?.username,
    onNewMessage,
    onMessageRead,
  });

  const firstPageMessages = messagesData?.messages ?? [];
  const hasMore = messagesData?.hasMore ?? false;

  useEffect(() => {
    if (messagesData?.nextCursor != null) setCursorForOlder(messagesData.nextCursor);
  }, [messagesData?.nextCursor]);

  useEffect(() => {
    setOlderMessages([]);
    setCursorForOlder(null);
  }, [conversationId]);

  const messages = [...olderMessages, ...firstPageMessages];

  const loadOlder = useCallback(async () => {
    if (!conversationId || cursorForOlder == null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await api.messages.getMessages(conversationId, cursorForOlder, MESSAGES_LIMIT);
      setOlderMessages((prev) => [...(res.messages ?? []), ...prev]);
      setCursorForOlder(res.nextCursor ?? null);
    } catch (_e) {
      toast.error(labels.loadOlderError);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, cursorForOlder, loadingOlder, labels.loadOlderError]);

  useEffect(() => {
    if (!conversationId || !currentUser?.id) return;
    api.messages.markAsRead(conversationId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
    }).catch(() => {});
  }, [conversationId, currentUser?.id, queryClient]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    setMessageContent(e.target.value);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    emitTypingStart();
    typingDebounceRef.current = setTimeout(() => emitTypingStop(), TYPING_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (!conversationId || !messageContent.trim()) return;
    const t = setTimeout(() => saveDraft(), 1500);
    return () => clearTimeout(t);
  }, [messageContent, conversationId, saveDraft]);

  const handleExportConversations = async () => {
    try {
      const data = await api.messages.exportConversations();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afriwonder-messages-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Export impossible');
    }
  };

  const handleStartCall = (type = 'audio') => {
    if (!otherUser?.id) return;
    toast.info(labels.openingCall);
    const callId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    navigate(`${createPageUrl('DirectCall')}?mode=outgoing&receiverId=${otherUser.id}&type=${type}&callId=${callId}`);
  };

  const sendMessageMutation = useMutation({
    mutationFn: ({
      content,
      type = 'text',
      media_url,
      thumbnail_url,
      reply_to_message_id,
      scheduled_at,
      is_ephemeral,
      expires_at,
      location_lat,
      location_lng,
      location_label,
      contact_user_id,
      contact_name,
    } = {}) =>
      api.messages.send(userId, content ?? '', {
        type,
        media_url,
        thumbnail_url,
        reply_to_message_id,
        scheduled_at: scheduled_at || undefined,
        is_ephemeral: is_ephemeral || undefined,
        expires_at: expires_at || undefined,
        location_lat,
        location_lng,
        location_label,
        contact_user_id,
        contact_name,
      }),
    onSuccess: (_data, variables) => {
      emitTypingStop();
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
      setMessageContent('');
      setReplyTarget(null);
      setScheduledAt('');
      setShowSchedule(false);
      setEphemeralMode(false);
      if (conversationId && !variables?.scheduled_at) {
        api.messages.putDraft(conversationId, '').catch(() => {});
      }
      toast.success(variables?.scheduled_at ? 'Message programmé' : labels.sendSuccess);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message
        || err?.response?.data?.message
        || err?.apiMessage
        || err?.message
        || labels.sendError
      );
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => api.messages.block(userId),
    onSuccess: () => {
      toast.success(labels.blockSuccess);
      navigate(createPageUrl('Inbox'));
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.apiMessage || labels.blockError);
    },
  });

  const reportMutation = useMutation({
    mutationFn: (messageId) => api.messages.report(messageId, 'Signalement depuis menu chat'),
    onSuccess: () => toast.success(labels.reportSuccess),
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.reportError),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => api.messages.deleteMessage(messageId),
    onSuccess: () => {
      toast.success(labels.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: ['messages-list', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, userId] });
      refetchMessages();
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.deleteError),
  });

  const deleteForAllMutation = useMutation({
    mutationFn: (messageId) => api.messages.deleteForAll(messageId),
    onSuccess: () => {
      toast.success(labels.deleteForAllSuccess ?? 'Message supprimé pour tous');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, userId] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || err?.response?.data?.message || labels.deleteForAllError),
  });

  const updateMetaMutation = useMutation({
    mutationFn: ({ messageId, payload }) => api.messages.updateMessageMeta(messageId, payload),
    onSuccess: () => refetchMessages(),
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.sendError),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }) => api.messages.setReaction(messageId, emoji),
    onSuccess: () => {
      refetchMessages();
      toast.success(labels.reactionAdded);
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.sendError),
  });

  const handleBlockUser = () => setConfirmAction({ type: 'block' });

  const handleReportLastMessage = () => {
    const lastIncoming = [...messages].reverse().find((m) => m.sender_id !== currentUser?.id && !m.is_deleted);
    if (!lastIncoming?.id) {
      toast.error(labels.reportNoMessage);
      return;
    }
    setConfirmAction({ type: 'report', messageId: lastIncoming.id });
  };

  const handleDeleteMyLastMessage = () => {
    const lastOwn = [...messages].reverse().find((m) => m.sender_id === currentUser?.id && !m.is_deleted);
    if (!lastOwn?.id) {
      toast.error(labels.deleteNoMessage);
      return;
    }
    setConfirmAction({ type: 'delete', messageId: lastOwn.id });
  };

  const handleConfirmAction = () => {
    if (!confirmAction?.type) return;
    const targetId = confirmAction.messageId || activeMessage?.id;
    if (confirmAction.type === 'block') {
      blockMutation.mutate();
    } else if (confirmAction.type === 'report' && targetId) {
      reportMutation.mutate(targetId);
    } else if (confirmAction.type === 'delete' && targetId) {
      deleteMessageMutation.mutate(targetId);
    } else if (confirmAction.type === 'delete_for_all' && targetId) {
      deleteForAllMutation.mutate(targetId);
    }
    setMessageActionsOpen(false);
    setConfirmAction(null);
  };

  const confirmDialogMeta = (() => {
    if (confirmAction?.type === 'block') {
      return { title: labels.confirmTitleBlock, description: labels.confirmDescBlock };
    }
    if (confirmAction?.type === 'delete') {
      return { title: labels.confirmTitleDelete, description: labels.confirmDescDelete };
    }
    if (confirmAction?.type === 'delete_for_all') {
      return { title: labels.deleteForAll ?? 'Supprimer pour tous', description: labels.deleteForAllConfirm ?? 'Ce message sera supprimé pour tout le monde (possible uniquement dans les 15 min).' };
    }
    if (confirmAction?.type === 'report') {
      return { title: labels.confirmTitleReport, description: labels.confirmDescReport };
    }
    return { title: labels.actions, description: '' };
  })();

  const filteredEmojis = EMOJI_LIBRARY.filter((e) => e.includes(emojiSearch) || emojiSearch.trim().length === 0);

  useEffect(() => {
    if (!transferOpen) setTransferSearch('');
  }, [transferOpen]);

  const openMessageActions = (msg) => {
    setActiveMessage(msg);
    setMessageActionsOpen(true);
  };

  const handleCopyMessage = async (msg) => {
    if (!msg?.content?.trim()) {
      toast.error(labels.noTextToCopy);
      return;
    }
    try {
      await navigator.clipboard.writeText(msg.content);
      toast.success(labels.copied);
      setMessageActionsOpen(false);
    } catch (_e) {
      toast.error(labels.sendError);
    }
  };

  const handleReplyMessage = (msg) => {
    setReplyTarget(msg);
    setMessageActionsOpen(false);
  };

  const handleSelectMessageMode = (msg) => {
    setSelectionMode(true);
    if (msg?.id) {
      setSelectedMessageIds((prev) => (prev.includes(msg.id) ? prev : [...prev, msg.id]));
    }
    toast.success(labels.selectModeOn);
    setMessageActionsOpen(false);
  };

  const toggleSelectMessage = (messageId) => {
    setSelectedMessageIds((prev) => (prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]));
  };

  const handleReactToMessage = (emoji) => {
    if (!activeMessage?.id) return;
    reactionMutation.mutate({ messageId: activeMessage.id, emoji });
    setMessageActionsOpen(false);
    setEmojiPickerOpen(false);
  };

  const { data: transferUsers = [], isFetching: transferLoading } = useQuery({
    queryKey: ['chat-transfer-users', transferSearch, currentUser?.id],
    queryFn: () => api.users.list({ page: 1, limit: 20, search: transferSearch.trim() }),
    enabled: transferOpen && transferSearch.trim().length >= 2 && !!currentUser?.id,
  });

  const { data: contactSearchUsers = [], isFetching: contactSearchLoading } = useQuery({
    queryKey: ['chat-contact-search', contactSearchQuery, currentUser?.id],
    queryFn: () => api.users.list({ page: 1, limit: 30, search: contactSearchQuery.trim() }),
    enabled: contactDialogOpen && contactSearchQuery.trim().length >= 1 && !!currentUser?.id,
  });

  const transferMutation = useMutation({
    mutationFn: async (targetUser) => {
      if (!activeMessage) throw new Error('Message absent');
      const msgType = activeMessage.type || 'text';
      const content = activeMessage.content || '';
      return api.messages.send(targetUser.id, content, {
        type: msgType,
        media_url: activeMessage.media_url || undefined,
        thumbnail_url: activeMessage.thumbnail_url || undefined,
      });
    },
    onSuccess: () => {
      toast.success(labels.transferSuccess);
      setTransferOpen(false);
      setMessageActionsOpen(false);
      setTransferSearch('');
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.transferError),
  });

  const handleTransferOpen = () => {
    setMessageActionsOpen(false);
    setTransferOpen(true);
  };

  const pinnedMessageId = conversation?.pinned_message_id ?? conversation?.pinned_message?.id;

  const handlePinMessage = (msg) => {
    if (!msg?.id || !conversationId) return;
    const isCurrentlyPinned = pinnedMessageId === msg.id;
    if (isCurrentlyPinned) {
      api.messages.unpinMessage(conversationId).then(() => {
        toast.success(labels.unpinned);
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, userId] });
      }).catch((err) => toast.error(err?.response?.data?.message || labels.sendError));
    } else {
      api.messages.pinMessage(conversationId, msg.id).then(() => {
        toast.success(labels.pinned);
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, userId] });
      }).catch((err) => toast.error(err?.response?.data?.message || labels.sendError));
    }
    setMessageActionsOpen(false);
  };

  const handleMarkImportant = (msg) => {
    if (!msg?.id) return;
    const nextImportant = !msg.is_important;
    updateMetaMutation.mutate({ messageId: msg.id, payload: { is_important: nextImportant } });
    toast.success(nextImportant ? labels.markedImportant : labels.unmarkedImportant);
    setMessageActionsOpen(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = messageContent.trim();
    if (!text) return;
    const scheduled_at = showSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
    const is_ephemeral = ephemeralMode;
    const expires_at = is_ephemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;
    sendMessageMutation.mutate({
      content: text,
      reply_to_message_id: replyTarget?.id || undefined,
      scheduled_at,
      is_ephemeral: is_ephemeral || undefined,
      expires_at,
    });
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n’est pas supportée');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const label = labels.shareLocation ?? 'Position';
        sendMessageMutation.mutate({
          content: label,
          type: 'location',
          location_lat: lat,
          location_lng: lng,
          location_label: label,
          reply_to_message_id: replyTarget?.id || undefined,
        });
        setLocationLoading(false);
      },
      () => {
        toast.error('Impossible d’obtenir la position');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleShareContact = (user) => {
    sendMessageMutation.mutate({
      content: user.full_name || user.username || user.id,
      type: 'contact',
      contact_user_id: user.id,
      contact_name: user.full_name || user.username || undefined,
      reply_to_message_id: replyTarget?.id || undefined,
    });
    setContactDialogOpen(false);
    setContactSearchQuery('');
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error(labels.selectImage);
      return;
    }
    e.target.value = '';
    try {
      const { file_url } = await api.upload.image(file);
      sendMessageMutation.mutate({ content: '', type: 'image', media_url: file_url, reply_to_message_id: replyTarget?.id || undefined });
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || err?.apiMessage || labels.uploadError);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (audioBlob.size === 0) return;
          const ext = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
          const audioFile = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: audioBlob.type || 'audio/webm' });
          const { file_url } = await api.upload.audio(audioFile);
          sendMessageMutation.mutate({ content: '', type: 'voice', media_url: file_url, reply_to_message_id: replyTarget?.id || undefined });
        } catch (_err) {
          toast.error(labels.voiceStopError);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (_err) {
      toast.error(labels.voiceStartError);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecording(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">{labels.selectConversation}</p>
        <Button onClick={() => navigate(createPageUrl('Inbox'))}>{labels.backToMessages}</Button>
        <BottomNav />
      </div>
    );
  }

  if (loadingConv || !otherUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col overflow-hidden">
      {!isConnected && (
        <div className="shrink-0 px-3 py-1.5 bg-amber-500/20 text-amber-200 text-xs text-center border-b border-amber-500/30" role="status">
          Reconnexion en cours…
        </div>
      )}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-blue-900/40 shrink-0 bg-slate-950/85 backdrop-blur">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" aria-label="Retour">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUser?.profile_image} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            {otherUser?.full_name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{otherUser?.full_name || otherUser?.username || 'Utilisateur'}</p>
          <p className="text-xs text-blue-100/70 truncate">
            {typingUser
              ? `${typingUser.name} ${labels.typingSuffix}`
              : presence?.is_online
                ? labels.online
                : presence?.last_seen
                  ? `Vu ${formatDistanceToNow(new Date(presence.last_seen), { addSuffix: true, locale: fr })}`
                  : labels.offline}
          </p>
        </div>
        {selectionMode && (
          <button
            type="button"
            className="text-xs font-semibold text-blue-300 hover:text-blue-100 mr-1"
            onClick={() => {
              setSelectionMode(false);
              setSelectedMessageIds([]);
            }}
          >
            {selectedMessageIds.length > 0 ? `${selectedMessageIds.length}` : labels.cancel}
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-blue-200 hover:text-white hover:bg-blue-500/30 rounded-full"
          aria-label={labels.voiceCall}
          onClick={() => handleStartCall('audio')}
        >
          <Phone className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-blue-200 hover:text-white hover:bg-blue-500/30 rounded-full"
          aria-label={labels.videoCall}
          onClick={() => handleStartCall('video')}
        >
          <Video className="w-5 h-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-blue-200 hover:text-white hover:bg-blue-500/30 rounded-full">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleBlockUser}
              disabled={blockMutation.isPending}
            >
              <ShieldBan className="w-4 h-4 mr-2 text-blue-600" />
              {labels.blockUser}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleReportLastMessage}
              disabled={reportMutation.isPending}
            >
              <Flag className="w-4 h-4 mr-2 text-blue-600" />
              {labels.reportLast}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={handleDeleteMyLastMessage}
              disabled={deleteMessageMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {labels.deleteMyLast}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleExportConversations}>
              <Download className="w-4 h-4 mr-2" />
              Exporter la conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {orderId && (
        <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-400/20 flex items-center justify-between gap-2">
          <span className="text-sm text-amber-200">{labels.orderConversation}{orderId.slice(0, 8)}</span>
          <Button variant="outline" size="sm" className="border-amber-300/60 text-amber-100 bg-transparent shrink-0" onClick={() => navigate(`${createPageUrl('OrderTracking')}?id=${orderId}`)}>
            {labels.viewOrder}
          </Button>
        </div>
      )}

      {conversation?.pinned_message && (
        <div className="shrink-0 px-3 py-2 bg-blue-500/15 border-b border-blue-400/20 flex items-center gap-2">
          <Pin className="w-4 h-4 text-blue-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-200/80">{labels.pinnedMessage ?? 'Message épinglé'}</p>
            <p className="text-sm text-blue-50 truncate">{conversation.pinned_message.content || '—'}</p>
          </div>
        </div>
      )}

      <div
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3"
        style={{ paddingBottom: 'calc(190px + env(safe-area-inset-bottom, 0px))' }}
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.loadOlder}
            </Button>
          </div>
        )}
        {loadingMessages ? (
          <div className="flex justify-center h-24">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center min-h-[200px]">
            <div>
              <p className="text-blue-100/70">{labels.noMessage}</p>
              <p className="text-sm text-blue-100/50">{labels.startConversation}</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.is_deleted) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-gray-400">{labels.deletedMessage}</span>
                </div>
              );
            }
            const isOwn = msg.sender_id === currentUser?.id;
            const isImage = msg.type === 'image' && msg.media_url;
            const isAudio = (msg.type === 'audio' || msg.type === 'voice') && msg.media_url;
            const isLocation = msg.type === 'location' && (msg.location_lat != null && msg.location_lng != null);
            const isContact = msg.type === 'contact' && (msg.contact_user_id || msg.contact_name);
            const reactionsMap = (msg.reactions && typeof msg.reactions === 'object') ? msg.reactions : {};
            const myReaction = currentUser?.id ? reactionsMap[currentUser.id] : null;
            const reactionToShow = myReaction || Object.values(reactionsMap)[0];
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {selectionMode && (
                  <button
                    type="button"
                    className={`w-5 h-5 rounded border ${selectedMessageIds.includes(msg.id) ? 'bg-blue-600 border-blue-600' : 'border-blue-200/40 bg-transparent'}`}
                    onClick={() => toggleSelectMessage(msg.id)}
                    aria-label={labels.select}
                  />
                )}
                <div className={`relative max-w-[76%] sm:max-w-[68%] ${isOwn ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white' : 'bg-slate-800 text-blue-50'} rounded-2xl px-4 py-2 shadow-sm`}>
                  <button
                    type="button"
                    className={`absolute top-1 right-1 p-1 rounded-full ${isOwn ? 'hover:bg-white/15' : 'hover:bg-black/5'}`}
                    onClick={() => openMessageActions(msg)}
                    aria-label={labels.actions}
                  >
                    <MoreVertical className={`w-3.5 h-3.5 ${isOwn ? 'text-white/80' : 'text-blue-100/70'}`} />
                  </button>
                  {msg.reply_to && (
                    <div className={`mb-2 rounded-lg px-2 py-1 border-l-2 ${isOwn ? 'bg-white/15 border-white/60 text-white/90' : 'bg-slate-700 border-blue-200 text-blue-100/80'}`}>
                      <p className="text-[10px] font-semibold">{labels.replyingTo}</p>
                      <p className="text-xs truncate">{msg.reply_to.content || labels.voiceMessage}</p>
                    </div>
                  )}
                  {isImage && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden max-w-[260px] my-1">
                      <img src={msg.media_url} alt="" className="w-full h-auto object-cover" />
                    </a>
                  )}
                  {isAudio && (
                    <div className="my-1">
                      <audio controls src={msg.media_url} className="max-w-[240px]" />
                      {!msg.content && <p className={`text-xs mt-1 ${isOwn ? 'text-white/80' : 'text-blue-100/70'}`}>{labels.voiceMessage}</p>}
                    </div>
                  )}
                  {isLocation && (
                    <a
                      href={`https://www.google.com/maps?q=${msg.location_lat},${msg.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 my-1 px-2 py-1.5 rounded-lg ${isOwn ? 'bg-white/15 text-white' : 'bg-slate-700 text-blue-100'}`}
                    >
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{msg.location_label || msg.content || labels.locationMessage}</span>
                    </a>
                  )}
                  {isContact && (
                    <div className={`inline-flex items-center gap-2 my-1 px-2 py-1.5 rounded-lg ${isOwn ? 'bg-white/15 text-white' : 'bg-slate-700 text-blue-100'}`}>
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{msg.contact_name || msg.content || labels.contactMessage}</span>
                    </div>
                  )}
                  {msg.content && typeof msg.content === 'string' && msg.content.trim() && !isLocation && !isContact && (
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {!isImage && !isAudio && !isLocation && !isContact && !(msg.content && msg.content.trim()) && <p className="opacity-70">-</p>}
                  <p className={`text-xs mt-1 flex items-center gap-1 flex-wrap ${isOwn ? 'text-white/70' : 'text-blue-100/65'}`}>
                    {(msg.id === pinnedMessageId) && <Pin className="w-3 h-3" />}
                    {msg.is_important && <Star className="w-3 h-3" />}
                    {msg.is_ephemeral && <Timer className="w-3 h-3" title={labels.ephemeralMode} />}
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                    {isOwn && msg.status === 'read' && ` · ${labels.read}`}
                  </p>
                  {reactionToShow && (
                    <div className={`absolute -bottom-3 ${isOwn ? 'left-2' : 'right-2'} bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs shadow-sm text-black`}>
                      {String(reactionToShow)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      <input ref={fileInputRef} type="file" accept={FILE_ACCEPT_IMAGES} className="hidden" onChange={handleImageSelect} />
      {replyTarget && (
        <div
          className="fixed left-0 right-0 z-40 bg-slate-900/95 border-t border-blue-500/20 px-4 py-2 flex items-center justify-between gap-3"
          style={{ bottom: 'calc(164px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-300">{labels.replyTo} {replyTarget.sender?.full_name || replyTarget.sender?.username || 'Utilisateur'}</p>
            <p className="text-xs text-blue-100/70 truncate">{replyTarget.content || labels.voiceMessage}</p>
          </div>
          <button type="button" className="text-blue-300 hover:text-blue-100" onClick={() => setReplyTarget(null)} aria-label={labels.cancelReply}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        className="fixed left-0 right-0 z-40 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/85 border-t border-blue-500/20 p-3 flex gap-2"
        style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Button type="button" variant="ghost" size="icon" className="text-blue-200 hover:text-white hover:bg-blue-500/20" onClick={() => fileInputRef.current?.click()} disabled={sendMessageMutation.isPending}>
          <ImageIcon className="w-5 h-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={isRecording ? "text-red-400 hover:bg-red-500/20" : "text-blue-200 hover:text-white hover:bg-blue-500/20"}
          onClick={() => (isRecording ? stopRecording() : startRecording())}
          disabled={sendMessageMutation.isPending}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={ephemeralMode ? 'text-amber-300 hover:bg-amber-500/20' : 'text-blue-200 hover:text-white hover:bg-blue-500/20'}
          onClick={() => setEphemeralMode((prev) => !prev)}
          aria-label={labels.ephemeralMode}
          title={labels.ephemeralMode}
        >
          <Timer className="w-5 h-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-blue-200 hover:text-white hover:bg-blue-500/20"
          onClick={handleShareLocation}
          disabled={sendMessageMutation.isPending || locationLoading}
          aria-label={labels.shareLocation}
          title={labels.shareLocation}
        >
          {locationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-blue-200 hover:text-white hover:bg-blue-500/20"
          onClick={() => setContactDialogOpen(true)}
          disabled={sendMessageMutation.isPending}
          aria-label={labels.shareContact}
          title={labels.shareContact}
        >
          <UserPlus className="w-5 h-5" />
        </Button>
        <form onSubmit={handleSendMessage} className="flex-1 flex flex-col gap-2">
          {showSchedule && (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="rounded-lg bg-slate-800 border-blue-500/30 text-blue-50 text-sm"
              />
              <button type="button" className="text-blue-200 hover:text-white text-sm" onClick={() => { setShowSchedule(false); setScheduledAt(''); }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowSchedule((prev) => !prev)}
              className="text-blue-200 hover:text-white hover:bg-blue-500/20 rounded-full p-2"
              title="Programmer l'envoi"
              aria-label="Programmer l'envoi"
            >
              <Clock className="w-5 h-5" />
            </button>
            <Input
              placeholder={isRecording ? labels.recording : labels.placeholder}
              value={messageContent}
              onChange={handleInputChange}
              onBlur={saveDraft}
              disabled={sendMessageMutation.isPending || isRecording}
              className="rounded-full bg-slate-900 border-blue-500/30 text-blue-50 placeholder:text-blue-100/40 flex-1"
            />
            <Button type="submit" disabled={!messageContent.trim() || sendMessageMutation.isPending || isRecording} size="icon" className="bg-blue-600 hover:bg-blue-700 rounded-full">
              {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </div>
      <BottomNav />

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{labels.shareContact}</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9 rounded-full"
              placeholder={labels.transferSearchPlaceholder ?? 'Rechercher un utilisateur...'}
              value={contactSearchQuery}
              onChange={(e) => setContactSearchQuery(e.target.value)}
            />
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
            {contactSearchLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            )}
            {!contactSearchLoading && contactSearchQuery.trim().length < 1 && (
              <p className="text-sm text-gray-500 text-center py-4">{labels.transferSearchPlaceholder ?? 'Tapez pour rechercher'}</p>
            )}
            {!contactSearchLoading && contactSearchQuery.trim().length >= 1 && contactSearchUsers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">{labels.transferNoUser}</p>
            )}
            {!contactSearchLoading &&
              contactSearchUsers
                .filter((u) => u.id !== currentUser?.id && u.id !== userId)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                    onClick={() => handleShareContact(u)}
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.profile_image} />
                      <AvatarFallback>{(u.full_name || u.username || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{u.full_name || u.username || u.id}</p>
                      {u.username && u.full_name && <p className="text-xs text-gray-500 truncate">@{u.username}</p>}
                    </div>
                  </button>
                ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageActionsOpen} onOpenChange={setMessageActionsOpen}>
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-4 pt-3 pb-2 border-b">
            <DialogTitle className="text-base">{labels.actions}</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="text-2xl leading-none hover:scale-110 transition-transform"
                  onClick={() => handleReactToMessage(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                className="ml-auto w-9 h-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center"
                onClick={() => setEmojiPickerOpen(true)}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="px-2 py-2">
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left" onClick={() => handleReplyMessage(activeMessage)}>
              <Reply className="w-5 h-5 text-gray-500" />
              <span>{labels.replyTo}</span>
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left" onClick={() => handleCopyMessage(activeMessage)}>
              <Copy className="w-5 h-5 text-gray-500" />
              <span>{labels.copy}</span>
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left" onClick={handleTransferOpen}>
              <Forward className="w-5 h-5 text-gray-500" />
              <span>{labels.transfer}</span>
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left" onClick={() => handlePinMessage(activeMessage)}>
              <Pin className="w-5 h-5 text-gray-500" />
              <span>{activeMessage?.id === pinnedMessageId ? labels.unpinned : labels.pinMessage}</span>
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left" onClick={() => handleMarkImportant(activeMessage)}>
              <Star className="w-5 h-5 text-gray-500" />
              <span>{labels.markImportant}</span>
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left" onClick={() => handleSelectMessageMode(activeMessage)}>
              <CheckSquare className="w-5 h-5 text-gray-500" />
              <span>{labels.select}</span>
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left" onClick={() => { setMessageActionsOpen(false); setConfirmAction({ type: 'report', messageId: activeMessage?.id }); }}>
              <Flag className="w-5 h-5 text-gray-500" />
              <span>{labels.report}</span>
            </button>
            {(activeMessage?.sender_id === currentUser?.id) && (
              <>
                <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-left" onClick={() => { setMessageActionsOpen(false); setConfirmAction({ type: 'delete', messageId: activeMessage?.id }); }}>
                  <Trash2 className="w-5 h-5" />
                  <span>{labels.delete}</span>
                </button>
                {activeMessage?.created_at && (Date.now() - new Date(activeMessage.created_at).getTime() < 15 * 60 * 1000) && (
                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-left" onClick={() => { setMessageActionsOpen(false); setConfirmAction({ type: 'delete_for_all', messageId: activeMessage?.id }); }} disabled={deleteForAllMutation.isPending}>
                    <Trash2 className="w-5 h-5" />
                    <span>{labels.deleteForAll ?? 'Supprimer pour tous'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-4 pt-3 pb-2 border-b">
            <DialogTitle className="text-base">{labels.chooseReaction}</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9 rounded-full" placeholder={labels.searchReaction} value={emojiSearch} onChange={(e) => setEmojiSearch(e.target.value)} />
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-gray-500 mb-2">{labels.reactionsRecent}</p>
            <div className="flex gap-3 mb-4">
              {QUICK_REACTIONS.slice(0, 2).map((emoji) => (
                <button key={`recent-${emoji}`} type="button" className="text-3xl leading-none" onClick={() => handleReactToMessage(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mb-2">{labels.emojiAndPeople}</p>
            <div className="grid grid-cols-8 gap-2 max-h-56 overflow-y-auto">
              {filteredEmojis.map((emoji) => (
                <button key={`emoji-${emoji}`} type="button" className="text-2xl leading-none hover:scale-110 transition-transform" onClick={() => handleReactToMessage(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-4 pt-3 pb-2 border-b">
            <DialogTitle className="text-base">{labels.transferTo}</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 rounded-full"
                placeholder={labels.transferSearchPlaceholder}
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {transferLoading ? (
              <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
            ) : transferUsers.length > 0 ? (
              transferUsers
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left"
                    onClick={() => transferMutation.mutate(u)}
                    disabled={transferMutation.isPending}
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.profile_image} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {(u.full_name || u.username || 'U')?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || u.username}</p>
                      <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                    </div>
                  </button>
                ))
            ) : (
              <p className="text-sm text-gray-500 px-2 py-6 text-center">{labels.transferNoUser}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogMeta.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialogMeta.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmAction}>
              {labels.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
