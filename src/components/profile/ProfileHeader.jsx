import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Settings, Share2, MapPin, Link as LinkIcon, Edit2, ShoppingBag, Wallet, Crown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { api } from '@/api/expressClient';
import { toast } from "sonner";
import { useQueryClient } from '@tanstack/react-query';

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
  onSubscriptionTiers
}) {
  const queryClient = useQueryClient();
  
  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const handleAvatarClick = () => {
    if (isOwnProfile) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
          const { file_url } = await api.upload.video({ file });
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
      {/* Cover gradient */}
      <div className="h-24 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 relative">
        {isOwnProfile && (
          <div className="absolute top-3 right-3 flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onSettings}
              className="bg-white/20 text-white hover:bg-white/30 backdrop-blur"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar */}
        <div className="relative -mt-12 mb-3">
          <button onClick={handleAvatarClick} className={isOwnProfile ? 'cursor-pointer' : ''}>
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={user?.avatar || user?.profile_image} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-2xl">
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
              className="flex items-center gap-1 text-orange-500 hover:underline"
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
            <span className="text-xs text-gray-500">Abonnements</span>
          </button>
          <button onClick={onFollowersClick} className="text-center hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors">
            <span className="block text-lg font-bold text-gray-900">{formatCount(stats.followers)}</span>
            <span className="text-xs text-gray-500">Abonnés</span>
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
              <Badge key={i} variant="secondary" className="bg-orange-50 text-orange-600 border-orange-200">
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
                className="rounded-xl border-orange-200 text-orange-600"
              >
                <Crown className="w-4 h-4" />
              </Button>
              <Button
                onClick={onWallet}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
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
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                    : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                )}
              >
                {isFollowing ? 'Abonné' : "S'abonner"}
              </Button>
              <Button
                onClick={onMessage}
                variant="outline"
                className="flex-1 rounded-xl border-gray-200"
              >
                Message
              </Button>
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


