import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function DisputeCenter() {
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [response, setResponse] = useState('');
  const _navigate = useNavigate();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.Dispute.filter({
        $or: [
          { buyer_id: user.id },
          { seller_id: user.id }
        ]
      });
    }
  });

  const statusConfig = {
    open: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Ouvert' },
    waiting_buyer: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
    waiting_seller: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
    in_review: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'En examen' },
    resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Résolu' },
    closed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle2, label: 'Fermé' }
  };

  if (selectedDispute) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-4"
      >
        <button
          onClick={() => setSelectedDispute(null)}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Litige #{selectedDispute.id}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Commande: {selectedDispute.order_id}</p>
              </div>
              <Badge className={statusConfig[selectedDispute.status].color}>
                {statusConfig[selectedDispute.status].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold text-gray-700">Catégorie</p>
              <p className="text-sm">{selectedDispute.category}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Description</p>
              <p className="text-sm text-gray-600">{selectedDispute._description}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-2">Montant en litige</p>
              <p className="text-lg font-bold text-orange-600">{selectedDispute.amount.toLocaleString()} XOF</p>
            </div>

            {selectedDispute.evidence?.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">Preuves</p>
                <div className="grid grid-cols-2 gap-3">
                  {selectedDispute.evidence.map((url, idx) => (
                    <img key={idx} src={url} alt="Proof" className="w-full h-32 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}

            {selectedDispute.admin_notes && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold text-sm text-blue-900 mb-1">Notes du modérateur</p>
                <p className="text-sm text-blue-800">{selectedDispute.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {['open', 'waiting_seller', 'waiting_buyer'].includes(selectedDispute.status) && (
          <Card>
            <CardHeader>
              <CardTitle>Votre réponse</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Décrivez votre position et fournissez des preuves si nécessaire..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-24"
              />
              <Button
                onClick={async () => {
                  if (!response.trim()) {
                    toast.error('Veuillez écrire une réponse');
                    return;
                  }
                  // Update dispute
                  await api.entities.Dispute.update(selectedDispute.id, {
                    seller_response: response,
                    status: 'in_review'
                  });
                  toast.success('Réponse soumise');
                  setSelectedDispute(null);
                }}
                className="mt-4 bg-orange-500 hover:bg-orange-600"
              >
                Soumettre la réponse
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-4 safe-area-pb"
    >
      <h1 className="text-3xl font-bold mb-8">Centre de litiges</h1>

      {isLoading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : disputes?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600">Vous n'avez pas de litiges actuels</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const StatusIcon = statusConfig[dispute.status].icon;
            return (
              <motion.div
                key={dispute.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedDispute(dispute)}
                className="cursor-pointer"
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <StatusIcon className={`w-5 h-5 ${statusConfig[dispute.status].color.split(' ')[1]}`} />
                        <div>
                          <p className="font-semibold">Commande #{dispute.order_id}</p>
                          <p className="text-sm text-gray-600">{dispute.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">{dispute.amount.toLocaleString()} XOF</p>
                        <Badge className={statusConfig[dispute.status].color}>
                          {statusConfig[dispute.status].label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

