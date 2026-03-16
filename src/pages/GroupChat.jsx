/**
 * Chat de groupe — CDC Super-App AfriWonder (messagerie groupes).
 */
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '../components/navigation/BottomNav';

export default function GroupChat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const groupId = searchParams.get('groupId');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.messages.getGroup(groupId),
    enabled: !!groupId,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: () => api.messages.getGroupMessages(groupId, null, 50),
    enabled: !!groupId,
  });

  const messages = messagesData?.messages ?? [];
  const nextCursor = messagesData?.nextCursor;

  const sendMutation = useMutation({
    mutationFn: (content) => api.messages.sendGroupMessage(groupId, content),
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.apiMessage ?? err?.message;
      toast.error(msg || 'Impossible d\'envoyer le message.');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!groupId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-600 mb-4">Groupe non spécifié.</p>
        <Button onClick={() => navigate(createPageUrl('Inbox'))}>Retour aux messages</Button>
      </div>
    );
  }

  if (groupError || (groupLoading === false && !group)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-600 mb-4">Groupe introuvable ou accès refusé.</p>
        <Button onClick={() => navigate(createPageUrl('Inbox'))}>Retour aux messages</Button>
      </div>
    );
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Inbox'))} className="rounded-xl" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {group && (
          <>
            <Avatar className="w-10 h-10 rounded-xl flex-shrink-0">
              <AvatarImage src={group.avatar_url} />
              <AvatarFallback className="bg-blue-100 text-blue-700 rounded-xl">
                {(group.name || 'G').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{group.name}</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {group.members?.length ?? 0} membre(s)
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {groupLoading || messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun message. Envoyez le premier !
          </div>
        ) : (
          messages
            .slice()
            .reverse()
            .map((m, idx) => (
              <div key={m.id ?? `msg-${idx}`} className="flex gap-2">
                <Avatar className="w-8 h-8 rounded-lg flex-shrink-0">
                  <AvatarImage src={m.sender?.profile_image} />
                  <AvatarFallback className="bg-gray-200 text-gray-700 text-xs rounded-lg">
                    {(m.sender?.full_name || m.sender?.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">
                    {m.sender?.full_name || m.sender?.username || 'Utilisateur'} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                  </p>
                  <p className="text-gray-900 break-words">{m.content}</p>
                </div>
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex gap-2">
        <Input
          placeholder="Votre message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="rounded-xl flex-1"
        />
        <Button
          size="icon"
          className="rounded-xl flex-shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
