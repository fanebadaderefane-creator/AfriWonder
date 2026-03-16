// CPO 7.19 — Contrats et droits musicaux (créateur)
import React, { useState } from 'react';
import { api } from '@/api/expressClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import BottomNav from '@/components/navigation/BottomNav';

const CONTRACT_TYPES = [
  { value: 'music_license', label: 'Licence musicale' },
  { value: 'rights_agreement', label: 'Accord de droits' },
  { value: 'partnership', label: 'Partenariat' },
];

export default function CreatorContracts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    type: 'music_license',
    provider: '',
    reference: '',
    start_at: '',
    end_at: '',
    notes: '',
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['me-creator-contracts'],
    queryFn: () => api.me.getCreatorContracts(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.me.createCreatorContract(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-creator-contracts'] });
      setDialogOpen(false);
      setForm({ type: 'music_license', provider: '', reference: '', start_at: '', end_at: '', notes: '' });
      toast.success('Contrat ajouté');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.me.updateCreatorContract(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-creator-contracts'] });
      setDialogOpen(false);
      setEditingId(null);
      toast.success('Contrat mis à jour');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.me.deleteCreatorContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-creator-contracts'] });
      toast.success('Contrat supprimé');
    },
    onError: (e) => toast.error(e?.response?.data?.error?.message || e?.message || 'Erreur'),
  });

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      type: c.type || 'music_license',
      provider: c.provider || '',
      reference: c.reference || '',
      start_at: c.start_at ? new Date(c.start_at).toISOString().slice(0, 10) : '',
      end_at: c.end_at ? new Date(c.end_at).toISOString().slice(0, 10) : '',
      notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      type: form.type,
      provider: form.provider || undefined,
      reference: form.reference || undefined,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : undefined,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : undefined,
      notes: form.notes || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Contrats & droits (CPO 7.19)</h1>
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto">
        <p className="text-sm text-gray-600 mb-4">Gérez vos licences musicales, accords de droits et partenariats.</p>
        <Button className="rounded-xl mb-4 w-full" onClick={() => { setEditingId(null); setForm({ type: 'music_license', provider: '', reference: '', start_at: '', end_at: '', notes: '' }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un contrat
        </Button>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : contracts.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Aucun contrat enregistré.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <Card key={c.id} className="border-gray-200">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{CONTRACT_TYPES.find((t) => t.value === c.type)?.label || c.type}</p>
                    {c.provider && <p className="text-sm text-gray-600">{c.provider}</p>}
                    {c.reference && <p className="text-xs text-gray-500">Ref. {c.reference}</p>}
                    <p className="text-xs text-gray-500 mt-1">{formatDate(c.start_at)} → {formatDate(c.end_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => openEdit(c)} aria-label="Modifier">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-lg text-red-600" onClick={() => deleteMutation.mutate(c.id)} disabled={deleteMutation.isPending} aria-label="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le contrat' : 'Nouveau contrat'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <Input placeholder="Fournisseur / partenaire" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} className="rounded-lg" />
            <Input placeholder="Référence" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} className="rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" placeholder="Début" value={form.start_at} onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))} className="rounded-lg" />
              <Input type="date" placeholder="Fin" value={form.end_at} onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))} className="rounded-lg" />
            </div>
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="rounded-lg" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
