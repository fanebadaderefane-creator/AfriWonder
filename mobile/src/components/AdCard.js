/**
 * Carte publicitaire In-Feed (parité PWA AdCard)
 */
import React, { useEffect, useRef, useState } from 'react';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const REPORT_REASONS = [
  'Contenu inapproprié',
  'Spam ou arnaque',
  'Violence',
  'Contenu trompeur',
  'Autre',
];

function getDeviceId() {
  return null;
}

export default function AdCard({
  ad,
  isActive,
  isMuted,
  onMuteToggle,
  onHide,
  hideActions = false,
  containerHeight,
}) {
  const height = containerHeight ?? SCREEN_HEIGHT;
  const impressionSentRef = useRef(false);
  const creative = ad?.creative;
  const isVideo = creative?.media_type === 'video';
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  const videoUrl = isVideo ? creative?.media_url : null;
  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    if (!p) return;
    p.loop = true;
    p.muted = isMuted;
  });

  useEffect(() => {
    if (!isActive || !creative || impressionSentRef.current) return;
    impressionSentRef.current = true;
    api.ads.recordImpression(creative.id, ad.campaign_id, getDeviceId()).catch(() => {});
  }, [isActive, creative?.id, ad?.campaign_id]);

  useEffect(() => {
    if (!player) return;
    if (isActive && isVideo) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isVideo, player]);

  const handleReport = async () => {
    if (!selectedReason) return;
    try {
      await api.ads.reportAd(ad.campaign_id, selectedReason);
      setShowReportModal(false);
      setShowMenu(false);
    } catch (_) {}
  };

  const handleHide = () => {
    onHide?.(ad.campaign_id);
    setShowMenu(false);
  };

  const handleCtaClick = () => {
    if (!creative || !ad) return;
    api.ads.recordClick(creative.id, ad.campaign_id, getDeviceId()).catch(() => {});
    if (creative.cta_url) {
      Linking.openURL(creative.cta_url).catch(() => {});
    }
  };

  if (!creative) return null;

  const ctaLabel = creative.cta_label || 'Découvrir';

  return (
    <View style={[styles.container, { minHeight: height, height: height }]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Sponsorisé</Text>
      </View>

      {!hideActions && (
        <View style={styles.menuWrap}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowMenu((v) => !v)}
            accessibilityLabel="Options publicité"
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
          </TouchableOpacity>
          {showMenu && (
            <>
              {onHide && (
                <TouchableOpacity style={styles.menuItem} onPress={handleHide}>
                  <Ionicons name="eye-off-outline" size={18} color="#FFF" />
                  <Text style={styles.menuItemText}>Masquer cette pub</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowReportModal(true)}
              >
                <Ionicons name="flag-outline" size={18} color="#FFF" />
                <Text style={styles.menuItemText}>Signaler</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={[styles.media, { minHeight: height * 0.5 }]}>
        {isVideo && videoUrl ? (
          <View style={StyleSheet.absoluteFill}>
            <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} />
          </View>
        ) : (
          <Image
            source={{ uri: creative.media_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        <View style={styles.gradient} />
      </View>

      <View style={styles.footer}>
        {creative.title ? (
          <Text style={styles.title} numberOfLines={2}>{creative.title}</Text>
        ) : null}
        {creative.description ? (
          <Text style={styles.desc} numberOfLines={2}>{creative.description}</Text>
        ) : null}
        <TouchableOpacity style={styles.cta} onPress={handleCtaClick}>
          <Ionicons name="open-outline" size={18} color="#FFF" />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>

      {!hideActions && isVideo && (
        <TouchableOpacity
          style={styles.muteBtn}
          onPress={() => onMuteToggle?.()}
          accessibilityLabel={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#FFF" />
        </TouchableOpacity>
      )}

      {showReportModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Pourquoi signalez-vous cette pub ?</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonBtn, selectedReason === r && styles.reasonBtnActive]}
                onPress={() => setSelectedReason(r)}
              >
                <Text style={styles.reasonBtnText}>{r}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setShowReportModal(false);
                  setSelectedReason('');
                }}
              >
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleReport}>
                <Text style={styles.modalBtnTextPrimary}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  badge: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  menuWrap: { position: 'absolute', top: 44, right: 56, zIndex: 20 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
  },
  menuItemText: { color: '#FFF', fontSize: 14 },
  media: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  gradient: { ...StyleSheet.absoluteFillObject },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 40,
  },
  title: { color: '#FFF', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  desc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 12 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EA580C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: { color: '#FFF', fontWeight: '600' },
  muteBtn: {
    position: 'absolute',
    top: 44,
    right: 12,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 16,
    zIndex: 50,
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { color: '#FFF', fontWeight: '600', marginBottom: 12 },
  reasonBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 6,
  },
  reasonBtnActive: { backgroundColor: '#EA580C' },
  reasonBtnText: { color: '#FFF', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalBtnPrimary: { backgroundColor: '#EA580C' },
  modalBtnText: { color: '#FFF', fontSize: 14 },
  modalBtnTextPrimary: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
