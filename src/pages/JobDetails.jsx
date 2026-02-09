import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, Clock, DollarSign, Building, Loader2, CheckCircle, Send, Heart, Flag, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function JobDetails() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');
  const [user, setUser] = useState(null);
  const [showApplication, setShowApplication] = useState(false);
  const [applicationData, setApplicationData] = useState({ letter: '', resumeUrl: '' });
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [companyRating, setCompanyRating] = useState(0);
  const [companyRatingComment, setCompanyRatingComment] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.jobs.getById(jobId, true),
    enabled: !!jobId
  });

  const userApplication = user && job?.applications?.find(a => (a.applicant_id || a.applicant?.id) === user.id);

  const applyMutation = useMutation({
    mutationFn: () => api.jobs.apply(jobId, applicationData.letter, applicationData.resumeUrl),
    onSuccess: () => {
      queryClient.invalidateQueries(['job', jobId]);
      setShowApplication(false);
      setApplicationData({ letter: '', resumeUrl: '' });
      toast.success('Candidature envoyée !');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur')
  });

  const saveMutation = useMutation({
    mutationFn: () => api.jobs.save(jobId),
    onSuccess: () => { queryClient.invalidateQueries(['job', jobId]); toast.success('Offre sauvegardée'); }
  });

  const reportMutation = useMutation({
    mutationFn: () => api.jobs.report(jobId, reportReason),
    onSuccess: () => { setShowReport(false); setReportReason(''); toast.success('Signalement enregistré'); },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur')
  });

  const rateCompanyMutation = useMutation({
    mutationFn: () => api.jobs.rateCompany(job?.employer?.id, jobId, companyRating, companyRatingComment),
    onSuccess: () => {
      queryClient.invalidateQueries(['job', jobId]);
      setCompanyRating(0);
      setCompanyRatingComment('');
      toast.success('Merci pour votre avis !');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur'),
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  if (!job) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Offre introuvable</div>;
  }

  const employer = job.employer || {};
  const companyProfile = employer.company_profile || {};
  const companyName = employer.full_name || companyProfile.company_name || 'Entreprise';
  const logo = employer.profile_image || companyProfile.logo_url;
  const daysLeft = job.expires_at ? Math.ceil((new Date(job.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const applicationStatus = userApplication?.status;
  const ratingAvg = companyProfile.rating_avg ?? 0;
  const ratingCount = companyProfile.rating_count ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-1 truncate">{job.title}</h1>
        {user && (
          <>
            <Button variant="ghost" size="icon" onClick={() => saveMutation.mutate()} title="Sauvegarder"><Heart className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setShowReport(true)} title="Signaler"><Flag className="w-5 h-5" /></Button>
          </>
        )}
      </div>

      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex gap-4 mb-4">
          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {logo ? <img src={logo} alt={companyName} className="w-full h-full object-cover" /> : <Building className="w-8 h-8 text-gray-400" />}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{job.title}</h2>
            <p className="text-gray-600 text-sm mb-1">{companyName}</p>
            {(ratingCount > 0 || companyProfile.is_verified) && (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {ratingCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {Number(ratingAvg).toFixed(1)} ({ratingCount} avis)
                  </span>
                )}
                {companyProfile.is_verified && (
                  <Badge className="text-xs bg-green-100 text-green-800">Vérifié</Badge>
                )}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{job.job_type}</Badge>
              {job.is_premium && <Badge className="bg-yellow-100 text-yellow-800">⭐ Premium</Badge>}
              {job.is_urgent && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{job.location || job.country || '—'}</span>
          </div>
          {(job.salary_min != null) && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>{job.salary_min.toLocaleString()} {job.salary_currency || 'XOF'}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{daysLeft != null ? `${daysLeft} jours` : '—'}</span>
          </div>
        </div>
      </div>

      {applicationStatus && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-4 mt-4 rounded">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-sm text-blue-900">Candidature envoyée</p>
              <p className="text-xs text-blue-700 capitalize">{applicationStatus}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 border-b border-gray-100 mt-4">
        <h3 className="font-bold mb-2">À propos du poste</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
      </div>

      {userApplication && user && (
        <div className="bg-white p-4 border-b border-gray-100">
          <h3 className="font-bold mb-2">Noter cette entreprise</h3>
          <p className="text-xs text-gray-600 mb-2">Votre avis aide d'autres candidats.</p>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCompanyRating(s)}
                className="p-1 focus:outline-none"
              >
                <Star className={cn('w-8 h-8', s <= companyRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300')} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Commentaire (optionnel)"
            value={companyRatingComment}
            onChange={(e) => setCompanyRatingComment(e.target.value)}
            className="h-16 mb-2 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => rateCompanyMutation.mutate()}
            disabled={companyRating < 1 || rateCompanyMutation.isPending}
          >
            {rateCompanyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer mon avis'}
          </Button>
        </div>
      )}

      {!userApplication && user && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          {!showApplication ? (
            <Button onClick={() => setShowApplication(true)} className="w-full bg-orange-500 hover:bg-orange-600 h-12">
              <Send className="w-4 h-4 mr-2" /> Postuler
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <Textarea
                placeholder="Lettre de motivation..."
                value={applicationData.letter}
                onChange={(e) => setApplicationData({ ...applicationData, letter: e.target.value })}
                className="h-24"
              />
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="URL CV (optionnel)"
                value={applicationData.resumeUrl}
                onChange={(e) => setApplicationData({ ...applicationData, resumeUrl: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={() => setShowApplication(false)} variant="outline" className="flex-1">Annuler</Button>
                <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Envoyer
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!user && (
        <div className="p-4">
          <Link to={createPageUrl('Home')}><Button className="w-full bg-orange-500">Se connecter pour postuler</Button></Link>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <h3 className="font-bold mb-2">Signaler cette offre</h3>
            <Textarea placeholder="Motif..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={3} />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowReport(false)}>Annuler</Button>
              <Button className="flex-1" onClick={() => reportMutation.mutate()} disabled={!reportReason.trim()}>Envoyer</Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
