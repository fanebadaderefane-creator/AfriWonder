import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import mobileApiClient from '../../src/api/mobileClient';

const CATEGORIES = ['Musique', 'Danse', 'Cuisine', 'Discussion', 'Sport', 'Education', 'Gaming', 'Mode'];

export default function StartLiveScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Discussion');
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(0);

  const startLive = async () => {
    if (!title.trim()) { Alert.alert('Erreur', 'Titre du live requis'); return; }
    setLoading(true);
    try {
      const res = await mobileApiClient.post('/mobile/live/start', { title: title.trim(), description: description.trim(), category });
      const data = res.data?.data;
      setLiveId(data?.live_id);
      setIsLive(true);
      // Start timer
      const interval = setInterval(() => setLiveTime(prev => prev + 1), 1000);
      // Store interval for cleanup
      (global as any).__liveInterval = interval;
    } catch (e: any) { Alert.alert('Erreur', e.response?.data?.detail || 'Impossible de démarrer'); }
    finally { setLoading(false); }
  };

  const endLive = () => {
    Alert.alert('Terminer le Live?', 'Le replay sera automatiquement enregistré', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Terminer', style: 'destructive', onPress: async () => {
        if ((global as any).__liveInterval) clearInterval((global as any).__liveInterval);
        try {
          await mobileApiClient.post(`/mobile/live/${liveId}/end`);
          Alert.alert('Live terminé!', 'Le replay est maintenant disponible. Vous pouvez découper les moments forts.', [
            { text: 'Voir le replay', onPress: () => router.replace({ pathname: '/live/replay', params: { id: liveId! } } as any) },
            { text: 'Retour', onPress: () => router.back() },
          ]);
        } catch { router.back(); }
      }}
    ]);
  };

  const formatTime = (s: number) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  if (isLive) {
    return (
      <View style={[styles.liveContainer, { paddingTop: insets.top }]}>
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} />
        {/* Camera placeholder */}
        <View style={styles.cameraPlaceholder}><Ionicons name="videocam" size={60} color="rgba(255,255,255,0.3)" /><Text style={styles.cameraText}>Caméra en direct</Text></View>
        {/* Top Bar */}
        <View style={styles.liveTopBar}>
          <View style={styles.liveBadge}><View style={styles.liveBadgeDot} /><Text style={styles.liveBadgeText}>LIVE</Text></View>
          <Text style={styles.liveTimer}>{formatTime(liveTime)}</Text>
          <TouchableOpacity onPress={endLive} style={styles.endBtn}><Text style={styles.endBtnText}>Terminer</Text></TouchableOpacity>
        </View>
        {/* Title */}
        <View style={styles.liveBottom}><Text style={styles.liveTitleText}>{title}</Text></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Démarrer un Live</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <View style={styles.previewBox}><Ionicons name="videocam" size={50} color="rgba(255,255,255,0.3)" /><Text style={styles.previewText}>Aperçu caméra</Text></View>
        <Text style={styles.label}>Titre du live</Text>
        <TextInput style={styles.input} placeholder="Ex: Concert acoustique" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />
        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput style={[styles.input, { height: 60 }]} placeholder="De quoi parle ce live?" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />
        <Text style={styles.label}>Catégorie</Text>
        <View style={styles.categories}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catChipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.catChipText, category === c && { color: '#FFF' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.goLiveBtn, (!title || loading) && { opacity: 0.5 }]} onPress={startLive} disabled={!title || loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="radio" size={22} color="#FFF" /><Text style={styles.goLiveBtnText}>Démarrer le Live</Text></>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  content: { flex: 1, paddingHorizontal: Spacing.xl },
  previewBox: { height: 180, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  previewText: { color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  label: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, color: Colors.text, fontSize: FontSizes.md },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface },
  catChipActive: { backgroundColor: '#E91E63' },
  catChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E91E63', borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.xxl, gap: 10 },
  goLiveBtnText: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  liveContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'space-between' },
  cameraPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  cameraText: { color: 'rgba(255,255,255,0.3)', marginTop: 8 },
  liveTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF0000', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 6 },
  liveBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  liveTimer: { color: '#FFF', fontSize: FontSizes.lg, fontWeight: 'bold' },
  endBtn: { backgroundColor: 'rgba(255,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  endBtnText: { color: '#FFF', fontWeight: 'bold' },
  liveBottom: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  liveTitleText: { color: '#FFF', fontSize: FontSizes.xl, fontWeight: 'bold' },
});
