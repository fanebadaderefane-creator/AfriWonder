import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '../components/navigation/BottomNav';
import { useConversationSocket } from '@/hooks/useMessageSocket';
import { useTranslation } from '@/components/common/useTranslation';

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
  },
};

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

  const [currentUser, setCurrentUser] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [conversation, setConversation] = useState(null);
  const [olderMessages, setOlderMessages] = useState([]);
  const [cursorForOlder, setCursorForOlder] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setCurrentUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, [navigate]);

  const { data: conversationData, isLoading: loadingConv } = useQuery({
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

  const { data: messagesData, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages-list', conversationId],
    queryFn: () => api.messages.getMessages(conversationId, null, MESSAGES_LIMIT),
    enabled: !!conversationId,
  });

  const onNewMessage = useCallback(() => {
    refetchMessages();
    queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
  }, [refetchMessages, queryClient, currentUser?.id]);
  const onMessageRead = useCallback(() => refetchMessages(), [refetchMessages]);

  const { data: presence } = useQuery({
    queryKey: ['presence', userId],
    queryFn: () => api.messages.getPresence(userId),
    enabled: !!userId,
    refetchInterval: 15000,
  });

  const { typingUser, emitTypingStart, emitTypingStop } = useConversationSocket({
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
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser.id] });
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

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, type = 'text', media_url, thumbnail_url } = {}) =>
      api.messages.send(userId, content ?? '', { type, media_url, thumbnail_url }),
    onSuccess: () => {
      emitTypingStop();
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
      setMessageContent('');
      toast.success(labels.sendSuccess);
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = messageContent.trim();
    if (!text) return;
    sendMessageMutation.mutate({ content: text });
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
      sendMessageMutation.mutate({ content: '', type: 'image', media_url: file_url });
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || err?.apiMessage || labels.uploadError);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUser?.profile_image} />
          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
            {otherUser?.full_name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{otherUser?.full_name || otherUser?.username || 'Utilisateur'}</p>
          <p className="text-xs text-gray-500">
            {typingUser
              ? `${typingUser.name} ${labels.typingSuffix}`
              : presence?.is_online
                ? labels.online
                : presence?.last_seen
                  ? `Vu ${formatDistanceToNow(new Date(presence.last_seen), { addSuffix: true, locale: fr })}`
                  : labels.offline}
          </p>
        </div>
      </div>

      {orderId && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
          <span className="text-sm text-amber-800">{labels.orderConversation}{orderId.slice(0, 8)}</span>
          <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 shrink-0" onClick={() => navigate(`${createPageUrl('OrderTracking')}?id=${orderId}`)}>
            {labels.viewOrder}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.loadOlder}
            </Button>
          </div>
        )}
        {loadingMessages ? (
          <div className="flex justify-center h-24">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center min-h-[200px]">
            <div>
              <p className="text-gray-500">{labels.noMessage}</p>
              <p className="text-sm text-gray-400">{labels.startConversation}</p>
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
            const isOwn = msg.sender_id === currentUser.id;
            const isImage = msg.type === 'image' && msg.media_url;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isOwn ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl px-4 py-2`}>
                  {isImage && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden max-w-[260px] my-1">
                      <img src={msg.media_url} alt="" className="w-full h-auto object-cover" />
                    </a>
                  )}
                  {msg.content && typeof msg.content === 'string' && msg.content.trim() && (
                    <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {!isImage && !(msg.content && msg.content.trim()) && <p className="opacity-70">-</p>}
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                    {isOwn && msg.status === 'read' && ` · ${labels.read}`}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      <div className="p-4 border-t border-gray-100 flex gap-3">
        <Button type="button" variant="ghost" size="icon" className="text-orange-500" onClick={() => fileInputRef.current?.click()} disabled={sendMessageMutation.isPending}>
          <ImageIcon className="w-5 h-5" />
        </Button>
        <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
          <Input
            placeholder={labels.placeholder}
            value={messageContent}
            onChange={handleInputChange}
            disabled={sendMessageMutation.isPending}
            className="rounded-full"
          />
          <Button type="submit" disabled={!messageContent.trim() || sendMessageMutation.isPending} size="icon" className="bg-orange-500 hover:bg-orange-600 rounded-full">
            {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
