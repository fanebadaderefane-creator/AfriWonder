import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function ContributeCampaignScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const title = route.params?.title || 'Campagne';

  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [rewardTier, setRewardTier] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!id) {
      Alert.alert('Erreur', 'Identifiant de la campagne manquant.');
      return;
    }
    if (!amount.trim() || !phone.trim()) {
      Alert.alert('Champs requis', 'Montant et téléphone sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount: Number(amount),
        phone: phone.trim(),
        rewardTier: rewardTier.trim() || undefined,
      };
      const res = await api.crowdfunding.contribute(id, payload);
      const paymentUrl = res.paymentUrl || res.payment_url;
      if (paymentUrl) {
        Alert.alert('Contribution créée', 'Ouvrez le lien de paiement dans votre navigateur.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Contribution créée', 'Votre contribution a été enregistrée.');
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de créer la contribution.');
    } finally {
      setSaving(false);
    }
  }, [id, amount, phone, rewardTier, saving, navigation]);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#db2777" />
        </TouchableOpacity>
        <Text style={st.title} numberOfLines={1}>Contribuer — {title}</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Montant (FCFA)</Text>
        <TextInput
          style={st.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="5000"
        />

        <Text style={st.label}>Téléphone (Mobile Money)</Text>
        <TextInput
          style={st.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+223..."
        />

        <Text style={st.label}>Récompense (optionnel)</Text>
        <TextInput
          style={st.input}
          value={rewardTier}
          onChangeText={setRewardTier}
          placeholder="Early supporter, T-shirt..."
        />

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Envoi...' : 'Contribuer'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf2f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111', marginLeft: 12 },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 24,
    backgroundColor: '#db2777',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

