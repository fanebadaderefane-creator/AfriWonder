import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../src/api/client';

const TIP_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];
const METHODS = [
  { id: 'orange-money', name: 'Orange Money', color: '#FF6600' },
  { id: 'wave', name: 'Wave', color: '#1DC3E2' },
  { id: 'wallet', name: 'Mon Portefeuille', color: '#4ECDC4' },
];

export default function TipScreen() {
  const insets = useSafeAreaInsets();
  const { creatorName, videoId } = useLocalSearchParams();
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState('wallet');
  const [mmPhone, setMmPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleTip = async () => {
    const vid = videoId ? String(videoId) : '';
    if (!vid.trim()) {
      Alert.alert('Erreur', 'Ouvrez le pourboire depuis une vidéo (identifiant vidéo requis).');
      return;
    }
    if (method !== 'wallet' && !mmPhone.trim()) {
      Alert.alert('Erreur', 'Indiquez le numéro Mobile Money pour ce mode de paiement.');
      return;
    }
    setLoading(true);
    try {
      if (method === 'wallet') {
        await apiClient.post(`/videos/${encodeURIComponent(vid)}/tip-wallet`, {
          amount,
          message: `Pourboire de ${amount} FCFA`,
        });
      } else {
        await apiClient.post(`/videos/${encodeURIComponent(vid)}/tip`, {
          amount,
          phone: mmPhone.trim(),
          message: `Pourboire de ${amount} FCFA`,
        });
      }
      setSent(true);
    } catch (e: any) {
      const msg = e.response?.data?.error?.message || e.response?.data?.detail || 'Erreur lors de l\'envoi';
      Alert.alert('Erreur', msg);
    } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#4ECDC4" />
        </View>
        <Text style={styles.successTitle}>Merci !</Text>
        <Text style={styles.successText}>
          Vous avez envoyé {amount.toLocaleString()} FCFA à {creatorName || 'ce créateur'}
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soutenir {creatorName || ''}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Gift icon */}
        <View style={styles.giftContainer}>
          <LinearGradient colors={['#FF6B00', '#E91E63']} style={styles.giftCircle}>
            <Ionicons name="gift" size={40} color="#FFF" />
          </LinearGradient>
          <Text style={styles.giftText}>Envoyez un pourboire pour soutenir ce créateur</Text>
        </View>

        {/* Amount Selection */}
        <Text style={styles.label}>Montant du pourboire</Text>
        <View style={styles.amountGrid}>
          {TIP_AMOUNTS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.amountCard, amount === a && styles.amountCardActive]}
              onPress={() => setAmount(a)}
            >
              <Text style={[styles.amountValue, amount === a && styles.amountValueActive]}>{a.toLocaleString()}</Text>
              <Text style={[styles.amountLabel, amount === a && styles.amountLabelActive]}>FCFA</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <Text style={styles.label}>Méthode de paiement</Text>
        {METHODS.map(m => (
          <TouchableOpacity key={m.id} style={[styles.methodCard, method === m.id && { borderColor: m.color }]} onPress={() => setMethod(m.id)}>
            <View style={[styles.methodDot, { backgroundColor: m.color }]} />
            <Text style={styles.methodName}>{m.name}</Text>
            {method === m.id && <Ionicons name="checkmark-circle" size={20} color={m.color} />}
          </TouchableOpacity>
        ))}

        {method !== 'wallet' ? (
          <View style={{ marginTop: Spacing.md }}>
            <Text style={styles.label}>Numéro Mobile Money</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Ex: 70 12 34 56"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={mmPhone}
              onChangeText={setMmPhone}
            />
          </View>
        ) : null}

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendBtn, loading && { opacity: 0.6 }]}
          onPress={handleTip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="heart" size={20} color="#FFF" />
              <Text style={styles.sendBtnText}>Envoyer {amount.toLocaleString()} FCFA</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.feeNote}>Commission plateforme: 5% ({(amount * 0.05).toLocaleString()} FCFA)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  giftContainer: { alignItems: 'center', paddingVertical: Spacing.xxl },
  giftCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  giftText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center' },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.lg, marginBottom: Spacing.md },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  amountCard: { width: '31%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  amountCardActive: { borderColor: '#FF6B00', backgroundColor: 'rgba(255,107,0,0.1)' },
  amountValue: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: 'bold' },
  amountValueActive: { color: '#FF6B00' },
  amountLabel: { color: Colors.textMuted, fontSize: FontSizes.xs },
  amountLabelActive: { color: '#FF6B00' },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md, borderWidth: 2, borderColor: 'transparent' },
  methodDot: { width: 12, height: 12, borderRadius: 6 },
  methodName: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B00', borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.xxl, gap: 8 },
  sendBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  feeNote: { color: Colors.textMuted, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.md },
  phoneInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  successIcon: { marginBottom: Spacing.lg },
  successTitle: { color: Colors.text, fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  successText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center', marginBottom: Spacing.xxl },
  doneBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxxl, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md },
  doneBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
});
