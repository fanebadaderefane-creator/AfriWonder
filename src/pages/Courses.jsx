import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, Search, GraduationCap, Users, Clock, 
  Star, Play
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import BottomNav from '../components/navigation/BottomNav';

const categories = [
  { id: 'all', label: 'Tous', icon: '🌍' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'tech', label: 'Technologie', icon: '💻' },
  { id: 'langues', label: 'Langues', icon: '🗣️' },
  { id: 'artisanat', label: 'Artisanat', icon: '🎨' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'education', label: 'Éducation', icon: '📚' },
  { id: 'finance', label: 'Finance', icon: '💰' }
];

export default function Courses() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sort, setSort] = useState('popular');
  const [priceFilter, setPriceFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', selectedCategory, levelFilter, sort, priceFilter, searchQuery, page],
    queryFn: async () => {
      const result = await api.courses.list({
        page,
        limit: 20,
        search: searchQuery || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        level: levelFilter === 'all' ? undefined : levelFilter,
        sort,
        price: priceFilter,
      });
      return result;
    }
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['courses-recommendations', user?.id],
    queryFn: () => api.courses.getRecommendations(10),
    enabled: !!user?.id
  });

  const courses = data?.courses ?? [];
  const pagination = data?.pagination ?? { total: 0, totalPages: 0 };
  const filteredCourses = courses;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Cours en ligne</h1>
          {user && (
            <Link to={createPageUrl('CreateCourse')} className="ml-auto">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <GraduationCap className="w-4 h-4 mr-1" />
                Créer
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un cours..."
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

      {/* Filters: Level, Sort, Price */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
        <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Niveau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les niveaux</SelectItem>
            <SelectItem value="debutant">🌱 Débutant</SelectItem>
            <SelectItem value="intermediaire">📈 Intermédiaire</SelectItem>
            <SelectItem value="avance">🏆 Avancé</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Populaires</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
              <SelectItem value="newest">Récents</SelectItem>
              <SelectItem value="price_low">Prix croissant</SelectItem>
              <SelectItem value="price_high">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priceFilter} onValueChange={(v) => { setPriceFilter(v); setPage(1); }}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="free">Gratuits</SelectItem>
              <SelectItem value="paid">Payants</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recommandé pour vous */}
      {user && Array.isArray(recommendations) && recommendations.length > 0 && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Recommandé pour vous</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recommendations.slice(0, 6).map((course) => (
              <Link
                key={course.id}
                to={`${createPageUrl('CourseDetails')}?id=${course.id}`}
                className="flex-shrink-0 w-40"
              >
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="aspect-video bg-gray-200 relative">
                    <img
                      src={course.thumbnail_url || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400'}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {course.price === 0 && (
                      <Badge className="absolute top-1 left-1 bg-green-500 text-white border-0 text-xs">Gratuit</Badge>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-medium text-xs line-clamp-2">{course.title}</p>
                    <p className="text-xs text-gray-500">{course.creator?.full_name || course.creator?.username || ''}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats Banner */}
      <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 text-white">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{pagination.total}</div>
            <div className="text-xs text-white/80">Cours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {courses.reduce((acc, c) => acc + (c.students_count || 0), 0)}
            </div>
            <div className="text-xs text-white/80">Apprenants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {courses.filter(c => c.price === 0).length}
            </div>
            <div className="text-xs text-white/80">Gratuits</div>
          </div>
        </div>
      </div>

      {/* Courses List */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-_t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun cours trouvé</p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <Link
              key={course.id}
              to={`${createPageUrl('CourseDetails')}?id=${course.id}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="relative w-32 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                    <img
                      src={course.thumbnail_url || course.thumbnail || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400'}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {course.price === 0 && (
                      <Badge className="absolute top-2 left-2 bg-green-500 text-white border-0 text-xs">
                        GRATUIT
                      </Badge>
                    )}
                    {course.trailer_url && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1 line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">{course.description}</p>

                    {/* Instructor */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <img
                        src={course.creator?.profile_image || course.instructor_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                        alt={course.creator?.full_name || course.instructor_name}
                        className="w-4 h-4 rounded-full"
                      />
                      <span>{course.creator?.full_name || course.creator?.username || course.instructor_name || 'Instructeur'}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{course.rating ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{course.students_count ?? course.enrolled_count ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{course.duration_hours ?? 0}h</span>
                      </div>
                    </div>

                    {/* Price */}
                    {course.price > 0 && (
                      <div className="mt-2">
                        <span className="font-bold text-orange-500">{course.price.toLocaleString()} FCFA</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))
        )}
        {!isLoading && pagination.totalPages > 1 && page < pagination.totalPages && (
          <div className="text-center py-4">
            <Button variant="outline" onClick={() => setPage(p => p + 1)}>
              Charger plus
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

