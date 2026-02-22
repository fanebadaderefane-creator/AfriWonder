import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Compass, Target, TrendingUp, Wallet, Briefcase, GraduationCap, Store, Sparkles, Building2, CreditCard, Bot, ShieldCheck, AlertTriangle, MapPin, Award } from 'lucide-react';
import { api } from '@/api/expressClient';
import { createPageUrl } from '@/utils';
import { getJSON, setJSON } from '@/utils/safeStorage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/navigation/BottomNav';
import { toast } from 'sonner';

const STORAGE_KEY = 'afw_journey_profile_v1';

const goals = [
  { value: 'earn_money', label: "Gagner de l'argent" },
  { value: 'learn', label: 'Apprendre' },
  { value: 'find_job', label: 'Trouver emploi' },
  { value: 'entrepreneur', label: 'Entreprendre' },
];

const levels = [
  { value: 'beginner', label: 'Debutant' },
  { value: 'intermediate', label: 'Intermediaire' },
  { value: 'advanced', label: 'Avance' },
];

const availabilities = [
  { value: 'immediate', label: 'Immediate' },
  { value: '2weeks', label: '2 semaines' },
  { value: '1month', label: '1 mois' },
  { value: 'custom', label: 'Personnalisee' },
];

function moduleIcon(moduleName) {
  if (moduleName === 'jobs') return Briefcase;
  if (moduleName === 'courses') return GraduationCap;
  if (moduleName === 'marketplace') return Store;
  if (moduleName === 'microcredit') return Wallet;
  return Compass;
}

function moduleRoute(moduleName) {
  if (moduleName === 'jobs') return createPageUrl('Jobs');
  if (moduleName === 'courses') return createPageUrl('Courses');
  if (moduleName === 'marketplace') return createPageUrl('Marketplace');
  if (moduleName === 'microcredit') return createPageUrl('Microcredit');
  if (moduleName === 'services') return createPageUrl('Marketplace');
  return createPageUrl('Home');
}

export default function MatchingCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() =>
    getJSON(STORAGE_KEY, {
      goal: 'earn_money',
      level: 'beginner',
      location: '',
      skillsInput: '',
      interestsInput: '',
      availability: 'immediate',
      financialGoal: '',
    })
  );
  const [journeyPreview, setJourneyPreview] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [coachInput, setCoachInput] = useState('');
  const [kpiWindowDays, setKpiWindowDays] = useState('30');

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/Landing', { replace: true }));
  }, [navigate]);

  const onboardingQuery = useQuery({
    queryKey: ['matching-onboarding', user?.id],
    queryFn: () => api.matching.getOnboarding(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!onboardingQuery.data) return;
    const data = onboardingQuery.data;
    setProfile((prev) => ({
      ...prev,
      goal: data.goal || prev.goal,
      level: data.level || prev.level,
      location: data.location || prev.location,
      skillsInput: Array.isArray(data.skills) ? data.skills.join(', ') : prev.skillsInput,
      interestsInput: Array.isArray(data.interests) ? data.interests.join(', ') : prev.interestsInput,
      availability: data.availability || prev.availability,
      financialGoal: data.financialGoal ? String(data.financialGoal) : prev.financialGoal,
    }));
  }, [onboardingQuery.data]);

  const dashboardQuery = useQuery({
    queryKey: ['matching-dashboard', user?.id],
    queryFn: () => api.matching.getDashboard(),
    enabled: !!user,
  });

  const kpiSummaryQuery = useQuery({
    queryKey: ['matching-kpi-summary', user?.id, kpiWindowDays],
    queryFn: () => api.matching.getKpiSummary(Number(kpiWindowDays)),
    enabled: !!user,
  });

  const interconnectionsQuery = useQuery({
    queryKey: ['matching-interconnections'],
    queryFn: () => api.matching.getInterconnections(),
    enabled: !!user,
  });

  const opportunitiesQuery = useQuery({
    queryKey: ['matching-opportunities', user?.id],
    queryFn: async () => {
      const data = await api.matching.getOpportunities(20);
      setOpportunities(data?.opportunities || []);
      return data;
    },
    enabled: !!user,
  });

  const walletQuery = useQuery({
    queryKey: ['matching-wallet', user?.id],
    queryFn: () => api.payments.getWallet(),
    enabled: !!user,
  });

  const transactionsQuery = useQuery({
    queryKey: ['matching-transactions', user?.id],
    queryFn: () => api.payments.getTransactions({ page: 1, limit: 50 }),
    enabled: !!user,
  });

  const disputesQuery = useQuery({
    queryKey: ['matching-disputes', user?.id],
    queryFn: () => api.disputes.list({ as: 'buyer' }),
    enabled: !!user,
  });

  const recruiterDashboardQuery = useQuery({
    queryKey: ['matching-recruiter-dashboard', user?.id],
    queryFn: async () => {
      try {
        return await api.jobs.getEmployerDashboard();
      } catch (_error) {
        return null;
      }
    },
    enabled: !!user,
    retry: false,
  });

  const coachQuery = useQuery({
    queryKey: ['matching-coach', user?.id],
    queryFn: () => api.matching.getCoach(),
    enabled: !!user,
  });

  const coachHistoryQuery = useQuery({
    queryKey: ['matching-coach-history', user?.id],
    queryFn: () => api.matching.getCoachHistory(12),
    enabled: !!user,
  });

  const trustStatusQuery = useQuery({
    queryKey: ['matching-trust-status', user?.id],
    queryFn: () => api.matching.getTrustStatus(),
    enabled: !!user,
  });

  const localizationQuery = useQuery({
    queryKey: ['matching-localization', user?.id],
    queryFn: () => api.matching.getLocalization(),
    enabled: !!user,
  });

  const progressionQuery = useQuery({
    queryKey: ['matching-progression', user?.id],
    queryFn: () => api.matching.getProgression(),
    enabled: !!user,
  });

  const smartNotificationsQuery = useQuery({
    queryKey: ['matching-smart-notifications', user?.id],
    queryFn: () => api.matching.getSmartNotifications(),
    enabled: !!user,
  });

  const previewMutation = useMutation({
    mutationFn: async (payload) => {
      const [savedProfile, preview, opportunitiesData] = await Promise.all([
        api.matching.saveOnboarding(payload),
        api.matching.previewJourney(payload),
        api.matching.getOpportunitiesWithProfile(payload, 20),
      ]);
      return { savedProfile, preview, opportunitiesData };
    },
    onSuccess: ({ savedProfile, preview, opportunitiesData }) => {
      if (savedProfile) {
        setProfile((p) => ({
          ...p,
          availability: savedProfile.availability || p.availability,
        }));
      }
      setJourneyPreview(preview);
      setOpportunities(opportunitiesData?.opportunities || []);
      toast.success('Parcours mis a jour');
    },
    onError: (error) => {
      toast.error(error?.apiMessage || error?.message || 'Erreur lors de la generation du parcours');
    },
  });

  const quickPayMutation = useMutation({
    mutationFn: async (amount) => api.payments.addToWallet(amount, 'Recharge 1-clic Parcours Intelligent'),
    onSuccess: () => {
      toast.success('Paiement 1-clic effectue');
      queryClient.invalidateQueries({ queryKey: ['matching-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['matching-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['matching-dashboard'] });
    },
    onError: (error) => {
      toast.error(error?.apiMessage || error?.message || 'Paiement 1-clic indisponible');
    },
  });

  const coachChatMutation = useMutation({
    mutationFn: async (message) => api.matching.chatWithCoach(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-coach-history'] });
      queryClient.invalidateQueries({ queryKey: ['matching-coach'] });
      setCoachInput('');
    },
    onError: (error) => {
      toast.error(error?.apiMessage || error?.message || 'Message coach impossible');
    },
  });

  const canSubmit = useMemo(() => {
    return !!profile.goal && !!profile.level;
  }, [profile.goal, profile.level]);

  const quickPayAmount = useMemo(() => {
    const financialGoal = Number(profile.financialGoal || onboardingQuery.data?.financialGoal || 0);
    if (!Number.isFinite(financialGoal) || financialGoal <= 0) return 1000;
    const suggested = Math.round(financialGoal * 0.01);
    return Math.min(25000, Math.max(1000, suggested));
  }, [profile.financialGoal, onboardingQuery.data?.financialGoal]);

  const escrowStats = useMemo(() => {
    const txRaw = transactionsQuery.data?.transactions;
    const txList = Array.isArray(txRaw) ? txRaw : [];
    const disputesList = Array.isArray(disputesQuery.data) ? disputesQuery.data : [];

    const inEscrow = txList.filter((tx) => String(tx?.status || '').toLowerCase() === 'pending').length;
    const released = txList.filter((tx) => String(tx?.status || '').toLowerCase() === 'completed').length;
    const disputed = disputesList.filter((d) => {
      const status = String(d?.status || '').toLowerCase();
      return status === 'open' || status === 'pending' || status === 'in_progress';
    }).length;
    return { inEscrow, released, disputed };
  }, [transactionsQuery.data, disputesQuery.data]);

  const handleGenerate = () => {
    if (!canSubmit) return;
    const payload = {
      goal: profile.goal,
      level: profile.level,
      location: profile.location?.trim() || undefined,
      availability: profile.availability || undefined,
      financialGoal: profile.financialGoal ? Number(profile.financialGoal) : undefined,
      skills: profile.skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      interests: profile.interestsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setJSON(STORAGE_KEY, profile);
    previewMutation.mutate(payload);
  };

  const handleOpenOpportunity = async (op) => {
    try {
      await api.matching.trackOpportunityAction({
        opportunityId: op.id,
        module: op.module,
        action: 'open',
      });
    } catch (_error) {
      // Keep navigation fast even if tracking fails.
    }
    navigate(moduleRoute(op.module));
  };

  const trendClass = (value) => {
    if (value > 0) return 'text-emerald-600';
    if (value < 0) return 'text-rose-600';
    return 'text-slate-500';
  };

  const trendLabel = (value) => {
    if (!Number.isFinite(value)) return '0%';
    return `${value > 0 ? '+' : ''}${Math.round(value)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Parcours Intelligent</h1>
            <p className="text-xs text-slate-500">Onboarding, progression et opportunites pour toi</p>
          </div>
          <Badge className="bg-blue-600 text-white border-0">Phase 2</Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Target className="w-5 h-5" />
              Onboarding Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Objectif principal</Label>
                <Select value={profile.goal} onValueChange={(v) => setProfile((p) => ({ ...p, goal: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir un objectif" /></SelectTrigger>
                  <SelectContent>
                    {goals.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Niveau</Label>
                <Select value={profile.level} onValueChange={(v) => setProfile((p) => ({ ...p, level: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Niveau" /></SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Competences (tags, virgule)</Label>
                <Input
                  className="mt-1.5"
                  value={profile.skillsInput}
                  onChange={(e) => setProfile((p) => ({ ...p, skillsInput: e.target.value }))}
                  placeholder="design, vente, marketing"
                />
              </div>
              <div>
                <Label>Interets (tags, virgule)</Label>
                <Input
                  className="mt-1.5"
                  value={profile.interestsInput}
                  onChange={(e) => setProfile((p) => ({ ...p, interestsInput: e.target.value }))}
                  placeholder="digital, education, business"
                />
              </div>
              <div>
                <Label>Localisation</Label>
                <Input
                  className="mt-1.5"
                  value={profile.location}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Bamako"
                />
              </div>
              <div>
                <Label>Objectif financier (optionnel)</Label>
                <Input
                  type="number"
                  className="mt-1.5"
                  value={profile.financialGoal}
                  onChange={(e) => setProfile((p) => ({ ...p, financialGoal: e.target.value }))}
                  placeholder="250000"
                />
              </div>
              <div>
                <Label>Disponibilite</Label>
                <Select value={profile.availability} onValueChange={(v) => setProfile((p) => ({ ...p, availability: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Disponibilite" /></SelectTrigger>
                  <SelectContent>
                    {availabilities.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={previewMutation.isPending || !canSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {previewMutation.isPending ? 'Generation...' : 'Generer mon parcours'}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Activation</p>
              <p className="text-2xl font-bold">{dashboardQuery.data?.kpi?.activation ? 'Oui' : 'Non'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Engagement</p>
              <p className="text-2xl font-bold">{dashboardQuery.data?.kpi?.engagement ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Matching Success</p>
              <p className="text-2xl font-bold">{Math.round(dashboardQuery.data?.kpi?.matchingSuccessRate ?? 0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Progression</p>
              <p className="text-2xl font-bold">{Math.round(dashboardQuery.data?.kpi?.progressionPercent ?? 0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Revenus generes</p>
              <p className="text-2xl font-bold">{Math.round(dashboardQuery.data?.kpi?.revenuesGenerated ?? 0).toLocaleString('fr-FR')} XOF</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Opportunites disponibles</p>
              <p className="text-2xl font-bold">{Math.round(dashboardQuery.data?.kpi?.opportunitiesAvailable ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Conversion revenu</p>
              <p className="text-2xl font-bold">{Math.round(dashboardQuery.data?.kpi?.conversionRevenueRate ?? 0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Retention D7</p>
              <p className="text-2xl font-bold">{Math.round(dashboardQuery.data?.kpi?.retentionD7 ?? 0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Retention D30</p>
              <p className="text-2xl font-bold">{Math.round(dashboardQuery.data?.kpi?.retentionD30 ?? 0)}%</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Pilotage KPI
              </span>
              <div className="w-[140px]">
                <Select value={kpiWindowDays} onValueChange={setKpiWindowDays}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Fenetre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="rounded-lg border bg-white p-2">
                <p className="text-[11px] text-slate-500">Activation</p>
                <p className="text-lg font-bold">{Math.round(kpiSummaryQuery.data?.current?.activationRate ?? 0)}%</p>
                <p className={`text-xs ${trendClass(kpiSummaryQuery.data?.trends?.activationRate ?? 0)}`}>
                  {trendLabel(kpiSummaryQuery.data?.trends?.activationRate ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-2">
                <p className="text-[11px] text-slate-500">Engagement</p>
                <p className="text-lg font-bold">{Math.round(kpiSummaryQuery.data?.current?.engagement ?? 0)}</p>
                <p className={`text-xs ${trendClass(kpiSummaryQuery.data?.trends?.engagement ?? 0)}`}>
                  {trendLabel(kpiSummaryQuery.data?.trends?.engagement ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-2">
                <p className="text-[11px] text-slate-500">Success matching</p>
                <p className="text-lg font-bold">{Math.round(kpiSummaryQuery.data?.current?.matchingSuccessRate ?? 0)}%</p>
                <p className={`text-xs ${trendClass(kpiSummaryQuery.data?.trends?.matchingSuccessRate ?? 0)}`}>
                  {trendLabel(kpiSummaryQuery.data?.trends?.matchingSuccessRate ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-2">
                <p className="text-[11px] text-slate-500">Conversion revenu</p>
                <p className="text-lg font-bold">{Math.round(kpiSummaryQuery.data?.current?.conversionRevenueRate ?? 0)}%</p>
                <p className={`text-xs ${trendClass(kpiSummaryQuery.data?.trends?.conversionRevenueRate ?? 0)}`}>
                  {trendLabel(kpiSummaryQuery.data?.trends?.conversionRevenueRate ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-2">
                <p className="text-[11px] text-slate-500">Revenus</p>
                <p className="text-lg font-bold">{Math.round(kpiSummaryQuery.data?.current?.revenuesGenerated ?? 0).toLocaleString('fr-FR')} XOF</p>
                <p className={`text-xs ${trendClass(kpiSummaryQuery.data?.trends?.revenuesGenerated ?? 0)}`}>
                  {trendLabel(kpiSummaryQuery.data?.trends?.revenuesGenerated ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border bg-white p-2">
                <p className="text-[11px] text-slate-500">Regularite</p>
                <p className="text-lg font-bold">{Math.round(kpiSummaryQuery.data?.current?.activityConsistency ?? 0)}%</p>
                <p className={`text-xs ${trendClass(kpiSummaryQuery.data?.trends?.activityConsistency ?? 0)}`}>
                  {trendLabel(kpiSummaryQuery.data?.trends?.activityConsistency ?? 0)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Funnel utilisateur</p>
              {(kpiSummaryQuery.data?.funnel || []).map((step) => (
                <div key={step.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{step.label}</span>
                    <span className="font-semibold">{step.value} ({Math.round(step.conversionFromStart)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-400"
                      style={{ width: `${Math.max(2, Math.min(100, Number(step.conversionFromStart || 0)))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {(dashboardQuery.data?.recommendedActions || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Actions recommandees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboardQuery.data.recommendedActions.map((action, idx) => (
                <div key={`${action}-${idx}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white">
                  {idx + 1}. {action}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-700">
              <Bot className="w-5 h-5" />
              AI Personal Coach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-700">{coachQuery.data?.summary || 'Ton coach prepare des recommandations personnalisees...'}</p>
            <div className="space-y-1">
              {(coachQuery.data?.tips || []).map((tip, idx) => (
                <div key={`${tip}-${idx}`} className="rounded-lg bg-white/80 border border-indigo-100 px-3 py-2 text-sm">
                  {idx + 1}. {tip}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {(coachHistoryQuery.data || []).slice(-6).map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-sm border ${
                    msg.role === 'assistant'
                      ? 'bg-white/90 border-indigo-100'
                      : 'bg-indigo-100/70 border-indigo-200'
                  }`}
                >
                  <span className="font-semibold mr-1">{msg.role === 'assistant' ? 'Coach:' : 'Toi:'}</span>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                placeholder="Pose une question au coach..."
              />
              <Button
                size="sm"
                disabled={coachChatMutation.isPending || coachInput.trim().length === 0}
                onClick={() => coachChatMutation.mutate(coachInput)}
              >
                Envoyer
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={handleGenerate}>
                Regenerer parcours
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('Jobs'))}>
                Voir jobs
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('Courses'))}>
                Voir formations
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sky-700">
              <ShieldCheck className="w-5 h-5" />
              Trust & Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white/80 border border-sky-100 px-3 py-2">
              <p className="text-sm text-slate-700">Score de confiance</p>
              <p className="text-xl font-bold text-sky-700">{Math.round(trustStatusQuery.data?.trustScore ?? 0)}%</p>
            </div>
            {trustStatusQuery.data?.status === 'risk' && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Compte a risque detecte. Finalise verification et securite pour debloquer toutes les opportunites.</span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border bg-white px-2 py-1.5">KYC: <span className="font-semibold">{trustStatusQuery.data?.checks?.kycApproved ? 'OK' : 'Non'}</span></div>
              <div className="rounded-lg border bg-white px-2 py-1.5">2FA: <span className="font-semibold">{trustStatusQuery.data?.checks?.twoFAEnabled ? 'OK' : 'Non'}</span></div>
              <div className="rounded-lg border bg-white px-2 py-1.5">PIN wallet: <span className="font-semibold">{trustStatusQuery.data?.checks?.walletPinSet ? 'OK' : 'Non'}</span></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('UserVerification'))}>
                Verifier compte
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('PrivacySettings'))}>
                Activer 2FA
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('Wallet'))}>
                Securiser wallet
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <MapPin className="w-5 h-5" />
                Localization Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-lg bg-white/80 border border-teal-100 px-3 py-2 text-sm">
                Zone: <span className="font-semibold">{localizationQuery.data?.location || localizationQuery.data?.country || 'Non definie'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border bg-white px-2 py-1.5">Jobs locaux: <span className="font-semibold">{localizationQuery.data?.nearbyOpportunities?.jobs ?? 0}</span></div>
                <div className="rounded-lg border bg-white px-2 py-1.5">Prestataires: <span className="font-semibold">{localizationQuery.data?.nearbyOpportunities?.providers ?? 0}</span></div>
              </div>
              <p className="text-xs text-slate-600">{localizationQuery.data?.recommendation}</p>
            </CardContent>
          </Card>

          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-700">
                <Award className="w-5 h-5" />
                User Progression
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-lg bg-white/80 border border-violet-100 px-3 py-2 text-sm">
                Niveau: <span className="font-semibold">{progressionQuery.data?.level ?? 1}</span> | Progression: <span className="font-semibold">{progressionQuery.data?.progressToNextLevel ?? 0}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg border bg-white px-2 py-1.5">Badges: <span className="font-semibold">{progressionQuery.data?.badgesUnlocked ?? 0}</span></div>
                <div className="rounded-lg border bg-white px-2 py-1.5">Missions 7j: <span className="font-semibold">{progressionQuery.data?.missionsCompleted7d ?? 0}</span></div>
                <div className="rounded-lg border bg-white px-2 py-1.5">Cours: <span className="font-semibold">{progressionQuery.data?.coursesCompleted ?? 0}</span></div>
              </div>
              {(progressionQuery.data?.nextMilestones || []).slice(0, 2).map((m, idx) => (
                <div key={`${m}-${idx}`} className="rounded-lg bg-white/80 border border-violet-100 px-3 py-2 text-xs">
                  {idx + 1}. {m}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('GamificationHub'))}>
                Ouvrir progression
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notifications Intelligentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(smartNotificationsQuery.data || []).length === 0 ? (
              <p className="text-sm text-slate-500">Aucune notification prioritaire pour le moment.</p>
            ) : (
              (smartNotificationsQuery.data || []).map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(createPageUrl(n.ctaPage || 'Home'))}
                  >
                    Voir
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {(journeyPreview?.journey || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> Plan d action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {journeyPreview.journey.map((step, idx) => (
                <div key={step.id || idx} className="flex items-center justify-between rounded-lg border p-3 bg-white">
                  <div>
                    <p className="font-medium">{idx + 1}. {step.title}</p>
                    <p className="text-xs text-slate-500">Module: {step.module}</p>
                  </div>
                  <Badge variant="outline">{step.impact}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Opportunites pour toi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunitiesQuery.isLoading && opportunities.length === 0 ? (
              <p className="text-sm text-slate-500">Chargement des opportunites...</p>
            ) : opportunities.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune opportunite pour l instant. Complete l onboarding pour debloquer des recommandations.</p>
            ) : (
              opportunities.slice(0, 12).map((op) => {
                const Icon = moduleIcon(op.module);
                return (
                  <div key={op.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm line-clamp-1">{op.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{op.description}</p>
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {(op.reason || []).slice(0, 2).map((r, idx) => (
                            <Badge key={`${op.id}-${idx}`} variant="outline" className="text-[10px]">{r}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-blue-600">{Math.round(op.score)} pts</p>
                      {['marketplace', 'services', 'courses'].includes(op.module) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                          disabled={quickPayMutation.isPending}
                          onClick={() => quickPayMutation.mutate(quickPayAmount)}
                        >
                          {`Payer 1 clic (${quickPayAmount.toLocaleString('fr-FR')})`}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => handleOpenOpportunity(op)}>
                        Voir
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <CreditCard className="w-5 h-5" />
                Paiement & Economie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600">Active ton wallet, recharge et execute un paiement rapidement.</p>
              <div className="rounded-lg bg-white/80 border border-emerald-100 px-3 py-2 text-sm">
                Solde wallet: <span className="font-semibold">{Math.round(walletQuery.data?.available_balance ?? walletQuery.data?.balance ?? 0).toLocaleString('fr-FR')} XOF</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate(createPageUrl('Wallet'))}>
                  Ouvrir Wallet
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={quickPayMutation.isPending}
                  onClick={() => quickPayMutation.mutate(quickPayAmount)}
                >
                  {quickPayMutation.isPending
                    ? 'Paiement...'
                    : `Paiement 1 clic (${quickPayAmount.toLocaleString('fr-FR')})`}
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('RechargeWallet'))}>
                  Recharger
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('Microcredit'))}>
                  Microcredit
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Building2 className="w-5 h-5" />
                Entreprise & Recrutement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600">Accede a l espace recruteur et pilote ton pipeline candidats.</p>
              {recruiterDashboardQuery.data ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/80 border border-blue-100 p-2">
                    <p className="text-[10px] text-slate-500">Offres ouvertes</p>
                    <p className="text-lg font-bold">{recruiterDashboardQuery.data.openJobs ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/80 border border-blue-100 p-2">
                    <p className="text-[10px] text-slate-500">Candidatures</p>
                    <p className="text-lg font-bold">{recruiterDashboardQuery.data.totalApplications ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/80 border border-blue-100 p-2">
                    <p className="text-[10px] text-slate-500">Conversion</p>
                    <p className="text-lg font-bold">{Math.round(recruiterDashboardQuery.data.conversionRate ?? 0)}%</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-white/80 border border-blue-100 p-2 text-xs text-slate-600">
                  Cree ton profil entreprise pour activer ton pipeline ATS.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate(createPageUrl('JobsEmployerDashboard'))}>
                  Dashboard recruteur
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate(createPageUrl('JobsEmployerDashboard'))}>
                  Voir ATS
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('PostJob'))}>
                  Publier offre
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('CompanyProfile'))}>
                  Profil entreprise
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Escrow & Litiges</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Fonds en attente (escrow)</p>
              <p className="text-2xl font-bold text-amber-800">{escrowStats.inEscrow}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Transactions liberees</p>
              <p className="text-2xl font-bold text-emerald-800">{escrowStats.released}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs text-rose-700">Litiges actifs</p>
              <p className="text-2xl font-bold text-rose-800">{escrowStats.disputed}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interconnexion modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(interconnectionsQuery.data || []).map((link, idx) => (
              <div key={`${link.source}-${link.target}-${idx}`} className="rounded-lg bg-slate-100 p-3">
                <p className="text-sm font-medium">{link.source}{' -> '}{link.target}</p>
                <p className="text-xs text-slate-600">{link.rule}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
