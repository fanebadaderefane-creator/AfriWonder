import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceMessageWaveform } from './VoiceMessageWaveform';

type Props = {
  messageId: string;
  isMine: boolean;
  avatarUri: string;
  voiceDuration?: string;
  isPlaying: boolean;
  progress: number;
  listened: boolean;
  onPress: () => void;
};

export function VoiceMessageBubble({
  messageId,
  isMine,
  avatarUri,
  voiceDuration,
  isPlaying,
  progress,
  listened,
  onPress,
}: Props) {
  const playColor = isMine ? '#111B21' : '#54656F';
  const avatar = (
    <View style={styles.avatarWrap}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
      <View style={[styles.micBadge, listened && styles.micBadgeListened]}>
        <Ionicons name="mic" size={9} color={listened ? '#FFFFFF' : '#00A884'} />
      </View>
    </View>
  );

  const controls = (
    <>
      <TouchableOpacity style={styles.playBtn} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={playColor} />
      </TouchableOpacity>
      <View style={styles.waveCol}>
        <VoiceMessageWaveform
          messageId={messageId}
          isMine={isMine}
          isPlaying={isPlaying}
          progress={progress}
          listened={listened}
        />
        <Text style={styles.duration}>{voiceDuration || '0:00'}</Text>
      </View>
    </>
  );

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      {!isMine ? avatar : null}
      {controls}
      {isMine ? avatar : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 220,
    paddingVertical: 2,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  playBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveCol: { flex: 1, minWidth: 100 },
  duration: { color: '#667781', fontSize: 11, marginTop: 2 },
  avatarWrap: { width: 36, height: 36, position: 'relative' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DFE5E7',
  },
  micBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9EDEF',
  },
  micBadgeListened: {
    backgroundColor: '#53BDEB',
    borderColor: '#53BDEB',
  },
});
