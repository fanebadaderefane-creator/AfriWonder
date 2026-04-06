import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FILE_ACCEPT_MEDIA } from '@/lib/fileAccept';
import {
  assertChatMediaFile,
  assertChatDocumentFile,
  isPayloadTooLargeError,
} from '@/lib/chatUploadLimits';
import { compressImageFileForChat } from '@/lib/chatImageCompress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Camera, Loader2, Mic, Square, Play, Pause, MoreVertical, ShieldBan, Flag, Trash2, Reply, Copy, Forward, Pin, Star, CheckSquare, Plus, Search, X, Phone, Video, MapPin, UserPlus, Timer, TimerOff, MessageCircle, Sticker, Languages, Users, UserCircle, Image as ImageIcon, BellOff, Bell, Sparkles, Link2, ListPlus, MoreHorizontal, Pencil, UserMinus, FileText, CalendarDays, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useConversationSocket } from '@/hooks/useMessageSocket';
import { useTranslation } from '@/components/common/useTranslation';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { ChatVoiceMessage } from '@/components/chat/ChatVoiceMessage';
import { ChatFormattedText, stripChatMarkupForPreview } from '@/components/chat/ChatFormattedText';
import { MessageReceiptTicks } from '@/components/chat/MessageReceiptTicks';
import { ChatAttachmentSheet, ChatStickerComposerSheet } from '@/components/chat/ChatPremiumSheets';
import { ChatCameraSheet } from '@/components/chat/ChatCameraSheet';
import { ChatCameraPreviewSheet } from '@/components/chat/ChatCameraPreviewSheet';
import {
  ensureE2eeBootstrap,
  buildE2eeEnvelopeForRecipient,
  syncAndDecryptDmEnvelopes,
  getCurrentE2eeDeviceId,
  getLocalE2eeDeviceHealth,
  repairLocalE2eeDevice,
  E2EE_STRICT_MODE,
} from '@/lib/e2eeClient';
import { getConversationPeerId, getChatSearchIdentifiers } from '@/lib/messagingRoutes';
import { downloadPlainTextFile, formatDmConversationToPlainText } from '@/lib/messagingExportPlainText';
import {
  getCachedConversations,
  findCachedConversation,
  findCachedConversationByPeer,
  cacheConversations,
  getCachedMessages,
  cacheMessages,
  upsertCachedConversation,
  getOutbox,
  processOutbox,
  queueOutboxItem,
  removeOutboxItem,
} from '@/services/offlineProfilesMessages.service';

const MESSAGES_LIMIT = 30;

const chatI18n = {
  fr: {
    loadOlderError: 'Impossible de charger plus de messages',
    sendSuccess: 'Message envoye',
    sendError: "Erreur lors de l'envoi",
    selectImage: 'Veuillez selectionner une image',
    selectMedia: 'Veuillez selectionner une photo ou une video',
    imageMessage: 'Photo',
    videoMessage: 'Video',
    attachMedia: 'Photo ou video',
    composerEmoji: 'Emoji',
    composerMoreOptions: "Plus d'options",
    composerRecordVoice: 'Enregistrer un message vocal',
    composerSend: 'Envoyer le message',
    uploadError: "Erreur d'envoi du media",
    uploadPayloadTooLarge: 'Fichier trop volumineux pour le serveur.',
    fileTooLargeMedia: (maxMb) =>
      `Fichier trop volumineux. Maximum ${maxMb} Mo pour les photos, vidéos et messages vocaux.`,
    fileTooLargeDocument: (maxMb) => `Document trop volumineux. Maximum ${maxMb} Mo.`,
    selectConversation: 'Selectionnez une conversation depuis Messages.',
    backToMessages: 'Retour aux messages',
    online: 'En ligne',
    offline: 'Hors ligne',
    typingSuffix: 'est en train d’écrire…',
    recordingSuffix: 'enregistre un message vocal…',
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
    voiceTooShort: 'Enregistrement trop court.',
    voiceEmptyError: 'Aucun son enregistre — verifiez le micro.',
    voiceUnsupported: 'Vocal indisponible sur ce navigateur.',
    discardVoice: 'Supprimer le vocal',
    stopRecording: 'Terminer lenregistrement',
    sendVoice: 'Envoyer le vocal',
    playPreview: 'Ecouter',
    pausePreview: 'Pause',
    voiceSkipBack: 'Reculer de 10 secondes',
    voiceSkipForward: 'Avancer de 10 secondes',
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
    repliedToYou: 'Vous a répondu',
    replyInThread: 'En réponse à',
    replyToSelf: 'Réponse à votre message',
    superReactionHint: 'Appuyez longuement pour envoyer une super réaction',
    addSticker: 'Ajouter un sticker',
    translate: 'Traduire',
    translateTitle: 'Traduction',
    translateNoText: 'Ce message ne contient pas de texte a traduire.',
    translateFailed: 'Traduction impossible pour le moment.',
    translateOriginalLabel: 'Message original',
    translateResultLabel: 'Traduction',
    translateCopy: 'Copier la traduction',
    translateClose: 'Fermer',
    translateLoading: 'Traduction en cours...',
    translateDetected: 'Langue du message',
    messageMenuMore: 'Fermer',
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
    comingSoonPremium: 'Fonction prévue dans une prochaine mise à jour.',
    selectModeOn: 'Mode selection active',
    reactionAdded: 'Reaction ajoutee',
    copy: 'Copier',
    transferTo: 'Transferer a',
    transferSearchPlaceholder: 'Rechercher utilisateur (@nom ou nom)',
    transferNoUser: 'Aucun utilisateur trouve',
    transferSuccess: 'Message transfere',
    transferError: 'Impossible de transferer',
    forwardOneRecipientHint:
      'Choisissez un destinataire à la fois (comme WhatsApp). Répétez l’opération pour envoyer à d’autres personnes.',
    cancelScheduledSend: 'Annuler l’envoi programmé',
    confirmCancelScheduledTitle: 'Annuler ce message programmé ?',
    confirmCancelScheduledDesc: 'Il ne sera pas envoyé à l’heure prévue.',
    cancelScheduledSuccess: 'Envoi programmé annulé',
    pinned: 'Epingle',
    unpinned: 'Desepingle',
    deleteForAll: 'Supprimer pour tous',
    deleteForAllConfirm: 'Supprimer ce message pour tout le monde ? (possible uniquement dans les 15 min)',
    deleteForAllSuccess: 'Message supprimé pour tous',
    deleteForAllError: 'Impossible (délai dépassé ou message inexistant)',
    reactionsDetailTitle: 'Réactions',
    reactionsDetailEmpty: 'Aucune réaction',
    reactionsDetailYou: 'Vous',
    transcribeVoice: 'Transcrire',
    transcribingVoice: 'Transcription…',
    transcribeVoiceError: 'Transcription impossible pour le moment.',
    pinnedMessage: 'Message épinglé',
    ephemeralMode: 'Disparaît après lecture',
    viewOnceTapToOpen: 'Appuyer pour ouvrir',
    viewOnceOpenedHint: 'Vue unique — média déjà ouvert',
    viewOnceClose: 'Fermer',
    shareLocation: 'Partager ma position',
    shareContact: 'Partager un contact',
    locationMessage: 'Position',
    contactMessage: 'Contact partagé',
    markedImportant: 'Marque important',
    unmarkedImportant: 'Important retire',
    voiceCall: 'Appel vocal',
    videoCall: 'Appel video',
    openingCall: 'Ouverture de l appel...',
    attachmentSheetTitle: 'Partager un contenu',
    attachGallery: 'Galerie',
    attachCameraPhoto: 'Photo',
    attachCameraVideo: 'Video',
    attachDocument: 'Document',
    attachLocation: 'Localisation',
    attachContact: 'Contact',
    attachAudio: 'Audio',
    attachSchedule: 'Programmer',
    scheduleMustBeFuture: 'Choisissez une date et une heure dans le futur.',
    attachEphemeral: 'Temporaire',
    attachPoll: 'Sondage',
    pollDialogTitle: 'Nouveau sondage',
    pollQuestionPlaceholder: 'Votre question…',
    pollOptionPlaceholder: (n) => `Option ${n}`,
    pollAddOption: 'Ajouter une option',
    pollRemoveLastOption: 'Retirer la dernière option',
    pollPublish: 'Publier',
    pollValidationError: 'Question et au moins 2 options non vides requises.',
    pollVotes: (n) => `${n} vote${n > 1 ? 's' : ''}`,
    pollVoteError: 'Vote impossible.',
    attachEvent: 'Evenement',
    eventShareSheetTitle: 'Partager un événement',
    eventShareSearchPlaceholder: 'Rechercher un événement…',
    eventShareEmpty: 'Aucun événement à afficher.',
    eventShareMyTickets: 'Mes billets',
    eventShareDiscover: 'Événements publics',
    eventOpenDetails: 'Voir l’événement',
    eventShareError: 'Impossible de charger les événements.',
    attachAiImages: 'Images IA',
    attachAudioHint: 'Utilisez le micro vert a droite pour un message vocal.',
    documentSendError: 'Envoi du document impossible.',
    ephemeralOn: 'Mode temporaire active',
    ephemeralOff: 'Mode temporaire desactive',
    stickerSheetTitle: 'Stickers et emoji',
    tabSearch: 'Rechercher',
    tabEmoji: 'Emoji',
    tabGif: 'GIF',
    tabSticker: 'Stickers',
    stickerSearchPlaceholder: 'Rechercher un emoji...',
    gifSearchPlaceholder: 'Rechercher un GIF…',
    gifLoadError: 'Impossible de charger les GIF. Vérifiez la clé API ou réessayez.',
    gifComingSoon:
      'GIF : ajoutez VITE_GIPHY_API_KEY (clé gratuite sur giphy.com) dans .env puis reconstruisez l’app.',
    stickerCreate: 'Creer',
    stickerCreateSoon: 'Creation de stickers personnalises bientot disponible.',
    composerStickers: 'Stickers et emoji',
    /** Bouton caméra dans la barre (comme WhatsApp) — ouvre l’appareil ; galerie / reste via le trombone */
    composerCamera: 'Caméra',
    menuNewGroup: 'Nouveau groupe',
    menuViewContact: 'Afficher le contact',
    menuSearch: 'Rechercher',
    menuMediaLinksDocs: 'Médias, liens et documents',
    menuMute: 'Mode silencieux',
    menuUnmute: 'Réactiver les notifications',
    menuEphemeralOn: 'Messages éphémères (activé par défaut)',
    menuEphemeralOff: 'Messages éphémères (désactivé)',
    menuEphemeralTitle: 'Messages éphémères',
    ephemeralDurationOff: 'Désactivé',
    ephemeral24h: '24 heures',
    ephemeral7d: '7 jours',
    ephemeral90d: '90 jours',
    messageEditedTag: 'modifié',
    messageEditedSuccess: 'Message modifié',
    editMessage: 'Modifier',
    editMessageTitle: 'Modifier le message',
    editMessageSave: 'Enregistrer',
    editMessagePlaceholder: 'Votre message…',
    menuChatTheme: 'Thème de la discussion',
    menuMore: 'Plus',
    menuReport: 'Signaler',
    menuBlock: 'Bloquer',
    menuClearChat: 'Effacer le contenu',
    menuAddShortcut: 'Ajouter un raccourci',
    menuAddToList: 'Ajouter à la liste',
    menuExportChat: 'Enregistrer cette discussion',
    exportChatSuccess: 'Fichier enregistré — ouvrez votre dossier Téléchargements',
    exportChatError: 'Enregistrement impossible pour le moment',
    menuThemeDefault: 'AfriWonder (par défaut)',
    menuThemePattern: 'Motif discret',
    menuThemeMidnight: 'Minuit bleu',
    confirmClearChatTitle: 'Effacer le contenu ?',
    confirmClearChatDesc: 'Les messages disparaîtront de cet appareil pour vous. L’autre personne conserve son historique.',
    clearChatSuccess: 'Contenu effacé',
    clearChatError: 'Impossible d’effacer le contenu',
    muteChatSuccess: 'Conversation en mode silencieux',
    unmuteChatSuccess: 'Notifications réactivées',
    muteChatError: 'Impossible de modifier les notifications',
    shortcutCopied: 'Lien copié — ajoutez-le à l’écran d’accueil depuis le menu du navigateur',
    addedToFavorites: 'Ajouté à votre liste',
    alreadyInFavorites: 'Déjà dans votre liste',
    searchInChatPlaceholder: 'Rechercher dans la conversation…',
    mediaLinksDocsTitle: 'Médias, liens et documents',
    tabMedia: 'Médias',
    tabLinks: 'Liens',
    tabDocs: 'Documents',
    noMediaYet: 'Aucun média dans cette discussion',
    noLinksYet: 'Aucun lien détecté',
    noDocsYet: 'Aucun document dans cette discussion',
    noSearchResults: 'Aucun message ne correspond à votre recherche.',
    chatHeaderMenuAria: 'Options de la discussion',
    spoilerTapReveal: 'Texte masqué — appuyer pour afficher',
    scheduledMessageShort: 'Envoi programmé',
    formattingComposerHint:
      'Astuce : *gras* _italique_ ~barré~ ~~barré~~ `code` ||spoiler|| ou [[spoiler]]texte[[/spoiler]] — appuyer pour révéler',
    draftComposerLabel: 'Brouillon',
    draftSaving: 'enregistrement…',
    sending: 'Envoi en cours',
    sendFailed: 'Échec de l’envoi — réessayez',
    retrySend: 'Réessayer',
    messageStatusSent: 'Envoyé au serveur',
    messageStatusDelivered: 'Délivré sur l’appareil du destinataire',
  },
  bm: {
    loadOlderError: 'Se ka mesaji koro korow soro te',
    sendSuccess: 'Mesaji ci',
    sendError: 'Mesaji ci ye te se',
    selectImage: 'I ka ja beenin do sugandi',
    selectMedia: 'I ka ja walima videyo sugandi',
    imageMessage: 'Ja',
    videoMessage: 'Videyo',
    attachMedia: 'Ja walima videyo',
    composerEmoji: 'Emoji',
    composerMoreOptions: 'Wɛrɛw',
    composerRecordVoice: 'Vocal ta',
    composerSend: 'Mesaji ci',
    uploadError: 'Ja ci ye te se',
    uploadPayloadTooLarge: 'Faila in bon kosɛbɛ — serveur ma se ka minɛ.',
    fileTooLargeMedia: (maxMb) => `Faila in bon. ${maxMb} Mo faralen tɛ ja, videyo ani vocal la.`,
    fileTooLargeDocument: (maxMb) => `Dokumɛnti in bon. ${maxMb} Mo faralen tɛ.`,
    selectConversation: 'I ka barokan do sugandi Messages kono.',
    backToMessages: 'Segin ka taa mesajiw ma',
    online: 'A be yan',
    offline: 'A te yan',
    typingSuffix: 'be sɛbɛnni na...',
    recordingSuffix: 'bɛ vocal ta...',
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
    voiceTooShort: 'A surun surun.',
    voiceEmptyError: 'Kan si — aw mikro lajɛ.',
    voiceUnsupported: 'Vocal ina nin browser in na.',
    discardVoice: 'Vocal bila',
    stopRecording: 'Dan ban',
    sendVoice: 'Vocal ci',
    playPreview: 'Mɛn',
    pausePreview: 'Dalan',
    voiceSkipBack: 'Segin ka taa 10 s',
    voiceSkipForward: 'Taa ɲɛ 10 s',
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
    repliedToYou: 'I y jaabi aw ma',
    replyInThread: 'Jaabi',
    replyToSelf: 'I ka mesaji jaabi',
    superReactionHint: 'A digi ka super reaction ci',
    addSticker: 'Sticker fara',
    translate: 'Ka bayɛlɛma',
    translateTitle: 'Bayɛlɛma',
    translateNoText: 'Sɛbɛn si te nin mesaji in na ka bayɛlɛma.',
    translateFailed: 'A ma se ka bayɛlɛma sisan.',
    translateOriginalLabel: 'Jɔyɔrɔ sɛbɛn',
    translateResultLabel: 'Bayɛlɛmalen',
    translateCopy: 'Bayɛlɛmalen copy',
    translateClose: 'Da',
    translateLoading: 'Bayɛlɛma bɛ sen...',
    translateDetected: 'Mesaji kan',
    messageMenuMore: 'Da',
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
    comingSoonPremium: 'Nata fɛn bɛ na waati dɔ la.',
    selectModeOn: 'Sugandi mode dafalen',
    reactionAdded: 'Reaction fara',
    copy: 'Copier',
    transferTo: 'Ka ci ma',
    transferSearchPlaceholder: 'Mogo yiriwa (@nom wala nom)',
    transferNoUser: 'Mogo si te soro',
    transferSuccess: 'Mesaji kafi',
    transferError: 'A ma se ka kafi',
    forwardOneRecipientHint: 'Mɔgɔ kelen sugandi ten ten (WhatsApp cogo). Wɛrɛw ye ka segin ka kɛ.',
    cancelScheduledSend: 'Waati min na ka ci — ka bɔ',
    confirmCancelScheduledTitle: 'Waati min na ka ci — ka bɔ wa ?',
    confirmCancelScheduledDesc: 'A tɛna ci waati min na.',
    cancelScheduledSuccess: 'Waati min na ka ci bannen',
    pinned: 'Sinsinnen',
    unpinned: 'Sinsinbali',
    deleteForAll: 'Ka bo bɛɛ ma',
    deleteForAllConfirm: 'Ka mesaji nin bo bɛɛ ma? (15 min kono doro)',
    deleteForAllSuccess: 'Mesaji bora bɛɛ ma',
    deleteForAllError: 'A ma se (waati tigi wala mesaji te)',
    reactionsDetailTitle: 'Reactions',
    reactionsDetailEmpty: 'Reaction si te',
    reactionsDetailYou: 'Aw',
    transcribeVoice: 'Ka sɛbɛn',
    transcribingVoice: 'Sɛbɛnni bɛ sen...',
    transcribeVoiceError: 'Sɛbɛnni ma se sisan.',
    pinnedMessage: 'Mesaji sinsin',
    ephemeralMode: 'Ka bila kalanden',
    viewOnceTapToOpen: 'Ka digi ka yɛlɛn',
    viewOnceOpenedHint: 'Kalan kelen — ja in yɛrɛ tɛ yen tuguni',
    viewOnceClose: 'Da',
    shareLocation: 'N so sigida ci',
    shareContact: 'Mogo ci',
    locationMessage: 'Sigida',
    contactMessage: 'Mogo ci',
    markedImportant: 'Muhimu taara',
    unmarkedImportant: 'Muhimu bo',
    voiceCall: 'Vocal call',
    videoCall: 'Video call',
    openingCall: 'Appel b i na...',
    attachmentSheetTitle: 'Fɛn ci',
    attachGallery: 'Galerie',
    attachCameraPhoto: 'Ja',
    attachCameraVideo: 'Videyo',
    attachDocument: 'Dokumɛnti',
    attachLocation: 'Sigida',
    attachContact: 'Mogo',
    attachAudio: 'Kan',
    attachSchedule: 'Waati sigi',
    scheduleMustBeFuture: 'I ka tile ni waati min bɛna na tile fɛ.',
    attachEphemeral: 'Tɛmɛnnen',
    attachPoll: 'Ɲininkali',
    pollDialogTitle: 'Ɲininkali kura',
    pollQuestionPlaceholder: 'I ka ɲinini…',
    pollOptionPlaceholder: (n) => `Sugandi ${n}`,
    pollAddOption: 'Sugandi wɛrɛ fara',
    pollRemoveLastOption: 'Laban sugandi bɔ',
    pollPublish: 'Ci',
    pollValidationError: 'Ɲinini ni sugandi 2 min bɛɛ ka kan ka sɔrɔ.',
    pollVotes: (n) => `Ɲininikɛla ${n}`,
    pollVoteError: 'Ɲininike ma se.',
    attachEvent: 'Ko',
    eventShareSheetTitle: 'Ko ci',
    eventShareSearchPlaceholder: 'Ko yiriwa…',
    eventShareEmpty: 'Ko si te yen.',
    eventShareMyTickets: 'Ne ticketw',
    eventShareDiscover: 'Kow jɛɲɔgɔnw',
    eventOpenDetails: 'Ko lajɛ',
    eventShareError: 'Kow ma se ka doni.',
    attachAiImages: 'AI ja',
    attachAudioHint: 'I ka mikro jɔlen taama fo vocal la.',
    documentSendError: 'Dokumɛnti ci ma se.',
    ephemeralOn: 'Tɛmɛnnen mode dafalen',
    ephemeralOff: 'Tɛmɛnnen mode bannen',
    stickerSheetTitle: 'Sticker ni emoji',
    tabSearch: 'Yiriwa',
    tabEmoji: 'Emoji',
    tabGif: 'GIF',
    tabSticker: 'Sticker',
    stickerSearchPlaceholder: 'Emoji yiriwa...',
    gifSearchPlaceholder: 'GIF yiriwa…',
    gifLoadError: 'GIFw ma se ka doni.',
    gifComingSoon: 'GIF : VITE_GIPHY_API_KEY fara .env la (giphy.com), o kɔ app labɛn.',
    stickerCreate: 'Da',
    stickerCreateSoon: 'I yɛrɛ sticker dafalen bɛ na.',
    composerStickers: 'Sticker ni emoji',
    composerCamera: 'Kamera',
    menuNewGroup: 'Kulu kura',
    menuViewContact: 'Mogo lajɛ',
    menuSearch: 'Yiriwa',
    menuMediaLinksDocs: 'Ja, ɛnterɛnɛti, dokumɛnti',
    menuMute: 'Kan tɛmɛnnen',
    menuUnmute: 'Ladilikan segin',
    menuEphemeralOn: 'Mesaji tɛmɛnnen (dafalen)',
    menuEphemeralOff: 'Mesaji tɛmɛnnen (bannen)',
    menuEphemeralTitle: 'Mesaji tɛmɛnnen',
    ephemeralDurationOff: 'Bannen',
    ephemeral24h: '24 h',
    ephemeral7d: '7 don',
    ephemeral90d: '90 don',
    messageEditedTag: 'yɛlɛmana',
    messageEditedSuccess: 'Mesaji yɛlɛmana',
    editMessage: 'Yɛlɛma',
    editMessageTitle: 'Mesaji yɛlɛma',
    editMessageSave: 'Marisa',
    editMessagePlaceholder: 'Aw ka mesaji…',
    menuChatTheme: 'Barokan jɛmɛ',
    menuMore: 'Wɛrɛw',
    menuReport: 'Laben',
    menuBlock: 'Da',
    menuClearChat: 'Kunnafoni bila',
    menuAddShortcut: 'Sira surun fara',
    menuAddToList: 'Liste fara',
    menuExportChat: 'Barokan in marisa',
    exportChatSuccess: 'Fichier bɔra — aw ka yɛlɛn ka doni ninnu lajɛ',
    exportChatError: 'Marisa ma se sisan',
    menuThemeDefault: 'AfriWonder',
    menuThemePattern: 'Jɛmɛ surun',
    menuThemeMidnight: 'Sufɛ bulu',
    confirmClearChatTitle: 'Kunnafoni bila wa?',
    confirmClearChatDesc: 'Aw yɛrɛ ye aw ka mesaji ninnu tɛ ye tuguni nin jago in na.',
    clearChatSuccess: 'Kunnafoni bila',
    clearChatError: 'A ma se ka bila',
    muteChatSuccess: 'Kan tɛmɛnnen',
    unmuteChatSuccess: 'Ladilikan seginna',
    muteChatError: 'A ma se ka ladilikan waleya',
    shortcutCopied: 'Lien copy — aw ka browser menu la aw ka home screen fara',
    addedToFavorites: 'Liste la fara',
    alreadyInFavorites: 'A bɛ liste la kaban',
    searchInChatPlaceholder: 'Barokan kono yiriwa…',
    mediaLinksDocsTitle: 'Ja, ɛnterɛnɛti, dokumɛnti',
    tabMedia: 'Ja',
    tabLinks: 'Lienw',
    tabDocs: 'Dokumɛnti',
    noMediaYet: 'Ja si te barokan in na',
    noLinksYet: 'Lien si te',
    noDocsYet: 'Dokumɛnti si nin barokan in na',
    noSearchResults: 'Mesaji si te bɛ i ka yiriwali ma.',
    chatHeaderMenuAria: 'Barokan ɲɛnajɛw',
    spoilerTapReveal: 'Dogolen — a digi ka yira',
    scheduledMessageShort: 'Waati min na ka ci',
    formattingComposerHint:
      '*fanga* _slanted_ ~bɔ~ ~~bɔ~~ `kɔd` ||dogolen|| walima [[spoiler]]kuma[[/spoiler]] — ɲɛnajɛ ka yira',
    draftComposerLabel: 'Draft',
    draftSaving: 'bɛ bɛ wele…',
    sending: 'A bɛ ci',
    sendFailed: 'Ci ma se',
    retrySend: 'Segin ka ci',
    messageStatusSent: 'Ci ka taa serveur ma',
    messageStatusDelivered: 'Sɔrɔla jɔyɔrɔ min na',
  },
};

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"')]+/gi;
const CHAT_WALLPAPER_STORAGE = 'aw-chat-wallpaper-theme';
const CHAT_FAVORITES_STORAGE = 'aw-inbox-favorite-user-ids';

function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const m = text.match(URL_IN_TEXT_RE);
  return m ? [...new Set(m)] : [];
}

/** `min` / valeur initiale pour `<input type="datetime-local">` (heure locale, pas UTC). */
function toDatetimeLocalInputValue(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Ordre proche d’Instagram DM */
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];
const EMOJI_LIBRARY = ['😀', '😃', '😄', '😁', '😆', '🥲', '😂', '🤣', '😊', '😉', '😍', '😘', '😎', '🤩', '🥳', '🤔', '🤗', '😴', '😡', '😭', '👍', '👎', '👏', '🙌', '🙏', '💪', '🔥', '✨', '💙', '❤️', '💯', '🎉', '🌍', '🇲🇱', '🇸🇳', '🇨🇮'];
/** Réactions avec animation renforcée (style « confettis » léger côté UI). */
const REACTION_BURST_EMOJIS = new Set(['🎉', '🎊', '✨', '🥳', '❤️', '🔥', '💖', '💯']);
const EPHEMERAL_TTL_SECONDS = {
  H24: 86400,
  D7: 604800,
  D90: 7776000,
};

function canEditTextMessage(msg, currentUserId) {
  if (!msg || !currentUserId || msg._localPending) return false;
  if (msg.sender_id !== currentUserId) return false;
  if (String(msg.type || 'text').toLowerCase() !== 'text') return false;
  if (msg.is_deleted) return false;
  const c = String(msg.content || '');
  if (c === 'Ce message a été supprimé') return false;
  if (!msg.created_at) return false;
  return Date.now() - new Date(msg.created_at).getTime() < 15 * 60 * 1000;
}

function formatMessageActionsTimestamp(iso, loc = fr) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (isToday(d)) return `Aujourd'hui ${format(d, 'HH:mm', { locale: loc })}`;
  if (isYesterday(d)) return `Hier ${format(d, 'HH:mm', { locale: loc })}`;
  return format(d, 'd MMM yyyy · HH:mm', { locale: loc });
}

/** Libellé au-dessus du message cité (style fil Instagram). */
function getReplyThreadLabel(msg, isOwn, currentUserId, otherUser, labels) {
  const rt = msg?.reply_to;
  if (!rt) return '';
  const parentFromMe = String(rt.sender_id) === String(currentUserId);
  if (!isOwn && parentFromMe) return labels.repliedToYou;
  if (isOwn && parentFromMe) return labels.replyToSelf;
  const n = rt.sender?.full_name || rt.sender?.username || otherUser?.full_name || otherUser?.username || '';
  return `${labels.replyInThread} ${n || '…'}`.trim();
}

/** Aperçu texte d’un message cité (photo, vidéo, vocal, etc.). */
function getReplySnippet(rt, labels) {
  if (!rt) return '';
  const t = String(rt.type || 'text').toLowerCase();
  if (t === 'voice' || t === 'audio') return labels.voiceMessage;
  if (t === 'video') return labels.videoMessage;
  if (t === 'image') return labels.imageMessage;
  if (t === 'sticker') return labels.addSticker;
  if (t === 'location') return labels.locationMessage;
  if (t === 'contact') return rt.contact_name || labels.contactMessage;
  if (t === 'file') return labels.attachDocument;
  if (t === 'poll') return labels.attachPoll;
  if (t === 'event') return labels.attachEvent;
  const c = rt.content;
  if (typeof c === 'string' && c.trim()) return stripChatMarkupForPreview(c.trim());
  return '…';
}

const CHAT_PAGE_BG = 'bg-[#070a12]';
const CHAT_SECTION = 'rounded-[28px] bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl';
/** Cartes / modales (même famille que Messagerie) */
const CHAT_SURFACE = CHAT_SECTION;

/** Composer fixe : zone pouce + encoches (viewport-fit=cover). */
const COMPOSER_BAR_STYLE = {
  bottom: 0,
  paddingBottom: 'max(1.75rem, calc(env(safe-area-inset-bottom, 0px) + 28px))',
  paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
};
const CHAT_ICON_BUTTON = 'rounded-full bg-white/[0.06] text-white/85 hover:bg-white/[0.10] hover:text-white';

function pickAudioRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
  ];
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return '';
}

function extensionForVoiceBlob(mime) {
  const m = (mime || '').toLowerCase();
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'm4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
}

function formatRecordingClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function ChatLoadingState({ label = 'Chargement...' }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4">
      <div className={cn('rounded-[28px] p-4', CHAT_SECTION)}>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/10 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-32 rounded-full bg-white/12 animate-pulse" />
            <div className="h-3 w-20 rounded-full bg-white/8 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="ml-auto h-16 w-[72%] rounded-[24px] bg-white/10 animate-pulse" />
          <div className="h-16 w-[62%] rounded-[24px] bg-white/8 animate-pulse" />
          <div className="ml-auto h-20 w-[78%] rounded-[24px] bg-white/10 animate-pulse" />
        </div>
      </div>
      <p className="text-center text-sm text-white/54">{label}</p>
    </div>
  );
}

function ChatScreenShell({ children, centered = false, wallpaper = 'default' }) {
  return (
    <div className={cn('relative flex h-[100dvh] w-full flex-col overflow-hidden text-white', CHAT_PAGE_BG)}>
      <div className="pointer-events-none absolute inset-0">
        {wallpaper === 'midnight' ? (
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a1628] to-[#020617]" />
        ) : wallpaper === 'pattern' ? (
          <>
            <div className="absolute inset-0 bg-[#dfe8e0]" />
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg,transparent,transparent 11px,rgba(15,118,110,0.08) 11px,rgba(15,118,110,0.08) 12px),repeating-linear-gradient(90deg,transparent,transparent 11px,rgba(15,118,110,0.06) 11px,rgba(15,118,110,0.06) 12px)',
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 10h6v6H8zm20 4h4v4h-4zm16-6h5v5h-5zM12 38h5v5h-5zm24 2h6v6h-6z' fill='%23059669'/%3E%3C/svg%3E")`,
              }}
            />
            {/* Voile sombre pour garder le contraste des bulles blanches / texte clair */}
            <div className="absolute inset-0 bg-[#070a12]/86" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.26),_transparent_34%),linear-gradient(180deg,_#08101f_0%,_#070d18_36%,_#050913_100%)]" />
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
          </>
        )}
      </div>
      <div className={`relative z-10 flex-1 ${centered ? 'flex items-center justify-center p-4' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default function Chat() {
  const { language } = useTranslation();
  const labels = chatI18n[language] || chatI18n.fr;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId: routeUserId, conversationId: routeConversationId } = useMemo(
    () => getChatSearchIdentifiers(searchParams),
    [searchParams]
  );
  const orderId = searchParams.get('orderId') || searchParams.get('_orderId');
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageNodeRefs = useRef(new Map());
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const cameraPhotoInputRef = useRef(null);
  const cameraVideoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const latestVoicePreviewUrlRef = useRef(null);
  const previewAudioRef = useRef(null);
  const longPressTimerRef = useRef(null);
  /** 'scheduled' → toast dédié après DELETE message (annulation envoi programmé). */
  const deleteToastModeRef = useRef('default');

  const { user: currentUser, isAuthenticated, isLoadingAuth } = useAuth();
  /** CDC : sans accusés de lecture, masquer les tics bleus sur ses propres messages. */
  const effectiveOwnReceiptStatus = useCallback(
    (msg) => {
      if (!msg || String(msg.sender_id) !== String(currentUser?.id)) return msg?.status;
      if (currentUser?.messaging_read_receipts_enabled === false && String(msg.status) === 'read') {
        return 'delivered';
      }
      return msg.status;
    },
    [currentUser?.id, currentUser?.messaging_read_receipts_enabled]
  );
  const [messageContent, setMessageContent] = useState('');
  const [conversation, setConversation] = useState(null);
  const [cachedMessagesData, setCachedMessagesData] = useState(null);
  const [olderMessages, setOlderMessages] = useState([]);
  const [cursorForOlder, setCursorForOlder] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
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
  /** Bulles locales pendant l’envoi réseau (horloge ⏳ style WhatsApp). */
  const [outgoingPending, setOutgoingPending] = useState([]);
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
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
  const [cameraSheetOpen, setCameraSheetOpen] = useState(false);
  const [cameraPreviewOpen, setCameraPreviewOpen] = useState(false);
  const [cameraSending, setCameraSending] = useState(false);
  const [documentSending, setDocumentSending] = useState(false);
  const [cameraDraft, setCameraDraft] = useState(null);
  const [composerStickerOpen, setComposerStickerOpen] = useState(false);
  const [composerStickerSearch, setComposerStickerSearch] = useState('');
  const [ephemeralMode, setEphemeralMode] = useState(false);
  const [ephemeralTtlSec, setEphemeralTtlSec] = useState(EPHEMERAL_TTL_SECONDS.H24);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [reactionBurstMessageId, setReactionBurstMessageId] = useState(null);
  const [reactionsDialogOpen, setReactionsDialogOpen] = useState(false);
  const [reactionsDialogMessageId, setReactionsDialogMessageId] = useState(null);
  /** Médias éphémères reçus : après fermeture du plein écran, on n’affiche plus le média (vue unique côté destinataire). */
  const [viewOnceModal, setViewOnceModal] = useState(null); // { id, url, kind: 'image' | 'video' }
  const [viewOnceUiTick, setViewOnceUiTick] = useState(0);
  const viewOnceOpenedSetRef = useRef(new Set());
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [_locationLoading, setLocationLoading] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateOriginal, setTranslateOriginal] = useState('');
  const [translateResult, setTranslateResult] = useState('');
  const [translateDetectedCode, setTranslateDetectedCode] = useState('');
  const [decryptedContentByMessageId, setDecryptedContentByMessageId] = useState({});
  const [e2eeHealth, setE2eeHealth] = useState(null);
  const [e2eeRepairing, setE2eeRepairing] = useState(false);
  const e2eeSyncCursorRef = useRef(null);
  const runDmE2eeSyncRef = useRef(async () => {});

  useEffect(() => {
    if (!currentUser?.id) return;
    ensureE2eeBootstrap(currentUser.id).catch(() => {});
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !(routeUserId || routeConversationId)) return undefined;
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
  }, [currentUser?.id, routeUserId, routeConversationId]);

  const handleE2eeRepair = useCallback(async () => {
    if (!currentUser?.id || e2eeRepairing) return;
    setE2eeRepairing(true);
    try {
      const nextHealth = await repairLocalE2eeDevice(currentUser.id);
      setE2eeHealth(nextHealth);
      if (nextHealth?.healthy) {
        toast.success('Messagerie chiffrée réparée');
      } else {
        toast.warning('Clés E2EE encore faibles, nouvelle tentative bientôt');
      }
      runDmE2eeSyncRef.current?.();
    } catch {
      toast.error('Impossible de réparer le chiffrement pour le moment');
    } finally {
      setE2eeRepairing(false);
    }
  }, [currentUser?.id, e2eeRepairing]);
  const e2eeStatusText = !e2eeHealth
    ? 'Vérification de la protection des messages…'
    : 'Protection des messages à rétablir';

  const [translateError, setTranslateError] = useState(null);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState([]);
  const [chatSearchLoading, setChatSearchLoading] = useState(false);
  const [highlightedSearchMessageId, setHighlightedSearchMessageId] = useState(null);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [mediaGalleryTab, setMediaGalleryTab] = useState('media');
  const [wallpaperTheme, setWallpaperTheme] = useState(() => {
    try {
      return localStorage.getItem(CHAT_WALLPAPER_STORAGE) || 'default';
    } catch {
      return 'default';
    }
  });
  const draftSavedRef = useRef(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUser?.id) return;
    getCachedConversations(currentUser.id)
      .then((cached) => {
        if (cached?.conversations?.length) {
          queryClient.setQueryData(['messages-conversations', currentUser.id], (prev) => prev || { conversations: cached.conversations });
        }
      })
      .catch(() => {});
  }, [currentUser?.id, queryClient]);

  const conversationLookupKey = routeUserId || routeConversationId;

  const { data: conversationData, isLoading: loadingConv, isError: isErrorConv, refetch: refetchConv } = useQuery({
    queryKey: ['conversation', currentUser?.id, conversationLookupKey],
    queryFn: async () => {
      if (routeUserId) return api.messages.getConversation(routeUserId);
      if (routeConversationId) return api.messages.getConversationById(routeConversationId);
      return undefined;
    },
    enabled: !!currentUser?.id && !!conversationLookupKey,
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    /** Depuis la liste Messages : affichage immédiat + id conversation pour charger les messages sans écran bloquant. */
    placeholderData: () => {
      const raw = queryClient.getQueryData(['messages-conversations', currentUser?.id]);
      const list = raw?.conversations ?? [];
      if (routeConversationId) {
        return list.find((c) => String(c?.id ?? '') === String(routeConversationId)) ?? undefined;
      }
      return list.find((c) => String(c?.other?.id ?? '') === String(routeUserId)) ?? undefined;
    },
  });

  useEffect(() => {
    if (conversationData) setConversation(conversationData);
  }, [conversationData]);

  useEffect(() => {
    if (!currentUser?.id || conversationData) return;
    const loader = routeConversationId
      ? findCachedConversation(currentUser.id, routeConversationId)
      : routeUserId
        ? findCachedConversationByPeer(currentUser.id, routeUserId)
        : Promise.resolve(null);
    loader
      .then((cachedConversation) => {
        if (cachedConversation?.id) setConversation(cachedConversation);
      })
      .catch(() => {});
  }, [currentUser?.id, routeConversationId, routeUserId, conversationData]);

  const activeConversation = conversationData ?? conversation;
  const conversationId = activeConversation?.id || routeConversationId;
  const userId = routeUserId || getConversationPeerId(activeConversation, currentUser?.id);

  useEffect(() => {
    if (!currentUser?.id || !activeConversation) return;
    upsertCachedConversation(currentUser.id, activeConversation).catch(() => {});
    const raw = queryClient.getQueryData(['messages-conversations', currentUser.id]);
    const existing = Array.isArray(raw?.conversations) ? raw.conversations : [];
    cacheConversations(
      currentUser.id,
      activeConversation?.id
        ? [activeConversation, ...existing.filter((item) => String(item?.id) !== String(activeConversation.id))]
        : existing
    ).catch(() => {});
  }, [activeConversation, currentUser?.id, queryClient]);

  const { data: peerProfile } = useQuery({
    queryKey: ['chat-peer-profile', userId],
    queryFn: () => api.users.getById(userId),
    enabled: !!userId && !!currentUser?.id,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!currentUser?.id || !conversationId) return undefined;
    let disposed = false;
    let timer = null;
    let idleBackoffMs = 900;
    const run = async () => {
      try {
        const result = await syncAndDecryptDmEnvelopes({
          currentUserId: currentUser.id,
          deviceId: getCurrentE2eeDeviceId(),
          since: e2eeSyncCursorRef.current,
          limit: 150,
          conversationId,
        });
        if (disposed) return;
        if (result?.nextSince) e2eeSyncCursorRef.current = result.nextSince;
        if (result?.byMessageId && Object.keys(result.byMessageId).length) {
          setDecryptedContentByMessageId((prev) => ({ ...prev, ...result.byMessageId }));
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
    runDmE2eeSyncRef.current = run;
    run();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentUser?.id, conversationId]);

  const otherUser = useMemo(() => {
    const c = conversationData ?? conversation;
    let u = null;
    if (c) {
      u =
        c.other
        || (c.user1_id === currentUser?.id ? c.user2 : c.user1)
        || c.user2
        || c.user1
        || null;
    }
    if (u && (u.id || u.username || u.full_name)) return u;
    if (peerProfile?.id) {
      return {
        id: peerProfile.id,
        full_name: peerProfile.full_name,
        username: peerProfile.username,
        profile_image: peerProfile.profile_image || peerProfile.avatar,
      };
    }
    if (userId) return { id: userId, full_name: null, username: null, profile_image: null };
    return null;
  }, [conversationData, conversation, currentUser?.id, peerProfile, userId]);

  const { data: draftData } = useQuery({
    queryKey: ['conversation-draft', conversationId, currentUser?.id],
    queryFn: () => api.messages.getDraft(conversationId),
    enabled: !!conversationId && !!currentUser?.id,
  });
  useEffect(() => {
    if (!conversationId || draftData === undefined) return;
    const content = String(draftData?.draft_content ?? draftData?.content ?? '');
    if (draftSavedRef.current) return;
    draftSavedRef.current = true;
    /** Ne remplir que si le serveur a du texte — évite de réinjecter après effacement local non sync. */
    if (content.length > 0) {
      setMessageContent(content);
    }
  }, [conversationId, draftData]);

  /** Nouvel interlocuteur : champ vide + réhydratation du brouillon depuis le serveur. */
  useEffect(() => {
    draftSavedRef.current = false;
    setMessageContent('');
  }, [conversationLookupKey]);

  const putDraftMutation = useMutation({
    mutationFn: ({ cId, content }) => api.messages.putDraft(cId, content ?? ''),
    onSuccess: (_data, variables) => {
      const { cId, content } = variables;
      queryClient.setQueryData(['conversation-draft', cId, currentUser?.id], {
        draft_content: content,
        content,
      });
      /** Inbox : aperçu « Brouillon · … » à jour sans recharger. */
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser.id] });
      }
    },
  });

  /** Persiste le brouillon y compris chaîne vide (sinon le serveur garde l’ancien texte au prochain chargement). */
  const persistDraft = useCallback(() => {
    if (!conversationId) return;
    putDraftMutation.mutate({ cId: conversationId, content: messageContent.trim() });
  }, [conversationId, messageContent]);

  useEffect(() => {
    if (!conversationId) {
      setCachedMessagesData(null);
      return;
    }
    getCachedMessages(conversationId)
      .then((cached) => {
        if (cached?.messages?.length) {
          setCachedMessagesData({
            messages: cached.messages,
            hasMore: false,
            nextCursor: null,
            offline: true,
          });
        } else {
          setCachedMessagesData(null);
        }
      })
      .catch(() => setCachedMessagesData(null));
  }, [conversationId]);

  const { data: messagesData, isPending: messagesPending, isError: isErrorMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages-list', conversationId],
    queryFn: async () => {
      try {
        return await api.messages.getMessages(conversationId, null, MESSAGES_LIMIT);
      } catch (error) {
        const cached = await getCachedMessages(conversationId);
        if (cached?.messages?.length) {
          return { messages: cached.messages, hasMore: false, nextCursor: null, offline: true };
        }
        throw error;
      }
    },
    enabled: !!conversationId,
    staleTime: 20 * 1000,
    placeholderData: cachedMessagesData || undefined,
  });

  useEffect(() => {
    if (conversationId && Array.isArray(messagesData?.messages)) {
      cacheMessages(conversationId, messagesData.messages).catch(() => {});
    }
  }, [conversationId, messagesData?.messages]);

  const onNewMessage = useCallback(() => {
    refetchMessages();
    runDmE2eeSyncRef.current?.();
    queryClient.invalidateQueries({ queryKey: ['messages-unread-count', currentUser?.id] });
    queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
  }, [refetchMessages, queryClient, currentUser?.id]);
  const onMessageRead = useCallback(() => refetchMessages(), [refetchMessages]);
  const onMessageDelivered = useCallback(() => refetchMessages(), [refetchMessages]);

  useEffect(() => {
    if (isErrorConv && conversationLookupKey) {
      toast.error(labels.selectConversation, { action: { label: labels.backToMessages, onClick: () => navigate(createPageUrl('Inbox')) } });
    }
  }, [isErrorConv, conversationLookupKey, labels.selectConversation, labels.backToMessages, navigate]);

  useEffect(() => {
    if (isErrorMessages && conversationId) {
      toast.error(labels.loadOlderError, { action: { label: 'Réessayer', onClick: () => refetchMessages() } });
    }
  }, [isErrorMessages, conversationId, labels.loadOlderError, refetchMessages]);

  const { data: presence } = useQuery({
    queryKey: ['presence', userId],
    queryFn: () => api.messages.getPresence(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const {
    typingUser,
    recordingUser,
    presence: livePresence,
    emitTypingStart,
    emitTypingStop,
    emitRecordingStart,
    emitRecordingStop,
    isConnected,
    showReconnectBanner,
  } = useConversationSocket({
    userId: currentUser?.id,
    conversationId,
    peerId: userId,
    userName: currentUser?.full_name || currentUser?.username,
    onNewMessage,
    onMessageRead,
    onMessageDelivered,
  });

  useEffect(() => {
    if (!isRecording || !conversationId || !currentUser?.id) return undefined;
    emitTypingStop();
    emitRecordingStart();
    return () => {
      emitRecordingStop();
    };
  }, [isRecording, conversationId, currentUser?.id, emitRecordingStart, emitRecordingStop, emitTypingStop]);

  const effectivePresence = livePresence ?? presence ?? null;

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

  const conversationMuted = useMemo(() => {
    const c = activeConversation;
    if (!c || !currentUser?.id) return false;
    if (c.user1_id === currentUser.id) return !!c.muted_user1;
    if (c.user2_id === currentUser.id) return !!c.muted_user2;
    return false;
  }, [activeConversation, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !userId) return;
    try {
      const v = localStorage.getItem(`aw-chat-ephemeral-${currentUser.id}-${userId}`);
      const t = localStorage.getItem(`aw-chat-ephemeral-ttl-${currentUser.id}-${userId}`);
      const parsed = parseInt(String(t || EPHEMERAL_TTL_SECONDS.H24), 10);
      const ttl =
        parsed === EPHEMERAL_TTL_SECONDS.D7 || parsed === EPHEMERAL_TTL_SECONDS.D90
          ? parsed
          : EPHEMERAL_TTL_SECONDS.H24;
      setEphemeralTtlSec(ttl);
      if (v === '1') setEphemeralMode(true);
      else if (v === '0') setEphemeralMode(false);
    } catch {
      /* ignore */
    }
  }, [currentUser?.id, userId]);

  const ephemeralExpiresIso = useCallback(() => {
    if (!ephemeralMode) return undefined;
    const sec =
      ephemeralTtlSec === EPHEMERAL_TTL_SECONDS.D7 || ephemeralTtlSec === EPHEMERAL_TTL_SECONDS.D90
        ? ephemeralTtlSec
        : EPHEMERAL_TTL_SECONDS.H24;
    return new Date(Date.now() + sec * 1000).toISOString();
  }, [ephemeralMode, ephemeralTtlSec]);

  useEffect(() => {
    setOutgoingPending([]);
  }, [userId]);

  useEffect(() => {
    setDecryptedContentByMessageId({});
    e2eeSyncCursorRef.current = null;
  }, [conversationId]);

  const outgoingPendingAsMessages = useMemo(() => {
    if (!currentUser?.id) return [];
    return outgoingPending.map((p) => ({
      id: p.tempId,
      sender_id: currentUser.id,
      content: p.content,
      type: 'text',
      status: p.status,
      created_at: p.created_at,
      reply_to_message_id: p.reply_to_message_id || null,
      reply_to: p.reply_to || null,
      is_deleted: false,
      _localPending: true,
    }));
  }, [outgoingPending, currentUser?.id]);

  const displayedMessages = useMemo(
    () => [...messages, ...outgoingPendingAsMessages],
    [messages, outgoingPendingAsMessages]
  );

  const mediaGalleryItems = useMemo(() => {
    const media = [];
    const links = [];
    const docs = [];
    for (const m of messages) {
      if (m.is_deleted) continue;
      const t = String(m.type || 'text').toLowerCase();
      const msgEphemeral = m.is_ephemeral === true || m.isEphemeral === true;
      const skipConsumedViewOnce =
        currentUser?.id
        && m.sender_id !== currentUser.id
        && msgEphemeral
        && (t === 'image' || t === 'video')
        && (() => {
          try {
            return localStorage.getItem(`aw-chat-viewonce-${currentUser.id}-${m.id}`) === '1';
          } catch {
            return false;
          }
        })();
      if (skipConsumedViewOnce) continue;
      if (t === 'sticker' && m.sticker_url) {
        media.push({ id: m.id, type: 'sticker', url: m.sticker_url, thumb: null, created_at: m.created_at });
      } else if (['image', 'video', 'audio', 'voice'].includes(t) && m.media_url) {
        media.push({ id: m.id, type: t, url: m.media_url, thumb: m.thumbnail_url, created_at: m.created_at });
      } else if (t === 'file' && m.media_url) {
        const name = typeof m.content === 'string' && m.content.trim() ? m.content.trim() : 'Document';
        docs.push({ id: m.id, label: name, url: m.media_url, created_at: m.created_at });
      }
      const urls = extractUrls(m.content);
      for (const u of urls) {
        links.push({ id: `${m.id}-${u}`, url: u, created_at: m.created_at });
      }
    }
    return { media, links, docs };
  }, [messages, currentUser?.id, viewOnceUiTick]);

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
    api.messages
      .markAsDelivered(conversationId)
      .then(() => api.messages.markAsRead(conversationId))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages-unread-count', currentUser?.id] });
        queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
      })
      .catch(() => {});
  }, [conversationId, currentUser?.id, queryClient]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  useEffect(() => {
    if (!chatSearchOpen) {
      setChatSearchResults([]);
      setChatSearchLoading(false);
      return undefined;
    }
    const q = chatSearchQuery.trim();
    if (q.length < 2 || !conversationId) {
      setChatSearchResults([]);
      setChatSearchLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setChatSearchLoading(true);
      try {
        const result = await api.messages.searchInConversation(conversationId, q);
        if (!cancelled) setChatSearchResults(result?.messages || []);
      } catch (error) {
        if (!cancelled) {
          setChatSearchResults([]);
          toast.error(error?.apiMessage || error?.message || labels.loadOlderError);
        }
      } finally {
        if (!cancelled) setChatSearchLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [chatSearchOpen, chatSearchQuery, conversationId, labels.loadOlderError]);

  const scrollToSearchMessage = useCallback((messageId) => {
    if (!messageId) return;
    setHighlightedSearchMessageId(messageId);
    const node = messageNodeRefs.current.get(String(messageId));
    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => setHighlightedSearchMessageId(null), 2200);
      return;
    }
    toast.info('Ce message n’est pas encore chargé dans la vue actuelle');
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageContent(value);

    if (!typingTimeoutRef.current) {
      emitTypingStart();
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
      typingTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitTypingStop();
    };
  }, [emitTypingStop]);

  useEffect(() => {
    if (!conversationId) return;
    const trimmed = messageContent.trim();
    const delay = trimmed.length > 0 ? 1500 : 450;
    const t = setTimeout(() => {
      putDraftMutation.mutate({ cId: conversationId, content: trimmed });
    }, delay);
    return () => clearTimeout(t);
  }, [messageContent, conversationId]);

  const handleStartCall = (type = 'audio') => {
    if (!otherUser?.id) return;
    toast.info(labels.openingCall);
    const callId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    navigate(`${createPageUrl('DirectCall')}?mode=outgoing&receiverId=${otherUser.id}&type=${type}&callId=${callId}`);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      _clientTempId: _omitTemp,
      _outboxId,
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
      sticker_url,
      poll_options,
      event_id,
    } = {}) => {
      const outboxId = _outboxId || _omitTemp || `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      let e2ee_envelope;
      try {
        const normalizedType = String(type || 'text').toLowerCase();
        if (normalizedType === 'text' && typeof content === 'string' && content.trim() && currentUser?.id && userId) {
          e2ee_envelope = await buildE2eeEnvelopeForRecipient(userId, content, {
            senderUserId: currentUser.id,
            messageType: 'text',
            clientMessageId: _omitTemp || outboxId,
          });
        }
      } catch {
        e2ee_envelope = undefined;
      }

      if (!userId) {
        const err = new Error('Conversation introuvable');
        err.apiMessage = 'Conversation introuvable';
        throw err;
      }

      return api.messages.send(userId, content ?? '', {
        type,
        media_url,
        thumbnail_url,
        reply_to_message_id,
        scheduled_at: scheduled_at || undefined,
        is_ephemeral: is_ephemeral === true ? true : undefined,
        expires_at: expires_at || undefined,
        location_lat,
        location_lng,
        location_label,
        contact_user_id,
        contact_name,
        sticker_url,
        poll_options,
        event_id,
        e2ee_envelope,
      });
    },
    onSuccess: (_data, variables) => {
      if (currentUser?.id && variables?._outboxId) {
        removeOutboxItem(currentUser.id, variables._outboxId).catch(() => {});
      }
      if (variables?._clientTempId) {
        setOutgoingPending((prev) => prev.filter((p) => p.tempId !== variables._clientTempId));
      }
      emitTypingStop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count', currentUser?.id] });
      if (String(variables?.type || '').toLowerCase() === 'poll') {
        setPollQuestion('');
        setPollOptionRows(['', '']);
      }
      if (String(variables?.type || '').toLowerCase() === 'event') {
        queryClient.invalidateQueries({ queryKey: ['events-my-tickets', currentUser?.id] });
      }
      setMessageContent('');
      setReplyTarget(null);
      setScheduledAt('');
      setShowSchedule(false);
      if (conversationId && !variables?.scheduled_at) {
        api.messages.putDraft(conversationId, '').catch(() => {});
      }
      if (variables?.scheduled_at) {
        queryClient.invalidateQueries({ queryKey: ['scheduled-messages', currentUser?.id] });
      }
      toast.success(variables?.scheduled_at ? 'Message programmé' : labels.sendSuccess);
    },
    onError: (err, variables) => {
      const shouldQueueOffline =
        !!currentUser?.id
        && !variables?.scheduled_at
        && (
          (typeof navigator !== 'undefined' && navigator.onLine === false)
          || (!err?.response && /network|offline|failed to fetch/i.test(String(err?.message || err?.apiMessage || '')))
        );
      if (shouldQueueOffline) {
        const outboxId = variables?._outboxId || variables?._clientTempId || `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        queueOutboxItem(currentUser.id, {
          ...variables,
          _outboxId: outboxId,
          conversationId,
          recipientId: userId,
          created_at: variables?.created_at || new Date().toISOString(),
        }).catch(() => {});
      }
      if (variables?._clientTempId) {
        setOutgoingPending((prev) =>
          prev.map((p) => (p.tempId === variables._clientTempId ? { ...p, status: 'failed' } : p))
        );
      }
      toast.error(
        err?.response?.data?.error?.message
        || err?.response?.data?.message
        || err?.apiMessage
        || err?.message
        || labels.sendError
      );
    },
  });

  useEffect(() => {
    if (!currentUser?.id || !(conversationId || userId)) return;
    let cancelled = false;
    getOutbox(currentUser.id)
      .then((outbox) => {
        if (cancelled) return;
        const scopedItems = (outbox?.items || []).filter(
          (item) =>
            String(item?.conversationId || '') === String(conversationId || '')
            || String(item?.recipientId || '') === String(userId || '')
        );
        const asPending = scopedItems
          .filter((item) => String(item?.type || 'text').toLowerCase() === 'text' && item?.content)
          .map((item) => ({
            tempId: item._clientTempId || item._outboxId || item.id,
            content: item.content,
            reply_to_message_id: item.reply_to_message_id || null,
            reply_to: item.reply_to || null,
            status: 'failed',
            created_at: item.created_at || new Date().toISOString(),
          }));
        setOutgoingPending((prev) => {
          const byId = new Map(prev.map((row) => [row.tempId, row]));
          for (const row of asPending) {
            if (!byId.has(row.tempId)) byId.set(row.tempId, row);
          }
          return [...byId.values()];
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, conversationId, userId]);

  const flushQueuedMessages = useCallback(async () => {
    if (!currentUser?.id || !userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    await processOutbox(currentUser.id, async (item) => {
      const sameConversation =
        String(item?.conversationId || '') === String(conversationId || '')
        || String(item?.recipientId || '') === String(userId || '');
      if (!sameConversation) return;
      await sendMessageMutation.mutateAsync(item);
    });
  }, [currentUser?.id, conversationId, userId, sendMessageMutation]);

  useEffect(() => {
    if (!currentUser?.id || !userId) return undefined;
    const handleOnline = () => {
      flushQueuedMessages().catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    if (isConnected) {
      flushQueuedMessages().catch(() => {});
    }
    return () => window.removeEventListener('online', handleOnline);
  }, [currentUser?.id, userId, isConnected, flushQueuedMessages]);

  const { data: eventListData, isPending: eventListPending, isError: eventListError } = useQuery({
    queryKey: ['chat-event-share-list', eventSearchDebounced],
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

  const handleSelectSharedEvent = useCallback(
    (ev) => {
      if (!ev?.id) return;
      sendMessageMutation.mutate({
        content: ev.title || '',
        type: 'event',
        event_id: ev.id,
        reply_to_message_id: replyTarget?.id || undefined,
        is_ephemeral: ephemeralMode === true ? true : undefined,
        expires_at: ephemeralMode ? ephemeralExpiresIso() : undefined,
      });
      setEventShareOpen(false);
      setEventSearchQuery('');
      setEventSearchDebounced('');
    },
    [sendMessageMutation, replyTarget?.id, ephemeralMode, ephemeralExpiresIso]
  );

  useEffect(() => {
    if (eventShareOpen && eventListError) toast.error(labels.eventShareError);
  }, [eventShareOpen, eventListError, labels.eventShareError]);

  const votePollMutation = useMutation({
    mutationFn: ({ messageId, optionIndex }) => api.messages.voteDmPoll(messageId, optionIndex),
    onSuccess: (data) => {
      if (!data?.id || data.poll_votes == null) return;
      queryClient.setQueryData(['messages-list', conversationId], (old) => {
        if (!old?.messages) return old;
        const hit = old.messages.some((m) => m.id === data.id);
        if (!hit) return old;
        return {
          ...old,
          messages: old.messages.map((msg) =>
            msg.id === data.id ? { ...msg, poll_votes: data.poll_votes } : msg
          ),
        };
      });
      setOlderMessages((prev) =>
        prev.map((msg) => (msg.id === data.id ? { ...msg, poll_votes: data.poll_votes } : msg))
      );
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message ??
          err?.response?.data?.message ??
          err?.apiMessage ??
          labels.pollVoteError
      );
    },
  });

  const handlePublishPoll = useCallback(() => {
    const q = pollQuestion.trim();
    const opts = pollOptionRows.map((x) => String(x).trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      toast.error(labels.pollValidationError);
      return;
    }
    setPollDialogOpen(false);
    sendMessageMutation.mutate({
      content: q,
      type: 'poll',
      poll_options: opts,
      reply_to_message_id: replyTarget?.id || undefined,
      is_ephemeral: ephemeralMode === true ? true : undefined,
      expires_at: ephemeralMode ? ephemeralExpiresIso() : undefined,
    });
  }, [
    pollQuestion,
    pollOptionRows,
    sendMessageMutation,
    replyTarget?.id,
    labels.pollValidationError,
    ephemeralMode,
    ephemeralExpiresIso,
  ]);

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

  useEffect(() => () => {
    if (latestVoicePreviewUrlRef.current) {
      URL.revokeObjectURL(latestVoicePreviewUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isRecording) return undefined;
    const id = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [isRecording]);

  const sendVoiceDraft = useCallback(async () => {
    if (!voiceDraft?.blob) return;
    setVoiceUploading(true);
    try {
      const ext = extensionForVoiceBlob(voiceDraft.mimeType);
      const audioFile = new File([voiceDraft.blob], `voice-${Date.now()}.${ext}`, {
        type: voiceDraft.mimeType || 'audio/webm',
      });
      const voiceCheck = assertChatMediaFile(audioFile);
      if (!voiceCheck.ok) {
        toast.error(labels.fileTooLargeMedia(voiceCheck.maxMb));
        setVoiceUploading(false);
        return;
      }
      const { file_url } = await api.upload.audio(audioFile);
      if (!file_url) {
        toast.error(labels.voiceStopError);
        return;
      }
      sendMessageMutation.mutate(
        {
          content: '',
          type: 'voice',
          media_url: file_url,
          reply_to_message_id: replyTarget?.id || undefined,
          is_ephemeral: ephemeralMode === true ? true : undefined,
          expires_at: ephemeralMode ? ephemeralExpiresIso() : undefined,
        },
        {
          onSettled: () => setVoiceUploading(false),
          onSuccess: () => {
            clearVoiceDraft();
          },
        }
      );
    } catch (err) {
      setVoiceUploading(false);
      if (isPayloadTooLargeError(err)) toast.error(labels.uploadPayloadTooLarge);
      else toast.error(labels.voiceStopError);
    }
  }, [
    voiceDraft,
    clearVoiceDraft,
    sendMessageMutation,
    labels.voiceStopError,
    labels.uploadPayloadTooLarge,
    labels.fileTooLargeMedia,
    replyTarget?.id,
    ephemeralMode,
    ephemeralExpiresIso,
  ]);

  const togglePreviewPlayback = useCallback(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    if (previewPlaying) {
      el.pause();
    } else {
      el.play().catch(() => toast.error(labels.voiceStopError));
    }
  }, [previewPlaying, labels.voiceStopError]);

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
      const mode = deleteToastModeRef.current;
      deleteToastModeRef.current = 'default';
      toast.success(mode === 'scheduled' ? labels.cancelScheduledSuccess : labels.deleteSuccess);
      if (mode === 'scheduled') {
        queryClient.invalidateQueries({ queryKey: ['scheduled-messages', currentUser?.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['messages-list', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, conversationLookupKey] });
      refetchMessages();
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.deleteError),
  });

  const deleteForAllMutation = useMutation({
    mutationFn: (messageId) => api.messages.deleteForAll(messageId),
    onSuccess: () => {
      toast.success(labels.deleteForAllSuccess ?? 'Message supprimé pour tous');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, conversationLookupKey] });
    },
    onError: (err) => toast.error(err?.response?.data?.error || err?.response?.data?.message || labels.deleteForAllError),
  });

  const muteConversationMutation = useMutation({
    mutationFn: (muted) => api.messages.setConversationNotifications(conversationId, { muted }),
    onSuccess: (_d, muted) => {
      toast.success(muted ? labels.muteChatSuccess : labels.unmuteChatSuccess);
      queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, conversationLookupKey] });
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
    },
    onError: () => toast.error(labels.muteChatError),
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => api.messages.clearConversationForMe(conversationId),
    onSuccess: () => {
      toast.success(labels.clearChatSuccess);
      setOlderMessages([]);
      setCursorForOlder(null);
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, conversationLookupKey] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.clearChatError),
  });

  const exportChatMutation = useMutation({
    mutationFn: ({ cid }) => api.messages.exportConversations(cid),
    onSuccess: (exportPayload, { filenameBase, viewerUserId }) => {
      const conv = exportPayload?.conversations?.[0];
      if (!conv) {
        toast.error(labels.exportChatError);
        return;
      }
      const txt = formatDmConversationToPlainText(conv, viewerUserId);
      const slug =
        String(filenameBase || 'discussion')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]+/g, '-')
          .replace(/^-|-$/g, '') || 'discussion';
      downloadPlainTextFile(`AfriWonder-discussion-${slug}-${new Date().toISOString().slice(0, 10)}.txt`, txt);
      toast.success(labels.exportChatSuccess);
    },
    onError: (err) =>
      toast.error(
        err?.response?.data?.error?.message || err?.response?.data?.message || err?.apiMessage || labels.exportChatError
      ),
  });

  const updateMetaMutation = useMutation({
    mutationFn: ({ messageId, payload }) => api.messages.updateMessageMeta(messageId, payload),
    onSuccess: () => refetchMessages(),
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.sendError),
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, content }) => api.messages.editMessageContent(messageId, content),
    onSuccess: () => {
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['messages-conversations', currentUser?.id] });
      setEditDialogOpen(false);
      setEditingMessageId(null);
      setEditText('');
      toast.success(labels.messageEditedSuccess);
    },
    onError: (err) =>
      toast.error(
        err?.response?.data?.error?.message
          || err?.response?.data?.message
          || err?.apiMessage
          || err?.message
          || labels.sendError
      ),
  });

  const { data: reactionsDetailData, isFetching: reactionsDetailLoading } = useQuery({
    queryKey: ['message-reactions-detail', reactionsDialogMessageId],
    queryFn: () => api.messages.getMessageReactionsDetail(reactionsDialogMessageId),
    enabled: !!reactionsDialogMessageId && reactionsDialogOpen,
  });
  const reactionsDetailList = reactionsDetailData?.reactors ?? [];

  const openReactionsDetail = useCallback((messageId) => {
    if (!messageId) return;
    setReactionsDialogMessageId(messageId);
    setReactionsDialogOpen(true);
  }, []);

  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }) => api.messages.setReaction(messageId, emoji),
    onSuccess: (_d, vars) => {
      refetchMessages();
      if (vars?.messageId) {
        queryClient.invalidateQueries({ queryKey: ['message-reactions-detail', vars.messageId] });
      }
      if (vars?.emoji && REACTION_BURST_EMOJIS.has(String(vars.emoji))) {
        const mid = vars.messageId;
        setReactionBurstMessageId(mid);
        window.setTimeout(() => {
          setReactionBurstMessageId((cur) => (cur === mid ? null : cur));
        }, 900);
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || err?.apiMessage || labels.sendError),
  });

  const transcribeVoiceMutation = useMutation({
    mutationFn: (messageId) => api.messages.transcribeVoiceMessage(messageId),
    onSuccess: () => {
      refetchMessages();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || err?.apiMessage || labels.transcribeVoiceError),
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

  const _handleDeleteMyLastMessage = () => {
    const lastOwn = [...messages].reverse().find((m) => m.sender_id === currentUser?.id && !m.is_deleted);
    if (!lastOwn?.id) {
      toast.error(labels.deleteNoMessage);
      return;
    }
    setConfirmAction({ type: 'delete', messageId: lastOwn.id });
  };

  const handleHeaderNewGroup = useCallback(() => {
    navigate(`${createPageUrl('Inbox')}?newGroup=1`);
  }, [navigate]);

  const handleHeaderViewContact = useCallback(() => {
    if (!otherUser?.id) return;
    navigate(`${createPageUrl('Profile')}?_userId=${otherUser.id}`);
  }, [navigate, otherUser?.id]);

  const handleToggleMute = useCallback(() => {
    if (!conversationId) {
      toast.error(labels.selectConversation);
      return;
    }
    muteConversationMutation.mutate(!conversationMuted);
  }, [conversationId, conversationMuted, muteConversationMutation, labels.selectConversation]);

  const handleExportChat = useCallback(() => {
    if (!conversationId || exportChatMutation.isPending || !currentUser?.id) return;
    exportChatMutation.mutate({
      cid: conversationId,
      filenameBase: otherUser?.username || otherUser?.full_name || 'discussion',
      viewerUserId: currentUser.id,
    });
  }, [conversationId, otherUser?.username, otherUser?.full_name, exportChatMutation, currentUser?.id]);

  const handleSetEphemeralDuration = useCallback(
    (sec) => {
      if (!currentUser?.id || !userId) return;
      const on = sec > 0;
      setEphemeralMode(on);
      if (on) setEphemeralTtlSec(sec);
      try {
        localStorage.setItem(`aw-chat-ephemeral-${currentUser.id}-${userId}`, on ? '1' : '0');
        if (on) localStorage.setItem(`aw-chat-ephemeral-ttl-${currentUser.id}-${userId}`, String(sec));
      } catch {
        /* ignore */
      }
      toast.success(on ? labels.ephemeralOn : labels.ephemeralOff);
    },
    [currentUser?.id, userId, labels.ephemeralOn, labels.ephemeralOff]
  );

  const isViewOnceConsumed = useCallback(
    (messageId) => {
      if (!messageId || !currentUser?.id) return false;
      if (viewOnceOpenedSetRef.current.has(messageId)) return true;
      try {
        const k = `aw-chat-viewonce-${currentUser.id}-${messageId}`;
        if (typeof localStorage !== 'undefined' && localStorage.getItem(k) === '1') {
          viewOnceOpenedSetRef.current.add(messageId);
          return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    },
    [currentUser?.id]
  );

  const markViewOnceConsumed = useCallback((messageId) => {
    if (!messageId || !currentUser?.id) return;
    viewOnceOpenedSetRef.current.add(messageId);
    try {
      localStorage.setItem(`aw-chat-viewonce-${currentUser.id}-${messageId}`, '1');
    } catch {
      /* ignore */
    }
    setViewOnceUiTick((t) => t + 1);
  }, [currentUser?.id]);

  const handlePersistWallpaper = useCallback((theme) => {
    const t = ['default', 'pattern', 'midnight'].includes(theme) ? theme : 'default';
    setWallpaperTheme(t);
    try {
      localStorage.setItem(CHAT_WALLPAPER_STORAGE, t);
    } catch {
      /* ignore */
    }
  }, []);

  const handleCopyShortcutLink = useCallback(async () => {
    if (!userId) return;
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(labels.shortcutCopied);
    } catch {
      toast.error(labels.sendError);
    }
  }, [userId, labels.shortcutCopied, labels.sendError]);

  const handleAddContactToList = useCallback(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(CHAT_FAVORITES_STORAGE);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return;
      if (arr.includes(userId)) {
        toast.info(labels.alreadyInFavorites);
        return;
      }
      arr.push(userId);
      localStorage.setItem(CHAT_FAVORITES_STORAGE, JSON.stringify(arr));
      toast.success(labels.addedToFavorites);
    } catch {
      toast.error(labels.sendError);
    }
  }, [userId, labels.alreadyInFavorites, labels.addedToFavorites, labels.sendError]);

  const handleClearChatContent = useCallback(() => {
    if (!conversationId) {
      toast.error(labels.selectConversation);
      return;
    }
    setConfirmAction({ type: 'clear_history' });
  }, [conversationId, labels.selectConversation]);

  const handleConfirmAction = () => {
    if (!confirmAction?.type) return;
    const targetId = confirmAction.messageId || activeMessage?.id;
    if (confirmAction.type === 'block') {
      blockMutation.mutate();
    } else if (confirmAction.type === 'report' && targetId) {
      reportMutation.mutate(targetId);
    } else if (confirmAction.type === 'delete' && targetId) {
      deleteToastModeRef.current = 'default';
      deleteMessageMutation.mutate(targetId);
    } else if (confirmAction.type === 'cancel_scheduled' && targetId) {
      deleteToastModeRef.current = 'scheduled';
      deleteMessageMutation.mutate(targetId);
    } else if (confirmAction.type === 'delete_for_all' && targetId) {
      deleteForAllMutation.mutate(targetId);
    } else if (confirmAction.type === 'clear_history' && conversationId) {
      clearHistoryMutation.mutate();
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
    if (confirmAction?.type === 'clear_history') {
      return { title: labels.confirmClearChatTitle, description: labels.confirmClearChatDesc };
    }
    if (confirmAction?.type === 'cancel_scheduled') {
      return { title: labels.confirmCancelScheduledTitle, description: labels.confirmCancelScheduledDesc };
    }
    return { title: labels.actions, description: '' };
  })();

  const filteredEmojis = EMOJI_LIBRARY.filter((e) => e.includes(emojiSearch) || emojiSearch.trim().length === 0);

  const presenceLabel = recordingUser
    ? `${recordingUser.name} ${labels.recordingSuffix}`
    : typingUser
      ? `${typingUser.name} ${labels.typingSuffix}`
      : effectivePresence?.is_online
        ? labels.online
        : effectivePresence?.last_seen
          ? `Vu ${formatDistanceToNow(new Date(effectivePresence.last_seen), { addSuffix: true, locale: fr })}`
          : labels.offline;

  useEffect(() => {
    if (!transferOpen) setTransferSearch('');
  }, [transferOpen]);

  const openMessageActions = (msg) => {
    setActiveMessage(msg);
    setMessageActionsOpen(true);
  };

  const scheduleMessageActionsClose = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const bindMessageLongPress = (msg) => {
    if (msg?._localPending) {
      return {};
    }
    return {
    onContextMenu: (event) => {
      event.preventDefault();
      openMessageActions(msg);
    },
    onTouchStart: () => {
      scheduleMessageActionsClose();
      longPressTimerRef.current = setTimeout(() => {
        openMessageActions(msg);
        longPressTimerRef.current = null;
      }, 420);
    },
    onTouchEnd: scheduleMessageActionsClose,
    onTouchMove: scheduleMessageActionsClose,
    onTouchCancel: scheduleMessageActionsClose,
  };
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

  const handleStickerFromMenu = () => {
    setMessageActionsOpen(false);
    setEmojiPickerOpen(true);
  };

  const handleOpenTranslate = useCallback(async () => {
    const msg = activeMessage;
    setMessageActionsOpen(false);
    if (!msg?.content || typeof msg.content !== 'string' || !msg.content.trim()) {
      toast.error(labels.translateNoText);
      return;
    }
    const trimmed = msg.content.trim();
    setTranslateOpen(true);
    setTranslateLoading(true);
    setTranslateOriginal(trimmed);
    setTranslateResult('');
    setTranslateDetectedCode('');
    setTranslateError(null);
    const targetLang = language === 'en' ? 'en' : 'fr';
    try {
      const { translatedText, detectedSource } = await api.translate.text(trimmed, { target: targetLang });
      if (!translatedText?.trim()) {
        setTranslateError(labels.translateFailed);
      } else {
        setTranslateResult(translatedText.trim());
        if (typeof detectedSource === 'string' && detectedSource.trim()) {
          setTranslateDetectedCode(detectedSource.trim());
        }
      }
    } catch (err) {
      const apiErr = err?.response?.data?.error;
      const msgErr = typeof apiErr === 'string' ? apiErr : err?.response?.data?.message;
      setTranslateError(msgErr || err?.message || labels.translateFailed);
    } finally {
      setTranslateLoading(false);
    }
  }, [activeMessage, language, labels.translateNoText, labels.translateFailed]);

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
        sticker_url: activeMessage.sticker_url || undefined,
        location_lat: activeMessage.location_lat ?? undefined,
        location_lng: activeMessage.location_lng ?? undefined,
        location_label: activeMessage.location_label || undefined,
        contact_user_id: activeMessage.contact_user_id || undefined,
        contact_name: activeMessage.contact_name || undefined,
        poll_options:
          String(msgType).toLowerCase() === 'poll' && Array.isArray(activeMessage.poll_options)
            ? activeMessage.poll_options
            : undefined,
        event_id: String(msgType).toLowerCase() === 'event' ? activeMessage.event_id || undefined : undefined,
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

  const pinnedMessageId = activeConversation?.pinned_message_id ?? activeConversation?.pinned_message?.id;

  const handlePinMessage = (msg) => {
    if (!msg?.id || !conversationId) return;
    const isCurrentlyPinned = pinnedMessageId === msg.id;
    if (isCurrentlyPinned) {
      api.messages.unpinMessage(conversationId).then(() => {
        toast.success(labels.unpinned);
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, conversationLookupKey] });
      }).catch((err) => toast.error(err?.response?.data?.message || labels.sendError));
    } else {
      api.messages.pinMessage(conversationId, msg.id).then(() => {
        toast.success(labels.pinned);
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ['conversation', currentUser?.id, conversationLookupKey] });
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

  const openEditMessage = useCallback(
    (msg) => {
      if (!canEditTextMessage(msg, currentUser?.id)) return;
      setEditingMessageId(msg.id);
      setEditText(msg.content || '');
      setEditDialogOpen(true);
      setMessageActionsOpen(false);
    },
    [currentUser?.id]
  );

  const submitEditMessage = useCallback(
    (e) => {
      e?.preventDefault?.();
      const t = editText.trim();
      if (!t || !editingMessageId) return;
      editMessageMutation.mutate({ messageId: editingMessageId, content: t });
    },
    [editText, editingMessageId, editMessageMutation]
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = messageContent.trim();
    if (!text) return;
    const scheduled_at = showSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
    if (scheduled_at) {
      const when = new Date(scheduled_at).getTime();
      if (!Number.isFinite(when) || when <= Date.now()) {
        toast.error(labels.scheduleMustBeFuture);
        return;
      }
    }
    const is_ephemeral = ephemeralMode === true;
    const expires_at = is_ephemeral ? ephemeralExpiresIso() : undefined;
    const tempId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    if (!scheduled_at) {
      setOutgoingPending((prev) => [
        ...prev,
        {
          tempId,
          content: text,
          reply_to_message_id: replyTarget?.id || undefined,
          reply_to: replyTarget || null,
          status: 'sending',
          created_at: new Date().toISOString(),
        },
      ]);
    }
    sendMessageMutation.mutate({
      _clientTempId: scheduled_at ? undefined : tempId,
      content: text,
      reply_to_message_id: replyTarget?.id || undefined,
      scheduled_at,
      is_ephemeral: is_ephemeral ? true : undefined,
      expires_at,
    });
  };

  const retryFailedPending = useCallback(
    (msg) => {
      if (!msg?._localPending || msg.status !== 'failed') return;
      const row = outgoingPending.find((p) => p.tempId === msg.id && p.status === 'failed');
      if (!row?.content?.trim()) return;
      const newTempId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setOutgoingPending((prev) => [
        ...prev.filter((p) => p.tempId !== msg.id),
        {
          tempId: newTempId,
          content: row.content,
          reply_to_message_id: row.reply_to_message_id,
          reply_to: row.reply_to,
          status: 'sending',
          created_at: new Date().toISOString(),
        },
      ]);
      sendMessageMutation.mutate({
        _clientTempId: newTempId,
        content: row.content,
        reply_to_message_id: row.reply_to_message_id || undefined,
      });
    },
    [outgoingPending, sendMessageMutation]
  );

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

  useEffect(() => () => scheduleMessageActionsClose(), []);

  useEffect(
    () => () => {
      if (cameraDraft?.previewUrl) {
        try { URL.revokeObjectURL(cameraDraft.previewUrl); } catch (_) {}
      }
    },
    [cameraDraft?.previewUrl]
  );

  const handleCameraCapture = async (blob, mimeType, isVideo) => {
    const previewUrl = URL.createObjectURL(blob);
    setCameraDraft({
      blob,
      mimeType,
      isVideo: !!isVideo,
      caption: '',
      previewUrl,
    });
    setCameraPreviewOpen(true);
  };

  const clearCameraDraft = useCallback(() => {
    setCameraPreviewOpen(false);
    setCameraDraft((prev) => {
      if (prev?.previewUrl) {
        try { URL.revokeObjectURL(prev.previewUrl); } catch (_) {}
      }
      return null;
    });
  }, []);

  const handleSendCameraDraft = async (payload) => {
    if (!payload?.blob) return;
    const { blob, mimeType, isVideo, caption, is_ephemeral: viewOnceEphemeral } = payload;
    const ext = isVideo
      ? mimeType.includes('mp4')
        ? '.mp4'
        : '.webm'
      : mimeType.includes('png')
        ? '.png'
        : '.jpg';
    const file = new File([blob], `${isVideo ? 'video' : 'photo'}_${Date.now()}${ext}`, { type: mimeType });
    const mediaCheck = assertChatMediaFile(file);
    if (!mediaCheck.ok) {
      toast.error(labels.fileTooLargeMedia(mediaCheck.maxMb));
      return;
    }
    const content = String(caption || '').trim();
    const sendEphemeral = viewOnceEphemeral === true || ephemeralMode === true;
    const ephemeralExpiresAt = sendEphemeral ? ephemeralExpiresIso() : undefined;
    setCameraSending(true);
    try {
      if (isVideo) {
        const videoResult = await api.upload.video({ file });
        const file_url = videoResult?.file_url ?? videoResult?.url;
        if (!file_url) {
          toast.error(labels.uploadError);
          return;
        }
        sendMessageMutation.mutate({
          content,
          type: 'video',
          media_url: file_url,
          reply_to_message_id: replyTarget?.id || undefined,
          is_ephemeral: sendEphemeral ? true : undefined,
          expires_at: ephemeralExpiresAt,
        });
      } else {
        const toSend = await compressImageFileForChat(file);
        const { file_url } = await api.upload.image(toSend);
        if (!file_url) {
          toast.error(labels.uploadError);
          return;
        }
        sendMessageMutation.mutate({
          content,
          type: 'image',
          media_url: file_url,
          reply_to_message_id: replyTarget?.id || undefined,
          is_ephemeral: sendEphemeral ? true : undefined,
          expires_at: ephemeralExpiresAt,
        });
      }
      clearCameraDraft();
    } catch (err) {
      if (isPayloadTooLargeError(err)) toast.error(labels.uploadPayloadTooLarge);
      else
        toast.error(
          err?.response?.data?.error?.message || err?.response?.data?.message || err?.apiMessage || labels.uploadError
        );
    } finally {
      setCameraSending(false);
    }
  };

  const handleMediaSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error(labels.selectMedia);
      return;
    }
    const sizeCheck = assertChatMediaFile(file);
    if (!sizeCheck.ok) {
      toast.error(labels.fileTooLargeMedia(sizeCheck.maxMb));
      return;
    }
    try {
      if (isImage) {
        const compressed = await compressImageFileForChat(file);
        const previewUrl = URL.createObjectURL(compressed);
        setCameraDraft({
          blob: compressed,
          mimeType: compressed.type || 'image/jpeg',
          isVideo: false,
          caption: '',
          previewUrl,
        });
        setCameraPreviewOpen(true);
        return;
      }
      const videoResult = await api.upload.video({ file });
      const file_url = videoResult?.file_url ?? videoResult?.url;
      if (!file_url) {
        toast.error(labels.uploadError);
        return;
      }
      sendMessageMutation.mutate({
        content: '',
        type: 'video',
        media_url: file_url,
        reply_to_message_id: replyTarget?.id || undefined,
        is_ephemeral: ephemeralMode === true ? true : undefined,
        expires_at: ephemeralMode ? ephemeralExpiresIso() : undefined,
      });
    } catch (err) {
      if (isPayloadTooLargeError(err)) toast.error(labels.uploadPayloadTooLarge);
      else
        toast.error(
          err?.response?.data?.error?.message || err?.response?.data?.message || err?.apiMessage || labels.uploadError
        );
    }
  };

  const handleDocumentSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    const docCheck = assertChatDocumentFile(file);
    if (!docCheck.ok) {
      toast.error(labels.fileTooLargeDocument(docCheck.maxMb));
      return;
    }
    setDocumentSending(true);
    try {
      const up = await api.upload.document(file);
      const url = up?.file_url;
      if (!url) {
        toast.error(labels.uploadError);
        return;
      }
      await sendMessageMutation.mutateAsync({
        content: file.name,
        type: 'file',
        media_url: url,
        reply_to_message_id: replyTarget?.id || undefined,
        is_ephemeral: ephemeralMode === true ? true : undefined,
        expires_at: ephemeralMode ? ephemeralExpiresIso() : undefined,
      });
    } catch (err) {
      if (isPayloadTooLargeError(err)) toast.error(labels.uploadPayloadTooLarge);
      else {
        const apiMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.apiMessage;
        toast.error(apiMsg || labels.documentSendError || labels.uploadError);
      }
    } finally {
      setDocumentSending(false);
    }
  };

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

  const startRecording = async () => {
    if (typeof MediaRecorder === 'undefined') {
      toast.error(labels.voiceUnsupported);
      return;
    }
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
        toast.error(labels.voiceStartError);
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
            toast.error(labels.voiceEmptyError);
            return;
          }

          const durationSec = Math.max(0, (Date.now() - recordingStartedAtRef.current) / 1000);
          if (durationSec < 0.45 && audioBlob.size < 2000) {
            toast.info(labels.voiceTooShort);
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
        } catch (_err) {
          toast.error(labels.voiceStopError);
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
        toast.error(labels.voiceStartError);
      }
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    setIsRecording(false);
  };

  if (isLoadingAuth) {
    return (
      <ChatScreenShell centered>
        <ChatLoadingState label="Chargement de vos messages..." />
      </ChatScreenShell>
    );
  }

  if (!isAuthenticated || !currentUser) return null;

  if (!conversationLookupKey && !userId) {
    return (
      <ChatScreenShell centered>
        <div className={`w-full max-w-md rounded-[28px] p-8 text-center ${CHAT_SURFACE}`}>
          <p className="mb-4 text-white/70">{labels.selectConversation}</p>
          <Button onClick={() => navigate(createPageUrl('Inbox'))} className="rounded-full bg-white text-slate-950 hover:bg-white/90">{labels.backToMessages}</Button>
        </div>
      </ChatScreenShell>
    );
  }

  const waitingForConversation = !!conversationLookupKey && !conversationId && !!loadingConv && !isErrorConv;

  if (isErrorConv && !conversationData) {
    return (
      <ChatScreenShell centered>
        <div className={`w-full max-w-md rounded-[28px] p-8 text-center ${CHAT_SURFACE}`}>
          <p className="mb-4 text-white/75">Impossible de charger cette conversation.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => refetchConv()} className="rounded-full bg-white text-slate-950 hover:bg-white/90">
              Réessayer
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Inbox'))}
              className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              {labels.backToMessages}
            </Button>
          </div>
        </div>
      </ChatScreenShell>
    );
  }

  return (
    <ChatScreenShell wallpaper={wallpaperTheme}>
      {showReconnectBanner && (
        <div className="relative z-10 shrink-0 border-b border-amber-500/20 bg-amber-500/12 px-3 py-1.5 text-center text-xs text-amber-100/88" role="status">
          Reconnexion en cours…
        </div>
      )}
      {e2eeHealth && !e2eeHealth.healthy && (
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-orange-500/30 bg-orange-500/12 px-3 py-2 text-xs text-orange-100">
          <span>
            Les messages ne sont pas entièrement protégés sur cet appareil. Appuyez sur Réparer pour corriger.
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
      <div className="relative z-10 flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#070a12]/88 px-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pb-3 pt-[calc(0.65rem+env(safe-area-inset-top,0px))] backdrop-blur-2xl">
        <button onClick={() => navigate(-1)} className={`p-2 transition-colors ${CHAT_ICON_BUTTON}`} aria-label="Retour">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 ring-1 ring-white/12 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
            <AvatarImage src={otherUser?.profile_image} />
            <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white">
              {(otherUser?.full_name?.[0] || otherUser?.username?.[0] || '?').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {(recordingUser || typingUser || effectivePresence?.is_online) && (
            <span
              className={cn(
                'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-[#070a12]',
                recordingUser ? 'bg-amber-400' : typingUser ? 'bg-sky-400' : 'bg-emerald-500'
              )}
              title={
                recordingUser
                  ? labels.recordingSuffix
                  : typingUser
                    ? labels.typingSuffix
                    : labels.online
              }
              aria-hidden
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white">
            {otherUser?.full_name || otherUser?.username || 'Discussion'}
          </p>
          <p className="truncate text-xs text-white/58">{presenceLabel}</p>
          {(!e2eeHealth || !e2eeHealth.healthy) && (
            <p className={cn('truncate text-[11px]', !e2eeHealth ? 'text-white/45' : 'text-orange-200/90')}>
              {e2eeStatusText}
            </p>
          )}
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
          className={cn('h-10 w-10', CHAT_ICON_BUTTON)}
          aria-label={labels.voiceCall}
          onClick={() => handleStartCall('audio')}
        >
          <Phone className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-10 w-10', CHAT_ICON_BUTTON)}
          aria-label={labels.videoCall}
          onClick={() => handleStartCall('video')}
        >
          <Video className="w-5 h-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn('h-10 w-10', CHAT_ICON_BUTTON)} aria-label={labels.chatHeaderMenuAria}>
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="z-[200] max-h-[min(72dvh,520px)] w-[min(100vw-2rem,288px)] overflow-y-auto border border-white/12 bg-[#0b1019] p-1 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)]"
          >
            <DropdownMenuItem
              className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
              onClick={handleHeaderNewGroup}
            >
              <Users className="w-4 h-4 text-white/72" />
              {labels.menuNewGroup}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
              onClick={handleHeaderViewContact}
              disabled={!otherUser?.id}
            >
              <UserCircle className="w-4 h-4 text-white/72" />
              {labels.menuViewContact}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
              onClick={() => {
                setChatSearchOpen((o) => {
                  if (o) setChatSearchQuery('');
                  return !o;
                });
              }}
            >
              <Search className="w-4 h-4 text-white/72" />
              {labels.menuSearch}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
              onClick={() => {
                setMediaGalleryTab('media');
                setMediaGalleryOpen(true);
              }}
            >
              <ImageIcon className="w-4 h-4 text-white/72" />
              {labels.menuMediaLinksDocs}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
              onClick={handleToggleMute}
              disabled={!conversationId || muteConversationMutation.isPending}
            >
              {conversationMuted ? <Bell className="w-4 h-4 text-white/72" /> : <BellOff className="w-4 h-4 text-white/72" />}
              {conversationMuted ? labels.menuUnmute : labels.menuMute}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer rounded-sm focus:bg-white/[0.06] focus:text-white data-[state=open]:bg-white/[0.06]">
                <Timer className="w-4 h-4 text-white/72" />
                {labels.menuEphemeralTitle}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                sideOffset={6}
                className="z-[220] min-w-[200px] border border-white/12 bg-[#0b1019] p-1 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)]"
              >
                <DropdownMenuItem
                  className="focus:bg-white/[0.06] focus:text-white"
                  onClick={() => handleSetEphemeralDuration(0)}
                >
                  {labels.ephemeralDurationOff}
                  {!ephemeralMode ? ' ✓' : ''}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="focus:bg-white/[0.06] focus:text-white"
                  onClick={() => handleSetEphemeralDuration(EPHEMERAL_TTL_SECONDS.H24)}
                >
                  {labels.ephemeral24h}
                  {ephemeralMode && ephemeralTtlSec === EPHEMERAL_TTL_SECONDS.H24 ? ' ✓' : ''}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="focus:bg-white/[0.06] focus:text-white"
                  onClick={() => handleSetEphemeralDuration(EPHEMERAL_TTL_SECONDS.D7)}
                >
                  {labels.ephemeral7d}
                  {ephemeralMode && ephemeralTtlSec === EPHEMERAL_TTL_SECONDS.D7 ? ' ✓' : ''}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="focus:bg-white/[0.06] focus:text-white"
                  onClick={() => handleSetEphemeralDuration(EPHEMERAL_TTL_SECONDS.D90)}
                >
                  {labels.ephemeral90d}
                  {ephemeralMode && ephemeralTtlSec === EPHEMERAL_TTL_SECONDS.D90 ? ' ✓' : ''}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer rounded-sm focus:bg-white/[0.06] focus:text-white data-[state=open]:bg-white/[0.06]">
                <Sparkles className="w-4 h-4 text-white/72" />
                {labels.menuChatTheme}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                sideOffset={6}
                className="z-[220] w-56 border border-white/12 bg-[#0b1019] p-1 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)]"
              >
                <DropdownMenuItem className="focus:bg-white/[0.06] focus:text-white" onClick={() => handlePersistWallpaper('default')}>
                  {labels.menuThemeDefault}
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-white/[0.06] focus:text-white" onClick={() => handlePersistWallpaper('pattern')}>
                  {labels.menuThemePattern}
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-white/[0.06] focus:text-white" onClick={() => handlePersistWallpaper('midnight')}>
                  {labels.menuThemeMidnight}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer rounded-sm focus:bg-white/[0.06] focus:text-white data-[state=open]:bg-white/[0.06]">
                <MoreHorizontal className="w-4 h-4 text-white/72" />
                {labels.menuMore}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                sideOffset={6}
                className="z-[220] w-[min(100vw-2rem,260px)] border border-white/12 bg-[#0b1019] p-1 text-white shadow-[0_24px_60px_rgba(2,6,23,0.35)]"
              >
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
                  onClick={handleReportLastMessage}
                  disabled={reportMutation.isPending}
                >
                  <Flag className="w-4 h-4 text-white/72" />
                  {labels.menuReport}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
                  onClick={handleBlockUser}
                  disabled={blockMutation.isPending}
                >
                  <ShieldBan className="w-4 h-4 text-white/72" />
                  {labels.menuBlock}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-amber-200 focus:bg-white/[0.06] focus:text-amber-100"
                  onClick={handleClearChatContent}
                  disabled={!conversationId || clearHistoryMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                  {labels.menuClearChat}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-white/[0.06] focus:text-white" onClick={handleCopyShortcutLink}>
                  <Link2 className="w-4 h-4 text-white/72" />
                  {labels.menuAddShortcut}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer focus:bg-white/[0.06] focus:text-white" onClick={handleAddContactToList}>
                  <ListPlus className="w-4 h-4 text-white/72" />
                  {labels.menuAddToList}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/[0.06] focus:text-white"
                  onClick={handleExportChat}
                  disabled={!conversationId || exportChatMutation.isPending}
                >
                  <Download className="w-4 h-4 text-white/72" />
                  {labels.menuExportChat}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {chatSearchOpen && (
        <>
          <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/8 bg-black/25 px-3 py-2 backdrop-blur-md">
            <Search className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
            <Input
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder={labels.searchInChatPlaceholder}
              className="h-9 flex-1 border-white/12 bg-white/[0.06] text-sm text-white placeholder:text-white/35"
              autoFocus
            />
            <Button type="button" variant="ghost" size="icon" className={CHAT_ICON_BUTTON} onClick={() => { setChatSearchOpen(false); setChatSearchQuery(''); setChatSearchResults([]); }} aria-label={labels.cancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative z-10 max-h-56 overflow-y-auto border-b border-white/8 bg-[#0b1019]/96 px-3 py-2 backdrop-blur-xl">
            {chatSearchLoading ? (
              <div className="flex items-center justify-center py-4 text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : chatSearchQuery.trim().length < 2 ? (
              <p className="py-3 text-sm text-white/42">Tapez au moins 2 caractères</p>
            ) : chatSearchResults.length === 0 ? (
              <p className="py-3 text-sm text-white/42">Aucun résultat</p>
            ) : (
              <div className="space-y-1">
                {chatSearchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => scrollToSearchMessage(result.id)}
                    className="flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {result.sender?.full_name || result.sender?.username || 'Message'}
                      </p>
                      <p className="line-clamp-2 text-sm text-white/62">
                        {stripChatMarkupForPreview(result.content || '') || '—'}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-white/38">
                      {formatDistanceToNow(new Date(result.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {orderId && (
        <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/8 bg-white/[0.03] px-4 py-2">
          <span className="text-sm text-white/78">{labels.orderConversation}{orderId.slice(0, 8)}</span>
          <Button variant="outline" size="sm" className="shrink-0 border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => navigate(`${createPageUrl('OrderTracking')}?id=${orderId}`)}>
            {labels.viewOrder}
          </Button>
        </div>
      )}

      {activeConversation?.pinned_message && (
        <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/8 bg-white/[0.03] px-3 py-2">
          <Pin className="w-4 h-4 shrink-0 text-white/70" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/60">{labels.pinnedMessage ?? 'Message épinglé'}</p>
            <p className="truncate text-sm text-white">{stripChatMarkupForPreview(activeConversation.pinned_message.content || '') || '—'}</p>
          </div>
        </div>
      )}

      <div
        className="relative z-10 flex-1 min-h-0 overflow-y-auto pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-4"
        data-view-once-rev={viewOnceUiTick}
        style={{
          paddingBottom: `calc(${
            attachmentSheetOpen || composerStickerOpen
              ? Math.max(showSchedule ? 286 : replyTarget ? 214 : 158, 360)
              : showSchedule
                ? 286
                : replyTarget
                  ? 214
                  : 158
          }px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col space-y-2.5">
        {hasMore && !waitingForConversation && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder} className="rounded-full border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]">
              {loadingOlder ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.loadOlder}
            </Button>
          </div>
        )}
        {waitingForConversation ? (
          <div className="flex flex-col items-center justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin text-white/35" aria-hidden />
            <p className="mt-3 text-sm text-white/45">Ouverture de la conversation…</p>
          </div>
        ) : messagesPending ? (
          <div className="flex flex-col items-center justify-center py-10" role="status" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin text-white/35" aria-hidden />
            <p className="mt-3 text-sm text-white/45">Chargement des messages…</p>
          </div>
        ) : messages.length === 0 && outgoingPending.length === 0 ? (
          <div className="flex min-h-[min(320px,52dvh)] flex-col justify-end px-3 py-8">
            <div className="mx-auto w-full max-w-[340px] rounded-[22px] border border-white/[0.08] bg-[#0c1523]/88 px-4 py-4 text-center shadow-[0_18px_46px_rgba(2,6,23,0.24)] backdrop-blur-xl">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
                <MessageCircle className="h-6 w-6 text-white/35" strokeWidth={1.7} aria-hidden />
              </div>
              <p className="text-[15px] font-semibold text-white/92">{labels.noMessage}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/48">
                Envoyez un message, une photo ou un vocal pour démarrer une discussion plus naturelle.
              </p>
            </div>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="flex min-h-[min(200px,36dvh)] flex-col items-center justify-center px-6 py-10 text-center">
            <Search className="mb-3 h-10 w-10 text-white/30" aria-hidden />
            <p className="text-sm text-white/65">{labels.noSearchResults}</p>
          </div>
        ) : (
          displayedMessages.map((msg, index) => {
            if (msg.is_deleted) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/42">{labels.deletedMessage}</span>
                </div>
              );
            }
            const isOwn = msg.sender_id === currentUser?.id;
            const isImage = msg.type === 'image' && msg.media_url;
            const isVideo = msg.type === 'video' && msg.media_url;
            const isAudio = (msg.type === 'audio' || msg.type === 'voice') && msg.media_url;
            const isSticker = msg.type === 'sticker' && msg.sticker_url;
            const isLocation = msg.type === 'location' && (msg.location_lat != null && msg.location_lng != null);
            const isContact = msg.type === 'contact' && (msg.contact_user_id || msg.contact_name);
            const isFile = msg.type === 'file' && msg.media_url;
            const isEvent =
              String(msg.type || '').toLowerCase() === 'event' && !!(msg.event_id || msg.event_ref);
            const eventRef = msg.event_ref;
            const myUid = currentUser?.id != null ? String(currentUser.id) : null;
            const isPoll =
              String(msg.type || '').toLowerCase() === 'poll' &&
              Array.isArray(msg.poll_options) &&
              msg.poll_options.map((x) => String(x).trim()).filter(Boolean).length >= 2;
            const pollOpts = isPoll ? msg.poll_options.map((x) => String(x).trim()).filter(Boolean) : [];
            const pollVotesRaw =
              msg.poll_votes && typeof msg.poll_votes === 'object' && !Array.isArray(msg.poll_votes)
                ? msg.poll_votes
                : {};
            const pollVoteCounts = pollOpts.map((_, i) =>
              Object.values(pollVotesRaw).filter((v) => Number(v) === i).length
            );
            const totalPollVotes = pollVoteCounts.reduce((a, b) => a + b, 0);
            const myPollVote =
              myUid != null && pollVotesRaw[myUid] !== undefined ? Number(pollVotesRaw[myUid]) : null;
            const displayContent = decryptedContentByMessageId[msg.id] ?? msg.content;
            const strictE2eeBlocked =
              E2EE_STRICT_MODE &&
              !isOwn &&
              String(msg.type || 'text').toLowerCase() === 'text' &&
              !decryptedContentByMessageId[msg.id];
            const msgIsEphemeral = msg.is_ephemeral === true || msg.isEphemeral === true;
            const reactionsMap = (msg.reactions && typeof msg.reactions === 'object') ? msg.reactions : {};
            const myReaction = currentUser?.id ? reactionsMap[currentUser.id] : null;
            const reactionToShow = myReaction || Object.values(reactionsMap)[0];
            const reactionUserCount = Object.keys(reactionsMap).length;
            const previousMessage = displayedMessages[index - 1];
            const showIncomingAvatar = !isOwn && (!previousMessage || previousMessage.sender_id !== msg.sender_id);
            return (
              <motion.div
                key={msg.id}
                ref={(node) => {
                  if (node) messageNodeRefs.current.set(String(msg.id), node);
                  else messageNodeRefs.current.delete(String(msg.id));
                }}
                data-message-id={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  `flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`,
                  highlightedSearchMessageId === msg.id && 'rounded-3xl bg-amber-400/10 ring-1 ring-amber-300/35'
                )}
              >
                {selectionMode && (
                  <button
                    type="button"
                    className={`w-5 h-5 rounded border ${selectedMessageIds.includes(msg.id) ? 'bg-white border-white' : 'border-white/25 bg-transparent'}`}
                    onClick={() => toggleSelectMessage(msg.id)}
                    aria-label={labels.select}
                  />
                )}
                {!isOwn && !isAudio && (
                  showIncomingAvatar ? (
                    <Avatar className="h-7 w-7 self-end border border-white/20">
                      <AvatarImage src={msg.sender?.profile_image || otherUser?.profile_image} />
                      <AvatarFallback className="bg-white/30 text-[10px] text-white">
                        {(msg.sender?.full_name || msg.sender?.username || otherUser?.full_name || 'U')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-7 shrink-0" />
                  )
                )}
                <div
                  {...bindMessageLongPress(msg)}
                  className={cn(
                    'relative max-w-[85%] rounded-[26px] px-4 py-2.5 shadow-[0_14px_32px_rgba(2,6,23,0.18)] sm:max-w-[72%]',
                    // Vocaux : pas de « gros cadre » blanc — le player (ChatVoiceMessage) porte seul la forme bulle.
                    isAudio
                      ? 'max-w-[min(92%,340px)] rounded-2xl border-0 bg-transparent p-0 shadow-none'
                      : isOwn
                        ? 'rounded-br-md border border-white/12 bg-[#1a2332] text-white'
                        : 'rounded-bl-md border border-white/10 bg-[#161d2b] text-white/95',
                    msg._localPending && msg.status === 'sending' && isOwn && 'opacity-[0.92]'
                  )}
                >
                  {msg.reply_to && (
                    <div className="mb-2.5 space-y-1">
                      <p
                        className={cn(
                          'text-[11px] font-medium leading-tight',
                          isAudio ? (isOwn ? 'text-white/55' : 'text-white/42') : 'text-white/42'
                        )}
                      >
                        {getReplyThreadLabel(msg, isOwn, currentUser?.id, otherUser, labels)}
                      </p>
                      <div
                        className={cn(
                          'rounded-2xl border-l-[3px] px-3 py-2',
                          isAudio
                            ? isOwn
                              ? 'border-l-emerald-400/70 bg-black/25'
                              : 'border-l-emerald-400/75 bg-black/32'
                            : isOwn
                              ? 'border-l-white/80 bg-black/28'
                              : 'border-l-emerald-400/75 bg-black/32'
                        )}
                      >
                        <p
                          className={cn(
                            'line-clamp-3 text-[13px] leading-snug',
                            isAudio ? 'text-white/78' : 'text-white/78'
                          )}
                        >
                          {getReplySnippet(msg.reply_to, labels)}
                        </p>
                      </div>
                    </div>
                  )}
                  {isImage && (
                    isOwn || !msgIsEphemeral ? (
                      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="my-1 block max-w-[260px] overflow-hidden rounded-lg">
                        <img src={msg.media_url} alt="" className="h-auto w-full object-cover" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          'my-1 flex max-w-[260px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition',
                          isViewOnceConsumed(msg.id)
                            ? 'cursor-default border-white/12 bg-white/[0.04] text-white/65'
                            : 'border-emerald-400/35 bg-emerald-500/10 text-white hover:bg-emerald-500/16'
                        )}
                        onClick={() => {
                          if (isViewOnceConsumed(msg.id)) return;
                          setViewOnceModal({ id: msg.id, url: msg.media_url, kind: 'image' });
                        }}
                        aria-label={labels.viewOnceTapToOpen}
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/50 text-xs font-semibold">
                          1
                        </span>
                        <span className="truncate text-[14px] font-medium">{labels.imageMessage || 'Photo'}</span>
                      </button>
                    )
                  )}
                  {isVideo && (
                    isOwn || !msgIsEphemeral ? (
                      <div className="my-1 max-w-[260px] overflow-hidden rounded-lg">
                        <video src={msg.media_url} controls playsInline className="max-h-[min(360px,50dvh)] w-full bg-black object-contain" preload="metadata" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          'my-1 flex max-w-[260px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition',
                          isViewOnceConsumed(msg.id)
                            ? 'cursor-default border-white/12 bg-white/[0.04] text-white/65'
                            : 'border-emerald-400/35 bg-emerald-500/10 text-white hover:bg-emerald-500/16'
                        )}
                        onClick={() => {
                          if (isViewOnceConsumed(msg.id)) return;
                          setViewOnceModal({ id: msg.id, url: msg.media_url, kind: 'video' });
                        }}
                        aria-label={labels.viewOnceTapToOpen}
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/50 text-xs font-semibold">
                          1
                        </span>
                        <span className="truncate text-[14px] font-medium">{labels.videoMessage || 'Video'}</span>
                      </button>
                    )
                  )}
                  {isSticker && (
                    <div className="my-1 max-w-[200px]">
                      <img src={msg.sticker_url} alt="" className="h-32 w-32 object-contain sm:h-36 sm:w-36" loading="lazy" decoding="async" />
                    </div>
                  )}
                  {isAudio && (
                    <div className={cn('my-0.5', isOwn && '-mx-0.5')}>
                      <ChatVoiceMessage
                        src={msg.media_url}
                        isOwn={isOwn}
                        avatarUrl={
                          isOwn
                            ? currentUser?.profile_image || currentUser?.avatar
                            : msg.sender?.profile_image || otherUser?.profile_image
                        }
                        avatarFallback={
                          isOwn
                            ? (currentUser?.full_name || currentUser?.username || 'M')[0]?.toUpperCase() || 'M'
                            : (msg.sender?.full_name || msg.sender?.username || otherUser?.full_name || 'U')[0]?.toUpperCase() || 'U'
                        }
                        messageId={msg.id}
                        createdAt={msg.created_at}
                        receiptStatus={isOwn ? effectiveOwnReceiptStatus(msg) : null}
                        labels={labels}
                      />
                      {msg.transcription_text ? (
                        <p className="mt-2 rounded-xl bg-black/10 px-3 py-2 text-[12px] leading-snug text-white/62">
                          {msg.transcription_text}
                        </p>
                      ) : null}
                      {isOwn && !msg.transcription_text ? (
                        <button
                          type="button"
                          disabled={transcribeVoiceMutation.isPending}
                          onClick={() => transcribeVoiceMutation.mutate(msg.id)}
                          className="mt-2 inline-flex items-center rounded-full bg-black/10 px-3 py-1.5 text-[11px] font-semibold text-sky-300/95 hover:bg-black/15 disabled:opacity-50"
                        >
                          {transcribeVoiceMutation.isPending ? labels.transcribingVoice : labels.transcribeVoice}
                        </button>
                      ) : null}
                    </div>
                  )}
                  {isLocation && (
                    <a
                      href={`https://www.google.com/maps?q=${msg.location_lat},${msg.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`my-1 inline-flex items-center gap-2 rounded-2xl px-2.5 py-2 ${isOwn ? 'bg-white/14 text-white' : 'bg-white/[0.05] text-white/86'}`}
                    >
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{msg.location_label || displayContent || labels.locationMessage}</span>
                    </a>
                  )}
                  {isContact && (
                    <div className={`my-1 inline-flex items-center gap-2 rounded-2xl px-2.5 py-2 ${isOwn ? 'bg-white/14 text-white' : 'bg-white/[0.05] text-white/86'}`}>
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span className="text-sm">{msg.contact_name || displayContent || labels.contactMessage}</span>
                    </div>
                  )}
                  {isFile && (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`my-1 inline-flex max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${isOwn ? 'border-white/20 bg-white/10 text-white hover:bg-white/14' : 'border-white/12 bg-black/25 text-white/90 hover:bg-black/35'}`}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-emerald-300/90" />
                      <span className="min-w-0 truncate underline-offset-2 hover:underline">{displayContent?.trim() || labels.attachDocument}</span>
                    </a>
                  )}
                  {isEvent && (
                    <button
                      type="button"
                      disabled={!msg.event_id}
                      onClick={() => {
                        if (!msg.event_id) return;
                        navigate(`${createPageUrl('EventDetails')}?id=${encodeURIComponent(msg.event_id)}`);
                      }}
                      className={cn(
                        'my-1 w-full max-w-[280px] overflow-hidden rounded-2xl border text-left transition [touch-action:manipulation]',
                        isOwn ? 'border-white/18 bg-white/[0.07]' : 'border-white/12 bg-black/28',
                        !msg.event_id && 'cursor-default opacity-70'
                      )}
                    >
                      {eventRef?.image ? (
                        <img src={eventRef.image} alt="" className="h-28 w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-24 items-center justify-center bg-white/[0.06]">
                          <CalendarDays className="h-10 w-10 text-white/35" aria-hidden />
                        </div>
                      )}
                      <div className="space-y-1 px-3 py-2.5">
                        <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-white/95">
                          {eventRef?.title || displayContent}
                        </p>
                        {eventRef?.start_date ? (
                          <p className="text-[11px] text-white/48">
                            {format(new Date(eventRef.start_date), "EEE d MMM yyyy · HH:mm", { locale: fr })}
                          </p>
                        ) : null}
                        {eventRef?.location ? (
                          <p className="line-clamp-1 text-[11px] text-white/42">{eventRef.location}</p>
                        ) : null}
                        <p className="text-[11px] font-semibold text-emerald-300/90">{labels.eventOpenDetails} →</p>
                      </div>
                    </button>
                  )}
                  {isPoll && (
                    <div className="my-1 space-y-2">
                      <p className="text-[15px] font-semibold leading-snug text-white/95">{msg.content}</p>
                      <ul className="space-y-1.5">
                        {pollOpts.map((label, optIdx) => {
                          const count = pollVoteCounts[optIdx] ?? 0;
                          const pct = totalPollVotes > 0 ? Math.round((count / totalPollVotes) * 100) : 0;
                          const isMine = myPollVote === optIdx;
                          const voteBusy =
                            votePollMutation.isPending && votePollMutation.variables?.messageId === msg.id;
                          return (
                            <li key={`${msg.id}-poll-${optIdx}`}>
                              <button
                                type="button"
                                disabled={voteBusy}
                                onClick={() => votePollMutation.mutate({ messageId: msg.id, optionIndex: optIdx })}
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
                        <p className="text-[11px] text-white/45">{labels.pollVotes(totalPollVotes)}</p>
                      ) : null}
                    </div>
                  )}
                  {((displayContent && typeof displayContent === 'string' && displayContent.trim()) || strictE2eeBlocked) &&
                    !isLocation &&
                    !isContact &&
                    !isSticker &&
                    !isFile &&
                    !isEvent &&
                    !isPoll && (
                    <div className="text-[15px] leading-[1.35]">
                      {strictE2eeBlocked ? (
                        <span className="text-white/60">Message chiffre indisponible sur cet appareil</span>
                      ) : (
                        <ChatFormattedText
                          text={displayContent}
                          isOnLightBubble={false}
                          spoilerTapLabel={labels.spoilerTapReveal}
                          className="text-[15px] leading-[1.35]"
                        />
                      )}
                      {msg.is_edited === true && (
                        <span className="mt-1 block text-[10px] font-medium text-white/36">{labels.messageEditedTag}</span>
                      )}
                    </div>
                  )}
                  {!isImage &&
                    !isVideo &&
                    !isFile &&
                    !isAudio &&
                    !isSticker &&
                    !isLocation &&
                    !isContact &&
                    !isEvent &&
                    !isPoll &&
                    !(displayContent && displayContent.trim()) &&
                    !strictE2eeBlocked && <p className="opacity-70">-</p>}
                  {(msg.id === pinnedMessageId || msg.is_important || msgIsEphemeral || (!isAudio && !isSticker)) && (
                    <p className={`mt-1.5 flex flex-wrap items-center gap-1 text-[11px] ${isOwn ? 'text-white/65' : 'text-white/46'}`}>
                      {(msg.id === pinnedMessageId) && <Pin className="w-3 h-3" />}
                      {msg.is_important && <Star className="w-3 h-3" />}
                      {msgIsEphemeral && <Timer className="w-3 h-3" title={labels.ephemeralMode} />}
                      {!isAudio && (
                        <>
                          {msg.status === 'scheduled' && isOwn && msg.scheduled_at ? (
                            <>
                              <Timer className="mr-0.5 inline h-3 w-3 align-middle" aria-hidden />
                              {labels.scheduledMessageShort} · {format(new Date(msg.scheduled_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                            </>
                          ) : (
                            <>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                              {isOwn &&
                                ['sent', 'delivered', 'read', 'sending', 'failed'].includes(effectiveOwnReceiptStatus(msg)) && (
                                <span className="ml-1 inline-flex items-center gap-1 align-middle">
                                  <MessageReceiptTicks status={effectiveOwnReceiptStatus(msg)} labels={labels} />
                                  {msg._localPending && msg.status === 'failed' && (
                                    <button
                                      type="button"
                                      className="rounded-md px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-amber-300/95 hover:bg-white/10"
                                      onClick={() => retryFailedPending(msg)}
                                    >
                                      {labels.retrySend}
                                    </button>
                                  )}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </p>
                  )}
                  {reactionToShow && (
                    <motion.button
                      type="button"
                      className={`absolute -bottom-3 ${isOwn ? 'left-3' : 'right-3'} flex items-center gap-0.5 rounded-full border border-white/12 bg-white px-2 py-0.5 text-xs text-black shadow-sm [touch-action:manipulation]`}
                      animate={
                        reactionBurstMessageId === msg.id
                          ? { scale: [1, 1.38, 1], rotate: [0, -7, 7, 0] }
                          : {}
                      }
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      aria-label={labels.reactionsDetailTitle}
                      onClick={(e) => {
                        e.stopPropagation();
                        openReactionsDetail(msg.id);
                      }}
                    >
                      <span className="leading-none">{String(reactionToShow)}</span>
                      {reactionUserCount > 1 && (
                        <span className="min-w-[1rem] rounded-full bg-black/10 px-1 text-[10px] font-semibold tabular-nums text-black/80">
                          {reactionUserCount}
                        </span>
                      )}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messageEndRef} />
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept={FILE_ACCEPT_MEDIA} className="hidden" onChange={handleMediaSelect} />
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,application/*"
        onChange={handleDocumentSelect}
      />
      <input ref={cameraPhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMediaSelect} />
      <input ref={cameraVideoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleMediaSelect} />
      {replyTarget && (
        <div
          className="fixed z-40 flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[#0c121c]/95 px-3 py-2.5 text-white shadow-[0_18px_40px_rgba(2,6,23,0.26)] backdrop-blur-xl left-[max(0.75rem,env(safe-area-inset-left,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))]"
          style={{
            bottom: `calc(${(attachmentSheetOpen || composerStickerOpen ? 240 : 134)}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          <div className="min-w-0 flex-1 rounded-xl border-l-[3px] border-l-white/50 bg-black/25 py-2 pl-3 pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/38">{labels.replyingTo}</p>
            <p className="truncate text-[13px] text-white/75">{getReplySnippet(replyTarget, labels)}</p>
          </div>
          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/72 hover:bg-white/[0.06] hover:text-white" onClick={() => setReplyTarget(null)} aria-label={labels.cancelReply}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        className="fixed left-0 right-0 z-40 border-t border-white/[0.06] bg-[#070a12]/96 pt-2.5 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.35)] [touch-action:manipulation]"
        style={COMPOSER_BAR_STYLE}
      >
        <form onSubmit={handleSendMessage} className="mx-auto flex w-full max-w-[560px] flex-col gap-2 px-1 sm:px-0">
          <p id="chat-composer-format-hint" className="sr-only">
            {labels.formattingComposerHint}
          </p>
          {messageContent.trim() && !voiceDraft && !isRecording && (
            <p className="px-2 text-[11px] font-medium tracking-wide text-amber-300/85" role="status">
              <span>{labels.draftComposerLabel}</span>
              {putDraftMutation.isPending ? (
                <span className="ml-2 font-normal text-white/50">{labels.draftSaving}</span>
              ) : null}
            </p>
          )}
          {showSchedule && (
            <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-white/10 bg-[#0b1019]/96 px-3 py-2 text-white shadow-[0_10px_28px_rgba(2,6,23,0.18)]">
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={toDatetimeLocalInputValue(new Date())}
                className="rounded-xl border-white/12 bg-white/[0.04] text-sm text-white"
              />
              <button type="button" className="text-sm text-white/60 hover:text-white" onClick={() => { setShowSchedule(false); setScheduledAt(''); }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
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
            <div className="flex items-center gap-2 rounded-[28px] border border-white/10 bg-[#0d1624]/96 px-2.5 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.22)] backdrop-blur-xl">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/55 hover:bg-white/[0.08] hover:text-white"
                onClick={cancelRecording}
                aria-label={labels.discardVoice}
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-black/20 px-3 py-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">Rec</span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-white/90">{formatRecordingClock(recordingSeconds)}</span>
                <div className="flex h-5 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
                  {Array.from({ length: 34 }).map((_, i) => (
                    <span
                      key={`rd-${i}`}
                      className="shrink-0 rounded-full bg-white/55"
                      style={{ width: 3, height: `${6 + ((i * 7) % 12)}px`, opacity: 0.35 + ((i % 5) * 0.1) }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] hover:bg-red-600"
                onClick={stopRecording}
                aria-label={labels.stopRecording}
              >
                <Square className="h-4.5 w-4.5 fill-current" />
              </button>
            </div>
          ) : voiceDraft ? (
            <div className="flex items-center gap-2 rounded-[28px] border border-white/10 bg-[#0d1624]/96 px-2.5 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.22)] backdrop-blur-xl">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-800 hover:bg-white/90"
                onClick={togglePreviewPlayback}
                aria-label={previewPlaying ? labels.pausePreview : labels.playPreview}
              >
                {previewPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-black/20 px-3 py-2">
                <span className="shrink-0 font-mono text-sm tabular-nums text-white/90">{formatRecordingClock(voiceDraft.durationSec)}</span>
                <div className="flex h-5 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
                  {Array.from({ length: 34 }).map((_, i) => (
                    <span
                      key={`pv-${i}`}
                      className="shrink-0 rounded-full"
                      style={{
                        width: 3,
                        height: `${6 + ((i * 7) % 12)}px`,
                        backgroundColor: previewPlaying && i < 12 ? '#25D366' : 'rgba(255,255,255,0.55)',
                        opacity: previewPlaying && i < 12 ? 1 : 0.5,
                      }}
                    />
                  ))}
                </div>
                {ephemeralMode && (
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5 text-[11px] font-semibold text-white/72"
                    title={labels.ephemeralMode}
                  >
                    1
                  </span>
                )}
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/55 hover:bg-white/[0.08] hover:text-white"
                onClick={clearVoiceDraft}
                aria-label={labels.discardVoice}
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <Button
                type="button"
                disabled={voiceUploading || sendMessageMutation.isPending}
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600"
                onClick={() => sendVoiceDraft()}
                aria-label={labels.sendVoice}
              >
                {voiceUploading || sendMessageMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-[26px] border border-white/12 bg-[#0f1724]/98 px-1.5 py-1 shadow-[0_18px_40px_rgba(2,6,23,0.22)] backdrop-blur-xl">
                <button
                  type="button"
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-white/65 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.1]"
                  onClick={() => setComposerStickerOpen(true)}
                  disabled={sendMessageMutation.isPending || !conversationId}
                  aria-label={labels.composerStickers}
                >
                  <Sticker className="h-5 w-5" strokeWidth={1.8} />
                </button>
                <Input
                  placeholder={labels.placeholder}
                  value={messageContent}
                  onChange={handleInputChange}
                  onBlur={persistDraft}
                  disabled={sendMessageMutation.isPending || !conversationId}
                  enterKeyHint="send"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="on"
                  aria-describedby="chat-composer-format-hint"
                  className="min-h-[44px] h-12 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-[16px] text-white placeholder:text-white/34 shadow-none focus-visible:ring-0 sm:text-[15px]"
                />
                <button
                  type="button"
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-white/65 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.1]"
                  onClick={() => setAttachmentSheetOpen(true)}
                  disabled={sendMessageMutation.isPending || !conversationId}
                  aria-label={labels.attachmentSheetTitle}
                >
                  <Paperclip className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-white/65 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.1]"
                  onClick={() => setCameraSheetOpen(true)}
                  disabled={sendMessageMutation.isPending || !conversationId}
                  aria-label={labels.composerCamera}
                >
                  <Camera className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              {messageContent.trim() ? (
                <Button
                  type="submit"
                  disabled={sendMessageMutation.isPending || !conversationId}
                  size="icon"
                  className="mb-0.5 h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600"
                  aria-label={labels.composerSend}
                >
                  {sendMessageMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              ) : (
                <button
                  type="button"
                  className="mb-0.5 flex h-12 w-12 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-[0.97]"
                  onClick={() => startRecording()}
                  disabled={sendMessageMutation.isPending || !conversationId}
                  aria-label={labels.composerRecordVoice}
                >
                  <Mic className="h-6 w-6" />
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <Dialog
        open={!!viewOnceModal}
        onOpenChange={(open) => {
          if (!open) {
            if (viewOnceModal?.id) markViewOnceConsumed(viewOnceModal.id);
            setViewOnceModal(null);
          }
        }}
      >
        <DialogContent
          className="max-h-[min(92dvh,900px)] w-[min(96vw,520px)] overflow-hidden rounded-2xl border border-white/12 bg-[#0b1019] p-0 text-white"
          aria-describedby={undefined}
        >
          <DialogHeader className="border-b border-white/10 px-4 py-3">
            <DialogTitle className="text-base font-semibold text-white/92">{labels.ephemeralMode}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[min(78dvh,720px)] flex-col items-center justify-center bg-black p-2">
            {viewOnceModal?.kind === 'image' && viewOnceModal.url ? (
              <img src={viewOnceModal.url} alt="" className="max-h-[min(72dvh,680px)] w-auto max-w-full object-contain" />
            ) : null}
            {viewOnceModal?.kind === 'video' && viewOnceModal.url ? (
              <video
                src={viewOnceModal.url}
                controls
                playsInline
                className="max-h-[min(72dvh,680px)] w-full max-w-full bg-black object-contain"
                preload="metadata"
              />
            ) : null}
          </div>
          <div className="border-t border-white/10 px-4 py-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-xl bg-white/10 text-white hover:bg-white/16"
              onClick={() => {
                if (viewOnceModal?.id) markViewOnceConsumed(viewOnceModal.id);
                setViewOnceModal(null);
              }}
            >
              {labels.viewOnceClose}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[28px] border border-white/12 bg-[#0b1019] text-white">
          <DialogHeader>
            <DialogTitle>{labels.shareContact}</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/36" />
            <Input
              className="pl-9 rounded-full border-white/12 bg-white/[0.04] text-white placeholder:text-white/36"
              placeholder={labels.transferSearchPlaceholder ?? 'Rechercher un utilisateur...'}
              value={contactSearchQuery}
              onChange={(e) => setContactSearchQuery(e.target.value)}
            />
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
            {contactSearchLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-white/70" />
              </div>
            )}
            {!contactSearchLoading && contactSearchQuery.trim().length < 1 && (
              <p className="py-4 text-center text-sm text-white/42">{labels.transferSearchPlaceholder ?? 'Tapez pour rechercher'}</p>
            )}
            {!contactSearchLoading && contactSearchQuery.trim().length >= 1 && contactSearchUsers.length === 0 && (
              <p className="py-4 text-center text-sm text-white/42">{labels.transferNoUser}</p>
            )}
            {!contactSearchLoading &&
              contactSearchUsers
                .filter((u) => u.id !== currentUser?.id && u.id !== userId)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/[0.05]"
                    onClick={() => handleShareContact(u)}
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.profile_image} />
                      <AvatarFallback>{(u.full_name || u.username || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{u.full_name || u.username || u.id}</p>
                      {u.username && u.full_name && <p className="truncate text-xs text-white/46">@{u.username}</p>}
                    </div>
                  </button>
                ))}
          </div>
        </DialogContent>
      </Dialog>

      <ChatCameraSheet
        open={cameraSheetOpen}
        onOpenChange={setCameraSheetOpen}
        labels={{
          cameraTitle: labels.composerCamera,
          close: labels.cancel,
          gallery: labels.attachGallery,
          takePhoto: labels.attachCameraPhoto,
          recordVideo: labels.attachCameraVideo,
          stopRecording: labels.stopRecording,
          switchCamera: labels.cameraSwitch ?? 'Changer de caméra',
          flashOn: 'Flash activé',
          flashOff: 'Flash désactivé',
          videoNoteHint: 'Max 60 s',
          cameraUnsupported: 'Caméra non supportée',
          cameraPermissionDenied: 'Autorisez l’accès à la caméra.',
          cameraNotFound: 'Aucune caméra détectée.',
          cameraError: 'Impossible d’accéder à la caméra.',
        }}
        onCapture={handleCameraCapture}
        onGallery={() => {
          setCameraSheetOpen(false);
          requestAnimationFrame(() => fileInputRef.current?.click());
        }}
      />
      <ChatCameraPreviewSheet
        open={cameraPreviewOpen}
        draft={cameraDraft}
        sending={cameraSending}
        ephemeralActive={ephemeralMode}
        onClose={clearCameraDraft}
        onCaptionChange={(value) => setCameraDraft((prev) => (prev ? { ...prev, caption: value } : prev))}
        onSend={handleSendCameraDraft}
        recipientName={otherUser?.full_name || otherUser?.username || ''}
        onAddMoreMedia={() => {
          clearCameraDraft();
          requestAnimationFrame(() => fileInputRef.current?.click());
        }}
        labels={{
          close: labels.cancel,
          send: labels.composerSend,
          captionPlaceholder: 'Ajouter une légende...',
          previewTitle: labels.attachMedia,
          viewOnce: labels.ephemeralMode,
          cancel: labels.cancel,
        }}
      />

      <ChatAttachmentSheet
        open={attachmentSheetOpen}
        onOpenChange={setAttachmentSheetOpen}
        labels={labels}
        ephemeralActive={ephemeralMode}
        onGallery={() => {
          setAttachmentSheetOpen(false);
          requestAnimationFrame(() => fileInputRef.current?.click());
        }}
        onCameraPhoto={() => {
          setAttachmentSheetOpen(false);
          requestAnimationFrame(() => cameraPhotoInputRef.current?.click());
        }}
        onCameraVideo={() => {
          setAttachmentSheetOpen(false);
          requestAnimationFrame(() => cameraVideoInputRef.current?.click());
        }}
        onDocument={() => {
          setAttachmentSheetOpen(false);
          if (documentSending || sendMessageMutation.isPending) return;
          requestAnimationFrame(() => documentInputRef.current?.click());
        }}
        onLocation={() => {
          setAttachmentSheetOpen(false);
          handleShareLocation();
        }}
        onContact={() => {
          setAttachmentSheetOpen(false);
          setContactDialogOpen(true);
        }}
        onSchedule={() => {
          setAttachmentSheetOpen(false);
          setShowSchedule(true);
          setScheduledAt((prev) => prev || toDatetimeLocalInputValue(new Date(Date.now() + 2 * 60 * 1000)));
        }}
        onToggleEphemeral={() => {
          setAttachmentSheetOpen(false);
          if (ephemeralMode) handleSetEphemeralDuration(0);
          else handleSetEphemeralDuration(ephemeralTtlSec || EPHEMERAL_TTL_SECONDS.H24);
        }}
        onAudioHint={() => {
          setAttachmentSheetOpen(false);
          toast.info(labels.attachAudioHint);
        }}
        onPoll={() => {
          setAttachmentSheetOpen(false);
          setPollDialogOpen(true);
        }}
        onPollSoon={() => toast.info(labels.comingSoonPremium)}
        onEvent={() => {
          setAttachmentSheetOpen(false);
          setEventShareOpen(true);
        }}
        onEventSoon={() => toast.info(labels.comingSoonPremium)}
        onAiImagesSoon={() => toast.info(labels.comingSoonPremium)}
      />

      <ChatStickerComposerSheet
        open={composerStickerOpen}
        onOpenChange={setComposerStickerOpen}
        labels={labels}
        emojiSearch={composerStickerSearch}
        setEmojiSearch={setComposerStickerSearch}
        onPickEmoji={(emoji) => {
          setMessageContent((p) => p + emoji);
          setComposerStickerOpen(false);
        }}
        onPickStickerUrl={(url) => {
          sendMessageMutation.mutate({
            content: '',
            type: 'sticker',
            sticker_url: url,
            reply_to_message_id: replyTarget?.id || undefined,
            is_ephemeral: ephemeralMode === true ? true : undefined,
            expires_at: ephemeralMode ? ephemeralExpiresIso() : undefined,
          });
          setComposerStickerOpen(false);
        }}
        giphyApiKey={typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GIPHY_API_KEY : ''}
        onPickGifUrl={(url) => {
          if (!url) return;
          sendMessageMutation.mutate({
            content: 'GIF',
            type: 'image',
            media_url: url,
            reply_to_message_id: replyTarget?.id || undefined,
            is_ephemeral: ephemeralMode === true ? true : undefined,
            expires_at: ephemeralMode ? ephemeralExpiresIso() : undefined,
          });
          setComposerStickerOpen(false);
        }}
        onStickerCreateSoon={() => toast.info(labels.stickerCreateSoon)}
      />

      <Dialog
        open={pollDialogOpen}
        onOpenChange={(v) => {
          setPollDialogOpen(v);
          if (!v) {
            setPollQuestion('');
            setPollOptionRows(['', '']);
          }
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-[#0c121c] text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>{labels.pollDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder={labels.pollQuestionPlaceholder}
              className="min-h-[72px] resize-y border-white/15 bg-black/25 text-white placeholder:text-white/35"
              maxLength={500}
            />
            <div className="space-y-2">
              {pollOptionRows.map((row, i) => (
                <Input
                  key={`dm-poll-opt-${i}`}
                  value={row}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPollOptionRows((prev) => prev.map((p, j) => (j === i ? v : p)));
                  }}
                  placeholder={labels.pollOptionPlaceholder(i + 1)}
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
                {labels.pollAddOption}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10"
                disabled={pollOptionRows.length <= 2}
                onClick={() => setPollOptionRows((r) => (r.length <= 2 ? r : r.slice(0, -1)))}
              >
                {labels.pollRemoveLastOption}
              </Button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-white/75 hover:bg-white/10 hover:text-white"
                onClick={() => setPollDialogOpen(false)}
              >
                {labels.cancel}
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
                disabled={sendMessageMutation.isPending}
                onClick={handlePublishPoll}
              >
                {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.pollPublish}
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
            <DialogTitle>{labels.eventShareSheetTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
              placeholder={labels.eventShareSearchPlaceholder}
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
                        {labels.eventShareMyTickets}
                      </p>
                      <ul className="space-y-2">
                        {ticketEvents.map((ev) => (
                          <li key={`ev-tk-${ev.id}`}>
                            <button
                              type="button"
                              onClick={() => handleSelectSharedEvent(ev)}
                              disabled={sendMessageMutation.isPending}
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
                                    {format(new Date(ev.start_date), "EEE d MMM yyyy · HH:mm", { locale: fr })}
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
                        {labels.eventShareDiscover}
                      </p>
                      <ul className="space-y-2">
                        {discoverEvents.map((ev) => (
                          <li key={`ev-pub-${ev.id}`}>
                            <button
                              type="button"
                              onClick={() => handleSelectSharedEvent(ev)}
                              disabled={sendMessageMutation.isPending}
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
                                    {format(new Date(ev.start_date), "EEE d MMM yyyy · HH:mm", { locale: fr })}
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
                    <p className="py-8 text-center text-sm text-white/45">{labels.eventShareEmpty}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reactionsDialogOpen}
        onOpenChange={(v) => {
          setReactionsDialogOpen(v);
          if (!v) setReactionsDialogMessageId(null);
        }}
      >
        <DialogContent className="max-h-[min(72dvh,440px)] rounded-[28px] border border-white/12 bg-[#0b1019] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.reactionsDetailTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(52dvh,380px)] overflow-y-auto py-1">
            {reactionsDetailLoading ? (
              <div className="flex justify-center py-12" role="status" aria-live="polite">
                <Loader2 className="h-8 w-8 animate-spin text-white/35" />
              </div>
            ) : reactionsDetailList.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/45">{labels.reactionsDetailEmpty}</p>
            ) : (
              <ul className="space-y-0.5">
                {reactionsDetailList.map((r) => (
                  <li key={r.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.04]">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={r.profile_image || undefined} />
                      <AvatarFallback className="bg-white/12 text-sm text-white">
                        {(r.full_name || r.username || '?')[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-white/88">
                      {r.user_id === currentUser?.id
                        ? labels.reactionsDetailYou
                        : r.full_name || r.username || r.user_id.slice(0, 8)}
                    </span>
                    <span className="text-2xl leading-none">{r.emoji}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageActionsOpen} onOpenChange={setMessageActionsOpen}>
        <DialogContent className="max-h-[min(90dvh,640px)] w-[min(100vw-1.5rem,360px)] gap-0 overflow-hidden rounded-[28px] border border-white/12 bg-[#0a0f18] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-w-[360px]">
          <DialogHeader className="sr-only">
            <DialogTitle>{labels.actions}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pt-4 pb-1">
            <p className="text-center text-[13px] text-white/45">{formatMessageActionsTimestamp(activeMessage?.created_at)}</p>
          </div>
          <div className="mx-3 mb-3 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2.5 backdrop-blur-md">
            <p className="mb-2 text-center text-[11px] leading-tight text-white/38">{labels.superReactionHint}</p>
            <div className="flex items-center justify-between gap-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl leading-none transition-transform active:scale-90 hover:bg-white/[0.08] hover:scale-110"
                  onClick={() => handleReactToMessage(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/85 hover:bg-white/[0.12]"
                onClick={() => { setMessageActionsOpen(false); setEmojiPickerOpen(true); }}
                aria-label={labels.chooseReaction}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mx-2 mb-3 max-h-[min(48dvh,420px)] overflow-y-auto rounded-[22px] border border-white/10 bg-[#0e141f] py-1">
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={() => handleReplyMessage(activeMessage)}>
              <Reply className="h-5 w-5 shrink-0 text-white/55" />
              <span>{labels.replyTo}</span>
            </button>
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={handleStickerFromMenu}>
              <Sticker className="h-5 w-5 shrink-0 text-white/55" />
              <span>{labels.addSticker}</span>
            </button>
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={handleTransferOpen}>
              <Forward className="h-5 w-5 shrink-0 text-white/55" />
              <span>{labels.transfer}</span>
            </button>
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={() => handleCopyMessage(activeMessage)}>
              <Copy className="h-5 w-5 shrink-0 text-white/55" />
              <span>{labels.copy}</span>
            </button>
            {canEditTextMessage(activeMessage, currentUser?.id) && (
              <button
                type="button"
                className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]"
                onClick={() => openEditMessage(activeMessage)}
              >
                <Pencil className="h-5 w-5 shrink-0 text-white/55" />
                <span>{labels.editMessage}</span>
              </button>
            )}
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={() => handleOpenTranslate()}>
              <Languages className="h-5 w-5 shrink-0 text-white/55" />
              <span>{labels.translate}</span>
            </button>
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={() => handlePinMessage(activeMessage)}>
              <Pin className="h-5 w-5 shrink-0 text-white/55" />
              <span>{activeMessage?.id === pinnedMessageId ? labels.unpinned : labels.pinMessage}</span>
            </button>
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={() => handleMarkImportant(activeMessage)}>
              <Star className="h-5 w-5 shrink-0 text-white/55" />
              <span>{labels.markImportant}</span>
            </button>
            <button type="button" className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] hover:bg-white/[0.05]" onClick={() => handleSelectMessageMode(activeMessage)}>
              <CheckSquare className="h-5 w-5 shrink-0 text-white/55" />
              <span>{labels.select}</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] text-red-400 hover:bg-red-500/10"
              onClick={() => { setMessageActionsOpen(false); setConfirmAction({ type: 'report', messageId: activeMessage?.id }); }}
            >
              <Flag className="h-5 w-5 shrink-0 text-red-400" />
              <span>{labels.report}</span>
            </button>
            {(activeMessage?.sender_id === currentUser?.id) && (
              <>
                {activeMessage?.status === 'scheduled' && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] text-amber-200/95 hover:bg-amber-500/12"
                    onClick={() => {
                      setMessageActionsOpen(false);
                      setConfirmAction({ type: 'cancel_scheduled', messageId: activeMessage?.id });
                    }}
                  >
                    <TimerOff className="h-5 w-5 shrink-0 text-amber-300/90" />
                    <span>{labels.cancelScheduledSend}</span>
                  </button>
                )}
                {activeMessage?.created_at && (Date.now() - new Date(activeMessage.created_at).getTime() < 15 * 60 * 1000) && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3.5 rounded-xl border border-red-500/25 bg-red-500/[0.12] px-4 py-3.5 text-left text-[15px] font-medium text-red-200 hover:bg-red-500/18"
                    onClick={() => { setMessageActionsOpen(false); setConfirmAction({ type: 'delete_for_all', messageId: activeMessage?.id }); }}
                    disabled={deleteForAllMutation.isPending}
                  >
                    <UserMinus className="h-5 w-5 shrink-0 text-red-300" />
                    <span>{labels.deleteForAll ?? 'Supprimer pour tous'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-[15px] text-red-400 hover:bg-red-500/10"
                  onClick={() => { setMessageActionsOpen(false); setConfirmAction({ type: 'delete', messageId: activeMessage?.id }); }}
                >
                  <Trash2 className="h-5 w-5 shrink-0" />
                  <span>{labels.delete}</span>
                </button>
              </>
            )}
            <button type="button" className="flex w-full items-center justify-center py-3 text-[14px] text-white/38 hover:bg-white/[0.03]" onClick={() => setMessageActionsOpen(false)}>
              {labels.messageMenuMore}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden border border-white/12 bg-[#0b1019] text-white">
          <DialogHeader className="px-4 pt-3 pb-2 border-b border-white/10">
            <DialogTitle className="text-base">{labels.chooseReaction}</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/36" />
              <Input className="pl-9 rounded-full border-white/12 bg-white/[0.04] text-white placeholder:text-white/36" placeholder={labels.searchReaction} value={emojiSearch} onChange={(e) => setEmojiSearch(e.target.value)} />
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-white/46 mb-2">{labels.reactionsRecent}</p>
            <div className="flex gap-3 mb-4">
              {QUICK_REACTIONS.slice(0, 2).map((emoji) => (
                <button key={`recent-${emoji}`} type="button" className="text-3xl leading-none" onClick={() => handleReactToMessage(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-sm text-white/46 mb-2">{labels.emojiAndPeople}</p>
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
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden border border-white/12 bg-[#0b1019] text-white">
          <DialogHeader className="px-4 pt-3 pb-2 border-b border-white/10">
            <DialogTitle className="text-base">{labels.transferTo}</DialogTitle>
          </DialogHeader>
          <p className="px-4 pt-2 text-[12px] leading-snug text-white/42">{labels.forwardOneRecipientHint}</p>
          <div className="px-4 py-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/36" />
              <Input
                className="pl-9 rounded-full border-white/12 bg-white/[0.04] text-white placeholder:text-white/36"
                placeholder={labels.transferSearchPlaceholder}
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {transferLoading ? (
              <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/70" /></div>
            ) : transferUsers.length > 0 ? (
              transferUsers
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] text-left"
                    onClick={() => transferMutation.mutate(u)}
                    disabled={transferMutation.isPending}
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.profile_image} />
                      <AvatarFallback className="bg-slate-700 text-white">
                        {(u.full_name || u.username || 'U')?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.full_name || u.username}</p>
                      <p className="text-xs text-white/46 truncate">@{u.username}</p>
                    </div>
                  </button>
                ))
            ) : (
              <p className="text-sm text-white/42 px-2 py-6 text-center">{labels.transferNoUser}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingMessageId(null);
            setEditText('');
          }
        }}
      >
        <DialogContent className="rounded-[28px] border border-white/12 bg-[#0b1019] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.editMessageTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEditMessage} className="space-y-4 py-1">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={labels.editMessagePlaceholder}
              className="min-h-[120px] rounded-2xl border-white/12 bg-white/[0.06] text-white placeholder:text-white/35"
              maxLength={2000}
              aria-describedby="chat-composer-format-hint"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/18 bg-transparent text-white hover:bg-white/[0.06]"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingMessageId(null);
                  setEditText('');
                }}
              >
                {labels.cancel}
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-white text-slate-950 hover:bg-white/90"
                disabled={!editText.trim() || editMessageMutation.isPending}
              >
                {editMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.editMessageSave}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={translateOpen}
        onOpenChange={(open) => {
          setTranslateOpen(open);
          if (!open) {
            setTranslateError(null);
            setTranslateResult('');
            setTranslateOriginal('');
            setTranslateDetectedCode('');
          }
        }}
      >
        <DialogContent className="max-h-[min(90dvh,560px)] overflow-y-auto rounded-[28px] border border-white/12 bg-[#0b1019] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.translateTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {translateLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-10" role="status" aria-live="polite">
                <Loader2 className="h-9 w-9 animate-spin text-white/45" />
                <p className="text-sm text-white/45">{labels.translateLoading}</p>
              </div>
            )}
            {!translateLoading && translateError && (
              <>
                <p className="text-sm leading-relaxed text-red-400">{translateError}</p>
                <Button type="button" className="w-full rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={() => setTranslateOpen(false)}>
                  {labels.translateClose}
                </Button>
              </>
            )}
            {!translateLoading && !translateError && translateResult && (
              <>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/38">{labels.translateOriginalLabel}</p>
                  <p className="max-h-28 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/22 px-3 py-2.5 text-[14px] leading-snug text-white/75">
                    {translateOriginal}
                  </p>
                  {translateDetectedCode ? (
                    <p className="mt-2 text-xs text-white/46">
                      {labels.translateDetected}
                      {': '}
                      {(() => {
                        try {
                          const loc = language === 'en' ? 'en' : 'fr';
                          const code = translateDetectedCode.split('-')[0];
                          return new Intl.DisplayNames([loc], { type: 'language' }).of(code) || translateDetectedCode;
                        } catch {
                          return translateDetectedCode;
                        }
                      })()}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/38">{labels.translateResultLabel}</p>
                  <p className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2.5 text-[14px] leading-snug text-white">
                    {translateResult}
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-full border-white/18 bg-transparent text-white hover:bg-white/[0.06]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(translateResult);
                        toast.success(labels.copied);
                      } catch {
                        toast.error(labels.sendError);
                      }
                    }}
                  >
                    {labels.translateCopy}
                  </Button>
                  <Button type="button" className="flex-1 rounded-full bg-white text-slate-950 hover:bg-white/90" onClick={() => setTranslateOpen(false)}>
                    {labels.translateClose}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mediaGalleryOpen} onOpenChange={setMediaGalleryOpen}>
        <DialogContent className="max-h-[min(85dvh,560px)] w-[min(100vw-1.5rem,400px)] gap-0 overflow-hidden rounded-[28px] border border-white/12 bg-[#0b1019] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-w-[400px]">
          <DialogHeader className="border-b border-white/10 px-4 py-3 text-left">
            <DialogTitle className="text-base">{labels.mediaLinksDocsTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex border-b border-white/10 px-2">
            {(['media', 'links', 'docs']).map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  mediaGalleryTab === tab ? 'border-b-2 border-emerald-400 text-white' : 'text-white/45 hover:text-white/70'
                )}
                onClick={() => setMediaGalleryTab(tab)}
              >
                {tab === 'media' ? labels.tabMedia : tab === 'links' ? labels.tabLinks : labels.tabDocs}
              </button>
            ))}
          </div>
          <div className="max-h-[min(52dvh,420px)] overflow-y-auto p-3">
            {mediaGalleryTab === 'media' && (
              mediaGalleryItems.media.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/45">{labels.noMediaYet}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaGalleryItems.media.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    >
                      {item.type === 'video' ? (
                        <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                      ) : item.type === 'audio' || item.type === 'voice' ? (
                        <Mic className="h-9 w-9 text-white/55" aria-hidden />
                      ) : (
                        <img src={item.thumb || item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </a>
                  ))}
                </div>
              )
            )}
            {mediaGalleryTab === 'links' && (
              mediaGalleryItems.links.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/45">{labels.noLinksYet}</p>
              ) : (
                <ul className="space-y-2">
                  {mediaGalleryItems.links.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-emerald-300/95 hover:bg-white/[0.08]"
                      >
                        {item.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )
            )}
            {mediaGalleryTab === 'docs' && (
              mediaGalleryItems.docs.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/45">{labels.noDocsYet}</p>
              ) : (
                <ul className="space-y-2">
                  {mediaGalleryItems.docs.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 truncate rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/88 hover:bg-white/[0.08]"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-emerald-300/90" aria-hidden />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="border border-white/12 bg-[#0b1019] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogMeta.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/58">{confirmDialogMeta.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/12 bg-transparent text-white hover:bg-white/[0.05] hover:text-white">{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-white text-slate-950 hover:bg-white/90" onClick={handleConfirmAction}>
              {labels.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ChatScreenShell>
  );
}
