// AfriWonder full review PR - CodeRabbit
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Edit, MessageCircle, ArrowLeft, UserPlus, Bell, BellOff, Filter, Users, Plus, Archive, ArchiveRestore, MoreVertical, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { isDeletedUser } from '@/lib/utils';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

export default function Inbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [followStateMap, setFollowStateMap] = useState({});
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [mutingConversationId, setMutingConversationId] = useState(null);
  const [exportingConversations, setExportingConversations] = useState(false);

  const isPageVisible = usePageVisibility();

  const handleExportConversations = async () => {
    if (exportingConversations) return;
    setExportingConversations(true);
    try {
      const result = await api.messages.exportConversations();
      const data = result?.data ?? result;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afriwonder-conversations-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur lors de l\'export');
    } finally {
      setExportingConversations(false);
    }
  };

  const muteConversationMutation = useMutation({
    mutationFn: ({ conversationId, muted }) => api.messages.setConversationNotifications(conversationId, { muted }),
    onSuccess: (_data, { conversationId }) => {
      setMutingConversationId(null);
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', user?.id] });
    },
    onError: () => {
      setMutingConversationId(null);
      toast.error('Impossible de modifier les notifications');
    },
  });

  const archiveConversationMutation = useMutation({
    mutationFn: ({ conversationId, archived }) => api.messages.archiveConversation(conversationId, archived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', user?.id] });
      toast.success('Conversation mise à jour');
    },
    onError: () => toast.error('Impossible d\'archiver / désarchiver'),
  });

  // Si l'authentification est encore en cours, afficher un écran de chargement simple
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600">Chargement de vos messages...</p>
      </div>
    );
  }

  // Si l'utilisateur n'est pas authentifié, laisser le garde global de l'app gérer la redirection
  if (!isAuthenticated) {
    return null;
  }

  const refetchIntervalWhenVisible = isPageVisible ? 10000 : false;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['messages-conversations', user?.id],
    queryFn: () => api.messages.getConversations(1, 50, true),
    enabled: !!user?.id,
    refetchInterval: refetchIntervalWhenVisible,
  });

  const { data: groupsData } = useQuery({
    queryKey: ['messages-groups', user?.id],
    queryFn: () => api.messages.getGroups(1, 50),
    enabled: !!user?.id,
    refetchInterval: refetchIntervalWhenVisible,
  });
  const groups = groupsData?.groups ?? [];

  const { data: notificationsData = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const result = await api.notifications.list({ limit: 50 });
      return result?.notifications || result?.data?.notifications || result || [];
    },
    enabled: !!user?.id,
    refetchInterval: refetchIntervalWhenVisible,
  });

  useEffect(() => {
    if (isError && user?.id) {
      toast.error('Impossible de charger les conversations. Réessayez.', {
        action: { label: 'Réessayer', onClick: () => refetch() },
      });
    }
  }, [isError, user?.id, refetch]);

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
    const archived = !!showArchived;
    const byArchived = conversations.filter((c) => (c.is_archived ?? c.archived) === archived);
    const source = activeFilter === 'unread' ? unreadConversations.filter((c) => (c.is_archived ?? c.archived) === archived) : byArchived;
    return source.filter((conv) => {
      const name = conv.other?.full_name || conv.other?.username || '';
      if (isDeletedUser(conv.other)) return false;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [activeFilter, showArchived, unreadConversations, conversations, searchQuery]);

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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0) return;
    setCreatingGroup(true);
    try {
      const group = await api.messages.createGroup(newGroupName.trim(), selectedMemberIds);
      setCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedMemberIds([]);
      queryClient.invalidateQueries({ queryKey: ['messages-groups', user?.id] });
      navigate(createPageUrl('GroupChat') + `?groupId=${group.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMemberForGroup = (id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportConversations}
              disabled={exportingConversations}
              className="rounded-xl"
              aria-label="Exporter mes conversations"
            >
              <Download className="w-5 h-5" />
            </Button>
            <Link to={createPageUrl('Search') + '?from=inbox&mode=messages'}>
              <Button variant="ghost" size="icon">
                <Edit className="w-5 h-5" />
              </Button>
            </Link>
          </div>
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
            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              className={showArchived ? 'bg-gray-700 text-white rounded-full' : 'rounded-full'}
              onClick={() => setShowArchived((prev) => !prev)}
            >
              <Archive className="w-4 h-4 mr-1" />
              Archivées
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

        {/* Groupes (CDC) */}
        {(groups.length > 0 || user?.id) && (
          <div className="rounded-2xl bg-white border border-gray-100 p-2">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Groupes
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setCreateGroupOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Créer un groupe
              </Button>
            </div>
            {groups.length > 0 && (
              <div className="space-y-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => navigate(createPageUrl('GroupChat') + `?groupId=${g.id}`)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left"
                  >
                    <Avatar className="w-12 h-12 rounded-xl flex-shrink-0">
                      <AvatarImage src={g.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 rounded-xl">
                        {(g.name || 'G').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{g.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {g.last_message_text || `${g.members_count ?? g.members?.length ?? 0} membre(s)`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {groups.length === 0 && (
              <p className="text-sm text-gray-500 px-2 pb-2">Aucun groupe. Créez-en un avec « Créer un groupe ».</p>
            )}
          </div>
        )}

        <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un groupe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Nom du groupe"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-sm text-gray-600">Ajoutez des membres (vos abonnements et suggestions)</p>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-xl p-2">
                {friendsForChat.slice(0, 20).map((u) => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(u.id)}
                      onChange={() => toggleMemberForGroup(u.id)}
                      className="rounded"
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.profile_image} />
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                        {(u.full_name || u.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{u.full_name || u.username || 'Utilisateur'}</span>
                  </label>
                ))}
                {friendsForChat.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">Suivez des utilisateurs pour les ajouter à un groupe.</p>
                )}
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMemberIds.length === 0 || creatingGroup}
              >
                {creatingGroup ? 'Création...' : 'Créer le groupe'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
        {isError ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <p className="text-gray-700 font-medium mb-3">Une erreur s&apos;est produite.</p>
            <Button onClick={() => refetch()} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              Réessayer
            </Button>
          </div>
        ) : isLoading ? (
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
            const isMuted = !!conv.muted;
            const isMuting = mutingConversationId === conv.id;
            const isArchived = !!(conv.is_archived ?? conv.archived);

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center gap-2 px-4 py-3.5 hover:bg-white active:bg-gray-100 transition-colors rounded-xl mx-2 my-1"
              >
                <Link to={`${createPageUrl('Chat')}?_userId=${otherUserId}`} className="flex flex-1 items-center gap-3 min-w-0">
                  <Avatar className="w-14 h-14 ring-2 ring-white shadow-md flex-shrink-0">
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
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 rounded-full h-9 w-9"
                  disabled={isMuting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMutingConversationId(conv.id);
                    muteConversationMutation.mutate({ conversationId: conv.id, muted: !isMuted });
                  }}
                  aria-label={isMuted ? 'Activer les notifications' : 'Désactiver les notifications'}
                  title={isMuted ? 'Activer les notifications' : 'Désactiver les notifications'}
                >
                  {isMuted ? (
                    <BellOff className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Bell className="w-4 h-4 text-gray-500" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 rounded-full h-9 w-9" onClick={(e) => e.preventDefault()}>
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        archiveConversationMutation.mutate({ conversationId: conv.id, archived: !isArchived });
                      }}
                    >
                      {isArchived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                      {isArchived ? 'Désarchiver' : 'Archiver'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
