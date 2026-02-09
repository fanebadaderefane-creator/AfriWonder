import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Search, Briefcase, MapPin, Clock, 
  DollarSign, Building
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import BottomNav from '../components/navigation/BottomNav';

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

  const jobs = listData?.pages?.flatMap((p) => p.jobs ?? []) ?? [];
  const totalJobs = listData?.pages?.[0]?.pagination?.total ?? 0;

  const { data: recommended = [] } = useQuery({
    queryKey: ['jobs-recommended'],
    queryFn: () => api.jobs.getRecommended(8),
    enabled: !!user
  });

  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.employer?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeLabel = (type) => {
    const labels = {
      'temps_plein': '⏰ Temps plein',
      'temps_partiel': '⏱️ Temps partiel',
      'freelance': '💼 Freelance',
      'stage': '🎓 Stage',
      'contrat': '📝 Contrat',
      'full_time': '⏰ Temps plein',
      'part_time': '⏱️ Temps partiel',
      'remote': '🌐 Télétravail'
    };
    return labels[type] || type;
  };

  const countries = ['', 'SN', 'CI', 'CM', 'ML', 'BF', 'TG', 'NE', 'BJ', 'FR'];

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Offres d'emploi</h1>
          {user && (
            <div className="ml-auto flex gap-2 flex-wrap justify-end">
              <Link to={createPageUrl('CandidateProfile')}><Button size="sm" variant="ghost">Profil candidat</Button></Link>
              <Link to={createPageUrl('CompanyProfile')}><Button size="sm" variant="ghost">Profil entreprise</Button></Link>
              <Link to={createPageUrl('JobsEmployerDashboard')}><Button size="sm" variant="outline">Dashboard</Button></Link>
              <Link to={createPageUrl('PostJob')}>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
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
            placeholder="Rechercher un emploi..."
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
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Type & Country Filter */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="temps_plein">⏰ Temps plein</SelectItem>
            <SelectItem value="temps_partiel">⏱️ Temps partiel</SelectItem>
            <SelectItem value="freelance">💼 Freelance</SelectItem>
            <SelectItem value="stage">🎓 Stage</SelectItem>
            <SelectItem value="contrat">📝 Contrat</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter || 'all'} onValueChange={(v) => setCountryFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries.filter(Boolean).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recommandées */}
      {user && recommended?.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Recommandées pour vous</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommended.slice(0, 4).map((j) => (
              <Link key={j.id} to={`${createPageUrl('JobDetails')}?id=${j.id}`} className="flex-shrink-0 w-56 bg-white rounded-xl p-3 shadow-sm">
                <p className="font-medium text-sm line-clamp-2">{j.title}</p>
                <p className="text-xs text-gray-500 mt-1">{j.employer?.full_name}</p>
                <p className="text-xs text-orange-600 mt-1">{j._count?.applications ?? 0} candidatures</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 text-white">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{jobs.length}</div>
            <div className="text-xs text-white/80">Offres</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{jobs.filter(j => j.job_type === 'remote' || j.job_type?.includes('remote')).length}</div>
            <div className="text-xs text-white/80">Remote</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{jobs.reduce((acc, j) => acc + (j._count?.applications ?? 0), 0)}</div>
            <div className="text-xs text-white/80">Candidatures</div>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                  </div>
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
              <Link key={job.id} to={`${createPageUrl('JobDetails')}?id=${job.id}`}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {logo ? <img src={logo} alt={companyName} className="w-full h-full object-cover" /> : <Building className="w-6 h-6 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm mb-1">{job.title}</h3>
                      <p className="text-xs text-gray-600 mb-2">{companyName}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">{getTypeLabel(job.job_type)}</Badge>
                        {job.job_type === 'remote' && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">🌐 Remote</Badge>}
                        {job.is_premium && <Badge className="text-xs bg-yellow-500 text-white">⭐ Premium</Badge>}
                        {job.is_urgent && <Badge className="text-xs bg-red-100 text-red-700">Urgent</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{job.location || job.country || '—'}</span>
                        </div>
                        {(job.salary_min != null) && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{job.salary_min.toLocaleString()} - {(job.salary_max || job.salary_min).toLocaleString()} {job.salary_currency || 'XOF'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{appCount} candidatures</span>
                        {daysLeft != null && daysLeft > 0 && (
                          <span className={cn("flex items-center gap-1", daysLeft <= 3 && "text-red-500 font-medium")}>
                            <Clock className="w-3 h-3" /> {daysLeft} jours
                          </span>
                        )}
                      </div>
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

