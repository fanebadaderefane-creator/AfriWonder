import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function BecomeProviderScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    city: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!form.name.trim()) {
      Alert.alert('Nom requis', 'Merci de renseigner le nom du prestataire.');
      return;
    }
    setSaving(true);
    try {
      await api.providers.create({
        name: form.name.trim(),
        category_id: form.categoryId || undefined,
        city: form.city || undefined,
        description: form.description || undefined,
      });
      Alert.alert('Succès', 'Votre demande de prestataire a été envoyée.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible d’envoyer la demande.');
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
        <Text style={st.title}>Devenir prestataire</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Nom / Nom du service</Text>
        <TextInput
          style={st.input}
          value={form.name}
          onChangeText={(t) => setField('name', t)}
          placeholder="Studio vidéo, Coiffure, Taxi..."
        />

        <Text style={st.label}>Catégorie (ID optionnel)</Text>
        <TextInput
          style={st.input}
          value={form.categoryId}
          onChangeText={(t) => setField('categoryId', t)}
          placeholder="UUID catégorie"
        />

        <Text style={st.label}>Ville</Text>
        <TextInput
          style={st.input}
          value={form.city}
          onChangeText={(t) => setField('city', t)}
          placeholder="Bamako"
        />

        <Text style={st.label}>Description</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.description}
          onChangeText={(t) => setField('description', t)}
          placeholder="Présentez vos services, votre expérience..."
          multiline
        />

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Envoi...' : 'Envoyer la demande'}</Text>
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

