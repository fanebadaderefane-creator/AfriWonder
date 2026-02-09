import React, { useEffect, useState } from 'react';
import { api } from '@/api/expressClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Award,
  DollarSign,
  BookOpen,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import BottomNav from '@/components/navigation/BottomNav';

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        const data = await api.courses.getInstructorDashboard();
        setDashboard(data);
      } catch (e) {
        setError(e?.response?.data?.error?.message || 'Erreur chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">{error || 'Non connecté'}</p>
        <Button variant="outline" onClick={() => navigate(createPageUrl('Courses'))}>
          Retour aux cours
        </Button>
      </div>
    );
  }

  const d = dashboard || {};
  const totalRevenue = d.total_revenue ?? 0;
  const totalStudents = d.total_students ?? 0;
  const totalCompletions = d.total_completions ?? 0;
  const completionRate = d.completion_rate ?? 0;
  const courses = d.courses ?? [];
  const recentEnrollments = d.recent_enrollments ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-40 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Dashboard instructeur</h1>
          <Button
            size="sm"
            className="ml-auto bg-orange-500 hover:bg-orange-600"
            onClick={() => navigate(createPageUrl('CreateCourse'))}
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Créer un cours
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">Revenus totaux</span>
              </div>
              <p className="text-xl font-bold text-orange-600">
                {totalRevenue.toLocaleString('fr-FR')} FCFA
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Étudiants</span>
              </div>
              <p className="text-xl font-bold">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs font-medium">Complétions</span>
              </div>
              <p className="text-xl font-bold text-green-600">{totalCompletions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Taux complétion</span>
              </div>
              <p className="text-xl font-bold">{completionRate}%</p>
              <Progress value={completionRate} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Cours avec stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mes cours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {courses.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun cours créé</p>
            ) : (
              courses.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.students_count} inscrits · {c.completions} complétés · {c.completion_rate}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {(c.revenue ?? 0).toLocaleString('fr-FR')} FCFA
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate(`${createPageUrl('CourseDetails')}?id=${c.id}`)}
                    >
                      Voir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Inscriptions récentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Inscriptions récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEnrollments.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune inscription récente</p>
            ) : (
              <ul className="space-y-2">
                {recentEnrollments.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm">
                    <img
                      src={e.user?.profile_image || 'https://via.placeholder.com/32'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {e.user?.full_name || e.user?.username || 'Utilisateur'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{e.course?.title}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
