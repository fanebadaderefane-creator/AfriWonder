import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';

/**
 * Free up space — purge :
 *  - cache HTTP / images,
 *  - brouillons locaux (`AsyncStorage` clés `draft:*`),
 *  - vidéos hors-ligne (clés `offline:*`).
 */
export default function FreeUpSpaceScreen() {
  const [estimateMb, setEstimateMb] = useState<number | null>(null);
  const [computing, setComputing] = useState(true);
  const [purging, setPurging] = useState(false);

  const compute = async () => {
    setComputing(true);
    try {
      let bytes = 0;
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        const v = await AsyncStorage.getItem(key);
        if (v) bytes += v.length;
      }
      setEstimateMb(Math.round((bytes / (1024 * 1024)) * 10) / 10);
    } catch {
      setEstimateMb(null);
    } finally {
      setComputing(false);
    }
  };

  useEffect(() => {
    void compute();
  }, []);

  const purge = async () => {
    setPurging(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const target = keys.filter(
        (k) => k.startsWith('draft:') || k.startsWith('offline:') || k.startsWith('cache:'),
      );
      if (target.length > 0) {
        await AsyncStorage.multiRemove(target);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const cs = await window.caches?.keys();
          await Promise.all((cs || []).map((c) => window.caches!.delete(c)));
        } catch {
          /* caches API non dispo */
        }
      }
      await compute();
      Alert.alert('Espace libéré', 'Le cache local a bien été vidé.');
    } catch {
      Alert.alert('Cache non vidé', 'Une partie du cache n’a pas pu être supprimée. Réessayez dans quelques instants.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <SettingsScreen title="Free up space">
      <View style={styles.hero}>
        <Ionicons name="trash" size={48} color="#FF2D55" />
        <Text style={styles.title}>{computing ? 'Estimating…' : `${estimateMb ?? 0} MB`}</Text>
        <Text style={styles.subtitle}>Total local cache used by AfriWonder on this device.</Text>
        <TouchableOpacity style={styles.cta} onPress={() => void purge()} disabled={purging}>
          {purging ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaText}>Clear now</Text>}
        </TouchableOpacity>
      </View>

      <SettingsSection title="Ce qui sera effacé">
        <SettingsRow variant="info" icon="server-outline" label="Cache HTTP (images, pages, réponses API)" />
        <SettingsRow variant="info" icon="document-outline" label="Brouillons de publications non envoyés" />
        <SettingsRow variant="info" icon="cloud-download-outline" label="Vidéos en cache hors-ligne" />
      </SettingsSection>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 30, paddingBottom: 16, paddingHorizontal: 24 },
  title: { color: '#111', fontSize: 32, fontWeight: '800', marginTop: 12 },
  subtitle: { color: '#5F5F5F', fontSize: 14, textAlign: 'center', marginTop: 6 },
  cta: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 22,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
