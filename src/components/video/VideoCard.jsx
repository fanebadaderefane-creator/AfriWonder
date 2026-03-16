// AfriWonder full review PR - CodeRabbit
// @ts-nocheck
/**
 * VideoCard — full-screen feed player. Single active item, poster until first frame, HLS/MP4.
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, memo } from 'react';
import Heart from 'lucide-react/icons/heart';
import HeartCrack from 'lucide-react/icons/heart-crack';
import Flame from 'lucide-react/icons/flame';
import MessageCircle from 'lucide-react/icons/message-circle';
import Share2 from 'lucide-react/icons/share-2';
import Bookmark from 'lucide-react/icons/bookmark';
import Play from 'lucide-react/icons/play';
import Pause from 'lucide-react/icons/pause';
import Volume2 from 'lucide-react/icons/volume-2';
import VolumeX from 'lucide-react/icons/volume-x';
import BadgeCheck from 'lucide-react/icons/badge-check';
import Music2 from 'lucide-react/icons/music-2';
import DollarSign from 'lucide-react/icons/dollar-sign';
import UserPlus from 'lucide-react/icons/user-plus';
import UserCheck from 'lucide-react/icons/user-check';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getVideoPlaybackUrl, getAbsoluteImageUrl, isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG, isMobileOrPWA } from "@/lib/utils";
import { releasePoolPlayer } from '@/lib/videoPool';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/components/common/useTranslation";
import { api } from '@/api/expressClient';
import { toast } from 'sonner';
import Hls from 'hls.js';
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

function VideoCardContent({
  video,
  isActive,
  onLike,
  onReaction,
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
  currentUserReaction,
  hideActions = false,
  compact = false,
  preload = 'metadata',
  shouldPreload = false,
  videoPoolRef = null,
  poolIndex = undefined,
  canLike = true,
  onRequireAuth,
}) {
  const effectiveReaction = currentUserReaction ?? video.current_user_reaction ?? null;
  const videoRef = useRef(null);
  const poolContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const progressBarRef = useRef(null);
  const viewRecordedRef = useRef(false);
  const userPausedRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  const navigate = useNavigate();
  
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
  const [userLang, setUserLang] = useState('fr');
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState(isFollowing || false);
  const hasAutoPlayedRef = useRef(false);
  const hasPlayedOnceRef = useRef(false);
  const hasAppliedStartTimeRef = useRef(false);
  const isMutedRef = useRef(!!isMuted);
  const [autoplayMutedFallback, setAutoplayMutedFallback] = useState(!!isMuted);
  /** PWA/mobile : true une fois l'autoplay réussi, pour afficher le son selon la préférence utilisateur */
  const [hasAutoplaySucceeded, setHasAutoplaySucceeded] = useState(false);
  const [isDataSaver, setIsDataSaver] = useState(false);

  useEffect(() => {
    isMutedRef.current = !!isMuted;
  }, [isMuted]);

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iP(ad|hone|od)/i.test(navigator.userAgent || '');
  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  
  // Synchroniser avec les props (abonnement + likes)
  useEffect(() => {
    setFollowing(isFollowing || false);
  }, [isFollowing]);

  // État local pour like (toggle immédiat, 1 like max par utilisateur)
  const [localIsLiked, setLocalIsLiked] = useState(!!isLiked);
  // Réaction courante (CPO 2.44 : like, love, fire) — total = sum(reaction_counts) ou video.likes
  const reactionCounts = video.reaction_counts && typeof video.reaction_counts === 'object' ? video.reaction_counts : null;
  const initialCount = reactionCounts
    ? Object.values(reactionCounts).reduce((a, b) => a + (Number(b) || 0), 0)
    : (video.likes || 0);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [localReaction, setLocalReaction] = useState(effectiveReaction || null);

  // Quand on change de vidéo, on resynchronise sur l'état serveur
  useEffect(() => {
    setLocalIsLiked(!!isLiked);
    if (video.reaction_counts && typeof video.reaction_counts === 'object') {
      const sum = Object.values(video.reaction_counts).reduce((a, b) => a + (Number(b) || 0), 0);
      setLikeCount(sum);
    } else {
      setLikeCount(video.likes || 0);
    }
    setLocalReaction(effectiveReaction || null);
  }, [video.id, isLiked, video.likes, effectiveReaction, video.reaction_counts]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
  const [hasFirstFrameRendered, setHasFirstFrameRendered] = useState(false);
  const posterRef = useRef(null);

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

  // Connexion lente (2G/3G/saveData) â†’ prÃ©fÃ©rer basse qualitÃ© si dispo (objectif Afrique)
  const slowConnection = useMemo(() => {
    if (typeof navigator === 'undefined' || !navigator.connection) return false;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    const slow = ['slow-2g', '2g', '3g'].includes(conn.effectiveType) || !!conn.saveData;
    return slow;
  }, []);

  // Liste de sources de secours : si une source Ã©choue, on passe automatiquement Ã  la suivante.
  const playbackUrls = useMemo(() => {
    const out = [];
    const pushUrl = (raw) => {
      const u = getVideoPlaybackUrl(raw) || (typeof raw === 'string' ? raw : '');
      if (!u || typeof u !== 'string' || u.trim() === '') return;
      if (!out.includes(u)) out.push(u);
    };
    if (video.hls_url) pushUrl(video.hls_url);
    if (slowConnection || isDataSaver) {
      pushUrl(video.low_quality_url);
      pushUrl(video.video_url || video.hd_url);
      pushUrl(video.hd_url);
    } else {
      pushUrl(video.video_url || video.hd_url);
      pushUrl(video.hd_url);
      pushUrl(video.low_quality_url);
    }
    return out;
  }, [video.hls_url, video.video_url, video.low_quality_url, video.hd_url, slowConnection, isDataSaver]);

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
    setAutoplayMutedFallback(!!isMuted);
  }, [video.id, videoUrl, isMuted]);

  const isHls = useMemo(() => /\.m3u8(\?|$)/i.test(videoUrl || ''), [videoUrl]);

  // Source vidéo : toujours passer l'URL (évite écran noir pour HLS avant que Hls.js prenne le relais ; Safari lit le .m3u8 en natif)
  const videoSrc = videoUrl || video.video_url || video.hls_url;

  const hasWarnedEmptyUrlRef = useRef(false);
  const lastWarnedVideoIdRef = useRef(null);
  if (process.env.NODE_ENV === 'development' && (videoUrl === '' || videoUrl == null) && lastWarnedVideoIdRef.current !== video?.id) {
    lastWarnedVideoIdRef.current = video?.id ?? null;
    // eslint-disable-next-line no-console
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

  const [loadError, setLoadError] = useState(false);
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);
  const [showVideoFrame, setShowVideoFrame] = useState(false);
  const errorRetriedRef = useRef(false);

  const { t } = useTranslation();
  
  // Affichage sÃ©parÃ©: titre et description sur des lignes distinctes
  const titleText = (video.title || '').trim();
  const descriptionText = (displayDescription || '').trim();
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
    setIsActuallyPlaying(false);
    setHasFirstFrameRendered(false);
    
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

  // Video Pool type TikTok : réutilisation de 3 lecteurs pour tout le feed (RAM, fluidité)
  const usePool = videoPoolRef?.current && poolIndex != null && !isHls && videoSrc && videoUrl;
  const lastPoolSrcRef = useRef(null);

  // Effet 1 : assigner la source et attacher le lecteur (uniquement quand la vidéo change → limite le clignotement au scroll)
  // Premier frame : on attend playing ou timeupdate avec currentTime > 0 pour éviter d'enlever le poster avant que la vidéo peigne (écran noir).
  useEffect(() => {
    if (!usePool || !poolContainerRef.current) return;
    const pool = videoPoolRef.current;
    const player = pool[poolIndex];
    if (!player) return;

    const sameVideo = lastPoolSrcRef.current === videoSrc;
    if (!sameVideo) {
      lastPoolSrcRef.current = videoSrc;
      setHasFirstFrameRendered(false);
    }

    const onPlaying = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHasFirstFrameRendered(true));
      });
    };

    const onTimeUpdate = (event) => {
      updateProgressFromElement(event?.target || player);
    };

    const alreadyHere = player.parentNode === poolContainerRef.current && (player.src === videoSrc || player.currentSrc === videoSrc);
    if (!alreadyHere) {
      releasePoolPlayer(player);
      player.src = videoSrc;
      player.loop = true;
      player.playsInline = true;
      player.preload = 'auto';
      poolContainerRef.current.appendChild(player);
      player.addEventListener('playing', onPlaying);
    }

    player.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      player.removeEventListener('playing', onPlaying);
      player.removeEventListener('timeupdate', onTimeUpdate);
      if (player.parentNode && poolContainerRef.current && player.parentNode === poolContainerRef.current) {
        try { player.parentNode.removeChild(player); } catch (_) {}
      }
      try { player.pause(); } catch (_) {}
    };
  }, [usePool, poolIndex, videoSrc]);

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

  /** Réaction multiple (love, fire) — toggle ou set (CPO 2.44) */
  const handleReactionType = (type) => {
    if (!onReaction) return;
    const isCurrent = localReaction === type;
    if (isCurrent) {
      setLocalReaction(null);
      setLocalIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
      onReaction(video, null);
    } else {
      const hadReaction = !!localReaction;
      setLocalReaction(type);
      setLocalIsLiked(true);
      if (!hadReaction) setLikeCount((prev) => prev + 1);
      onReaction(video, type);
    }
  };

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

  /* ================= INIT ================= */

  useEffect(() => {
    api.auth.me()
      .then(user => {
        setUserLang(user.language || 'fr');
        setCurrentUser(user);
      })
      .catch(() => {});
  }, []);

  // Check if already following
  useEffect(() => {
    if (!currentUser || !video.creator_id) return;
    if (currentUser.id === video.creator_id) return;
    
    api.users.getFollowing(currentUser.id)
      .then(result => {
        // getFollowing retourne { following: [...], pagination: {...} }
        const follows = result.following || result;
        const isFollowingUser = Array.isArray(follows) 
          ? follows.some(f => (f.id || f.following_id) === video.creator_id)
          : false;
        setFollowing(isFollowingUser);
      })
      .catch(() => {});
  }, [currentUser, video.creator_id]);

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

    if (Hls.isSupported()) {
      // Réutilisation de l'instance HLS déjà préchargée : on lance la lecture sans recréer (garde le buffer)
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
        // Feed type TikTok : on ne vide jamais la source (évite écran noir), on pause seulement
        if (el) {
          try {
            el.pause();
          } catch (_) {}
        }
      };
    }

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = videoUrl;
      el.loop = true;
      // iOS natif : playsInline + muted très tôt, avant toute tentative de play
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
      if (el.readyState >= 2) {
        tryPlay();
      } else if (el.readyState >= 1) {
        tryPlay();
      }
      el.addEventListener('canplay', onCanPlay);
      el.addEventListener('loadeddata', onCanPlay);
    };

    playVideo();

    // Plusieurs retries (type TikTok) pour tous mobiles : autoplay fiable
    const timers = [100, 400, 900, 1800, 3000, 4500].map((delay) =>
      window.setTimeout(() => {
        if (cancelled || !el || !isActive || userPausedRef.current) return;
        if (hasAutoPlayedRef.current) return;
        if (el.paused && el.readyState >= 2) {
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

  // Tracking vue 3s (monétisation / analytics)
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => {
      api.analytics.recordVideo({ video_id: video.id }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [isActive, video.id]);

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
    setLoadError(false);
    setIsReadyToPlay(false);
    setIsPlaying(false);
    hasAutoPlayedRef.current = false;
    userPausedRef.current = false;
    el.pause();
    el.currentTime = 0;
    // Recharge explicite seulement au clic utilisateur "RÃ©essayer".
    el.load();
    if (isActive) {
      const retryPlay = () => {
        autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true }).then((ok) => {
          if (ok) setIsReadyToPlay(true);
        });
      };
      if (el.readyState >= 2) retryPlay();
      else el.addEventListener('canplay', retryPlay, { once: true });
    }
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
    // Démarrage immédiat type TikTok dès que le navigateur peut jouer (muted = autoplay autorisé)
    if (!userPausedRef.current && el.paused && !hasAutoPlayedRef.current) {
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
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  // canplaythrough supprimÃ© : on dÃ©marre sur loadeddata (readyState >= 2) pour lecture immÃ©diate, pas dâ€™attente full buffer.
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  /* ================= RENDER ================= */

  const posterBgUrl = posterUrl.startsWith('data:') ? posterUrl : getAbsoluteImageUrl(posterUrl) || posterUrl;

  return (
    <div
      className="relative w-full bg-gray-950 overflow-hidden"
      style={{
        touchAction: 'pan-y',
        height: '100dvh',
        backgroundColor: '#020617',
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
      {/* ================= IMAGE (photo) ou VIDEO ================= */}
      {video.media_type === 'image' ? (
        <img
          src={getVideoPlaybackUrl(video.video_url) || video.video_url}
          alt={video.title || ''}
          className="absolute top-0 left-0 w-full h-full object-cover bg-gray-950"
        />
      ) : videoUrl ? (
      <>
      {/* Poster : au-dessus de tout, visible tant qu'aucun frame vidéo n'est rendu (évite l'écran noir) */}
      {!hasFirstFrameRendered && (
        <img
          ref={posterRef}
          src={posterDisplayUrl}
          className="absolute inset-0 w-full h-full object-cover z-[25]"
          style={{
            backgroundColor: '#374151',
            backgroundImage: `url(${VIDEO_PLACEHOLDER_IMG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'translateZ(0)',
          }}
          alt=""
          onError={() => setPosterDisplayUrl(VIDEO_PLACEHOLDER_IMG)}
        />
      )}
      {/* Zone principale player — poster en fond CSS (placeholder dès le 1er paint → plus de noir au démarrage) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundColor: '#374151',
          backgroundImage: !hasFirstFrameRendered
            ? `url(${VIDEO_PLACEHOLDER_IMG}), url(${posterDisplayUrl})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
        onDoubleClick={handleDoubleTap}
      >
        {/* Vidéo : pool réutilisable (TikTok) ou balise <video> classique — couche GPU pour limiter le clignotement au scroll */}
        {usePool ? (
          <div
            ref={poolContainerRef}
            className={`absolute top-0 left-0 w-full h-full object-cover z-20 transition-opacity duration-300 ${hasFirstFrameRendered ? 'opacity-100' : 'opacity-0'}`}
            style={{ touchAction: 'pan-y', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
            onClick={handlePlayPause}
            aria-label="Vidéo"
          />
        ) : (
        <video
          key={video.id}
          ref={videoRef}
          data-afw-feed-video="1"
          src={videoSrc}
          className={`absolute top-0 left-0 w-full h-full object-cover z-20 transition-opacity duration-300 ${hasFirstFrameRendered ? 'opacity-100' : 'opacity-0'}`}
          autoPlay={false}
          preload="auto"
          loop
          playsInline
          crossOrigin="anonymous"
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
            
            // Ne jamais appeler load() ici — provoque écran noir (feed type TikTok)
            if (isMobileOrPWA() && !errorRetriedRef.current) {
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
            const el = videoRef.current;
            if (el && isActive && el.paused && !userPausedRef.current) {
              autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true });
            }
          }}
          onSeeked={handleMainVideoSeeked}
          style={{ 
            touchAction: 'pan-y',
            filter: video.filter === 'Normal' || !video.filter ? 'none' :
                    video.filter === 'Noir & Blanc' ? 'grayscale(100%)' :
                    video.filter === 'Sépia' ? 'sepia(100%)' :
                    video.filter === 'Vibrant' ? 'saturate(200%)' :
                    video.filter === 'Foncé' ? 'brightness(0.75)' :
                    video.filter === 'Lumineux' ? 'brightness(1.25)' : 'none'
          }}
          onPlaying={() => {
            handlePlaying();
            requestAnimationFrame(() => {
              requestAnimationFrame(() => setHasFirstFrameRendered(true));
            });
          }}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[50] p-4">
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

      {/* Pas d'indicateur de buffer - lecture fluide comme TikTok */}

      {/* ================= ERREUR DE CHARGEMENT ================= */}
      {loadError && !isPlaying && !hasFirstFrameRendered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[50] p-4">
          <img
            src={posterUrl}
            alt=""
            className="max-w-full max-h-[50%] object-contain rounded-lg opacity-80"
          />
          <p className="text-white text-center mt-4 font-medium ios-text-render">Vidéo indisponible</p>
          <p className="text-white/70 text-sm text-center mt-1 ios-text-render">Impossible de charger la vidéo. Connexion lente ? Appuyez sur Réessayer.</p>
          <button
            type="button"
            onClick={handleRetryLoad}
            className="mt-4 px-6 py-2.5 bg-white text-black rounded-full font-semibold hover:bg-gray-200 active:scale-95 transition-transform ios-text-render"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ================= GRADIENT ================= */}
      <div
        className="
          absolute inset-x-0 bottom-0 h-[140px]
          bg-gradient-to-t
          from-black/60
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
            {/* Taille réduite sur mobile/Android pour une meilleure UX */}
            <div className="bg-black/40 p-3 rounded-full sm:p-6">
              {isPlaying ? (
                <Pause className="w-8 h-8 sm:w-12 sm:h-12 text-white fill-white" />
              ) : (
                <Play className="w-8 h-8 sm:w-12 sm:h-12 text-white fill-white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {/* ================= ACTIONS DROITE (style TikTok) ================= */}
      <div className={cn(
        "absolute right-3 bottom-28 flex flex-col items-center gap-4 z-[90] transition-opacity duration-300",
        hideActions ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {/* Avatar */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => onProfileClick(video.creator_id)} className="flex flex-col items-center">
            <Avatar className="w-12 h-12 border-2 border-white shadow-lg ring-2 ring-white/20">
              <AvatarImage 
                src={video.creator_avatar || video.creator?.profile_image} 
                alt={video.creator_name}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                {video.creator_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>

        <div className="flex flex-col items-center gap-0.5 relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLike();
            }}
            onTouchStart={(e) => {
              // Empêche qu'un léger mouvement de doigt déclenche un scroll + snap vers la vidéo suivante
              e.preventDefault();
              e.stopPropagation();
            }}
            className="flex items-center justify-center w-7 h-7 relative z-10 touch-manipulation"
            style={{ touchAction: 'none' }}
          >
            <motion.div
              animate={isAnimating ? {
                scale: [1, 1.3, 1],
                rotate: [0, -10, 10, -10, 10, 0]
              } : {}}
              transition={{
                duration: 0.6,
                ease: "easeOut"
              }}
            >
              <Heart
                className={cn(
                  "w-7 h-7 transition-colors",
                  localIsLiked ? "text-red-500 fill-red-500" : "text-white"
                )}
              />
            </motion.div>
          </button>
          
          {/* Particules animÃ©es */}
          <AnimatePresence>
            {showParticles && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    initial={{ 
                      opacity: 1, 
                      scale: 0,
                      x: 0,
                      y: 0
                    }}
                    animate={{
                      opacity: [1, 1, 0],
                      scale: [0, 1, 0.5],
                      x: Math.cos((i * 60) * Math.PI / 180) * 30,
                      y: Math.sin((i * 60) * Math.PI / 180) * 30,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.05,
                      ease: "easeOut"
                    }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0"
                  >
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
          
          <motion.span 
            className="text-white text-xs font-semibold leading-tight min-h-[16px] flex items-center justify-center"
            animate={isAnimating ? {
              scale: [1, 1.2, 1]
            } : {}}
            transition={{
              duration: 0.4,
              ease: "easeOut"
            }}
          >
            {(() => {
              const safeLikes = Number.isFinite(likeCount) ? likeCount : 0;
              if (safeLikes >= 1000) return `${(safeLikes / 1000).toFixed(1)}K`;
              return safeLikes.toLocaleString();
            })()}
          </motion.span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <button onClick={onComment} className="flex items-center justify-center w-7 h-7">
            <MessageCircle className="w-7 h-7 text-white" />
          </button>
          <span className="text-white text-xs font-semibold leading-tight min-h-[16px] flex items-center justify-center">
            {(() => {
              const raw = video.comments_count ?? 0;
              const safe = Number.isFinite(raw) ? raw : 0;
              if (safe >= 1000) return `${(safe / 1000).toFixed(1)}K`;
              return safe.toLocaleString();
            })()}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <button onClick={onShare} className="flex items-center justify-center w-8 h-8" aria-label="Partager">
            <Share2 className="w-7 h-7 text-white" />
          </button>
          {!compact && (
            <span className="text-white text-[11px] font-medium leading-tight min-h-[14px] flex items-center justify-center">
              Partager
            </span>
          )}
        </div>

        <div className="flex flex-col items-center">
          <button onClick={onSave} className="flex items-center justify-center w-7 h-7">
            <Bookmark
              className={cn(
                "w-7 h-7",
                isSaved ? "text-yellow-400 fill-yellow-400" : "text-white"
              )}
            />
          </button>
          <span className="text-white text-xs font-semibold leading-tight min-h-[16px]"></span>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={handleMuteToggleClick}
            className="flex items-center justify-center w-7 h-7"
          >
            {isMuted || autoplayMutedFallback ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
          <span className="text-white text-xs font-semibold leading-tight min-h-[16px]"></span>
        </div>

        {!compact && (
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDataSaver((prev) => !prev);
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors",
                isDataSaver
                  ? "bg-white text-black border-white"
                  : "bg-black/50 text-white border-white/40"
              )}
            >
              Mode économie
            </button>
            <span className="text-white text-[10px] leading-tight min-h-[14px] opacity-80">
              {isDataSaver ? "Données réduites" : "Qualité normale"}
            </span>
          </div>
        )}

        {onTip && (
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTip();
              }}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 touch-manipulation active:scale-95 transition-transform select-none"
              aria-label="Soutenir"
            >
              <DollarSign className="w-7 h-7 text-yellow-400 pointer-events-none" />
            </button>
            {!compact && <span className="text-white text-xs font-semibold leading-tight min-h-[16px]">Soutenir</span>}
          </div>
        )}
      </div>

      {/* ================= TEXT OVERLAY ================= */}
      {video.text_overlay && (
        <div 
          className="absolute pointer-events-none z-[30]"
          style={{ 
            left: `${video.text_x || 50}%`, 
            top: `${video.text_y || 50}%`, 
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <p className="text-white text-4xl font-black text-center px-6 drop-shadow-2xl stroke-black stroke-2"
             style={{ 
               textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' 
             }}>
            {video.text_overlay}
          </p>
        </div>
      )}

      {/* ================= STICKERS ================= */}
      {video.stickers?.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-[35]">
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

      {/* ================= BRAND USERNAME WATERMARK (style TikTok) ================= */}
      {!hideActions && video.media_type !== 'image' && isActive && (
        <AnimatePresence>
          <motion.div
            className="absolute left-3 bottom-72 z-[70] flex items-center gap-2"
            initial={{ opacity: 0, x: -24, rotate: -10 }}
            animate={{
              opacity: [0, 1, 1, 1, 0],
              x: [-24, 0, 0, 0, 0],
              rotate: [-10, 5, 0, 0, 0],
            }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: 3.2,
              ease: 'easeInOut',
              times: [0, 0.25, 0.6, 0.85, 1],
            }}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/90 flex items-center justify-center">
              <AfriWonderLogo size="xs" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold text-white/80 tracking-wide">
                AfriWonder
              </span>
              <span className="text-xs font-bold text-white">
                @{video.creator_name}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ================= INFOS BAS ================= */}
      <div 
        className={cn(
          "absolute left-0 right-0 bottom-20 px-4 pb-4 z-[90] transition-opacity duration-300",
          hideActions ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-center gap-2 mb-2">
          {onSubscribe && currentUser && currentUser.id !== video.creator_id && (
            <button
              onClick={() => {
                if (onSubscribe) {
                  onSubscribe();
                } else {
                  handleFollow();
                }
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                following || isFollowing
                  ? "bg-white/20 text-white border border-white/30"
                  : "bg-white text-black"
              )}
            >
              {following || isFollowing ? (
                <>
                  <UserCheck className="w-3 h-3 inline mr-1" />
                  Dans son Wonder
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3 inline mr-1" />
                  Wonder
                </>
              )}
            </button>
          )}
          <button
            onClick={() => onProfileClick(video.creator_id)}
            className="flex items-center gap-2"
          >
            <span className="text-white font-extrabold text-lg">
              @{video.creator_name}
            </span>
            {video.is_verified && (
              <BadgeCheck className="w-5 h-5 text-blue-400 fill-blue-400" />
            )}
          </button>
        </div>

        {/* Titre + description (sÃ©parÃ©s) avec hashtags cliquables */}
        {(titleText || descriptionText) && (
          <div className="mb-2">
            {titleText && (
              <p className="text-white font-semibold text-[17px] leading-snug break-words mb-1">
                {renderTextWithHashtags(titleText)}
              </p>
            )}
            {descriptionText && (
              <>
                <p className="text-white/95 text-sm leading-relaxed break-words">
                  {showFullDescription || !isDescriptionLong ? (
                    renderTextWithHashtags(descriptionText)
                  ) : (
                    <>
                      {renderTextWithHashtags(displayText)}
                      <button
                        onClick={() => setShowFullDescription(true)}
                        className="text-white/80 text-sm font-medium ml-1 hover:text-white transition-colors"
                      >
                        ...plus
                      </button>
                    </>
                  )}
                </p>
                {isDescriptionLong && showFullDescription && (
                  <button
                    onClick={() => setShowFullDescription(false)}
                    className="text-white/80 text-sm font-medium mt-1 hover:text-white transition-colors"
                  >
                    Moins
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Signal social compact : on montre toujours les compteurs, mÃªme faibles */}
        <div className="flex flex-wrap items-center gap-3 mb-2 text-white/70 text-[11px]">
          <span>
            {(() => {
              const raw = video.views ?? video.views_count ?? 0;
              const safe = Number.isFinite(raw) ? raw : 0;
              return `${safe.toLocaleString()} vues`;
            })()}
          </span>
          <span>
            {(() => {
              const raw = video.comments_count ?? 0;
              const safe = Number.isFinite(raw) ? raw : 0;
              return `${safe.toLocaleString()} commentaires`;
            })()}
          </span>
          <span>
            {(() => {
              const raw = video.shares ?? 0;
              const safe = Number.isFinite(raw) ? raw : 0;
              return `${safe.toLocaleString()} partages`;
            })()}
          </span>
        </div>

        {/* ================= BARRE DE PROGRESSION (sous les vues/commentaires/partages) ================= */}
        {video.media_type !== 'image' && (
          <div 
            className="mt-1 flex items-center gap-3"
            style={{ touchAction: 'none' }}
          >
            <div
              ref={progressBarRef}
              className="relative flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer"
              onMouseDown={handleProgressMouseDown}
              onTouchStart={handleProgressTouchStart}
              onClick={handleProgressClick}
            >
              <div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, isDragging ? dragProgress : progress))}%` }}
              />
            </div>
            <span className="text-white text-[11px] font-medium min-w-[44px] text-right">
              {formatTime(currentTime || 0)}/{formatTime(duration || video.duration || 0)}
            </span>
          </div>
        )}

        {/* Hashtags - afficher quand prÃ©sents et non dÃ©jÃ  dans le texte */}
        {hashtags.length > 0 && (!combinedText || !combinedText.match(/#\w+/g)) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {hashtags.slice(0, 3).map((tag, index) => (
              <button
                key={`${tag}-${index}`}
                onClick={() =>
                  navigate(createPageUrl('Search') + `?q=${encodeURIComponent(tag)}`)
                }
                className="text-white font-bold hover:text-blue-400 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {musicTitle && (
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-full w-fit">
              <Music2 className="w-4 h-4 text-white" />
              <span className="text-white text-sm">{musicTitle}</span>
            </span>
            {currentUser && currentUser.id !== video.creator_id && (
              <button
                onClick={() =>
                  navigate(createPageUrl('Create') + `?music=${encodeURIComponent(musicTitle)}`)
                }
                className="text-blue-300 hover:text-blue-200 text-xs font-medium"
              >
                Utiliser
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(VideoCardContent);


