import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Star, MapPin, BadgeCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { DEFAULT_CARD_IMAGE } from "@/components/common/ProviderCard";

const PLAN_BADGES = {
  premium: { label: "Premium", className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" },
  pro: { label: "Pro", className: "bg-green-100 text-green-800 border-green-200" },
};

function getCardImageUrl(p) {
  const url = p?.portfolio_urls?.[0] || p?.cover_image || p?.image_url || "";
  return (typeof url === "string" && url.trim()) ? url.trim() : DEFAULT_CARD_IMAGE;
}

export default function FeaturedProviders({ providers, categories }) {
  const getCategoryName = (id) => (categories && categories.find((c) => c.id === id)?.name) || "";

  if (!Array.isArray(providers) || providers.length === 0) return null;

  return (
    <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-transparent to-amber-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Prestataires en Vedette</h2>
            <p className="mt-3 text-muted-foreground">Les professionnels les mieux notés</p>
          </div>
          <Link to={createPageUrl("Providers")}>
            <Button variant="ghost" className="text-amber-700 hover:text-amber-800 hidden sm:flex">
              Voir tout <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p, i) => {
            const badge = p && PLAN_BADGES[p.subscription_plan];
            return (
              <FeaturedProviderCard
                key={p?.id ?? i}
                provider={p}
                getCategoryName={getCategoryName}
                badge={badge}
                index={i}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedProviderCard({ provider, getCategoryName, badge, index }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (!provider) return null;

  const p = provider;
  const imageUrl = imageFailed ? DEFAULT_CARD_IMAGE : getCardImageUrl(p);
  const displayName = p.display_name || p.business_name || "Prestataire";
  const initial = (displayName || "P")[0].toUpperCase();
  const avatarUrl = !avatarFailed && (p.photo_url || p.user?.profile_image) ? (p.photo_url || p.user.profile_image) : null;
  const locationText = [p.city, p.neighborhood].filter(Boolean).join(", ") || "—";
  const priceMin = p.price_range_min ?? p.starting_price ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
    >
      <Link
        to={createPageUrl("ProviderProfile") + `?id=${p.id}`}
        className="group block bg-white rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-amber-100/30 transition-all duration-300"
      >
        {/* Image — toujours une image (fallback sur mobile) */}
        <div className="relative h-48 min-h-[192px] bg-gradient-to-br from-amber-100 to-green-100 overflow-hidden">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
          {badge && (
            <Badge className={`absolute top-3 right-3 ${badge.className}`}>
              {badge.label}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-green-600 flex items-center justify-center text-white font-medium text-sm ring-2 ring-white shadow">
                  {initial}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-foreground">{displayName}</h3>
                  {p.is_verified && <BadgeCheck className="w-4 h-4 text-amber-500" />}
                </div>
                <p className="text-xs text-muted-foreground">{getCategoryName(p.category_id) || p.category_name || ""}</p>
              </div>
            </div>
            {Number(p.average_rating) > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{Number(p.average_rating).toFixed(1)}</span>
                <span className="text-muted-foreground">({p.total_reviews ?? 0})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            {locationText}
          </div>

          <p className="mt-2 text-sm font-medium text-foreground">
            {priceMin > 0 ? `À partir de ${Number(priceMin).toLocaleString("fr-FR")} FCFA` : "Prix sur demande"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
