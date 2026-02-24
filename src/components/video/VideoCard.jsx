// @ts-nocheck
/**
 * VideoCard — full-screen feed player. Single active item, poster until first frame, HLS/MP4.
 */
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Play,
  Pause,
  Volume2,
  VolumeX,
  BadgeCheck,
  Music2,
  DollarSign,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getVideoPlaybackUrl, isValidThumbnailUrl, VIDEO_PLACEHOLDER_IMG } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/components/common/useTranslation";
import { api } from '@/api/expressClient';
import { toast } from 'sonner';
import Hls from 'hls.js';

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
  hideActions = false,
  preload = 'metadata',
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressBarRef = useRef(null);
  const previewVideoRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const lastPreviewTimeRef = useRef(-1);
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

  useEffect(() => {
    isMutedRef.current = !!isMuted;
  }, [isMuted]);

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iP(ad|hone|od)/i.test(navigator.userAgent || '');
  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const enablePreviewScrub = !isIOS && !isTouchDevice;
  
  // Synchroniser avec la prop isFollowing
  useEffect(() => {
    setFollowing(isFollowing || false);
  }, [isFollowing]);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

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
      const u = getVideoPlaybackUrl(raw) || '';
      if (!u || typeof u !== 'string' || u.trim() === '') return;
      if (!out.includes(u)) out.push(u);
    };

    if (slowConnection) {
      pushUrl(video.low_quality_url);
      pushUrl(video.video_url || video.hd_url);
      pushUrl(video.hd_url);
    } else {
      pushUrl(video.video_url || video.hd_url);
      pushUrl(video.hd_url);
      pushUrl(video.low_quality_url);
    }
    return out;
  }, [video.video_url, video.low_quality_url, video.hd_url, slowConnection]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const videoUrl = playbackUrls[sourceIndex] || '';
  const hasFallbackSource = sourceIndex < playbackUrls.length - 1;
  const moveToNextSource = useCallback(() => {
    setSourceIndex((prev) => Math.min(prev + 1, Math.max(0, playbackUrls.length - 1)));
  }, [playbackUrls.length]);

  useEffect(() => {
    setSourceIndex(0);
  }, [video.id, playbackUrls.join('|')]);

  useEffect(() => {
    setAutoplayMutedFallback(!!isMuted);
  }, [video.id, videoUrl, isMuted]);

  const isHls = useMemo(() => /\.m3u8(\?|$)/i.test(videoUrl || ''), [videoUrl]);

  // Source vidÃ©o : lecture directe uniquement pour Ã©viter les doubles tÃ©lÃ©chargements via proxy.
  const videoSrc = isHls ? undefined : videoUrl;
  
  const posterUrl = useMemo(
    () => (isValidThumbnailUrl(video.thumbnail_url, video.video_url) ? video.thumbnail_url : ''),
    [video.thumbnail_url, video.video_url]
  );

  const [loadError, setLoadError] = useState(false);
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

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
          if (part.type === 'hashtag') {
            return (
              <button
                key={index}
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
          return <span key={index}>{part.content}</span>;
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
    
    setLikeCount(video.likes || 0);
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
    
    // Pause + reset time uniquement (pas de load() â€” cause Ã©cran noir)
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [video.id, videoUrl]);
  
  // Handler pour le like avec mise Ã  jour optimiste du compteur et animation
  const handleLike = () => {
    const wasLiked = isLiked;
    
    // Animation seulement si on like (pas si on unlike)
    if (!wasLiked) {
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
    
    // Mise Ã  jour optimiste du compteur
    if (wasLiked) {
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setLikeCount(prev => prev + 1);
    }
    
    // Appeler le callback parent
    onLike();
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

  // HLS (.m3u8) â€” Netflix/TikTok : qualitÃ© adaptative, buffer intelligent, optimisÃ© Afrique
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl || !isHls) return;
    if (!isActive) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      el.pause();
      return;
    }

    if (Hls.isSupported()) {
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
      prepareForAutoplay(el, true);
      el.loop = true;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!el || !isActive || userPausedRef.current) return;
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
          if (hasFallbackSource) {
            moveToNextSource();
            return;
          }
          setLoadError(true);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = videoUrl;
      prepareForAutoplay(el, true);
      el.loop = true;
      const playOnce = () => {
        el.removeEventListener('loadeddata', playOnce);
        if (isActive && !userPausedRef.current) autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true });
      };
      el.addEventListener('loadeddata', playOnce);
      return () => {
        el.removeEventListener('loadeddata', playOnce);
        el.removeAttribute('src');
      };
    }

    
  }, [isActive, videoUrl, isHls, video.start_time, hasFallbackSource, moveToNextSource, prepareForAutoplay, autoplayWithPolicy]);

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

  // Watchdog autoplay: relances simples pour telephones/PWA stricts.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isActive || loadError || userPausedRef.current) return;

    const attemptAutoPlay = () => {
      if (!el || !isActive || loadError || userPausedRef.current) return;
      if (!el.paused) return;
      autoplayWithPolicy(el, { preferMuted: isMutedRef.current, allowMutedFallback: true });
    };

    const timers = [0, 150, 400, 800, 1500, 2500, 4000].map((delay) =>
      window.setTimeout(attemptAutoPlay, delay)
    );

    el.addEventListener('canplay', attemptAutoPlay);
    el.addEventListener('loadeddata', attemptAutoPlay);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      el.removeEventListener('canplay', attemptAutoPlay);
      el.removeEventListener('loadeddata', attemptAutoPlay);
    };
  }, [isActive, loadError, video.id, videoUrl, isMuted, autoplayWithPolicy]);


  /* ================= VIDEO =================
   * Une source de play (useEffect isActive). DÃ©marrage dÃ¨s readyState >= 2 (loadeddata). */

  const handlePlayPause = () => {
    if (!videoRef.current || loadError) return;

    const el = videoRef.current;
    setAutoplayMutedFallback(false);

    if (isPlaying) {
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

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    if (isDragging) return;

    if (video.end_time && video.end_time > 0 && videoRef.current.currentTime >= video.end_time) {
      videoRef.current.currentTime = video.start_time || 0;
    }

    const startTime = video.start_time || 0;
    const endTime = video.end_time || videoRef.current.duration;
    const safeRange = Math.max(0.001, endTime - startTime);
    const clampedTime = Math.max(startTime, Math.min(endTime, videoRef.current.currentTime));
    const pct = ((clampedTime - startTime) / safeRange) * 100;

    // Throttle setState pour limiter les re-renders (surtout mobile)
    const now = Date.now();
    if (now - lastTimeUpdateRef.current >= 250) {
      lastTimeUpdateRef.current = now;
      setProgress(pct);
      setCurrentTime(clampedTime);
    }

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

  // PrÃ©visualisation au survol/drag de la barre
  useEffect(() => {
    // Sur iOS / mobile, on dÃ©sactive la vidÃ©o cachÃ©e de prÃ©visualisation
    // pour Ã©viter les bugs "vidÃ©o indisponible" aprÃ¨s la premiÃ¨re lecture.
    if (!enablePreviewScrub) return;
    if (!isDragging || !previewVideoRef.current || !previewCanvasRef.current || !videoUrl) return;
    const prev = previewVideoRef.current;
    const canvas = previewCanvasRef.current;
    const targetTime = currentTime;
    lastPreviewTimeRef.current = targetTime;
    prev.currentTime = targetTime;
  }, [isDragging, currentTime, videoUrl]);

  /** Dessine une frame vidÃ©o dans le canvas de prÃ©visualisation (desktop: vidÃ©o cachÃ©e, mobile: vidÃ©o principale) */
  const drawVideoFrameToCanvas = (videoEl, canvasEl) => {
    if (!videoEl || !canvasEl || videoEl.readyState < 2) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const tw = videoEl.videoWidth;
    const th = videoEl.videoHeight;
    if (!tw || !th) return;
    const cw = 90;
    const ch = 160;
    canvasEl.width = cw;
    canvasEl.height = ch;
    const videoRatio = tw / th;
    const canvasRatio = cw / ch;
    let sx, sy, sw, sh;
    if (videoRatio > canvasRatio) {
      sh = th;
      sw = th * canvasRatio;
      sx = (tw - sw) / 2;
      sy = 0;
    } else {
      sw = tw;
      sh = tw / canvasRatio;
      sx = 0;
      sy = (th - sh) / 2;
    }
    try {
      ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, cw, ch);
    } catch (_e) {
      // CORS ou vidÃ©o cross-origin peut bloquer drawImage
    }
  };

  const handlePreviewSeeked = () => {
    const prev = previewVideoRef.current;
    const canvas = previewCanvasRef.current;
    if (prev && canvas) drawVideoFrameToCanvas(prev, canvas);
  };

  /** Sur mobile: quand la vidÃ©o principale a seeked pendant le drag, on dessine la frame dans la carte */
  const handleMainVideoSeeked = () => {
    if (!enablePreviewScrub && isDragging && videoRef.current && previewCanvasRef.current) {
      drawVideoFrameToCanvas(videoRef.current, previewCanvasRef.current);
    }
  };

  const handleSeek = (clientX) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const dur = videoRef.current.duration;
    if (!dur || !isFinite(dur) || dur <= 0) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    
    const startTime = video.start_time || 0;
    const endTime = video.end_time || dur;
    
    // Calculer le nouveau temps dans la plage disponible.
    const newTime = startTime + (percentage * (endTime - startTime));

    videoRef.current.currentTime = newTime;
    setProgress(percentage * 100);
    setCurrentTime(newTime);
  };

  const removeDragListenersRef = useRef(null);

  const attachDragListeners = () => {
    if (removeDragListenersRef.current) return;

    const handleMouseMove = (e) => {
      handleSeek(e.clientX);
    };

    const handleMouseUp = () => {
      removeDragListenersRef.current?.();
      removeDragListenersRef.current = null;
      setIsDragging(false);
    };

    const handleTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      handleSeek(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
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

  const scheduleMobilePreviewDraw = () => {
    if (enablePreviewScrub) return;
    requestAnimationFrame(() => {
      if (videoRef.current && previewCanvasRef.current) {
        drawVideoFrameToCanvas(videoRef.current, previewCanvasRef.current);
      }
    });
  };

  const handleProgressMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e.clientX);
    attachDragListeners();
    scheduleMobilePreviewDraw();
  };

  const handleProgressTouchStart = (e) => {
    e.stopPropagation();
    if (!e.touches || e.touches.length === 0) return;
    setIsDragging(true);
    handleSeek(e.touches[0].clientX);
    attachDragListeners();
    scheduleMobilePreviewDraw();
  };

  const handleProgressClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) return;
    handleSeek(e.clientX);
  };

  const handleMuteToggleClick = () => {
    const el = videoRef.current;
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

  return (
    <div 
      className="relative w-full h-[100dvh] bg-black overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="absolute inset-0 overflow-hidden">
      {/* ================= VIDEO ================= */}
      {videoUrl ? (
      <video
        key={`${video.id}-${videoUrl}`}
        ref={videoRef}
        data-afw-feed-video="1"
        src={videoSrc}
        poster={posterUrl || undefined}
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        preload={isActive ? 'auto' : 'metadata'}
        loop
        playsInline
        muted={isMuted}
        onClick={handlePlayPause}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onLoadStart={() => { setIsReadyToPlay(false); setLoadError(false); }}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
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
          
          // Log dÃ©taillÃ© en dÃ©veloppement
          if (process.env.NODE_ENV === 'development') {
            console.warn('Erreur de chargement vidÃ©o:', {
              videoId: video.id,
              videoUrl: video.video_url,
              errorCode,
              errorMessage,
              readyState: videoElement.readyState,
              networkState: videoElement.networkState,
            });
          }
          
          // Afficher l'erreur aprÃ¨s dÃ©lai (pas de load() â€” Ã©vite Ã©cran noir)
          setTimeout(() => {
            if (videoElement && videoElement.error && isActive) {
              setLoadError(true);
            }
          }, 2000);
        }}
        onLoadedData={() => {
          setLoadError(false);
          setIsReadyToPlay(true);
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
                  video.filter === 'SÃ©pia' ? 'sepia(100%)' :
                  video.filter === 'Vibrant' ? 'saturate(200%)' :
                  video.filter === 'FoncÃ©' ? 'brightness(0.75)' :
                  video.filter === 'Lumineux' ? 'brightness(1.25)' : 'none'
        }}
      />
      ) : (
        // Si pas d'URL valide, afficher l'erreur directement
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[50] p-4">
          {(posterUrl || VIDEO_PLACEHOLDER_IMG) ? (
            <img
              src={posterUrl || VIDEO_PLACEHOLDER_IMG}
              alt=""
              className="max-w-full max-h-[50%] object-contain rounded-lg opacity-80"
            />
          ) : null}
          <p className="text-white text-center mt-4 font-medium ios-text-render">VidÃ©o indisponible</p>
          <p className="text-white/70 text-sm text-center mt-1 ios-text-render">URL de vidÃ©o invalide</p>
        </div>
      )}
      {videoUrl && enablePreviewScrub && (
        <video
          ref={previewVideoRef}
          src={videoUrl}
          muted
          preload="metadata"
          playsInline
          onSeeked={handlePreviewSeeked}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          aria-hidden
        />
      )}
      </div>

      {/* Pas d'indicateur de buffer - lecture fluide comme TikTok */}

      {/* ================= ERREUR DE CHARGEMENT ================= */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[50] p-4">
          {(posterUrl || VIDEO_PLACEHOLDER_IMG) ? (
            <img
              src={posterUrl || VIDEO_PLACEHOLDER_IMG}
              alt=""
              className="max-w-full max-h-[50%] object-contain rounded-lg opacity-80"
            />
          ) : null}
          <p className="text-white text-center mt-4 font-medium ios-text-render">VidÃ©o indisponible</p>
          <p className="text-white/70 text-sm text-center mt-1 ios-text-render">Impossible de charger la vidÃ©o</p>
          <button
            type="button"
            onClick={handleRetryLoad}
            className="mt-4 px-6 py-2.5 bg-white text-black rounded-full font-semibold hover:bg-gray-200 active:scale-95 transition-transform ios-text-render"
          >
            RÃ©essayer
          </button>
        </div>
      )}

      {/* ================= GRADIENT ================= */}
      <div
        className="
          absolute inset-x-0 bottom-0 h-[420px]
          bg-gradient-to-t
          from-black/75
          via-black/40
          to-transparent
          pointer-events-none
          z-[20]
        "
        style={{ touchAction: 'pan-y' }}
      />

      {/* ================= PLAY / PAUSE ================= */}
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

      {/* ================= BARRE DE PROGRESSION ================= */}
      <div className={cn(
        "absolute left-0 right-0 bottom-[100px] px-3 z-[95] transition-opacity duration-300",
        hideActions ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-medium min-w-[35px]">
            {formatTime(currentTime)}
          </span>
          <div 
            ref={progressBarRef}
            className={cn(
              "flex-1 h-12 relative select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={handleProgressMouseDown}
            onTouchStart={handleProgressTouchStart}
            onClick={handleProgressClick}
          >
            {/* PrÃ©visualisation au survol/drag (style YouTube) â€” desktop: vidÃ©o cachÃ©e remplit le canvas ; mobile: vidÃ©o principale onSeeked remplit le canvas */}
            {isDragging && (
              <div
                className="absolute bottom-full left-0 mb-2 pointer-events-none"
                style={{
                  left: `${progress}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="bg-black/95 rounded-lg overflow-hidden shadow-xl border border-white/20">
                  <div
                    className="w-[90px] h-40 relative bg-black"
                    style={(posterUrl || VIDEO_PLACEHOLDER_IMG) ? { backgroundImage: `url(${posterUrl || VIDEO_PLACEHOLDER_IMG})`, backgroundSize: 'cover' } : undefined}
                  >
                    <canvas
                      ref={previewCanvasRef}
                      width={90}
                      height={160}
                      className="block w-[90px] h-40 object-cover absolute inset-0"
                    />
                  </div>
                  <div className="px-2 py-1.5 text-center">
                    <span className="text-white text-sm font-semibold">
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Barre de fond */}
            <div className="absolute inset-0 flex items-center">
              <div className="absolute left-0 right-0 h-1 bg-white/30 rounded-full overflow-hidden">
                {/* Barre de progression */}
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {/* Curseur draggable */}
            <div 
              className="absolute top-1/2 pointer-events-none"
              style={{ 
                left: `${progress}%`, 
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div 
                className={cn(
                  "w-3 h-3 bg-white rounded-full shadow-lg transition-transform duration-150",
                  isDragging ? "scale-[1.8]" : "scale-100"
                )} 
              />
            </div>
          </div>
          <span className="text-white text-xs font-medium min-w-[35px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

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
          <button onClick={handleLike} className="flex items-center justify-center w-7 h-7 relative z-10">
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
                  isLiked ? "text-red-500 fill-red-500" : "text-white"
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
                    key={i}
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
          <button onClick={onShare} className="flex items-center justify-center w-8 h-8">
            <Share2 className="w-7 h-7 text-white" />
          </button>
          <span className="text-white text-[11px] font-medium leading-tight min-h-[14px] flex items-center justify-center">
            Partager
          </span>
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
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
          <span className="text-white text-xs font-semibold leading-tight min-h-[16px]"></span>
        </div>

        {onTip && (
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTip();
              }}
              className="flex items-center justify-center w-7 h-7 touch-manipulation"
            >
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </button>
            <span className="text-white text-xs font-semibold leading-tight min-h-[16px]"></span>
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
              key={index}
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

      {/* ================= INFOS BAS ================= */}
      <div 
        className={cn(
          "absolute left-0 right-20 bottom-24 px-4 pb-20 z-[90] transition-opacity duration-300",
          hideActions ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-center gap-2 mb-2">
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


