import React from 'react';
import ChevronRight from 'lucide-react/icons/chevron-right';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function FeedFollowingStrip({
  creators,
  countLabel,
  getAvatarInitials,
  onCreatorClick,
  onSeeAll,
}) {
  if (!creators?.length) return null;

  return (
    <div className="absolute left-0 right-0 top-[74px] z-40 px-3 pt-3 pointer-events-auto">
      <div className="rounded-[24px] border border-white/10 bg-black/26 px-3 py-3 shadow-[0_16px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[-0.01em] text-white">Ton Wonder</p>
            <p className="text-xs text-white/65">{countLabel}</p>
          </div>

          <button
            type="button"
            onClick={onSeeAll}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/82 transition-colors duration-200 hover:bg-white/12 hover:text-white"
            aria-label="Voir tous les createurs de ton Wonder"
          >
            Tout voir
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {creators.map((creator) => (
            <button
              key={creator.id}
              type="button"
              onClick={() => onCreatorClick(creator.id)}
              className="shrink-0 rounded-full transition-transform duration-200 active:scale-95"
              title={creator.full_name || creator.username}
            >
              <Avatar className="h-11 w-11 border border-white/25 shadow-lg">
                <AvatarImage
                  src={creator.profile_image}
                  alt={creator.full_name || creator.username || 'wonderer'}
                />
                <AvatarFallback className="bg-white/18 text-xs font-semibold text-white">
                  {getAvatarInitials(creator)}
                </AvatarFallback>
              </Avatar>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
