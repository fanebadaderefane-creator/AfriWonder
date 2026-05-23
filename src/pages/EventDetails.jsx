import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Ticket,
  Heart,
  MessageCircle,
  Share2,
  QrCode,
  Video,
  Loader2,
  Mic2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

export default function EventDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState(null);
  const [user, setUser] = useState(null);
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [bookingPhone, setBookingPhone] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setEventId(id);
    const paymentId = params.get('paymentId');
    const bookingSuccess = params.get('booking') === 'success';
    if (bookingSuccess && paymentId && id) {
      api.events.confirmPayment(paymentId).then(() => {
        toast.success('Paiement confirmé ! Votre billet est disponible.');
        queryClient.invalidateQueries({ queryKey: ['event', id] });
      }).catch((e) => toast.error(e.response?.data?.error || e.message || 'Erreur confirmation'));
    }
  }, []);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId, user?.id],
    queryFn: () => api.events.getById(eventId),
    enabled: !!eventId,
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      api.events.book(eventId, {
        quantity: bookingQuantity,
        phone: bookingPhone || undefined,
        payment_method: 'orange_money',
        source: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile_web' : 'web',
      }),
    onSuccess: (res) => {
      if (res.payment_url) {
        window.location.href = res.payment_url;
        return;
      }
      toast.success(res.message || 'Inscription confirmée !');
      setShowBooking(false);
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  const likeMutation = useMutation({
    mutationFn: () => api.events.like(eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: () => api.events.addComment(eventId, commentText),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['event', eventId, 'comments'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['event', eventId, 'comments'],
    queryFn: () => api.events.getComments(eventId, { page: 1, limit: 20 }),
    enabled: !!eventId,
  });
  const comments = commentsData?.comments ?? [];

  const { data: friendsData } = useQuery({
    queryKey: ['event-friends', eventId, user?.id],
    queryFn: () => api.events.getFriendsAttending(eventId),
    enabled: !!eventId && !!user?.id,
  });

  const eventForChat = event?.id && event?.start_date && event?.end_date ? {
    user_has_ticket: event.user_has_ticket,
    start_date: event.start_date,
    end_date: event.end_date,
  } : null;
  const chatWindowOpen = eventForChat?.user_has_ticket && (() => {
    const n = new Date();
    const s = new Date(eventForChat.start_date);
    const e = new Date(eventForChat.end_date);
    const start = new Date(s.getTime() - 60 * 60 * 1000);
    return n >= start && n <= e;
  })();
  const { data: chatData, refetch: refetchChat } = useQuery({
    queryKey: ['event-chat', eventId],
    queryFn: () => api.events.getChat(eventId, { page: 1, limit: 50 }),
    enabled: !!eventId && !!chatWindowOpen,
  });

  const addChatMutation = useMutation({
    mutationFn: () => api.events.addChatMessage(eventId, chatInput.trim()),
    onSuccess: () => {
      setChatInput('');
      queryClient.invalidateQueries({ queryKey: ['event-chat', eventId] });
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  useEffect(() => {
    if (!event?.start_date) return;
    const start = new Date(event.start_date).getTime();
    const tick = () => {
      const now = Date.now();
      if (now >= start) {
        setCountdown(null);
        return;
      }
      const d = Math.floor((start - now) / (1000 * 60 * 60 * 24));
      const h = Math.floor(((start - now) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor(((start - now) % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor(((start - now) % (1000 * 60)) / 1000);
      setCountdown({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [event?.start_date]);

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const isFull = event.capacity_remaining !== null && event.capacity_remaining <= 0;
  const canBook = event.status === 'published' && !isFull && user;

  const faqList = Array.isArray(event?.faq) ? event.faq : [];
  const speakersList = Array.isArray(event?.speakers) ? event.speakers : [];
  const sponsorsList = Array.isArray(event?.sponsors) ? event.sponsors : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-20 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold truncate flex-1">{event.title}</h1>
      </div>

      <div className="p-4 space-y-4">
        {countdown && (
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="py-4">
              <p className="text-sm font-medium text-center text-gray-600 mb-2">Début dans</p>
              <div className="flex justify-center gap-3">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-orange-600">{countdown.d}</span>
                  <span className="text-xs text-gray-500">jours</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-orange-600">{String(countdown.h).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500">h</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-orange-600">{String(countdown.m).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500">min</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-orange-600">{String(countdown.s).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500">sec</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-48 object-cover rounded-xl"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-16 h-16 text-orange-400" />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {event.is_featured && (
            <Badge className="bg-amber-100 text-amber-800">Vedette</Badge>
          )}
          {event.event_type !== 'physical' && (
            <Badge variant="secondary">
              <Video className="w-3 h-3 mr-1" />
              {event.event_type}
            </Badge>
          )}
          {event.is_free && <Badge variant="secondary">Gratuit</Badge>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <p className="text-sm text-gray-500">{event.organizer_name || 'Organisateur'}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.description && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>
                {new Date(event.start_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
            {event.latitude != null && event.longitude != null && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 h-48">
                <MapContainer
                  center={[Number(event.latitude), Number(event.longitude)]}
                  zoom={14}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <Marker position={[Number(event.latitude), Number(event.longitude)]}>
                    <Popup>{event.title}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
            {event.virtual_url && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="w-4 h-4 text-orange-500" />
                <a
                  href={event.virtual_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 underline"
                >
                  Lien de participation
                </a>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  {event.capacity_remaining != null
                    ? `${event.capacity_remaining} places restantes`
                    : `${event.tickets_sold ?? 0} inscrits`}
                </span>
              </div>
              {!event.is_free && (
                <span className="font-semibold text-orange-600">
                  {Number(event.price || 0).toLocaleString()} {event.currency || 'FCFA'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions: Like, Share, Book */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => likeMutation.mutate()}
            disabled={!user}
          >
            <Heart
              className={`w-4 h-4 mr-2 ${event.user_liked ? 'fill-red-500 text-red-500' : ''}`}
            />
            {event.likes_count ?? 0}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Lien copié');
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
        </div>

        {user && (event.organizer_id === user.id || event.organizer?.id === user.id) && (
          <>
            {event.status === 'draft' && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  api.events.update(event.id, { status: 'published' }).then(() => {
                    toast.success('Événement publié ! Les réservations sont ouvertes.');
                    queryClient.invalidateQueries({ queryKey: ['event', event.id] });
                  }).catch((e) => toast.error(e.response?.data?.error || e.message));
                }}
              >
                Publier l&apos;événement (ouvrir les réservations)
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full border-amber-200 text-amber-700"
              onClick={() => navigate(`${createPageUrl('EventOrganizerDashboard')}?id=${event.id}`)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Dashboard organisateur (check-in & stats)
            </Button>
          </>
        )}

        {event.user_has_ticket && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-4">
              <p className="font-medium text-green-800 flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Vous avez un billet pour cet événement
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => navigate(createPageUrl('MyEventTickets'))}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Voir mes billets
              </Button>
            </CardContent>
          </Card>
        )}

        {canBook && !event.user_has_ticket && (
          <>
            {!showBooking ? (
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={() => setShowBooking(true)}
              >
                <Ticket className="w-4 h-4 mr-2" />
                Réserver un billet
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Réserver</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!event.is_free && (
                    <div>
                      <label className="text-sm font-medium">Téléphone (Orange Money)</label>
                      <Input
                        placeholder="+223 XX XX XX XX"
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Quantité</label>
                    <Input
                      type="number"
                      min={1}
                      max={event.capacity_remaining ?? 10}
                      value={bookingQuantity}
                      onChange={(e) => setBookingQuantity(Number(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowBooking(false)}>
                      Annuler
                    </Button>
                    <Button
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                      disabled={bookMutation.isPending}
                      onClick={() => bookMutation.mutate()}
                    >
                      {bookMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Réserver</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!user && (
          <p className="text-center text-sm text-gray-500">
            Connectez-vous pour réserver ou liker
          </p>
        )}

        {speakersList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic2 className="w-4 h-4" />
                Intervenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {speakersList.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 min-w-0">
                    {s.photo && (
                      <img src={s.photo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800">{s.name || s.nom}</p>
                      {s.role && <p className="text-xs text-gray-500">{s.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {sponsorsList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Partenaires</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {sponsorsList.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.link || '#'}
                    target={s.link ? '_blank' : undefined}
                    rel={s.link ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 min-w-0"
                  >
                    {s.logo_url && (
                      <img src={s.logo_url} alt="" className="w-10 h-10 rounded object-contain shrink-0" />
                    )}
                    <span className="font-medium text-sm text-gray-800">{s.name}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {friendsData?.friends?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Vos amis inscrits ({friendsData.friends.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {friendsData.friends.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    {u.profile_image ? (
                      <img src={u.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-sm font-medium">
                        {(u.full_name || u.username || '?')[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium">{u.full_name || u.username}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {chatWindowOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Discussion en direct
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(chatData?.messages ?? []).map((m) => (
                  <div key={m.id} className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-orange-200 shrink-0 flex items-center justify-center text-orange-700 text-xs font-medium">
                      {(m.user?.full_name || m.user?.username || '?')[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600">{m.user?.full_name || m.user?.username}</p>
                      <p className="text-sm text-gray-800">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Votre message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addChatMutation.mutate()}
                />
                <Button
                  size="sm"
                  className="bg-orange-500 shrink-0"
                  disabled={!chatInput.trim() || addChatMutation.isPending}
                  onClick={() => addChatMutation.mutate()}
                >
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {faqList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">FAQ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {faqList.map((item, idx) => (
                <div key={idx}>
                  <p className="font-medium text-sm text-gray-800">{item.question || item.q}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{item.answer || item.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {event.refund_policy && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Politique de remboursement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{event.refund_policy}</p>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Commentaires ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Écrire un commentaire..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  className="shrink-0 bg-orange-500"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  onClick={() => addCommentMutation.mutate()}
                >
                  Envoyer
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-orange-200 shrink-0 flex items-center justify-center text-orange-700 font-medium">
                    {(c.user?.full_name || c.user?.username || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {c.user?.full_name || c.user?.username || 'Anonyme'}
                    </p>
                    <p className="text-sm text-gray-700">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
