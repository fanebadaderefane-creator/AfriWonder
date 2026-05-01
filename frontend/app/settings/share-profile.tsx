import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, Image, TouchableOpacity, Alert, Share, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { useAuthStore } from '../../src/store/authStore';
import apiClient from '../../src/api/client';

/**
 * Share profile — propose un deep link + un QR code partageables.
 * Tente d'utiliser `GET /users/:id/share` côté backend ; à défaut, génère
 * une URL canonique vers `https://afri-wonder.vercel.app/u/{handle}`.
 */
export default function ShareProfileScreen() {
  const { user } = useAuthStore();
  const handle = (user?.username || user?.email?.split('@')[0] || 'me').replace(/^@+/, '');
  const fallbackUrl = `https://afri-wonder.vercel.app/u/${encodeURIComponent(handle)}`;
  const [link, setLink] = useState(fallbackUrl);

  useEffect(() => {
    void (async () => {
      try {
        if (!user?.id) return;
        const res = await apiClient.get(`/users/${user.id}/share`);
        const data = res.data?.data ?? res.data;
        if (typeof data?.deep_link === 'string') setLink(data.deep_link);
      } catch {
        /* keep fallback */
      }
    })();
  }, [user?.id]);

  const qr = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`,
    [link],
  );

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert('Lien copié', 'Le lien de votre profil a été copié dans le presse-papiers.');
    } catch {
      Alert.alert('Copie impossible', 'Nous n’avons pas pu copier le lien. Réessayez ou partagez directement.');
    }
  };

  const share = async () => {
    const msg = `Join me on AfriWonder — @${handle}\n${link}`;
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'AfriWonder', text: msg, url: link });
          return;
        }
      } catch {
        /* ignore */
      }
      void copy();
      return;
    }
    try {
      await Share.share({ title: 'AfriWonder', message: msg });
    } catch {
      /* dismissed */
    }
  };

  return (
    <SettingsScreen title="Share profile">
      <View style={styles.qrCard}>
        <Image source={{ uri: qr }} style={styles.qr} />
        <Text style={styles.handle}>@{handle}</Text>
        <Text style={styles.url} numberOfLines={1}>{link}</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.action} onPress={() => void copy()}>
          <Ionicons name="copy-outline" size={22} color="#111" />
          <Text style={styles.actionLabel}>Copy link</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => void share()}>
          <Ionicons name="share-social-outline" size={22} color="#111" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  qrCard: { alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 18, borderRadius: 16, padding: 24 },
  qr: { width: 240, height: 240 },
  handle: { color: '#111', fontWeight: '800', fontSize: 18, marginTop: 14 },
  url: { color: '#5F5F5F', fontSize: 13, marginTop: 4, maxWidth: 280 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 22 },
  action: { alignItems: 'center', gap: 6 },
  actionLabel: { fontWeight: '700', color: '#111', fontSize: 13 },
});
