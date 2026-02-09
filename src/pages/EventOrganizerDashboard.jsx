import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Users, DollarSign, QrCode, CheckCircle, Loader2, Download, Send, Flag, Star, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

export default function EventOrganizerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState(null);
  const [qrInput, setQrInput] = useState('');
  const [messageToAll, setMessageToAll] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEventId(params.get('id'));
    const featurePaymentId = params.get('featurePaymentId');
    const featureSuccess = params.get('feature') === 'success';
    if (featureSuccess && featurePaymentId) {
      api.events.confirmFeaturePayment(featurePaymentId)
        .then(() => {
          toast.success('Mise en avant activée !');
          queryClient.invalidateQueries({ queryKey: ['event-dashboard', params.get('id')] });
          window.history.replaceState({}, '', window.location.pathname + '?id=' + params.get('id'));
        })
        .catch((e) => toast.error(e.response?.data?.error || e.message || 'Erreur confirmation'));
    }
  }, [queryClient]);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['event-dashboard', eventId],
    queryFn: () => api.events.getDashboard(eventId),
    enabled: !!eventId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['event-analytics', eventId],
    queryFn: () => api.events.getAnalytics(eventId),
    enabled: !!eventId && !!dashboard?.event,
  });

  const payFeatureMutation = useMutation({
    mutationFn: () => api.events.payForFeature(eventId, { phone: '' }),
    onSuccess: (res) => {
      if (res.payment_url) {
        window.location.href = res.payment_url;
      } else {
        toast.success(res.message || 'Demande envoyée');
      }
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.events.checkIn(qrInput.trim()),
    onSuccess: (res) => {
      toast.success(`${res.attendee_name} — check-in OK`);
      setQrInput('');
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur check-in'),
  });

  const exportCsvMutation = useMutation({
    mutationFn: async () => {
      const blob = await api.events.exportParticipantsCsv(eventId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants-${eventId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('CSV téléchargé'),
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur export'),
  });

  const notifyAllMutation = useMutation({
    mutationFn: () => api.events.notifyParticipants(eventId, messageToAll.trim()),
    onSuccess: (res) => {
      toast.success(`Message envoyé à ${res.sent} participant(s)`);
      setMessageToAll('');
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  const closeEventMutation = useMutation({
    mutationFn: () => api.events.closeEvent(eventId),
    onSuccess: () => {
      toast.success('Événement clôturé');
      queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  if (!eventId) {
    return (
      <div className="p-4">
        <p className="text-gray-500">ID événement manquant</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  if (isLoading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const { event, tickets_sold, capacity_remaining, revenue, checked_in_count, participants } = dashboard;
  const isFeatured = event?.is_featured ?? false;
  const featuredUntil = event?.featured_until ? new Date(event.featured_until) : null;
  const canFeature = !isFeatured || (featuredUntil && featuredUntil < new Date());

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold truncate">Dashboard — {event?.title}</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-gray-500">
                <Users className="w-5 h-5" />
                <span className="text-sm">Inscrits</span>
              </div>
              <p className="text-2xl font-bold mt-1">{tickets_sold ?? 0}</p>
              {capacity_remaining != null && (
                <p className="text-xs text-gray-500">{capacity_remaining} places restantes</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-gray-500">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Revenus</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {Number(revenue || 0).toLocaleString()} FCFA
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-gray-500">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">Check-in</span>
              </div>
              <p className="text-2xl font-bold mt-1">{checked_in_count ?? 0} / {tickets_sold ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Mise en avant payante */}
        <Card className={isFeatured ? 'border-amber-200 bg-amber-50/50' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Mise en avant
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFeatured && featuredUntil && featuredUntil > new Date() ? (
              <p className="text-sm text-amber-800">
                En vedette jusqu&apos;au {featuredUntil.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
            ) : canFeature ? (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Mettez votre événement en avant sur la liste (5 000 FCFA / 7 jours).
                </p>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600"
                  disabled={payFeatureMutation.isPending}
                  onClick={() => payFeatureMutation.mutate()}
                >
                  {payFeatureMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 mr-2" />}
                  Mettre en avant (5 000 FCFA)
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-600">Mise en avant active.</p>
            )}
          </CardContent>
        </Card>

        {/* Analytics */}
        {analytics && (analytics.by_city?.length > 0 || analytics.by_day?.length > 0 || analytics.by_source?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.by_city?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Par ville</p>
                  <ul className="text-sm space-y-1">
                    {analytics.by_city.map(({ city, count }) => (
                      <li key={city} className="flex justify-between">
                        <span>{city}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analytics.by_source?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Par source</p>
                  <ul className="text-sm space-y-1">
                    {analytics.by_source.map(({ source, count }) => (
                      <li key={source} className="flex justify-between">
                        <span>{source}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analytics.by_day?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Inscriptions par jour</p>
                  <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {analytics.by_day.slice(-10).reverse().map(({ date, count }) => (
                      <li key={date} className="flex justify-between">
                        <span>{new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Check-in à l'entrée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Coller le code QR / code billet"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkInMutation.mutate()}
            />
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={!qrInput.trim() || checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}
            >
              {checkInMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider check-in'}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => exportCsvMutation.mutate()}
            disabled={exportCsvMutation.isPending || !participants?.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          {event?.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-amber-200 text-amber-700"
              onClick={() => closeEventMutation.mutate()}
              disabled={closeEventMutation.isPending}
            >
              <Flag className="w-4 h-4 mr-2" />
              Clôturer
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Message à tous les inscrits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              placeholder="Écrivez un message (notification in-app)..."
              value={messageToAll}
              onChange={(e) => setMessageToAll(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button
              size="sm"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={!messageToAll.trim() || notifyAllMutation.isPending}
              onClick={() => notifyAllMutation.mutate()}
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer à {participants?.length || 0} participant(s)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liste des participants</CardTitle>
          </CardHeader>
          <CardContent>
            {participants && participants.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {participants.map((p) => (
                  <li
                    key={p.ticket_id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {p.user?.full_name || p.user?.username || p.user?.email || '—'}
                      </p>
                      {p.checked_in && (
                        <span className="text-xs text-green-600">✓ Check-in</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun participant pour le moment</p>
            )}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`${createPageUrl('EventDetails')}?id=${eventId}`)}
        >
          Voir la page événement
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
