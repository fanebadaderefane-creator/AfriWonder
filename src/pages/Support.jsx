import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Send, Plus, Ticket } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BottomNav from '../components/navigation/BottomNav';

const statusLabels = { open: 'Ouvert', in_progress: 'En cours', closed: 'Fermé' };
const statusColors = { open: 'bg-blue-100 text-blue-800', in_progress: 'bg-blue-100 text-blue-800', closed: 'bg-gray-100 text-gray-800' };

export default function Support() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ticketIdFromUrl = searchParams.get('id');
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate(createPageUrl('Landing')));
  }, [navigate]);

  const { data: ticketsData } = useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: () => api.support.listTickets({ page: 1, limit: 50 }),
    enabled: !!user?.id
  });

  const tickets = ticketsData?.tickets ?? ticketsData?.data ?? (Array.isArray(ticketsData) ? ticketsData : []);
  const selectedTicketId = ticketIdFromUrl || (tickets.length > 0 && !showNewTicket ? tickets[0].id : null);

  const { data: ticketDetail, refetch: refetchTicket } = useQuery({
    queryKey: ['support-ticket', selectedTicketId],
    queryFn: () => api.support.getTicket(selectedTicketId),
    enabled: !!selectedTicketId
  });

  const ticket = ticketDetail?.data ?? ticketDetail ?? null;
  const messages = ticket?.messages ?? [];

  const createTicketMutation = useMutation({
    mutationFn: () => api.support.createTicket(newSubject, newMessage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets', user?.id] });
      setShowNewTicket(false);
      setNewSubject('');
      setNewMessage('');
      toast.success('Ticket créé');
      const id = data?.id ?? data?.data?.id;
      if (id) navigate(`${createPageUrl('Support')}?id=${id}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => api.support.addMessage(selectedTicketId, replyText),
    onSuccess: () => {
      setReplyText('');
      refetchTicket();
      toast.success('Message envoyé');
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur')
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Support</h1>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewTicket(true)}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouveau
          </Button>
        </div>
      </div>

      {showNewTicket ? (
        <Card className="m-4 p-4">
          <h3 className="font-semibold mb-3">Nouveau ticket</h3>
          <Input
            placeholder="Sujet"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="mb-3"
          />
          <Textarea
            placeholder="Décrivez votre problème..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={4}
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewTicket(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!newSubject.trim() || createTicketMutation.isPending}
              onClick={() => createTicketMutation.mutate()}
            >
              {createTicketMutation.isPending ? 'Envoi...' : 'Créer le ticket'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col md:flex-row h-[calc(100dvh-140px)]">
          <div className="w-full md:w-80 border-r bg-white overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun ticket. Créez-en un pour contacter le support.</p>
              </div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`${createPageUrl('Support')}?id=${t.id}`)}
                  className={`w-full text-left p-4 border-b hover:bg-gray-50 flex items-start gap-3 ${
                    selectedTicketId === t.id ? 'bg-orange-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <MessageCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${statusColors[t.status] || 'bg-gray-100'}`}>
                        {statusLabels[t.status] || t.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : ''}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
            {ticket ? (
              <>
                <div className="p-4 bg-white border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{ticket.subject}</h2>
                    <Badge className={`mt-1 ${statusColors[ticket.status] || ''}`}>
                      {statusLabels[ticket.status] || ticket.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_staff ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          msg.is_staff
                            ? 'bg-white border text-gray-800'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.is_staff ? 'text-gray-500' : 'text-blue-100'}`}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleString('fr-FR') : ''}
                          {msg.is_staff && ' • Support'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {ticket.status !== 'closed' && (
                  <div className="p-4 bg-white border-t flex gap-2">
                    <Textarea
                      placeholder="Votre message..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      size="icon"
                      className="bg-blue-600 hover:bg-blue-700 shrink-0 h-auto py-3"
                      disabled={!replyText.trim() || sendMessageMutation.isPending}
                      onClick={() => sendMessageMutation.mutate()}
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p>Sélectionnez un ticket ou créez-en un nouveau.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
