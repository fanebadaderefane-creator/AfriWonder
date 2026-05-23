import React from 'react';
import AdBannerCard from '@/components/video/AdBannerCard';

export default function FeedTopBannerRail({
  items,
  hideActions,
  onHide,
}) {
  if (!items?.length) return null;

  return (
    <div className="absolute left-0 right-0 top-[74px] z-40 flex gap-2 overflow-x-auto overflow-y-hidden px-3 pt-3 pb-1 no-scrollbar snap-x snap-mandatory pointer-events-auto">
      {items.map((item, index) => (
        <div
          key={`top-${item.ad?.campaign_id || index}`}
          className="w-[85%] max-w-[320px] shrink-0"
        >
          <AdBannerCard
            ad={item.ad}
            isActive
            onHide={onHide}
            hideActions={hideActions}
          />
        </div>
      ))}
    </div>
  );
}
