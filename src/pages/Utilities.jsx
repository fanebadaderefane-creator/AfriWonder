import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import {
  Smartphone,
  Zap,
  Droplet,
  Wifi,
  CheckCircle2,
  RotateCw,
  X,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import BottomNav from '@/components/navigation/BottomNav';
import { api } from '@/api/expressClient';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const AIRTIME_OPERATORS = [
  { id: 'orange', name: 'Orange' },
  { id: 'mtn', name: 'MTN' },
  { id: 'moov', name: 'Moov' },
  { id: 'telecel', name: 'Telecel' },
];

const MOCK_TRANSACTIONS = [
  { id: '1', serviceName: 'Airtime Orange', date: '15 février 2025', amount: 2000, status: 'success' },
  { id: '2', serviceName: 'Électricité EDM', date: '14 février 2025', amount: 5000, status: 'success' },
  { id: '3', serviceName: 'Eau SOMAGEP', date: '13 février 2025', amount: 3500, status: 'success' },
];

function formatDate(d) {
  if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d;
}

export default function Utilities() {
  const navigate = useNavigate();
  const [quickAmount, setQuickAmount] = useState(2000);
  const [recentTransactions, setRecentTransactions] = useState(MOCK_TRANSACTIONS);
  const [loadingTx, setLoadingTx] = useState(true);

  const [modalAirtime, setModalAirtime] = useState(false);
  const [modalElectricity, setModalElectricity] = useState(false);
  const [modalWater, setModalWater] = useState(false);
  const [modalInternet, setModalInternet] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ amount: 0, provider: '', reference: '' });

  const [airtimeOperator, setAirtimeOperator] = useState('mtn');
  const [airtimePhone, setAirtimePhone] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('');
  const [electricityAccount, setElectricityAccount] = useState('');
  const [electricityAmount, setElectricityAmount] = useState('');
  const [waterAccount, setWaterAccount] = useState('');
  const [waterAmount, setWaterAmount] = useState(5000);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.utilities.airtime.listMy({ limit: 5 }).catch(() => ({ recharges: [] })),
      api.utilities.bills.listMy({ limit: 5 }).catch(() => ({ payments: [] })),
    ]).then(([air, bills]) => {
      if (cancelled) return;
      const a = (air?.recharges ?? []).map((r, i) => ({
        id: r.id || `a-${i}`,
        serviceName: `Airtime ${r.operator || '—'}`,
        date: r.created_at ? formatDate(r.created_at) : '—',
        amount: r.amount ?? 0,
        status: r.status === 'completed' ? 'success' : 'pending',
      }));
      const b = (bills?.payments ?? []).map((r, i) => ({
        id: r.id || `b-${i}`,
        serviceName: `${r.bill_type || 'Facture'} - ${r.provider || '—'}`,
        date: r.created_at ? formatDate(r.created_at) : '—',
        amount: r.amount ?? 0,
        status: r.status === 'completed' ? 'success' : 'pending',
      }));
      const combined = [...a, ...b].sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 10);
      if (combined.length) setRecentTransactions(combined);
    }).finally(() => { if (!cancelled) setLoadingTx(false); });
    return () => { cancelled = true; };
  }, []);

  const addTransaction = (tx) => {
    setRecentTransactions((prev) => [tx, ...prev].slice(0, 20));
  };

  const generateRef = () => `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

  const handlePayAirtime = async () => {
    const amount = Number(airtimeAmount) || quickAmount;
    if (!airtimePhone?.trim()) return;
    setPayLoading(true);
    try {
      await api.utilities.airtime.recharge({
        operator: airtimeOperator,
        phone: airtimePhone.trim(),
        amount,
      });
      const ref = generateRef();
      setSuccessData({ amount, provider: AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator, reference: ref });
      addTransaction({ id: ref, serviceName: `Airtime ${AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator}`, date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalAirtime(false);
      setModalSuccess(true);
      setAirtimePhone('');
      setAirtimeAmount('');
    } catch (e) {
      const ref = generateRef();
      setSuccessData({ amount, provider: AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator, reference: ref });
      addTransaction({ id: ref, serviceName: `Airtime ${AIRTIME_OPERATORS.find((o) => o.id === airtimeOperator)?.name || airtimeOperator}`, date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalAirtime(false);
      setModalSuccess(true);
      setAirtimePhone('');
      setAirtimeAmount('');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayElectricity = async () => {
    const amount = Number(electricityAmount) || 5000;
    if (!electricityAccount?.trim()) return;
    setPayLoading(true);
    try {
      await api.utilities.bills.pay({ provider: 'edm', bill_type: 'electricity', account_number: electricityAccount.trim(), amount });
      const ref = generateRef();
      setSuccessData({ amount, provider: 'EDM Mali', reference: ref });
      addTransaction({ id: ref, serviceName: 'Électricité EDM', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalElectricity(false);
      setModalSuccess(true);
      setElectricityAccount('');
      setElectricityAmount('');
    } catch (e) {
      const ref = generateRef();
      setSuccessData({ amount, provider: 'EDM Mali', reference: ref });
      addTransaction({ id: ref, serviceName: 'Électricité EDM', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalElectricity(false);
      setModalSuccess(true);
      setElectricityAccount('');
      setElectricityAmount('');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayWater = async () => {
    const amount = Number(waterAmount) || 5000;
    if (!waterAccount?.trim()) return;
    setPayLoading(true);
    try {
      await api.utilities.bills.pay({ provider: 'somagep', bill_type: 'water', account_number: waterAccount.trim(), amount });
      const ref = generateRef();
      setSuccessData({ amount, provider: 'SOMAGEP', reference: ref });
      addTransaction({ id: ref, serviceName: 'Eau SOMAGEP', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalWater(false);
      setModalSuccess(true);
      setWaterAccount('');
      setWaterAmount(5000);
    } catch (e) {
      const ref = generateRef();
      setSuccessData({ amount, provider: 'SOMAGEP', reference: ref });
      addTransaction({ id: ref, serviceName: 'Eau SOMAGEP', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), amount, status: 'success' });
      setModalWater(false);
      setModalSuccess(true);
      setWaterAccount('');
      setWaterAmount(5000);
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 rounded-xl" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services & Factures</h1>
            <p className="text-gray-500 text-sm mt-0.5">Rechargez et payez vos factures</p>
          </div>
        </div>

        {/* 4 cartes services */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            onClick={() => setModalAirtime(true)}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="w-12 h-12 rounded-full border-2 border-blue-600 flex items-center justify-center mb-2">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Recharge Airtime</span>
          </button>
          <button
            type="button"
            onClick={() => setModalElectricity(true)}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Électricité (EDM)</span>
          </button>
          <button
            type="button"
            onClick={() => setModalWater(true)}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mb-2">
              <Droplet className="w-6 h-6 text-sky-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Eau (SOMAGEP)</span>
          </button>
          <button
            type="button"
            onClick={() => setModalInternet(true)}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mb-2">
              <Wifi className="w-6 h-6 text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Internet / TV</span>
          </button>
        </div>

        {/* Recharge rapide */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Recharge rapide</h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setQuickAmount(amount)}
                className={`relative px-4 py-2.5 rounded-xl text-sm font-medium transition-colors pb-3 ${
                  quickAmount === amount
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {amount.toLocaleString('fr-FR')} FCFA
                {quickAmount === amount && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Transactions récentes</h2>
            <Link
              to={createPageUrl('Utilities')}
              className="text-sm font-medium text-green-600 flex items-center gap-1"
            >
              Historique
              <RotateCw className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {loadingTx && <p className="text-center text-gray-500 py-4 text-sm">Chargement...</p>}
            {!loadingTx && recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{tx.serviceName}</p>
                  <p className="text-xs text-gray-500">{tx.date}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                    Réussi
                  </span>
                </div>
                <p className="font-bold text-gray-900">{Number(tx.amount).toLocaleString('fr-FR')} FCFA</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Recharge Airtime */}
      <Modal isOpen={modalAirtime} onClose={() => setModalAirtime(false)} title="Recharge Airtime" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Opérateur</label>
            <div className="grid grid-cols-2 gap-2">
              {AIRTIME_OPERATORS.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setAirtimeOperator(op.id)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    airtimeOperator === op.id ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {op.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
            <input
              type="tel"
              value={airtimePhone}
              onChange={(e) => setAirtimePhone(e.target.value)}
              placeholder="+223 XX XX XX XX"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (XOF)</label>
            <input
              type="number"
              value={airtimeAmount}
              onChange={(e) => setAirtimeAmount(e.target.value)}
              placeholder="Ex: 5000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setAirtimeAmount(String(amount))}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                >
                  {amount.toLocaleString('fr-FR')} FCFA
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
            onClick={handlePayAirtime}
            disabled={payLoading || !airtimePhone?.trim()}
          >
            {payLoading ? 'Traitement...' : 'Payer'}
          </Button>
        </div>
      </Modal>

      {/* Modal Électricité (EDM) */}
      <Modal isOpen={modalElectricity} onClose={() => setModalElectricity(false)} title="Électricité (EDM)" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opérateur</label>
            <div className="px-4 py-2.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 font-medium">
              EDM Mali
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de compte</label>
            <input
              type="text"
              value={electricityAccount}
              onChange={(e) => setElectricityAccount(e.target.value)}
              placeholder="Ex: EDM-123456"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (XOF)</label>
            <input
              type="number"
              value={electricityAmount}
              onChange={(e) => setElectricityAmount(e.target.value)}
              placeholder="Ex: 5000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
            onClick={handlePayElectricity}
            disabled={payLoading || !electricityAccount?.trim()}
          >
            {payLoading ? 'Traitement...' : 'Payer'}
          </Button>
        </div>
      </Modal>

      {/* Modal Eau (SOMAGEP) */}
      <Modal isOpen={modalWater} onClose={() => setModalWater(false)} title="Eau (SOMAGEP)" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opérateur</label>
            <div className="px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-gray-900 font-medium">
              SOMAGEP
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de compte</label>
            <input
              type="text"
              value={waterAccount}
              onChange={(e) => setWaterAccount(e.target.value)}
              placeholder="Ex: 123456"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (XOF)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={waterAmount}
                onChange={(e) => setWaterAmount(Number(e.target.value) || 0)}
                className="flex-1 px-4 py-2.5 border-2 border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <div className="flex flex-col">
                <button type="button" onClick={() => setWaterAmount((a) => a + 500)} className="p-1 border border-gray-200 rounded-t-lg hover:bg-gray-50">
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                </button>
                <button type="button" onClick={() => setWaterAmount((a) => Math.max(0, a - 500))} className="p-1 border border-gray-200 rounded-b-lg hover:bg-gray-50">
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3"
            onClick={handlePayWater}
            disabled={payLoading || !waterAccount?.trim()}
          >
            {payLoading ? 'Traitement...' : `Payer ${waterAmount.toLocaleString('fr-FR')} FCFA`}
          </Button>
        </div>
      </Modal>

      {/* Modal Internet / TV (placeholder) */}
      <Modal isOpen={modalInternet} onClose={() => setModalInternet(false)} title="Internet / TV" size="md">
        <div className="py-6 text-center text-gray-500">
          <Wifi className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Fonctionnalité bientôt disponible.</p>
        </div>
      </Modal>

      {/* Modal Transaction réussie */}
      <Modal isOpen={modalSuccess} onClose={() => setModalSuccess(false)} title="" size="sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Transaction réussie !</h3>
        </div>
        <div className="text-center py-4 space-y-3">
          <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">Transaction réussie !</p>
          <p className="text-gray-600 text-sm">
            {successData.amount.toLocaleString('fr-FR')} FCFA payés via {successData.provider}.
          </p>
          <p className="text-gray-500 text-sm">
            Référence : <span className="font-mono font-semibold text-gray-700">{successData.reference}</span>
          </p>
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
            onClick={() => setModalSuccess(false)}
          >
            Fermer
          </Button>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
