/**
 * Bannière pub en haut du feed (parité PWA AdBannerCard)
 */
import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { api } from '../api/client';

function getDeviceId() {
  return null;
}

const BANNER_HEIGHT = 120;

export default function AdBannerCard({ ad, isActive, onHide, hideActions = false }) {
  const impressionSentRef = useRef(false);
  const creative = ad?.creative;
  const isVideo = creative?.media_type === 'video';
  const videoUrl = isVideo ? creative?.media_url : null;
  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    if (!p) return;
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (!isActive || !creative || impressionSentRef.current) return;
    impressionSentRef.current = true;
    const deviceId = getDeviceId();
    api.ads.recordImpression(creative.id, ad.campaign_id, deviceId).catch(() => {});
  }, [isActive, creative?.id, ad?.campaign_id]);

  useEffect(() => {
    if (!player) return;
    if (isActive && isVideo) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isVideo, player]);

  const handleCtaClick = () => {
    if (!creative || !ad) return;
    const deviceId = getDeviceId();
    api.ads.recordClick(creative.id, ad.campaign_id, deviceId).catch(() => {});
    if (creative.cta_url) {
      Linking.openURL(creative.cta_url).catch(() => {});
    }
  };

  if (!creative) return null;

  const ctaLabel = creative.cta_label || 'Découvrir';

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Sponsorisé</Text>
      </View>
      <View style={styles.media}>
        {isVideo && videoUrl ? (
          <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} />
        ) : (
          <Image
            source={{ uri: creative.media_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.right}>
        {creative.title ? (
          <Text style={styles.title} numberOfLines={2}>{creative.title}</Text>
        ) : null}
        <TouchableOpacity style={styles.cta} onPress={handleCtaClick}>
          <Ionicons name="open-outline" size={14} color="#FFF" />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 10 },
  media: {
    width: '45%',
    height: '100%',
  },
  right: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: { color: '#FFF', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
