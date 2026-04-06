import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getAbsoluteImageUrl } from "@/lib/utils";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PLAN_BADGES = {
  premium: { label: "Premium", className: "bg-primary text-white border-0 rounded-full" },
  pro: { label: "Pro", className: "bg-green-100 text-green-800 border-0 rounded-full" },
};

function buildProviderFallbackImage(provider) {
  const displayName =
    provider?.display_name ||
    provider?.business_name ||
    provider?.user?.full_name ||
    "Prestataire";
  const category =
    provider?.category_name ||
    provider?.service_category ||
    "Service local";
  const initial = (displayName || "P").charAt(0).toUpperCase();

  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef3c7"/>
            <stop offset="100%" stop-color="#bbf7d0"/>
          </linearGradient>
        </defs>
        <rect width="600" height="400" fill="url(#bg)"/>
        <circle cx="300" cy="190" r="88" fill="#374151" opacity="0.86"/>
        <text x="300" y="210" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="96" font-weight="700" fill="#ffffff">${initial}</text>
        <rect x="160" y="300" width="280" height="40" rx="20" fill="#ffffff" opacity="0.9"/>
        <text x="300" y="326" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="18" font-weight="600" fill="#374151">${String(category).slice(0, 24)}</text>
      </svg>`
    )
  );
}

export const DEFAULT_CARD_IMAGE = buildProviderFallbackImage(null);

export function getProviderCardImageUrl(provider) {
  if (!provider) return DEFAULT_CARD_IMAGE;

  const urls = [
    provider.portfolio_urls?.[0],
    provider.cover_image,
    provider.image_url,
    provider.banner_url,
    provider.portfolio_image,
  ].filter(Boolean);

  const raw = typeof urls[0] === "string" ? urls[0].trim() : "";
  if (!raw) return buildProviderFallbackImage(provider);

  const absolute = getAbsoluteImageUrl(raw);
  return absolute || buildProviderFallbackImage(provider);
}

export default function ProviderCard({ provider, categoryName, priority = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const imageErrorFiredRef = useRef(false);

  const p = provider;
  const imageUrl = imageFailed ? buildProviderFallbackImage(p) : getProviderCardImageUrl(p);

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  const handleImageError = () => {
    if (!imageErrorFiredRef.current) {
      imageErrorFiredRef.current = true;
      setImageFailed(true);
      setImageLoaded(true);
    }
  };

  if (!p) return null;

  const tierBadge = PLAN_BADGES[p.subscription_plan];
  const isAvailable = p.availability === "available" || p.is_available !== false;
  const tags = Array.isArray(p.services_offered) ? p.services_offered : (p.service_tags || []);
  const displayTags = tags.slice(0, 3);
  const extraCount = tags.length > 3 ? tags.length - 3 : 0;
  const displayName = p.display_name || p.business_name || p.user?.full_name || "Prestataire";
  const initial = (displayName || "P")[0].toUpperCase();
  const rawAvatar = p.photo_url || p.user?.profile_image;
  const avatarUrl = !avatarFailed && rawAvatar ? getAbsoluteImageUrl(String(rawAvatar).trim()) || rawAvatar : null;
  const locationText = [p.city, p.neighborhood].filter(Boolean).join(", ") || "-";
  const priceMin = p.price_range_min ?? p.starting_price ?? 0;

  return (
    <Link
      to={createPageUrl("ProviderProfile") + `?id=${p.id}`}
      className="group block bg-white rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blue-100/30 transition-all duration-300"
    >
      <div className="relative h-48 min-h-[192px] bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100" />
        )}
        <img
          src={imageUrl}
          alt=""
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          loading={priority ? "eager" : "lazy"}
          fetchpriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />

        {isAvailable && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white" />
            Disponible
          </div>
        )}

        {tierBadge && (
          <Badge className={`absolute top-3 right-3 ${tierBadge.className}`}>
            {tierBadge.label}
          </Badge>
        )}
      </div>

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
                  <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {categoryName || p.category_name || p.service_category || ""}
              </p>
            </div>
          </div>
          {Number(p.average_rating) > 0 && (
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              <Star className="w-4 h-4 fill-blue-500 text-blue-500" />
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
            ? `A partir de ${Number(priceMin).toLocaleString("fr-FR")} FCFA`
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
