import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function CreateCampaignScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    goalAmount: '',
    endDate: '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!form.title.trim() || !form.description.trim() || !form.goalAmount.trim() || !form.endDate.trim()) {
      Alert.alert('Champs requis', 'Titre, description, objectif et date de fin sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        goalAmount: Number(form.goalAmount),
        endDate: form.endDate,
      };
      const campaign = await api.crowdfunding.create(payload);
      Alert.alert('Succès', 'Campagne créée.', [
        {
          text: 'Voir la campagne',
          onPress: () => navigation.replace('CampaignDetails', { id: campaign.id }),
        },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de créer la campagne.');
    } finally {
      setSaving(false);
    }
  }, [form, saving, navigation]);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#db2777" />
        </TouchableOpacity>
        <Text style={st.title}>Créer une campagne</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Titre</Text>
        <TextInput
          style={st.input}
          value={form.title}
          onChangeText={(t) => setField('title', t)}
          placeholder="Soutenir les créateurs maliens"
        />

        <Text style={st.label}>Description</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.description}
          onChangeText={(t) => setField('description', t)}
          placeholder="Expliquez l'objectif de la campagne..."
          multiline
        />

        <Text style={st.label}>Objectif (FCFA)</Text>
        <TextInput
          style={st.input}
          value={form.goalAmount}
          onChangeText={(t) => setField('goalAmount', t)}
          keyboardType="numeric"
          placeholder="500000"
        />

        <Text style={st.label}>Date de fin (YYYY-MM-DD)</Text>
        <TextInput
          style={st.input}
          value={form.endDate}
          onChangeText={(t) => setField('endDate', t)}
          placeholder="2026-12-31"
        />

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Création...' : 'Créer la campagne'}</Text>
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
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
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

