/**
 * Chat de groupe — réactions, détail, documents, photos/vidéos, vocaux + transcription (Whisper si serveur configuré).
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import {
  assertChatMediaFile,
  assertChatDocumentFile,
  isPayloadTooLargeError,
} from '@/lib/chatUploadLimits';
import { compressImageFileForChat } from '@/lib/chatImageCompress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Send,
  Users,
  Loader2,
  SmilePlus,
  Paperclip,
  FileText,
  Reply,
  X,
  Pin,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  ImagePlus,
  MoreVertical,
  Copy,
  Pencil,
  Info,
  LogOut,
  UserPlus,
  UserMinus,
  Share2,
  Crown,
  ShieldOff,
  Link2,
  Tag,
  BarChart2,
  CalendarDays,
  Phone,
  Video,
  Download,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BottomNav from '../components/navigation/BottomNav';
import { useAuth } from '@/lib/AuthContext';
import { cn, isDeletedUser } from '@/lib/utils';
import { ChatVoiceMessage } from '@/components/chat/ChatVoiceMessage';
import { ChatFormattedText } from '@/components/chat/ChatFormattedText';
import { useGroupMessageSocket } from '@/hooks/useGroupMessageSocket';
import { extensionForVoiceBlob, formatRecordingClock, pickAudioRecorderMimeType } from '@/lib/voiceMessageRecorder';
import {
  ensureE2eeBootstrap,
  buildGroupE2eeEnvelopes,
  syncAndDecryptGroupEnvelopes,
  getCurrentE2eeDeviceId,
  getLocalE2eeDeviceHealth,
  repairLocalE2eeDevice,
  E2EE_STRICT_MODE,
} from '@/lib/e2eeClient';
import { downloadPlainTextFile, formatGroupExportToPlainText } from '@/lib/messagingExportPlainText';

const PAGE_BG = 'bg-[#070a12]';
const COMPOSER_STYLE = {
  bottom: 0,
  paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 88px))',
  paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
};

const GROUP_QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const VOICE_LABELS = {
  playPreview: 'Lecture',
  pausePreview: 'Pause',
  voiceMessage: 'Message vocal',
  read: 'Lu',
  delivered: 'Reçu',
  sending: 'Envoi…',
  sendFailed: 'Échec de l’envoi',
  messageStatusSent: 'Envoyé au serveur',
  messageStatusDelivered: 'Délivré sur l’appareil du destinataire',
  discardVoice: 'Annuler le vocal',
  stopRecording: 'Arrêter l’enregistrement',
  sendVoice: 'Envoyer le vocal',
  recording: 'Enregistrement…',
  voiceTooShort: 'Enregistrement trop court.',
  voiceEmptyError: 'Aucun son enregistré — vérifiez le micro.',
  voiceUnsupported: 'Vocal indisponible sur ce navigateur.',
  voiceStartError: 'Impossible de démarrer le micro',
  voiceStopError: "Impossible d'envoyer le vocal",
  recordVoice: 'Enregistrer un message vocal',
};

const TYPING_DEBOUNCE_MS = 400;

function toDatetimeLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

const GROUP_UI = {
  replyInThread: 'En réponse à',
  replyToSelf: 'En réponse à vous',
  replyingTo: 'Réponse à',
  cancelReply: 'Annuler la réponse',
  replyToMessage: 'Répondre',
  deletedMessage: 'Message supprimé',
  copyMessage: 'Copier',
  editMessage: 'Modifier',
  messageEditedTag: 'modifié',
  editMessageTitle: 'Modifier le message',
  editMessagePlaceholder: 'Votre message…',
  editMessageSave: 'Enregistrer',
  editMessageSuccess: 'Message modifié',
  editMessageError: 'Impossible de modifier le message.',
  deleteMessage: 'Supprimer',
  deleteConfirmTitle: 'Supprimer pour tout le monde ?',
  deleteConfirmBody:
    'Ce message sera retiré du fil pour tous les membres du groupe. Les autres verront « Message supprimé ». Cette action est définitive.',
  deleteConfirmAdminNote:
    'Vous supprimez le message d’un autre membre en tant qu’administrateur du groupe.',
  deleteConfirmAction: 'Supprimer',
  deleteConfirmCancel: 'Annuler',
  copiedToast: 'Copié dans le presse-papiers',
  noTextToCopy: 'Rien à copier pour ce message.',
  moreActions: 'Plus d’actions',
  exportGroupChat: 'Enregistrer cette discussion',
  exportGroupSuccess: 'Fichier enregistré — ouvrez votre dossier Téléchargements',
  exportGroupError: 'Enregistrement impossible pour le moment',
  typingSuffix: 'est en train d’écrire…',
  pinnedMessage: 'Message épinglé',
  pinMessage: 'Épingler',
  unpinMessage: 'Désépingler',
  pinnedToast: 'Message épinglé',
  unpinnedToast: 'Message désépinglé',
  recordingSuffix: 'enregistre un message vocal…',
  attachPhotoVideo: 'Envoyer une photo ou une vidéo',
  invalidMedia: 'Choisissez une image ou une vidéo.',
  mediaSendError: 'Envoi photo ou vidéo impossible.',
  uploadPayloadTooLarge: 'Fichier trop volumineux pour le serveur.',
  fileTooLargeMedia: (maxMb) =>
    `Fichier trop volumineux. Maximum ${maxMb} Mo pour les photos, vidéos et messages vocaux.`,
  fileTooLargeDocument: (maxMb) => `Document trop volumineux. Maximum ${maxMb} Mo.`,
  loadOlderMessages: 'Chargement des messages précédents…',
  conversationStart: 'Début de la conversation',
  groupInfoTitle: 'Infos du groupe',
  groupNotificationsLabel: 'Notifications',
  groupNotificationsHint: 'Désactivez pour ne plus recevoir d’alertes pour ce groupe.',
  groupNotificationsError: 'Impossible de mettre à jour les notifications.',
  groupMembers: 'Membres',
  groupMemberAdmin: 'Admin',
  groupMemberMember: 'Membre',
  groupCreatedBy: 'Créé par',
  leaveGroup: 'Quitter le groupe',
  leaveGroupConfirmTitle: 'Quitter ce groupe ?',
  leaveGroupConfirmBody:
    'Vous ne recevrez plus les messages de ce groupe. Si vous êtes le dernier membre, le groupe sera supprimé.',
  leaveGroupConfirmAction: 'Quitter',
  leaveGroupSuccess: 'Vous avez quitté le groupe',
  leaveGroupError: 'Impossible de quitter le groupe.',
  addMembersSection: 'Inviter des membres',
  addMembersPlaceholder: 'Rechercher par nom ou pseudo…',
  addMembersHint: 'Tapez au moins 2 caractères.',
  addMembersButton: 'Ajouter',
  addMembersSuccess: 'Membre ajouté au groupe',
  addMembersPlural: 'Membres ajoutés au groupe',
  addMembersNone: 'Déjà dans le groupe ou aucun ajout.',
  addMembersError: 'Impossible d’ajouter ce membre.',
  addMembersNoResults: 'Aucun utilisateur trouvé.',
  removeMember: 'Retirer',
  removeMemberConfirmTitle: 'Retirer du groupe ?',
  removeMemberConfirmBody: 'ne pourra plus voir ni envoyer de messages dans ce groupe.',
  removeMemberSuccess: 'Membre retiré',
  removeMemberError: 'Impossible de retirer ce membre.',
  groupEditSection: 'Paramètres (admin)',
  groupNamePlaceholder: 'Nom du groupe',
  groupSaveName: 'Enregistrer le nom',
  groupDescriptionLabel: 'Description du groupe',
  groupDescriptionPlaceholder: 'Règles, lien utile, consignes… (visible par tous les membres)',
  groupDescriptionHint: 'Jusqu’à 500 caractères. Laissez vide pour supprimer.',
  groupSaveDescription: 'Enregistrer la description',
  groupChangePhoto: 'Changer la photo du groupe',
  jumpToPinnedMessage: 'Voir le message épinglé',
  groupUpdated: 'Groupe mis à jour',
  groupUpdateError: 'Mise à jour impossible.',
  invalidGroupPhoto: 'Choisissez une image.',
  goToQuotedMessage: 'Voir le message cité',
  replyParentNotLoaded: 'Impossible d’afficher ce message (trop ancien ou supprimé).',
  replyLoadingOlder: 'Chargement des messages précédents…',
  forwardMessage: 'Transférer',
  forwardDialogTitle: 'Transférer vers un groupe',
  forwardDialogHint: 'Le message sera renvoyé tel quel dans le groupe choisi (sans citation).',
  forwardSuccess: 'Message transféré',
  forwardError: 'Transfert impossible.',
  forwardNoOtherGroups: 'Vous n’avez pas d’autre groupe.',
  promoteAdmin: 'Rendre administrateur',
  demoteAdmin: 'Retirer le statut administrateur',
  roleUpdateSuccess: 'Rôle mis à jour',
  roleUpdateError: 'Impossible de modifier le rôle.',
  mentionMembersTitle: 'Mentionner',
  mentionNoMatch: 'Aucun membre correspondant',
  inviteLinkSection: 'Lien d\'invitation',
  inviteLinkGenerate: 'Générer un lien',
  inviteLinkRevoke: 'Révoquer le lien',
  inviteLinkCopied: 'Lien copié dans le presse-papiers',
  inviteLinkCopy: 'Copier le lien',
  groupDisplayTagSection: 'Votre libellé dans ce groupe',
  groupDisplayTagPlaceholder: 'Ex. Parent, Admin bénévole…',
  groupDisplayTagHint: 'Visible uniquement dans ce groupe, à côté de votre nom (40 caractères max).',
  groupDisplayTagSave: 'Enregistrer',
  groupDisplayTagSaved: 'Libellé enregistré',
  groupDisplayTagError: 'Impossible d’enregistrer le libellé.',
  createPoll: 'Sondage',
  pollDialogTitle: 'Nouveau sondage',
  pollQuestionPlaceholder: 'Votre question…',
  pollOptionPlaceholder: (n) => `Option ${n}`,
  pollAddOption: 'Ajouter une option',
  pollRemoveLastOption: 'Retirer la dernière option',
  pollPublish: 'Publier',
  pollValidationError: 'Question et au moins 2 options non vides requises.',
  pollVotes: (n) => `${n} vote${n > 1 ? 's' : ''}`,
  pollVoteError: 'Vote impossible.',
  shareEvent: 'Événement',
  eventShareSheetTitle: 'Partager un événement',
  eventShareSearchPlaceholder: 'Rechercher un événement…',
  eventShareEmpty: 'Aucun événement à afficher.',
  eventShareMyTickets: 'Mes billets',
  eventShareDiscover: 'Événements publics',
  eventShareError: 'Impossible de charger les événements.',
  eventOpenDetails: 'Voir l’événement',
  groupCallAudio: 'Appel audio (groupe)',
  groupCallVideo: 'Appel vidéo (groupe)',
  groupCallStartError: 'Impossible de démarrer l’appel.',
  scheduleSend: 'Programmer l’envoi',
  scheduleMustBeFuture: 'Choisissez une date et une heure dans le futur.',
  scheduledMessageShort: 'Envoi programmé',
  scheduledToast: 'Message programmé',
  cancelScheduledToast: 'Envoi programmé annulé',
  cancelScheduledTitle: 'Annuler l’envoi programmé ?',
  cancelScheduledBody: 'Ce message ne sera pas envoyé au groupe.',
  deleteScheduledMenu: 'Annuler l’envoi programmé',
};

function groupReplyThreadLabel(rt, currentUserId) {
  if (!rt) return '';
  const parentFromMe = String(rt.sender_id) === String(currentUserId);
  if (parentFromMe) return GROUP_UI.replyToSelf;
  const n = rt.sender?.full_name || rt.sender?.username || '';
  return `${GROUP_UI.replyInThread} ${n || '…'}`.trim();
}

function groupReplySnippet(rt) {
  if (!rt) return '';
  if (rt.is_deleted) return GROUP_UI.deletedMessage;
  const t = String(rt.type || 'text').toLowerCase();
  if (t === 'image') return 'Photo';
  if (t === 'video') return 'Vidéo';
  if (t === 'voice' || t === 'audio') return VOICE_LABELS.voiceMessage;
  if (t === 'file') return rt.content?.trim() || 'Document';
  if (t === 'poll') {
    const q = typeof rt.content === 'string' && rt.content.trim() ? rt.content.trim().slice(0, 120) : 'Sondage';
    return `📊 ${q}`;
  }
  if (t === 'event') {
    const title =
      (rt.event_ref && typeof rt.event_ref.title === 'string' && rt.event_ref.title.trim()) ||
      (typeof rt.content === 'string' && rt.content.trim()) ||
      'Événement';
    return `📅 ${title.slice(0, 120)}`;
  }
  const c = rt.content;
  return typeof c === 'string' && c.trim() ? c.trim().slice(0, 180) : '…';
}

function canCopyGroupMessageText(m) {
  if (!m || m.is_deleted) return false;
  const t = String(m.type || 'text').toLowerCase();
  if (['image', 'video', 'voice', 'audio'].includes(t)) return false;
  const c = m.content;
  return typeof c === 'string' && c.trim().length > 0;
}

function canForwardGroupMessage(m) {
  if (!m || m.is_deleted || m.status === 'scheduled') return false;
  const t = String(m.type || 'text').toLowerCase();
  if (t === 'poll') {
    const opts = m.poll_options;
    return Array.isArray(opts) && opts.map((x) => String(x).trim()).filter(Boolean).length >= 2;
  }
  if (t === 'event') return !!(m.event_id || m.event_ref?.id);
  if (['image', 'video', 'voice', 'audio', 'file'].includes(t)) return !!m.media_url;
  return typeof m.content === 'string' && m.content.trim().length > 0;
}

function canEditGroupMessage(m, currentUserId) {
  if (!m || m.is_deleted || !currentUserId) return false;
  if (m.status === 'scheduled') return false;
  if (String(m.sender_id) !== String(currentUserId)) return false;
  if (String(m.type || 'text').toLowerCase() !== 'text') return false;
  const elapsed = Date.now() - new Date(m.created_at).getTime();
  return elapsed <= 15 * 60 * 1000;
}

export default function GroupChat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const groupId = searchParams.get('groupId');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const quoteHighlightTimeoutRef = useRef(null);
  const quoteNavigateBusyRef = useRef(false);
  const documentInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const groupAvatarInputRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const messageComposerInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const latestVoicePreviewUrlRef = useRef(null);
  const previewAudioRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionRows, setPollOptionRows] = useState(() => ['', '']);
  const [eventShareOpen, setEventShareOpen] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventSearchDebounced, setEventSearchDebounced] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setEventSearchDebounced(eventSearchQuery.trim()), 320);
    return () => window.clearTimeout(id);
  }, [eventSearchQuery]);

  const [reactionsDialogOpen, setReactionsDialogOpen] = useState(false);
  const [reactionsDialogMessageId, setReactionsDialogMessageId] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false);
  const [leaveGroupConfirmOpen, setLeaveGroupConfirmOpen] = useState(false);
  const [addMemberSearchInput, setAddMemberSearchInput] = useState('');
  const [addMemberSearchDebounced, setAddMemberSearchDebounced] = useState('');
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [myGroupTagDraft, setMyGroupTagDraft] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardSource, setForwardSource] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [decryptedContentByGroupMessageId, setDecryptedContentByGroupMessageId] = useState({});
  const [e2eeHealth, setE2eeHealth] = useState(null);
  const [e2eeRepairing, setE2eeRepairing] = useState(false);
  const groupE2eeSyncCursorRef = useRef(null);
  const runGroupE2eeSyncRef = useRef(async () => {});

  useEffect(() => {
    if (!currentUser?.id) return;
    ensureE2eeBootstrap(currentUser.id).catch(() => {});
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !groupId) return undefined;
    let disposed = false;
    let timer = null;
    const check = async () => {
      try {
        const health = await getLocalE2eeDeviceHealth(currentUser.id);
        if (!disposed) setE2eeHealth(health);
      } catch {
        if (!disposed) setE2eeHealth((prev) => prev);
      }
      if (!disposed) timer = window.setTimeout(check, 45_000);
    };
    check();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentUser?.id, groupId]);

  const handleE2eeRepair = useCallback(async () => {
    if (!currentUser?.id || e2eeRepairing) return;
    setE2eeRepairing(true);
    try {
      const nextHealth = await repairLocalE2eeDevice(currentUser.id);
      setE2eeHealth(nextHealth);
      if (nextHealth?.healthy) {
        toast.success('Chiffrement du groupe réparé');
      } else {
        toast.warning('Clés E2EE encore faibles, nouvelle tentative bientôt');
      }
      runGroupE2eeSyncRef.current?.();
    } catch {
      toast.error('Impossible de réparer le chiffrement du groupe');
    } finally {
      setE2eeRepairing(false);
    }
  }, [currentUser?.id, e2eeRepairing]);
  const e2eeStatusText = !e2eeHealth
    ? 'Vérification de la protection des messages…'
    : 'Protection des messages à rétablir';

  useEffect(() => {
    if (!currentUser?.id || !groupId) return undefined;
    let disposed = false;
    let timer = null;
    let idleBackoffMs = 900;
    const run = async () => {
      try {
        const result = await syncAndDecryptGroupEnvelopes({
          currentUserId: currentUser.id,
          deviceId: getCurrentE2eeDeviceId(),
          groupId,
          since: groupE2eeSyncCursorRef.current,
          limit: 200,
        });
        if (disposed) return;
        if (result?.nextSince) groupE2eeSyncCursorRef.current = result.nextSince;
        if (result?.byGroupMessageId && Object.keys(result.byGroupMessageId).length) {
          setDecryptedContentByGroupMessageId((prev) => ({ ...prev, ...result.byGroupMessageId }));
          idleBackoffMs = 900;
        }
      } catch {
        // ignore sync errors
      }
      if (disposed) return;
      const isHidden = typeof document !== 'undefined' && document.hidden === true;
      const nextDelay = isHidden ? Math.min(8000, Math.max(2500, idleBackoffMs * 1.6)) : idleBackoffMs;
      idleBackoffMs = Math.min(8000, Math.round(nextDelay));
      timer = window.setTimeout(run, nextDelay);
    };
    runGroupE2eeSyncRef.current = run;
    run();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentUser?.id, groupId]);

  useEffect(() => {
    setDecryptedContentByGroupMessageId({});
    groupE2eeSyncCursorRef.current = null;
  }, [groupId]);

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.messages.getGroup(groupId),
    enabled: !!groupId,
  });

  const {
    data: messagesInfiniteData,
    isPending: messagesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['group-messages', groupId],
    queryFn: ({ pageParam }) => api.messages.getGroupMessages(groupId, pageParam ?? null, 50),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore && lastPage?.nextCursor ? lastPage.nextCursor : undefined,
    enabled: !!groupId,
  });

  const messages = useMemo(
    () => messagesInfiniteData?.pages.flatMap((p) => p?.messages ?? []) ?? [],
    [messagesInfiniteData]
  );

  useEffect(() => {
    runGroupE2eeSyncRef.current?.();
  }, [messages.length]);

  const isGroupAdmin = useMemo(() => {
    if (!currentUser?.id || !group?.members?.length) return false;
    const me = group.members.find((mem) => String(mem.id) === String(currentUser.id));
    return me?.role === 'admin';
  }, [currentUser?.id, group?.members]);

  const memberIdsSet = useMemo(
    () => new Set((group?.members ?? []).map((m) => String(m.id))),
    [group?.members]
  );

  const mentionCandidates = useMemo(() => {
    const list = group?.members ?? [];
    const q = (mentionQuery || '').toLowerCase().trim();
    return list
      .filter((mem) => mem?.id && String(mem.id) !== String(currentUser?.id))
      .filter((mem) => {
        const un = (mem.username || '').toLowerCase();
        const fn = (mem.full_name || '').toLowerCase();
        if (!q) return !!(mem.username || '').trim();
        return un.startsWith(q) || fn.includes(q) || un.includes(q);
      })
      .slice(0, 8);
  }, [group?.members, mentionQuery, currentUser?.id]);

  const insertMentionUsername = useCallback((username) => {
    const un = String(username || '').trim();
    if (!un) return;
    const el = messageComposerInputRef.current;
    const v = input;
    const pos = el?.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    const m = before.match(/@([\w.]*)$/);
    if (!m) {
      setMentionPickerOpen(false);
      return;
    }
    const start = pos - m[0].length;
    const after = v.slice(pos);
    const next = `${v.slice(0, start)}@${un} ${after}`;
    setInput(next);
    setMentionPickerOpen(false);
    setMentionQuery('');
    window.requestAnimationFrame(() => {
      if (!el) return;
      const cursor = start + un.length + 2;
      el.focus();
      try {
        el.setSelectionRange(cursor, cursor);
      } catch {
        /* ignore */
      }
    });
  }, [input]);

  useEffect(() => {
    const t = window.setTimeout(() => setAddMemberSearchDebounced(addMemberSearchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [addMemberSearchInput]);

  useEffect(() => {
    if (!groupDetailsOpen) {
      setAddMemberSearchInput('');
      setAddMemberSearchDebounced('');
      setRemoveMemberTarget(null);
    }
  }, [groupDetailsOpen]);

  useEffect(() => {
    if (groupDetailsOpen && group?.name != null) {
      setEditGroupName(group.name);
    }
  }, [groupDetailsOpen, group?.name]);

  useEffect(() => {
    if (groupDetailsOpen && group) {
      setEditGroupDescription(group.description ?? '');
    }
  }, [groupDetailsOpen, group?.id, group?.description]);

  useEffect(() => {
    if (!groupDetailsOpen || !group?.members || !currentUser?.id) return;
    const me = group.members.find((m) => String(m.id) === String(currentUser.id));
    setMyGroupTagDraft(me?.group_tag != null ? String(me.group_tag) : '');
  }, [groupDetailsOpen, group?.members, currentUser?.id]);

  const { data: addMemberSearchRaw = [], isFetching: addMemberSearchFetching } = useQuery({
    queryKey: ['group-add-member-search', addMemberSearchDebounced],
    queryFn: () => api.users.list({ search: addMemberSearchDebounced, limit: 24 }),
    enabled: !!groupId && isGroupAdmin && groupDetailsOpen && addMemberSearchDebounced.length >= 2,
  });

  const addMemberSearchResults = useMemo(
    () =>
      (addMemberSearchRaw || []).filter(
        (u) => u?.id && !memberIdsSet.has(String(u.id)) && !isDeletedUser(u)
      ),
    [addMemberSearchRaw, memberIdsSet]
  );

  useEffect(() => {
    if (!groupId || !currentUser?.id) return undefined;
    const t = window.setTimeout(() => {
      api.messages
        .markGroupRead(groupId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['messages-groups', currentUser.id] });
          queryClient.invalidateQueries({ queryKey: ['messages-unread-count', currentUser.id] });
        })
        .catch(() => {});
    }, 350);
    return () => window.clearTimeout(t);
  }, [groupId, currentUser?.id, messages[0]?.id, queryClient]);

  useEffect(() => {
    const root = messagesScrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel || !hasNextPage || !groupId) return undefined;
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const e = entries[0];
        if (!e?.isIntersecting || isFetchingNextPage) return;
        const el = root;
        const prevHeight = el.scrollHeight;
        fetchNextPage().then(() => {
          if (cancelled) return;
          requestAnimationFrame(() => {
            if (cancelled || !el) return;
            const nextHeight = el.scrollHeight;
            el.scrollTop += nextHeight - prevHeight;
          });
        });
      },
      { root, rootMargin: '100px', threshold: 0 }
    );
    obs.observe(sentinel);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [groupId, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const {
    typingUser,
    recordingUser,
    emitGroupTypingStart,
    emitGroupTypingStop,
    emitGroupRecordingStart,
    emitGroupRecordingStop,
  } = useGroupMessageSocket({
    userId: currentUser?.id,
    userName: currentUser?.full_name || currentUser?.username,
    groupId,
    queryClient,
    enabled: !!groupId && !!currentUser?.id,
  });

  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      type,
      media_url,
      thumbnail_url,
      reply_to_id,
      poll_options,
      event_id,
      scheduled_at,
    }) => {
      let e2ee_envelopes;
      try {
        const normalizedType = String(type || 'text').toLowerCase();
        if (normalizedType === 'text' && typeof content === 'string' && content.trim() && currentUser?.id) {
          e2ee_envelopes = await buildGroupE2eeEnvelopes(group?.members || [], content, {
            senderUserId: currentUser.id,
            messageType: 'text',
          });
        }
      } catch {
        e2ee_envelopes = undefined;
      }
      return api.messages.sendGroupMessage(groupId, content ?? '', {
        type: type || 'text',
        media_url,
        thumbnail_url,
        reply_to_id,
        poll_options,
        event_id,
        scheduled_at,
        e2ee_envelopes,
      });
    },
    onSuccess: (_data, variables) => {
      emitGroupTypingStop();
      setInput('');
      setReplyTarget(null);
      setShowSchedule(false);
      setScheduledAt('');
      if (variables?.scheduled_at) {
        toast.success(GROUP_UI.scheduledToast);
        queryClient.invalidateQueries({ queryKey: ['scheduled-messages', currentUser?.id] });
      }
      setPollDialogOpen(false);
      setPollQuestion('');
      setPollOptionRows(['', '']);
      if (String(variables?.type || '').toLowerCase() === 'event') {
        setEventShareOpen(false);
        setEventSearchQuery('');
        setEventSearchDebounced('');
        queryClient.invalidateQueries({ queryKey: ['events-my-tickets', currentUser?.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.apiMessage ?? err?.message;
      toast.error(msg || "Impossible d'envoyer le message.");
    },
  });

  const { data: eventListData, isPending: eventListPending, isError: eventListError } = useQuery({
    queryKey: ['group-chat-event-share-list', eventSearchDebounced],
    queryFn: () =>
      api.events.list({
        page: 1,
        limit: 25,
        status: 'published',
        ...(eventSearchDebounced.length >= 2 ? { search: eventSearchDebounced } : {}),
      }),
    enabled: eventShareOpen,
  });

  const { data: myTicketsData, isPending: ticketsPending } = useQuery({
    queryKey: ['events-my-tickets', currentUser?.id],
    queryFn: () => api.events.getMyTickets(),
    enabled: eventShareOpen && !!currentUser?.id,
  });

  const ticketEvents = useMemo(() => {
    const rows = Array.isArray(myTicketsData) ? myTicketsData : [];
    const out = [];
    const seen = new Set();
    for (const row of rows) {
      const ev = row?.event;
      if (ev?.id && !seen.has(ev.id)) {
        seen.add(ev.id);
        out.push(ev);
      }
    }
    return out;
  }, [myTicketsData]);

  const discoverEvents = useMemo(() => {
    const raw = eventListData?.events ?? [];
    const ticketIds = new Set(ticketEvents.map((e) => e.id));
    return raw.filter((e) => e?.id && !ticketIds.has(e.id));
  }, [eventListData, ticketEvents]);

  const handleSelectSharedEventGroup = useCallback(
    (ev) => {
      if (!ev?.id) return;
      sendMutation.mutate({
        content: ev.title || '',
        type: 'event',
        event_id: ev.id,
        reply_to_id: replyTarget?.id || undefined,
      });
    },
    [sendMutation, replyTarget?.id]
  );

  useEffect(() => {
    if (eventShareOpen && eventListError) toast.error(GROUP_UI.eventShareError);
  }, [eventShareOpen, eventListError]);

  const clearVoiceDraft = useCallback(() => {
    setVoiceDraft((prev) => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      latestVoicePreviewUrlRef.current = null;
      return null;
    });
    setPreviewPlaying(false);
    const el = previewAudioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  }, []);

  useEffect(
    () => () => {
      if (latestVoicePreviewUrlRef.current) URL.revokeObjectURL(latestVoicePreviewUrlRef.current);
    },
    []
  );

  useEffect(() => {
    if (!isRecording) return undefined;
    const id = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || !groupId || !currentUser?.id) return undefined;
    emitGroupRecordingStart();
    return () => {
      emitGroupRecordingStop();
    };
  }, [isRecording, groupId, currentUser?.id, emitGroupRecordingStart, emitGroupRecordingStop]);

  const sendVoiceDraft = useCallback(async () => {
    if (!voiceDraft?.blob || !groupId) return;
    setVoiceUploading(true);
    try {
      const ext = extensionForVoiceBlob(voiceDraft.mimeType);
      const audioFile = new File([voiceDraft.blob], `voice-${Date.now()}.${ext}`, {
        type: voiceDraft.mimeType || 'audio/webm',
      });
      const voiceCheck = assertChatMediaFile(audioFile);
      if (!voiceCheck.ok) {
        toast.error(GROUP_UI.fileTooLargeMedia(voiceCheck.maxMb));
        setVoiceUploading(false);
        return;
      }
      const { file_url } = await api.upload.audio(audioFile);
      if (!file_url) {
        toast.error(VOICE_LABELS.voiceStopError);
        setVoiceUploading(false);
        return;
      }
      sendMutation.mutate(
        { content: '', type: 'voice', media_url: file_url, reply_to_id: replyTarget?.id || undefined },
        {
          onSettled: () => setVoiceUploading(false),
          onSuccess: () => {
            clearVoiceDraft();
          },
        }
      );
    } catch (err) {
      setVoiceUploading(false);
      if (isPayloadTooLargeError(err)) toast.error(GROUP_UI.uploadPayloadTooLarge);
      else toast.error(VOICE_LABELS.voiceStopError);
    }
  }, [voiceDraft, groupId, replyTarget?.id, sendMutation, clearVoiceDraft]);

  const togglePreviewPlayback = useCallback(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    if (previewPlaying) {
      el.pause();
    } else {
      el.play().catch(() => toast.error(VOICE_LABELS.voiceStopError));
    }
  }, [previewPlaying]);

  const cancelRecording = useCallback(() => {
    discardRecordingRef.current = true;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    } else {
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    if (typeof MediaRecorder === 'undefined') {
      toast.error(VOICE_LABELS.voiceUnsupported);
      return;
    }
    emitGroupTypingStop();
    try {
      clearVoiceDraft();
      discardRecordingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      recordingStreamRef.current = stream;

      const preferredMime = pickAudioRecorderMimeType();
      let recorder;
      try {
        recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        toast.error(VOICE_LABELS.voiceStartError);
        discardRecordingRef.current = true;
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {
          /* ignore */
        }
        recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
      };

      recorder.onstop = () => {
        try {
          recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
          recordingStreamRef.current = null;
          mediaRecorderRef.current = null;

          if (discardRecordingRef.current) {
            discardRecordingRef.current = false;
            return;
          }

          const mime = (recorder.mimeType && String(recorder.mimeType)) || preferredMime || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });
          if (audioBlob.size === 0) {
            toast.error(VOICE_LABELS.voiceEmptyError);
            return;
          }

          const durationSec = Math.max(0, (Date.now() - recordingStartedAtRef.current) / 1000);
          if (durationSec < 0.45 && audioBlob.size < 2000) {
            toast.info(VOICE_LABELS.voiceTooShort);
            return;
          }

          const url = URL.createObjectURL(audioBlob);
          latestVoicePreviewUrlRef.current = url;
          setVoiceDraft({
            blob: audioBlob,
            objectUrl: url,
            mimeType: audioBlob.type || mime,
            durationSec: Math.max(1, Math.round(durationSec)),
          });
        } catch {
          toast.error(VOICE_LABELS.voiceStopError);
        }
      };

      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      mediaRecorderRef.current = recorder;
      try {
        recorder.start(250);
      } catch {
        recorder.start();
      }
      setIsRecording(true);
    } catch (err) {
      const name = err?.name || '';
      const msg = String(err?.message || '');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /permission/i.test(msg)) {
        toast.info('Autorisez le micro dans votre navigateur pour envoyer des messages vocaux.', { duration: 4500 });
      } else if (name === 'NotFoundError' || /not found|no device/i.test(msg)) {
        toast.error('Aucun microphone détecté.');
      } else {
        toast.error(VOICE_LABELS.voiceStartError);
      }
    }
  };

  const documentUploadMutation = useMutation({
    mutationFn: async ({ file, reply_to_id }) => {
      const up = await api.upload.document(file);
      const url = up?.file_url;
      if (!url) throw new Error('Réponse upload invalide');
      return api.messages.sendGroupMessage(groupId, file.name, { type: 'file', media_url: url, reply_to_id });
    },
    onSuccess: () => {
      emitGroupTypingStop();
      setReplyTarget(null);
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
    },
    onError: (err) => {
      if (isPayloadTooLargeError(err)) {
        toast.error(GROUP_UI.uploadPayloadTooLarge);
        return;
      }
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message;
      toast.error(msg || 'Envoi du document impossible.');
    },
  });

  const mediaUploadMutation = useMutation({
    mutationFn: async ({ file, reply_to_id }) => {
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        const videoResult = await api.upload.video({ file });
        const url = videoResult?.file_url ?? videoResult?.url;
        if (!url) throw new Error('Réponse upload invalide');
        return api.messages.sendGroupMessage(groupId, '', { type: 'video', media_url: url, reply_to_id });
      }
      const imageFile = await compressImageFileForChat(file);
      const { file_url } = await api.upload.image(imageFile);
      if (!file_url) throw new Error('Réponse upload invalide');
      return api.messages.sendGroupMessage(groupId, '', { type: 'image', media_url: file_url, reply_to_id });
    },
    onSuccess: () => {
      emitGroupTypingStop();
      setReplyTarget(null);
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
    },
    onError: (err) => {
      if (isPayloadTooLargeError(err)) {
        toast.error(GROUP_UI.uploadPayloadTooLarge);
        return;
      }
      const msg = err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message;
      toast.error(msg || GROUP_UI.mediaSendError);
    },
  });

  const groupReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      if (emoji == null) {
        return api.messages.clearGroupReaction(groupId, messageId);
      }
      return api.messages.setGroupReaction(groupId, messageId, emoji);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      if (vars?.messageId) {
        queryClient.invalidateQueries({ queryKey: ['group-message-reactions-detail', groupId, vars.messageId] });
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.apiMessage || 'Réaction impossible.');
    },
  });

  const votePollMutation = useMutation({
    mutationFn: ({ messageId, optionIndex }) => api.messages.voteGroupPoll(groupId, messageId, optionIndex),
    onSuccess: (data) => {
      if (!data?.id || !data.poll_votes) return;
      queryClient.setQueryData(['group-messages', groupId], (old) => {
        if (!old) return old;
        const patchList = (list) =>
          list.map((msg) => (msg.id === data.id ? { ...msg, poll_votes: data.poll_votes } : msg));
        if (old.pages?.length) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: patchList(page.messages || []),
            })),
          };
        }
        if (old.messages) {
          return { ...old, messages: patchList(old.messages) };
        }
        return old;
      });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message ??
          err?.response?.data?.message ??
          err?.apiMessage ??
          GROUP_UI.pollVoteError
      );
    },
  });

  const transcribeGroupMutation = useMutation({
    mutationFn: (messageId) => api.messages.transcribeGroupVoiceMessage(groupId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.apiMessage || 'Transcription impossible.');
    },
  });

  const deleteGroupMessageMutation = useMutation({
    mutationFn: ({ messageId }) => api.messages.deleteGroupMessage(groupId, messageId),
    onSuccess: (_d, vars) => {
      if (vars?.wasScheduled) {
        toast.success(GROUP_UI.cancelScheduledToast);
        queryClient.invalidateQueries({ queryKey: ['scheduled-messages', currentUser?.id] });
      }
      setReplyTarget((rt) => (String(rt?.id) === String(vars?.messageId) ? null : rt));
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
    },
    onSettled: () => {
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.apiMessage || err?.message || 'Suppression impossible.');
    },
  });

  const editGroupMessageMutation = useMutation({
    mutationFn: ({ messageId, content }) => api.messages.editGroupMessage(groupId, messageId, content),
    onSuccess: () => {
      setEditingMessageId(null);
      setEditText('');
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      toast.success(GROUP_UI.editMessageSuccess);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? err?.apiMessage ?? err?.message ?? GROUP_UI.editMessageError);
    },
  });

  const generateInviteLinkMutation = useMutation({
    mutationFn: () => api.messages.generateGroupInviteLink(groupId),
    onSuccess: (data) => {
      if (data?.group) queryClient.setQueryData(['group', groupId], data.group);
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      const token = data?.token ?? data?.group?.invite_token;
      if (token) {
        const url = `${window.location.origin}${createPageUrl('Inbox')}?invite=${token}`;
        navigator.clipboard?.writeText(url).catch(() => {});
        toast.success(GROUP_UI.inviteLinkCopied);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? err?.apiMessage ?? err?.message ?? "Impossible de générer le lien.");
    },
  });

  const revokeInviteLinkMutation = useMutation({
    mutationFn: () => api.messages.revokeGroupInviteLink(groupId),
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(['group', groupId], data);
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      toast.success('Lien révoqué');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? err?.apiMessage ?? err?.message ?? 'Impossible de révoquer.');
    },
  });

  const handleCopyGroupMessage = useCallback((m) => {
    const text = m?.content != null ? String(m.content).trim() : '';
    if (!text) {
      toast.info(GROUP_UI.noTextToCopy);
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(GROUP_UI.copiedToast))
      .catch(() => toast.error('Copie impossible.'));
  }, []);

  const openDeleteGroupMessageConfirm = useCallback((m) => {
    if (!m?.id || m.is_deleted) return;
    setDeleteTarget(m);
  }, []);

  const confirmDeleteGroupMessage = useCallback(() => {
    if (!deleteTarget?.id || !groupId || deleteGroupMessageMutation.isPending) return;
    deleteGroupMessageMutation.mutate({
      messageId: deleteTarget.id,
      wasScheduled: deleteTarget.status === 'scheduled',
    });
  }, [deleteGroupMessageMutation, deleteTarget, groupId]);

  const leaveGroupMutation = useMutation({
    mutationFn: () => {
      if (!groupId) throw new Error('Groupe manquant');
      return api.messages.leaveGroup(groupId);
    },
    onSuccess: () => {
      toast.success(GROUP_UI.leaveGroupSuccess);
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      setGroupDetailsOpen(false);
      setLeaveGroupConfirmOpen(false);
      navigate(createPageUrl('Inbox'));
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.leaveGroupError
      );
    },
  });

  const addGroupMembersMutation = useMutation({
    mutationFn: (userIds) => api.messages.addGroupMembers(groupId, userIds),
    onSuccess: (data) => {
      if (data?.group) {
        queryClient.setQueryData(['group', groupId], data.group);
      } else {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      }
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      const n = data?.added ?? 0;
      if (n > 0) {
        toast.success(n > 1 ? GROUP_UI.addMembersPlural : GROUP_UI.addMembersSuccess);
        setAddMemberSearchInput('');
        setAddMemberSearchDebounced('');
      } else {
        toast.info(GROUP_UI.addMembersNone);
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.addMembersError
      );
    },
  });

  const removeGroupMemberMutation = useMutation({
    mutationFn: (targetUserId) => api.messages.removeGroupMember(groupId, targetUserId),
    onSuccess: (data) => {
      setRemoveMemberTarget(null);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      toast.success(GROUP_UI.removeMemberSuccess);
      if ((data?.remaining ?? 1) === 0) {
        setGroupDetailsOpen(false);
        navigate(createPageUrl('Inbox'));
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.removeMemberError
      );
    },
  });

  const setGroupMemberRoleMutation = useMutation({
    mutationFn: ({ targetUserId, role }) => api.messages.setGroupMemberRole(groupId, targetUserId, role),
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(['group', groupId], data);
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      toast.success(GROUP_UI.roleUpdateSuccess);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.roleUpdateError
      );
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: (payload) => {
      if (!groupId) throw new Error('Groupe manquant');
      return api.messages.updateGroup(groupId, payload);
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['group', groupId], data);
        if (typeof data.name === 'string') setEditGroupName(data.name);
      }
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
      toast.success(GROUP_UI.groupUpdated);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.groupUpdateError
      );
    },
  });

  const groupNotificationsMutation = useMutation({
    mutationFn: (muted) => {
      if (!groupId) throw new Error('Groupe manquant');
      return api.messages.setGroupNotificationsMuted(groupId, muted);
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(['group', groupId], data);
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.groupNotificationsError
      );
    },
  });

  const groupDisplayTagMutation = useMutation({
    mutationFn: (tag) => {
      if (!groupId) throw new Error('Groupe manquant');
      const t = String(tag ?? '').trim();
      return api.messages.setMyGroupDisplayTag(groupId, t.length ? t : null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      toast.success(GROUP_UI.groupDisplayTagSaved);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.groupDisplayTagError
      );
    },
  });

  const handleGroupAvatarChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !groupId || updateGroupMutation.isPending) return;
      if (!file.type.startsWith('image/')) {
        toast.error(GROUP_UI.invalidGroupPhoto);
        return;
      }
      try {
        const imageFile = await compressImageFileForChat(file);
        const r = await api.upload.image(imageFile);
        const url = r?.file_url ?? r?.url;
        if (!url) throw new Error('no url');
        updateGroupMutation.mutate({ avatar_url: url });
      } catch {
        toast.error(GROUP_UI.mediaSendError);
      }
    },
    [groupId, updateGroupMutation]
  );

  const startGroupCallMutation = useMutation({
    mutationFn: ({ type }) =>
      api.groupCalls.create({
        type: type === 'video' ? 'video' : 'audio',
        conversation_group_id: groupId,
      }),
    onSuccess: (data) => {
      if (!data?.id || !groupId) return;
      navigate(
        `${createPageUrl('GroupCallLobby')}?callId=${encodeURIComponent(data.id)}&groupId=${encodeURIComponent(groupId)}`
      );
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ??
          err?.response?.data?.error?.message ??
          err?.message ??
          GROUP_UI.groupCallStartError
      );
    },
  });

  const handleStartGroupCall = useCallback(
    (type) => {
      if (!groupId || startGroupCallMutation.isPending) return;
      startGroupCallMutation.mutate({ type });
    },
    [groupId, startGroupCallMutation]
  );

  const exportGroupMutation = useMutation({
    mutationFn: ({ gid }) => api.messages.exportGroupMessages(gid),
    onSuccess: (data, { gid, viewerUserId }) => {
      const txt = formatGroupExportToPlainText(data, viewerUserId);
      const slug =
        String(data?.group?.name || group?.name || 'groupe')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]+/g, '-')
          .replace(/^-|-$/g, '') || 'groupe';
      downloadPlainTextFile(
        `AfriWonder-groupe-${slug}-${String(gid).slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`,
        txt
      );
      toast.success(GROUP_UI.exportGroupSuccess);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ??
          err?.response?.data?.error?.message ??
          err?.apiMessage ??
          err?.message ??
          GROUP_UI.exportGroupError
      );
    },
  });

  const handleExportGroupChat = useCallback(() => {
    if (!groupId || exportGroupMutation.isPending || !currentUser?.id) return;
    exportGroupMutation.mutate({ gid: groupId, viewerUserId: currentUser.id });
  }, [groupId, exportGroupMutation, currentUser?.id]);

  const { data: forwardGroupsData, isLoading: forwardGroupsLoading } = useQuery({
    queryKey: ['messages-groups', currentUser?.id],
    queryFn: () => api.messages.getGroups(1, 50),
    enabled: !!currentUser?.id && forwardDialogOpen,
  });

  const forwardTargetGroups = useMemo(() => {
    const list = forwardGroupsData?.groups ?? [];
    if (!groupId) return list;
    return list.filter((g) => String(g.id) !== String(groupId));
  }, [forwardGroupsData, groupId]);

  const forwardGroupMessageMutation = useMutation({
    mutationFn: async ({ targetGroupId, source }) => {
      const t = String(source?.type || 'text').toLowerCase();
      const content = typeof source?.content === 'string' ? source.content : '';
      const mediaUrl = source?.media_url || null;
      const thumb = source?.thumbnail_url || null;
      const fwdId = source?.id ? String(source.id) : undefined;
      if (t === 'poll') {
        const opts = Array.isArray(source?.poll_options)
          ? source.poll_options.map((x) => String(x).trim()).filter(Boolean)
          : [];
        if (opts.length < 2) throw new Error('empty forward');
        return api.messages.sendGroupMessage(targetGroupId, content || '', {
          type: 'poll',
          poll_options: opts,
          forward_from_message_id: fwdId,
        });
      }
      if (t === 'event') {
        const eid = String(source?.event_id || source?.event_ref?.id || '').trim();
        if (!eid) throw new Error('empty forward');
        const title =
          (source?.event_ref && typeof source.event_ref.title === 'string' && source.event_ref.title.trim()) ||
          content ||
          '';
        return api.messages.sendGroupMessage(targetGroupId, title, {
          type: 'event',
          event_id: eid,
          forward_from_message_id: fwdId,
        });
      }
      if (!mediaUrl && !String(content).trim()) {
        throw new Error('empty forward');
      }
      return api.messages.sendGroupMessage(targetGroupId, content, {
        type: t,
        media_url: mediaUrl || undefined,
        thumbnail_url: thumb || undefined,
        forward_from_message_id: fwdId,
      });
    },
    onSuccess: () => {
      toast.success(GROUP_UI.forwardSuccess);
      setForwardSource(null);
      setForwardDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['messages-groups'] });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? GROUP_UI.forwardError
      );
    },
  });

  const scrollToQuotedMessage = useCallback(
    async (replyTo) => {
      if (!replyTo?.id || !groupId) return;
      if (quoteNavigateBusyRef.current) return;
      const id = String(replyTo.id);
      const root = messagesScrollRef.current;
      if (!root) return;

      const findEl = () => root.querySelector(`[data-afw-group-msg="${id}"]`);

      const applyHighlight = () => {
        const el = findEl();
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (quoteHighlightTimeoutRef.current) window.clearTimeout(quoteHighlightTimeoutRef.current);
        setHighlightedMessageId(id);
        quoteHighlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightedMessageId(null);
          quoteHighlightTimeoutRef.current = null;
        }, 2600);
        return true;
      };

      if (applyHighlight()) return;

      const getLastPageHasMore = () => {
        const d = queryClient.getQueryData(['group-messages', groupId]);
        const pages = d?.pages;
        if (!pages?.length) return false;
        return !!pages[pages.length - 1]?.hasMore;
      };

      quoteNavigateBusyRef.current = true;
      let loadingToastId;
      const maxLoads = 40;

      try {
        for (let i = 0; i < maxLoads; i++) {
          if (!getLastPageHasMore()) break;

          if (loadingToastId == null) loadingToastId = toast.loading(GROUP_UI.replyLoadingOlder);

          const prevHeight = root.scrollHeight;
          try {
            await fetchNextPage();
          } catch {
            break;
          }

          await new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          });

          const nextHeight = root.scrollHeight;
          root.scrollTop += nextHeight - prevHeight;

          if (applyHighlight()) {
            return;
          }
        }

        if (applyHighlight()) {
          return;
        }

        toast.info(GROUP_UI.replyParentNotLoaded);
      } finally {
        if (loadingToastId != null) toast.dismiss(loadingToastId);
        quoteNavigateBusyRef.current = false;
      }
    },
    [fetchNextPage, groupId, queryClient]
  );

  useEffect(
    () => () => {
      if (quoteHighlightTimeoutRef.current) window.clearTimeout(quoteHighlightTimeoutRef.current);
    },
    []
  );

  const { data: reactionsDetailData, isFetching: reactionsDetailLoading } = useQuery({
    queryKey: ['group-message-reactions-detail', groupId, reactionsDialogMessageId],
    queryFn: () => api.messages.getGroupMessageReactionsDetail(groupId, reactionsDialogMessageId),
    enabled: !!groupId && !!reactionsDialogMessageId && reactionsDialogOpen,
  });
  const reactionsDetailList = reactionsDetailData?.reactors ?? [];

  const openReactionsDetail = useCallback((messageId) => {
    if (!messageId) return;
    setReactionsDialogMessageId(messageId);
    setReactionsDialogOpen(true);
  }, []);

  const pickReaction = useCallback(
    (messageId, emoji, myReaction) => {
      if (!messageId || !emoji) return;
      if (myReaction === emoji) {
        groupReactionMutation.mutate({ messageId, emoji: null });
      } else {
        groupReactionMutation.mutate({ messageId, emoji });
      }
    },
    [groupReactionMutation]
  );

  const pinnedMessageId = group?.pinned_message_id ?? group?.pinned_message?.id;

  const handlePinMessage = useCallback(
    (msg) => {
      if (!msg?.id || !groupId) return;
      const currentPin = group?.pinned_message_id ?? group?.pinned_message?.id;
      const promise =
        currentPin === msg.id ? api.messages.unpinGroupMessage(groupId) : api.messages.pinGroupMessage(groupId, msg.id);
      promise
        .then(() => {
          toast.success(currentPin === msg.id ? GROUP_UI.unpinnedToast : GROUP_UI.pinnedToast);
          queryClient.invalidateQueries({ queryKey: ['group', groupId] });
        })
        .catch((err) =>
          toast.error(
            err?.response?.data?.error?.message ??
              err?.response?.data?.message ??
              err?.apiMessage ??
              err?.message ??
              'Action impossible'
          )
        );
    },
    [groupId, group?.pinned_message_id, group?.pinned_message?.id, queryClient]
  );

  const handleUnpinBanner = useCallback(() => {
    if (!groupId) return;
    api.messages
      .unpinGroupMessage(groupId)
      .then(() => {
        toast.success(GROUP_UI.unpinnedToast);
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      })
      .catch((err) =>
        toast.error(
          err?.response?.data?.error?.message ??
            err?.response?.data?.message ??
            err?.apiMessage ??
            err?.message ??
            'Action impossible'
        )
      );
  }, [groupId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[0]?.id]);

  const handleInputChange = (e) => {
    const v = e.target.value;
    setInput(v);
    const pos = typeof e.target.selectionStart === 'number' ? e.target.selectionStart : v.length;
    const before = v.slice(0, pos);
    const mentionMatch = before.match(/@([\w.]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] || '');
      setMentionPickerOpen(true);
    } else {
      setMentionPickerOpen(false);
      setMentionQuery('');
    }
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    emitGroupTypingStart();
    typingDebounceRef.current = setTimeout(() => emitGroupTypingStop(), TYPING_DEBOUNCE_MS);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setMentionPickerOpen(false);
    setMentionQuery('');
    const scheduled_at =
      showSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
    if (scheduled_at) {
      const when = new Date(scheduled_at).getTime();
      if (!Number.isFinite(when) || when <= Date.now()) {
        toast.error(GROUP_UI.scheduleMustBeFuture);
        return;
      }
    }
    sendMutation.mutate({
      content: text,
      type: 'text',
      reply_to_id: replyTarget?.id || undefined,
      scheduled_at,
    });
  };

  const handlePublishPoll = useCallback(() => {
    const q = pollQuestion.trim();
    const opts = pollOptionRows.map((x) => String(x).trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      toast.error(GROUP_UI.pollValidationError);
      return;
    }
    if (sendMutation.isPending) return;
    sendMutation.mutate({
      content: q,
      type: 'poll',
      poll_options: opts,
      reply_to_id: replyTarget?.id || undefined,
    });
  }, [pollQuestion, pollOptionRows, sendMutation, replyTarget?.id]);

  const handleDocumentChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !groupId || documentUploadMutation.isPending || mediaUploadMutation.isPending) return;
    const docCheck = assertChatDocumentFile(file);
    if (!docCheck.ok) {
      toast.error(GROUP_UI.fileTooLargeDocument(docCheck.maxMb));
      return;
    }
    documentUploadMutation.mutate({ file, reply_to_id: replyTarget?.id || undefined });
  };

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !groupId || mediaUploadMutation.isPending || documentUploadMutation.isPending) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error(GROUP_UI.invalidMedia);
      return;
    }
    const mediaCheck = assertChatMediaFile(file);
    if (!mediaCheck.ok) {
      toast.error(GROUP_UI.fileTooLargeMedia(mediaCheck.maxMb));
      return;
    }
    mediaUploadMutation.mutate({ file, reply_to_id: replyTarget?.id || undefined });
  };

  const emptyState = (title, subtitle, showBack = true) => (
    <div className={cn('relative flex min-h-[100dvh] flex-col text-white', PAGE_BG)}>
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.1),_transparent_35%),linear-gradient(180deg,_#08101f_0%,_#070d18_40%,_#050913_100%)]" />
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
          <Users className="h-8 w-8 text-white/40" strokeWidth={1.5} />
        </div>
        <p className="text-base font-semibold text-white/90">{title}</p>
        <p className="mt-2 max-w-xs text-sm text-white/45">{subtitle}</p>
        {showBack && (
          <Button
            className="mt-8 rounded-full bg-white px-6 text-slate-950 hover:bg-white/90"
            onClick={() => navigate(createPageUrl('Inbox'))}
          >
            Retour aux messages
          </Button>
        )}
      </div>
    </div>
  );

  if (!groupId) {
    return emptyState('Groupe non spécifié', 'Ouvrez une conversation de groupe depuis la messagerie.');
  }

  if (groupError || (groupLoading === false && !group)) {
    return emptyState('Groupe introuvable', "Vous n'avez peut-être plus accès à ce groupe.");
  }

  const memberCount = group?.members?.length ?? group?.members_count ?? 0;
  const groupAdminCount = (group?.members ?? []).filter((m) => m.role === 'admin').length;

  const deleteConfirmIsOthersMessage =
    !!deleteTarget &&
    currentUser?.id != null &&
    String(deleteTarget.sender_id) !== String(currentUser.id);

  return (
    <div className={cn('relative flex min-h-[100dvh] flex-col overflow-hidden text-white', PAGE_BG)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.26),_transparent_34%),linear-gradient(180deg,_#08101f_0%,_#070d18_36%,_#050913_100%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <header className="relative z-20 shrink-0 border-b border-white/[0.06] bg-[#070a12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Inbox'))}
            className="h-10 w-10 shrink-0 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.1]"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {group && (
            <>
              <Avatar className="h-11 w-11 shrink-0 rounded-2xl ring-1 ring-white/12">
                <AvatarImage src={group.avatar_url} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-semibold text-white">
                  {(group.name || 'G').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[17px] font-semibold tracking-tight text-white">{group.name}</h1>
                <p className="mt-0.5 flex min-h-[1.25rem] flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-white/48">
                  {recordingUser ? (
                    <>
                      <span className="inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" aria-hidden />
                      <span className="text-amber-200/90">
                        {recordingUser.name} {GROUP_UI.recordingSuffix}
                      </span>
                    </>
                  ) : typingUser ? (
                    <>
                      <span className="inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-sky-400" aria-hidden />
                      <span className="text-sky-300/90">
                        {typingUser.name} {GROUP_UI.typingSuffix}
                      </span>
                    </>
                  ) : (
                    <>
                      <Users className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} />
                      <span>
                        {memberCount} membre{memberCount > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </p>
                {(!e2eeHealth || !e2eeHealth.healthy) && (
                  <p className={cn('mt-0.5 truncate text-[11px]', !e2eeHealth ? 'text-white/45' : 'text-orange-200/90')}>
                    {e2eeStatusText}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleStartGroupCall('audio')}
                disabled={startGroupCallMutation.isPending}
                className="h-10 w-10 shrink-0 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.1] disabled:opacity-50"
                aria-label={GROUP_UI.groupCallAudio}
              >
                <Phone className="h-5 w-5" strokeWidth={2} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleStartGroupCall('video')}
                disabled={startGroupCallMutation.isPending}
                className="h-10 w-10 shrink-0 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.1] disabled:opacity-50"
                aria-label={GROUP_UI.groupCallVideo}
              >
                <Video className="h-5 w-5" strokeWidth={2} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.1]"
                    aria-label={GROUP_UI.moreActions}
                  >
                    <MoreVertical className="h-5 w-5" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[120] min-w-[220px] border border-white/12 bg-[#0f1724] p-1 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)]"
                >
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 focus:bg-white/10 focus:text-white"
                    onClick={handleExportGroupChat}
                    disabled={!groupId || exportGroupMutation.isPending || !currentUser?.id}
                  >
                    <Download className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                    {GROUP_UI.exportGroupChat}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setGroupDetailsOpen(true)}
                className="h-10 w-10 shrink-0 rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.1]"
                aria-label={GROUP_UI.groupInfoTitle}
              >
                <Info className="h-5 w-5" strokeWidth={2} />
              </Button>
            </>
          )}
          {groupLoading && !group && <Loader2 className="h-6 w-6 animate-spin text-white/35" />}
        </div>
      </header>
      {e2eeHealth && !e2eeHealth.healthy && (
        <div className="relative z-10 mx-auto mb-2 mt-2 flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-xs text-orange-100">
          <span>
            Les messages du groupe ne sont pas entièrement protégés sur cet appareil. Appuyez sur Réparer pour corriger.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleE2eeRepair}
            disabled={e2eeRepairing}
            className="h-7 rounded-full border-orange-300/45 bg-transparent px-3 text-[11px] text-orange-50 hover:bg-orange-500/20"
          >
            {e2eeRepairing ? 'Réparation…' : 'Réparer'}
          </Button>
        </div>
      )}

      {group?.pinned_message && (
        <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-2 rounded-xl py-0.5 text-left outline-none ring-offset-2 ring-offset-[#070a12] transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-emerald-500/50 [touch-action:manipulation] active:bg-white/[0.06]"
            onClick={() => scrollToQuotedMessage(group.pinned_message)}
            aria-label={GROUP_UI.jumpToPinnedMessage}
          >
            <Pin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/90" strokeWidth={2} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">{GROUP_UI.pinnedMessage}</p>
              <p className="truncate text-[13px] text-white/88">{groupReplySnippet(group.pinned_message)}</p>
            </div>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-full px-3 text-xs text-white/75 hover:bg-white/[0.08] hover:text-white"
            onClick={handleUnpinBanner}
          >
            {GROUP_UI.unpinMessage}
          </Button>
        </div>
      )}

      <div
        ref={messagesScrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-3 pb-4 pt-3"
        style={{ paddingBottom: 'max(5.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {groupLoading || messagesLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400/80" />
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] px-6 py-14 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="text-[15px] font-medium text-white/88">Aucun message pour l’instant</p>
              <p className="mt-2 text-sm text-white/42">Envoyez le premier message au groupe.</p>
            </div>
          ) : (
            <>
              {hasNextPage ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  {isFetchingNextPage ? (
                    <p className="flex items-center gap-2 text-[11px] text-white/45">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400/70" strokeWidth={2} />
                      {GROUP_UI.loadOlderMessages}
                    </p>
                  ) : null}
                  <div ref={loadMoreSentinelRef} className="h-2 w-full shrink-0" aria-hidden />
                </div>
              ) : (
                <p className="pb-1 text-center text-[11px] text-white/35">{GROUP_UI.conversationStart}</p>
              )}
              {messages
              .slice()
              .reverse()
              .map((m, idx) => {
                const isOwn = currentUser?.id && String(m.sender_id) === String(currentUser.id);
                const senderName = m.sender?.full_name || m.sender?.username || 'Membre';
                const initial = (senderName[0] || 'U').toUpperCase();
                const t = String(m.type || 'text').toLowerCase();
                const isMsgDeleted = !!m.is_deleted;
                const isImage = !isMsgDeleted && t === 'image' && m.media_url;
                const isVideo = !isMsgDeleted && t === 'video' && m.media_url;
                const isAudio = !isMsgDeleted && (t === 'audio' || t === 'voice') && m.media_url;
                const isFile = !isMsgDeleted && t === 'file' && m.media_url;
                const isEvent =
                  !isMsgDeleted && t === 'event' && !!(m.event_id || m.event_ref);
                const eventRef = m.event_ref;
                const myUid = currentUser?.id != null ? String(currentUser.id) : null;
                const isPoll =
                  !isMsgDeleted &&
                  t === 'poll' &&
                  Array.isArray(m.poll_options) &&
                  m.poll_options.map((x) => String(x).trim()).filter(Boolean).length >= 2;
                const pollOpts = isPoll
                  ? m.poll_options.map((x) => String(x).trim()).filter(Boolean)
                  : [];
                const pollVotesRaw =
                  m.poll_votes && typeof m.poll_votes === 'object' && !Array.isArray(m.poll_votes)
                    ? m.poll_votes
                    : {};
                const pollVoteCounts = pollOpts.map((_, i) =>
                  Object.values(pollVotesRaw).filter((v) => Number(v) === i).length
                );
                const totalPollVotes = pollVoteCounts.reduce((a, b) => a + b, 0);
                const myPollVote =
                  myUid != null && pollVotesRaw[myUid] !== undefined ? Number(pollVotesRaw[myUid]) : null;
                const reactionsMap = m.reactions && typeof m.reactions === 'object' && !Array.isArray(m.reactions) ? m.reactions : {};
                const myReaction = myUid ? reactionsMap[myUid] : null;
                const reactionToShow = isMsgDeleted ? null : myReaction || Object.values(reactionsMap)[0];
                const reactionUserCount = Object.keys(reactionsMap).length;

                return (
                  <div
                    key={m.id ?? `msg-${idx}`}
                    data-afw-group-msg={m.id || undefined}
                    className={cn('flex w-full scroll-mt-4', isOwn ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn('flex max-w-[min(100%,340px)] gap-2', isOwn ? 'flex-row-reverse items-end' : 'flex-row items-end')}>
                      <Avatar className="h-8 w-8 shrink-0 rounded-xl ring-1 ring-white/10">
                        <AvatarImage src={isOwn ? currentUser?.profile_image || currentUser?.avatar : m.sender?.profile_image} />
                        <AvatarFallback
                          className={cn(
                            'rounded-xl text-[11px] text-white',
                            isOwn ? 'bg-emerald-800/90 ring-1 ring-emerald-500/25' : 'bg-white/15'
                          )}
                        >
                          {isOwn
                            ? (currentUser?.full_name || currentUser?.username || 'M')[0]?.toUpperCase() || 'M'
                            : initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        {!isOwn && (
                          <p className="mb-1 flex flex-wrap items-center gap-1.5 truncate text-[11px] font-medium text-white/38">
                            <span className="truncate">{senderName}</span>
                            {m.sender?.group_tag ? (
                              <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-normal text-emerald-200/90">
                                {m.sender.group_tag}
                              </span>
                            ) : null}
                          </p>
                        )}
                        <div
                          className={cn(
                            'relative rounded-[22px] px-3.5 py-2.5 text-[15px] leading-snug shadow-[0_14px_32px_rgba(2,6,23,0.2)] transition-[box-shadow,ring] duration-300',
                            reactionToShow ? 'pb-6' : '',
                            highlightedMessageId === String(m.id)
                              ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-[#070a12] shadow-[0_0_24px_rgba(52,211,153,0.2)]'
                              : '',
                            isOwn
                              ? 'rounded-br-md border border-emerald-500/25 bg-gradient-to-br from-[#166a4a]/95 to-[#0c3024]/98 text-white'
                              : 'rounded-bl-md border border-white/10 bg-[#161d2b] text-white/95'
                          )}
                        >
                          {isMsgDeleted ? (
                            <p className="py-0.5 text-[14px] italic leading-snug text-white/48">{GROUP_UI.deletedMessage}</p>
                          ) : (
                            <>
                              {m.reply_to && (
                                <button
                                  type="button"
                                  className="mb-2 w-full space-y-1 rounded-xl text-left [touch-action:manipulation] hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45"
                                  aria-label={GROUP_UI.goToQuotedMessage}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollToQuotedMessage(m.reply_to);
                                  }}
                                >
                                  <p className={cn('text-[11px] font-medium leading-tight', isOwn ? 'text-white/55' : 'text-white/42')}>
                                    {groupReplyThreadLabel(m.reply_to, currentUser?.id)}
                                  </p>
                                  <div
                                    className={cn(
                                      'rounded-xl border-l-[3px] px-2.5 py-1.5',
                                      isOwn ? 'border-l-emerald-300/80 bg-black/20' : 'border-l-emerald-400/70 bg-black/28'
                                    )}
                                  >
                                    <p className="line-clamp-2 text-[12px] leading-snug text-white/78">
                                      {groupReplySnippet(m.reply_to)}
                                    </p>
                                  </div>
                                </button>
                              )}
                              {isImage && (
                                <a
                                  href={m.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mb-2 block overflow-hidden rounded-xl"
                                >
                                  <img src={m.media_url} alt="" className="max-h-52 w-full object-cover" loading="lazy" />
                                </a>
                              )}
                              {isVideo && (
                                <div className="mb-2 overflow-hidden rounded-xl">
                                  <video
                                    src={m.media_url}
                                    controls
                                    playsInline
                                    className="max-h-52 w-full bg-black object-contain"
                                    preload="metadata"
                                  />
                                </div>
                              )}
                              {isAudio && (
                                <div className={cn('mb-1', isOwn ? '-mx-0.5' : '')}>
                                  <ChatVoiceMessage
                                    src={m.media_url}
                                    isOwn={isOwn}
                                    avatarUrl={
                                      isOwn
                                        ? currentUser?.profile_image || currentUser?.avatar
                                        : m.sender?.profile_image
                                    }
                                    avatarFallback={
                                      isOwn
                                        ? (currentUser?.full_name || currentUser?.username || 'M')[0]?.toUpperCase() || 'M'
                                        : initial
                                    }
                                    messageId={m.id}
                                    createdAt={m.created_at}
                                    receiptStatus={null}
                                    labels={VOICE_LABELS}
                                  />
                                  {m.transcription_text ? (
                                    <p className="mt-2 text-[12px] leading-snug text-white/75">{m.transcription_text}</p>
                                  ) : null}
                                  {isOwn && !m.transcription_text ? (
                                    <button
                                      type="button"
                                      disabled={transcribeGroupMutation.isPending}
                                      onClick={() => transcribeGroupMutation.mutate(m.id)}
                                      className="mt-1.5 text-[11px] font-semibold text-emerald-300/95 hover:underline disabled:opacity-50"
                                    >
                                      {transcribeGroupMutation.isPending ? 'Transcription…' : 'Transcrire'}
                                    </button>
                                  ) : null}
                                </div>
                              )}
                              {isFile && (
                                <a
                                  href={m.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mb-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/90 hover:bg-black/35"
                                >
                                  <FileText className="h-4 w-4 shrink-0 text-emerald-300/90" />
                                  <span className="min-w-0 truncate underline-offset-2 hover:underline">{(decryptedContentByGroupMessageId[m.id] ?? m.content) || 'Document'}</span>
                                </a>
                              )}
                              {isPoll && (
                                <div className="mb-1 space-y-2">
                                  <p className="text-[15px] font-semibold leading-snug text-white/95">{m.content}</p>
                                  <ul className="space-y-1.5">
                                    {pollOpts.map((label, optIdx) => {
                                      const count = pollVoteCounts[optIdx] ?? 0;
                                      const pct = totalPollVotes > 0 ? Math.round((count / totalPollVotes) * 100) : 0;
                                      const isMine = myPollVote === optIdx;
                                      const voteBusy =
                                        votePollMutation.isPending && votePollMutation.variables?.messageId === m.id;
                                      return (
                                        <li key={`${m.id}-poll-${optIdx}`}>
                                          <button
                                            type="button"
                                            disabled={voteBusy}
                                            onClick={() => votePollMutation.mutate({ messageId: m.id, optionIndex: optIdx })}
                                            className={cn(
                                              'relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-[14px] transition-colors [touch-action:manipulation] disabled:opacity-60',
                                              isOwn
                                                ? isMine
                                                  ? 'border-emerald-300/50 bg-emerald-950/40 text-white'
                                                  : 'border-white/20 bg-black/20 text-white/90 hover:bg-black/30'
                                                : isMine
                                                  ? 'border-emerald-400/55 bg-emerald-950/35 text-white'
                                                  : 'border-white/12 bg-black/22 text-white/90 hover:bg-black/32'
                                            )}
                                          >
                                            {totalPollVotes > 0 ? (
                                              <span
                                                className={cn(
                                                  'pointer-events-none absolute inset-y-0 left-0 opacity-25',
                                                  isOwn ? 'bg-emerald-400' : 'bg-sky-500'
                                                )}
                                                style={{ width: `${pct}%` }}
                                              />
                                            ) : null}
                                            <span className="relative z-[1] flex items-center justify-between gap-2">
                                              <span className="min-w-0 flex-1 font-medium">{label}</span>
                                              <span className="shrink-0 text-[11px] tabular-nums text-white/55">
                                                {count > 0 ? `${count} (${pct}%)` : '—'}
                                              </span>
                                            </span>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  {totalPollVotes > 0 ? (
                                    <p className="text-[11px] text-white/45">{GROUP_UI.pollVotes(totalPollVotes)}</p>
                                  ) : null}
                                </div>
                              )}
                              {isEvent && (
                                <button
                                  type="button"
                                  disabled={!m.event_id}
                                  onClick={() => {
                                    if (!m.event_id) return;
                                    navigate(
                                      `${createPageUrl('EventDetails')}?id=${encodeURIComponent(m.event_id)}`
                                    );
                                  }}
                                  className={cn(
                                    'mb-2 w-full max-w-[280px] overflow-hidden rounded-2xl border text-left transition [touch-action:manipulation]',
                                    isOwn ? 'border-white/18 bg-white/[0.07]' : 'border-white/12 bg-black/28',
                                    !m.event_id && 'cursor-default opacity-70'
                                  )}
                                >
                                  {eventRef?.image ? (
                                    <img
                                      src={eventRef.image}
                                      alt=""
                                      className="h-28 w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-24 items-center justify-center bg-white/[0.06]">
                                      <CalendarDays className="h-10 w-10 text-white/35" aria-hidden />
                                    </div>
                                  )}
                                  <div className="space-y-1 px-3 py-2.5">
                                    <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-white/95">
                                      {eventRef?.title || decryptedContentByGroupMessageId[m.id] || m.content}
                                    </p>
                                    {eventRef?.start_date ? (
                                      <p className="text-[11px] text-white/48">
                                        {format(new Date(eventRef.start_date), 'EEE d MMM yyyy · HH:mm', {
                                          locale: fr,
                                        })}
                                      </p>
                                    ) : null}
                                    {eventRef?.location ? (
                                      <p className="line-clamp-1 text-[11px] text-white/42">{eventRef.location}</p>
                                    ) : null}
                                    <p className="text-[11px] font-semibold text-emerald-300/90">
                                      {GROUP_UI.eventOpenDetails} →
                                    </p>
                                  </div>
                                </button>
                              )}
                              {!isImage && !isVideo && !isAudio && !isFile && !isPoll && !isEvent && (() => {
                                const raw = decryptedContentByGroupMessageId[m.id] ?? m.content;
                                const strictBlocked = E2EE_STRICT_MODE && !isOwn && String(m.type || 'text').toLowerCase() === 'text' && !decryptedContentByGroupMessageId[m.id];
                                if (strictBlocked) return true;
                                return !!(typeof raw === 'string' && raw.trim());
                              })() ? (
                                <div className="text-[15px] leading-snug">
                                  {(() => {
                                    const strictBlocked = E2EE_STRICT_MODE && !isOwn && String(m.type || 'text').toLowerCase() === 'text' && !decryptedContentByGroupMessageId[m.id];
                                    if (strictBlocked) {
                                      return <span className="text-white/60">Message chiffre indisponible sur cet appareil</span>;
                                    }
                                    const displayContent = decryptedContentByGroupMessageId[m.id] ?? m.content;
                                    return (
                                      <ChatFormattedText
                                        text={displayContent}
                                        isOnLightBubble={false}
                                        spoilerTapLabel="Afficher"
                                        highlightAtMentions
                                        className="whitespace-pre-wrap break-words"
                                      />
                                    );
                                  })()}
                                  {m.is_edited ? (
                                    <span className="mt-1 block text-[10px] font-medium text-white/36">{GROUP_UI.messageEditedTag}</span>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          )}

                          {!isMsgDeleted ? (
                            <div className="mt-2 flex flex-col gap-1">
                              {m.status === 'scheduled' && isOwn && m.scheduled_at ? (
                                <p className="text-[10px] font-medium text-amber-200/90">
                                  {GROUP_UI.scheduledMessageShort} ·{' '}
                                  {format(new Date(m.scheduled_at), "d MMM yyyy 'à' HH:mm", {
                                    locale: fr,
                                  })}
                                </p>
                              ) : null}
                              <div className="flex items-center justify-end gap-1">
                              <p className={cn('mr-auto text-[10px] tabular-nums', isOwn ? 'text-white/55' : 'text-white/40')}>
                                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                              </p>
                              <button
                                type="button"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/80 [touch-action:manipulation] hover:bg-black/40"
                                aria-label={GROUP_UI.replyToMessage}
                                onClick={() => setReplyTarget(m)}
                              >
                                <Reply className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                disabled={m.status === 'scheduled'}
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/25 [touch-action:manipulation] hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-40',
                                  pinnedMessageId === m.id ? 'text-amber-300' : 'text-white/80'
                                )}
                                aria-label={pinnedMessageId === m.id ? GROUP_UI.unpinMessage : GROUP_UI.pinMessage}
                                onClick={() => handlePinMessage(m)}
                              >
                                <Pin className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                              {(canCopyGroupMessageText(m) || isOwn || isGroupAdmin || canForwardGroupMessage(m) || canEditGroupMessage(m, currentUser?.id)) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/80 [touch-action:manipulation] hover:bg-black/40"
                                      aria-label={GROUP_UI.moreActions}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" strokeWidth={2} />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align={isOwn ? 'end' : 'start'}
                                    className="min-w-[10rem] border-white/10 bg-[#0f1724] p-1 text-white"
                                  >
                                    {canCopyGroupMessageText(m) ? (
                                      <DropdownMenuItem
                                        className="cursor-pointer gap-2 focus:bg-white/10"
                                        onClick={() => handleCopyGroupMessage(m)}
                                      >
                                        <Copy className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                                        {GROUP_UI.copyMessage}
                                      </DropdownMenuItem>
                                    ) : null}
                                    {canForwardGroupMessage(m) ? (
                                      <DropdownMenuItem
                                        className="cursor-pointer gap-2 focus:bg-white/10"
                                        disabled={forwardGroupMessageMutation.isPending}
                                        onClick={() => {
                                          setForwardSource(m);
                                          setForwardDialogOpen(true);
                                        }}
                                      >
                                        <Share2 className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                                        {GROUP_UI.forwardMessage}
                                      </DropdownMenuItem>
                                    ) : null}
                                    {canEditGroupMessage(m, currentUser?.id) ? (
                                      <DropdownMenuItem
                                        className="cursor-pointer gap-2 focus:bg-white/10"
                                        disabled={editGroupMessageMutation.isPending}
                                        onClick={() => {
                                          setEditingMessageId(m.id);
                                          setEditText(m.content?.trim() ?? '');
                                        }}
                                      >
                                        <Pencil className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                                        {GROUP_UI.editMessage}
                                      </DropdownMenuItem>
                                    ) : null}
                                    {isOwn || isGroupAdmin ? (
                                      <DropdownMenuItem
                                        className="cursor-pointer gap-2 text-red-300 focus:bg-white/10 focus:text-red-200"
                                        disabled={deleteGroupMessageMutation.isPending}
                                        onClick={() => openDeleteGroupMessageConfirm(m)}
                                      >
                                        <Trash2 className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                                        {m.status === 'scheduled' ? GROUP_UI.deleteScheduledMenu : GROUP_UI.deleteMessage}
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/80 [touch-action:manipulation] hover:bg-black/40"
                                    aria-label="Réagir"
                                  >
                                    <SmilePlus className="h-3.5 w-3.5" strokeWidth={2} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align={isOwn ? 'end' : 'start'}
                                  className="border-white/10 bg-[#0f1724] p-2 text-white"
                                >
                                  <div className="flex flex-wrap gap-1">
                                    {GROUP_QUICK_REACTIONS.map((em) => (
                                      <button
                                        key={em}
                                        type="button"
                                        className="rounded-lg px-2 py-1 text-lg leading-none hover:bg-white/10"
                                        onClick={() => pickReaction(m.id, em, myReaction)}
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </div>
                          ) : (
                            <p className={cn('mt-2 text-[10px] tabular-nums', isOwn ? 'text-white/55' : 'text-white/40')}>
                              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          )}

                          {reactionToShow ? (
                            <button
                              type="button"
                              className={cn(
                                'absolute -bottom-3 flex items-center gap-0.5 rounded-full border border-white/12 bg-white px-2 py-0.5 text-xs text-black shadow-sm [touch-action:manipulation]',
                                isOwn ? 'left-3' : 'right-3'
                              )}
                              aria-label="Détail des réactions"
                              onClick={(e) => {
                                e.stopPropagation();
                                openReactionsDetail(m.id);
                              }}
                            >
                              <span className="leading-none">{String(reactionToShow)}</span>
                              {reactionUserCount > 1 ? (
                                <span className="min-w-[1rem] rounded-full bg-black/10 px-1 text-[10px] font-semibold tabular-nums text-black/80">
                                  {reactionUserCount}
                                </span>
                              ) : null}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        onChange={handleDocumentChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,application/*"
      />
      <input
        ref={mediaInputRef}
        type="file"
        className="hidden"
        onChange={handleMediaChange}
        accept="image/*,video/*"
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteGroupMessageMutation.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[min(100%,380px)] border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {deleteTarget?.status === 'scheduled' ? GROUP_UI.cancelScheduledTitle : GROUP_UI.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-white/60">
              {deleteTarget?.status === 'scheduled' ? GROUP_UI.cancelScheduledBody : GROUP_UI.deleteConfirmBody}
              {deleteTarget?.status !== 'scheduled' && deleteConfirmIsOthersMessage && isGroupAdmin ? (
                <span className="mt-3 block text-white/75">{GROUP_UI.deleteConfirmAdminNote}</span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleteGroupMessageMutation.isPending}
              className="mt-0 border-white/20 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white"
            >
              {GROUP_UI.deleteConfirmCancel}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteGroupMessageMutation.isPending}
              onClick={confirmDeleteGroupMessage}
            >
              {deleteGroupMessageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  …
                </>
              ) : (
                GROUP_UI.deleteConfirmAction
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={leaveGroupConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !leaveGroupMutation.isPending) setLeaveGroupConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-[min(100%,380px)] border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{GROUP_UI.leaveGroupConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-white/60">
              {GROUP_UI.leaveGroupConfirmBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={leaveGroupMutation.isPending}
              className="mt-0 border-white/20 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white"
            >
              {GROUP_UI.deleteConfirmCancel}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={leaveGroupMutation.isPending}
              onClick={() => leaveGroupMutation.mutate()}
            >
              {leaveGroupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  …
                </>
              ) : (
                GROUP_UI.leaveGroupConfirmAction
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!removeMemberTarget}
        onOpenChange={(open) => {
          if (!open && !removeGroupMemberMutation.isPending) setRemoveMemberTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[min(100%,380px)] border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{GROUP_UI.removeMemberConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-white/60">
              {removeMemberTarget ? (
                <>
                  <span className="font-medium text-white/85">
                    {removeMemberTarget.full_name || removeMemberTarget.username || '…'}
                  </span>{' '}
                  {GROUP_UI.removeMemberConfirmBody}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={removeGroupMemberMutation.isPending}
              className="mt-0 border-white/20 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white"
            >
              {GROUP_UI.deleteConfirmCancel}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={removeGroupMemberMutation.isPending}
              onClick={() => {
                if (!removeMemberTarget?.id) return;
                removeGroupMemberMutation.mutate(removeMemberTarget.id);
              }}
            >
              {removeGroupMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  …
                </>
              ) : (
                GROUP_UI.removeMember
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={groupDetailsOpen} onOpenChange={setGroupDetailsOpen}>
        <DialogContent className="flex max-h-[min(560px,88dvh)] max-w-md flex-col gap-0 overflow-hidden border-white/10 bg-[#0c121c] p-0 text-white sm:rounded-2xl">
          {group ? (
            <>
              <DialogHeader className="shrink-0 space-y-3 border-b border-white/[0.06] px-4 pb-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-14 w-14 rounded-2xl ring-1 ring-white/12">
                      <AvatarImage src={group.avatar_url} className="object-cover" />
                      <AvatarFallback className="rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-lg font-semibold text-white">
                        {(group.name || 'G').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isGroupAdmin ? (
                      <>
                        <input
                          ref={groupAvatarInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleGroupAvatarChange}
                        />
                        <button
                          type="button"
                          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-emerald-600 text-white shadow-md [touch-action:manipulation] hover:bg-emerald-500 disabled:opacity-50"
                          aria-label={GROUP_UI.groupChangePhoto}
                          disabled={updateGroupMutation.isPending}
                          onClick={() => groupAvatarInputRef.current?.click()}
                        >
                          <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    {isGroupAdmin ? (
                      <>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{GROUP_UI.groupEditSection}</p>
                        <DialogTitle className="sr-only">{GROUP_UI.groupInfoTitle}</DialogTitle>
                        <Input
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          placeholder={GROUP_UI.groupNamePlaceholder}
                          maxLength={100}
                          className="mt-2 h-10 rounded-xl border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="mt-2 rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-600 disabled:opacity-50"
                          disabled={
                            updateGroupMutation.isPending ||
                            !editGroupName.trim() ||
                            editGroupName.trim() === (group.name || '').trim()
                          }
                          onClick={() => updateGroupMutation.mutate({ name: editGroupName.trim() })}
                        >
                          {updateGroupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                          ) : (
                            GROUP_UI.groupSaveName
                          )}
                        </Button>
                        <p className="mt-3 text-xs text-white/50">
                          {memberCount} membre{memberCount > 1 ? 's' : ''}
                          {group.created_by ? (
                            <>
                              {' · '}
                              {GROUP_UI.groupCreatedBy}{' '}
                              {group.created_by.full_name || group.created_by.username || '…'}
                            </>
                          ) : null}
                        </p>
                        <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                          {GROUP_UI.groupDescriptionLabel}
                        </p>
                        <Textarea
                          value={editGroupDescription}
                          onChange={(e) => setEditGroupDescription(e.target.value)}
                          placeholder={GROUP_UI.groupDescriptionPlaceholder}
                          maxLength={500}
                          rows={3}
                          className="mt-2 min-h-[4.5rem] resize-none rounded-xl border-white/15 bg-white/[0.06] text-sm text-white placeholder:text-white/35"
                          autoComplete="off"
                        />
                        <p className="mt-1 text-[11px] text-white/40">{GROUP_UI.groupDescriptionHint}</p>
                        <Button
                          type="button"
                          size="sm"
                          className="mt-2 rounded-lg bg-white/[0.08] text-white hover:bg-white/[0.12] disabled:opacity-50"
                          disabled={
                            updateGroupMutation.isPending ||
                            editGroupDescription.trim() === (group.description || '').trim()
                          }
                          onClick={() =>
                            updateGroupMutation.mutate({
                              description: editGroupDescription.trim() ? editGroupDescription.trim() : null,
                            })
                          }
                        >
                          {updateGroupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                          ) : (
                            GROUP_UI.groupSaveDescription
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <DialogTitle className="text-lg font-semibold leading-tight text-white">{group.name}</DialogTitle>
                        <DialogDescription className="mt-1 text-left text-xs text-white/50">
                          {memberCount} membre{memberCount > 1 ? 's' : ''}
                          {group.created_by ? (
                            <>
                              {' · '}
                              {GROUP_UI.groupCreatedBy}{' '}
                              {group.created_by.full_name || group.created_by.username || '…'}
                            </>
                          ) : null}
                        </DialogDescription>
                        {group.description?.trim() ? (
                          <p className="mt-3 whitespace-pre-wrap text-left text-sm leading-relaxed text-white/68">
                            {group.description.trim()}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </DialogHeader>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium text-white/92">{GROUP_UI.groupNotificationsLabel}</p>
                  <p className="text-[11px] text-white/45">{GROUP_UI.groupNotificationsHint}</p>
                </div>
                <Switch
                  className="shrink-0 data-[state=checked]:bg-emerald-600"
                  checked={!Boolean(group?.notifications_muted)}
                  onCheckedChange={(enabled) => groupNotificationsMutation.mutate(!enabled)}
                  disabled={groupNotificationsMutation.isPending}
                  aria-label={GROUP_UI.groupNotificationsLabel}
                />
              </div>
              <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
                <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  <Tag className="h-3.5 w-3.5 text-emerald-400/90" strokeWidth={2} />
                  {GROUP_UI.groupDisplayTagSection}
                </p>
                <Input
                  value={myGroupTagDraft}
                  onChange={(e) => setMyGroupTagDraft(e.target.value.slice(0, 40))}
                  placeholder={GROUP_UI.groupDisplayTagPlaceholder}
                  className="h-10 rounded-xl border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
                  autoComplete="off"
                  maxLength={40}
                  aria-label={GROUP_UI.groupDisplayTagSection}
                />
                <p className="mt-1.5 text-[11px] text-white/40">{GROUP_UI.groupDisplayTagHint}</p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-600"
                  disabled={groupDisplayTagMutation.isPending || !groupId}
                  onClick={() => groupDisplayTagMutation.mutate(myGroupTagDraft)}
                >
                  {groupDisplayTagMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    GROUP_UI.groupDisplayTagSave
                  )}
                </Button>
              </div>
              {isGroupAdmin ? (
                <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    <UserPlus className="h-3.5 w-3.5 text-emerald-400/90" strokeWidth={2} />
                    {GROUP_UI.addMembersSection}
                  </p>
                  <Input
                    value={addMemberSearchInput}
                    onChange={(e) => setAddMemberSearchInput(e.target.value)}
                    placeholder={GROUP_UI.addMembersPlaceholder}
                    className="h-10 rounded-xl border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
                    autoComplete="off"
                  />
                  {addMemberSearchDebounced.length > 0 && addMemberSearchDebounced.length < 2 ? (
                    <p className="mt-1.5 text-[11px] text-white/40">{GROUP_UI.addMembersHint}</p>
                  ) : null}
                  {addMemberSearchDebounced.length >= 2 ? (
                    <div className="mt-2 max-h-[min(140px,28dvh)] overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20">
                      {addMemberSearchFetching ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-white/35" />
                        </div>
                      ) : addMemberSearchResults.length === 0 ? (
                        <p className="px-3 py-3 text-center text-xs text-white/45">{GROUP_UI.addMembersNoResults}</p>
                      ) : (
                        <ul className="divide-y divide-white/[0.06]">
                          {addMemberSearchResults.map((u) => {
                            const label = u.full_name || u.username || '…';
                            const initial = (label[0] || '?').toUpperCase();
                            return (
                              <li
                                key={u.id}
                                className="flex items-center gap-2 px-2 py-2"
                              >
                                <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                                  <AvatarImage src={u.profile_image || undefined} />
                                  <AvatarFallback className="rounded-lg bg-white/10 text-[10px] text-white">
                                    {initial}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm text-white/90">{label}</p>
                                  {u.username ? (
                                    <p className="truncate text-[11px] text-white/45">@{u.username}</p>
                                  ) : null}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 shrink-0 rounded-lg bg-emerald-600/90 px-3 text-xs text-white hover:bg-emerald-600"
                                  disabled={addGroupMembersMutation.isPending}
                                  onClick={() => addGroupMembersMutation.mutate([u.id])}
                                >
                                  {GROUP_UI.addMembersButton}
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {isGroupAdmin ? (
                <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    <Link2 className="h-3.5 w-3.5 text-emerald-400/90" strokeWidth={2} />
                    {GROUP_UI.inviteLinkSection}
                  </p>
                  {group?.invite_token ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-lg bg-white/[0.06] text-white hover:bg-white/[0.1]"
                        disabled={generateInviteLinkMutation.isPending}
                        onClick={() => {
                          const url = `${window.location.origin}${createPageUrl('Inbox')}?invite=${group.invite_token}`;
                          navigator.clipboard?.writeText(url).then(() => toast.success(GROUP_UI.inviteLinkCopied)).catch(() => {});
                        }}
                      >
                        <Copy className="mr-1.5 h-4 w-4" strokeWidth={2} />
                        {GROUP_UI.inviteLinkCopy}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-lg text-red-300 hover:bg-red-500/15 hover:text-red-200"
                        disabled={revokeInviteLinkMutation.isPending}
                        onClick={() => revokeInviteLinkMutation.mutate()}
                      >
                        {revokeInviteLinkMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                        ) : (
                          GROUP_UI.inviteLinkRevoke
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-600"
                      disabled={generateInviteLinkMutation.isPending}
                      onClick={() => generateInviteLinkMutation.mutate()}
                    >
                      {generateInviteLinkMutation.isPending ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={2} />
                      ) : (
                        <Link2 className="mr-1.5 h-4 w-4" strokeWidth={2} />
                      )}
                      {GROUP_UI.inviteLinkGenerate}
                    </Button>
                  )}
                </div>
              ) : null}
              <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wide text-white/40">{GROUP_UI.groupMembers}</p>
              <ScrollArea className="min-h-0 max-h-[min(240px,38dvh)] flex-1 px-4">
                <ul className="space-y-1 pb-2 pr-3 pt-1">
                  {[...(group.members ?? [])]
                    .sort((a, b) => {
                      if (a.role === 'admin' && b.role !== 'admin') return -1;
                      if (a.role !== 'admin' && b.role === 'admin') return 1;
                      const na = (a.full_name || a.username || '').toLowerCase();
                      const nb = (b.full_name || b.username || '').toLowerCase();
                      return na.localeCompare(nb, 'fr');
                    })
                    .map((mem) => {
                      const isSelf = currentUser?.id && String(mem.id) === String(currentUser.id);
                      const display = mem.full_name || mem.username || 'Membre';
                      const initial = (display[0] || 'M').toUpperCase();
                      return (
                        <li
                          key={mem.id}
                          className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-2.5 sm:gap-3 sm:px-3"
                        >
                          <Avatar className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-white/10">
                            <AvatarImage src={mem.profile_image || undefined} />
                            <AvatarFallback className="rounded-xl bg-white/10 text-xs text-white">{initial}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white/92">
                              {display}
                              {isSelf ? <span className="ml-1.5 text-xs font-normal text-white/45">(vous)</span> : null}
                            </p>
                            <p className="text-[11px] text-white/45">
                              {mem.role === 'admin' ? GROUP_UI.groupMemberAdmin : GROUP_UI.groupMemberMember}
                            </p>
                            {mem.group_tag ? (
                              <p className="mt-0.5 text-[10px] text-emerald-300/85">« {mem.group_tag} »</p>
                            ) : null}
                          </div>
                          {isGroupAdmin && !isSelf ? (
                            <div className="flex shrink-0 items-center gap-0.5">
                              {mem.role !== 'admin' ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-full text-amber-300/95 hover:bg-amber-500/15 hover:text-amber-200"
                                  aria-label={GROUP_UI.promoteAdmin}
                                  disabled={
                                    removeGroupMemberMutation.isPending || setGroupMemberRoleMutation.isPending
                                  }
                                  onClick={() =>
                                    setGroupMemberRoleMutation.mutate({ targetUserId: mem.id, role: 'admin' })
                                  }
                                >
                                  <Crown className="h-4 w-4" strokeWidth={2} />
                                </Button>
                              ) : groupAdminCount > 1 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-full text-sky-300/90 hover:bg-sky-500/15 hover:text-sky-200"
                                  aria-label={GROUP_UI.demoteAdmin}
                                  disabled={
                                    removeGroupMemberMutation.isPending || setGroupMemberRoleMutation.isPending
                                  }
                                  onClick={() =>
                                    setGroupMemberRoleMutation.mutate({ targetUserId: mem.id, role: 'member' })
                                  }
                                >
                                  <ShieldOff className="h-4 w-4" strokeWidth={2} />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-red-300 hover:bg-red-500/15 hover:text-red-200"
                                aria-label={GROUP_UI.removeMember}
                                disabled={
                                  removeGroupMemberMutation.isPending || setGroupMemberRoleMutation.isPending
                                }
                                onClick={() => setRemoveMemberTarget(mem)}
                              >
                                <UserMinus className="h-4 w-4" strokeWidth={2} />
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              </ScrollArea>
              <div className="shrink-0 border-t border-white/[0.06] p-4">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full rounded-xl bg-red-600 text-white hover:bg-red-700"
                  disabled={leaveGroupMutation.isPending}
                  onClick={() => setLeaveGroupConfirmOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4 shrink-0" strokeWidth={2} />
                  {GROUP_UI.leaveGroup}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={reactionsDialogOpen} onOpenChange={setReactionsDialogOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#0c121c] text-white">
          <DialogHeader>
            <DialogTitle>Réactions</DialogTitle>
          </DialogHeader>
          {reactionsDetailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-white/40" />
            </div>
          ) : reactionsDetailList.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/45">Aucune réaction</p>
          ) : (
            <ul className="max-h-[50dvh] space-y-2 overflow-y-auto py-2">
              {reactionsDetailList.map((r) => (
                <li
                  key={r.user_id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2"
                >
                  <Avatar className="h-9 w-9 rounded-xl">
                    <AvatarImage src={r.profile_image || undefined} />
                    <AvatarFallback className="rounded-xl bg-white/10 text-xs">
                      {(r.full_name || r.username || '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">
                      {String(r.user_id) === String(currentUser?.id)
                        ? 'Vous'
                        : r.full_name || r.username || r.user_id}
                    </p>
                  </div>
                  <span className="text-lg leading-none">{r.emoji}</span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingMessageId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMessageId(null);
            setEditText('');
          }
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>{GROUP_UI.editMessageTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={GROUP_UI.editMessagePlaceholder}
              className="min-h-[2.5rem] rounded-xl border-white/15 bg-white/[0.06] text-white placeholder:text-white/40"
              autoComplete="off"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-white/80 hover:bg-white/10"
                onClick={() => {
                  setEditingMessageId(null);
                  setEditText('');
                }}
              >
                {GROUP_UI.deleteConfirmCancel}
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                disabled={!editText.trim() || editGroupMessageMutation.isPending}
                onClick={() => {
                  if (!editText.trim() || !editingMessageId) return;
                  editGroupMessageMutation.mutate({ messageId: editingMessageId, content: editText.trim() });
                }}
              >
                {editGroupMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  GROUP_UI.editMessageSave
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={forwardDialogOpen}
        onOpenChange={(open) => {
          setForwardDialogOpen(open);
          if (!open) setForwardSource(null);
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>{GROUP_UI.forwardDialogTitle}</DialogTitle>
            <DialogDescription className="space-y-2 text-left text-white/55">
              <span className="block">{GROUP_UI.forwardDialogHint}</span>
              {forwardSource ? (
                <span className="block rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white/85">
                  {groupReplySnippet(forwardSource)}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {forwardGroupsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-white/40" />
            </div>
          ) : forwardTargetGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/45">{GROUP_UI.forwardNoOtherGroups}</p>
          ) : (
            <ScrollArea className="max-h-[min(320px,50dvh)] pr-3">
              <ul className="space-y-1 pb-1">
                {forwardTargetGroups.map((g) => {
                  const initial = (g.name || 'G').slice(0, 2).toUpperCase();
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        disabled={forwardGroupMessageMutation.isPending || !forwardSource}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-3 text-left transition-colors hover:bg-white/[0.07] disabled:opacity-50 [touch-action:manipulation]"
                        onClick={() => {
                          if (!forwardSource?.id) return;
                          forwardGroupMessageMutation.mutate({ targetGroupId: g.id, source: forwardSource });
                        }}
                      >
                        <Avatar className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-white/10">
                          <AvatarImage src={g.avatar_url} className="object-cover" />
                          <AvatarFallback className="rounded-xl bg-white/10 text-sm text-white">{initial}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-white">{g.name}</p>
                          <p className="truncate text-xs text-white/45">
                            {g.members_count ?? g.members?.length ?? 0} membre
                            {(g.members_count ?? g.members?.length ?? 0) > 1 ? 's' : ''}
                          </p>
                        </div>
                        <Share2 className="h-4 w-4 shrink-0 text-white/35" strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent className="max-w-md border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>{GROUP_UI.pollDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder={GROUP_UI.pollQuestionPlaceholder}
              className="min-h-[72px] resize-y border-white/15 bg-black/25 text-white placeholder:text-white/35"
              maxLength={500}
            />
            <div className="space-y-2">
              {pollOptionRows.map((row, i) => (
                <Input
                  key={`poll-opt-${i}`}
                  value={row}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPollOptionRows((prev) => prev.map((p, j) => (j === i ? v : p)));
                  }}
                  placeholder={GROUP_UI.pollOptionPlaceholder(i + 1)}
                  className="border-white/15 bg-black/25 text-white placeholder:text-white/35"
                  maxLength={200}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10"
                disabled={pollOptionRows.length >= 10}
                onClick={() => setPollOptionRows((r) => (r.length >= 10 ? r : [...r, '']))}
              >
                {GROUP_UI.pollAddOption}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10"
                disabled={pollOptionRows.length <= 2}
                onClick={() => setPollOptionRows((r) => (r.length <= 2 ? r : r.slice(0, -1)))}
              >
                {GROUP_UI.pollRemoveLastOption}
              </Button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-white/75 hover:bg-white/10 hover:text-white"
                onClick={() => setPollDialogOpen(false)}
              >
                {GROUP_UI.deleteConfirmCancel}
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
                disabled={sendMutation.isPending}
                onClick={handlePublishPoll}
              >
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : GROUP_UI.pollPublish}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={eventShareOpen}
        onOpenChange={(v) => {
          setEventShareOpen(v);
          if (!v) {
            setEventSearchQuery('');
            setEventSearchDebounced('');
          }
        }}
      >
        <DialogContent className="max-h-[min(88dvh,520px)] max-w-md border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>{GROUP_UI.eventShareSheetTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
              placeholder={GROUP_UI.eventShareSearchPlaceholder}
              className="border-white/15 bg-black/25 text-white placeholder:text-white/35"
            />
            <div className="max-h-[min(52dvh,400px)] space-y-4 overflow-y-auto pr-1">
              {ticketsPending || eventListPending ? (
                <div className="flex justify-center py-10" role="status" aria-live="polite">
                  <Loader2 className="h-8 w-8 animate-spin text-white/35" />
                </div>
              ) : (
                <>
                  {ticketEvents.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                        {GROUP_UI.eventShareMyTickets}
                      </p>
                      <ul className="space-y-2">
                        {ticketEvents.map((ev) => (
                          <li key={`g-ev-tk-${ev.id}`}>
                            <button
                              type="button"
                              onClick={() => handleSelectSharedEventGroup(ev)}
                              disabled={sendMutation.isPending}
                              className="flex w-full gap-2.5 rounded-xl border border-white/12 bg-black/22 p-2.5 text-left transition hover:bg-black/32 disabled:opacity-60 [touch-action:manipulation]"
                            >
                              {ev.image ? (
                                <img
                                  src={ev.image}
                                  alt=""
                                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
                                  <CalendarDays className="h-7 w-7 text-white/35" aria-hidden />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-[14px] font-semibold text-white/95">{ev.title}</p>
                                {ev.start_date ? (
                                  <p className="mt-0.5 text-[11px] text-white/45">
                                    {format(new Date(ev.start_date), 'EEE d MMM yyyy · HH:mm', { locale: fr })}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {discoverEvents.length > 0 ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                        {GROUP_UI.eventShareDiscover}
                      </p>
                      <ul className="space-y-2">
                        {discoverEvents.map((ev) => (
                          <li key={`g-ev-pub-${ev.id}`}>
                            <button
                              type="button"
                              onClick={() => handleSelectSharedEventGroup(ev)}
                              disabled={sendMutation.isPending}
                              className="flex w-full gap-2.5 rounded-xl border border-white/12 bg-black/22 p-2.5 text-left transition hover:bg-black/32 disabled:opacity-60 [touch-action:manipulation]"
                            >
                              {ev.image ? (
                                <img
                                  src={ev.image}
                                  alt=""
                                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
                                  <CalendarDays className="h-7 w-7 text-white/35" aria-hidden />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-[14px] font-semibold text-white/95">{ev.title}</p>
                                {ev.start_date ? (
                                  <p className="mt-0.5 text-[11px] text-white/45">
                                    {format(new Date(ev.start_date), 'EEE d MMM yyyy · HH:mm', { locale: fr })}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {!ticketsPending && !eventListPending && ticketEvents.length === 0 && discoverEvents.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/45">{GROUP_UI.eventShareEmpty}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div
        className="fixed left-0 right-0 z-40 border-t border-white/[0.06] bg-[#070a12]/96 backdrop-blur-xl"
        style={COMPOSER_STYLE}
      >
        {replyTarget && (
          <div className="mx-auto flex max-w-3xl items-center gap-2 border-b border-white/[0.06] px-3 py-2">
            <div className="min-w-0 flex-1 rounded-xl border-l-[3px] border-l-emerald-400/60 bg-white/[0.05] py-1.5 pl-3 pr-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{GROUP_UI.replyingTo}</p>
              <p className="truncate text-[13px] text-white/75">{groupReplySnippet(replyTarget)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full text-white/70 hover:bg-white/[0.08] hover:text-white"
              aria-label={GROUP_UI.cancelReply}
              onClick={() => setReplyTarget(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {showSchedule && (
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-[22px] border border-white/10 bg-[#0b1019]/96 px-3 py-2 text-white shadow-[0_10px_28px_rgba(2,6,23,0.18)]">
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={toDatetimeLocalInputValue(new Date())}
              className="rounded-xl border-white/12 bg-white/[0.04] text-sm text-white"
            />
            <button
              type="button"
              className="text-sm text-white/60 hover:text-white"
              aria-label="Fermer la programmation"
              onClick={() => {
                setShowSchedule(false);
                setScheduledAt('');
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <form
          className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-1 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isRecording && !voiceDraft) handleSend();
          }}
        >
          {voiceDraft && (
            <audio
              ref={previewAudioRef}
              src={voiceDraft.objectUrl}
              className="hidden"
              preload="metadata"
              onPlay={() => setPreviewPlaying(true)}
              onPause={() => setPreviewPlaying(false)}
              onEnded={() => setPreviewPlaying(false)}
            />
          )}
          {isRecording ? (
            <div className="flex flex-col gap-1.5 rounded-[30px] border border-white/10 bg-[#0a1220]/94 px-3 py-2.5 shadow-[0_18px_40px_rgba(2,6,23,0.22)] backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.08]"
                  onClick={cancelRecording}
                  aria-label={VOICE_LABELS.discardVoice}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 font-mono text-sm tabular-nums text-emerald-400">
                    {formatRecordingClock(recordingSeconds)}
                  </span>
                  <div className="flex h-4 min-w-0 flex-1 items-center gap-0.5 overflow-hidden opacity-80">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <span key={`gr-${i}`} className="h-1 w-1 shrink-0 rounded-full bg-white/28" />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/25 text-red-200 hover:bg-red-500/35"
                  onClick={stopRecording}
                  aria-label={VOICE_LABELS.stopRecording}
                >
                  <Square className="h-5 w-5 fill-current" />
                </button>
              </div>
              <p className="px-1 text-center text-[11px] text-white/40">{VOICE_LABELS.recording}</p>
            </div>
          ) : voiceDraft ? (
            <div className="flex items-center gap-2 rounded-[30px] border border-white/10 bg-[#0a1220]/94 px-2.5 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.22)] backdrop-blur-xl">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]"
                onClick={togglePreviewPlayback}
                aria-label={previewPlaying ? VOICE_LABELS.pausePreview : VOICE_LABELS.playPreview}
              >
                {previewPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex h-4 min-w-0 flex-1 items-center gap-0.5 overflow-hidden opacity-80">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span key={`gv-${i}`} className="h-1 w-1 shrink-0 rounded-full bg-white/28" />
                  ))}
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums text-white/88">
                  {formatRecordingClock(voiceDraft.durationSec)}
                </span>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.08]"
                onClick={clearVoiceDraft}
                aria-label={VOICE_LABELS.discardVoice}
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <Button
                type="button"
                disabled={voiceUploading || sendMutation.isPending || !group}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={() => sendVoiceDraft()}
                aria-label={VOICE_LABELS.sendVoice}
              >
                {voiceUploading || sendMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 h-12 w-12 shrink-0 rounded-full text-white/75 hover:bg-white/[0.08] hover:text-white"
                aria-label="Joindre un document"
                disabled={documentUploadMutation.isPending || mediaUploadMutation.isPending || !group}
                onClick={() => documentInputRef.current?.click()}
              >
                {documentUploadMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 h-12 w-12 shrink-0 rounded-full text-white/75 hover:bg-white/[0.08] hover:text-white"
                aria-label={GROUP_UI.attachPhotoVideo}
                disabled={documentUploadMutation.isPending || mediaUploadMutation.isPending || sendMutation.isPending || !group}
                onClick={() => mediaInputRef.current?.click()}
              >
                {mediaUploadMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" strokeWidth={2} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 h-12 w-12 shrink-0 rounded-full text-white/75 hover:bg-white/[0.08] hover:text-white"
                aria-label={GROUP_UI.createPoll}
                disabled={documentUploadMutation.isPending || mediaUploadMutation.isPending || sendMutation.isPending || !group}
                onClick={() => setPollDialogOpen(true)}
              >
                <BarChart2 className="h-5 w-5" strokeWidth={2} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 h-12 w-12 shrink-0 rounded-full text-white/75 hover:bg-white/[0.08] hover:text-white"
                aria-label={GROUP_UI.shareEvent}
                disabled={documentUploadMutation.isPending || mediaUploadMutation.isPending || sendMutation.isPending || !group}
                onClick={() => setEventShareOpen(true)}
              >
                <CalendarDays className="h-5 w-5" strokeWidth={2} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mb-0.5 h-12 w-12 shrink-0 rounded-full text-white/75 hover:bg-white/[0.08] hover:text-white"
                aria-label={GROUP_UI.scheduleSend}
                disabled={documentUploadMutation.isPending || mediaUploadMutation.isPending || sendMutation.isPending || !group}
                onClick={() => {
                  setShowSchedule(true);
                  setScheduledAt((prev) => prev || toDatetimeLocalInputValue(new Date(Date.now() + 2 * 60 * 1000)));
                }}
              >
                <Timer className="h-5 w-5" strokeWidth={2} />
              </Button>
              <div className="relative flex min-w-0 flex-1 flex-col rounded-[26px] border border-white/12 bg-[#0f1724]/98 shadow-[0_18px_40px_rgba(2,6,23,0.22)]">
                {mentionPickerOpen && mentionCandidates.length > 0 ? (
                  <div
                    className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-[min(200px,40dvh)] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0c121c] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                    role="listbox"
                    aria-label={GROUP_UI.mentionMembersTitle}
                  >
                    {mentionCandidates.map((mem) => {
                      const un = mem.username?.trim();
                      if (!un) return null;
                      const label = mem.full_name || un;
                      const initial = (label[0] || '?').toUpperCase();
                      return (
                        <button
                          key={mem.id}
                          type="button"
                          role="option"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/[0.08] [touch-action:manipulation]"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            insertMentionUsername(un);
                          }}
                        >
                          <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                            <AvatarImage src={mem.profile_image || undefined} />
                            <AvatarFallback className="rounded-lg bg-white/10 text-[10px] text-white">{initial}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{label}</p>
                            <p className="truncate text-[11px] text-white/45">@{un}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : mentionPickerOpen ? (
                  <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-xl border border-white/[0.08] bg-[#0c121c] px-3 py-2 text-center text-xs text-white/45">
                    {GROUP_UI.mentionNoMatch}
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-1 items-center px-3 py-1">
                  <Input
                    ref={messageComposerInputRef}
                    placeholder="Votre message… (@pseudo)"
                    value={input}
                    onChange={handleInputChange}
                    enterKeyHint="send"
                    className="min-h-[48px] border-0 bg-transparent text-[16px] text-white placeholder:text-white/35 focus-visible:ring-0 sm:text-[15px]"
                    disabled={sendMutation.isPending || mediaUploadMutation.isPending || !group}
                  />
                </div>
              </div>
              {input.trim() ? (
                <Button
                  type="submit"
                  size="icon"
                  disabled={sendMutation.isPending || mediaUploadMutation.isPending || !group}
                  className="mb-0.5 h-12 w-12 shrink-0 rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600"
                  aria-label="Envoyer"
                >
                  {sendMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              ) : (
                <button
                  type="button"
                  className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.97] disabled:opacity-50"
                  onClick={() => startRecording()}
                  disabled={sendMutation.isPending || mediaUploadMutation.isPending || !group}
                  aria-label={VOICE_LABELS.recordVoice}
                >
                  <Mic className="h-6 w-6" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
