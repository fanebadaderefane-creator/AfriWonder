import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, QrCode, Loader2 } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import api from '@/api/expressClient';
import { toast } from 'sonner';

const statusLabel = { pending: 'En attente', confirmed: 'Confirmé', used: 'Utilisé', cancelled: 'Annulé', refunded: 'Remboursé' };

export default function TicketDetails() {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('id');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) { setLoading(false); return; }
    let cancelled = false;
    api.tickets.getById(ticketId)
      .then((t) => { if (!cancelled) setTicket(t); })
      .catch((err) => { if (!cancelled) toast.error(err?.apiMessage || 'Billet introuvable'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  if (!ticketId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Billet non sélectionné.</p>
          <Link to={createPageUrl('Ticketing')}><Button className="mt-4 bg-purple-500">Mes billets</Button></Link>
        </div>
      </div>
    );
  }
  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>;
  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Billet introuvable.</p>
          <Link to={createPageUrl('Ticketing')}><Button className="mt-4 bg-purple-500">Retour</Button></Link>
        </div>
      </div>
    );
  }

  const dateStr = ticket.event_date ? new Date(ticket.event_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Ticketing')}><Button variant="ghost" size="icon" className="text-white" aria-label="Retour"><ArrowLeft className="w-5 h-5" aria-hidden="true" /></Button></Link>
          <h1 className="text-lg font-bold text-white">Détail du billet</h1>
          <div className="w-10" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-center">
            <h2 className="text-xl font-bold text-white">{ticket.event_name || 'Événement'}</h2>
            <Badge className="mt-2 bg-white/20 text-white border-0">{statusLabel[ticket.status] || ticket.status}</Badge>
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-gray-300"><Calendar className="w-5 h-5 text-purple-400" /><span>{dateStr}</span></div>
            {ticket.venue && <div className="flex items-center gap-3 text-gray-300"><MapPin className="w-5 h-5 text-purple-400" /><span>{ticket.venue}</span></div>}
            <div className="flex justify-between text-sm pt-2 border-t border-white/10"><span className="text-gray-400">Quantité</span><span className="text-white font-semibold">{ticket.quantity ?? 1}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Montant</span><span className="text-white font-bold">{Number(ticket.total_amount ?? ticket.price ?? 0).toLocaleString()} {ticket.currency || 'XOF'}</span></div>
            {ticket.qr_code ? <div className="mt-4 p-4 bg-white rounded-lg text-center text-black text-xs font-mono">{ticket.qr_code}</div> : <div className="mt-4 p-6 bg-white/10 rounded-lg flex flex-col items-center gap-2"><QrCode className="w-12 h-12 text-gray-500" /><p className="text-gray-400 text-sm">QR à l&apos;entrée</p></div>}
          </CardContent>
        </Card>
        <Link to={createPageUrl('Ticketing')}><Button variant="outline" className="w-full border-white/30 text-white">Voir tous mes billets</Button></Link>
      </div>
      <BottomNav />
    </div>
  );
}
