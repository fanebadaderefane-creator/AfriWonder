import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Shield, Heart, Car, Home,
  Plane, Users, FileText, CheckCircle, Clock, Building2
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import CommissionNotice from '@/components/CommissionNotice';
import api from '@/api/expressClient';

const MOCK_POLICIES = [
  { id: 1, type: 'Santé', provider: 'NSIA Assurances', status: 'active', nextPayment: '15 Mars 2027', premium: 5000 },
  { id: 2, type: 'Auto', provider: 'Sunu Assurances', status: 'active', nextPayment: '22 Mars 2027', premium: 15000 },
];

const TYPE_LABELS = {
  health: 'Santé',
  vehicle: 'Auto/Moto',
  property: 'Habitation',
  travel: 'Voyage',
  life: 'Vie',
  micro: 'Micro-assurance',
};

export default function Insurance() {
  const detailCardRef = useRef(null);
  const [selectedType, setSelectedType] = useState('health');
  const [myPolicies, setMyPolicies] = useState(MOCK_POLICIES);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [policyDetail, setPolicyDetail] = useState(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [subscribeSubmitting, setSubscribeSubmitting] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [subscribeForm, setSubscribeForm] = useState({
    provider: '',
    premium_amount: '',
    payment_frequency: 'monthly',
  });
  const [claimForm, setClaimForm] = useState({
    policy_id: '',
    incident_date: '',
    description: '',
    claim_amount: '',
  });

  const [approvedProviders, setApprovedProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [prestataireOpen, setPrestataireOpen] = useState(false);
  const [prestataireSuccess, setPrestataireSuccess] = useState(false);
  const [prestataireLoading, setPrestataireLoading] = useState(false);
  const [prestataireError, setPrestataireError] = useState(null);
  const [prestataireForm, setPrestataireForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    types_offered: [],
    license_ref: '',
  });

  const [devisOpen, setDevisOpen] = useState(false);
  const [devisOffer, setDevisOffer] = useState(null);
  const [devisForm, setDevisForm] = useState({ fullName: '', phone: '', additionalInfo: '' });
  const [devisSubmitting, setDevisSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.insurance.policies.listMy()
      .then((list) => {
        if (cancelled) return;
        if (Array.isArray(list) && list.length) setMyPolicies(list.map((p) => ({
          id: p.id,
          type: p.policy_type ? TYPE_LABELS[p.policy_type] || p.policy_type : (p.plan_name || 'Assurance'),
          provider: p.provider,
          status: p.status === 'active' ? 'active' : 'pending',
          nextPayment: p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString('fr-FR') : '—',
          premium: p.premium_amount,
        })));
      })
      .catch(() => { if (!cancelled) setMyPolicies(MOCK_POLICIES); })
      .finally(() => { if (!cancelled) setLoadingPolicies(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.insurance.providers.list()
      .then((list) => {
        if (cancelled) return;
        setApprovedProviders(Array.isArray(list) ? list : []);
      })
      .catch(() => { if (!cancelled) setApprovedProviders([]); })
      .finally(() => { if (!cancelled) setLoadingProviders(false); });
    return () => { cancelled = true; };
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const insuranceTypes = [
    { id: 'health', name: 'Santé', icon: Heart, color: 'from-orange-500 to-red-500', price: '5,000 FCFA/mois', premium: 5000 },
    { id: 'vehicle', name: 'Auto/Moto', icon: Car, color: 'from-orange-500 to-amber-500', price: '15,000 FCFA/mois', premium: 15000 },
    { id: 'property', name: 'Habitation', icon: Home, color: 'from-amber-500 to-orange-600', price: '8,000 FCFA/mois', premium: 8000 },
    { id: 'travel', name: 'Voyage', icon: Plane, color: 'from-orange-600 to-red-600', price: '3,000 FCFA/trajet', premium: 3000 },
    { id: 'life', name: 'Vie', icon: Users, color: 'from-red-500 to-orange-500', price: '10,000 FCFA/mois', premium: 10000 },
    { id: 'micro', name: 'Micro-assurance', icon: Shield, color: 'from-yellow-500 to-orange-500', price: '1,500 FCFA/mois', premium: 1500 },
  ];

  const devisOffersByType = {
    health: { key: 'sante_standard', name: 'Assurance Santé Standard', priceDisplay: '5 000 FCFA/mois' },
    vehicle: { key: 'auto_basique', name: 'Assurance Auto Basique', priceDisplay: '50 000 FCFA/an' },
    property: { key: 'habitation_standard', name: 'Assurance Habitation Standard', priceDisplay: '8 000 FCFA/mois' },
    travel: { key: 'voyage_trajet', name: 'Assurance Voyage par trajet', priceDisplay: '3 000 FCFA/trajet' },
    life: { key: 'vie_standard', name: 'Assurance Vie Standard', priceDisplay: '10 000 FCFA/mois' },
    micro: { key: 'micro_standard', name: 'Micro-assurance', priceDisplay: '1 500 FCFA/mois' },
  };

  const defaultProviderLogos = { 'NSIA Assurances': '🛡️', 'Sunu Assurances': '🏛️', 'Allianz': '⚡', 'AXA': '🔷' };
  const providers = approvedProviders.length > 0
    ? approvedProviders.map((p) => ({
        id: p.id,
        name: p.company_name,
        logo: defaultProviderLogos[p.company_name] || '🛡️',
        rating: 4.5,
        policies: 0,
        description: p.description,
        types_offered: p.types_offered || [],
      }))
    : [
        { id: '1', name: 'NSIA Assurances', logo: '🛡️', rating: 4.7, policies: 12500 },
        { id: '2', name: 'Sunu Assurances', logo: '🏛️', rating: 4.6, policies: 10200 },
        { id: '3', name: 'Allianz', logo: '⚡', rating: 4.8, policies: 15000 },
        { id: '4', name: 'AXA', logo: '🔷', rating: 4.5, policies: 8500 },
      ];

  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId);
    setSubscribeForm((prev) => ({
      ...prev,
      premium_amount: String(insuranceTypes.find((t) => t.id === typeId)?.premium ?? ''),
      provider: prev.provider || providers[0]?.name || '',
    }));
    requestAnimationFrame(() => {
      detailCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openSubscribe = () => {
    const type = insuranceTypes.find((t) => t.id === selectedType);
    setSubscribeForm({
      provider: providers[0]?.name ?? '',
      premium_amount: type ? String(type.premium) : '',
      payment_frequency: 'monthly',
    });
    setSubscribeOpen(true);
  };

  const openDevis = () => {
    const offer = devisOffersByType[selectedType] || devisOffersByType.vehicle;
    setDevisOffer(offer);
    setDevisForm({ fullName: '', phone: '', additionalInfo: '' });
    setDevisOpen(true);
  };

  const handleDevisSubmit = async (e) => {
    e.preventDefault();
    if (!devisOffer) return;
    const fullName = devisForm.fullName?.trim();
    const phone = devisForm.phone?.trim();
    if (!fullName || !phone) {
      showToast('Veuillez remplir le nom et le téléphone.', 'error');
      return;
    }
    setDevisSubmitting(true);
    try {
      await api.insurance.quoteRequests.create({
        full_name: fullName,
        phone,
        additional_info: devisForm.additionalInfo?.trim() || undefined,
        offer_key: devisOffer.key,
        offer_name: devisOffer.name,
        price_display: devisOffer.priceDisplay,
      });
      setDevisOpen(false);
      showToast('Demande de devis enregistrée. Un conseiller vous contactera.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l’envoi.', 'error');
    } finally {
      setDevisSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    const provider = subscribeForm.provider?.trim();
    const premium = Number(subscribeForm.premium_amount);
    if (!provider || !premium || premium <= 0) {
      showToast('Veuillez remplir l’assureur et le montant.', 'error');
      return;
    }
    setSubscribeSubmitting(true);
    try {
      await api.insurance.policies.subscribe({
        policy_type: selectedType,
        provider,
        premium_amount: premium,
        payment_frequency: subscribeForm.payment_frequency,
      });
      setSubscribeOpen(false);
      showToast('Demande de souscription envoyée. Vous serez contacté par l’assureur.', 'success');
      const list = await api.insurance.policies.listMy();
      if (Array.isArray(list) && list.length) setMyPolicies(list.map((p) => ({
        id: p.id,
        type: p.policy_type ? TYPE_LABELS[p.policy_type] || p.policy_type : (p.plan_name || 'Assurance'),
        provider: p.provider,
        status: p.status === 'active' ? 'active' : 'pending',
        nextPayment: p.next_payment_date ? new Date(p.next_payment_date).toLocaleDateString('fr-FR') : '—',
        premium: p.premium_amount,
      })));
    } catch (e) {
      showToast(e.response?.data?.message || 'Erreur lors de la souscription.', 'error');
    } finally {
      setSubscribeSubmitting(false);
    }
  };

  const openClaim = () => {
    setClaimForm({
      policy_id: myPolicies[0]?.id ? String(myPolicies[0].id) : '',
      incident_date: new Date().toISOString().slice(0, 10),
      description: '',
      claim_amount: '',
    });
    setClaimOpen(true);
  };

  const handleClaim = async () => {
    const policy_id = claimForm.policy_id?.trim();
    const incident_date = claimForm.incident_date;
    const description = claimForm.description?.trim();
    const claim_amount = Number(claimForm.claim_amount);
    if (!policy_id || !incident_date || !description || !claim_amount || claim_amount <= 0) {
      showToast('Veuillez remplir tous les champs (police, date, description, montant).', 'error');
      return;
    }
    setClaimSubmitting(true);
    try {
      await api.insurance.claims.create({
        policy_id,
        incident_date,
        description,
        claim_amount,
      });
      setClaimOpen(false);
      showToast('Sinistre déclaré. Un expert vous contactera.', 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'Erreur lors de la déclaration.', 'error');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const coverageByType = {
    health: ['Consultations médicales illimitées', 'Hospitalisation 100%', 'Médicaments remboursés à 80%', 'Analyses et examens', 'Dentaire et optique'],
    vehicle: ['Responsabilité civile', 'Dommages collision', 'Vol et vandalisme', 'Assistance 24/7'],
    property: ['Incendie et dégâts des eaux', 'Vol avec effraction', 'Responsabilité civile habitation', 'Dommages électriques'],
    travel: ['Frais médicaux à l\'étranger', 'Rapatriement', 'Bagages et annulation', 'Assistance voyage'],
    life: ['Capital décès', 'Rentes invalidité', 'Épargne retraite', 'Garanties complémentaires'],
    micro: ['Couverture essentielle', 'Prime adaptée', 'Souscription simplifiée', 'Renouvellement flexible'],
  };
  const currentCoverage = coverageByType[selectedType] || coverageByType.health;
  const currentTypeInfo = insuranceTypes.find((t) => t.id === selectedType);

  const handlePrestataireSubmit = async (e) => {
    e.preventDefault();
    if (!prestataireForm.company_name?.trim() || !prestataireForm.contact_name?.trim() || !prestataireForm.email?.trim() || !prestataireForm.phone?.trim()) {
      setPrestataireError('Veuillez remplir le nom de la compagnie, le contact, l’email et le téléphone.');
      return;
    }
    setPrestataireError(null);
    setPrestataireLoading(true);
    try {
      await api.insurance.providers.register({
        company_name: prestataireForm.company_name.trim(),
        contact_name: prestataireForm.contact_name.trim(),
        email: prestataireForm.email.trim(),
        phone: prestataireForm.phone.trim(),
        address: prestataireForm.address?.trim() || undefined,
        city: prestataireForm.city?.trim() || undefined,
        description: prestataireForm.description?.trim() || undefined,
        types_offered: Array.isArray(prestataireForm.types_offered) ? prestataireForm.types_offered : [],
        license_ref: prestataireForm.license_ref?.trim() || undefined,
      });
      setPrestataireSuccess(true);
    } catch (err) {
      setPrestataireError(err.response?.data?.message || 'Erreur lors de l’envoi. Réessayez.');
    } finally {
      setPrestataireLoading(false);
    }
  };

  const togglePrestataireType = (typeId) => {
    setPrestataireForm((prev) => {
      const arr = Array.isArray(prev.types_offered) ? [...prev.types_offered] : [];
      const idx = arr.indexOf(typeId);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(typeId);
      return { ...prev, types_offered: arr };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/40 to-slate-900">
      <div className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-orange-500/20">
        <div className="flex items-center justify-between p-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white hover:bg-orange-500/20"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Assurances</h1>
          <Button variant="ghost" size="icon" className="text-white hover:bg-orange-500/20" onClick={() => setDocsOpen(true)}><FileText className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="p-4 pb-24 space-y-6">
        {(loadingPolicies || myPolicies.length > 0) && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Mes assurances</h2>
            {loadingPolicies && <p className="text-orange-200/80 py-2">Chargement...</p>}
            {!loadingPolicies && (
              <div className="space-y-3">
                {myPolicies.map((policy) => (
                  <motion.div key={policy.id} whileTap={{ scale: 0.98 }}>
                    <Card
                      className="bg-white/10 backdrop-blur-md border-orange-500/20 cursor-pointer hover:bg-white/15 transition-colors"
                      onClick={() => setPolicyDetail(policy)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-white">{policy.type}</h3>
                            <p className="text-xs text-orange-200/70">{policy.provider}</p>
                          </div>
                          <Badge className="bg-orange-500/30 text-orange-200 border-orange-400/40"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-orange-200/80">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Prochain paiement: {policy.nextPayment}</span>
                          </div>
                          <p className="font-bold text-white">{Number(policy.premium).toLocaleString()} FCFA</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-white mb-3">Types d'assurance</h2>
          <div className="grid grid-cols-2 gap-3">
            {insuranceTypes.map((type) => {
              const Icon = type.icon;
              return (
                <motion.button
                  key={type.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTypeSelect(type.id)}
                  className={`p-4 rounded-xl text-white text-center transition-all border ${selectedType === type.id ? `bg-gradient-to-br ${type.color} shadow-lg border-orange-400/50` : 'bg-white/10 hover:bg-orange-500/20 border-orange-500/20'}`}
                >
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-semibold mb-1">{type.name}</p>
                  <p className="text-xs opacity-90">{type.price}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        <Card ref={detailCardRef} className="bg-white/10 backdrop-blur-md border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-white">Assurance {currentTypeInfo?.name ?? 'Santé'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">Couverture incluse:</h3>
              <ul className="space-y-2">
                {currentCoverage.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-orange-200/90"><CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />{item}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" onClick={openSubscribe}>Souscrire maintenant</Button>
              <Button variant="outline" className="w-full border-orange-400/50 text-orange-200 hover:bg-orange-500/20" onClick={openDevis}>Demander un devis</Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-bold text-white mb-3">Compagnies d'assurance</h2>
          <div className="space-y-3">
            {providers.map((provider) => (
              <motion.div
                key={provider.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-white/10 backdrop-blur-md border border-orange-500/20 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl">{provider.logo}</div>
                  <div>
                    <p className="font-semibold text-white">{provider.name}</p>
                    <p className="text-xs text-orange-200/70">{provider.policies.toLocaleString()} polices actives</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1"><span className="text-yellow-400">⭐</span><span className="text-white font-semibold text-sm">{provider.rating}</span></div>
                  <Button size="sm" variant="outline" className="text-xs border-orange-400/50 text-orange-200 hover:bg-orange-500/20" onClick={() => handleTypeSelect('health')}>Voir offres</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Devenir prestataire assurance */}
        <div className="rounded-xl bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 p-6 text-center">
          <Building2 className="w-12 h-12 text-orange-400 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-2">Vous êtes assureur ?</h3>
          <p className="text-sm text-orange-200/90 mb-4">
            Rejoignez AfriWonder et proposez vos offres. Votre compagnie sera validée par un administrateur (AfriWonder) avant d’apparaître sur la plateforme.
          </p>
          <Button
            onClick={() => {
              setPrestataireError(null);
              setPrestataireSuccess(false);
              setPrestataireForm({ company_name: '', contact_name: '', email: '', phone: '', address: '', city: '', description: '', types_offered: [], license_ref: '' });
              setPrestataireOpen(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            Devenir prestataire
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-400/40">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <h3 className="font-bold text-white mb-2">Déclarer un sinistre</h3>
            <p className="text-sm text-orange-200/90 mb-4">Besoin d'assistance ? Déclarez votre sinistre en ligne</p>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" onClick={openClaim}>Déclarer un sinistre</Button>
          </CardContent>
        </Card>

        <CommissionNotice vertical="insurance" compact />
      </div>
      <BottomNav />

      {/* Détail d'une police */}
      <Dialog open={!!policyDetail} onOpenChange={(open) => !open && setPolicyDetail(null)}>
        <DialogContent className="bg-slate-900 border-orange-500/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">{policyDetail?.type} — {policyDetail?.provider}</DialogTitle>
            <DialogDescription className="text-orange-200/80">
              Détails de votre contrat. Prochain paiement : {policyDetail?.nextPayment}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm"><span className="text-orange-300">Prime :</span> {policyDetail && Number(policyDetail.premium).toLocaleString()} FCFA</p>
            <p className="text-sm"><span className="text-orange-300">Statut :</span> Actif</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-orange-400/50 text-orange-200" onClick={() => setPolicyDetail(null)}>Fermer</Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => { setPolicyDetail(null); openClaim(); }}>Déclarer un sinistre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Souscription */}
      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent className="bg-slate-900 border-orange-500/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Souscrire — {currentTypeInfo?.name}</DialogTitle>
            <DialogDescription className="text-orange-200/80">Remplissez les champs pour envoyer votre demande à l'assureur.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="text-orange-200/90">Assureur</Label>
              <select
                className="mt-1 w-full rounded-md bg-white/10 border border-orange-500/30 text-white px-3 py-2"
                value={subscribeForm.provider}
                onChange={(e) => setSubscribeForm((p) => ({ ...p, provider: e.target.value }))}
              >
                {providers.map((pr) => (
                  <option key={pr.id} value={pr.name} className="bg-slate-800 text-white">{pr.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-orange-200/90">Prime (FCFA)</Label>
              <Input
                type="number"
                className="mt-1 bg-white/10 border-orange-500/30 text-white"
                placeholder="ex. 5000"
                value={subscribeForm.premium_amount}
                onChange={(e) => setSubscribeForm((p) => ({ ...p, premium_amount: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-orange-200/90">Fréquence de paiement</Label>
              <select
                className="mt-1 w-full rounded-md bg-white/10 border border-orange-500/30 text-white px-3 py-2"
                value={subscribeForm.payment_frequency}
                onChange={(e) => setSubscribeForm((p) => ({ ...p, payment_frequency: e.target.value }))}
              >
                <option value="monthly" className="bg-slate-800">Mensuel</option>
                <option value="quarterly" className="bg-slate-800">Trimestriel</option>
                <option value="yearly" className="bg-slate-800">Annuel</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-orange-400/50 text-orange-200" onClick={() => setSubscribeOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSubscribe} disabled={subscribeSubmitting}>{subscribeSubmitting ? 'Envoi...' : 'Envoyer la demande'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Devis — Demander un devis */}
      <Dialog open={devisOpen} onOpenChange={setDevisOpen}>
        <DialogContent className="bg-slate-900 border-orange-500/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Devis — {devisOffer?.name}</DialogTitle>
            <DialogDescription className="text-orange-200/80">
              Renseignez vos coordonnées pour recevoir un devis personnalisé.
            </DialogDescription>
          </DialogHeader>
          {devisOffer && (
            <div className="rounded-xl bg-orange-500/20 border border-orange-400/40 p-4">
              <p className="font-semibold text-white">{devisOffer.name}</p>
              <p className="mt-1">
                <span className="text-2xl font-bold text-white">{devisOffer.priceDisplay?.split('/')[0]?.trim() ?? devisOffer.priceDisplay}</span>
                {devisOffer.priceDisplay?.includes('/') && (
                  <span className="text-base font-normal text-orange-200/90">/{devisOffer.priceDisplay.split('/').slice(1).join('/').trim()}</span>
                )}
              </p>
            </div>
          )}
          <form onSubmit={handleDevisSubmit} className="space-y-4 py-2">
            <div>
              <Label className="text-orange-200/90">Nom complet</Label>
              <Input
                className="mt-1 bg-white/10 border-orange-500/30 text-white"
                placeholder="Votre nom"
                value={devisForm.fullName}
                onChange={(e) => setDevisForm((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-orange-200/90">Téléphone</Label>
              <Input
                type="tel"
                className="mt-1 bg-white/10 border-orange-500/30 text-white"
                placeholder="+223 XX XX XX XX"
                value={devisForm.phone}
                onChange={(e) => setDevisForm((p) => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label className="text-orange-200/90">Informations complémentaires</Label>
              <textarea
                className="mt-1 w-full rounded-md bg-white/10 border border-orange-500/30 text-white px-3 py-2 min-h-[80px]"
                placeholder="Décrivez votre besoin..."
                value={devisForm.additionalInfo}
                onChange={(e) => setDevisForm((p) => ({ ...p, additionalInfo: e.target.value }))}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              disabled={devisSubmitting}
            >
              {devisSubmitting ? 'Envoi...' : 'Demander un devis'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Déclaration sinistre */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="bg-slate-900 border-orange-500/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Déclarer un sinistre</DialogTitle>
            <DialogDescription className="text-orange-200/80">Choisissez la police concernée et décrivez le sinistre.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="text-orange-200/90">Police concernée</Label>
              <select
                className="mt-1 w-full rounded-md bg-white/10 border border-orange-500/30 text-white px-3 py-2"
                value={claimForm.policy_id}
                onChange={(e) => setClaimForm((p) => ({ ...p, policy_id: e.target.value }))}
              >
                {myPolicies.map((pol) => (
                  <option key={pol.id} value={pol.id} className="bg-slate-800 text-white">{pol.type} — {pol.provider}</option>
                ))}
                {myPolicies.length === 0 && <option value="" className="bg-slate-800">Aucune police</option>}
              </select>
            </div>
            <div>
              <Label className="text-orange-200/90">Date du sinistre</Label>
              <Input
                type="date"
                className="mt-1 bg-white/10 border-orange-500/30 text-white"
                value={claimForm.incident_date}
                onChange={(e) => setClaimForm((p) => ({ ...p, incident_date: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-orange-200/90">Description</Label>
              <textarea
                className="mt-1 w-full rounded-md bg-white/10 border border-orange-500/30 text-white px-3 py-2 min-h-[80px]"
                placeholder="Décrivez les faits..."
                value={claimForm.description}
                onChange={(e) => setClaimForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-orange-200/90">Montant réclamé (FCFA)</Label>
              <Input
                type="number"
                className="mt-1 bg-white/10 border-orange-500/30 text-white"
                placeholder="ex. 50000"
                value={claimForm.claim_amount}
                onChange={(e) => setClaimForm((p) => ({ ...p, claim_amount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-orange-400/50 text-orange-200" onClick={() => setClaimOpen(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleClaim} disabled={claimSubmitting || myPolicies.length === 0}>{claimSubmitting ? 'Envoi...' : 'Déclarer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents / Aide */}
      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="bg-slate-900 border-orange-500/30 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Documents & Aide</DialogTitle>
            <DialogDescription className="text-orange-200/80">
              Vos contrats et attestations sont disponibles auprès de chaque assureur. Consultez le détail d’une police en cliquant dessus, ou souscrivez à une nouvelle assurance via « Types d’assurance ».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setDocsOpen(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Devenir prestataire assurance */}
      <Dialog open={prestataireOpen} onOpenChange={(open) => { setPrestataireOpen(open); if (!open) setPrestataireError(null); }}>
        <DialogContent className="bg-slate-900 border-orange-500/30 text-white max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Devenir prestataire Assurance</DialogTitle>
            <DialogDescription className="text-orange-200/80">
              Renseignez les informations de votre compagnie. Un administrateur AfriWonder validera votre inscription avant que vous n&apos;apparaissiez sur la plateforme.
            </DialogDescription>
          </DialogHeader>
          {prestataireSuccess ? (
            <div className="py-4 text-center space-y-4">
              <p className="text-orange-200 font-medium">
                Demande enregistrée. Vous serez notifié après validation par l&apos;administrateur AfriWonder.
              </p>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => { setPrestataireOpen(false); setPrestataireSuccess(false); }}>Fermer</Button>
            </div>
          ) : (
            <form onSubmit={handlePrestataireSubmit} className="space-y-4 py-2">
              {prestataireError && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 text-sm">{prestataireError}</div>
              )}
              <div>
                <Label className="text-orange-200/90">Nom de la compagnie *</Label>
                <Input className="mt-1 bg-white/10 border-orange-500/30 text-white" value={prestataireForm.company_name} onChange={(e) => setPrestataireForm((p) => ({ ...p, company_name: e.target.value }))} placeholder="ex. Ma Compagnie Assurances" required />
              </div>
              <div>
                <Label className="text-orange-200/90">Nom du contact *</Label>
                <Input className="mt-1 bg-white/10 border-orange-500/30 text-white" value={prestataireForm.contact_name} onChange={(e) => setPrestataireForm((p) => ({ ...p, contact_name: e.target.value }))} placeholder="Jean Dupont" required />
              </div>
              <div>
                <Label className="text-orange-200/90">Email *</Label>
                <Input type="email" className="mt-1 bg-white/10 border-orange-500/30 text-white" value={prestataireForm.email} onChange={(e) => setPrestataireForm((p) => ({ ...p, email: e.target.value }))} placeholder="contact@compagnie.com" required />
              </div>
              <div>
                <Label className="text-orange-200/90">Téléphone *</Label>
                <Input type="tel" className="mt-1 bg-white/10 border-orange-500/30 text-white" value={prestataireForm.phone} onChange={(e) => setPrestataireForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+223 XX XX XX XX" required />
              </div>
              <div>
                <Label className="text-orange-200/90">Adresse</Label>
                <Input className="mt-1 bg-white/10 border-orange-500/30 text-white" value={prestataireForm.address} onChange={(e) => setPrestataireForm((p) => ({ ...p, address: e.target.value }))} placeholder="Adresse du siège" />
              </div>
              <div>
                <Label className="text-orange-200/90">Ville</Label>
                <Input className="mt-1 bg-white/10 border-orange-500/30 text-white" value={prestataireForm.city} onChange={(e) => setPrestataireForm((p) => ({ ...p, city: e.target.value }))} placeholder="Bamako" />
              </div>
              <div>
                <Label className="text-orange-200/90">Description (optionnel)</Label>
                <textarea className="mt-1 w-full rounded-md bg-white/10 border border-orange-500/30 text-white px-3 py-2 min-h-[60px]" value={prestataireForm.description} onChange={(e) => setPrestataireForm((p) => ({ ...p, description: e.target.value }))} placeholder="Présentation de votre compagnie" />
              </div>
              <div>
                <Label className="text-orange-200/90 mb-2 block">Types d&apos;assurance proposés</Label>
                <div className="flex flex-wrap gap-2">
                  {insuranceTypes.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(prestataireForm.types_offered || []).includes(t.id)} onChange={() => togglePrestataireType(t.id)} className="rounded border-orange-500/50" />
                      <span className="text-sm text-orange-200/90">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-orange-200/90">Référence agrément / licence (optionnel)</Label>
                <Input className="mt-1 bg-white/10 border-orange-500/30 text-white" value={prestataireForm.license_ref} onChange={(e) => setPrestataireForm((p) => ({ ...p, license_ref: e.target.value }))} placeholder="N° agrément" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" className="border-orange-400/50 text-orange-200" onClick={() => setPrestataireOpen(false)}>Annuler</Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={prestataireLoading}>{prestataireLoading ? 'Envoi...' : 'Soumettre ma demande'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 z-[100] rounded-lg px-4 py-3 text-center text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600/90 text-white' : toast.type === 'error' ? 'bg-red-600/90 text-white' : 'bg-slate-700/95 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
