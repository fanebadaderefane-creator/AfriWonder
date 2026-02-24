import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Edit, MessageCircle, ArrowLeft, UserPlus, Bell, Filter, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isDeletedUser } from '@/lib/utils';
import BottomNav from '../components/navigation/BottomNav';

export default function Inbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [followStateMap, setFollowStateMap] = useState({});

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {
        navigate('/');
      }
    };
    getUser();
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ['messages-conversations', user?.id],
    queryFn: () => api.messages.getConversations(1, 50),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const { data: notificationsData = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const result = await api.notifications.list({ limit: 50 });
      return result?.notifications || result?.data?.notifications || result || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const { data: userFollows = [] } = useQuery({
    queryKey: ['user-follows', user?.id],
    queryFn: async () => {
      const result = await api.users.getFollowing(user.id, { page: 1, limit: 200 });
      return result?.following || [];
    },
    enabled: !!user?.id,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['inbox-suggestions', user?.id, userFollows.length],
    queryFn: async () => {
      const users = await api.users.list({ page: 1, limit: 40 });
      const followedSet = new Set(userFollows.map((u) => u.id));
      return users
        .filter((u) => u.id !== user?.id && !followedSet.has(u.id) && !isDeletedUser(u))
        .slice(0, 20);
    },
    enabled: !!user?.id,
  });

  const toggleWonderMutation = useMutation({
    mutationFn: async (targetUser) => {
      const response = await api.users.toggleWonder(targetUser.id);
      return { response, targetUser };
    },
    onSuccess: ({ response, targetUser }) => {
      const inWonder = response?.data?.inWonder ?? response?.inWonder ?? true;
      setFollowStateMap((prev) => ({ ...prev, [targetUser.id]: inWonder }));

      queryClient.setQueryData(['user-follows', user?.id], (prev = []) => {
        const exists = prev.some((u) => u.id === targetUser.id);
        if (inWonder && !exists) return [targetUser, ...prev];
        if (!inWonder && exists) return prev.filter((u) => u.id !== targetUser.id);
        return prev;
      });

      queryClient.setQueryData(['inbox-suggestions', user?.id, userFollows.length], (prev = []) => {
        if (!Array.isArray(prev)) return prev;
        return inWonder ? prev.filter((u) => u.id !== targetUser.id) : prev;
      });

      queryClient.invalidateQueries({ queryKey: ['user-follows', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['inbox-suggestions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', user?.id] });
    },
  });

  const conversations = data?.conversations ?? [];
  const unreadConversations = useMemo(
    () => conversations.filter((conv) => (conv.unread_count ?? 0) > 0),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const source = activeFilter === 'unread' ? unreadConversations : conversations;
    return source.filter((conv) => {
      const name = conv.other?.full_name || conv.other?.username || '';
      if (isDeletedUser(conv.other)) return false;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [activeFilter, unreadConversations, conversations, searchQuery]);

  const followNotifications = notificationsData.filter((n) => ['follow', 'new_follower', 'new_wonder'].includes(n.type) && !n.is_read);
  const activityNotifications = notificationsData.filter((n) => ['like', 'comment', 'mention'].includes(n.type) && !n.is_read);
  const messageRequestsCount = notificationsData.filter((n) => n.type === 'message_request' && !n.is_read).length;

  const formatTime = (date) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  };

  const visibleSuggestions = showAllSuggested ? suggestions : suggestions.slice(0, 6);
  const friendsForChat = useMemo(
    () => userFollows.filter((u) => !isDeletedUser(u)).slice(0, 30),
    [userFollows]
  );
  const activeThreads = useMemo(
    () =>
      conversations
        .filter((conv) => conv?.other?.id && !isDeletedUser(conv.other))
        .slice(0, 12),
    [conversations]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          </div>
          <Link to={createPageUrl('Search') + '?from=inbox&mode=messages'}>
            <Button variant="ghost" size="icon">
              <Edit className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        <div className="px-4 pb-3">
          <div className="relative mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 rounded-xl border-gray-200 bg-gray-100 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={activeFilter === 'all' ? 'bg-gray-900 text-white rounded-full' : 'rounded-full'}
              onClick={() => setActiveFilter('all')}
            >
              <Filter className="w-4 h-4 mr-1" />
              Tous
            </Button>
            <Button
              variant={activeFilter === 'unread' ? 'default' : 'outline'}
              size="sm"
              className={activeFilter === 'unread' ? 'bg-blue-600 text-white rounded-full' : 'rounded-full'}
              onClick={() => setActiveFilter('unread')}
            >
              Non lus ({unreadConversations.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="px-3 space-y-3 mt-2">
        {activeThreads.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 border border-blue-700/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80 mb-2">Actifs maintenant</p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              {activeThreads.map((conv) => {
                const other = conv.other || {};
                const otherName = other.full_name || other.username || 'Utilisateur';
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => navigate(`${createPageUrl('Chat')}?_userId=${other.id}`)}
                    className="shrink-0 flex flex-col items-center gap-1 w-16"
                  >
                    <Avatar className="w-12 h-12 ring-2 ring-blue-200/60">
                      <AvatarImage src={other.profile_image} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                        {otherName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-blue-50 truncate w-full">{otherName.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white border border-gray-100 p-2">
          <button
            type="button"
            onClick={() => navigate(createPageUrl('Notifications'))}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Nouveaux wonderers</p>
              <p className="text-sm text-gray-500 truncate">
                {followNotifications.length > 0
                  ? `${followNotifications.length} nouveau(x) wonderer(s)`
                  : 'Aucun nouveau wonderer'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(createPageUrl('Notifications'))}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Activite</p>
              <p className="text-sm text-gray-500 truncate">
                {activityNotifications.length > 0
                  ? `${activityNotifications.length} reaction(s) recente(s)`
                  : 'Aucune activite recente'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Demandes de messages</p>
              <p className="text-sm text-gray-500 truncate">
                {messageRequestsCount > 0 ? `${messageRequestsCount} demande(s)` : 'Aucune demande'}
              </p>
            </div>
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <Users className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-gray-700">Mes ami(e)s pour discuter</p>
          </div>
          {friendsForChat.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 py-2">
              {friendsForChat.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => navigate(`${createPageUrl('Chat')}?_userId=${friend.id}`)}
                  className="shrink-0 flex flex-col items-center gap-1 w-16"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-blue-100">
                    <AvatarImage src={friend.profile_image} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      {(friend.full_name || friend.username || 'U')?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-gray-600 truncate w-full">
                    {(friend.full_name || friend.username || 'Ami').split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 px-2 py-2">Aucun ami pour le moment.</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-gray-700">Comptes suggeres</p>
            <button
              type="button"
              className="text-xs font-semibold text-gray-500 hover:text-gray-800"
              onClick={() => setShowAllSuggested((prev) => !prev)}
            >
              {showAllSuggested ? 'Voir moins' : 'Tout voir'}
            </button>
          </div>
          <div className="space-y-2">
            {visibleSuggestions.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-3 p-2">
                <Avatar className="w-11 h-11">
                  <AvatarImage src={candidate.profile_image} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {(candidate.full_name || candidate.username || 'U')?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{candidate.full_name || candidate.username || 'Utilisateur'}</p>
                  <p className="text-xs text-gray-500 truncate">@{candidate.username || candidate.email?.split('@')[0] || 'afriwonder'}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={toggleWonderMutation.isPending}
                  onClick={() => toggleWonderMutation.mutate(candidate)}
                >
                  {(followStateMap[candidate.id] ?? userFollows.some((u) => u.id === candidate.id)) ? 'Dans son Wonder' : 'Wonder'}
                </Button>
              </div>
            ))}
            {visibleSuggestions.length === 0 && (
              <p className="text-sm text-gray-500 px-2 py-2">Pas de suggestion pour le moment.</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-2 mt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Chargement des conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5">
              <MessageCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pas encore de messages</h3>
            <p className="text-gray-500 mb-6 max-w-[260px]">Echangez avec les createurs et vendeurs de la communaute AfriWonder</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate(createPageUrl('Discover'))} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                Decouvrir des createurs
              </Button>
              <Button onClick={() => navigate(createPageUrl('Marketplace'))} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Explorer le marketplace
              </Button>
            </div>
          </div>
        ) : (
          filteredConversations.map((conv, index) => {
            const other = conv.other || {};
            const otherName = other.full_name || other.username || 'Utilisateur';
            const otherAvatar = other.profile_image;
            const otherUserId = other.id;
            const unreadCount = conv.unread_count ?? 0;

            return (
              <Link key={conv.id} to={`${createPageUrl('Chat')}?_userId=${otherUserId}`}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-white active:bg-gray-100 transition-colors rounded-xl mx-2 my-1"
                >
                  <Avatar className="w-14 h-14 ring-2 ring-white shadow-md">
                    <AvatarImage src={otherAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                      {otherName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'}`}>
                        {otherName}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {conv.last_message_text || 'Aucun message'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center flex-shrink-0">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
