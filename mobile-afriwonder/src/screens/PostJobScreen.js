import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function PostJobScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'FCFA',
    jobType: 'cdi',
    category: '',
    country: 'ML',
    phone: '',
    expiresAt: '',
    isPremium: false,
    isUrgent: false,
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Champs requis', 'Titre et description sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim() || undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        salaryCurrency: form.salaryCurrency || undefined,
        jobType: form.jobType || undefined,
        category: form.category || undefined,
        country: form.country || undefined,
        phone: form.phone.trim() || undefined,
        expiresAt: form.expiresAt || undefined,
        isPremium: form.isPremium || undefined,
        isUrgent: form.isUrgent || undefined,
      };
      const job = await api.jobs.create(payload);
      Alert.alert('Succès', 'Offre créée.', [
        {
          text: 'Voir l’offre',
          onPress: () => navigation.replace('JobDetails', { id: job.id }),
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de créer l’offre.');
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
        <Text style={st.title}>Publier une offre</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Titre</Text>
        <TextInput
          style={st.input}
          value={form.title}
          onChangeText={(t) => setField('title', t)}
          placeholder="Développeur React Native"
        />

        <Text style={st.label}>Description</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.description}
          onChangeText={(t) => setField('description', t)}
          placeholder="Décrivez la mission, le profil recherché..."
          multiline
        />

        <Text style={st.label}>Lieu</Text>
        <TextInput
          style={st.input}
          value={form.location}
          onChangeText={(t) => setField('location', t)}
          placeholder="Bamako, Mali"
        />

        <View style={st.row}>
          <View style={st.col}>
            <Text style={st.label}>Salaire min</Text>
            <TextInput
              style={st.input}
              value={form.salaryMin}
              onChangeText={(t) => setField('salaryMin', t)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={st.col}>
            <Text style={st.label}>Salaire max</Text>
            <TextInput
              style={st.input}
              value={form.salaryMax}
              onChangeText={(t) => setField('salaryMax', t)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={st.label}>Type de contrat</Text>
        <TextInput
          style={st.input}
          value={form.jobType}
          onChangeText={(t) => setField('jobType', t)}
          placeholder="cdi, cdd, freelance..."
        />

        <Text style={st.label}>Catégorie</Text>
        <TextInput
          style={st.input}
          value={form.category}
          onChangeText={(t) => setField('category', t)}
          placeholder="tech, marketing..."
        />

        <Text style={st.label}>Pays</Text>
        <TextInput
          style={st.input}
          value={form.country}
          onChangeText={(t) => setField('country', t)}
          placeholder="ML"
        />

        <Text style={st.label}>Téléphone de contact</Text>
        <TextInput
          style={st.input}
          value={form.phone}
          onChangeText={(t) => setField('phone', t)}
          placeholder="+223..."
          keyboardType="phone-pad"
        />

        <Text style={st.label}>Expiration (YYYY-MM-DD)</Text>
        <TextInput
          style={st.input}
          value={form.expiresAt}
          onChangeText={(t) => setField('expiresAt', t)}
          placeholder="2026-12-31"
        />

        <View style={st.switchRow}>
          <Text style={st.switchLabel}>Premium</Text>
          <Switch value={form.isPremium} onValueChange={(v) => setField('isPremium', v)} />
        </View>
        <View style={st.switchRow}>
          <Text style={st.switchLabel}>Urgent</Text>
          <Switch value={form.isUrgent} onValueChange={(v) => setField('isUrgent', v)} />
        </View>

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Publication...' : 'Publier'}</Text>
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
  row: { flexDirection: 'row', marginTop: 8 },
  col: { flex: 1, marginRight: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  switchLabel: { fontSize: 14, color: '#111' },
  btn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

