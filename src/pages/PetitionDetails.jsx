import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, CheckCircle, Loader2, Heart, Flag, MessageCircle, ThumbsUp, Gift } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

export default function PetitionDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const petitionId = searchParams.get('id');
  const [user, setUser] = useState(null);
  const [showSignForm, setShowSignForm] = useState(false);
  const [signComment, setSignComment] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showDonate, setShowDonate] = useState(false);
  const [donateForm, setDonateForm] = useState({ amount: 1000, phone: '', message: '' });
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const recaptchaRef = useRef(null);
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

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  useEffect(() => {
    if (!siteKey || !showSignForm || !recaptchaRef.current) return;
    if (window.grecaptcha) {
      try {
        const wid = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: siteKey,
          callback: (token) => setRecaptchaToken(token),
        });
        return () => { try { window.grecaptcha?.reset(wid); } catch (_) {} };
      } catch (_) {}
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    s.async = true;
    window.onRecaptchaLoad = () => {
      if (recaptchaRef.current && window.grecaptcha) {
        try {
          window.grecaptcha.render(recaptchaRef.current, {
            sitekey: siteKey,
            callback: (token) => setRecaptchaToken(token),
          });
        } catch (_) {}
      }
    };
    document.head.appendChild(s);
    return () => {
      delete window.onRecaptchaLoad;
    };
  }, [siteKey, showSignForm]);

  const { data: petition, isLoading } = useQuery({
    queryKey: ['civic-petition', petitionId],
    queryFn: () => api.civic.getById(petitionId),
    enabled: !!petitionId
  });

  const { data: commentsData } = useQuery({
    queryKey: ['civic-comments', petitionId],
    queryFn: () => api.civic.listComments(petitionId, 1, 30),
    enabled: !!petitionId
  });

  const comments = commentsData?.comments ?? [];
  const hasUserSigned = user && petition?.signatures?.some(s => (s.signer_id || s.signer?.id) === user.id);

  const signMutation = useMutation({
    mutationFn: () => api.civic.sign(petitionId, {
      comment: signComment,
      recaptchaToken: recaptchaToken || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['civic-petition', petitionId]);
      setShowSignForm(false);
      setSignComment('');
      toast.success('Pétition signée !');
    },
    onError: (err) => {
      toast.error(err?.apiMessage || err?.message || 'Impossible de signer');
    }
  });

  const saveMutation = useMutation({
    mutationFn: () => api.civic.save(petitionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['civic-petition', petitionId]);
      toast.success('Pétition sauvegardée');
    }
  });

  const unsaveMutation = useMutation({
    mutationFn: () => api.civic.unsave(petitionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['civic-petition', petitionId]);
      toast.success('Retirée des sauvegardes');
    }
  });

  const reportMutation = useMutation({
    mutationFn: () => api.civic.report(petitionId, reportReason),
    onSuccess: () => {
      setShowReport(false);
      setReportReason('');
      toast.success('Signalement enregistré');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur')
  });

  const likeCommentMutation = useMutation({
    mutationFn: (commentId) => api.civic.likeComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['civic-comments', petitionId]);
    },
  });

  const donateMutation = useMutation({
    mutationFn: () => api.civic.donate(petitionId, {
      amount: Number(donateForm.amount) || 1000,
      phone: donateForm.phone.trim(),
      message: donateForm.message.trim() || undefined,
    }),
    onSuccess: (res) => {
      if (res?.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }
      setShowDonate(false);
      toast.success('Don enregistré');
    },
    onError: (err) => toast.error(err?.apiMessage || 'Erreur don'),
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!petition) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Pétition introuvable</div>;
  }

  const progressPercent = ((petition.current_signatures ?? 0) / (petition.goal_signatures || 1)) * 100;
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    under_review: 'bg-blue-100 text-blue-700',
    accepted: 'bg-purple-100 text-purple-700',
    implemented: 'bg-blue-100 text-blue-700'
  };
  const creator = petition.creator || {};
  const signatures = petition.signatures || [];

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">Pétition</h1>
        {user && (
          <>
            <Button variant="ghost" size="icon" onClick={() => saveMutation.mutate()} title="Sauvegarder">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowReport(true)} title="Signaler">
              <Flag className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      <div className="p-4 border-b border-gray-100">
        <Badge className={(statusColors[petition.status] || statusColors.active) + ' mb-3'}>
          {petition.status?.toUpperCase() ?? 'ACTIVE'}
        </Badge>
        <h2 className="text-2xl font-bold mb-3">{petition.title}</h2>
        <div className="flex items-center gap-3 py-3">
          <img
            src={creator.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
            alt={creator.full_name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-medium text-sm">{creator.full_name}</p>
            <p className="text-xs text-gray-600">{[petition.city, petition.region, petition.country].filter(Boolean).join(', ') || 'National'}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">{petition.current_signatures ?? 0} / {petition.goal_signatures} signatures</span>
          <span className="text-sm font-bold text-blue-600">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold mb-2">Objectif</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{petition.description}</p>
      </div>

      {petition.target_authority_email && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-600 mb-1">Adressée à</p>
          <p className="font-bold text-sm">{petition.target_authority_email}</p>
        </div>
      )}

      {/* Commentaires */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Commentaires ({comments.length})
        </h3>
        {user && (
          <div className="mb-3">
            <form onSubmit={(e) => { e.preventDefault(); const c = e.target.content?.value; if (c?.trim()) api.civic.addComment(petitionId, c.trim()).then(() => queryClient.invalidateQueries(['civic-comments', petitionId])).then(() => toast.success('Commentaire ajouté')); }}>
              <Textarea name="content" placeholder="Ajouter un commentaire..." className="mb-2" rows={2} />
              <Button type="submit" size="sm">Publier</Button>
            </form>
          </div>
        )}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="p-3 bg-gray-50 rounded text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">{c.user?.full_name ?? 'Anonyme'}</p>
                  <p className="text-gray-600">{c.content}</p>
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={() => likeCommentMutation.mutate(c.id)}
                    disabled={likeCommentMutation.isPending}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 shrink-0"
                    title="J'aime"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{c._count?.likes ?? 0}</span>
                  </button>
                )}
              </div>
              {c.replies?.length > 0 && (
                <div className="ml-3 mt-2 pl-2 border-l-2 border-gray-200 space-y-1">
                  {c.replies.map((r) => (
                    <div key={r.id} className="text-xs">
                      <span className="font-medium">{r.user?.full_name ?? 'Anonyme'}</span>: {r.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Soutenir la pétition (dons) */}
      {petition.status === 'active' && user && (
        <div className="p-4 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Gift className="w-4 h-4 text-blue-600" />
            Soutenir cette pétition
          </h3>
          {!showDonate ? (
            <Button variant="outline" size="sm" onClick={() => setShowDonate(true)} className="border-blue-300 text-blue-700">
              Faire un don (Orange Money)
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA)</label>
                <Input
                  type="number"
                  min="500"
                  step="100"
                  value={donateForm.amount}
                  onChange={(e) => setDonateForm((f) => ({ ...f, amount: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">N° Orange Money *</label>
                <Input
                  placeholder="221 77 123 45 67"
                  value={donateForm.phone}
                  onChange={(e) => setDonateForm((f) => ({ ...f, phone: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message (optionnel)</label>
                <Input
                  placeholder="Soutien à la cause"
                  value={donateForm.message}
                  onChange={(e) => setDonateForm((f) => ({ ...f, message: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDonate(false)}>Annuler</Button>
                <Button size="sm" className="bg-blue-500" onClick={() => donateMutation.mutate()} disabled={!donateForm.phone.trim() || donateMutation.isPending}>
                  {donateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Signataires */}
      <div className="p-4">
        <h3 className="font-bold mb-3">Signataires ({signatures.length})</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {signatures.slice(0, 20).map((sig) => (
            <div key={sig.id} className="p-3 bg-gray-50 rounded text-sm">
              <p className="font-medium">{sig.signer?.full_name ?? 'Signataire'}</p>
              {sig.comment && <p className="text-gray-600 text-xs mt-1">{sig.comment}</p>}
            </div>
          ))}
        </div>
      </div>

      {!hasUserSigned && petition.status === 'active' && user && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          {!showSignForm ? (
            <Button
              onClick={() => setShowSignForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Signer la pétition
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <Textarea
                placeholder="Commentaire (optionnel)..."
                value={signComment}
                onChange={(e) => setSignComment(e.target.value)}
                className="h-20"
              />
              {import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
                <div id="recaptcha-sign" ref={recaptchaRef} className="flex justify-center" />
              )}
              <div className="flex gap-2">
                <Button onClick={() => setShowSignForm(false)} variant="outline" className="flex-1">Annuler</Button>
                <Button onClick={() => signMutation.mutate()} disabled={signMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {signMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Signer
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!user && petition.status === 'active' && (
        <div className="p-4">
          <Link to={createPageUrl('Home')}>
            <Button className="w-full bg-blue-600">Se connecter pour signer</Button>
          </Link>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <h3 className="font-bold mb-2">Signaler cette pétition</h3>
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
