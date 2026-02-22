import React, { useState, useMemo } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import BottomNav from '../components/navigation/BottomNav';
import ProviderCard from '@/components/common/ProviderCard';
import { FICTITIOUS_FEATURED_PROVIDERS } from '@/data/marketplaceFictitiousProviders';
import { Button } from '@/components/ui/button';

const LIMIT = 100;

// Catégories comme sur la capture
const CATEGORIES = [
  { value: 'all', label: 'Toutes les catégories' },
  { value: 'cours-formation', label: 'Cours & Formation' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'design-creativite', label: 'Design & Créativité' },
  { value: 'services-domicile', label: 'Services à Domicile' },
  { value: 'informatique-tech', label: 'Informatique & Tech' },
  { value: 'sante-bien-etre', label: 'Santé & Bien-être' },
  { value: 'transport', label: 'Transport' },
  { value: 'photographie', label: 'Photographie' },
];

// Toutes les villes / régions du Mali (comme sur la capture + autres villes)
const VILLES_MALI = [
  { value: 'all', label: 'Toutes les villes' },
  { value: 'Bamako', label: 'Bamako' },
  { value: 'Sikasso', label: 'Sikasso' },
  { value: 'Mopti', label: 'Mopti' },
  { value: 'Ségou', label: 'Ségou' },
  { value: 'Kayes', label: 'Kayes' },
  { value: 'Koulikoro', label: 'Koulikoro' },
  { value: 'Gao', label: 'Gao' },
  { value: 'Tombouctou', label: 'Tombouctou' },
  { value: 'Kidal', label: 'Kidal' },
  { value: 'Ménaka', label: 'Ménaka' },
  { value: 'Taoudénit', label: 'Taoudénit' },
  { value: 'Kati', label: 'Kati' },
  { value: 'Koutiala', label: 'Koutiala' },
  { value: 'San', label: 'San' },
  { value: 'Niono', label: 'Niono' },
  { value: 'Bougouni', label: 'Bougouni' },
];

const DISPONIBILITE = [
  { value: 'all', label: 'Tous' },
  { value: 'available', label: 'Disponible' },
  { value: 'busy', label: 'Occupé' },
];

export default function Providers() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedDisponibility, setSelectedDisponibility] = useState('all');

  const { data: providersData, isLoading } = useQuery({
    queryKey: ['providers-all', selectedCategory, searchTerm, selectedCity, selectedDisponibility],
    queryFn: async () => {
      const params = {
        page: 1,
        limit: LIMIT,
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
        ...(selectedCity !== 'all' && { city: selectedCity }),
        ...(selectedDisponibility === 'available' && { availability: 'available' }),
        ...(selectedDisponibility === 'busy' && { availability: 'busy' }),
      };
      const res = await api.providers.list(params);
      const raw = res?.providers ?? res?.data ?? res;
      const list = Array.isArray(raw) ? raw : [];
      return list.filter((p) => p && (p.is_active !== false));
    },
  });

  const fromApi = Array.isArray(providersData) ? providersData : [];
  const baseList = fromApi.length > 0 ? fromApi : FICTITIOUS_FEATURED_PROVIDERS;

  const providers = useMemo(() => {
    let list = baseList;
    if (selectedCity !== 'all') {
      list = list.filter((p) => (p.city || '').toLowerCase() === selectedCity.toLowerCase());
    }
    if (selectedDisponibility === 'available') {
      list = list.filter((p) => p.is_available !== false && p.availability !== 'busy');
    }
    if (selectedDisponibility === 'busy') {
      list = list.filter((p) => p.is_available === false || p.availability === 'busy');
    }
    if (selectedCategory !== 'all') {
      const catSlug = selectedCategory;
      list = list.filter((p) => {
        const name = (p.category_name || p.service_category || p.category_id || '').toLowerCase();
        const slug = name.replace(/\s*&\s*/g, '-').replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return slug.includes(catSlug) || name.includes(catSlug.replace(/-/g, ' '));
      });
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.display_name || p.business_name || '').toLowerCase().includes(q) ||
          (p.category_name || p.service_category || '').toLowerCase().includes(q) ||
          (p.services_offered || []).some((s) => String(s).toLowerCase().includes(q))
      );
    }
    return list;
  }, [baseList, selectedCategory, selectedCity, selectedDisponibility, searchTerm]);

  const categoryMap = {};
  const count = providers.length;

  const getCategoryName = (p) =>
    categoryMap[p.category_id] ||
    p.category_name ||
    p.service_category ||
    (p.user?.service_category) ||
    '';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Flèche de retour pour faciliter la navigation */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium text-foreground">Retour</span>
        </div>
      </div>
      {/* En-tête exactement comme sur la capture : titre en haut, puis barre de recherche avec filtre */}
      <div className="bg-white shadow-sm sticky top-[57px] z-10">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-5 text-center sm:text-left">
            Rechercher un prestataire
          </h1>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Rechercher un service, un prestataire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 h-11 rounded-xl border-gray-200"
              />
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl flex-shrink-0 border-amber-300" aria-label="Filtres">
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>

          {/* Filtres : Catégorie, Ville, Disponibilité — comme sur la capture */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Catégorie</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Ville</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Toutes les villes" />
                </SelectTrigger>
                <SelectContent>
                  {VILLES_MALI.map((ville) => (
                    <SelectItem key={ville.value} value={ville.value}>{ville.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Disponibilité</label>
              <Select value={selectedDisponibility} onValueChange={setSelectedDisponibility}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  {DISPONIBILITE.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {isLoading ? "Chargement…" : `${count} prestataire${count !== 1 ? "s" : ""} trouvé${count !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={{
                  ...p,
                  display_name: p.display_name || p.user?.full_name || p.user?.username || p.business_name,
                }}
                categoryName={getCategoryName(p)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
