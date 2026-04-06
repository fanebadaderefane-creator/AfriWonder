import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Car, Loader2 } from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import api from '@/api/expressClient';
import { toast } from 'sonner';

const VEHICLE_TYPES = [
  { id: 'moto', label: 'Moto' },
  { id: 'car', label: 'Voiture' },
  { id: 'tricycle', label: 'Tricycle' },
  { id: 'van', label: 'Van / Bus' },
];

export default function BecomeDriver() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    vehicle_type: 'moto',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_color: '',
    license_plate: '',
    license_number: '',
    bank_account: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone?.trim() || !form.license_plate?.trim()) {
      toast.error('Téléphone et numéro de plaque requis');
      return;
    }
    setLoading(true);
    try {
      await api.transport.drivers.updateProfile(form);
      toast.success('Profil conducteur enregistré. Vous pouvez accepter des courses.');
      setForm({ ...form, license_plate: '', license_number: '' });
    } catch (err) {
      toast.error(err?.apiMessage || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Transport')}>
            <Button variant="ghost" size="icon" className="text-white" aria-label="Retour"><ArrowLeft className="w-5 h-5" aria-hidden="true" /></Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Devenir conducteur</h1>
          <div className="w-10" />
        </div>
      </div>
      <div className="p-4 pb-24">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Car className="w-5 h-5" /> Inscription</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-gray-300">Téléphone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+223 00 00 00 00"
                  className="bg-white/10 border-white/20 text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300">Type de véhicule *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {VEHICLE_TYPES.map((v) => (
                    <Button
                      key={v.id}
                      type="button"
                      variant={form.vehicle_type === v.id ? 'default' : 'outline'}
                      size="sm"
                      className={form.vehicle_type === v.id ? 'bg-green-500' : 'border-white/30 text-white'}
                      onClick={() => setForm({ ...form, vehicle_type: v.id })}
                    >
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300">Marque</Label>
                  <Input value={form.vehicle_brand} onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })} className="bg-white/10 border-white/20 text-white mt-1" placeholder="ex. Yamaha" />
                </div>
                <div>
                  <Label className="text-gray-300">Modèle</Label>
                  <Input value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} className="bg-white/10 border-white/20 text-white mt-1" placeholder="ex. NMAX" />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Plaque d'immatriculation *</Label>
                <Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} className="bg-white/10 border-white/20 text-white mt-1" placeholder="ex. BK 1234 A1" required />
              </div>
              <div>
                <Label className="text-gray-300">N° permis (optionnel)</Label>
                <Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="bg-white/10 border-white/20 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-300">Compte bancaire (paiements)</Label>
                <Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} className="bg-white/10 border-white/20 text-white mt-1" placeholder="IBAN ou numéro de compte" />
              </div>
              <Button type="submit" className="w-full bg-green-500 hover:bg-green-600" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Enregistrer mon profil'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
}
