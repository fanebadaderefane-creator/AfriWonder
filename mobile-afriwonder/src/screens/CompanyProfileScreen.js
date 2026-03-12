import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function CompanyProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    description: '',
    logoUrl: '',
    documentsLegal: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.jobs.getCompanyProfile();
        if (!mounted || !data) {
          setLoading(false);
          return;
        }
        setForm({
          companyName: data.company_name || '',
          description: data.description || '',
          logoUrl: data.logo_url || '',
          documentsLegal:
            Array.isArray(data.documents_legal) || typeof data.documents_legal === 'object'
              ? JSON.stringify(data.documents_legal, null, 2)
              : data.documents_legal || '',
        });
      } catch (_) {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      let docs = form.documentsLegal;
      try {
        docs = form.documentsLegal ? JSON.parse(form.documentsLegal) : undefined;
      } catch {
        // laisser en texte brut si non JSON
      }
      await api.jobs.updateCompanyProfile({
        companyName: form.companyName.trim() || undefined,
        description: form.description.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        documentsLegal: docs,
      });
      Alert.alert('Succès', 'Profil entreprise mis à jour.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  }, [form, saving, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={st.root} edges={['top', 'bottom']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={st.title}>Profil entreprise</Text>
        </View>
        <ActivityIndicator color="#2563eb" style={st.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title}>Profil entreprise</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Nom de l&apos;entreprise</Text>
        <TextInput
          style={st.input}
          value={form.companyName}
          onChangeText={(t) => setField('companyName', t)}
          placeholder="AfriWonder SARL"
        />

        <Text style={st.label}>Description</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.description}
          onChangeText={(t) => setField('description', t)}
          placeholder="Présentez brièvement votre activité"
          multiline
        />

        <Text style={st.label}>Logo (URL)</Text>
        <TextInput
          style={st.input}
          value={form.logoUrl}
          onChangeText={(t) => setField('logoUrl', t)}
          placeholder="https://..."
          autoCapitalize="none"
        />

        <Text style={st.label}>Documents légaux (JSON ou texte)</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={form.documentsLegal}
          onChangeText={(t) => setField('documentsLegal', t)}
          placeholder='["RCCM...", "NIF..."]'
          multiline
        />

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
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
    borderBottomColor: '#e5e7f0',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 12 },
  loader: { marginTop: 24 },
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
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

