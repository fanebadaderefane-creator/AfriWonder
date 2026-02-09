import React, { useState, useEffect } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';

const disputeReasons = [
  { value: 'product_not_received', label: 'Produit non reçu' },
  { value: 'product_damaged', label: 'Produit endommagé' },
  { value: 'product_not_as_described', label: 'Produit ne correspond pas à la description' },
  { value: 'wrong_product', label: 'Mauvais produit reçu' },
  { value: 'seller_not_responding', label: 'Vendeur ne répond pas' },
  { value: 'other', label: 'Autre' },
];

export default function OrderDispute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceImages, setEvidenceImages] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('orderId'));
  }, []);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.getById(orderId),
    enabled: !!orderId,
  });

  const { data: existingDispute } = useQuery({
    queryKey: ['dispute', orderId],
    queryFn: async () => {
      const disputes = await api.disputes.list({ as: 'buyer' });
      return Array.isArray(disputes) ? disputes.find(d => d.order_id === orderId && (d.status === 'open' || d.status === 'investigating')) : null;
    },
    enabled: !!orderId,
  });

  const createDisputeMutation = useMutation({
    mutationFn: (data) => api.disputes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Litige créé');
      navigate(`${createPageUrl('OrderTracking')}?id=${orderId}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  const addMessageMutation = useMutation({
    mutationFn: ({ disputeId, message, attachments }) => api.disputes.addMessage(disputeId, { message, attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', orderId] });
      toast.success('Message envoyé');
      setDescription('');
      setEvidenceImages([]);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  });

  const handleSubmit = () => {
    if (!reason) { toast.error('Sélectionnez un motif'); return; }
    if (!description.trim()) { toast.error('Décrivez le problème'); return; }
    createDisputeMutation.mutate({ order_id: orderId, reason, description, evidence_images: evidenceImages });
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!order) {
    return <div className="text-center py-16"><p className="text-gray-500">Commande non trouvée</p><Button onClick={() => navigate(createPageUrl('Orders'))} className="mt-4">Retour</Button></div>;
  }

  if (existingDispute) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto p-4 pb-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-5 h-5" /></Button>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Litige en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{disputeReasons.find(r => r.value === existingDispute.reason)?.label || existingDispute.reason}</p>
            <Badge className="mt-2">{existingDispute.status === 'open' ? 'Ouvert' : existingDispute.status === 'investigating' ? 'En investigation' : existingDispute.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ajouter un message</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Votre message..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            <Button onClick={() => addMessageMutation.mutate({ disputeId: existingDispute.id, message: description, attachments: evidenceImages })} disabled={!description.trim() || addMessageMutation.isPending} className="w-full"><Send className="w-4 h-4 mr-2" />Envoyer</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto p-4 pb-20">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-5 h-5" /></Button>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Signaler un problème</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">Commande #{order.id?.substring(0, 8)}</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Motif *</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2 border rounded-lg">
                <option value="">Sélectionner</option>
                {disputeReasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <Textarea placeholder="Décrivez le problème..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
            </div>
            <Button onClick={handleSubmit} disabled={!reason || !description.trim() || createDisputeMutation.isPending} className="w-full bg-red-500 hover:bg-red-600">{createDisputeMutation.isPending ? 'Envoi...' : 'Envoyer le litige'}</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
