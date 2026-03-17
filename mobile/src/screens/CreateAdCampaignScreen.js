import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function CreateAdCampaignScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    name: '',
    dailyBudget: '',
    durationDays: '',
    objective: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!form.name.trim() || !form.dailyBudget.trim() || !form.durationDays.trim()) {
      Alert.alert('Champs requis', 'Nom, budget quotidien et durée sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        daily_budget: Number(form.dailyBudget),
        duration_days: Number(form.durationDays),
        objective: form.objective || undefined,
        status: form.isActive ? 'active' : 'draft',
      };
      await api.ads.updateCampaign?.('', payload); // placeholder: backend réel aura un endpoint create
      Alert.alert('Succès', 'Campagne créée (démo).');
      navigation.goBack();
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
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title}>Nouvelle campagne pub</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Nom de la campagne</Text>
        <TextInput
          style={st.input}
          value={form.name}
          onChangeText={(t) => setField('name', t)}
          placeholder="Campagne vidéo AfriWonder"
        />

        <Text style={st.label}>Budget quotidien (FCFA)</Text>
        <TextInput
          style={st.input}
          value={form.dailyBudget}
          onChangeText={(t) => setField('dailyBudget', t)}
          keyboardType="numeric"
          placeholder="5000"
        />

        <Text style={st.label}>Durée (jours)</Text>
        <TextInput
          style={st.input}
          value={form.durationDays}
          onChangeText={(t) => setField('durationDays', t)}
          keyboardType="numeric"
          placeholder="7"
        />

        <Text style={st.label}>Objectif (optionnel)</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.objective}
          onChangeText={(t) => setField('objective', t)}
          placeholder="Plus de vues, plus d’installations..."
          multiline
        />

        <View style={st.switchRow}>
          <Text style={st.switchLabel}>Activer immédiatement</Text>
          <Switch value={form.isActive} onValueChange={(v) => setField('isActive', v)} />
        </View>

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Création...' : 'Créer la campagne'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  switchLabel: { fontSize: 14, color: '#111' },
  btn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

