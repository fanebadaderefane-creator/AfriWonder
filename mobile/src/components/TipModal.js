import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

const TIP_AMOUNTS = [
  { amount: 100, label: '100 F', emoji: '❤️' },
  { amount: 500, label: '500 F', emoji: '🏃‍♂️' },
  { amount: 1000, label: '1K F', emoji: '🎁' },
  { amount: 2500, label: '2.5K F', emoji: '👑' },
  { amount: 5000, label: '5K F', emoji: '💎' },
];

const PAYMENT_METHODS = [
  { id: 'orange_money', name: 'Orange Money', emoji: '🟠' },
  { id: 'wallet', name: 'Mon Wallet', emoji: '💰' },
];

export default function TipModal({
  visible,
  onClose,
  videoId,
  creator = {},
  walletBalance = 0,
}) {
  const [step, setStep] = useState('amount'); // 'amount' | 'payment' | 'success'
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('wallet');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);

  const finalAmount = selectedAmount || parseInt(customAmount, 10) || 0;
  const needsPhone = selectedMethod === 'orange_money';
  const canSend =
    finalAmount >= 50 &&
    (!needsPhone || (phone && phone.replace(/\D/g, '').length >= 8));

  const creatorName = creator?.name || creator?.username || 'créateur';

  const resetState = () => {
    setStep('amount');
    setSelectedAmount(null);
    setCustomAmount('');
    setSelectedMethod('wallet');
    setPhone('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const handleSendTip = async () => {
    if (!videoId || !finalAmount || finalAmount < 50 || !canSend) return;
    setIsLoading(true);
    try {
      if (selectedMethod === 'wallet') {
        await api.videos.tipWithWallet(videoId, {
          amount: finalAmount,
          message: '',
        });
      } else if (selectedMethod === 'orange_money' && phone) {
        await api.videos.tip(videoId, {
          amount: finalAmount,
          phone: phone.replace(/\D/g, ''),
          message: '',
        });
      }
      setSentAmount(finalAmount);
      setStep('success');
    } catch (err) {
      console.warn('Tip error:', err);
    }
    setIsLoading(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={styles.backdrop} />
        <View style={styles.card}>
          {/* Header gradient */}
          <View style={styles.headerGradient}>
            <View style={styles.headerRow}>
              <View style={styles.avatarWrapper}>
                {creator?.avatar ? (
                  <Image
                    source={{ uri: creator.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {creatorName?.[0]?.toUpperCase() || 'A'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>
                  Soutenir @{creatorName}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Envoyez un tip pour montrer votre amour ❤️
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.8}
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={22} color="#E5E7EB" />
              </TouchableOpacity>
            </View>
          </View>

          {step === 'amount' && (
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.amountGrid}>
                {TIP_AMOUNTS.map((tip) => {
                  const isActive = selectedAmount === tip.amount;
                  return (
                    <TouchableOpacity
                      key={tip.amount}
                      style={[
                        styles.amountChip,
                        isActive && styles.amountChipActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedAmount(tip.amount);
                        setCustomAmount('');
                      }}
                    >
                      <View style={styles.amountIconCircle}>
                        <Text style={styles.amountEmojiSmall}>{tip.emoji}</Text>
                      </View>
                      <Text style={styles.amountLabel}>
                        {tip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Montant personnalisé (FCFA)</Text>
              <View style={styles.customInputWrapper}>
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color="#9CA3AF"
                  style={styles.customIcon}
                />
                <TextInput
                  style={styles.input}
                  value={customAmount}
                  onChangeText={(t) => {
                    setCustomAmount(t.replace(/[^0-9]/g, ''));
                    setSelectedAmount(null);
                  }}
                  placeholder="Montant personnalisé"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <Text style={styles.inputSuffix}>FCFA</Text>
              </View>

              <Text style={styles.minHint}>Minimum 50 FCFA</Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!finalAmount || finalAmount < 50) && styles.primaryBtnDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!finalAmount || finalAmount < 50}
                onPress={() => setStep('payment')}
              >
                <Text style={styles.primaryBtnText}>
                  Continuer · {finalAmount.toLocaleString()} FCFA
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {step === 'payment' && (
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.stepTitle}>Choisir le paiement</Text>
              {PAYMENT_METHODS.map((m) => {
                const isActive = selectedMethod === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodRow,
                      isActive && styles.methodRowActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedMethod(m.id)}
                  >
                    <Text style={styles.methodEmoji}>{m.emoji}</Text>
                    <Text
                      style={[
                        styles.methodName,
                        isActive && styles.methodNameActive,
                      ]}
                    >
                      {m.name}
                    </Text>
                    {m.id === 'wallet' && (
                      <Text style={styles.walletBalance}>
                        {walletBalance.toLocaleString()} F
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {needsPhone && (
                <>
                  <Text style={styles.label}>Numéro Orange Money</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="77 123 45 67"
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Montant</Text>
                <Text style={styles.summaryAmount}>
                  {finalAmount.toLocaleString()} FCFA
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.8}
                  onPress={() => setStep('amount')}
                >
                  <Text style={styles.secondaryBtnText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (isLoading || !canSend) && styles.primaryBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleSendTip}
                  disabled={isLoading || !canSend}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Envoyer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {step === 'success' && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="heart" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Merci ! 🎉</Text>
              <Text style={styles.successMessage}>
                Vous avez envoyé {sentAmount.toLocaleString()} FCFA à @{creatorName}
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.8}
                onPress={handleClose}
              >
                <Text style={styles.primaryBtnText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 24,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#4F46E5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    // Pas de flex ici pour laisser la carte
    // prendre la hauteur de son contenu et
    // scroller seulement si nécessaire.
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountChip: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  amountChipActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  amountIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F97373',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  amountEmojiSmall: {
    fontSize: 16,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  label: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  customIcon: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: '#F9FAFB',
    fontSize: 15,
  },
  inputSuffix: {
    color: '#9CA3AF',
    fontSize: 13,
    marginLeft: 4,
  },
  minHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  methodRowActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  methodName: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  methodNameActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 18,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  secondaryBtnText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  successContainer: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  successMessage: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 18,
  },
});

