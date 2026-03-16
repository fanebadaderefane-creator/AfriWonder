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

  return (
    <div className="bg-white">
      {/* Bannière de profil (CPO 1.6) — image ou gradient ; clic = upload si propre profil */}
      <div
        className={cn(
          'h-24 relative bg-cover bg-center',
          !coverUrl && 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600'
        )}
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
      >
        {isOwnProfile && (
          <button
            type="button"
            onClick={handleCoverClick}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-b-lg"
            aria-label="Changer la bannière"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar */}
        <div className="relative -mt-12 mb-3">
          <button onClick={handleAvatarClick} className={isOwnProfile ? 'cursor-pointer' : ''}>
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={user?.avatar || user?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl">
                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {user?.is_verified && (
            <div className="absolute bottom-1 right-0 bg-blue-500 rounded-full p-1">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Name & Username */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {user?.full_name || 'Utilisateur'}
              </h1>
              {user?.is_verified && (
                <BadgeCheck className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <p className="text-gray-500 text-sm">@{user?.username || user?.email?.split('@')[0]}</p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Lien du profil copié !');
            }}
            className="text-gray-400"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Bio */}
        {user?.bio && (
          <p className="text-gray-700 text-sm mb-3 whitespace-pre-line">
            {user.bio}
          </p>
        )}

        {/* Location & Link */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
          {user?.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {user.location}
            </span>
          )}
          {user?.website && (
            <a 
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <LinkIcon className="w-4 h-4" />
              {user.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onFollowingClick} className="text-center hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors">
            <span className="block text-lg font-bold text-gray-900">{formatCount(stats.following)}</span>
            <span className="text-xs text-gray-500">Dans leur Wonder</span>
          </button>
          <button onClick={onFollowersClick} className="text-center hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors">
            <span className="block text-lg font-bold text-gray-900">{formatCount(stats.wonderers ?? stats.followers)}</span>
            <span className="text-xs text-gray-500">Wonderers</span>
          </button>
          <button onClick={onStatsClick} className="text-center hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors">
            <span className="block text-lg font-bold text-gray-900">{formatCount(stats.likes)}</span>
            <span className="text-xs text-gray-500">J'aime</span>
          </button>
          <div className="text-center px-2 py-2">
            <span className="block text-lg font-bold text-gray-900">{formatCount(stats.videos || 0)}</span>
            <span className="text-xs text-gray-500">Vidéos</span>
          </div>
        </div>

        {/* Badges */}
        {user?.badges?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {user.badges.map((badge, i) => (
              <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-600 border-blue-200">
                {badge}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isOwnProfile ? (
            <>
              <Button
                onClick={onEdit}
                variant="outline"
                className="flex-1 rounded-xl border-gray-200"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Modifier profil
              </Button>
              <Button
                onClick={onSubscriptionTiers}
                variant="outline"
                className="rounded-xl border-blue-200 text-blue-600"
              >
                <Crown className="w-4 h-4" />
              </Button>
              <Button
                onClick={onWallet}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Wallet className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onFollow}
                className={cn(
                  "flex-1 rounded-xl transition-all",
                  isFollowing 
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-blue-200" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-blue-500/30"
                )}
              >
                {isFollowing ? 'Dans son Wonder' : 'Wonder'}
              </Button>
              <Button
                onClick={onMessage}
                variant="outline"
                className="flex-1 rounded-xl border-gray-200"
              >
                Message
              </Button>
              {(onAddCloseFriend || onRemoveCloseFriend) && (
                <Button
                  onClick={isCloseFriend ? onRemoveCloseFriend : onAddCloseFriend}
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-gray-200"
                  aria-label={isCloseFriend ? 'Retirer des proches' : 'Ajouter aux proches'}
                  title={isCloseFriend ? 'Retirer des proches' : 'Ajouter aux proches'}
                >
                  {isCloseFriend ? <UserMinus className="w-5 h-5 text-gray-600" /> : <UserPlus className="w-5 h-5 text-gray-600" />}
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl border-gray-200"
              >
                <ShoppingBag className="w-5 h-5 text-gray-600" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


