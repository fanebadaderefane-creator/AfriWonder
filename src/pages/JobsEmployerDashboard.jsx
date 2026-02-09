import React, { useEffect, useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Eye, FileText, Briefcase, TrendingUp, Loader2, Download, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomNav from '../components/navigation/BottomNav';

export default function JobsEmployerDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['jobs-employer-dashboard'],
    queryFn: () => api.jobs.getEmployerDashboard(),
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-500">Connectez-vous pour accéder au dashboard.</p>
      </div>
    );
  }

  const jobs = dashboard?.jobs ?? [];
  const totalViews = dashboard?.totalViews ?? 0;
  const totalApplications = dashboard?.totalApplications ?? 0;
  const conversionRate = dashboard?.conversionRate ?? 0;
  const statusBreakdown = dashboard?.applicationStatusBreakdown ?? {};

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Dashboard employeur</h1>
        <Link to={createPageUrl('PostJob')} className="ml-auto">
          <Button size="sm" className="bg-orange-500">Publier une offre</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : (
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalViews}</p>
                <p className="text-xs text-gray-600">Vues</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalApplications}</p>
                <p className="text-xs text-gray-600">Candidatures</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 col-span-2">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-gray-600">Taux de conversion (candidatures / vues)</p>
              </div>
            </div>
          </div>

          {(statusBreakdown.pending > 0 || statusBreakdown.reviewed > 0 || statusBreakdown.accepted > 0 || statusBreakdown.rejected > 0) && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-2">Statut des candidatures</h3>
              <div className="flex flex-wrap gap-2">
                {statusBreakdown.pending > 0 && <Badge variant="secondary">En attente: {statusBreakdown.pending}</Badge>}
                {statusBreakdown.reviewed > 0 && <Badge className="bg-blue-100 text-blue-800">Vues: {statusBreakdown.reviewed}</Badge>}
                {statusBreakdown.accepted > 0 && <Badge className="bg-green-100 text-green-800">Acceptées: {statusBreakdown.accepted}</Badge>}
                {statusBreakdown.rejected > 0 && <Badge className="bg-red-100 text-red-800">Refusées: {statusBreakdown.rejected}</Badge>}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <h3 className="font-semibold p-4 border-b">Vos offres</h3>
            {jobs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune offre publiée.</p>
                <Link to={createPageUrl('PostJob')}><Button className="mt-3 bg-orange-500">Publier une offre</Button></Link>
              </div>
            ) : (
              <ul className="divide-y">
                {jobs.map((j) => (
                  <li key={j.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{j.title}</p>
                        <p className="text-sm text-gray-500">{j.views_count ?? 0} vues · {j.applications_count ?? 0} candidatures</p>
                      </div>
                      <Link to={`${createPageUrl('JobDetails')}?id=${j.id}`}>
                        <Button size="sm" variant="outline">Voir offre</Button>
                      </Link>
                    </div>
                    {j.applications?.length > 0 && (
                      <div className="mt-3 pl-2 border-l-2 border-orange-200 space-y-2">
                        <p className="text-xs font-medium text-gray-600">Candidatures</p>
                        {j.applications.map((app) => (
                          <div key={app.id} className="flex items-center justify-between gap-2 py-2 pr-2 bg-gray-50 rounded-lg px-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {app.applicant?.profile_image ? (
                                <img src={app.applicant.profile_image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4 text-gray-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{app.applicant?.full_name ?? 'Candidat'}</p>
                                <p className="text-xs text-gray-500 capitalize">{app.status}</p>
                              </div>
                            </div>
                            {app.resume_url ? (
                              <a
                                href={app.resume_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-1 text-xs text-orange-600 hover:underline"
                              >
                                <Download className="w-3.5 h-3.5" />
                                CV
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 shrink-0">Pas de CV</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
