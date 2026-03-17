import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function CreateEventScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    price: '',
    startDate: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!form.title.trim() || !form.startDate.trim()) {
      Alert.alert('Champs requis', 'Titre et date sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        price: form.price ? Number(form.price) : undefined,
        start_date: form.startDate,
        category: form.category || undefined,
      };
      const ev = await api.events.create(payload);
      Alert.alert('Succès', 'Événement créé.', [
        { text: 'Voir', onPress: () => navigation.replace('EventDetails', { id: ev.id }) },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de créer l’événement.');
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
        <Text style={st.title}>Créer un événement</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Titre</Text>
        <TextInput
          style={st.input}
          value={form.title}
          onChangeText={(t) => setField('title', t)}
          placeholder="AfriWonder Live à Bamako"
        />

        <Text style={st.label}>Description</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.description}
          onChangeText={(t) => setField('description', t)}
          placeholder="Décrivez l’événement..."
          multiline
        />

        <Text style={st.label}>Lieu</Text>
        <TextInput
          style={st.input}
          value={form.location}
          onChangeText={(t) => setField('location', t)}
          placeholder="Centre-ville, Bamako"
        />

        <Text style={st.label}>Prix (FCFA, 0 = gratuit)</Text>
        <TextInput
          style={st.input}
          value={form.price}
          onChangeText={(t) => setField('price', t)}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text style={st.label}>Date de début (YYYY-MM-DD)</Text>
        <TextInput
          style={st.input}
          value={form.startDate}
          onChangeText={(t) => setField('startDate', t)}
          placeholder="2026-12-31"
        />

        <Text style={st.label}>Catégorie</Text>
        <TextInput
          style={st.input}
          value={form.category}
          onChangeText={(t) => setField('category', t)}
          placeholder="concert, conférence..."
        />

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Création...' : 'Créer l’événement'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
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
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

