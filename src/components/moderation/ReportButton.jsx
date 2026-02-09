import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from "sonner";

const reportReasons = [
  { value: 'spam', label: 'Spam ou contenu en masse' },
  { value: 'harassment', label: 'Harcèlement ou intimidation' },
  { value: 'hate_speech', label: 'Discours haineux ou discriminatoire' },
  { value: 'explicit_content', label: 'Contenu explicite ou pornographique' },
  { value: 'misinformation', label: 'Désinformation ou contenu faux' },
  { value: 'copyright', label: 'Violation de droits d\'auteur' },
  { value: 'scam', label: 'Fraude ou arnaque' },
  { value: 'other', label: 'Autre (veuillez expliquer)' },
];

export default function ReportButton({ contentType, contentId, contentPreview, reportedUserId, reportedUserName, className = '' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
      } catch (_e) {}
    };
    getUser();
  }, []);

  const handleSubmit = async () => {
    if (!reason || !description.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await api.entities.Moderation.create({
        reported_user_id: reportedUserId,
        reported_user_name: reportedUserName,
        reporter_id: user?.id,
        reporter_name: user?.full_name || user?.email,
        content_type: contentType,
        content_id: contentId,
        content_preview: contentPreview?.substring(0, 100),
        reason: reason,
        description: description,
        status: 'pending',
        severity: ['harassment', 'hate_speech', 'explicit_content'].includes(reason) ? 'high' : 'medium'
      });

      setSubmitted(true);
      toast.success('Signalement envoyé. Merci!');
      
      setTimeout(() => {
        setOpen(false);
        setReason('');
        setDescription('');
        setSubmitted(false);
      }, 2000);
    } catch (_error) {
      toast.error('Erreur: ' + error._message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={`text-red-600 hover:bg-red-50 ${className}`}
      >
        <Flag className="w-4 h-4 mr-1" />
        Signaler
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          {!submitted ? (
            <>
              <DialogHeader>
                <DialogTitle>Signaler ce contenu</DialogTitle>
                <DialogDescription>
                  Aidez-nous à maintenir une communauté sûre en signalant les contenus inappropriés.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Votre identité reste confidentielle. Ce signalement sera examiné par notre équipe de modération.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Raison du signalement</label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une raison" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportReasons.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Détails (optionnel)</label>
                  <Textarea
                    placeholder="Décrivez le problème..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-24"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {loading ? 'Envoi...' : 'Signaler'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <DialogTitle className="sr-only">Signalement envoyé</DialogTitle>
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <h3 className="font-semibold text-gray-900">Merci!</h3>
              <p className="text-sm text-gray-500 text-center mt-1">
                Votre signalement a é_té envoyé et sera examiné rapidement.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


