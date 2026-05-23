import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import apiClient from '../../src/api/client';

const AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function TransferScreen() {
  const insets = useSafeAreaInsets();
  const [recipientPhone, setRecipientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const newIdempotencyKey = (): string =>
    `wt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const callTransferApi = async (numAmount: number) => {
    const target = recipientPhone.trim();
    const isUsername = target.startsWith('@');
    const payload: Record<string, unknown> = {
      amount: numAmount,
      description: description.trim() || undefined,
    };
    if (isUsername) {
      payload.recipient_username = target.replace(/^@+/, '');
    } else {
      payload.recipient_phone = target;
    }

    const res = await apiClient.post('/wallet/transfer', payload, {
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    });
    return res.data?.data;
  };

  const handleTransfer = async () => {
    const numAmount = parseFloat(amount);
    if (!recipientPhone.trim()) {
      Alert.alert('Destinataire manquant', 'Saisissez un numéro de téléphone ou un @username.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant supérieur à 0 FCFA.');
      return;
    }

    Alert.alert(
      'Confirmer le transfert',
      `Envoyer ${numAmount.toLocaleString()} FCFA à ${recipientPhone} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setLoading(true);
            try {
              const data = await callTransferApi(numAmount);
              const newBalance = data?.sender_balance_after;
              Alert.alert(
                'Transfert effectué ✅',
                newBalance != null
                  ? `Montant: ${numAmount.toLocaleString()} FCFA\nNouveau solde: ${Number(newBalance).toLocaleString()} FCFA`
                  : `Montant: ${numAmount.toLocaleString()} FCFA envoyé.`,
                [{ text: 'OK', onPress: () => router.back() }],
              );
            } catch (err: any) {
              const msg =
                err?.response?.data?.error?.message ||
                err?.response?.data?.message ||
                err?.message ||
                'Échec du transfert';
              Alert.alert('Erreur', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envoyer de l'argent</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Recipient */}
        <Text style={styles.sectionTitle}>Destinataire</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.phoneInput}
            placeholder="Numéro ou @username"
            placeholderTextColor={Colors.textMuted}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            value={recipientPhone}
            onChangeText={setRecipientPhone}
          />
        </View>

        <Text style={styles.subLabel}>Contacts</Text>
        <TouchableOpacity
          style={styles.contactsBtn}
          onPress={() => router.push('/sync-contacts' as never)}
        >
          <Ionicons name="people-outline" size={18} color={Colors.text} />
          <Text style={styles.contactsBtnText}>Choisir depuis mes contacts</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Amount */}
        <Text style={styles.sectionTitle}>Montant</Text>
        <View style={styles.amountInputContainer}>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.currency}>FCFA</Text>
        </View>

        <View style={styles.quickAmounts}>
          {AMOUNTS.map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.quickAmount, amount === a.toString() && styles.quickAmountSelected]}
              onPress={() => setAmount(a.toString())}
            >
              <Text style={[styles.quickAmountText, amount === a.toString() && styles.quickAmountTextSelected]}>
                {a.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Motif (optionnel)</Text>
        <TextInput
          style={styles.descInput}
          placeholder="Ex: Remboursement, cadeau..."
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
          maxLength={100}
        />

        {/* Transfer Button */}
        <TouchableOpacity
          style={[styles.transferBtn, (!amount || !recipientPhone || loading) && styles.transferBtnDisabled]}
          onPress={handleTransfer}
          disabled={!amount || !recipientPhone || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.transferBtnText}>Envoyer {amount ? `${parseFloat(amount).toLocaleString()} FCFA` : ''}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold', marginBottom: Spacing.md, marginTop: Spacing.lg },
  subLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: Spacing.md, marginBottom: Spacing.sm },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  phoneInput: { flex: 1, color: Colors.text, fontSize: FontSizes.lg, paddingVertical: Spacing.lg },
  contactsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactsBtnText: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl },
  amountInput: { flex: 1, color: Colors.text, fontSize: 32, fontWeight: 'bold' },
  currency: { color: Colors.textSecondary, fontSize: FontSizes.xl },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  quickAmount: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  quickAmountSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickAmountText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  quickAmountTextSelected: { color: Colors.text },
  descInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border },
  transferBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg,
    marginTop: Spacing.xxl, gap: Spacing.sm,
  },
  transferBtnDisabled: { opacity: 0.5 },
  transferBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
});
