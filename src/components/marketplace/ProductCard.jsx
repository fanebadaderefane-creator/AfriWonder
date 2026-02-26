import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MapPin, Star, BadgeCheck, Play, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, getAbsoluteImageUrl, MARKETPLACE_PLACEHOLDER_IMG } from "@/lib/utils";
import { useMarketplaceCurrency } from '@/contexts/MarketplaceCurrencyContext';
import { useNavigate } from 'react-router-dom';

const paymentIcons = {
  orange_money: '🟠',
  wave: '🔵',
  mtn_money: '🟡',
  moov_money: '🟣',
  cash: '💵',
  wallet: '💰'
};

export default function ProductCard({ 
  product, 
  onPress, 
  onLike,
  isLiked = false 
}) {
  const navigate = useNavigate();
  const { formatPrice: formatPriceFromContext } = useMarketplaceCurrency();
  const [imgError, setImgError] = useState(false);
  const formatPrice = (price) => {
    if (price == null) return '';
    return formatPriceFromContext(price);
  };

  const imageUrl = product.images?.[0] || product.image_url;
  const src = imgError ? MARKETPLACE_PLACEHOLDER_IMG : getAbsoluteImageUrl(imageUrl) || MARKETPLACE_PLACEHOLDER_IMG;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onPress?.(product)}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
        {/* Image — fond visible sur PWA mobile pour éviter cadres vides */}
        <div className="relative aspect-square w-full min-h-[140px] bg-gray-100">
          <img
            src={src}
            alt={product.name || product.title || 'Produit'}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            onError={() => setImgError(true)}
          />
          
          {/* Video indicator */}
          {product.video_url && (
            <div className="absolute top-2 left-2 bg-black/60 rounded-full p-1.5">
              <Play className="w-3 h-3 text-white fill-white" />
            </div>
          )}

          {/* Like button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(product);
            }}
            className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-2 shadow-sm"
          >
            <Heart className={cn(
              "w-4 h-4 transition-colors",
              isLiked ? "text-red-500 fill-red-500" : "text-gray-400"
            )} />
          </button>

          {/* Verified badge + Badge Confiance CDC 2.2.6 */}
          {product.is_verified && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" />
                Vérifié
              </span>
              {(product.seller_rating ?? 0) >= 4 && (
                <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Confiance
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 text-gray-800 mb-1">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-lg font-bold text-blue-500">
              {formatPrice(product.price)}
            </span>
          </div>

          {/* Location */}
          {product.location && (
            <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{product.location}</span>
            </div>
          )}

          {/* Seller */}
          <div className="flex items-center justify-between pt-2 border-_t border-gray-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/SellerProfile?id=${product.seller_id}`);
              }}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={product.seller_avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                  {product.seller_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500 truncate max-w-[80px]">
                {product.seller_name}
              </span>
            </button>

            {/* Rating */}
            {product.seller_rating > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-gray-600">
                  {product.seller_rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Payment methods */}
          {product.payment_methods?.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {product.payment_methods.slice(0, 4).map((method, i) => (
                <span key={i} className="text-sm" title={method}>
                  {paymentIcons[method]}
                </span>
              ))}
            </div>
          )}

          {/* Buy Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/Product?id=${product.id}`);
            }}
            className="mt-3 w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all active:scale-95"
          >
            Acheter
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
