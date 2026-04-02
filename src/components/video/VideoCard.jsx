// AfriWonder full review PR - CodeRabbit
// @ts-nocheck
/* cspell:disable-file */
/**
 * VideoCard — full-screen feed player. Single active item, poster until first frame, HLS/MP4.
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, memo } from 'react';
import Heart from 'lucide-react/icons/heart';
import MessageCircle from 'lucide-react/icons/message-circle';
import Share2 from 'lucide-react/icons/share-2';
import Bookmark from 'lucide-react/icons/bookmark';
import Play from 'lucide-react/icons/play';
import Pause from 'lucide-react/icons/pause';
import Volume2 from 'lucide-react/icons/volume-2';
import VolumeX from 'lucide-react/icons/volume-x';
import Loader2 from 'lucide-react/icons/loader-2';
import BadgeCheck from 'lucide-react/icons/badge-check';
import Music2 from 'lucide-react/icons/music-2';
import DollarSign from 'lucide-react/icons/dollar-sign';
import UserPlus from 'lucide-react/icons/user-plus';
import UserCheck from 'lucide-react/icons/user-check';
import Eye from 'lucide-react/icons/eye';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getVideoPlaybackUrl, getVideoPlaybackUrlCandidates, getAbsoluteImageUrl, isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG, isMobileOrPWA } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/components/common/useTranslation";
import { api } from '@/api/expressClient';
import { toast } from 'sonner';
import Hls from 'hls.js';
import { formatFeedCount, getCreatorInitial } from '@/features/feed/feedUtils';
import { canRequestWebPlaybackRepair } from '@/lib/videoWebRepairAccess';
import AfriWonderLogo from '@/components/common/AfriWonderLogo';

const extractHashtags = (description) => {
  if (!description) return [];
  const matches = description.match(/#[\w]+/g);
  return matches ? matches.map((t) => t.slice(1)) : [];
};

const extractMusicTitle = (description) => {
  if (!description) return null;
  const m = description.match(/ðŸŽµ Musique:\s*(.+?)(?:\n|$)/);
  return m ? m[1].trim() : null;
};

const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/\n\n#[\w\s#]+/g, '')
    .replace(/\n\nðŸŽµ Musique:.*/g, '')
    .trim();
};

/** Si la 1re ligne du texte n’est que le @pseudo du créateur, on la retire (évite doublon avec la ligne identité). */
const stripRedundantCreatorLine = (text, creatorSlug) => {
  if (!text || !creatorSlug) return text;
  const slug = String(creatorSlug).replace(/^@+/, '').trim();
  if (!slug) return text;
  const t = String(text).trim();
  const nl = t.indexOf('\n');
  const firstLine = (nl === -1 ? t : t.slice(0, nl)).trim();
  const normalize = (s) => s.replace(/^@+/, '').toLowerCase();
  const looksLikeSoloHandle = /^@?[\w._-]{1,64}$/.test(firstLine);
  if (looksLikeSoloHandle && normalize(firstLine) === slug.toLowerCase()) {
    return (nl === -1 ? '' : t.slice(nl + 1).trim());
  }
  return t;
};

const FEED_ACTION_BUTTON_CLASS =
  'group relative flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent shadow-none backdrop-blur-0 transition-all duration-200 ease-out hover:bg-white/12 active:scale-[0.93]';

const FEED_ACTION_LABEL_CLASS =
  'min-h-[13px] text-[10px] font-semibold leading-tight tabular-nums tracking-[-0.01em] text-white/82 drop-shadow-[0_1px_10px_rgba(0,0,0,0.55)]';

function FeedActionButton({
  children,
  className,
  onClick,
  onTouchStart,
  label,
  pressed = false,
  feedback = false,
  ...props
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClick}
      onTouchStart={onTouchStart}
      className={cn(
        FEED_ACTION_BUTTON_CLASS,
        pressed && 'bg-white/16',
        feedback && 'bg-white/14',
        className
      )}
      aria-label={label}
      {...props}
    >
      {children}
    </motion.button>
  );
}

function FeedActionLabel({ children }) {
  return <span className={FEED_ACTION_LABEL_CLASS}>{children}</span>;
}

function VideoCardContent({
  video,
  isActive,
  onLike,
  onComment,
  onShare,
  onSave,
  onProfileClick,
  onTip,
  onSubscribe,
  isLiked,
  isSaved,
  isMuted,
  onMuteToggle,
  isFollowing,
  compact = false,
  shouldPreload = false,
  videoPoolRef = null,
  poolIndex = undefined,
  canLike = true,
  onRequireAuth,
  onInitialVisualReady,
  currentUser: currentUserProp = null,
  hideActions = false,
}) {
  const videoRef = useRef(null);
  const poolContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const progressBarRef = useRef(null);
  const viewRecordedRef = useRef(false);
  const userPausedRef = useRef(false);
  const navigate = useNavigate();

  /** `VITE_DEBUG_VIDEO_UI=1` en dev : contour rouge DOM + bandeau technique sur « Vidéo indisponible » (jamais pour le public). */
  const debugVideoUi = import.meta.env.DEV && import.meta.env.VITE_DEBUG_VIDEO_UI === '1';

  let hashtags = video.hashtags;
  if (typeof hashtags === 'string') {
    try {
      hashtags = JSON.parse(hashtags);
    } catch {
      hashtags = extractHashtags(video.description || '');
    }
  }
  if (!Array.isArray(hashtags) || hashtags.length === 0) {
    hashtags = extractHashtags(video.description || '');
  }
  const musicTitle = video.music_title || extractMusicTitle(video.description || '');
  const displayDescription = cleanDescription(video.description || '');

  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentUser, setCurrentUser] = useState(currentUserProp);
  const [following, setFollowing] = useState(isFollowing || false);
  const hasAutoPlayedRef = useRef(false);
  const hasPlayedOnceRef = useRef(false);
  const hasAppliedStartTimeRef = useRef(false);
  const isMutedRef = useRef(!!isMuted);
  const [autoplayMutedFallback, setAutoplayMutedFallback] = useState(!!isMuted);
  /** PWA/mobile : true une fois l'autoplay réussi, pour afficher le son selon la préférence utilisateur */
  const [hasAutoplaySucceeded, setHasAutoplaySucceeded] = useState(false);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [manualPlaybackUrlOverride, setManualPlaybackUrlOverride] = useState('');
  const [isRepairingPlayback, setIsRepairingPlayback] = useState(false);

  useEffect(() => {
    isMutedRef.current = !!isMuted;
  }, [isMuted]);

  // Synchroniser avec les props (abonnement + likes)
  useEffect(() => {
    setFollowing(isFollowing || false);
  }, [isFollowing]);

  useEffect(() => {
    setCurrentUser(currentUserProp || null);
  }, [currentUserProp]);

  // État local pour like (toggle immédiat, 1 like max par utilisateur)
  const [localIsLiked, setLocalIsLiked] = useState(!!isLiked);
  // Réaction courante (CPO 2.44 : like, love, fire) — total = sum(reaction_counts) ou video.likes
  const reactionCounts = video.reaction_counts && typeof video.reaction_counts === 'object' ? video.reaction_counts : null;
  const initialCount = reactionCounts
    ? Object.values(reactionCounts).reduce((a, b) => a + (Number(b) || 0), 0)
    : (video.likes || 0);
  const [likeCount, setLikeCount] = useState(initialCount);

  // Quand on change de vidéo, on resynchronise sur l'état serveur
  useEffect(() => {
    setLocalIsLiked(!!isLiked);
    if (video.reaction_counts && typeof video.reaction_counts === 'object') {
      const sum = Object.values(video.reaction_counts).reduce((a, b) => a + (Number(b) || 0), 0);
      setLikeCount(sum);
    } else {
      setLikeCount(video.likes || 0);
    }
  }, [video.id]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [actionFeedback, setActionFeedback] = useState({});
  const [hasFirstFrameRendered, setHasFirstFrameRendered] = useState(false);
  /** Pour timers de déblocage (évite closures périmées sur première frame / route). */
  const hasFirstFrameRenderedRef = useRef(false);
  const creatorInitial = useMemo(() => getCreatorInitial(video.creator_name), [video.creator_name]);
  const creatorIdStr = String(video?.creator_id ?? '');
  const currentUserIdStr = String(currentUser?.id ?? '');
  const isOwnVideo = !!currentUserIdStr && !!creatorIdStr && currentUserIdStr === creatorIdStr;
  const isCreatorFollowed = Boolean(following || isFollowing);
  const canShowFollowCta = !!currentUser && !isOwnVideo;
  const canRepairWebPlayback = canRequestWebPlaybackRepair(currentUser, video.creator_id);
  const posterRef = useRef(null);
  const firstFrameDetectionRef = useRef({
    element: null,
    videoFrameRequestId: null,
    rafIds: [],
  });

  /* ⛔ ZONE LECTURE VERROUILLÉE — DÉBUT
   * Ne pas modifier sans demande explicite utilisateur — cf. .cursor/rules/video-player-locked.mdc
   * (1re frame, autoplay, HLS, pool, handlers média, progression/seek ; régressions buffer / swipe). */

  const hasDecodedVideoFrame = useCallback((el) => {
    if (!el) return false;
    return Number(el.videoWidth || 0) > 0 && Number(el.videoHeight || 0) > 0;
  }, []);
  const canRevealVideoVisually = useCallback((el) => {
    if (!el) return false;
    if (hasDecodedVideoFrame(el)) return true;
    return Number(el.currentTime || 0) > 0.05;
  }, [hasDecodedVideoFrame]);
  const markFirstFrameRendered = useCallback((el) => {
    if (canRevealVideoVisually(el)) {
      setHasFirstFrameRendered(true);
    }
  }, [canRevealVideoVisually]);
  const cancelPendingFirstFrameDetection = useCallback(() => {
    const current = firstFrameDetectionRef.current;
    if (current.element && current.videoFrameRequestId != null && typeof current.element.cancelVideoFrameCallback === 'function') {
      try {
        current.element.cancelVideoFrameCallback(current.videoFrameRequestId);
      } catch (_) {}
    }
    current.rafIds.forEach((id) => cancelAnimationFrame(id));
    firstFrameDetectionRef.current = {
      element: null,
      videoFrameRequestId: null,
      rafIds: [],
    };
  }, []);
  const scheduleFirstFrameDetection = useCallback((el) => {
    if (!el || hasFirstFrameRendered) return;
    cancelPendingFirstFrameDetection();

    if (typeof el.requestVideoFrameCallback === 'function') {
      const requestId = el.requestVideoFrameCallback(() => {
        firstFrameDetectionRef.current = {
          element: null,
          videoFrameRequestId: null,
          rafIds: [],
        };
        markFirstFrameRendered(el);
      });
      firstFrameDetectionRef.current = {
        element: el,
        videoFrameRequestId: requestId,
        rafIds: [],
      };
      return;
    }

    const rafIds = [];
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        firstFrameDetectionRef.current = {
          element: null,
          videoFrameRequestId: null,
          rafIds: [],
        };
        markFirstFrameRendered(el);
      });
      firstFrameDetectionRef.current = {
        element: null,
        videoFrameRequestId: null,
        rafIds: [raf2],
      };
    });
    rafIds.push(raf1);
    firstFrameDetectionRef.current = {
      element: null,
      videoFrameRequestId: null,
      rafIds,
    };
  }, [cancelPendingFirstFrameDetection, hasFirstFrameRendered, markFirstFrameRendered]);

  const prepareForAutoplay = useCallback((el, useMuted = true) => {
    if (!el) return;
    if (useMuted) {
      el.muted = true;
      el.defaultMuted = true;
      el.setAttribute('muted', '');
      try { el.volume = 0; } catch (_) {}
    } else {
      el.defaultMuted = false;
      el.muted = false;
      el.removeAttribute('muted');
      try { el.volume = 1; } catch (_) {}
    }
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', 'true');
    el.setAttribute('autoplay', '');
  }, []);

  const markAutoPlaySuccess = useCallback((usedMutedMode) => {
    setIsPlaying(true);
    hasAutoPlayedRef.current = true;
    setHasAutoplaySucceeded(true);
    setAutoplayMutedFallback(!!usedMutedMode);
  }, []);

  const autoplayWithPolicy = useCallback(async (el, options = {}) => {
    if (!el) return false;
    // Autoplay en muet par défaut pour respecter la règle navigateur (mobile/PWA).
    const preferMuted = typeof options.preferMuted === 'boolean' ? options.preferMuted : true;
    const allowMutedFallback = options.allowMutedFallback !== false;

    const attempt = async (mutedMode) => {
      prepareForAutoplay(el, mutedMode);
      await el.play();
      markAutoPlaySuccess(mutedMode);
      return true;
    };

    try {
      return await attempt(preferMuted);
    } catch (_) {
      if (!allowMutedFallback || preferMuted) return false;
      try {
        return await attempt(true);
      } catch (_) {
        return false;
      }
    }
  }, [markAutoPlaySuccess, prepareForAutoplay]);

  // Connexion lente â†’ prÃ©fÃ©rer basse qualitÃ© si dispo.
  // But: Ã©viter les faux positifs (on ne veut pas afficher une alerte rÃ©seau si Ã§a va bien).
  const slowConnection = useMemo(() => {
    if (typeof navigator === 'undefined' || !navigator.connection) return false;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;

    const effectiveType = conn.effectiveType ? String(conn.effectiveType).toLowerCase() : '';
    const saveData = !!conn.saveData;
    const downlink = typeof conn.downlink === 'number' ? conn.downlink : null;
    const rtt = typeof conn.rtt === 'number' ? conn.rtt : null;

    // On garde uniquement le cas "trÃ¨s lent" (slow-2g) pour ne pas sur-dÃ©clencher.
    const isSlowByType = effectiveType === 'slow-2g';
    const isSlowByMetrics =
      (downlink != null && downlink > 0 && downlink < 1.5) || (rtt != null && rtt > 350);

    // saveData seul = peut Ãªtre un choix utilisateur sans Ãªtre vraiment lent.
    // On ne le traite comme "slow" que si le type ou les mÃ©triques indiquent une vraie lenteur.
    return isSlowByType || (saveData && isSlowByMetrics);
  }, []);
  const isOffline = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return navigator.onLine === false;
  }, []);
  const isFirefoxBrowser = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /firefox/i.test(navigator.userAgent || '');
  }, []);

  /** Le wrapper ne doit pas forcer un calque GPU sur Firefox/mobile ; on stabilise plutôt la balise <video> elle-même. */
  const gpuCompositingLayerStyle =
    isFirefoxBrowser || isMobileOrPWA()
      ? {}
      : { transform: 'translateZ(0)', backfaceVisibility: 'hidden' };

  // Liste de sources de secours : si une source échoue, on passe à la suivante.
  const playbackUrls = useMemo(() => {
    const out = [];
    const pushUrl = (raw) => {
      if (raw == null || raw === '') return;
      const candidates = getVideoPlaybackUrlCandidates(raw);
      const list = candidates.length > 0 ? candidates : [typeof raw === 'string' ? raw : ''];
      for (const u of list) {
        if (!u || typeof u !== 'string' || u.trim() === '') continue;
        if (!out.includes(u)) out.push(u);
      }
    };
    pushUrl(manualPlaybackUrlOverride);
    // Chrome / WebView : MP4 avant HLS (hls.js peut donner du son sans image sur certains GPU).
    // Firefox : souvent strict sur le MP4 progressif (HEVC, H.264 High 10…) — si un master HLS existe,
    // il est en général déjà en segments H.264 8 bits lisibles ; on le tente en premier.
    const hlsUrl = video.hls_playback_url || video.hls_url;
    const preferHlsFirst = isOffline || (isFirefoxBrowser && !!hlsUrl);
    if (preferHlsFirst) pushUrl(hlsUrl);

    if (slowConnection || isDataSaver) {
      pushUrl(video.low_quality_playback_url || video.low_quality_url);
      pushUrl(video.playback_url || video.video_url || video.hd_playback_url || video.hd_url);
      pushUrl(video.hd_playback_url || video.hd_url);
    } else {
      // Firefox : MP4 « full » souvent High/10 bits refusés — tenter bas débit en premier si dispo.
      if (isFirefoxBrowser) {
        pushUrl(video.low_quality_playback_url || video.low_quality_url);
      }
      pushUrl(video.playback_url || video.video_url || video.hd_playback_url || video.hd_url);
      pushUrl(video.hd_playback_url || video.hd_url);
      if (!isFirefoxBrowser) {
        pushUrl(video.low_quality_playback_url || video.low_quality_url);
      }
    }

    // HLS en repli : quand on est hors-ligne, il est déjà en tête.
    if (!preferHlsFirst) pushUrl(hlsUrl);
    return out;
  }, [
    video.hls_playback_url,
    video.hls_url,
    video.playback_url,
    video.video_url,
    video.low_quality_playback_url,
    video.low_quality_url,
    video.hd_playback_url,
    video.hd_url,
    slowConnection,
    isDataSaver,
    isOffline,
    isFirefoxBrowser,
    manualPlaybackUrlOverride,
  ]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const videoUrl = playbackUrls[sourceIndex] || '';
  const hasFallbackSource = sourceIndex < playbackUrls.length - 1;
  const moveToNextSource = useCallback(() => {
    setSourceIndex((prev) => Math.min(prev + 1, Math.max(0, playbackUrls.length - 1)));
  }, [playbackUrls.length]);

  useEffect(() => {
    setSourceIndex(0);
    errorRetriedRef.current = false;
  }, [video.id, playbackUrls.join('|')]);

  useEffect(() => {
    setManualPlaybackUrlOverride('');
    setIsRepairingPlayback(false);
  }, [video.id]);

  useEffect(() => {
    setAutoplayMutedFallback(!!isMuted);
  }, [video.id, videoUrl, isMuted]);

  const isHls = useMemo(() => /\.m3u8(\?|$)/i.test(videoUrl || ''), [videoUrl]);

  // Source vidéo : toujours passer l'URL (évite écran noir pour HLS avant que Hls.js prenne le relais ; Safari lit le .m3u8 en natif)
  const videoSrc =
    videoUrl ||
    getVideoPlaybackUrl(video.playback_url) ||
    getVideoPlaybackUrl(video.video_url) ||
    getVideoPlaybackUrl(video.hls_playback_url) ||
    getVideoPlaybackUrl(video.hls_url);

  const lastWarnedVideoIdRef = useRef(null);
  if (process.env.NODE_ENV === 'development' && (videoUrl === '' || videoUrl == null) && lastWarnedVideoIdRef.current !== video?.id) {
    lastWarnedVideoIdRef.current = video?.id ?? null;
     
    console.warn('VideoCard VIDEO URL vide ou undefined — vérifier le backend (video_url)', { videoId: video?.id });
  }
  if (videoUrl && videoUrl.trim() !== '') lastWarnedVideoIdRef.current = null;
  
  // Jamais vide : thumbnail absolu ou placeholder (évite écran noir si placeholder était noir)
  const posterUrl = useMemo(() => {
    if (video.thumbnail_url && isValidThumbnailUrl(video.thumbnail_url, video.video_url))
      return getAbsoluteImageUrl(video.thumbnail_url);
    return VIDEO_PLACEHOLDER_IMG;
  }, [video.thumbnail_url, video.video_url]);

  // Si la miniature échoue au chargement, afficher le placeholder au lieu du noir
  const [posterDisplayUrl, setPosterDisplayUrl] = useState(posterUrl);
  useEffect(() => {
    setPosterDisplayUrl(posterUrl);
  }, [posterUrl]);

  useEffect(() => {
    setDuration(0);
  }, [video.id]);

  const [loadError, setLoadError] = useState(false);
  const loadErrorRef = useRef(false);
  loadErrorRef.current = loadError;
  hasFirstFrameRenderedRef.current = hasFirstFrameRendered;
  const isActiveRef = useRef(!!isActive);
  isActiveRef.current = !!isActive;
  const [, setIsReadyToPlay] = useState(false);
  const [, setShowVideoFrame] = useState(false);
  const errorRetriedRef = useRef(false);
  /** Après 2 appuis sur Réessayer sur la même URL, basculer vers playbackUrls suivante si dispo. */
  const loadRetryPassRef = useRef(0);
  const showPosterLoadingIndicator =
    video.media_type !== 'image'
    && !!videoUrl
    && isActive
    && !loadError
    && !hasFirstFrameRendered;

  /** Évite l’effet « noir + gros spinner » : laisser la miniature respirer comme TikTok/Reels (~400 ms). */
  const [deferCenterSpinner, setDeferCenterSpinner] = useState(false);
  useEffect(() => {
    if (!showPosterLoadingIndicator) {
      setDeferCenterSpinner(false);
      return undefined;
    }
    const id = window.setTimeout(() => setDeferCenterSpinner(true), 420);
    return () => window.clearTimeout(id);
  }, [showPosterLoadingIndicator]);

  useEffect(() => {
    if (!isActive || !onInitialVisualReady) return;
    if (video.media_type === 'image' || hasFirstFrameRendered || loadError) {
      onInitialVisualReady(video.id);
    }
  }, [isActive, onInitialVisualReady, video.id, video.media_type, hasFirstFrameRendered, loadError]);

  useTranslation();
  
  // Affichage séparé : titre et description — sans répéter le @ du créateur (ligne identité dédiée)
  const creatorSlug = (video.creator_username || video.creator_name || '').trim();
  const creatorAt = creatorSlug.replace(/^@+/, '');
  const titleText = stripRedundantCreatorLine((video.title || '').trim(), creatorAt);
  const descriptionText = stripRedundantCreatorLine((displayDescription || '').trim(), creatorAt);
  const combinedText = [titleText, descriptionText].filter(Boolean).join(' ');
  const MAX_DESCRIPTION_LENGTH = 100;
  const isDescriptionLong = descriptionText.length > MAX_DESCRIPTION_LENGTH;
  const displayText = showFullDescription || !isDescriptionLong 
    ? descriptionText
    : descriptionText.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
  
  // Fonction pour rendre le texte avec hashtags cliquables (style TikTok)
  const renderTextWithHashtags = (text) => {
    if (!text) return null;
    
    // SÃ©parer le texte en parties : texte normal et hashtags
    const parts = [];
    let lastIndex = 0;
    const hashtagRegex = /#(\w+)/g;
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      // Ajouter le texte avant le hashtag
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      // Ajouter le hashtag
      parts.push({ type: 'hashtag', content: match[1], full: match[0] });
      lastIndex = match.index + match[0].length;
    }
    
    // Ajouter le reste du texte
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    // Si pas de hashtags, retourner le texte normal
    if (parts.length === 0) {
      return <span>{text}</span>;
    }
    
    return (
      <span>
        {parts.map((part, index) => {
          const partKey = part.type === 'hashtag' ? `tag-${index}-${part.content}` : `text-${index}-${String(part.content).slice(0, 20)}`;
          if (part.type === 'hashtag') {
            return (
              <button
                key={partKey}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(createPageUrl('Search') + `?q=${encodeURIComponent(part.content)}`);
                }}
                className="text-white font-bold hover:text-blue-400 transition-colors"
              >
                {part.full}
              </button>
            );
          }
          return <span key={partKey}>{part.content}</span>;
        })}
      </span>
    );
  };
  
  // RÃ©initialiser complÃ¨tement quand la vidÃ©o change (CRITIQUE pour Ã©viter erreurs de chargement)
  useEffect(() => {
    const el = videoRef.current;
    
    // VÃ©rifier que l'URL est valide avant de continuer
    if (!videoUrl || videoUrl.trim() === '') {
      setLoadError(true);
      setIsReadyToPlay(false);
      setIsPlaying(false);
      return;
    }
    
    setShowFullDescription(false);
    setLoadError(false);
    setIsReadyToPlay(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    hasAutoPlayedRef.current = false;
    hasAppliedStartTimeRef.current = false;
    setHasAutoplaySucceeded(false);
    userPausedRef.current = false;
    viewRecordedRef.current = false;
    hasPlayedOnceRef.current = false;
    setShowVideoFrame(false);
    setHasFirstFrameRendered(false);
    loadRetryPassRef.current = 0;

    // Pause + reset time uniquement (pas de load() â€” cause Ã©cran noir)
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [video.id, videoUrl]);

  // Quand la carte devient inactive (scroll), réafficher le poster pour éviter le flash noir
  // (le lecteur pool est détaché donc la zone serait vide sinon)
  useEffect(() => {
    if (!isActive) setHasFirstFrameRendered(false);
  }, [isActive]);

  useEffect(() => {
    if (hasFirstFrameRendered) {
      cancelPendingFirstFrameDetection();
    }
  }, [hasFirstFrameRendered, cancelPendingFirstFrameDetection]);

  useEffect(() => {
    return () => {
      cancelPendingFirstFrameDetection();
    };
  }, [cancelPendingFirstFrameDetection]);

  // Video Pool type TikTok : Home passe videoPoolRef={null} → toujours <video> ici (pas de pool sur le feed web).
  const usePool = videoPoolRef?.current && poolIndex != null && !isHls && videoSrc && videoUrl;
  const lastPoolSrcRef = useRef(null);

  // Firefox / WebView : certains événements arrivent tard ou de façon incomplète.
  // On ne retire jamais le poster sur un simple readyState/timeout fixe, seulement
  // quand une vraie progression visuelle est probable (frame décodée ou currentTime > 0).
  useEffect(() => {
    if (usePool || !videoUrl?.trim() || !isActive) return;
    const el = videoRef.current;
    if (!el) return;

    const forceFirstFrame = () => {
      const v = videoRef.current;
      if (!v) return;
      if (canRevealVideoVisually(v)) {
        markFirstFrameRendered(v);
        return;
      }
      scheduleFirstFrameDetection(v);
    };

    const t1 = setTimeout(forceFirstFrame, 350);
    const t2 = setTimeout(forceFirstFrame, 1000);
    const t3 = setTimeout(forceFirstFrame, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [video.id, videoUrl, isActive, usePool, canRevealVideoVisually, markFirstFrameRendered, scheduleFirstFrameDetection]);

  // Effet 1 : assigner la source et attacher le lecteur (uniquement quand la vidéo change → limite le clignotement au scroll)
  // Premier frame : on attend playing ou timeupdate avec currentTime > 0 pour éviter d'enlever le poster avant que la vidéo peigne (écran noir).
  useEffect(() => {
    if (!usePool || !poolContainerRef.current) return;
    const container = poolContainerRef.current;
    const pool = videoPoolRef.current;
    const player = pool[poolIndex];
    if (!player) return;

    const sameVideo = lastPoolSrcRef.current === videoSrc;
    if (!sameVideo) {
      lastPoolSrcRef.current = videoSrc;
      setHasFirstFrameRendered(false);
    }

    const onPlaying = () => scheduleFirstFrameDetection(player);
    const onLoadedData = () => scheduleFirstFrameDetection(player);

    const onTimeUpdate = (event) => {
      const target = event?.target || player;
      if (!hasFirstFrameRendered && target.currentTime > 0) {
        markFirstFrameRendered(target);
      }
      updateProgressFromElement(target);
    };

    const alreadyHere = player.parentNode === container;
    if (!alreadyHere) {
      if (player.parentNode && player.parentNode !== container) {
        try { player.parentNode.removeChild(player); } catch (_) {}
      }
      Array.from(container.children).forEach((node) => {
        if (node !== player) {
          try { container.removeChild(node); } catch (_) {}
        }
      });
      container.appendChild(player);
    } else {
      Array.from(container.children).forEach((node) => {
        if (node !== player) {
          try { container.removeChild(node); } catch (_) {}
        }
      });
    }

    if (!sameVideo || (player.src !== videoSrc && player.currentSrc !== videoSrc)) {
      player.src = videoSrc;
    }
    player.loop = true;
    player.playsInline = true;
    player.preload = 'auto';
    player.addEventListener('playing', onPlaying);
    player.addEventListener('loadeddata', onLoadedData);

    player.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      player.removeEventListener('playing', onPlaying);
      player.removeEventListener('loadeddata', onLoadedData);
      player.removeEventListener('timeupdate', onTimeUpdate);
      try { player.pause(); } catch (_) {}
    };
  }, [usePool, poolIndex, videoSrc, hasFirstFrameRendered, markFirstFrameRendered, scheduleFirstFrameDetection]);

  // Effet 2 : play/pause et mute uniquement (pas de détachement → évite le clignotement)
  useEffect(() => {
    if (!usePool) return;
    const pool = videoPoolRef.current;
    const player = pool?.[poolIndex];
    if (!player) return;
    player.muted = isMuted;
    if (isActive) player.play().catch(() => {});
    else try { player.pause(); } catch (_) {}
  }, [usePool, poolIndex, isActive, isMuted]);
  
  // Handler pour le like avec compteur local + animation (le parent s'occupe juste de l'API)
  const handleLike = () => {
    if (!canLike) {
      onRequireAuth?.();
      return;
    }

    const wasLiked = localIsLiked;
    const nextLiked = !wasLiked;
    
    // Animation + record view seulement si on passe à "liked"
    if (nextLiked) {
      setIsAnimating(true);
      setShowParticles(true);
      const startTime = video.start_time || 0;
      const endTime = video.end_time || videoRef.current?.duration || 60;
      const safeRange = Math.max(0.001, endTime - startTime);
      const ct = videoRef.current?.currentTime ?? 0;
      const pct = ((ct - startTime) / safeRange) * 100;
      let deviceId = null;
      try { deviceId = localStorage.getItem('afw_device_id'); } catch (_) {}
      api.videos.recordView(video.id, {
        watchSeconds: Math.max(0, ct - startTime),
        watchPercent: pct,
        deviceId,
        interactionDetected: true,
      }).catch(() => {});
      setTimeout(() => setIsAnimating(false), 600);
      setTimeout(() => setShowParticles(false), 800);
    }

    // Mettre à jour l'état local (toggle 1 like / dislike)
    setLocalIsLiked(nextLiked);
    setLikeCount((prev) => prev + (nextLiked ? 1 : -1));

    // Appeler le callback parent (Home gère l'appel API)
    onLike?.(video);
  };

  const triggerActionFeedback = useCallback((actionName) => {
    if (!actionName) return;
    setActionFeedback((prev) => ({ ...prev, [actionName]: true }));
    window.setTimeout(() => {
      setActionFeedback((prev) => ({ ...prev, [actionName]: false }));
    }, 220);
  }, []);

  const handleDoubleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const willLike = !localIsLiked;

    if (willLike) {
      const newHeart = { id: Date.now(), x, y };
      setFloatingHearts((prev) => [...prev, newHeart]);
    }

    // Double‑tap toggle: like si pas liké, dislike si déjà liké
    handleLike();

    if (willLike) {
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => Date.now() - h.id < 800));
      }, 800);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error('Connectez-vous pour suivre');
      return;
    }
    
    if (following) {
      // Unfollow
      try {
        await api.users.toggleFollow(video.creator_id);
        setFollowing(false);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Follow
      try {
        await api.users.toggleFollow(video.creator_id);
        setFollowing(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // HLS (.m3u8) — Netflix/TikTok : qualité adaptative, buffer intelligent, optimisé Afrique
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl || !isHls) return;
    if (!isActive && !shouldPreload) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      el.pause();
      return;
    }

    const isPreloadOnly = !isActive && shouldPreload;

    // Safari / iOS : HLS natif en premier — évite de charger hls.js (~100 Ko) quand inutile (audit)
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      el.src = videoUrl;
      el.loop = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', 'true');
      el.muted = true;
      if (!isPreloadOnly) prepareForAutoplay(el, true);
      const playOnce = () => {
        el.removeEventListener('loadeddata', playOnce);
        if (isActive && !userPausedRef.current) autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true });
      };
      el.addEventListener('loadeddata', playOnce);
      return () => {
        el.removeEventListener('loadeddata', playOnce);
        try {
          el.pause();
        } catch (_) {}
      };
    }

    if (Hls.isSupported()) {
      if (isActive && hlsRef.current) {
        prepareForAutoplay(el, true);
        if (!hasAppliedStartTimeRef.current && video.start_time != null && video.start_time > 0) {
          el.currentTime = video.start_time;
          hasAppliedStartTimeRef.current = true;
        }
        autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).then(() => setIsReadyToPlay(true));
        return () => {};
      }

      const hls = new Hls({
        maxBufferLength: 6,
        maxMaxBufferLength: 10,
        capLevelToPlayerSize: true,
        abrEwmaDefaultEstimate: 500000,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(el);
      el.loop = true;
      if (!isPreloadOnly) prepareForAutoplay(el, true);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!el) return;
        if (isPreloadOnly || !isActive || userPausedRef.current) return;
        if (!hasAppliedStartTimeRef.current && video.start_time != null && video.start_time > 0) {
          el.currentTime = video.start_time;
          hasAppliedStartTimeRef.current = true;
        }
        autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).then(() => {
          setIsReadyToPlay(true);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.fatal) {
          hls.destroy();
          hlsRef.current = null;
          if (!isPreloadOnly && hasFallbackSource) {
            moveToNextSource();
            return;
          }
          if (isActive) setLoadError(true);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
        if (el) {
          try {
            el.pause();
          } catch (_) {}
        }
      };
    }

    
  }, [isActive, shouldPreload, videoUrl, isHls, video.start_time, hasFallbackSource, moveToNextSource, prepareForAutoplay, autoplayWithPolicy]);

  // Gestion de la source pour les flux non-HLS (MP4, etc.) afin d'Ã©viter les flashes noirs en PWA.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || isHls) return;

    // Feed type TikTok : carte inactive = pause seulement, on ne vide jamais la source (évite écran noir)
    if (!isActive && !shouldPreload) {
      try {
        el.pause();
      } catch (_) {}
      setShowVideoFrame(false);
      return;
    }

    if (!videoSrc) return;

    // Injecter la source uniquement quand la carte est active ou voisine (preload).
    const currentSrc = el.getAttribute('src') || '';
    if (currentSrc !== videoSrc) {
      try {
        el.src = videoSrc;
      } catch (_) {}
    }
  }, [isActive, shouldPreload, videoSrc, isHls]);

  // MP4 : autoplay propre â€” readyState >= 2 ou canplay (une fois)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isHls) return;
    let cancelled = false;

    const onCanPlay = () => {
      if (cancelled) return;
      if (!el || !isActive || userPausedRef.current) return;
      autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).then((ok) => {
        if (!ok || cancelled) {
          if (ok) {
            try { el.pause(); } catch (_) {}
          }
          return;
        }
        setIsReadyToPlay(true);
      });
    };

    if (!isActive) {
      prepareForAutoplay(el, true);
      try { el.volume = 0; } catch (_) {}
      el.pause();
      setIsPlaying(false);
      userPausedRef.current = false;
      hasAutoPlayedRef.current = false;
      return;
    }

    if (!hasAppliedStartTimeRef.current && video.start_time != null && video.start_time > 0) {
      el.currentTime = video.start_time;
      hasAppliedStartTimeRef.current = true;
    }
    // Autoplay en muet par défaut pour garantir la lecture sur mobile/PWA.
    try { el.volume = 0; } catch (_) {}
    prepareForAutoplay(el, true);
    el.loop = true;

    const tryPlay = () => {
      if (cancelled || !isActive || userPausedRef.current) return;
      if (hasAutoPlayedRef.current) return;
      // HAVE_FUTURE_DATA (3) : aligné sur canplay / flux qui ne montent pas vite à 4
      if (el.readyState < 3) return;
      autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).then((ok) => {
        if (!ok || cancelled || !isActive) {
          if (ok) {
            try { el.pause(); } catch (_) {}
          }
          return;
        }
        setIsReadyToPlay(true);
      });
    };

    const playVideo = () => {
      if (!el || !isActive || userPausedRef.current) return;
      if (el.readyState >= 3) {
        tryPlay();
      }
      el.addEventListener('canplay', onCanPlay);
      el.addEventListener('loadeddata', onCanPlay);
      el.addEventListener('canplaythrough', onCanPlay);
    };

    playVideo();

    // Plusieurs retries (type TikTok) : attendre readyState >= 4 pour un démarrage fiable
    const timers = [100, 400, 900, 1800, 3000, 4500].map((delay) =>
      window.setTimeout(() => {
        if (cancelled || !el || !isActive || userPausedRef.current) return;
        if (hasAutoPlayedRef.current) return;
        if (el.paused && el.readyState >= 3) {
          prepareForAutoplay(el, true);
          tryPlay();
        }
      }, delay)
    );

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('loadeddata', onCanPlay);
      el.removeEventListener('canplaythrough', onCanPlay);
      prepareForAutoplay(el, true);
      try { el.volume = 0; } catch (_) {}
      el.pause();
      setIsPlaying(false);
      userPausedRef.current = false;
      hasAutoPlayedRef.current = false;
    };
  }, [isActive, isHls, video.start_time, videoUrl, autoplayWithPolicy, prepareForAutoplay]);

  // IMPORTANT: ne pas supprimer ce garde-fou.
  // Sans ce bloc, une vidÃ©o prÃ©cÃ©dente peut continuer Ã  jouer aprÃ¨s swipe (audio fantÃ´me + Ã©cran noir perÃ§u).
  // RÃ¨gle produit: une seule vidÃ©o active Ã  la fois dans le feed.
  useEffect(() => {
    if (!isActive || typeof document === 'undefined') return;
    const el = videoRef.current;
    if (!el) return;
    const players = document.querySelectorAll('video[data-afw-feed-video="1"]');
    players.forEach((node) => {
      if (node !== el) {
        try { node.pause(); } catch (_) {}
      }
    });
  }, [isActive, video.id, videoUrl]);

  // Sync muted seulement (comme l'ami) â€” ne pas appeler play() ici
  useEffect(() => {
    const el = videoRef.current;
    if (el && isActive && hasAutoplaySucceeded && hasAutoPlayedRef.current) {
      try { el.volume = isMuted ? 0 : 1; } catch (_) {}
      el.defaultMuted = isMuted;
      el.muted = isMuted;
    }
  }, [isMuted, isActive, hasAutoplaySucceeded, video.id, videoUrl]);

  // Onglet masque -> pause ; au retour reprendre automatiquement (PWA/mobile)
  useEffect(() => {
    const resumeIfPossible = () => {
      const el = videoRef.current;
      if (!el) return;

      if (document.hidden) {
        el.pause();
        setIsPlaying(false);
        return;
      }

      if (isActive && !loadError && el.paused && !userPausedRef.current) {
        autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true });
      }
    };

    const handleVisibilityChange = () => resumeIfPossible();
    const handlePageShow = () => resumeIfPossible();
    const handleFocus = () => resumeIfPossible();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isActive, loadError, isMuted, autoplayWithPolicy]);

  // Pause synchrone dès que la carte n'est plus active (mobile : évite que la mauvaise vidéo joue en fond)
  useLayoutEffect(() => {
    if (isActive) return;
    const el = videoRef.current;
    if (el) {
      // D'abord marquer l'état local comme en pause pour éviter tout "son fantôme"
      setIsPlaying(false);
      try { el.pause(); } catch (_) {}
    }
  }, [isActive]);

  // Dès que cette carte est active : pause des autres vidéos avant paint (mobile)
  useLayoutEffect(() => {
    if (!isActive || typeof document === 'undefined') return;
    const el = videoRef.current;
    if (!el) return;
    const players = document.querySelectorAll('video[data-afw-feed-video="1"]');
    players.forEach((node) => {
      if (node !== el) {
        try { node.pause(); } catch (_) {}
      }
    });
  }, [isActive]);

  // Auto play / pause selon isActive (virtualisation) + léger "debounce" pour éviter les bascules trop rapides
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let timerId;

    if (!isActive) {
      // Mise à jour immédiate de l'état local avant la pause matérielle
      setIsPlaying(false);
      el.pause();
      return;
    }

    const tryPlay = () => { el.play().catch(() => {}); };

    // Petit délai (100ms) pour s'assurer que l'utilisateur s'est "posé" sur la vidéo
    timerId = window.setTimeout(() => {
      tryPlay();
      el.addEventListener('canplay', tryPlay);
      el.addEventListener('loadeddata', tryPlay);
    }, 100);

    return () => {
      if (timerId) window.clearTimeout(timerId);
      el.removeEventListener('canplay', tryPlay);
      el.removeEventListener('loadeddata', tryPlay);
    };
  }, [isActive]);

  // Nettoyage de sécurité au démontage : s'assurer que la vidéo est bien arrêtée et muette
  useEffect(() => {
    return () => {
      const el = videoRef.current;
      if (!el) return;
      try {
        el.pause();
        el.muted = true;
        el.defaultMuted = true;
        el.volume = 0;
      } catch (_) {}
      setIsPlaying(false);
    };
  }, []);

  // Tracking vue 3s (monétisation / analytics) — backend exige video_id + creator_id
  useEffect(() => {
    if (!isActive || video.id == null || video.creator_id == null) return;
    const timer = setTimeout(() => {
      api.analytics
        .recordVideo({ video_id: video.id, creator_id: video.creator_id })
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [isActive, video.id, video.creator_id]);

  /* ================= VIDEO =================
   * Une source de play (useEffect isActive). DÃ©marrage dÃ¨s readyState >= 2 (loadeddata). */

  const handlePlayPause = () => {
    const el = usePool ? videoPoolRef?.current?.[poolIndex] : videoRef.current;
    if (!el || loadError) return;
    setAutoplayMutedFallback(false);

    // Utiliser l'état réel de la vidéo (el.paused) pour décider pause/play, pas seulement isPlaying,
    // afin que le premier clic pause bien la vidéo même si handlePlaying n'a pas encore mis à jour isPlaying.
    const currentlyPlaying = !el.paused;
    if (currentlyPlaying) {
      userPausedRef.current = true;
      el.pause();
      const checkPause = () => {
        if (el && !el.paused && userPausedRef.current) {
          el.pause();
          const t = el.currentTime;
          el.currentTime = t;
          el.pause();
        }
      };
      checkPause();
      setTimeout(checkPause, 10);
      setTimeout(checkPause, 50);
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      // Important: pour que le son joue, il faut mettre muted=false AVANT play()
      // dans le même geste utilisateur (règle des navigateurs). Donc on ne force
      // plus le muet au clic — on utilise la préférence utilisateur (isMuted).
      setAutoplayMutedFallback(false);
      prepareForAutoplay(el, isMuted);
      try { el.volume = isMuted ? 0 : 1; } catch (_) {}
      el.muted = isMuted;
      el.play().then(() => {
        setIsPlaying(true);
        hasAutoPlayedRef.current = true;
        setHasAutoplaySucceeded(true);
      }).catch(() => {
        // Fallback: si play() avec son échoue (ex. politique stricte), réessayer en muet
        el.muted = true;
        try { el.volume = 0; } catch (_) {}
        el.play().then(() => {
          setIsPlaying(true);
          hasAutoPlayedRef.current = true;
          setAutoplayMutedFallback(true);
        }).catch(() => {});
      });
    }

    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  };

  const handleRetryLoad = () => {
    const el = videoRef.current;
    if (!el || !videoUrl) return;

    loadRetryPassRef.current += 1;
    if (loadRetryPassRef.current >= 2 && hasFallbackSource) {
      loadRetryPassRef.current = 0;
      moveToNextSource();
      return;
    }

    cancelPendingFirstFrameDetection();
    setLoadError(false);
    setIsReadyToPlay(false);
    setIsPlaying(false);
    setShowVideoFrame(false);
    setHasFirstFrameRendered(false);
    hasAutoPlayedRef.current = false;
    userPausedRef.current = false;
    errorRetriedRef.current = true;

    try { el.pause(); } catch (_) {}
    try { el.currentTime = 0; } catch (_) {}
    try {
      const currentSrc = el.getAttribute('src') || '';
      if (videoSrc && currentSrc !== videoSrc) {
        el.src = videoSrc;
      }
    } catch (_) {}

    let didRecover = false;
    const finishSoftRetry = () => {
      if (didRecover) return;
      didRecover = true;
      setLoadError(false);
      setIsReadyToPlay(true);
      scheduleFirstFrameDetection(el);
      if (!isActive) return;
      autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).then((ok) => {
        if (ok) setIsReadyToPlay(true);
      });
    };

    const handleRetryReady = () => {
      finishSoftRetry();
    };

    el.addEventListener('loadeddata', handleRetryReady, { once: true });
    el.addEventListener('canplay', handleRetryReady, { once: true });

    if (el.readyState >= 2) {
      finishSoftRetry();
      return;
    }

    // Dernier recours seulement si la relance douce n'a rien débloqué.
    window.setTimeout(() => {
      if (didRecover || !isActive || !videoRef.current) return;
      if (el.readyState >= 2) {
        finishSoftRetry();
        return;
      }
      try {
        el.load();
      } catch (_) {}
    }, 900);
  };

  const handleRepairWebPlayback = async () => {
    if (!currentUser?.id || !canRepairWebPlayback || isRepairingPlayback) {
      console.info('[repair-web-playback] blocked before request', {
        videoId: video.id,
        hasUserId: !!currentUser?.id,
        canRepairWebPlayback,
        isRepairingPlayback,
      });
      return;
    }
    console.info('[repair-web-playback] request starting', {
      videoId: video.id,
      userId: currentUser?.id,
      creatorId: video.creator_id,
    });
    setIsRepairingPlayback(true);
    try {
      const result = await api.videos.repairWebPlayback(video.id);
      const repairedUrl = result?.data?.video_url || result?.video_url || '';
      if (!repairedUrl) {
        throw new Error('Aucune URL web réparée renvoyée');
      }

      setManualPlaybackUrlOverride(repairedUrl);
      loadRetryPassRef.current = 0;
      errorRetriedRef.current = false;
      setLoadError(false);
      setIsReadyToPlay(false);
      setIsPlaying(false);
      setShowVideoFrame(false);
      setHasFirstFrameRendered(false);
      setAutoplayMutedFallback(!!isMutedRef.current);
      hasAutoPlayedRef.current = false;
      userPausedRef.current = false;
      toast.success('Version web réparée. Nouvelle lecture en cours...');
    } catch (error) {
      const raw = error?.message || '';
      const looksLikeBadResponse = /JSON|Unexpected token|is not valid JSON/i.test(String(raw));
      toast.error(
        error?.apiMessage ||
          (looksLikeBadResponse
            ? 'Le serveur a mis trop longtemps ou la connexion a été coupée (transcodage). Réessayez, ou redémarrez le backend après mise à jour des timeouts.'
            : raw || 'Impossible de réparer cette vidéo pour le web.')
      );
    } finally {
      setIsRepairingPlayback(false);
    }
  };

  const stopOverlayActionPropagation = (e) => {
    e.stopPropagation();
  };

  const handleRepairWebPlaybackClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleRepairWebPlayback();
  };

  const handleOpenVideoViewClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`${createPageUrl('VideoView')}?id=${video.id}`);
  };

  const updateProgressFromElement = (el) => {
    if (!el) return;

    if (isDragging) return;

    if (video.end_time && video.end_time > 0 && el.currentTime >= video.end_time) {
      el.currentTime = video.start_time || 0;
    }

    const startTime = video.start_time || 0;
    const rawDuration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : Math.max(el.currentTime, 1);
    const endTime = video.end_time && video.end_time > 0 ? video.end_time : rawDuration;
    const safeRange = Math.max(0.001, endTime - startTime);
    const pct = ((el.currentTime - startTime) / safeRange) * 100;

    // Mises à jour plus rapides pour l'UI
    setProgress(pct);
    setCurrentTime(el.currentTime);
    setDragProgress(pct);

    if (Number.isFinite(el.duration) && el.duration > 0) {
      setDuration((d) => (d > 0 ? d : el.duration));
    }

    const clampedTime = Math.max(startTime, Math.min(endTime, el.currentTime));
    if (isActive && !viewRecordedRef.current && (clampedTime - startTime >= 3 || pct >= 25)) {
      viewRecordedRef.current = true;
      let deviceId = null;
      try {
        deviceId = localStorage.getItem('afw_device_id');
        if (!deviceId) {
          deviceId = 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem('afw_device_id', deviceId);
        }
      } catch (_) {}
      api.videos.recordView(video.id, {
        watchSeconds: clampedTime - startTime,
        watchPercent: pct,
        deviceId,
      }).catch(() => {});
    }
  };

  const handleTimeUpdate = (event) => {
    const el = event?.target || videoRef.current;
    if (el && !hasFirstFrameRendered && el.currentTime > 0) {
      markFirstFrameRendered(el);
    }
    updateProgressFromElement(el);
  };

  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (el) setDuration(el.duration);
  };

  const handleProgress = () => {
    const el = videoRef.current;
    if (!el || !isActive || loadError) return;
    if (el.readyState >= 1) setIsReadyToPlay(true);
  };

  const handleCanPlay = () => {
    const el = videoRef.current;
    if (!el || loadError || !isActive) return;
    setIsReadyToPlay(true);
    if (!hasFirstFrameRendered && hasDecodedVideoFrame(el)) {
      markFirstFrameRendered(el);
    }
    // HAVE_FUTURE_DATA (3) suffit pour tenter play ; exiger 4 bloquait certains flux (canplay arrive souvent à 3).
    if (!userPausedRef.current && el.paused && !hasAutoPlayedRef.current && el.readyState >= 3) {
      autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).then((ok) => {
        if (ok && videoRef.current && isActive && !userPausedRef.current) {
          setIsReadyToPlay(true);
        }
      });
    }
  };

  const handleWaiting = () => {};

  const handlePlaying = () => {
    if (!isActive) {
      const el = videoRef.current;
      if (el) {
        try { el.pause(); } catch (_) {}
      }
      return;
    }
    if (typeof document !== 'undefined') {
      const el = videoRef.current;
      if (el) {
        const players = document.querySelectorAll('video[data-afw-feed-video="1"]');
        players.forEach((node) => {
          if (node !== el) {
            try { node.pause(); } catch (_) {}
          }
        });
      }
    }
    hasPlayedOnceRef.current = true;
    setIsPlaying(true);
    // Si l'autoplay a démarré en muet (fallback) alors que l'utilisateur préfère le son : activer le son dès que la lecture a commencé (évite un clic par vidéo).
    const el = videoRef.current;
    if (el && !isMutedRef.current) {
      try {
        el.muted = false;
        el.defaultMuted = false;
        el.volume = 1;
        setAutoplayMutedFallback(false);
      } catch (_) {}
    }

    // Ne pas abandonner une source juste après `playing` :
    // sur mobile / WebView / Firefox, l'audio peut démarrer avant que la 1re frame
    // ne soit réellement peinte. Les garde-fous plus bas gèrent déjà les vrais cas
    // "audio sans image" de façon plus fiable et moins agressive.
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  /** Sur mobile: quand la vidéo principale a seeked pendant le drag, currentTime reste déjà synchronisé */
  const handleMainVideoSeeked = () => {};

  const dragProgressRef = useRef(0);

  const handleSeek = (clientX) => {
    if (!progressBarRef.current) return;
    const el = usePool ? videoPoolRef?.current?.[poolIndex] : videoRef.current;
    if (!el) return;
    const dur = el.duration;
    if (!dur || !isFinite(dur) || dur <= 0) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const pct = percentage * 100;

    const startTime = video.start_time || 0;
    const endTime = video.end_time || dur;
    const newTime = startTime + (pct / 100) * (endTime - startTime);

    // Seek en temps réel pendant le drag pour que la vidéo "bouge"
    el.currentTime = newTime;
    dragProgressRef.current = pct;
    setDragProgress(pct);
    setProgress(pct);
    setCurrentTime(newTime);
  };

  const removeDragListenersRef = useRef(null);

  const commitDragSeek = () => {
    const el = usePool ? videoPoolRef?.current?.[poolIndex] : videoRef.current;
    if (!el) return;
    const dur = el.duration;
    if (!dur || !isFinite(dur) || dur <= 0) return;

    const startTime = video.start_time || 0;
    const endTime = video.end_time || dur;
    const pct = dragProgressRef.current;
    const newTime = startTime + (pct / 100) * (endTime - startTime);

    el.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(pct);
  };

  const attachDragListeners = () => {
    if (removeDragListenersRef.current) return;

    const handleMouseMove = (e) => {
      handleSeek(e.clientX);
    };

    const handleMouseUp = () => {
      commitDragSeek();
      removeDragListenersRef.current?.();
      removeDragListenersRef.current = null;
      setIsDragging(false);
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      handleSeek(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      commitDragSeek();
      removeDragListenersRef.current?.();
      removeDragListenersRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    removeDragListenersRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      removeDragListenersRef.current = null;
    };
  };

  const handleProgressMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e.clientX);
    attachDragListeners();
  };

  const handleProgressTouchStart = (e) => {
    e.stopPropagation();
    if (!e.touches || e.touches.length === 0) return;
    setIsDragging(true);
    handleSeek(e.touches[0].clientX);
    attachDragListeners();
  };

  const handleProgressClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;
    handleSeek(e.clientX);
    commitDragSeek();
  };

  const handleMuteToggleClick = () => {
    const el = videoRef.current;

    // Cas particulier: autoplay forcé en muet (fallback) alors que la préférence globale n'est pas "muted".
    // Dans ce cas, le premier clic doit juste enlever le mute du player (sans changer la préférence globale).
    if (autoplayMutedFallback && !isMuted) {
      setAutoplayMutedFallback(false);
      if (!el || !hasAutoPlayedRef.current) return;
      try {
        el.muted = false;
        el.defaultMuted = false;
        el.volume = 1;
      } catch (_) {}
      if (el.paused && !loadError && isActive && !userPausedRef.current) {
        try {
          el.play();
        } catch (_) {}
      }
      return;
    }

    const nextMuted = !isMuted;

    setAutoplayMutedFallback(false);
    onMuteToggle?.();

    if (!el || !hasAutoPlayedRef.current) return;

    try {
      el.muted = nextMuted;
      el.defaultMuted = nextMuted;
      el.volume = nextMuted ? 0 : 1;
    } catch (_) {}

    if (!nextMuted && el.paused && !loadError && isActive && !userPausedRef.current) {
      try {
        el.play();
      } catch (_) {}
    }
  };

  /**
   * Déblocage « spinner infini » : retente play() quand un minimum de données est disponible (readyState >= 2).
   * Avant d’afficher l’erreur : si une autre URL existe (CDN / MP4 de secours), on bascule automatiquement.
   * Délais plus longs en 2G/3G/save-data pour éviter les faux « vidéo indisponible ».
   */
  useEffect(() => {
    if (!isActive || loadError || hasFirstFrameRendered || video.media_type === 'image' || !videoUrl?.trim()) {
      return undefined;
    }

    const recoverMs = slowConnection ? 9000 : 6500;
    const earlyFallbackMs = slowConnection ? 18000 : 12000;
    const fatalMs = slowConnection ? 38000 : 24000;
    /** Démarrage bloqué (readyState bas ou lecture jamais lancée) : bascule rapide vers HLS / autre MP4 si disponible. */
    const quickStallMs = import.meta.env.DEV
      ? slowConnection
        ? 20000
        : 14000
      : slowConnection
        ? 10000
        : 5000;

    const quickStallId = window.setTimeout(() => {
      if (!isActiveRef.current || userPausedRef.current) return;
      if (hasFirstFrameRenderedRef.current || loadErrorRef.current) return;
      if (!hasFallbackSource) return;
      const el = videoRef.current;
      if (!el) return;
      if (el.paused || el.readyState < 2) {
        moveToNextSource();
      }
    }, quickStallMs);

    const earlyFallbackId = window.setTimeout(() => {
      if (!isActiveRef.current || userPausedRef.current) return;
      if (hasFirstFrameRenderedRef.current || loadErrorRef.current) return;
      if (!hasFallbackSource) return;
      const el = videoRef.current;
      if (!el) return;
      // Pas de frame visible après délai : buffer insuffisant OU flux illisible (écran noir) → autre URL.
      if (!hasFirstFrameRenderedRef.current) {
        moveToNextSource();
      }
    }, earlyFallbackMs);

    const recoverId = window.setTimeout(() => {
      if (!isActiveRef.current || userPausedRef.current) return;
      if (hasFirstFrameRenderedRef.current || loadErrorRef.current) return;
      const el = videoRef.current;
      if (!el || !el.paused) return;
      // HAVE_CURRENT_DATA (2) ou HAVE_FUTURE_DATA (3) : tenter lecture sans exiger HAVE_ENOUGH_DATA (4)
      if (el.readyState < 2) return;
      prepareForAutoplay(el, isMutedRef.current);
      autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).catch(() => {});
    }, recoverMs);

    const fatalId = window.setTimeout(() => {
      if (!isActiveRef.current || userPausedRef.current) return;
      if (hasFirstFrameRenderedRef.current || loadErrorRef.current) return;
      const el = videoRef.current;
      if (!el) return;
      // Ne pas exiger paused : certains navigateurs laissent la lecture « active » sans image (noir) → sans jamais déclencher ce garde-fou.
      if (hasFallbackSource) {
        moveToNextSource();
        return;
      }
      setLoadError(true);
    }, fatalMs);

    return () => {
      window.clearTimeout(quickStallId);
      window.clearTimeout(earlyFallbackId);
      window.clearTimeout(recoverId);
      window.clearTimeout(fatalId);
    };
  }, [
    isActive,
    video.id,
    videoUrl,
    loadError,
    hasFirstFrameRendered,
    video.media_type,
    prepareForAutoplay,
    autoplayWithPolicy,
    slowConnection,
    hasFallbackSource,
    moveToNextSource,
  ]);

  /**
   * Cas WebView / GPU : métadonnées OK (durée affichée) mais currentTime reste à ~0 alors que la lecture est annoncée → noir.
   * Après quelques secondes : autre source ou écran d’erreur (miniature + Réessayer), plus d’écran noir infini.
   */
  useEffect(() => {
    if (!isActive || loadError || video.media_type === 'image' || !videoUrl?.trim()) {
      return undefined;
    }
    const startOffset = video.start_time != null && video.start_time > 0 ? Number(video.start_time) : 0;
    let stuckTicks = 0;
    const id = window.setInterval(() => {
      if (!isActiveRef.current || loadErrorRef.current || userPausedRef.current) {
        stuckTicks = 0;
        return;
      }
      if (!hasFirstFrameRenderedRef.current) {
        stuckTicks = 0;
        return;
      }
      const el = videoRef.current;
      if (!el || el.paused) {
        stuckTicks = 0;
        return;
      }
      const dur = Number(el.duration);
      if (!Number.isFinite(dur) || dur < 5) {
        stuckTicks = 0;
        return;
      }
      if (el.readyState < 3) {
        stuckTicks = 0;
        return;
      }
      if (el.currentTime >= startOffset + 0.15) {
        stuckTicks = 0;
        return;
      }
      stuckTicks += 1;
      const needTicks = slowConnection ? 20 : 12;
      if (stuckTicks >= needTicks) {
        stuckTicks = 0;
        if (hasFallbackSource) moveToNextSource();
        else setLoadError(true);
      }
    }, 450);
    return () => window.clearInterval(id);
  }, [
    isActive,
    loadError,
    video.id,
    video.start_time,
    videoUrl,
    video.media_type,
    hasFallbackSource,
    moveToNextSource,
    slowConnection,
  ]);

  /**
   * Données disponibles + lecture non en pause mais aucun frame décodé (videoWidth=0) : cas fréquent
   * HEVC/codec refusé partiellement ou GPU — évite spinner + 0:00 jusqu’aux timeouts longs.
   */
  useEffect(() => {
    if (!isActive || loadError || hasFirstFrameRendered || video.media_type === 'image' || !videoUrl?.trim()) {
      return undefined;
    }
    let consecutive = 0;
    const need = slowConnection ? 10 : 7;
    const id = window.setInterval(() => {
      if (!isActiveRef.current || loadErrorRef.current || userPausedRef.current) {
        consecutive = 0;
        return;
      }
      if (hasFirstFrameRenderedRef.current) {
        consecutive = 0;
        return;
      }
      const el = videoRef.current;
      if (!el) {
        consecutive = 0;
        return;
      }
      if (el.paused || el.readyState < 3) {
        consecutive = 0;
        return;
      }
      if (hasDecodedVideoFrame(el)) {
        consecutive = 0;
        return;
      }
      consecutive += 1;
      if (consecutive >= need) {
        consecutive = 0;
        if (hasFallbackSource) moveToNextSource();
        else setLoadError(true);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [
    isActive,
    loadError,
    hasFirstFrameRendered,
    video.id,
    video.media_type,
    videoUrl,
    slowConnection,
    hasFallbackSource,
    moveToNextSource,
    hasDecodedVideoFrame,
  ]);

  /* ⛔ ZONE LECTURE VERROUILLÉE — FIN
   * Ci-dessous : affichage timer uniquement (ne pas y mettre de play/pause/src). */

  // canplaythrough supprimÃ© : on dÃ©marre sur loadeddata (readyState >= 2) pour lecture immÃ©diate, pas dâ€™attente full buffer.
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const backendDuration = Number(video.duration);
  const effectiveTotalSec =
    Number.isFinite(duration) && duration > 0
      ? duration
      : Number.isFinite(backendDuration) && backendDuration > 0
        ? backendDuration
        : 0;
  const timeLabel =
    effectiveTotalSec > 0
      ? `${formatTime(currentTime || 0)}/${formatTime(effectiveTotalSec)}`
      : formatTime(currentTime || 0);

  /* ================= RENDER ================= */

  return (
    <div
      data-afw-videocard-root="1"
      data-afw-videocard-id={String(video?.id ?? '')}
      className="relative z-0 w-full bg-gray-950 overflow-hidden"
      style={{
        touchAction: 'pan-y',
        ...(compact
          ? { height: '100dvh', minHeight: '100dvh' }
          : { height: '100%', minHeight: '100%' }),
        backgroundColor: compact ? '#030712' : '#020617',
      }}
    >
      <div className="absolute inset-0 z-[1] overflow-hidden">
      {/* ================= IMAGE (photo) ou VIDEO ================= */}
      {video.media_type === 'image' ? (
        <img
          data-afw-feed-poster="1"
          src={getVideoPlaybackUrl(video.video_url) || video.video_url}
          alt={video.title || ''}
          className="absolute top-0 left-0 h-full w-full object-contain bg-gray-950 object-center"
          style={{ contentVisibility: 'visible' }}
        />
      ) : videoUrl ? (
      <>
      {/* Zone principale player — le poster actif est AU-DESSUS du <video> (z-25) : sinon WebView/mobile peignent souvent un rectangle noir même avec opacity:0 sur la vidéo. */}
      <div
        className="absolute inset-0 z-20 overflow-hidden"
        style={{
          /* Feed compact : fond transparent — le <video> plein écran peint la frame réelle ; pas de tapis noir volontaire. */
          backgroundColor: compact ? 'transparent' : '#000000',
          backgroundImage:
            !hasFirstFrameRendered && !compact
              ? `url(${VIDEO_PLACEHOLDER_IMG}), url(${posterDisplayUrl})`
              : undefined,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          ...gpuCompositingLayerStyle,
        }}
        onDoubleClick={handleDoubleTap}
      >
        {/* Vidéo : pool réutilisable (TikTok) ou balise <video> classique. */}
        {usePool ? (
          <div
            ref={poolContainerRef}
            className="absolute left-0 top-0 z-20 h-full w-full object-contain object-center"
            style={{
              touchAction: 'pan-y',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              ...gpuCompositingLayerStyle,
            }}
            onClick={handlePlayPause}
            aria-label="Vidéo"
          />
        ) : (
        <video
          key={video.id}
          ref={videoRef}
          data-afw-feed-video="1"
          src={videoSrc}
          className="absolute left-0 top-0 z-20 h-full w-full object-contain object-center"
          autoPlay={false}
          preload="auto"
          loop
          playsInline
          disablePictureInPicture
          muted={isMuted}
          onClick={handlePlayPause}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onLoadStart={() => { setIsReadyToPlay(false); setLoadError(false); }}
          onWaiting={handleWaiting}
          onPause={handlePause}
          onError={(e) => {
          const videoElement = e.target;
          const errorCode = videoElement.error?.code;
          const errorMessage = videoElement.error?.message;
          
            if (!isActive) return;

            if (hasFallbackSource) {
              moveToNextSource();
              return;
            }
            
            setIsReadyToPlay(false);
            setIsPlaying(false);
            
            // Log détaillé en développement
            if (process.env.NODE_ENV === 'development') {
              console.warn('Erreur de chargement vidéo:', {
                videoId: video.id,
                videoUrl: video.video_url,
                errorCode,
                errorMessage,
                readyState: videoElement.readyState,
                networkState: videoElement.networkState,
              });
            }
            
            // Ne jamais appeler load() ici — provoque écran noir (feed type TikTok).
            // Ne masquer l’échec que sur la 1re URL : si une 2e source (ex. proxy) échoue aussi, afficher l’erreur.
            if (isMobileOrPWA() && !errorRetriedRef.current && sourceIndex === 0) {
              errorRetriedRef.current = true;
              return;
            }
            setTimeout(() => {
              if (videoElement && videoElement.error && isActive) {
                setLoadError(true);
              }
            }, isMobileOrPWA() ? 4000 : 2000);
          }}
          onLoadedData={() => {
            setLoadError(false);
            errorRetriedRef.current = false;
            setIsReadyToPlay(true);
            setShowVideoFrame(true);
            scheduleFirstFrameDetection(videoRef.current);
            const el = videoRef.current;
            // >= 3 (HAVE_FUTURE_DATA) : certains encodages ne passent pas vite à 4 ; sinon spinner infini sans play().
            if (
              el &&
              isActive &&
              el.paused &&
              !userPausedRef.current &&
              !hasAutoPlayedRef.current &&
              el.readyState >= 3
            ) {
              autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true });
            }
          }}
          onSeeked={handleMainVideoSeeked}
          style={{
            touchAction: 'pan-y',
            backfaceVisibility: 'hidden',
            willChange: 'transform',
            /* Feed compact : pas de fondu depuis 0 — sinon écran noir alors que la 1re frame vidéo est déjà décodée. */
            opacity: compact || hasFirstFrameRendered ? 1 : 0,
            transition: compact ? 'none' : 'opacity 180ms ease-out',
            ...(isFirefoxBrowser || isMobileOrPWA() ? {} : { transform: 'translateZ(0)' }),
            // Evite le cas "audio OK / image noire" observé sur certains GPU navigateurs
            // quand un filter CSS est appliqué en permanence sur <video>.
            ...(video.filter === 'Noir & Blanc'
              ? { filter: 'grayscale(100%)' }
              : video.filter === 'Sépia'
              ? { filter: 'sepia(100%)' }
              : video.filter === 'Vibrant'
              ? { filter: 'saturate(200%)' }
              : video.filter === 'Foncé'
              ? { filter: 'brightness(0.75)' }
              : video.filter === 'Lumineux'
              ? { filter: 'brightness(1.25)' }
              : {})
          }}
          onPlaying={() => {
            handlePlaying();
            scheduleFirstFrameDetection(videoRef.current);
          }}
        />
        )}
        {/* Hors feed compact : miniature jusqu’à la 1re frame. Feed compact : uniquement le décodage <video> (pas de thumb CDN). */}
        {!compact && !hasFirstFrameRendered && !loadError && (
          <img
            data-afw-feed-poster="1"
            ref={posterRef}
            src={posterDisplayUrl}
            className="pointer-events-none absolute inset-0 z-[25] h-full w-full object-contain object-center"
            style={{
              backgroundColor: '#050508',
              backgroundImage: `url(${VIDEO_PLACEHOLDER_IMG})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              contentVisibility: 'visible',
              ...(isFirefoxBrowser ? {} : { transform: 'translateZ(0)' }),
            }}
            alt=""
            decoding="async"
            fetchPriority={isActive ? 'high' : 'low'}
            onError={() => setPosterDisplayUrl(VIDEO_PLACEHOLDER_IMG)}
          />
        )}

        {/* Cœurs flottants animés au double-tap */}
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.5, 1.2, 1], y: -100 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                position: 'absolute',
                left: heart.x - 25,
                top: heart.y - 25,
                pointerEvents: 'none',
              }}
            >
              <Heart size={50} fill="#ef4444" color="#ef4444" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      </>
      ) : (
        // Si pas d'URL valide, afficher l'erreur directement
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[260] p-4">
          <img
            src={posterUrl}
            alt=""
            className="max-w-full max-h-[50%] object-contain rounded-lg opacity-80"
          />
          <p className="text-white text-center mt-4 font-medium ios-text-render">Vidéo indisponible</p>
          <p className="text-white/70 text-sm text-center mt-1 ios-text-render">URL de vidéo invalide</p>
        </div>
      ) }
      </div>

      {showPosterLoadingIndicator && deferCenterSpinner && (
        <div className="absolute inset-0 z-[35] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/10">
            <Loader2 className="h-7 w-7 text-white/75 animate-spin sm:h-8 sm:w-8" aria-hidden />
            {slowConnection && !isOffline && (
              <p className="text-[12px] leading-tight text-white/80 text-center max-w-[220px]">
                Chargement optimisé pour une lecture fluide...
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= ERREUR DE CHARGEMENT ================= */}
      {loadError && !isPlaying && !hasFirstFrameRendered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[260] p-4">
          <img
            src={posterUrl}
            alt=""
            className="max-w-full max-h-[50%] object-contain rounded-lg opacity-80"
          />
          <p className="text-white text-center mt-4 font-medium ios-text-render">Vidéo indisponible</p>
          <p className="text-white/70 text-sm text-center mt-1 ios-text-render max-w-[280px]">
            Cette vidéo ne peut pas s’afficher correctement. Réessayez ou faites défiler vers la suivante.
          </p>
          {isFirefoxBrowser && (
            <p className="text-amber-100/90 text-xs text-center mt-2 max-w-[300px] ios-text-render leading-snug">
              Sous Firefox, les vidéos encodées en H.265 (HEVC) ne sont souvent pas prises en charge. Essayez Chrome ou Edge, ou passez à la suivante.
            </p>
          )}
          {debugVideoUi && (
            <p className="text-amber-200/90 text-xs text-center mt-2 max-w-[340px] ios-text-render leading-snug font-mono">
              DEBUG (VITE_DEBUG_VIDEO_UI=1) : vérifiez CDN, proxy /api/proxy/media, API port 3000, base PostgreSQL.
            </p>
          )}
          {canRepairWebPlayback && currentUser?.id === video.creator_id && (
            <p className="text-white/60 text-xs text-center mt-2 max-w-[300px] ios-text-render">
              Vous êtes le créateur de cette vidéo : vous pouvez ré-encoder pour Firefox / WebView.
            </p>
          )}
          {canRepairWebPlayback && currentUser?.id !== video.creator_id && (
            <p className="text-white/60 text-xs text-center mt-2 max-w-[300px] ios-text-render">
              Compte staff : vous pouvez ré-encoder cette vidéo pour tous les utilisateurs (H.264 web).
            </p>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRetryLoad();
            }}
            onPointerDown={stopOverlayActionPropagation}
            onTouchStart={stopOverlayActionPropagation}
            className="mt-4 px-6 py-2.5 bg-white text-black rounded-full font-semibold hover:bg-gray-200 active:scale-95 transition-transform ios-text-render"
            style={{ touchAction: 'manipulation' }}
          >
            Réessayer
          </button>
          {canRepairWebPlayback && (
            <button
              type="button"
              onClick={handleRepairWebPlaybackClick}
              onPointerDown={stopOverlayActionPropagation}
              onTouchStart={stopOverlayActionPropagation}
              disabled={isRepairingPlayback}
              className="mt-2 px-5 py-2 text-sm rounded-full border border-white/20 text-white/95 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ios-text-render"
              style={{ touchAction: 'manipulation' }}
            >
              {isRepairingPlayback ? 'Réparation en cours...' : 'Réparer pour le web'}
            </button>
          )}
          {canRepairWebPlayback && (
            <button
              type="button"
              onClick={handleOpenVideoViewClick}
              onPointerDown={stopOverlayActionPropagation}
              onTouchStart={stopOverlayActionPropagation}
              className="mt-2 px-5 py-2 text-sm text-white/90 underline-offset-2 hover:underline ios-text-render"
              style={{ touchAction: 'manipulation' }}
            >
              Ouvrir la fiche vidéo
            </button>
          )}
        </div>
      )}

      {/* ================= GRADIENT (léger : le bandeau UI apporte déjà le fondu — évite double assombrissement) ================= */}
      <div
        className="
          absolute inset-x-0 bottom-0 h-[120px]
          bg-gradient-to-t
          from-black/42
          via-transparent
          to-transparent
          pointer-events-none
          z-[20]
        "
        style={{ touchAction: 'pan-y' }}
      />

      {/* ================= PLAY / PAUSE (vidéo uniquement) ================= */}
      {video.media_type !== 'image' && (
      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]"
          >
            <div className="flex items-center justify-center">
              {isPlaying ? (
                <Pause className="h-10 w-10 text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.85)] fill-white sm:h-14 sm:w-14" />
              ) : (
                <Play className="h-10 w-10 text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.85)] fill-white sm:h-14 sm:w-14" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      <div
        data-afw-video-ui-layer="1"
        data-afw-videocard-mounted="1"
        className="absolute inset-0 z-[30] pointer-events-none text-white"
        style={
          debugVideoUi
            ? {
                backgroundColor: 'rgba(255,0,0,0.22)',
                boxShadow: 'inset 0 0 0 3px rgba(255,0,0,0.9)',
              }
            : undefined
        }
      >

      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/56 via-black/18 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/68 via-black/28 to-transparent" />

      {/* ================= ACTIONS DROITE (style TikTok) ================= */}
      <motion.div
        data-afw-video-actions="1"
        className={cn(
          'absolute right-3 flex flex-col items-center gap-3 sm:right-4 sm:gap-3.5',
          hideActions ? 'pointer-events-none' : 'pointer-events-auto'
        )}
        initial={false}
        animate={hideActions ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          zIndex: 220,
          // Au-dessus du bloc infos + marge : évite chevauchement avec barre du bas / HUD
          // Feed compact : un peu plus haut (iPhone + BottomNav fixe)
          bottom: compact
            ? 'calc(11rem + env(safe-area-inset-bottom, 0px))'
            : 'calc(8rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={() => onProfileClick(video.creator_id)}
          aria-label={video.creator_name ? `Voir le profil de ${video.creator_name}` : 'Voir le profil'}
          className="relative flex flex-col items-center gap-1 rounded-full transition-transform duration-200 active:scale-[0.97]"
        >
          <Avatar className="h-11 w-11 border border-white/18 shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-0 sm:h-12 sm:w-12">
            <AvatarImage
              src={video.creator_avatar || video.creator?.profile_image}
              alt={video.creator_name}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-700 text-[13px] font-bold text-white">
              {creatorInitial}
            </AvatarFallback>
          </Avatar>
          {canShowFollowCta && !isCreatorFollowed ? (
            <span className="absolute -bottom-0.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-[#0b1220] bg-[#facc15] text-[12px] font-black text-slate-950 shadow-[0_10px_18px_rgba(250,204,21,0.28)]">
              +
            </span>
          ) : null}
        </button>

        <div className="relative flex flex-col items-center gap-1">
          <FeedActionButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLike();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ touchAction: 'none' }}
            label={localIsLiked ? 'Retirer le like' : 'Aimer'}
            aria-pressed={!!localIsLiked}
            pressed={localIsLiked}
            feedback={isAnimating}
          >
            <motion.div
              animate={
                isAnimating
                  ? {
                      scale: [1, 1.22, 1],
                      rotate: [0, -8, 8, 0],
                    }
                  : {}
              }
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Heart
                className={cn(
                  'h-6 w-6 transition-colors duration-200 drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]',
                  localIsLiked ? 'fill-red-500 text-red-500' : 'text-white'
                )}
              />
            </motion.div>
          </FeedActionButton>

          <AnimatePresence>
            {showParticles &&
              [...Array(6)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [1, 1, 0],
                    scale: [0, 1, 0.5],
                    x: Math.cos((i * 60) * Math.PI / 180) * 26,
                    y: Math.sin((i * 60) * Math.PI / 180) * 26,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.018, ease: 'easeOut' }}
                  className="pointer-events-none absolute left-1/2 top-2 z-0 -translate-x-1/2"
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </motion.div>
              ))}
          </AnimatePresence>

          <motion.div
            animate={isAnimating ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <FeedActionLabel>{formatFeedCount(likeCount)}</FeedActionLabel>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <FeedActionButton
            onClick={(e) => {
              e.stopPropagation();
              triggerActionFeedback('comment');
              onComment?.();
            }}
            label="Commenter"
            feedback={!!actionFeedback.comment}
          >
            <motion.div
              animate={actionFeedback.comment ? { scale: [1, 1.14, 1], y: [0, -1, 0] } : {}}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <MessageCircle className="h-6 w-6 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]" />
            </motion.div>
          </FeedActionButton>
          <motion.div
            animate={actionFeedback.comment ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <FeedActionLabel>{formatFeedCount(video.comments_count)}</FeedActionLabel>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <FeedActionButton
            onClick={(e) => {
              e.stopPropagation();
              triggerActionFeedback('share');
              onShare?.();
            }}
            label="Partager"
            feedback={!!actionFeedback.share}
          >
            <motion.div
              animate={actionFeedback.share ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] } : {}}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <Share2 className="h-6 w-6 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]" />
            </motion.div>
          </FeedActionButton>
          <motion.div
            animate={actionFeedback.share ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <FeedActionLabel>{compact ? formatFeedCount(video.shares) : 'Partager'}</FeedActionLabel>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <FeedActionButton
            onClick={(e) => {
              e.stopPropagation();
              triggerActionFeedback('save');
              onSave?.();
            }}
            label="Sauvegarder"
            pressed={isSaved}
            feedback={!!actionFeedback.save}
          >
            <motion.div
              animate={actionFeedback.save ? { scale: [1, 1.12, 1], y: [0, -1, 0] } : {}}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <Bookmark
                className={cn(
                  'h-6 w-6 transition-colors duration-200 drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]',
                  isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-white'
                )}
              />
            </motion.div>
          </FeedActionButton>
          {isSaved ? (
            <motion.div
              animate={actionFeedback.save ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <FeedActionLabel>Sauve</FeedActionLabel>
            </motion.div>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-1">
          <FeedActionButton
            onClick={(e) => {
              e.stopPropagation();
              triggerActionFeedback('audio');
              handleMuteToggleClick();
            }}
            style={{ touchAction: 'manipulation' }}
            label={isMuted || autoplayMutedFallback ? 'Activer le son' : 'Couper le son'}
            pressed={!isMuted && !autoplayMutedFallback}
            feedback={!!actionFeedback.audio}
          >
            <motion.div
              animate={actionFeedback.audio ? { scale: [1, 1.12, 1], rotate: [0, -8, 0] } : {}}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              {isMuted || autoplayMutedFallback ? (
                <VolumeX className="pointer-events-none h-6 w-6 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]" />
              ) : (
                <Volume2 className="pointer-events-none h-6 w-6 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)]" />
              )}
            </motion.div>
          </FeedActionButton>
          <motion.div
            animate={actionFeedback.audio ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <FeedActionLabel>{isMuted || autoplayMutedFallback ? 'Muet' : 'Son'}</FeedActionLabel>
          </motion.div>
        </div>

        {!compact && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDataSaver((prev) => !prev);
                triggerActionFeedback('dataSaver');
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[10px] font-semibold shadow-[0_10px_24px_rgba(2,6,23,0.24)] backdrop-blur-md transition-all duration-200 active:scale-[0.97]',
                isDataSaver
                  ? 'border-white bg-white text-black'
                  : 'border-white/35 bg-black/40 text-white'
              )}
            >
              Mode economie
            </button>
            <span className="min-h-[14px] text-[10px] leading-tight text-white/78">
              {isDataSaver ? 'Données réduites' : 'Qualité normale'}
            </span>
          </div>
        )}

        {onTip && (
          <div className="flex flex-col items-center gap-1">
            <FeedActionButton
              onClick={(e) => {
                e.stopPropagation();
                triggerActionFeedback('tip');
                onTip();
              }}
              style={{ touchAction: 'manipulation' }}
              label="Soutenir"
              feedback={!!actionFeedback.tip}
            >
              <motion.div
                animate={actionFeedback.tip ? { scale: [1, 1.12, 1], y: [0, -1, 0] } : {}}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <DollarSign className="pointer-events-none h-6 w-6 text-yellow-400" />
              </motion.div>
            </FeedActionButton>
            {!compact && (
              <motion.div
                animate={actionFeedback.tip ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <FeedActionLabel>Soutenir</FeedActionLabel>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ================= TEXT OVERLAY ================= */}
      {video.text_overlay && (
        <div 
          data-afw-video-text-overlay="1"
          className="absolute pointer-events-none max-w-[min(92vw,18rem)]"
          style={{ 
            zIndex: 160,
            left: `${video.text_x || 50}%`, 
            top: `${video.text_y || 50}%`, 
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <p
            className="break-words text-center text-2xl font-black leading-tight text-white drop-shadow-2xl sm:text-3xl"
             style={{ 
               textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' 
             }}
          >
            {video.text_overlay}
          </p>
        </div>
      )}

      {/* ================= STICKERS ================= */}
      {video.stickers?.length > 0 && (
        <div
          data-afw-video-stickers="1"
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 165 }}
        >
          {video.stickers.map((sticker, index) => (
            <div
              key={sticker?.id ?? `sticker-${index}-${sticker?.emoji ?? index}`}
              className="absolute text-6xl"
              style={{
                left: `${sticker.x || 50}%`,
                top: `${sticker.y || 50}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {sticker.emoji || sticker}
            </div>
          ))}
        </div>
      )}

      {/* Logo + @ : uniquement dans la ligne « infos bas » (compact) — évite le doublon avec l’ancien watermark */}

      {/* ================= INFOS BAS ================= */}
      <motion.div 
        data-afw-video-info="1"
        className={cn(
          'absolute left-0 right-0 overflow-x-hidden px-4 pb-3',
          hideActions ? 'pointer-events-none' : 'pointer-events-auto'
        )}
        initial={false}
        animate={hideActions ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          touchAction: 'pan-y',
          zIndex: 210,
          // Nav feed ~74px + offset 16px + marge 8px + safe area (BottomNav)
          bottom: compact
            ? 'calc(9.75rem + env(safe-area-inset-bottom, 0px))'
            : 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Style TikTok / Reels : texte directement sur la vidéo + vignette globale — pas de gros cadre glass (trop « prototype ») */}
        <div className="max-w-[calc(100%-94px)] min-w-0 space-y-3 bg-transparent px-0 py-0">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => onProfileClick(video.creator_id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              {compact && !hideActions && (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/40 ring-1 ring-white/18"
                  aria-hidden
                >
                  <AfriWonderLogo size="xs" className="opacity-95" />
                </span>
              )}
              <span className="min-w-0 truncate text-[15px] font-bold tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.64)]">
                @{creatorAt || video.creator_name}
              </span>
              {video.is_verified && (
                <BadgeCheck className="h-4 w-4 shrink-0 fill-blue-400 text-blue-400" />
              )}
            </button>

            {canShowFollowCta && (
              <button
                type="button"
                onClick={() => {
                  if (onSubscribe) onSubscribe();
                  else handleFollow();
                }}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 active:scale-[0.98]',
                  isCreatorFollowed
                    ? 'border-0 bg-white/14 text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)] ring-1 ring-white/18 backdrop-blur-md'
                    : 'border-0 bg-white text-slate-950 shadow-[0_10px_28px_rgba(255,255,255,0.2)]'
                )}
              >
                {isCreatorFollowed ? (
                  <>
                    <UserCheck className="mr-1 inline h-3 w-3" />
                    Wonder
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-1 inline h-3 w-3" />
                    Suivre
                  </>
                )}
              </button>
            )}
          </div>

          {(titleText || descriptionText) && (
            <div className="min-w-0 space-y-1.5 break-words">
              {titleText && (
                <p className="break-words text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.58)]">
                  {renderTextWithHashtags(titleText)}
                </p>
              )}
              {descriptionText && (
                <>
                  <p className="break-words text-[13px] leading-[1.5] text-white/88 drop-shadow-[0_2px_10px_rgba(0,0,0,0.54)]">
                    {showFullDescription || !isDescriptionLong ? (
                      renderTextWithHashtags(descriptionText)
                    ) : (
                      <>
                        {renderTextWithHashtags(displayText)}
                        <button
                          onClick={() => setShowFullDescription(true)}
                          className="ml-1 text-[12px] font-medium text-white/72 transition-colors hover:text-white"
                        >
                          ...plus
                        </button>
                      </>
                    )}
                  </p>
                  {isDescriptionLong && showFullDescription && (
                    <button
                      onClick={() => setShowFullDescription(false)}
                      className="mt-1 text-[12px] font-medium text-white/72 transition-colors hover:text-white"
                    >
                      Moins
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div
            className="flex items-center gap-1.5 text-[12px] font-medium tracking-tight text-white/78 drop-shadow-[0_1px_10px_rgba(0,0,0,0.52)]"
            aria-label={`${formatFeedCount(Number(video.views ?? video.views_count ?? 0))} vues`}
          >
            <Eye className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span>{formatFeedCount(Number(video.views ?? video.views_count ?? 0))} vues</span>
          </div>

          {video.media_type !== 'image' && (
            <div
              className="mt-2 flex items-center gap-2.5 pt-1"
              style={{ touchAction: 'none' }}
            >
              <div
                ref={progressBarRef}
                className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/14"
                onMouseDown={handleProgressMouseDown}
                onTouchStart={handleProgressTouchStart}
                onClick={handleProgressClick}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/95"
                  style={{ width: `${Math.max(0, Math.min(100, isDragging ? dragProgress : progress))}%` }}
                />
              </div>
              <span className="min-w-[44px] text-right text-[10px] font-medium tabular-nums text-white/74">
                {timeLabel}
              </span>
            </div>
          )}

          {hashtags.length > 0 && (!combinedText || !combinedText.match(/#\w+/g)) && (
            <div className="mb-1 mt-1 flex flex-wrap gap-1.5">
              {hashtags.slice(0, 3).map((tag, index) => (
                <button
                  key={`${tag}-${index}`}
                  onClick={() =>
                    navigate(createPageUrl('Search') + `?q=${encodeURIComponent(tag)}`)
                  }
                  className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md transition-colors hover:border-blue-300/40 hover:bg-white/12 hover:text-blue-300"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

        {musicTitle && (
          <div
            className="mb-0.5 mt-1.5 flex min-w-0 items-center gap-2 text-[12px] leading-tight"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Music2 className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden />
              <span
                className="min-w-0 truncate font-medium tracking-[-0.01em] text-white/88 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]"
                title={musicTitle}
              >
                {musicTitle}
              </span>
            </div>
            {currentUser && currentUser.id !== video.creator_id && (
              <>
                <span className="shrink-0 text-white/35" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigate(createPageUrl('Create') + `?music=${encodeURIComponent(musicTitle)}`)
                  }
                  className="shrink-0 rounded-sm px-0.5 text-[11px] font-semibold text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
                  aria-label={`Utiliser le son : ${musicTitle}`}
                >
                  Utiliser
                </button>
              </>
            )}
          </div>
        )}
        </div>
      </motion.div>
    </div>
    </div>
  );
}

export default memo(VideoCardContent);


