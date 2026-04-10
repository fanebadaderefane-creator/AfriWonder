import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const { name, avatar, type } = useLocalSearchParams();
  const isVideo = type === 'video';

  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    const connectTimer = setTimeout(() => {
      setCallState('connected');
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }, 3000);

    return () => {
      clearTimeout(connectTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    setCallState('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => router.back(), 500);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {isVideo ? (
        <View style={styles.videoBackground}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.videoPlaceholderText}>Camera du correspondant</Text>
          </View>
          {!cameraOff && (
            <View style={styles.selfView}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?img=8' }} style={styles.selfViewImage} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.audioBackground}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: callState === 'ringing' ? 0.3 : 0 }]} />
          <Image source={{ uri: (avatar as string) || 'https://i.pravatar.cc/150' }} style={styles.callerAvatar} />
        </View>
      )}

      <View style={styles.callInfo}>
        <Text style={styles.callerName}>{name || 'Contact'}</Text>
        <Text style={styles.callStatus}>
          {callState === 'ringing' ? 'Appel en cours...' : callState === 'connected' ? formatTime(duration) : 'Appel termine'}
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlBtn, muted && styles.controlBtnActive]} onPress={() => setMuted(!muted)}>
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, speakerOn && styles.controlBtnActive]} onPress={() => setSpeakerOn(!speakerOn)}>
            <Ionicons name={speakerOn ? 'volume-high' : 'volume-medium'} size={24} color="#FFF" />
          </TouchableOpacity>
          {isVideo && (
            <TouchableOpacity style={[styles.controlBtn, cameraOff && styles.controlBtnActive]} onPress={() => setCameraOff(!cameraOff)}>
              <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.controlBtn}>
            <Ionicons name="chatbubble" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
          <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B141A', justifyContent: 'space-between', alignItems: 'center' },
  videoBackground: { flex: 1, width, backgroundColor: '#1a1a2e', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  videoPlaceholderText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 12 },
  selfView: { position: 'absolute', top: 80, right: 20, width: 100, height: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  selfViewImage: { width: '100%', height: '100%' },
  audioBackground: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  pulseRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: Colors.primary },
  callerAvatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
  callInfo: { alignItems: 'center', paddingVertical: 20 },
  callerName: { color: '#FFF', fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  callStatus: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  controls: { width: '100%', alignItems: 'center', paddingBottom: 30 },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 30 },
  controlBtn: { alignItems: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  endCallBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FF3D00', alignItems: 'center', justifyContent: 'center' },
});
