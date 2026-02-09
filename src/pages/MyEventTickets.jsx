import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ticket, QrCode, Calendar, MapPin, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import BottomNav from '../components/navigation/BottomNav';

export default function MyEventTickets() {
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadPdf = async (ticket) => {
    setDownloadingId(ticket.id);
    try {
      const blob = await api.events.downloadTicketPdf(ticket.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billet-${ticket.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Billet téléchargé');
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Erreur');
    } finally {
      setDownloadingId(null);
    }
  };

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-event-tickets'],
    queryFn: () => api.events.getMyTickets(),
  });

  const list = Array.isArray(tickets) ? tickets : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Mes billets</h1>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Vous n'avez pas de billet</p>
              <Button
                className="mt-4 bg-orange-500"
                onClick={() => navigate(createPageUrl('Events'))}
              >
                Voir les événements
              </Button>
            </CardContent>
          </Card>
        ) : (
          list.map((ticket) => {
            const event = ticket.event;
            if (!event) return null;
            return (
              <Card key={ticket.id} className="overflow-hidden">
                {event.image && (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{event.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.start_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">Code check-in (QR)</p>
                    <p className="font-mono text-sm break-all select-all">{ticket.qr_code || ticket.id}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Présentez ce code à l'entrée pour le check-in
                    </p>
                  </div>
                  {ticket.checked_in && (
                    <p className="text-sm text-green-600 font-medium">✓ Déjà check-in</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownloadPdf(ticket)}
                    disabled={downloadingId === ticket.id}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    {downloadingId === ticket.id ? 'Téléchargement...' : 'Télécharger le billet (PDF)'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`${createPageUrl('EventDetails')}?id=${event.id}`)}
                  >
                    Voir l'événement
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
