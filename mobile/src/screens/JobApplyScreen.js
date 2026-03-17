import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

export default function JobApplyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const jobId = route.params?.id;
  const jobTitle = route.params?.title || 'Offre';

  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    if (!jobId) {
      Alert.alert('Erreur', 'Identifiant de l’offre manquant.');
      return;
    }
    if (!coverLetter.trim()) {
      Alert.alert('Lettre de motivation', 'Merci de renseigner une courte lettre de motivation.');
      return;
    }
    setSaving(true);
    try {
      await api.jobs.apply(jobId, coverLetter.trim(), resumeUrl.trim() || undefined);
      Alert.alert('Candidature envoyée', 'Votre candidature a été envoyée.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible d’envoyer la candidature.');
    } finally {
      setSaving(false);
    }
  }, [jobId, coverLetter, resumeUrl, saving, navigation]);

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={st.title} numberOfLines={1}>Postuler — {jobTitle}</Text>
      </View>
      <ScrollView contentContainerStyle={st.content}>
        <Text style={st.label}>Lettre de motivation</Text>
        <TextInput
          style={[st.input, st.multiline]}
          value={coverLetter}
          onChangeText={setCoverLetter}
          placeholder="Expliquez en quelques lignes pourquoi vous êtes le bon profil."
          multiline
        />

        <Text style={st.label}>CV (URL, optionnel)</Text>
        <TextInput
          style={st.input}
          value={resumeUrl}
          onChangeText={setResumeUrl}
          placeholder="https://mon-cv.com/cv.pdf"
          autoCapitalize="none"
        />

        <TouchableOpacity style={[st.btn, saving && st.btnDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={st.btnText}>{saving ? 'Envoi...' : 'Envoyer la candidature'}</Text>
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
  multiline: {
    minHeight: 100,
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

