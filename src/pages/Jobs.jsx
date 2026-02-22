import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Search, Briefcase, MapPin, Clock, 
  DollarSign, Building
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import BottomNav from '../components/navigation/BottomNav';
import { MOCK_JOBS } from '@/data/jobsMock';

const categories = [
  { id: 'all', label: 'Tous', icon: '💼' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'commerce', label: 'Commerce', icon: '🛍️' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'construction', label: 'Construction', icon: '🏗️' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'transport', label: 'Transport', icon: '🚚' },
  { id: 'restauration', label: 'Restauration', icon: '🍽️' },
  { id: 'services', label: 'Services', icon: '🔧' }
];

export default function Jobs() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const limit = 20;
  const {
    data: listData,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['jobs-list', selectedCategory, typeFilter, countryFilter, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.jobs.list({
        page: pageParam,
        limit,
        status: 'open',
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        jobType: typeFilter === 'all' ? undefined : typeFilter,
        country: countryFilter || undefined,
        search: searchQuery || undefined,
      });
      return res;
    },
    getNextPageParam: (last) => {
      const p = last?.pagination;
      if (!p || p.page >= (p.totalPages || 1)) return undefined;
      return (p.page || 1) + 1;
    },
    initialPageParam: 1,
  });

  const apiJobs = listData?.pages?.flatMap((p) => p.jobs ?? []) ?? [];
  const jobs = apiJobs.length > 0 ? apiJobs : MOCK_JOBS;
  const totalJobs = listData?.pages?.[0]?.pagination?.total ?? jobs.length;

  const { data: recommended = [] } = useQuery({
    queryKey: ['jobs-recommended'],
    queryFn: () => api.jobs.getRecommended(8),
    enabled: !!user
  });

  const filteredJobs = jobs.filter((j) => {
    const matchSearch =
      !searchQuery ||
      j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.employer?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || j.job_type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeLabel = (type) => {
    const labels = {
      'temps_plein': 'Temps plein',
      'temps_partiel': 'Temps partiel',
      'freelance': 'Freelance',
      'stage': 'Stage',
      'alternance': 'Alternance',
      'contrat': 'Contrat',
      'full_time': 'Temps plein',
      'part_time': 'Temps partiel',
      'remote': 'Télétravail',
      'cdi': 'CDI',
      'cdd': 'CDD',
    };
    return labels[type] || type;
  };

  const countries = ['', 'SN', 'CI', 'CM', 'ML', 'BF', 'TG', 'NE', 'BJ', 'FR'];

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Offres d'emploi</h1>
            <p className="text-sm text-gray-500">Trouvez votre prochain emploi</p>
          </div>
          {user && (
            <div className="ml-auto flex gap-2 flex-wrap justify-end">
              <Link to={createPageUrl('CandidateProfile')}><Button size="sm" variant="ghost">Profil candidat</Button></Link>
              <Link to={createPageUrl('CompanyProfile')}><Button size="sm" variant="ghost">Profil entreprise</Button></Link>
              <Link to={createPageUrl('JobsEmployerDashboard')}><Button size="sm" variant="outline">Dashboard</Button></Link>
              <Link to={createPageUrl('PostJob')}>
                <Button size="sm" className="bg-[#2563EB] hover:bg-[#1E3A8A] text-white">
                  <Briefcase className="w-4 h-4 mr-1" />
                  Publier
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Poste, entreprise, compétence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat.id
                  ? "bg-[#2563EB] text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter — Tous, CDI, CDD, Freelance, Stage, Alternance */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'cdi', label: 'CDI' },
          { id: 'cdd', label: 'CDD' },
          { id: 'freelance', label: 'Freelance' },
          { id: 'stage', label: 'Stage' },
          { id: 'alternance', label: 'Alternance' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              typeFilter === t.id ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Recommandées */}
      {user && recommended?.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Recommandées pour vous</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommended.slice(0, 4).map((j) => (
              <Link key={j.id} to={`${createPageUrl('JobDetails')}?id=${j.id}`} className="flex-shrink-0 w-56 bg-white rounded-xl p-3 shadow-sm text-gray-900 hover:text-gray-900 no-underline">
                <p className="font-medium text-sm line-clamp-2">{j.title}</p>
                <p className="text-xs text-gray-500 mt-1">{j.employer?.full_name}</p>
                <p className="text-xs text-[#2563EB] mt-1">{j._count?.applications ?? 0} candidatures</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats — neutre + orange AfriWonder uniquement */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-xl font-bold text-[#2563EB]">{filteredJobs.length}</div>
          <div className="text-xs text-gray-500">Offres actives</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-xl font-bold text-gray-800">
            {apiJobs.length > 0 ? new Set(jobs.map((j) => j.employer?.full_name).filter(Boolean)).size : '120+'}
          </div>
          <div className="text-xs text-gray-500">Entreprises</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
          <div className="text-xl font-bold text-gray-800">
            {apiJobs.length > 0 ? jobs.reduce((acc, j) => acc + (j._count?.applications ?? 0), 0) : '5K+'}
          </div>
          <div className="text-xs text-gray-500">Candidatures</div>
        </div>
      </div>

      {/* Jobs List — disposition verticale mobile 📱 */}
      <div className="w-full px-4 pb-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="w-full flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full bg-white rounded-xl p-4 animate-pulse">
                <div className="flex flex-col gap-3">
                  <div className="w-full h-40 bg-gray-200 rounded-lg" />
                  <div className="w-16 h-16 rounded-lg bg-gray-200" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune offre trouvée</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const daysLeft = job.expires_at ? Math.ceil((new Date(job.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const appCount = job._count?.applications ?? 0;
            const companyName = job.employer?.full_name || 'Entreprise';
            const logo = job.employer?.profile_image || job.employer?.company_profile?.logo_url;
            return (
              <Link key={job.id} to={`${createPageUrl('JobDetails')}?id=${job.id}`} className="block w-full text-gray-900 hover:text-gray-900 no-underline">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-full">
                  {/* Image de couverture */}
                  {(job.image || job.cover_image) && (
                    <div className="w-full h-40 overflow-hidden bg-gray-100">
                      <img
                        src={job.image || job.cover_image}
                        alt={job.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-3">
                    {/* Logo et titre — entièrement vertical */}
                    <div className="flex flex-col items-start gap-2">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                        {logo ? <img src={logo} alt={companyName} className="w-full h-full object-cover" /> : <Building className="w-8 h-8 text-gray-400" />}
                      </div>
                      <div className="w-full">
                        <h3 className="font-bold text-lg mb-1 text-gray-900">{job.title}</h3>
                        <p className="text-sm text-gray-600">{companyName}</p>
                      </div>
                    </div>

                    {/* Badges type et statut — neutre + orange AfriWonder uniquement */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className="text-xs bg-[#2563EB] text-white border-0">{getTypeLabel(job.job_type)}</Badge>
                      {job.location && <Badge variant="outline" className="text-xs border-gray-200 text-gray-600"><MapPin className="w-3 h-3 mr-1" />{job.location}</Badge>}
                      {job.job_type === 'remote' && <Badge variant="outline" className="text-xs border-gray-200 text-gray-600">🌐 Remote</Badge>}
                      {job.is_premium && <Badge className="text-xs bg-[#2563EB] text-white border-0">⭐ Premium</Badge>}
                      {job.is_urgent && <Badge className="text-xs bg-[#2563EB] text-white border-0">Urgent</Badge>}
                    </div>

                    {/* Compétences */}
                    {job.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 4).map((s) => (
                          <Badge key={s} variant="outline" className="text-xs font-normal">{s}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Salaire — orange AfriWonder */}
                    {(job.salary_min != null) && (
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-[#2563EB] font-semibold">{job.salary_min.toLocaleString()} - {(job.salary_max || job.salary_min).toLocaleString()} {job.salary_currency || 'XOF'}</span>
                      </div>
                    )}

                    {/* Date de publication */}
                    {(job.created_at || job.posted_at) && (
                      <p className="text-xs text-gray-500">
                        {new Date(job.created_at || job.posted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}

                    {/* Footer: candidatures et jours restants — neutre */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                      <span>{appCount} candidatures</span>
                      {daysLeft != null && daysLeft > 0 && (
                        <span className={cn("flex items-center gap-1", daysLeft <= 3 && "text-[#2563EB] font-medium")}>
                          <Clock className="w-3 h-3" /> {daysLeft} jours restants
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })
        )}
        {hasNextPage && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="min-w-[140px]"
            >
              {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
