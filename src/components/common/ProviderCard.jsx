import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getAbsoluteImageUrl } from "@/lib/utils";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PLAN_BADGES = {
  premium: { label: "Premium", className: "bg-orange-500 text-white border-0 rounded-full" },
  pro: { label: "Pro", className: "bg-green-100 text-green-800 border-0 rounded-full" },
};

// Image par défaut — cartes jamais vides (mobile Android/iOS et vrais utilisateurs sans photo)
export const DEFAULT_CARD_IMAGE =
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop";

function getCardImageUrl(provider) {
  if (!provider) return DEFAULT_CARD_IMAGE;
  const urls = [
    provider.portfolio_urls?.[0],
    provider.cover_image,
    provider.image_url,
    provider.banner_url,
    provider.portfolio_image,
  ].filter(Boolean);
  const raw = typeof urls[0] === "string" ? urls[0].trim() : "";
  if (!raw) return DEFAULT_CARD_IMAGE;
  // PWA mobile : URL absolue obligatoire pour que les images s'affichent (cadres vides sinon)
  const absolute = getAbsoluteImageUrl(raw);
  return absolute || DEFAULT_CARD_IMAGE;
}

export default function ProviderCard({ provider, categoryName }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (!provider) return null;

  const p = provider;
  const tierBadge = PLAN_BADGES[p.subscription_plan];
  const isAvailable = p.availability === "available" || p.is_available !== false;
  const tags = Array.isArray(p.services_offered) ? p.services_offered : (p.service_tags || []);
  const displayTags = tags.slice(0, 3);
  const extraCount = tags.length > 3 ? tags.length - 3 : 0;
  const imageUrl = imageFailed ? DEFAULT_CARD_IMAGE : getCardImageUrl(p);
  const displayName = p.display_name || p.business_name || p.user?.full_name || "Prestataire";
  const initial = (displayName || "P")[0].toUpperCase();
  const rawAvatar = p.photo_url || p.user?.profile_image;
  const avatarUrl = !avatarFailed && rawAvatar ? getAbsoluteImageUrl(String(rawAvatar).trim()) || rawAvatar : null;
  const locationText = [p.city, p.neighborhood].filter(Boolean).join(", ") || "—";
  const priceMin = p.price_range_min ?? p.starting_price ?? 0;

  return (
    <Link
      to={createPageUrl("ProviderProfile") + `?id=${p.id}`}
      className="group block bg-white rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-amber-100/30 transition-all duration-300"
    >
      {/* Image header — toujours une image (fallback sur mobile si chargement échoue) */}
      <div className="relative h-48 min-h-[192px] bg-gradient-to-br from-amber-100 to-green-100 overflow-hidden">
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
        {/* Disponible — top-left, green oval with dot */}
        {isAvailable && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white" />
            Disponible
          </div>
        )}
        {/* Pro / Premium — top-right */}
        {tierBadge && (
          <Badge className={`absolute top-3 right-3 ${tierBadge.className}`}>
            {tierBadge.label}
          </Badge>
        )}
      </div>

      {/* Content — champs avec fallbacks pour ne jamais être vides sur mobile */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow flex-shrink-0"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white shadow flex-shrink-0">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <h3 className="font-semibold text-sm text-foreground truncate">
                  {displayName}
                </h3>
                {p.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {categoryName || p.category_name || p.service_category || ""}
              </p>
            </div>
          </div>
          {Number(p.average_rating) > 0 && (
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{Number(p.average_rating).toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{locationText}</span>
        </div>

        <p className="mt-2 text-sm font-medium text-foreground">
          {priceMin > 0
            ? `À partir de ${Number(priceMin).toLocaleString("fr-FR")} FCFA`
            : "Prix sur demande"}
        </p>

        {(displayTags.length > 0 || extraCount > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayTags.map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
              >
                {typeof s === "string" ? s : s?.name || ""}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs text-muted-foreground bg-muted">
                +{extraCount}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
