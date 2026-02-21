import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Search, GraduationCap, Users, Clock, Star, Play, Award, BookOpen, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import BottomNav from '../components/navigation/BottomNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'tech', label: 'Technologie' },
  { id: 'business', label: 'Business' },
  { id: 'langues', label: 'Langues' },
  { id: 'sante', label: 'Santé' },
  { id: 'art', label: 'Art' },
  { id: 'agriculture', label: 'Agriculture' },
];

// Données fictives pour que l'interface ne soit pas vide (production ready)
const MOCK_COURSES = [
  {
    id: 'mock-react',
    title: 'Développement Web avec React',
    category: 'tech',
    price: 25000,
    rating: 4.8,
    students_count: 1234,
    duration_hours: 40,
    modules_count: 12,
    thumbnail_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=240&fit=crop',
    certificate_enabled: true,
    creator: { full_name: 'Oumar Diarra' },
    _mock: true,
  },
  {
    id: 'mock-business',
    title: "Gestion d'entreprise au Mali",
    category: 'business',
    price: 15000,
    rating: 4.6,
    students_count: 892,
    duration_hours: 20,
    modules_count: 8,
    thumbnail_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=240&fit=crop',
    certificate_enabled: true,
    creator: { full_name: 'Kadiatou Coulibaly' },
    _mock: true,
  },
  {
    id: 'mock-langues',
    title: 'Anglais des affaires',
    category: 'langues',
    price: 12000,
    rating: 4.9,
    students_count: 567,
    duration_hours: 30,
    modules_count: 10,
    thumbnail_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=240&fit=crop',
    certificate_enabled: true,
    creator: { full_name: 'Mamadou Keita' },
    _mock: true,
  },
];

const PAYMENT_METHODS = [
  { id: 'orange', label: 'Orange Money', color: 'bg-orange-500' },
  { id: 'mtn', label: 'MTN', color: 'bg-yellow-400' },
  { id: 'wave', label: 'Wave', color: 'bg-blue-500' },
  { id: 'wallet', label: 'Wallet', color: 'bg-green-500' },
];

function getCategoryLabel(catId) {
  return CATEGORIES.find((c) => c.id === catId)?.label || catId;
}

export default function Courses() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrollModalCourse, setEnrollModalCourse] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successCourseTitle, setSuccessCourseTitle] = useState('');
  const [lastEnrolledCourseId, setLastEnrolledCourseId] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', selectedCategory, searchQuery],
    queryFn: async () => {
      const result = await api.courses.list({
        page: 1,
        limit: 20,
        search: searchQuery || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
      });
      return result;
    },
  });

  const { data: courseProvider } = useQuery({
    queryKey: ['course-provider-me', user?.id],
    queryFn: () => api.courses.providers.getMe(),
    enabled: !!user?.id,
    retry: false,
  });
  const isApprovedFormateur = courseProvider?.status === 'approved';

  const apiCourses = data?.courses ?? [];
  const pagination = data?.pagination ?? { total: 0 };
  const useMock = apiCourses.length === 0 && !isLoading;
  const courses = useMock ? MOCK_COURSES : apiCourses;

  const filteredCourses = searchQuery.trim()
    ? courses.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.creator?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : courses;

  const stats = useMock
    ? { courses: 200, learners: 15000, certificates: 5000 }
    : {
        courses: pagination.total,
        learners: apiCourses.reduce((acc, c) => acc + (c.students_count || 0), 0),
        certificates: 5000,
      };

  const handleEnrollClick = (course) => {
    if (!user) {
      toast.error('Connectez-vous pour vous inscrire');
      return;
    }
    setEnrollModalCourse(course);
  };

  const handlePay = async () => {
    if (!enrollModalCourse) return;
    const course = enrollModalCourse;
    setEnrollModalCourse(null);
    try {
      if (course._mock) {
        setSuccessCourseTitle(course.title);
        setLastEnrolledCourseId(course.id);
        setSuccessModalOpen(true);
        return;
      }
      const result = await api.courses.enroll(course.id, course.price > 0 ? { phone: user?.phone } : {});
      if (result?.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      setSuccessCourseTitle(course.title);
      setLastEnrolledCourseId(course.id);
      setSuccessModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Erreur');
    }
  };

  const handleStartCourse = () => {
    setSuccessModalOpen(false);
    if (lastEnrolledCourseId) {
      const isMock = MOCK_COURSES.some((c) => c.id === lastEnrolledCourseId);
      if (!isMock) navigate(`${createPageUrl('CourseDetails')}?id=${lastEnrolledCourseId}`);
      else navigate(createPageUrl('Courses'));
      setLastEnrolledCourseId(null);
    } else {
      navigate(createPageUrl('Courses'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="sticky top-0 bg-white border-b border-slate-200 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-900">Formations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Apprenez et obtenez des certificats</p>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Rechercher une formation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-slate-200"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto mt-3 pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {useMock && (
          <p className="text-sm text-slate-500 mb-4 text-center">
            Exemples de formations — les vrais cours apparaîtront une fois les formateurs approuvés par AfriWonder.
          </p>
        )}

        {/* Stats cards — AfriWonder */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
              <BookOpen className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.courses}+</p>
            <p className="text-xs text-slate-500">Cours</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.learners >= 1000 ? (stats.learners / 1000).toFixed(0) + 'K+' : stats.learners + '+'}</p>
            <p className="text-xs text-slate-500">Apprenants</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-2">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.certificates >= 1000 ? (stats.certificates / 1000).toFixed(0) + 'K+' : stats.certificates + '+'}</p>
            <p className="text-xs text-slate-500">Certificats</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune formation trouvée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-video bg-slate-200">
                  <img
                    src={course.thumbnail_url || course.thumbnail || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white">
                      {course.price > 0 ? `${(course.price || 0).toLocaleString()} FCFA` : 'Gratuit'}
                    </span>
                  </div>
                  {course.certificate_enabled !== false && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium">
                      <Award className="w-3.5 h-3.5" /> Certificat
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-7 h-7 text-orange-500 ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600 mb-2">
                    {getCategoryLabel(course.category)}
                  </span>
                  <h3 className="font-bold text-slate-900 line-clamp-2 mb-1">{course.title}</h3>
                  <p className="text-sm text-slate-500 mb-3">Par {course.creator?.full_name || course.creator?.username || 'Formateur'}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      {course.rating ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {course.students_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration_hours ?? 0} h
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-orange-600 mb-1">
                    {course.price > 0 ? `${(course.price || 0).toLocaleString()} FCFA` : 'Gratuit'}
                  </p>
                  <p className="text-xs text-slate-500 mb-3">
                    {(course.modules_count ?? course.lessons?.length ?? 0) || 0} modules
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 rounded-xl"
                      onClick={() => (course._mock ? handleEnrollClick(course) : navigate(`${createPageUrl('CourseDetails')}?id=${course.id}`))}
                    >
                      Voir
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 rounded-xl"
                      onClick={() => handleEnrollClick(course)}
                    >
                      S&apos;inscrire
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Devenir prestataire + Espace formateur — AfriWonder */}
        <div className="mt-10 space-y-4">
          <div
            className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm cursor-pointer hover:border-orange-200 transition-colors"
            onClick={() => navigate(createPageUrl('BecomeTrainer'))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(createPageUrl('BecomeTrainer'))}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-100 to-red-100 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Devenir formateur</p>
                <p className="text-sm text-slate-500">Proposez vos formations après approbation AfriWonder</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
          {user && isApprovedFormateur && (
            <Link
              to={createPageUrl('InstructorDashboard')}
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-orange-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Espace formateur</p>
                  <p className="text-sm text-slate-500">Gérez vos cours et apprenants</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
          )}
        </div>
      </div>

      {/* Modal S'inscrire — détail cours + moyens de paiement */}
      <Dialog open={!!enrollModalCourse} onOpenChange={(open) => !open && setEnrollModalCourse(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="pr-8">
              S&apos;inscrire — {enrollModalCourse?.title}
            </DialogTitle>
          </DialogHeader>
          {enrollModalCourse && (
            <>
              <p className="text-sm text-slate-500">Par {enrollModalCourse.creator?.full_name}</p>
              <p className="text-lg font-bold text-orange-600">
                {(enrollModalCourse.price || 0).toLocaleString()} FCFA
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</span>
                  {(enrollModalCourse.modules_count ?? 0) || 0} modules de cours
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</span>
                  {enrollModalCourse.duration_hours ?? 0} heures de contenu
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</span>
                  Certificat inclus
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</span>
                  Accès à vie
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</span>
                  Support instructeur
                </li>
              </ul>
              <p className="text-sm font-medium text-slate-700 mt-2">Paiement</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-orange-300 transition-colors"
                  >
                    <span className={cn('w-8 h-8 rounded-lg', pm.color)} />
                    <span className="text-sm font-medium">{pm.label}</span>
                  </button>
                ))}
              </div>
              <Button
                className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 rounded-xl py-6 text-base font-medium"
                onClick={handlePay}
              >
                Payer {(enrollModalCourse.price || 0).toLocaleString()} F CFA
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Inscription réussie */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Inscription réussie !</h3>
          <p className="text-slate-600 mt-1">Vous pouvez commencer votre formation.</p>
          <Button
            className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 rounded-xl py-6"
            onClick={handleStartCourse}
          >
            Commencer le cours
          </Button>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
