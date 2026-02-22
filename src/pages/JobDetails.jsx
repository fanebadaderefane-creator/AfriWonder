import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, Clock, DollarSign, Building, Loader2, CheckCircle, Send, Heart, Flag, Star, FileUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';
import { MOCK_JOBS } from '@/data/jobsMock';

export default function JobDetails() {
  const navigate = useNavigate();
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
    queryFn: async () => {
      try {
        const data = await api.jobs.getById(jobId, true);
        if (data) return data;
      } catch (_e) {}
      const mock = MOCK_JOBS.find((j) => j.id === jobId);
      if (mock) return { ...mock, applications: mock.applications ?? [] };
      return null;
    },
    enabled: !!jobId
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastAppliedCompany, setLastAppliedCompany] = useState('');

  const userApplication = user && job?.applications?.find(a => (a.applicant_id || a.applicant?.id) === user.id);

  const applyMutation = useMutation({
    mutationFn: () => api.jobs.apply(jobId, applicationData.letter, applicationData.resumeUrl),
    onSuccess: () => {
      queryClient.invalidateQueries(['job', jobId]);
      setShowApplication(false);
      setLastAppliedCompany(job?.employer?.full_name || job?.employer?.company_profile?.company_name || 'L\'entreprise');
      setShowSuccessModal(true);
      setApplicationData({ letter: '', resumeUrl: '' });
    },
    onError: (err) => {
      const isMockJob = MOCK_JOBS.some((j) => j.id === jobId);
      if (isMockJob) {
        setLastAppliedCompany(job?.employer?.full_name || job?.employer?.company_profile?.company_name || 'L\'entreprise');
        setShowApplication(false);
        setShowSuccessModal(true);
        setApplicationData({ letter: '', resumeUrl: '' });
      } else {
        toast.error(err?.apiMessage || 'Erreur');
      }
    }
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
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-1 truncate">{job.title}</h1>
        {user && (
          <>
            <Button variant="ghost" size="icon" onClick={() => saveMutation.mutate()} title="Sauvegarder"><Heart className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setShowReport(true)} title="Signaler"><Flag className="w-5 h-5" /></Button>
          </>
        )}
      </div>

      {/* Image de couverture */}
      {(job.image || job.cover_image) && (
        <div className="w-full h-48 overflow-hidden bg-gray-100">
          <img
            src={job.image || job.cover_image}
            alt={job.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

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
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <Star className="w-3.5 h-3.5 fill-current text-[#f97316]" />
                    {Number(ratingAvg).toFixed(1)} ({ratingCount} avis)
                  </span>
                )}
                {companyProfile.is_verified && (
                  <Badge className="text-xs bg-gray-100 text-gray-700 border border-gray-200">Vérifié</Badge>
                )}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-[#f97316] text-white border-0">{job.job_type}</Badge>
              {job.is_premium && <Badge className="bg-[#f97316] text-white border-0">⭐ Premium</Badge>}
              {job.is_urgent && <Badge className="bg-[#f97316] text-white border-0">Urgent</Badge>}
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
              <DollarSign className="w-4 h-4 text-[#f97316]" />
              <span className="text-[#f97316] font-semibold">{job.salary_min.toLocaleString()} - {(job.salary_max || job.salary_min).toLocaleString()} {job.salary_currency || 'XOF'}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{daysLeft != null ? `${daysLeft} jours` : '—'}</span>
          </div>
        </div>
      </div>

      {applicationStatus && (
        <div className="bg-gray-50 border-l-4 border-[#f97316] p-4 mx-4 mt-4 rounded">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#f97316]" />
            <div>
              <p className="font-medium text-sm text-gray-900">Candidature envoyée</p>
              <p className="text-xs text-gray-600 capitalize">{applicationStatus}</p>
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
                <Star className={cn('w-8 h-8', s <= companyRating ? 'text-[#f97316] fill-[#f97316]' : 'text-gray-300')} />
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
          <Button onClick={() => setShowApplication(true)} className="w-full bg-[#f97316] hover:bg-[#ea580c] h-12 rounded-xl">
            <Send className="w-4 h-4 mr-2" /> Postuler
          </Button>
        </div>
      )}

      {/* Modal Postuler */}
      <Dialog open={showApplication} onOpenChange={setShowApplication}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Postuler — {job?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
              <p className="font-semibold text-gray-900">{job?.title}</p>
              <p className="text-sm text-gray-600">{companyName} • {job?.location || job?.country || '—'}</p>
              {(job?.salary_min != null) && (
                <p className="text-sm font-medium text-gray-800">
                  {job.salary_min.toLocaleString()} - {(job.salary_max || job.salary_min).toLocaleString()} {job.salary_currency || 'XOF'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lettre de motivation</label>
              <Textarea
                placeholder="Présentez-vous et expliquez pourquoi vous êtes le candidat idéal..."
                value={applicationData.letter}
                onChange={(e) => setApplicationData({ ...applicationData, letter: e.target.value })}
                className="min-h-[100px] rounded-lg border-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CV (PDF)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  id="cv-upload"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 5 * 1024 * 1024) setApplicationData((d) => ({ ...d, resumeUrl: f.name || '' }));
                    else if (f) toast.error('PDF max 5 Mo');
                  }}
                />
                <label htmlFor="cv-upload" className="cursor-pointer flex flex-col items-center gap-1 text-gray-500 text-sm">
                  <FileUp className="w-8 h-8" />
                  <span>Cliquez pour téléverser votre CV</span>
                  <span>PDF, max 5MB</span>
                </label>
                <input
                  type="text"
                  placeholder="Ou collez l'URL de votre CV"
                  className="mt-2 w-full text-sm border rounded px-2 py-1"
                  value={applicationData.resumeUrl}
                  onChange={(e) => setApplicationData({ ...applicationData, resumeUrl: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl h-11"
            >
              {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Envoyer ma candidature
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Candidature envoyée */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-sm rounded-2xl text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#f97316] flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Candidature envoyée !</h3>
          <p className="text-sm text-gray-600 mt-1">{lastAppliedCompany} examinera votre candidature.</p>
          <Button
            className="w-full mt-4 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-xl"
            onClick={() => setShowSuccessModal(false)}
          >
            Fermer
          </Button>
        </DialogContent>
      </Dialog>

      {!user && (
        <div className="p-4">
          <Link to={createPageUrl('Home')}><Button className="w-full bg-[#f97316] hover:bg-[#ea580c]">Se connecter pour postuler</Button></Link>
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
