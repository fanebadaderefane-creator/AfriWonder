import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '@/api/expressClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildChatPath } from '@/lib/messagingRoutes';
import { useAuth } from '@/lib/AuthContext';
import { stripChatMarkupForPreview } from '@/components/chat/ChatFormattedText';

export default function StarredMessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['messages-starred', user?.id],
    queryFn: () => api.messages.getStarredMessages(),
    enabled: !!user?.id,
  });

  const messages = data?.messages ?? [];

  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#070a12]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.10]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">Messagerie</p>
            <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-white">Messages importants</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-4">
        {isLoading ? (
          <div className="rounded-[28px] bg-white/[0.035] p-5 text-white/55">Chargement…</div>
        ) : messages.length === 0 ? (
          <div className="rounded-[28px] bg-white/[0.035] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <Star className="mx-auto mb-3 h-10 w-10 text-white/24" />
            <p className="text-base font-semibold text-white">Aucun message important</p>
            <p className="mt-1 text-sm text-white/48">Marque un message comme important depuis une conversation pour le retrouver ici.</p>
            <Link to={createPageUrl('Inbox')} className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
              Retour à l’Inbox
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const conversation = msg.conversation;
              const other =
                conversation?.user1_id === user?.id
                  ? conversation?.user2
                  : conversation?.user1;
              const title = conversation?.group_name || other?.full_name || other?.username || 'Discussion';
              const avatar = other?.profile_image || msg.sender?.profile_image;
              const fallback = (title?.[0] || 'D').toUpperCase();
              const path = buildChatPath({
                conversationId: conversation?.id,
                userId: other?.id,
                source: 'starred',
              });

              return (
                <Link
                  key={msg.id}
                  to={path}
                  className="flex items-start gap-3 rounded-[24px] bg-white/[0.035] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.06] transition hover:bg-white/[0.05]"
                >
                  <Avatar className="h-11 w-11 ring-1 ring-white/10">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="bg-white/10 text-white">{fallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-white">{title}</p>
                      <span className="shrink-0 text-[11px] text-white/40">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-white/46">
                      {msg.sender?.full_name || msg.sender?.username || 'Expéditeur'}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-white/72">
                      {stripChatMarkupForPreview(msg.content || '') || '—'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
