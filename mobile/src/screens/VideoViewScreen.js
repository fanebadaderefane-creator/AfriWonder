import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import VideoCard from '../components/VideoCard';
import TipModal from '../components/TipModal';

export default function VideoViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const videoId = route.params?.videoId ?? route.params?.id;
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTipModal, setShowTipModal] = useState(false);

  useEffect(() => {
    if (!videoId) {
      setLoading(false);
      setError('Vidéo introuvable');
      return;
    }
    let cancelled = false;
    api.videos
      .getById(videoId)
      .then((data) => {
        if (!cancelled) setVideo(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.apiMessage || e?.message || 'Impossible de charger la vidéo');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [videoId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !video) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Vidéo introuvable'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
      </View>
      <VideoCard
        video={video}
        isActive={true}
        onCommentsPress={(v) => navigation.navigate('Comments', { videoId: v.id, title: v.title })}
        onSharePress={async (v) => {
          try { await api.videos.share(v.id); } catch (_) {}
        }}
        onSupportPress={() => setShowTipModal(true)}
      />
      <TipModal
        visible={showTipModal}
        onClose={() => setShowTipModal(false)}
        videoId={video?.id}
        creator={{
          name: video?.creator_name || video?.creator?.username,
          avatar: video?.creator_avatar || video?.creator?.avatar,
        }}
        walletBalance={0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#F97373',
    fontSize: 15,
    textAlign: 'center',
  },
});
