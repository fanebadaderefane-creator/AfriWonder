import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import OrangeMoneyIntegration from './OrangeMoneyIntegration';

export default function MobileMoneySelector({ 
  onSelect, 
  amount, 
  isLoading = false,
  showPhoneInput = true 
}) {
  const [selectedMethod, setSelectedMethod] = useState('orange_money');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const paymentMethods = [
    {
      id: 'orange_money',
      name: 'Orange Money',
      icon: '🟠',
      color: 'from-orange-500 to-orange-600',
      description: 'Paiement sécurisé par Orange Money'
    },
    {
      id: 'wave',
      name: 'Wave',
      icon: '📱',
      color: 'from-blue-500 to-cyan-600',
      description: 'Paiement par Wave'
    },
    {
      id: 'mtn_money',
      name: 'MTN Money',
      icon: '💛',
      color: 'from-yellow-500 to-orange-500',
      description: 'Paiement par MTN Money'
    },
    {
      id: 'moov_money',
      name: 'Moov Money',
      icon: '📲',
      color: 'from-red-500 to-pink-600',
      description: 'Paiement par Moov Money'
    }
  ];

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);
    
    if (selectedMethod === 'orange_money') {
      if (!OrangeMoneyIntegration.validatePhoneNumber(value)) {
        setPhoneError('Numéro de téléphone invalide');
      } else {
        setPhoneError('');
      }
    }
  };

  const handleConfirm = () => {
    if (showPhoneInput && !phone) {
      setPhoneError('Veuillez entrer votre numéro');
      return;
    }

    if (selectedMethod === 'orange_money' && !OrangeMoneyIntegration.validatePhoneNumber(phone)) {
      setPhoneError('Numéro de téléphone invalide');
      return;
    }

    onSelect({
      method: selectedMethod,
      phone: OrangeMoneyIntegration.formatPhoneNumber(phone),
      amount
    });
  };

  return (
    <div className="space-y-4">
      {/* Payment Methods Grid */}
      <div className="grid grid-cols-2 gap-2">
        {paymentMethods.map((method) => (
          <motion.button
            key={method.id}
            onClick={() => {
              setSelectedMethod(method.id);
              setPhoneError('');
            }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-xl border-2 transition-all ${
              selectedMethod === method.id
                ? `border-orange-500 bg-gradient-to-br ${method.color} text-white shadow-lg`
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-1">{method.icon}</div>
            <p className={`text-sm font-semibold ${selectedMethod === method.id ? 'text-white' : 'text-gray-800'}`}>
              {method.name}
            </p>
            <p className={`text-xs ${selectedMethod === method.id ? 'text-white/80' : 'text-gray-500'}`}>
              {method.description}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Phone Input */}
      {showPhoneInput && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Numéro {selectedMethod === 'orange_money' ? 'Orange Money' : 'Mobile Money'}
          </label>
          <Input
            placeholder="+221 77 123 45 67"
            value={phone}
            onChange={handlePhoneChange}
            disabled={isLoading}
            className={phoneError ? 'border-red-500' : ''}
          />
          {phoneError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {phoneError}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Format: +221 77... (Sénégal) ou international
          </p>
        </div>
      )}

      {/* Amount Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Montant total</span>
          <span className="text-lg font-bold text-orange-600">
            {amount.toLocaleString()} XOF
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Commission AfriWonder 10% incluse
        </p>
      </div>

      {/* Confirm Button */}
      <Button
        onClick={handleConfirm}
        disabled={isLoading || (showPhoneInput && (!phone || phoneError))}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Traitement...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Payer avec {paymentMethods.find(m => m.id === selectedMethod)?.name}
          </>
        )}
      </Button>
    </div>
  );
}