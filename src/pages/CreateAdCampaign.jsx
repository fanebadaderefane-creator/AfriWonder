/**
 * Création de campagne publicitaire (CDC Phase 1)
 * Vidéo → redirection vers Create (importer, filmer, live)
 * Image → upload direct
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { FILE_ACCEPT_IMAGES } from '@/lib/fileAccept';
import {
  ArrowLeft,
  Megaphone,
  Loader2,
  Upload,
  Video,
  Image as ImageIcon,
  Check,
  Wallet,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/navigation/BottomNav';
import { COUNTRIES_BY_LETTER, getCountryFlagByName } from '@/constants/countries';

const DURATION_OPTIONS = [
  { days: 1, label: '1 jour', price: 2000 },
  { days: 3, label: '3 jours', price: 5000 },
  { days: 7, label: '7 jours', price: 10000 },
  { days: 14, label: '14 jours', price: 18000 },
  { days: 30, label: '30 jours', price: 35000 },
  { days: 60, label: '60 jours', price: 60000 },
  { days: 90, label: '90 jours', price: 85000 },
];

const CTA_OPTIONS = [
  { value: 'visit', label: 'Voir plus', icon: '🌐' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'buy', label: 'Acheter', icon: '🛒' },
  { value: 'contact', label: 'Contacter', icon: '📞' },
];

/** Normalise pour la recherche (accents, espaces) */
function normalizeSearch(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function CountryMultiSelect({ countriesByLetter = [], selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = React.useRef(null);
  const allCountries = countriesByLetter.flatMap((g) => g.countries);
  const q = normalizeSearch(search.trim());
  const filtered = q
    ? countriesByLetter.map((g) => ({
        letter: g.letter,
        countries: g.countries.filter((c) => normalizeSearch(c).includes(q)),
      })).filter((g) => g.countries.length > 0)
    : countriesByLetter;
  const resultCount = filtered.flatMap((g) => g.countries).length;

  React.useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const toggle = (name) => {
    const next = selected.includes(name)
      ? selected.filter((c) => c !== name)
      : [...selected, name];
    onChange(next);
  };

  const toggleAll = () => {
    onChange(selected.length === allCountries.length ? [] : [...allCountries]);
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  const displaySelected = () => {
    if (selected.length === 0) return 'Tous les pays';
    if (selected.length === 1) {
      const flag = getCountryFlagByName(selected[0]);
      return flag ? `${flag} ${selected[0]}` : selected[0];
    }
    return `${selected.length} pays sélectionnés`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1 w-full flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-left text-white hover:bg-white/15 transition-colors"
        >
          <span className="truncate">{displaySelected()}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] max-h-[400px] p-0 bg-slate-900 border-white/20 overflow-hidden flex flex-col"
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchInputRef.current?.focus();
          }}
        >
        <div className="p-2 border-b border-white/10 shrink-0 bg-slate-900">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
            <input
              ref={searchInputRef}
              type="search"
              autoComplete="off"
              role="searchbox"
              aria-label="Rechercher un pays"
              placeholder="Tapez un pays (ex: Sénégal, Maroc...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/15 border-2 border-orange-500/50 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          {q && (
            <p className="mb-1.5 text-xs text-white/70">{resultCount} résultat{resultCount !== 1 ? 's' : ''}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-orange-400 hover:text-orange-300"
            >
              {selected.length === allCountries.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-white/60 hover:text-white flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Effacer
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[260px] min-h-0 shrink-0 overflow-hidden">
          <div className="p-2 pb-4">
            {filtered.map((group) => (
              <div key={group.letter} className="mb-3">
                <div className="px-2 py-1.5 text-xs font-bold text-orange-400 bg-white/5 rounded mb-1 sticky top-0">
                  — {group.letter} —
                </div>
                <div className="space-y-0.5">
                  {group.countries.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.includes(c)}
                        onCheckedChange={() => toggle(c)}
                      />
                      <span className="text-base mr-2" aria-hidden>{getCountryFlagByName(c)}</span>
                      <span className="text-sm text-white">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default function CreateAdCampaign() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    ad_type: 'in_feed',
    duration_days: 7,
    target_countries: [],
    target_cities: '',
    target_age_min: null,
    target_age_max: null,
    target_gender: 'all',
    media_type: 'video',
    media_url: '',
    thumbnail_url: '',
    title: '',
    description: '',
    cta_type: 'visit',
    cta_url: '',
    cta_label: 'Découvrir',
  });
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'orange_money'
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [selectedBoostVideo, setSelectedBoostVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (mediaFile) {
      const url = URL.createObjectURL(mediaFile);
      setMediaPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setMediaPreviewUrl(null);
    }
  }, [mediaFile]);

  // Restaurer l'état si retour depuis Create (écran +) avec vidéo ajoutée
  useEffect(() => {
    const id = searchParams.get('campaignId');
    const stepParam = searchParams.get('step');
    if (id && stepParam === '3') {
      setCampaignId(id);
      setStep(3);
      setFormData((p) => ({ ...p, media_type: 'video' }));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: pricing } = useQuery({
    queryKey: ['ads-pricing'],
    queryFn: () => api.ads.getPricing(),
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.payments.getWallet(),
    enabled: step === 3 && !!campaignId,
  });

  const { data: campaignDetails } = useQuery({
    queryKey: ['ads-campaign', campaignId],
    queryFn: () => api.ads.getCampaignStats(campaignId),
    enabled: step === 3 && !!campaignId,
  });

  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.auth.me(),
  });

  const { data: myVideos = [] } = useQuery({
    queryKey: ['my-videos', user?.id],
    queryFn: async () => {
      const res = await api.videos.list({ creator_id: user.id, limit: 50 });
      return res?.videos ?? res ?? [];
    },
    enabled: !!user?.id && step === 2 && formData.ad_type === 'boost_post',
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data) => api.ads.createCampaign(data),
    onSuccess: (campaign) => {
      setCampaignId(campaign.id);
      setStep(2);
      toast.success('Campagne créée ! Ajoutez maintenant votre créatif.');
    },
    onError: (err) => {
      toast.error(err?.message || 'Erreur lors de la création');
    },
  });

  const addCreativeMutation = useMutation({
    mutationFn: ({ campaignId: id, ...payload }) =>
      api.ads.addCreative(id, payload),
    onSuccess: () => {
      toast.success('Créatif ajouté !');
      setStep(3);
    },
    onError: (err) => {
      toast.error(err?.message || "Erreur lors de l'ajout du créatif");
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id) => api.ads.submitCampaign(id),
    onSuccess: () => {
      toast.success('Paiement effectué ! Campagne soumise pour validation.');
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      navigate(createPageUrl('AdvertiserDashboard'));
    },
    onError: (err) => {
      const msg = err?.apiMessage ?? err?.response?.data?.error?.message ?? err?.message;
      toast.error(typeof msg === 'string' ? msg : 'Erreur lors du paiement');
    },
  });

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Donnez un nom à votre campagne');
      return;
    }
    const countries = Array.isArray(formData.target_countries) ? formData.target_countries : [];
    const cities = (formData.target_cities || '')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    createCampaignMutation.mutate({
      name: formData.name.trim(),
      ad_type: formData.ad_type || 'in_feed',
      duration_days: formData.duration_days,
      target_countries: countries,
      target_cities: cities,
      target_age_min: formData.target_age_min ? Number(formData.target_age_min) : undefined,
      target_age_max: formData.target_age_max ? Number(formData.target_age_max) : undefined,
      target_gender: formData.target_gender || 'all',
    });
  };

  const handleMediaTypeChange = (v) => {
    setFormData((p) => ({ ...p, media_type: v }));
    setMediaFile(null);
    setSelectedBoostVideo(null);
  };

  const handleBoostVideoSelect = (video) => {
    setSelectedBoostVideo(video);
  };

  const handleBoostPostSubmit = () => {
    if (!campaignId || !selectedBoostVideo) return;
    const videoUrl = selectedBoostVideo.video_url || selectedBoostVideo.url;
    const thumbUrl = selectedBoostVideo.thumbnail_url || selectedBoostVideo.thumbnail;
    if (!videoUrl) {
      toast.error('Cette vidéo n\'a pas d\'URL valide');
      return;
    }
    addCreativeMutation.mutate({
      campaignId,
      media_type: 'video',
      media_url: videoUrl,
      thumbnail_url: thumbUrl || videoUrl,
      title: selectedBoostVideo.title || selectedBoostVideo.description?.slice(0, 50),
      cta_type: formData.cta_type || 'visit',
      cta_url: formData.cta_url || undefined,
      cta_label: formData.cta_label || 'Découvrir',
    });
  };

  const goToCreateForVideo = () => {
    if (campaignId) {
      navigate(createPageUrl('Create') + `?mode=ad&campaignId=${campaignId}`);
    }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validImage.includes(file.type)) {
      toast.error('Format image invalide (JPEG, PNG, WebP)');
      return;
    }
    setMediaFile(file);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!campaignId || formData.media_type !== 'image' || !mediaFile) return;

    setUploadProgress(0);
    try {
      const res = await api.upload.image(mediaFile);
      const mediaUrl = res?.file_url || res?.url || '';
      if (!mediaUrl) {
        toast.error('Échec du téléchargement');
        return;
      }

      addCreativeMutation.mutate({
        campaignId,
        media_type: 'image',
        media_url: mediaUrl,
        thumbnail_url: mediaUrl,
        cta_type: formData.cta_type,
        cta_url: formData.cta_url || undefined,
        cta_label: formData.cta_label || 'Découvrir',
      });
    } catch (err) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleStep3Submit = () => {
    if (!campaignId) return;
    submitMutation.mutate(campaignId);
  };

  const price =
    campaignDetails?.price_fcfa ??
    pricing?.[formData.duration_days] ??
    DURATION_OPTIONS.find((o) => o.days === formData.duration_days)?.price ??
    0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 pb-24">
      <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-amber-600 border-b border-white/20 shadow-xl z-40">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() =>
              step > 1 ? setStep(step - 1) : navigate(createPageUrl('AdvertiserDashboard'))
            }
            className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Nouvelle campagne
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-orange-500' : 'bg-white/20'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <Label className="text-white/80">Nom de la campagne</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Promotion été 2026"
                className="mt-1 bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label className="text-white/80">Type de publicité</Label>
              <Select
                value={formData.ad_type || 'in_feed'}
                onValueChange={(v) => setFormData((p) => ({ ...p, ad_type: v }))}
              >
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_feed">In-Feed (vidéo pleine)</SelectItem>
                  <SelectItem value="top_banner">Bannière en haut</SelectItem>
                  <SelectItem value="boost_post">Boost Post (sponsoriser ma vidéo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/80">Ciblage — Pays (A à Z, plusieurs possibles)</Label>
              <CountryMultiSelect
                countriesByLetter={COUNTRIES_BY_LETTER}
                selected={formData.target_countries || []}
                onChange={(countries) =>
                  setFormData((p) => ({ ...p, target_countries: countries }))
                }
              />
            </div>
            <div>
              <Label className="text-white/80">Ciblage — Ville (optionnel)</Label>
              <Input
                value={formData.target_cities || ''}
                onChange={(e) => setFormData((p) => ({ ...p, target_cities: e.target.value }))}
                placeholder="Ex: Dakar, Abidjan"
                className="mt-1 bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/80">Âge min (optionnel)</Label>
                <Input
                  type="number"
                  min={13}
                  max={99}
                  value={formData.target_age_min ?? ''}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      target_age_min: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="13"
                  className="mt-1 bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white/80">Âge max (optionnel)</Label>
                <Input
                  type="number"
                  min={13}
                  max={99}
                  value={formData.target_age_max ?? ''}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      target_age_max: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="99"
                  className="mt-1 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-white/80">Sexe (optionnel)</Label>
              <Select
                value={formData.target_gender || 'all'}
                onValueChange={(v) => setFormData((p) => ({ ...p, target_gender: v }))}
              >
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="male">Hommes</SelectItem>
                  <SelectItem value="female">Femmes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/80">Durée</Label>
              <Select
                value={String(formData.duration_days)}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, duration_days: parseInt(v) }))
                }
              >
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.days} value={String(opt.days)}>
                      {opt.label} — {opt.price.toLocaleString()} FCFA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-white/60 text-sm">
              Total :{' '}
              <span className="font-bold text-orange-400">
                {price.toLocaleString()} FCFA
              </span>
            </p>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={createCampaignMutation.isPending}
            >
              {createCampaignMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Continuer'
              )}
            </Button>
          </form>
        )}

        {step === 2 && formData.ad_type === 'boost_post' && (
          <div className="space-y-4">
            <p className="text-white/80 text-sm">
              Sélectionnez la vidéo que vous souhaitez booster (sponsoriser).
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto">
              {myVideos.length === 0 && (
                <p className="col-span-2 text-white/60 text-sm py-4">
                  Aucune vidéo. Créez d&apos;abord une vidéo.
                </p>
              )}
              {myVideos.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleBoostVideoSelect(v)}
                  className={`relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-colors ${
                    selectedBoostVideo?.id === v.id
                      ? 'border-orange-500 ring-2 ring-orange-400'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <img
                    src={v.thumbnail_url || v.thumbnail || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                    <p className="text-white text-xs line-clamp-2">{v.title || v.description || 'Vidéo'}</p>
                  </div>
                  {selectedBoostVideo?.id === v.id && (
                    <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <Button
              onClick={handleBoostPostSubmit}
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={!selectedBoostVideo || addCreativeMutation.isPending}
            >
              {addCreativeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Booster cette vidéo et continuer'
              )}
            </Button>
          </div>
        )}

        {step === 2 && formData.ad_type !== 'boost_post' && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div>
              <Label className="text-white/80">Type de média</Label>
              <Select
                value={formData.media_type}
                onValueChange={handleMediaTypeChange}
              >
                <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4" /> Vidéo
                    </span>
                  </SelectItem>
                  <SelectItem value="image">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Image
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formData.media_type === 'video' && (
                <div className="mt-3">
                  <p className="text-white/60 text-sm mb-2">
                    Utilisez l&apos;écran Créer pour importer, filmer ou passer en live.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-orange-500 text-orange-400 hover:bg-orange-500/20"
                    onClick={goToCreateForVideo}
                  >
                    <Video className="w-5 h-5 mr-2" />
                    Ajouter une vidéo (écran Créer)
                  </Button>
                </div>
              )}
            </div>

            {formData.media_type === 'image' && (
              <>
                <div>
                  <Label className="text-white/80">Fichier image</Label>
                  <div className="mt-2 border-2 border-dashed border-white/30 rounded-xl p-8 text-center">
                    <input
                      type="file"
                      accept={FILE_ACCEPT_IMAGES}
                      onChange={handleMediaSelect}
                      className="hidden"
                      id="ad-media"
                    />
                    <label htmlFor="ad-media" className="cursor-pointer block">
                      {mediaFile ? (
                        <div className="space-y-2">
                          {mediaPreviewUrl && (
                            <img
                              src={mediaPreviewUrl}
                              alt="Aperçu"
                              className="max-h-48 w-full rounded-lg object-contain mx-auto bg-black/20"
                            />
                          )}
                          <p className="text-white font-medium text-sm">{mediaFile.name}</p>
                          <p className="text-white/60 text-xs">Cliquez pour changer</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-white/50 mx-auto mb-2" />
                          <p className="text-white/70">Cliquez pour télécharger</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="text-white/80">Objectif CTA (CDC §4)</Label>
                  <Select
                    value={formData.cta_type || 'visit'}
                    onValueChange={(v) => {
                      const opt = CTA_OPTIONS.find((o) => o.value === v);
                      setFormData((p) => ({
                        ...p,
                        cta_type: v,
                        cta_label: opt?.label || 'Découvrir',
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/80">Lien CTA (URL)</Label>
                  <Input
                    value={formData.cta_url}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, cta_url: e.target.value }))
                    }
                    placeholder={formData.cta_type === 'whatsapp' ? 'https://wa.me/221XXXXXXXXX' : 'https://...'}
                    className="mt-1 bg-white/10 border-white/20 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={!mediaFile || addCreativeMutation.isPending}
                >
                  {addCreativeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Ajouter le créatif'
                  )}
                </Button>
              </>
            )}
          </form>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-white font-medium">Votre campagne est prête !</p>
              <p className="text-white/70 text-sm mt-2">
                Effectuez le paiement pour soumettre à la validation. Notre équipe l&apos;examinera sous 24-48h.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Montant à payer</span>
                <span className="text-xl font-bold text-orange-400">{price.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Solde portefeuille
                </span>
                <span className="font-medium text-white">
                  {(wallet?.available_balance ?? wallet?.balance ?? 0).toLocaleString()} FCFA
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white/80 text-sm font-medium">Méthode de paiement</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-colors ${
                    paymentMethod === 'wallet'
                      ? 'border-orange-500 bg-orange-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                  }`}
                >
                  <Wallet className="w-5 h-5" />
                  Portefeuille
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('orange_money')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-colors ${
                    paymentMethod === 'orange_money'
                      ? 'border-orange-500 bg-orange-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  Orange Money
                </button>
              </div>
            </div>

            {paymentMethod === 'wallet' && (
              <>
                {(wallet?.available_balance ?? wallet?.balance ?? 0) < price && (
                  <div className="bg-amber-500/20 rounded-xl p-4 flex flex-col gap-3">
                    <CreditCard className="w-8 h-8 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-amber-200 font-medium">Solde insuffisant</p>
                      <p className="text-amber-200/80 text-sm">
                        Rechargez votre portefeuille pour continuer.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-orange-400 text-orange-300 hover:bg-orange-500/20"
                      onClick={() => {
                        const returnUrl = `${window.location.origin}${createPageUrl('CreateAdCampaign')}?campaignId=${campaignId}&step=3`;
                        sessionStorage.setItem('adCampaignRechargeReturnUrl', returnUrl);
                        navigate(createPageUrl('RechargeWallet') + `?amount=${price}&returnUrl=${encodeURIComponent(returnUrl)}`);
                      }}
                    >
                      Recharger avec Orange Money
                    </Button>
                  </div>
                )}
                <Button
                  onClick={handleStep3Submit}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={submitMutation.isPending || (wallet?.available_balance ?? wallet?.balance ?? 0) < price}
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `Payer ${price.toLocaleString()} FCFA avec le portefeuille`
                  )}
                </Button>
              </>
            )}

            {paymentMethod === 'orange_money' && (
              <Button
                onClick={() => {
                  const returnUrl = `${window.location.origin}${createPageUrl('CreateAdCampaign')}?campaignId=${campaignId}&step=3`;
                  sessionStorage.setItem('adCampaignRechargeReturnUrl', returnUrl);
                  navigate(createPageUrl('RechargeWallet') + `?amount=${price}&returnUrl=${encodeURIComponent(returnUrl)}`);
                }}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                Payer {price.toLocaleString()} FCFA avec Orange Money
              </Button>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
