import React, { useState, useEffect } from "react";
import { api } from "@/api/expressClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Star, User, CheckCircle, Heart, MessageCircle, Send, Phone, ArrowLeft, Check, Calendar } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BottomNav from "../components/navigation/BottomNav";
import { DEFAULT_CARD_IMAGE } from "@/components/common/ProviderCard";
import StarRating from "@/components/common/StarRating";
import { toast } from "sonner";

// Images pour les prestataires fictifs (même que Marketplace — cartes jamais vides)
const FIC_IMAGES = {
  mariam: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
  amadou: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=400&fit=crop",
  aissata: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop",
  oumar: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop",
  fatoumata: "https://images.unsplash.com/photo-1561070791-2526d31fe1b6?w=600&h=400&fit=crop",
  ibrahim: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600&h=400&fit=crop",
};

// Données fictives pour les prestataires du Marketplace (comme sur les captures)
const FICTITIOUS_PROVIDER_DETAILS = {
  "fic-mariam": {
    display_name: "Mariam Traoré",
    category_name: "Santé & Bien-être",
    city: "Bamako",
    neighborhood: "Hippodrome",
    price_min: 7500,
    price_max: 25000,
    average_rating: 4.9,
    total_reviews: 30,
    is_verified: true,
    is_available: true,
    phone: "+223 78 23 45 67",
    about:
      "Coach sportive certifiée. Programmes personnalisés de fitness, yoga et remise en forme. Séances à domicile ou en salle.",
    services_proposed: ["Fitness", "Yoga", "Coach personnel", "Remise en forme"],
    portfolio_urls: [FIC_IMAGES.mariam],
  },
  "fic-amadou": {
    display_name: "Amadou Diallo",
    category_name: "Cours & Formation",
    city: "Bamako",
    neighborhood: "Hamdallaye ACI 2000",
    price_min: 5000,
    price_max: 15000,
    average_rating: 4.8,
    total_reviews: 24,
    is_verified: true,
    is_available: true,
    phone: "+223 70 12 34 56",
    about:
      "Enseignant expérimenté. Cours de maths, physique et préparation BAC. Méthode adaptée à chaque élève.",
    services_proposed: ["Cours de maths", "Cours de physique", "Préparation BAC", "Soutien scolaire"],
    portfolio_urls: [FIC_IMAGES.amadou],
  },
  "fic-aissata": {
    display_name: "Aïssata Diarra",
    category_name: "Photographie",
    city: "Bamako",
    neighborhood: "Kalaban Coura",
    price_min: 30000,
    price_max: 80000,
    average_rating: 4.8,
    total_reviews: 18,
    is_verified: true,
    is_available: true,
    phone: "+223 76 98 76 54",
    about:
      "Photographe professionnelle. Mariages, portraits et événements. Reportages en extérieur et en studio.",
    services_proposed: ["Mariage", "Portraits", "Événements", "Reportage"],
    portfolio_urls: [FIC_IMAGES.aissata],
  },
  "fic-oumar": {
    display_name: "Oumar Sangaré",
    category_name: "Informatique & Tech",
    city: "Bamako",
    neighborhood: "Sotuba ACI",
    price_min: 50000,
    price_max: 200000,
    average_rating: 4.7,
    total_reviews: 12,
    is_verified: true,
    is_available: false,
    phone: "+223 65 43 21 09",
    about:
      "Développeur full-stack. Création de sites web, applications mobiles et solutions e-commerce sur mesure.",
    services_proposed: ["Sites web", "Applications mobiles", "E-commerce", "Maintenance"],
    portfolio_urls: [FIC_IMAGES.oumar],
  },
  "fic-fatoumata": {
    display_name: "Fatoumata Keita",
    category_name: "Design & Créativité",
    city: "Bamako",
    neighborhood: "Badalabougou",
    price_min: 25000,
    price_max: 60000,
    average_rating: 4.6,
    total_reviews: 15,
    is_verified: true,
    is_available: true,
    phone: "+223 79 87 65 43",
    about:
      "Designer graphique. Logos, identité visuelle, flyers et brochures. Créations sur mesure pour vos projets.",
    services_proposed: ["Logo design", "Identité visuelle", "Flyers & Brochures", "Chartes graphiques"],
    portfolio_urls: [FIC_IMAGES.fatoumata],
  },
  "fic-ibrahim": {
    display_name: "Ibrahim Coulibaly",
    category_name: "Artisanat",
    city: "Bamako",
    neighborhood: "Magnambougou",
    price_min: 10000,
    price_max: 35000,
    average_rating: 4.5,
    total_reviews: 22,
    is_verified: true,
    is_available: true,
    phone: "+223 66 55 44 33",
    about:
      "Plombier professionnel. Installation sanitaire, réparation de fuites et dépannage. Intervention rapide.",
    services_proposed: ["Plomberie générale", "Installation sanitaire", "Réparation fuites", "Dépannage"],
    portfolio_urls: [FIC_IMAGES.ibrahim],
    certifications: ["Certificat professionnel en plomberie"],
  },
};

export default function ProviderProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const providerId = searchParams.get("id");

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isFictitious, setIsFictitious] = useState(false);
  const [fictitiousData, setFictitiousData] = useState(null);

  useEffect(() => {
    if (providerId && FICTITIOUS_PROVIDER_DETAILS[providerId]) {
      setIsFictitious(true);
      setFictitiousData(FICTITIOUS_PROVIDER_DETAILS[providerId]);
    } else {
      setIsFictitious(false);
      setFictitiousData(null);
    }
  }, [providerId]);

  const { data: providerFromApi, isLoading } = useQuery({
    queryKey: ["provider", providerId],
    queryFn: () => api.providers.getById(providerId),
    enabled: !!providerId && !isFictitious,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["provider-reviews", providerId],
    queryFn: async () => {
      const res = await api.serviceReviews.getProviderReviews(providerId, { limit: 50 });
      const list = res?.reviews ?? res?.data ?? (Array.isArray(res) ? res : []);
      return Array.isArray(list) ? list : [];
    },
    enabled: !!providerId && !isFictitious,
  });

  const reviews = isFictitious ? [] : (reviewsData ?? []);
  const reviewCount = reviews.length;

  if (!providerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Prestataire non trouvé</h2>
            <Button onClick={() => navigate(createPageUrl("Marketplace"))}>
              Retour au Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFictitious && fictitiousData) {
    return (
      <ProviderProfileContent
        provider={fictitiousData}
        providerId={providerId}
        reviews={[]}
        reviewCount={fictitiousData.total_reviews ?? 0}
        reviewRating={reviewRating}
        setReviewRating={setReviewRating}
        reviewText={reviewText}
        setReviewText={setReviewText}
        onPublishReview={() => {}}
        navigate={navigate}
        isFictitious
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!providerFromApi) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Prestataire non trouvé</h2>
            <Button onClick={() => navigate(createPageUrl("Marketplace"))}>
              Retour au Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const provider = normalizeApiProvider(providerFromApi);
  const reviewsList = Array.isArray(reviews) ? reviews : reviews?.reviews ?? [];

  return (
    <ProviderProfileContent
      provider={provider}
      providerId={providerId}
      reviews={reviewsList}
      reviewCount={reviewsList.length}
      reviewRating={reviewRating}
      setReviewRating={setReviewRating}
      reviewText={reviewText}
      setReviewText={setReviewText}
      onPublishReview={async () => {
        // TODO: api.serviceReviews.create(providerId, { rating: reviewRating, content: reviewText })
        setReviewText("");
        setReviewRating(0);
      }}
      navigate={navigate}
      isFictitious={false}
    />
  );
}

function normalizeApiProvider(p) {
  const user = p.user || {};
  const name = user.full_name || user.username || p.display_name || p.business_name || "Prestataire";
  const loc = [p.city, p.neighborhood].filter(Boolean).join(", ");
  const priceMin = p.price_range_min ?? p.starting_price ?? p.price_min ?? 0;
  const priceMax = p.price_range_max ?? p.price_max ?? priceMin;
  const services = p.services_offered ?? p.service_tags ?? p.service_categories ?? [];
  const servicesList = Array.isArray(services) ? services : [];
  return {
    display_name: name,
    category_name: p.category_name || p.service_category || "",
    city: p.city || "",
    neighborhood: p.neighborhood || "",
    price_min: priceMin,
    price_max: priceMax,
    average_rating: Number(p.average_rating) || 0,
    total_reviews: p.total_reviews ?? p.total_bookings ?? 0,
    is_verified: p.is_verified === true,
    is_available: p.availability === "available" || p.is_available !== false,
    phone: p.phone || p.user?.phone || "",
    about: p.bio || p.about || "",
    services_proposed: servicesList.map((s) => (typeof s === "string" ? s : s?.name || "")).filter(Boolean),
    portfolio_urls: p.portfolio_urls || [],
    photo_url: p.photo_url || user.profile_image,
    certifications: p.certifications ?? (Array.isArray(p.certification) ? p.certification : p.certification ? [p.certification] : []),
  };
}

function ProviderProfileContent({
  provider,
  providerId,
  reviews,
  reviewCount,
  reviewRating,
  setReviewRating,
  reviewText,
  setReviewText,
  onPublishReview,
  navigate,
  isFictitious,
}) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showRdvServices, setShowRdvServices] = useState(false);

  const { data: providerServices = [] } = useQuery({
    queryKey: ["provider-services", providerId],
    queryFn: () => api.providers.getServices(providerId),
    enabled: !!providerId && !isFictitious,
  });
  const servicesList = Array.isArray(providerServices) ? providerServices : providerServices?.services ?? [];

  const p = provider;
  const locationText = [p.city, p.neighborhood].filter(Boolean).join(", ");
  const priceLabel =
    p.price_min > 0 || p.price_max > 0
      ? `${(p.price_min || 0).toLocaleString("fr-FR")} - ${(p.price_max || p.price_min || 0).toLocaleString("fr-FR")} FCFA`
      : "";
  const certifications = p.certifications ?? (Array.isArray(p.certification) ? p.certification : p.certification ? [p.certification] : []);

  const handleSendRequest = async () => {
    if (!requestText.trim() || sendingRequest) return;
    setSendingRequest(true);
    try {
      if (typeof api?.serviceRequests?.create === "function") {
        await api.serviceRequests.create({ provider_id: providerId, message: requestText.trim() });
      }
      setRequestText("");
      setShowRequestForm(false);
      toast.success("Demande envoyée");
    } catch (_) {
      toast.error("Impossible d'envoyer la demande");
    }
    setSendingRequest(false);
  };

  const sidebar = (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Tarification indicative</h3>
          <p className="text-lg font-bold text-foreground mt-1">
            {priceLabel || "—"}
          </p>
        </div>
        {servicesList.length > 0 && (
          <Button
            className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium"
            onClick={() => {
              if (servicesList.length === 1) {
                navigate(createPageUrl("ServiceBooking") + `?id=${servicesList[0].id}`);
              } else {
                setShowRdvServices((prev) => !prev);
              }
            }}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Prendre RDV
          </Button>
        )}
        {servicesList.length > 1 && showRdvServices && (
          <div className="space-y-2 rounded-xl border p-3 bg-gray-50">
            {servicesList.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate(createPageUrl("ServiceBooking") + `?id=${s.id}`)}
              >
                {s.name || "Service"} — Réserver
              </Button>
            ))}
          </div>
        )}
        <Button
          className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium"
          onClick={() => navigate(createPageUrl("Messages") + `?provider=${providerId}`)}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Envoyer un message
        </Button>
        {!showRequestForm ? (
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-gray-300"
            onClick={() => setShowRequestForm(true)}
          >
            <Send className="w-5 h-5 mr-2" />
            Faire une demande
          </Button>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Décrivez votre besoin..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              className="min-h-[100px] rounded-xl resize-y"
            />
            <Button
              className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium"
              onClick={handleSendRequest}
              disabled={!requestText.trim() || sendingRequest}
            >
              <Check className="w-5 h-5 mr-2" />
              Envoyer la demande
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setShowRequestForm(false); setRequestText(""); }}>
              Annuler
            </Button>
          </div>
        )}
        {p.phone && (
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            asChild
          >
            <a href={`tel:${p.phone.replace(/\s/g, "")}`}>
              <Phone className="w-5 h-5 mr-2" />
              {p.phone}
            </a>
          </Button>
        )}
        {certifications && certifications.length > 0 && (
          <div className="pt-3 border-t">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Certifications</h3>
            <ul className="space-y-1.5">
              {certifications.map((cert, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{typeof cert === "string" ? cert : cert?.name ?? cert?.title ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Barre Retour */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium text-foreground">Retour</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image / bannière — toujours une image (mobile Android/iOS, vrais utilisateurs) */}
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-green-100 aspect-[16/10] min-h-[200px] flex items-center justify-center">
              <img
                src={(p.portfolio_urls?.[0] && p.portfolio_urls[0].trim()) ? p.portfolio_urls[0] : DEFAULT_CARD_IMAGE}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_CARD_IMAGE;
                }}
              />
            </div>

            {/* Carte prestataire */}
            <Card className="rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
                    {(p.display_name || "P")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-foreground">
                        {p.display_name || "Prestataire"}
                      </h1>
                      {p.is_verified && (
                        <span className="inline-flex w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {p.category_name || ""}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>{locationText || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {p.is_available && (
                        <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-white" />
                          Disponible
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                    <Heart className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>
                {/* Note et avis */}
                <div className="mt-4 pt-4 border-t bg-blue-50/80 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StarRating rating={p.average_rating} readOnly />
                    <span className="font-semibold text-foreground">
                      {Number(p.average_rating).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({(p.total_reviews ?? reviewCount)} avis)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* À propos */}
            {p.about && (
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">À propos</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground leading-relaxed">{p.about}</p>
                </CardContent>
              </Card>
            )}

            {/* Services proposés */}
            {p.services_proposed && p.services_proposed.length > 0 && (
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">Services proposés</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {p.services_proposed.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Avis */}
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Avis ({reviews.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Laisser un avis</h4>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i)}
                        className="p-0.5 rounded focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            i <= reviewRating ? "fill-blue-400 text-blue-400" : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Partagez votre expérience..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="min-h-[100px] rounded-xl resize-y"
                  />
                  <Button
                    className="mt-3 rounded-xl bg-blue-500 hover:bg-blue-600"
                    onClick={onPublishReview}
                  >
                    Publier l'avis
                  </Button>
                </div>
                {reviewCount === 0 ? (
                  <p className="text-muted-foreground text-sm">Aucun avis pour le moment</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {r.customer?.full_name || r.customer?.username || "Client"}
                          </span>
                          <StarRating rating={r.rating} size="sm" readOnly />
                        </div>
                        <p className="text-sm text-muted-foreground">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar : tarification et actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">{sidebar}</div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
