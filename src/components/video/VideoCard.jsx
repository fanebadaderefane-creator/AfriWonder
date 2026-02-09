// @ts-nocheck
import React, { useState, useRef, useEffect, memo } from 'react';
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
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/components/common/useTranslation";
import { api } from '@/api/expressClient';
import { toast } from 'sonner';

// Fonction pour extraire les hashtags de la description
const extractHashtags = (description) => {
  if (!description) return [];
  // Extraire les hashtags du format #tag1 #tag2
  const hashtagMatches = description.match(/#[\w]+/g);
  if (!hashtagMatches) return [];
  // Retourner les tags sans le #
  return hashtagMatches.map(tag => tag.substring(1));
};

// Fonction pour extraire la musique de la description
const extractMusicTitle = (description) => {
  if (!description) return null;
  // Chercher le pattern "🎵 Musique: ..."
  const musicMatch = description.match(/🎵 Musique:\s*(.+?)(?:\n|$)/);
  return musicMatch ? musicMatch[1].trim() : null;
};

// Fonction pour nettoyer la description (sans hashtags et musique)
const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/\n\n#[\w\s#]+/g, '') // Retirer les hashtags
    .replace(/\n\n🎵 Musique:.*/g, '') // Retirer le texte de musique
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
  hideActions = false
}) {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  
  // Extraire les hashtags et la musique de la description si les champs n'existent pas
  const hashtags = video.hashtags || extractHashtags(video.description || '');
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
  
  // Synchroniser avec la prop isFollowing
  useEffect(() => {
    setFollowing(isFollowing || false);
  }, [isFollowing]);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const { t } = useTranslation();
  
  // Combiner titre et description comme TikTok
  const fullText = [video.title, displayDescription].filter(Boolean).join(' ');
  const MAX_DESCRIPTION_LENGTH = 100;
  const isDescriptionLong = fullText.length > MAX_DESCRIPTION_LENGTH;
  const displayText = showFullDescription || !isDescriptionLong 
    ? fullText 
    : fullText.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
  
  // Fonction pour rendre le texte avec hashtags cliquables (style TikTok)
  const renderTextWithHashtags = (text) => {
    if (!text) return null;
    
    // Séparer le texte en parties : texte normal et hashtags
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
                className="text-white font-bold hover:text-orange-400 transition-colors"
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
  
  // Mettre à jour le compteur quand la vidéo change
  useEffect(() => {
    setLikeCount(video.likes || 0);
    // Réinitialiser l'état de la description quand la vidéo change
    setShowFullDescription(false);
  }, [video.likes, video.id]);
  
  // Handler pour le like avec mise à jour optimiste du compteur et animation
  const handleLike = () => {
    const wasLiked = isLiked;
    
    // Animation seulement si on like (pas si on unlike)
    if (!wasLiked) {
      setIsAnimating(true);
      setShowParticles(true);
      
      // Réinitialiser l'animation après 600ms
      setTimeout(() => {
        setIsAnimating(false);
      }, 600);
      
      // Réinitialiser les particules après 800ms
      setTimeout(() => {
        setShowParticles(false);
      }, 800);
    }
    
    // Mise à jour optimiste du compteur
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

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      // Apply start time if video has been cut
      if (video.start_time && video.start_time > 0) {
        videoRef.current.currentTime = video.start_time;
      }
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, video.start_time]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  /* ================= VIDEO ================= */

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }

    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;

    // Handle end_time for cut videos
    if (video.end_time && video.end_time > 0 && videoRef.current.currentTime >= video.end_time) {
      videoRef.current.currentTime = video.start_time || 0;
    }

    setProgress(
      (videoRef.current.currentTime / videoRef.current.duration) * 100
    );
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    if (!videoRef.current || !videoRef.current.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newTime = (percentage / 100) * videoRef.current.duration;

    videoRef.current.currentTime = newTime;
    setProgress(percentage);
  };

  const handleProgressDrag = (e) => {
    if (!isDragging || !videoRef.current || !videoRef.current.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTime = (percentage / 100) * videoRef.current.duration;

    videoRef.current.currentTime = newTime;
    setProgress(percentage);
  };

  const handleProgressTouchMove = (e) => {
    if (!isDragging || !videoRef.current || !videoRef.current.duration) return;

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTime = (percentage / 100) * videoRef.current.duration;

    videoRef.current.currentTime = newTime;
    setProgress(percentage);
  };

  /* ================= RENDER ================= */

  return (
    <div className="relative w-screen h-screen bg-black" style={{ width: '100vw', height: '100vh' }}>

      {/* ================= VIDEO ================= */}
      <video
        ref={videoRef}
        src={video.video_url || ''}
        poster={video.thumbnail_url || ''}
        className="absolute inset-0 w-full h-full object-cover"
        preload="metadata"
        loop
        playsInline
        muted={isMuted}
        onClick={handlePlayPause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={(e) => {
          // Ne pas déclencher de refetch ou re-render
          // Juste logger l'erreur silencieusement
          const videoElement = e.target;
          const errorCode = videoElement.error?.code;
          const errorMessage = videoElement.error?.message;
          
          console.error('Erreur de chargement vidéo:', {
            videoId: video.id,
            videoUrl: video.video_url,
            errorCode,
            errorMessage,
            // Ne pas inclure l'élément vidéo complet pour éviter les références circulaires
          });
          
          // Empêcher le navigateur de réessayer automatiquement
          if (videoElement) {
            videoElement.removeAttribute('src');
            videoElement.load();
          }
        }}
        onLoadStart={() => {
          // Log silencieux pour debug uniquement
          if (process.env.NODE_ENV === 'development') {
            console.log('Début du chargement vidéo:', {
              videoId: video.id,
              videoUrl: video.video_url
            });
          }
        }}
        style={{ 
          objectFit: 'cover', 
          width: '100%', 
          height: '100%',
          filter: video.filter === 'Normal' || !video.filter ? 'none' :
                  video.filter === 'Noir & Blanc' ? 'grayscale(100%)' :
                  video.filter === 'Sépia' ? 'sepia(100%)' :
                  video.filter === 'Vibrant' ? 'saturate(200%)' :
                  video.filter === 'Foncé' ? 'brightness(0.75)' :
                  video.filter === 'Lumineux' ? 'brightness(1.25)' : 'none'
        }}
      />

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
            <div className="bg-black/40 p-6 rounded-full">
              {isPlaying ? (
                <Pause className="w-12 h-12 text-white fill-white" />
              ) : (
                <Play className="w-12 h-12 text-white fill-white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= BARRE DE PROGRESSION ================= */}
      <div className={cn(
        "absolute left-0 right-0 bottom-[100px] px-3 z-[90] transition-opacity duration-300",
        hideActions ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-medium min-w-[35px]">
            {formatTime(currentTime)}
          </span>
          <div 
            className="flex-1 h-1 bg-white/30 rounded-full relative cursor-pointer"
            onClick={handleProgressClick}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={handleProgressDrag}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            onTouchMove={handleProgressTouchMove}
          >
            <div
              className="h-full bg-white rounded-full transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
          <span className="text-white text-xs font-medium min-w-[35px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* ================= ACTIONS DROITE ================= */}
      <div className={cn(
        "absolute right-3 bottom-28 flex flex-col items-center gap-2.5 z-[90] transition-opacity duration-300",
        hideActions ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="flex flex-col items-center">
          <button onClick={() => onProfileClick(video.creator_id)}>
            <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
              <AvatarImage 
                src={video.creator_avatar || video.creator?.profile_image} 
                alt={video.creator_name}
                onError={(e) => {
                  // Si l'image ne charge pas, le fallback s'affichera automatiquement
                  e.target.style.display = 'none';
                }}
              />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold">
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
          
          {/* Particules animées */}
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
            {likeCount > 0 ? (likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount.toLocaleString()) : ''}
          </motion.span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <button onClick={onComment} className="flex items-center justify-center w-7 h-7">
            <MessageCircle className="w-7 h-7 text-white" />
          </button>
          <span className="text-white text-xs font-semibold leading-tight min-h-[16px] flex items-center justify-center">
            {(video.comments_count || 0) > 0 ? ((video.comments_count || 0) >= 1000 ? `${((video.comments_count || 0) / 1000).toFixed(1)}K` : (video.comments_count || 0).toLocaleString()) : ''}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <button onClick={onShare} className="flex items-center justify-center w-7 h-7">
            <Share2 className="w-7 h-7 text-white" />
          </button>
          <span className="text-white text-xs font-semibold leading-tight min-h-[16px] flex items-center justify-center">
            {(video.shares || 0) > 0 ? ((video.shares || 0) >= 1000 ? `${((video.shares || 0) / 1000).toFixed(1)}K` : (video.shares || 0).toLocaleString()) : ''}
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
          <button onClick={onMuteToggle} className="flex items-center justify-center w-7 h-7">
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
            <button onClick={onTip} className="flex items-center justify-center w-7 h-7">
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
      <div className={cn(
        "absolute left-0 right-20 bottom-24 px-4 pb-20 z-[90] transition-opacity duration-300",
        hideActions ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
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
                  Suivi
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3 inline mr-1" />
                  Suivre
                </>
              )}
            </button>
          )}
        </div>

        {/* Description avec hashtags intégrés (style TikTok) */}
        {fullText && (
          <div className="mb-2">
            <p className="text-white text-sm leading-relaxed break-words">
              {showFullDescription || !isDescriptionLong ? (
                renderTextWithHashtags(fullText)
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
          </div>
        )}

        {/* Hashtags supplémentaires si pas dans le texte */}
        {hashtags.length > 0 && fullText && !fullText.match(/#\w+/g) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {hashtags.slice(0, 3).map((tag, index) => (
              <button
                key={`${tag}-${index}`}
                onClick={() =>
                  navigate(createPageUrl('Search') + `?q=${encodeURIComponent(tag)}`)
                }
                className="text-white font-bold hover:text-orange-400 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {musicTitle && (
          <button
            onClick={() =>
              navigate(createPageUrl('Create') + `?music=${encodeURIComponent(musicTitle)}`)
            }
            className="flex items-center gap-2 bg-white/15 px-3 py-2 rounded-full w-fit mb-2 hover:bg-white/25 transition-colors cursor-pointer"
          >
            <Music2 className="w-4 h-4 text-white" />
            <span className="text-white text-sm">
              {musicTitle}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(VideoCardContent);
