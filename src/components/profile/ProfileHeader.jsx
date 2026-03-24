import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Share2, MapPin, Link as LinkIcon, Edit2, ShoppingBag, Wallet, Crown, Camera, UserPlus, UserMinus } from 'lucide-react';
import { cn } from "@/lib/utils";
import { api } from '@/api/expressClient';
import { toast } from "sonner";
import { useQueryClient } from '@tanstack/react-query';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';

export default function ProfileHeader({ 
  user, 
  isOwnProfile = false,
  isFollowing = false,
  stats = { followers: 0, following: 0, likes: 0, videos: 0 },
  onFollow,
  onMessage,
  onEdit,
  onSettings,
  _onShare,
  onWallet,
  onStatsClick,
  onFollowersClick,
  onFollowingClick,
  onSubscriptionTiers,
  isCloseFriend = false,
  onAddCloseFriend,
  onRemoveCloseFriend,
}) {
  const queryClient = useQueryClient();
  
  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const coverUrl = user?.profile_cover_url;
  const handleCoverClick = () => {
    if (!isOwnProfile) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = FILE_ACCEPT_IMAGES;
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const result = await api.upload.image(file);
        const file_url = result?.file_url || result?.data?.file_url;
        if (!file_url) throw new Error('Pas d\'URL reçue');
        await api.auth.updateMe({ profile_cover_url: file_url });
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        queryClient.invalidateQueries({ queryKey: ['profile-videos'] });
        window.location.reload();
      } catch (_err) {
        console.error('Upload cover error', _err);
      }
    };
    input.click();
  };

  const handleAvatarClick = () => {
    if (isOwnProfile) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = FILE_ACCEPT_IMAGES;
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
          const result = await api.upload.image(file);
          const file_url = result?.file_url || result?.data?.file_url;
          if (!file_url) throw new Error('Pas d\'URL reçue');
          await api.auth.updateMe({ profile_image: file_url });
          
          // Invalider le cache des vidéos pour recharger avec la nouvelle photo
          queryClient.invalidateQueries({ queryKey: ['videos'] });
          queryClient.invalidateQueries({ queryKey: ['profile-videos'] });
          
          window.location.reload();
        } catch (_error) {
          console.error('Upload avatar error:', _error);
        }
      };
      input.click();
    }
  };

  const _handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
  };

  const primaryActionClass =
    'h-11 rounded-2xl bg-white text-slate-950 shadow-[0_14px_28px_rgba(255,255,255,0.12)] hover:bg-white/92';

  const secondaryActionClass =
    'h-11 rounded-2xl border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]';

  const statItems = [
    {
      key: 'following',
      label: 'Wonder',
      value: formatCount(stats.following),
      onClick: onFollowingClick,
    },
    {
      key: 'followers',
      label: 'Wonderers',
      value: formatCount(stats.wonderers ?? stats.followers),
      onClick: onFollowersClick,
    },
    {
      key: 'likes',
      label: 'J\'aime',
      value: formatCount(stats.likes),
      onClick: onStatsClick,
    },
    {
      key: 'videos',
      label: 'Videos',
      value: formatCount(stats.videos || 0),
      onClick: undefined,
    },
  ];

  return (
    <div className="relative overflow-hidden bg-[#060913] text-white">
      <div
        className={cn(
          'relative h-[172px] bg-cover bg-center',
          !coverUrl && 'bg-[linear-gradient(135deg,#0f2747_0%,#143155_38%,#1a3b60_100%)]'
        )}
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        aria-label={isOwnProfile ? 'Bannière de profil' : undefined}
        role={isOwnProfile ? 'img' : undefined}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,20,0.10)_0%,rgba(4,10,20,0.38)_54%,rgba(4,10,20,0.88)_100%)]" />
        {isOwnProfile && (
          <button
            type="button"
            onClick={handleCoverClick}
            className="absolute inset-0 flex items-center justify-center bg-black/18 opacity-0 transition-opacity hover:opacity-100"
            aria-label="Changer la bannière"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
              <Camera className="h-4 w-4" />
              Changer la bannière
            </span>
          </button>
        )}
      </div>

      <div className="relative mx-auto -mt-16 max-w-5xl px-4 pb-6">
        <div className="overflow-hidden rounded-[32px] border border-white/8 bg-[#0b111d]/92 shadow-[0_24px_80px_rgba(2,6,23,0.34)] backdrop-blur-2xl">
        <div className="px-5 pb-6 pt-5 sm:px-6">
        <div className="mb-5 flex items-start justify-between gap-4">
        <div className="relative">
          <button
            onClick={handleAvatarClick}
            className={isOwnProfile ? 'cursor-pointer' : ''}
            aria-label={isOwnProfile ? 'Changer la photo de profil' : 'Photo de profil'}
          >
            <Avatar className="h-24 w-24 border-4 border-[#0b111d] shadow-[0_18px_44px_rgba(2,6,23,0.3)] sm:h-28 sm:w-28">
              <AvatarImage
                src={user?.avatar || user?.profile_image}
                alt={user?.full_name || user?.username || 'Photo de profil'}
                loading="lazy"
                decoding="async"
              />
              <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-2xl text-white">
                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {user?.is_verified && (
            <div className="absolute bottom-1 right-0 rounded-full border border-white/16 bg-[#1d8bff] p-1 shadow-lg">
              <BadgeCheck className="h-4 w-4 text-white" />
            </div>
          )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-[28px] font-semibold tracking-[-0.04em] text-white">
                    {user?.full_name || 'Utilisateur'}
                  </h1>
                  {user?.is_verified && (
                    <BadgeCheck className="h-5 w-5 shrink-0 text-[#4da3ff]" />
                  )}
                </div>
                <p className="mt-1 text-[14px] text-white/54">@{user?.username || user?.email?.split('@')[0]}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Lien du profil copié !');
                }}
                className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white/72 hover:bg-white/[0.08] hover:text-white"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {user?.bio && (
              <p className="max-w-2xl whitespace-pre-line text-[15px] leading-6 text-white/82">
                {user.bio}
              </p>
            )}

            {(user?.location || user?.website) && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/58">
                {user?.location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    <MapPin className="h-4 w-4" />
                    {user.location}
                  </span>
                )}
                {user?.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-white/78 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 border-y border-white/8 py-4">
          {statItems.map((item) => {
            const Comp = item.onClick ? 'button' : 'div';
            return (
              <Comp
                key={item.key}
                onClick={item.onClick}
                className={cn(
                  'rounded-2xl px-3 py-3 text-left transition-colors',
                  item.onClick ? 'hover:bg-white/[0.04]' : ''
                )}
              >
                <span className="block text-[20px] font-semibold tracking-[-0.03em] text-white">{item.value}</span>
                <span className="mt-1 block text-[12px] text-white/48">{item.label}</span>
              </Comp>
            );
          })}
        </div>

        {user?.badges?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {user.badges.map((badge, i) => (
              <Badge key={i} variant="secondary" className="border border-white/10 bg-white/[0.04] text-white/78">
                {badge}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {isOwnProfile ? (
            <>
              <Button
                onClick={onEdit}
                variant="outline"
                className={cn('min-w-[180px] flex-1', secondaryActionClass)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Modifier profil
              </Button>
              <Button
                onClick={onSubscriptionTiers}
                variant="outline"
                className={secondaryActionClass}
              >
                <Crown className="w-4 h-4" />
              </Button>
              <Button
                onClick={onWallet}
                className={primaryActionClass}
              >
                <Wallet className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onFollow}
                className={cn(
                  "min-w-[140px] flex-1 rounded-2xl transition-all h-11",
                  isFollowing 
                    ? secondaryActionClass
                    : primaryActionClass
                )}
              >
                {isFollowing ? 'Dans son Wonder' : 'Wonder'}
              </Button>
              <Button
                onClick={onMessage}
                variant="outline"
                className={cn('min-w-[140px] flex-1', secondaryActionClass)}
              >
                Message
              </Button>
              {(onAddCloseFriend || onRemoveCloseFriend) && (
                <Button
                  onClick={isCloseFriend ? onRemoveCloseFriend : onAddCloseFriend}
                  variant="outline"
                  size="icon"
                  className={secondaryActionClass}
                  aria-label={isCloseFriend ? 'Retirer des proches' : 'Ajouter aux proches'}
                  title={isCloseFriend ? 'Retirer des proches' : 'Ajouter aux proches'}
                >
                  {isCloseFriend ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className={secondaryActionClass}
              >
                <ShoppingBag className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}


