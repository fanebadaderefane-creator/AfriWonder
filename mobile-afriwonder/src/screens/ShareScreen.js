import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
  Alert,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/client';

// Pas d'expo-clipboard : le module natif exige un rebuild. "Copier le lien" utilise Share (option Copier dans la feuille système).

const SHEET_HEIGHT_RATIO = 0.45;

function getVideoUrl(video) {
  const id = video?.id;
  if (!id) return '';
  const base = process.env.EXPO_PUBLIC_APP_URL || process.env.EXPO_PUBLIC_WEB_URL || 'https://afriwonder.com';
  return `${base.replace(/\/$/, '')}/VideoView?id=${id}`;
}

const shareOptions = [
  { id: 'native', name: 'Partager', icon: 'share-social', color: '#3B82F6' },
  { id: 'copy', name: 'Copier le lien', icon: 'link', color: '#6B7280' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#22C55E' },
  { id: 'telegram', name: 'Telegram', icon: 'paper-plane', color: '#0EA5E9' },
];

export default function ShareScreen({ route, navigation }) {
  const { video } = route.params || {};
  const [loading, setLoading] = useState(false);

  const sheetHeight = Dimensions.get('window').height * SHEET_HEIGHT_RATIO;
  const insets = useSafeAreaInsets();
  const url = getVideoUrl(video);
  const message = 'Regarde cette vidéo !';
  const title = video?.title || 'Vidéo AfriWonder';

  const recordShare = async () => {
    if (!video?.id) return;
    try {
      await api.videos.share(video.id);
    } catch (_) {}
  };

  const handleShare = async (method) => {
    if (!url) {
      Alert.alert('Erreur', 'Lien non disponible');
      return;
    }

    switch (method) {
      case 'native': {
        setLoading(true);
        try {
          const result = await Share.share(
            Platform.OS === 'ios'
              ? { message: `${message}\n${url}`, title }
              : { message: `${message}\n${url}`, title }
          );
          if (result.action === Share.sharedAction) {
            await recordShare();
            navigation.goBack();
          }
        } catch (e) {
          if (e.message && !e.message.includes('cancel')) {
            Alert.alert('Erreur', 'Impossible de partager');
          }
        } finally {
          setLoading(false);
        }
        break;
      }
      case 'copy': {
        try {
          const result = await Share.share({
            message: url,
            title: 'Lien vidéo',
          });
          if (result.action === Share.sharedAction) {
            await recordShare();
            navigation.goBack();
          }
        } catch (e) {
          if (e.message && !e.message.includes('cancel')) {
            Alert.alert('Erreur', 'Choisissez « Copier » dans le menu de partage pour copier le lien.');
          }
        }
        break;
      }
      case 'whatsapp': {
        const text = encodeURIComponent(`${message}\n${url}`);
        const waUrl = `https://wa.me/?text=${text}`;
        try {
          const can = await Linking.canOpenURL(waUrl);
          if (can) {
            await Linking.openURL(waUrl);
            await recordShare();
            navigation.goBack();
          } else {
            await Share.share({ message: `${message}\n${url}`, title });
            await recordShare();
            navigation.goBack();
          }
        } catch (_) {
          Share.share({ message: `${message}\n${url}`, title }).then(() => recordShare());
          navigation.goBack();
        }
        break;
      }
      case 'telegram': {
        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;
        try {
          const can = await Linking.canOpenURL(tgUrl);
          if (can) {
            await Linking.openURL(tgUrl);
            await recordShare();
            navigation.goBack();
          } else {
            await Share.share({ message: `${message}\n${url}`, title });
            await recordShare();
            navigation.goBack();
          }
        } catch (_) {
          Share.share({ message: `${message}\n${url}`, title }).then(() => recordShare());
          navigation.goBack();
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.overlay} onPress={() => navigation.goBack()} />
      <View style={[styles.sheet, { height: sheetHeight, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Partager</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.optionsScroll}
          contentContainerStyle={styles.options}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {shareOptions.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={styles.optionRow}
              onPress={() => handleShare(opt.id)}
              disabled={loading && opt.id === 'native'}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: opt.color }]}>
                <Ionicons name={opt.icon} size={24} color="#fff" />
              </View>
              <Text style={styles.optionLabel}>{opt.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  sheet: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  optionsScroll: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
});
