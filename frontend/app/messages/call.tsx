import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';

export default function VideoCallScreen() {
  const insets = useSafeAreaInsets();
  const { name, avatar, type } = useLocalSearchParams<{ name: string; avatar: string; type: string }>();
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const isVideoCall = type === 'video';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Simulate call connecting
  useEffect(() => {
    const timer = setTimeout(() => setCallState('connected'), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Call timer
  useEffect(() => {
    if (callState !== 'connected') return;
    const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Pulse animation for ringing
  useEffect(() => {
    if (callState !== 'ringing') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [callState]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallState('ended');
    setTimeout(() => router.back(), 1000);
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      {isVideoCall ? (
        <Image source={{ uri: avatar || 'https://i.pravatar.cc/600?img=1' }} style={styles.bgImage} blurRadius={callState === 'ringing' ? 20 : 0} />
      ) : (
        <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.bgGradient} />
      )}

      <View style={[styles.overlay, { paddingTop: insets.top + 20 }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.encryptedBadge}>
            <Ionicons name="lock-closed" size={10} color="#4CAF50" />
            <Text style={styles.encryptedText}>Chiffre de bout en bout</Text>
          </View>
          {callState === 'connected' && (
            <TouchableOpacity style={styles.minimizeBtn}>
              <Ionicons name="resize" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Center - Avatar & Status */}
        <View style={styles.centerSection}>
          {callState === 'ringing' && (
            <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.avatarRingInner} />
            </Animated.View>
          )}
          <Image source={{ uri: avatar || 'https://i.pravatar.cc/200?img=1' }} style={styles.callAvatar} />
          <Text style={styles.callerName}>{name || 'Aminata Diallo'}</Text>
          <Text style={styles.callStatus}>
            {callState === 'ringing' ? (isVideoCall ? 'Appel video en cours...' : 'Appel en cours...')
             : callState === 'connected' ? formatDuration(callDuration)
             : 'Appel termine'}
          </Text>
        </View>

        {/* Self camera preview (video call only) */}
        {isVideoCall && callState === 'connected' && !isCameraOff && (
          <View style={[styles.selfCamera, { top: insets.top + 60 }]}>
            <Image source={{ uri: 'https://i.pravatar.cc/200?img=20' }} style={styles.selfCameraImage} />
          </View>
        )}

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
          {callState === 'connected' && (
            <View style={styles.controlsRow}>
              <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={() => setIsMuted(!isMuted)}>
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
                <Text style={styles.controlLabel}>{isMuted ? 'Demute' : 'Muet'}</Text>
              </TouchableOpacity>
              {isVideoCall && (
                <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]} onPress={() => setIsCameraOff(!isCameraOff)}>
                  <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={24} color="#FFF" />
                  <Text style={styles.controlLabel}>{isCameraOff ? 'Activer' : 'Camera'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]} onPress={() => setIsSpeaker(!isSpeaker)}>
                <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={24} color="#FFF" />
                <Text style={styles.controlLabel}>HP</Text>
              </TouchableOpacity>
              {isVideoCall && (
                <TouchableOpacity style={styles.controlBtn}>
                  <Ionicons name="camera-reverse" size={24} color="#FFF" />
                  <Text style={styles.controlLabel}>Inverser</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* End call button */}
          <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
            <Ionicons name="call" size={30} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>

          {callState === 'ringing' && (
            <Text style={styles.ringingHint}>Sonnerie...</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { position: 'absolute', width: '100%', height: '100%', opacity: 0.4 },
  bgGradient: { position: 'absolute', width: '100%', height: '100%' },
  overlay: { flex: 1, justifyContent: 'space-between' },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  encryptedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(76,175,80,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  encryptedText: { color: '#4CAF50', fontSize: 10, fontWeight: '600' },
  minimizeBtn: { padding: 8 },

  centerSection: { alignItems: 'center' },
  avatarRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarRingInner: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80, top: -12, left: -12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  callAvatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
  callerName: { color: '#FFF', fontSize: 24, fontWeight: '800', marginTop: 16 },
  callStatus: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 },

  selfCamera: {
    position: 'absolute', right: 16, width: 100, height: 140,
    borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#333',
  },
  selfCameraImage: { width: '100%', height: '100%' },

  controls: { alignItems: 'center' },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 30 },
  controlBtn: {
    alignItems: 'center', width: 60, height: 70,
    justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  controlLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 },

  endCallBtn: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#FF3D00',
    alignItems: 'center', justifyContent: 'center',
  },
  ringingHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 12 },
});
