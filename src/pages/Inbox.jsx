// AfriWonder full review PR - CodeRabbit
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Edit, MessageCircle, ArrowLeft, Bell, BellOff, Filter, Users, Plus, Archive, ArchiveRestore, MoreVertical, Download, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { cn, isDeletedUser } from '@/lib/utils';
import { buildChatPath } from '@/lib/messagingRoutes';
import {
  cacheConversations,
  getCachedConversations,
  cacheStories,
  getCachedStories,
} from '@/services/offlineProfilesMessages.service';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';
import { stripChatMarkupForPreview } from '@/components/chat/ChatFormattedText';
import {
  downloadPlainTextFile,
  formatAllDmExportsToPlainText,
  formatAllGroupsBundleToPlainText,
} from '@/lib/messagingExportPlainText';

const INBOX_PAGE_BG = 'bg-[#070a12]';
const INBOX_SECTION =
  'rounded-[28px] bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl';
const INBOX_SECTION_PAD = 'p-4 sm:p-5';
const INBOX_ICON_BUTTON =
  'h-10 w-10 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.10] hover:text-white';
/** Filtres messagerie : tactile ≥44px, texte centré. */
function inboxFilterChipClass(active) {
  return cn(
    'inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium leading-snug tracking-tight transition-colors touch-manipulation active:scale-[0.98] sm:px-4',
    active
      ? 'bg-white text-slate-950 shadow-[0_4px_20px_rgba(0,0,0,0.22)] ring-2 ring-white/25 hover:bg-white/95'
      : 'bg-white/[0.07] text-white/78 hover:bg-white/[0.11] hover:text-white'
  );
}

function InboxLoadingSkeleton() {
  return (
    <div className="space-y-3 px-3 pt-3">
      <div className={cn(INBOX_SECTION, INBOX_SECTION_PAD)}>
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-white/14 animate-pulse" />
            <div className="h-6 w-36 rounded-full bg-white/10 animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
        </div>
        <div className="h-12 rounded-2xl bg-white/8 animate-pulse" />
      </div>

      <div className={cn(INBOX_SECTION, 'p-2 sm:p-3')}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl px-3 py-3">
            <div className="h-14 w-14 rounded-full bg-white/10 animate-pulse" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 rounded-full bg-white/12 animate-pulse" />
              <div className="h-3 w-[70%] rounded-full bg-white/8 animate-pulse" />
            </div>
            <div className="h-3 w-10 rounded-full bg-white/8 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Inbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const conversationErrorToastShownRef = useRef(false);
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
  const [exportAllBusy, setExportAllBusy] = useState(false);
  const [exportGroupsBundleBusy, setExportGroupsBundleBusy] = useState(false);
  const [cachedStories, setCachedStories] = useState([]);

  const isPageVisible = usePageVisibility();

  const handleExportAllConversations = async () => {
    if (exportAllBusy || !user?.id) return;
    setExportAllBusy(true);
    try {
      const data = await api.messages.exportConversations();
      const txt = formatAllDmExportsToPlainText(data, user.id);
      downloadPlainTextFile(`AfriWonder-mes-discussions-${new Date().toISOString().slice(0, 10)}.txt`, txt);
      toast.success('Fichier enregistré — ouvrez votre dossier Téléchargements');
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Enregistrement impossible pour le moment');
    } finally {
      setExportAllBusy(false);
    }
  };

  const handleExportAllGroupThreads = async () => {
    if (exportGroupsBundleBusy || !user?.id) return;
    setExportGroupsBundleBusy(true);
    try {
      const data = await api.messages.exportAllGroupConversations();
      const txt = formatAllGroupsBundleToPlainText(data, user.id);
      downloadPlainTextFile(`AfriWonder-mes-groupes-${new Date().toISOString().slice(0, 10)}.txt`, txt);
      toast.success('Fichier enregistré — ouvrez votre dossier Téléchargements');
      if (data?.truncated) {
        toast.info(
          `Seulement ${data.groupsExported ?? 0} groupe(s) sur ${data.groupsTotal ?? 0} sont dans ce fichier. Pour un autre groupe, ouvrez-le et touchez « Enregistrer cette discussion ».`,
          { duration: 10000 }
        );
      }
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Enregistrement impossible pour le moment');
    } finally {
      setExportGroupsBundleBusy(false);
    }
  };

  useEffect(() => {
    const ng = searchParams.get('newGroup');
    if (ng === '1' || ng === 'true') {
      setCreateGroupOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('newGroup');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const inviteToken = searchParams.get('invite');
  useEffect(() => {
    if (!inviteToken || !user?.id || isLoadingAuth) return;
    let cancelled = false;
    api.messages
      .joinGroupByInviteToken(inviteToken)
      .then((group) => {
        if (cancelled || !group?.id) return;
        const next = new URLSearchParams(searchParams);
        next.delete('invite');
        setSearchParams(next, { replace: true });
        navigate(`${createPageUrl('GroupChat')}?groupId=${group.id}`);
        queryClient.invalidateQueries({ queryKey: ['messages-groups', user.id] });
        toast.success(`Vous avez rejoint le groupe « ${group.name || 'Groupe'} ».`);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err?.response?.data?.message ?? err?.message ?? "Lien d'invitation invalide ou expiré.");
        const next = new URLSearchParams(searchParams);
        next.delete('invite');
        setSearchParams(next, { replace: true });
      });
    return () => { cancelled = true; };
  }, [inviteToken, user?.id, isLoadingAuth, navigate, searchParams, setSearchParams, queryClient]);

  const muteConversationMutation = useMutation({
    mutationFn: ({ conversationId, muted }) => api.messages.setConversationNotifications(conversationId, { muted }),
    onSuccess: () => {
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

  const refetchIntervalWhenVisible = isPageVisible ? 10000 : false;

  useEffect(() => {
    if (!user?.id) return;
    getCachedConversations(user.id)
      .then((cached) => {
        if (cached?.conversations?.length) {
          queryClient.setQueryData(['messages-conversations', user.id], (prev) => prev || { conversations: cached.conversations });
        }
      })
      .catch(() => {});
    getCachedStories(user.id)
      .then((cached) => {
        if (cached?.stories?.length) setCachedStories(cached.stories);
      })
      .catch(() => {});
  }, [user?.id, queryClient]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['messages-conversations', user?.id],
    queryFn: () => api.messages.getConversations(1, 50, true),
    enabled: !!user?.id,
    refetchInterval: refetchIntervalWhenVisible,
  });

  useEffect(() => {
    if (user?.id && Array.isArray(data?.conversations)) {
      cacheConversations(user.id, data.conversations).catch(() => {});
    }
  }, [data?.conversations, user?.id]);

  const { data: groupsData } = useQuery({
    queryKey: ['messages-groups', user?.id],
    queryFn: () => api.messages.getGroups(1, 50),
    enabled: !!user?.id,
    refetchInterval: refetchIntervalWhenVisible,
  });
  const groups = groupsData?.groups ?? [];

  useEffect(() => {
    if (isError && user?.id) {
      if (conversationErrorToastShownRef.current) return;
      conversationErrorToastShownRef.current = true;
      toast.error('Impossible de charger les conversations. Réessayez.', {
        id: 'messages-conversations-error',
        action: { label: 'Réessayer', onClick: () => refetch() },
      });
      return;
    }
    conversationErrorToastShownRef.current = false;
  }, [isError, user?.id, refetch]);

  const { data: userFollows = [] } = useQuery({
    queryKey: ['user-follows', user?.id],
    queryFn: async () => {
      const result = await api.users.getFollowing(user.id, { page: 1, limit: 200 });
      return result?.following || [];
    },
    enabled: !!user?.id,
  });

  const { data: storiesData = cachedStories } = useQuery({
    queryKey: ['stories', 'inbox', user?.id, userFollows.length],
    queryFn: async () => {
      const ids = userFollows.length ? userFollows.map((u) => u.id) : [user.id];
      const rows = await api.stories.list(ids);
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (user?.id && Array.isArray(storiesData) && storiesData.length) {
      setCachedStories(storiesData);
      cacheStories(user.id, storiesData).catch(() => {});
    }
  }, [storiesData, user?.id]);

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
  const unreadGroups = useMemo(
    () => groups.filter((g) => (g.unread_count ?? 0) > 0),
    [groups]
  );
  const totalUnreadThreads = unreadConversations.length + unreadGroups.length;
  const visibleGroups = useMemo(() => {
    if (activeFilter === 'unread') return groups.filter((g) => (g.unread_count ?? 0) > 0);
    return groups;
  }, [groups, activeFilter]);

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
      if (!group?.id) {
        toast.error('Réponse serveur invalide. Réessayez.');
        return;
      }
      setCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedMemberIds([]);
      queryClient.invalidateQueries({ queryKey: ['messages-groups', user?.id] });
      toast.success('Groupe créé');
      navigate(`${createPageUrl('GroupChat')}?groupId=${group.id}`);
    } catch (e) {
      const msg =
        e?.response?.data?.error?.message
        || e?.response?.data?.message
        || e?.message
        || 'Impossible de créer le groupe.';
      toast.error(msg);
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
  // Appel des hooks terminé : on peut maintenant appliquer les retours conditionnels
  if (isLoadingAuth) {
    return (
      <div className={`min-h-screen text-white ${INBOX_PAGE_BG}`}>
        <InboxLoadingSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`min-h-screen pb-[calc(120px+env(safe-area-inset-bottom))] text-white ${INBOX_PAGE_BG}`}>
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070a12]/90 backdrop-blur-2xl">
        <div className="mx-auto max-w-3xl px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className={INBOX_ICON_BUTTON} aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/38">Messagerie</p>
              <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-white sm:text-[24px]">Messages</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link to={createPageUrl('MessagingCdcHub')}>
              <Button variant="ghost" size="icon" className={INBOX_ICON_BUTTON} aria-label="Hub messagerie CDC">
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </Link>
            <Link to={createPageUrl('Search') + '?from=inbox&mode=messages'}>
              <Button variant="ghost" size="icon" className={INBOX_ICON_BUTTON} aria-label="Nouvelle conversation">
                <Edit className="w-5 h-5" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={INBOX_ICON_BUTTON} aria-label="Plus d’options">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-[120] min-w-[220px] border border-white/12 bg-[#0d1118] p-1 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)]"
              >
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/[0.08] focus:text-white"
                  onClick={handleExportAllConversations}
                  disabled={exportAllBusy || exportGroupsBundleBusy || !user?.id}
                >
                  <Download className="mr-2 h-4 w-4 text-white/72" />
                  Enregistrer mes discussions privées
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/[0.08] focus:text-white"
                  onClick={handleExportAllGroupThreads}
                  disabled={exportGroupsBundleBusy || exportAllBusy || !user?.id}
                >
                  <Users className="mr-2 h-4 w-4 text-white/72" />
                  Enregistrer mes groupes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4">
          <div className={cn(INBOX_SECTION, INBOX_SECTION_PAD, 'relative mb-3')}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white">Retrouvez une conversation</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/42">
                  Conversations directes, groupes et contacts — interface unifiée.
                </p>
              </div>
              <div className="shrink-0 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white/72">
                {conversations.length} fils
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Rechercher une conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-[22px] border-0 bg-white/[0.06] pl-11 text-[15px] leading-snug text-white shadow-inner shadow-black/15 ring-1 ring-white/[0.08] placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-white/25"
              />
            </div>
          </div>

          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-2 pt-0.5 no-scrollbar overscroll-x-contain">
            <button
              type="button"
              className={inboxFilterChipClass(activeFilter === 'all')}
              onClick={() => setActiveFilter('all')}
            >
              <Filter className="h-4 w-4 shrink-0 opacity-80" />
              Tous
            </button>
            <button
              type="button"
              className={inboxFilterChipClass(activeFilter === 'unread')}
              onClick={() => setActiveFilter('unread')}
            >
              Non lus ({totalUnreadThreads})
            </button>
            <button
              type="button"
              className={inboxFilterChipClass(showArchived)}
              onClick={() => setShowArchived((prev) => !prev)}
            >
              <Archive className="h-4 w-4 shrink-0 opacity-80" />
              Archivées
            </button>
          </div>
        </div>
        </div>
      </div>

      <div className="mx-auto mt-3 max-w-3xl space-y-3 px-3">
        {Array.isArray(storiesData) && storiesData.length > 0 && (
          <div className={cn(INBOX_SECTION, INBOX_SECTION_PAD)}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-white">Statuts</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/42">Stories récentes de vos contacts.</p>
              </div>
              <Button
                variant="ghost"
                className="rounded-full bg-white/[0.06] px-3 text-white/80 hover:bg-white/[0.1] hover:text-white"
                onClick={() => navigate(createPageUrl('Stories'))}
              >
                Ouvrir
              </Button>
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 no-scrollbar">
              {storiesData.slice(0, 12).map((story) => {
                const author = story?.user || {};
                const label = author.full_name || author.username || 'Story';
                return (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => navigate(createPageUrl('Stories'))}
                    className="flex w-[72px] shrink-0 flex-col items-center gap-2 touch-manipulation active:opacity-90"
                  >
                    <Avatar className="h-[54px] w-[54px] ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-[#070a12]">
                      <AvatarImage src={author.profile_image || story.media_url} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500/80 to-cyan-500/70 text-white">
                        {label?.[0]?.toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="w-full truncate text-center text-[11px] font-medium leading-snug text-white/60">
                      {label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Groupes (CDC) */}
        {(groups.length > 0 || user?.id) && (
          <div className={cn(INBOX_SECTION, 'p-2 sm:p-3')}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-2 sm:px-2">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <Users className="h-5 w-5 text-white/50" strokeWidth={1.75} /> Groupes
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] rounded-full border-0 bg-white px-4 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-white/20 hover:bg-white/92 hover:text-slate-950"
                onClick={() => setCreateGroupOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" /> Créer un groupe
              </Button>
            </div>
            {visibleGroups.length > 0 && (
              <div className="space-y-1">
                {visibleGroups.map((g) => {
                  const gUnread = g.unread_count ?? 0;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => navigate(createPageUrl('GroupChat') + `?groupId=${g.id}`)}
                      className="flex w-full min-h-[56px] items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-white/[0.05] active:bg-white/[0.07] touch-manipulation"
                    >
                      <Avatar className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-white/10">
                        <AvatarImage src={g.avatar_url} />
                        <AvatarFallback className="bg-white/15 text-white rounded-xl">
                          {(g.name || 'G').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-white">
                          <span className="min-w-0 truncate">{g.name}</span>
                          {g.notifications_muted ? (
                            <BellOff
                              className="h-3.5 w-3.5 shrink-0 text-white/40"
                              aria-label="Notifications désactivées pour ce groupe"
                            />
                          ) : null}
                        </p>
                        <p className={`truncate text-sm ${gUnread > 0 ? 'font-medium text-white/80' : 'text-white/60'}`}>
                          {g.last_message_text || `${g.members_count ?? g.members?.length ?? 0} membre(s)`}
                        </p>
                      </div>
                      {gUnread > 0 && (
                        <span className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                          {gUnread > 99 ? '99+' : gUnread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {groups.length === 0 && (
              <p className="px-2 pb-2 text-sm text-white/55">Aucun groupe. Créez-en un avec « Créer un groupe ».</p>
            )}
            {groups.length > 0 && visibleGroups.length === 0 && activeFilter === 'unread' && (
              <p className="px-2 pb-2 text-sm text-white/55">Aucun groupe non lu.</p>
            )}
          </div>
        )}

        <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
          <DialogContent className="max-w-md border-0 bg-[#0d1118] text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-white">Créer un groupe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Nom du groupe"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="rounded-xl border-0 bg-white/[0.06] text-white ring-1 ring-white/[0.1] placeholder:text-white/45"
              />
              <p className="text-sm text-white/70">Ajoutez des membres (vos abonnements et suggestions)</p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-white/[0.04] p-2 ring-1 ring-white/[0.08]">
                {friendsForChat.slice(0, 20).map((u) => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(u.id)}
                      onChange={() => toggleMemberForGroup(u.id)}
                      className="rounded accent-[#ff2f6d]"
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.profile_image} />
                      <AvatarFallback className="bg-white/15 text-white text-sm">
                        {(u.full_name || u.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-white truncate">{u.full_name || u.username || 'Utilisateur'}</span>
                  </label>
                ))}
                {friendsForChat.length === 0 && (
                  <p className="text-sm text-white/55 py-2">Suivez des utilisateurs pour les ajouter à un groupe.</p>
                )}
              </div>
              <Button
                className="w-full rounded-xl bg-white text-slate-950 hover:bg-white/92"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMemberIds.length === 0 || creatingGroup}
              >
                {creatingGroup ? 'Création...' : 'Créer le groupe'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className={cn(INBOX_SECTION, 'p-2 sm:p-3')}>
          <div className="flex items-center gap-2 px-1 py-1 sm:px-2">
            <Users className="h-4 w-4 text-white/48" strokeWidth={1.75} />
            <p className="text-[15px] font-semibold text-white">Mes ami(e)s pour discuter</p>
          </div>
          {friendsForChat.length > 0 ? (
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 py-2 no-scrollbar">
              {friendsForChat.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => navigate(buildChatPath({ userId: friend.id, source: 'inbox-friends' }))}
                  className="flex w-[72px] shrink-0 flex-col items-center gap-2 touch-manipulation active:opacity-90"
                >
                  <Avatar className="h-[52px] w-[52px] ring-1 ring-white/12">
                    <AvatarImage src={friend.profile_image} />
                    <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white">
                      {(friend.full_name || friend.username || 'U')?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="w-full truncate text-center text-[11px] font-medium leading-snug text-white/60">
                    {(friend.full_name || friend.username || 'Ami').split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/55 px-2 py-2">Aucun ami pour le moment.</p>
          )}
        </div>

        <div className={cn(INBOX_SECTION, 'p-2 sm:p-3')}>
          <div className="flex items-center justify-between gap-2 px-1 py-1 sm:px-2">
            <p className="text-[15px] font-semibold text-white">Comptes suggérés</p>
            <button
              type="button"
              className="min-h-[40px] shrink-0 rounded-full px-3 text-xs font-semibold text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white touch-manipulation"
              onClick={() => setShowAllSuggested((prev) => !prev)}
            >
              {showAllSuggested ? 'Voir moins' : 'Tout voir'}
            </button>
          </div>
          <div className="space-y-1">
            {visibleSuggestions.map((candidate) => (
              <div
                key={candidate.id}
                className="flex min-h-[56px] items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/[0.04]"
              >
                <Avatar className="h-11 w-11 shrink-0 ring-1 ring-white/10">
                  <AvatarImage src={candidate.profile_image} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {(candidate.full_name || candidate.username || 'U')?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{candidate.full_name || candidate.username || 'Utilisateur'}</p>
                  <p className="text-xs text-white/60 truncate">@{candidate.username || candidate.email?.split('@')[0] || 'afriwonder'}</p>
                </div>
                <Button
                  size="sm"
                  className="min-h-[40px] shrink-0 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 hover:bg-white/92"
                  disabled={toggleWonderMutation.isPending}
                  onClick={() => toggleWonderMutation.mutate(candidate)}
                >
                  {(followStateMap[candidate.id] ?? userFollows.some((u) => u.id === candidate.id)) ? 'Dans son Wonder' : 'Wonder'}
                </Button>
              </div>
            ))}
            {visibleSuggestions.length === 0 && (
              <p className="text-sm text-white/55 px-2 py-2">Pas de suggestion pour le moment.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-3xl px-2">
        {isError ? (
          <div className={cn(INBOX_SECTION, 'flex flex-col items-center justify-center px-4 py-24 text-center')}>
            <p className="mb-3 font-medium text-white">Une erreur s&apos;est produite.</p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="rounded-full border-0 bg-white/[0.08] text-white ring-1 ring-white/[0.12] hover:bg-white/[0.12]"
            >
              Réessayer
            </Button>
          </div>
        ) : isLoading ? (
          <InboxLoadingSkeleton />
        ) : filteredConversations.length === 0 ? (
          <div className={cn(INBOX_SECTION, 'flex flex-col items-center justify-center px-6 py-20 text-center')}>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.06]">
              <MessageCircle className="h-10 w-10 text-white/45" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Pas encore de messages</h3>
            <p className="mb-6 max-w-[280px] text-sm leading-relaxed text-white/45">
              Échangez avec les créateurs et vendeurs de la communauté AfriWonder.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => navigate(createPageUrl('Discover'))}
                variant="outline"
                className="rounded-full border-0 bg-white/[0.08] text-white ring-1 ring-white/[0.12] hover:bg-white/[0.12]"
              >
                Découvrir des créateurs
              </Button>
              <Button onClick={() => navigate(createPageUrl('Marketplace'))} className="rounded-full bg-white text-slate-950 hover:bg-white/92">
                Explorer le marketplace
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(INBOX_SECTION, 'p-2 sm:p-3')}>
            <div className="flex items-center justify-between px-2 pb-2 pt-1 sm:px-3">
              <div>
                <p className="text-[15px] font-semibold text-white">Conversations</p>
                <p className="mt-0.5 text-[13px] text-white/42">
                  {showArchived ? 'Archives visibles' : `${filteredConversations.length} conversation${filteredConversations.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            {filteredConversations.map((conv, index) => {
            const other = conv.other || {};
            const otherName = other.full_name || other.username || 'Utilisateur';
            const otherAvatar = other.profile_image;
            const otherUserId = other.id;
            const unreadCount = conv.unread_count ?? 0;
            const isMuted = !!conv.muted;
            const isMuting = mutingConversationId === conv.id;
            const isArchived = !!(conv.is_archived ?? conv.archived);
            const rawDraft = typeof conv.draft_content === 'string' ? conv.draft_content.trim() : '';
            const draftStripped = rawDraft ? stripChatMarkupForPreview(rawDraft) : '';
            const draftPreview =
              draftStripped.length > 80 ? `${draftStripped.slice(0, 80)}…` : draftStripped;

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="mx-0.5 my-0.5 flex min-h-[72px] items-center gap-1 rounded-2xl px-2 py-2 transition-colors hover:bg-white/[0.04] active:bg-white/[0.08] sm:mx-1 sm:gap-2 sm:px-3 sm:py-3 touch-manipulation"
              >
                <Link to={buildChatPath({ userId: otherUserId, conversationId: conv.id, source: 'inbox-list' })} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="h-14 w-14 shrink-0 ring-1 ring-white/10">
                    <AvatarImage src={otherAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white font-semibold">
                      {otherName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`font-semibold truncate ${unreadCount > 0 ? 'text-white' : 'text-white/90'}`}>
                        {otherName}
                      </p>
                      <span className={`text-xs flex-shrink-0 ${unreadCount > 0 ? 'text-emerald-300' : 'text-white/45'}`}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-white/85 font-medium' : 'text-white/60'}`}>
                        {draftPreview ? (
                          <>
                            <span className="font-semibold text-amber-300/90">Brouillon · </span>
                            <span className="italic text-white/70">{draftPreview}</span>
                          </>
                        ) : (
                          conv.last_message_text || 'Aucun message'
                        )}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                      {isMuted ? <BellOff className="h-3.5 w-3.5 text-white/35" /> : null}
                      {unreadCount > 0 && (
                        <span className="bg-[#ff2f6d] text-white text-xs font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center flex-shrink-0">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      </div>
                    </div>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full bg-white/[0.06] text-white/70 ring-1 ring-white/[0.08] hover:bg-white/[0.10]"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="w-4 h-4 text-white/60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-0 bg-[#12151e] text-white ring-1 ring-white/[0.1]">
                    <DropdownMenuItem
                      className="focus:bg-white/10 focus:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        setMutingConversationId(conv.id);
                        muteConversationMutation.mutate({ conversationId: conv.id, muted: !isMuted });
                      }}
                      disabled={isMuting}
                    >
                      {isMuted ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
                      {isMuted ? 'Activer notifications' : 'Couper notifications'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-white/10 focus:text-white"
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
          })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
