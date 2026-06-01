/**
 * Bulle journal d’appels dans le fil DM — style WhatsApp (icône circulaire + flèche directionnelle).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSizes, Spacing } from '../theme/colors';
import {
  callLogIconDirection,
  callLogTitleIsAlert,
  type CallLogMeta,
} from './callLogDisplay';

export type CallLogBubbleProps = {
  isMine: boolean;
  title: string;
  subtitle: string;
  time: string;
  callLog: CallLogMeta;
  viewerUserId: string;
  showTail?: boolean;
  onPress?: () => void;
};

function CallLogIconBadge({
  callLog,
  viewerUserId,
  isMine,
}: {
  callLog: CallLogMeta;
  viewerUserId: string;
  isMine: boolean;
}) {
  const direction = callLogIconDirection(callLog, viewerUserId);
  const isMissed = direction === 'missed';
  const isVideo = callLog.media === 'video';
  const iconColor = isMissed ? '#F15C6D' : isMine ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)';

  const arrowName =
    direction === 'outgoing'
      ? 'arrow-up'
      : direction === 'incoming' || direction === 'missed'
        ? 'arrow-down'
        : 'arrow-up';

  const arrowStyle =
    direction === 'outgoing'
      ? styles.arrowOutgoing
      : styles.arrowIncoming;

  return (
    <View style={[styles.iconCircle, isMine ? styles.iconCircleMine : styles.iconCircleTheirs]}>
      <Ionicons
        name={isVideo ? 'videocam' : isMissed ? 'call-outline' : 'call'}
        size={20}
        color={iconColor}
      />
      <View style={[styles.arrowBadge, arrowStyle]}>
        <Ionicons name={arrowName} size={9} color={iconColor} />
      </View>
    </View>
  );
}

export function CallLogBubble({
  isMine,
  title,
  subtitle,
  time,
  callLog,
  viewerUserId,
  showTail,
  onPress,
}: CallLogBubbleProps) {
  const titleIsAlert = callLogTitleIsAlert(callLog, viewerUserId);
  const canCallBack = titleIsAlert;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.messageRow, isMine && styles.messageRowMine]}
      accessibilityRole="button"
      accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
    >
      <View
        style={[
          styles.messageBubble,
          styles.callLogBubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          showTail && (isMine ? styles.tailMine : styles.tailTheirs),
        ]}
      >
        <View style={styles.callLogBubbleInner}>
          <CallLogIconBadge callLog={callLog} viewerUserId={viewerUserId} isMine={isMine} />
          <View style={styles.callLogTextWrap}>
            <Text
              style={[
                styles.callLogTitle,
                titleIsAlert && styles.callLogTitleAlert,
              ]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.callLogSubtitle,
                  canCallBack && styles.callLogSubtitleAction,
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.msgTimeRow}>
          <Text style={styles.msgTimeText}>{time}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messageRow: { flexDirection: 'row', marginBottom: 2 },
  messageRowMine: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  bubbleMine: { backgroundColor: '#005C4B', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  bubbleTheirs: { backgroundColor: '#1F2C34', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  tailMine: { borderTopRightRadius: 0 },
  tailTheirs: { borderTopLeftRadius: 0 },
  callLogBubble: { minWidth: 188, paddingBottom: 6 },
  callLogBubbleInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCircleMine: { backgroundColor: 'rgba(0,0,0,0.18)' },
  iconCircleTheirs: { backgroundColor: 'rgba(255,255,255,0.08)' },
  arrowBadge: {
    position: 'absolute',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOutgoing: { top: 2, right: 2, transform: [{ rotate: '45deg' }] },
  arrowIncoming: { bottom: 2, left: 2, transform: [{ rotate: '-45deg' }] },
  callLogTextWrap: { flexShrink: 1, flex: 1, paddingVertical: 2 },
  callLogTitle: { fontSize: FontSizes.md, fontWeight: '500', color: '#E9EDEF' },
  callLogTitleAlert: { color: '#F15C6D' },
  callLogSubtitle: { color: 'rgba(255,255,255,0.55)', fontSize: FontSizes.sm, marginTop: 2 },
  callLogSubtitleAction: { color: 'rgba(255,255,255,0.72)' },
  msgTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    marginBottom: 2,
  },
  msgTimeText: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
});
