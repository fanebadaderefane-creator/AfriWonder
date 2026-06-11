/**
 * Bulle journal d’appels dans le fil DM — style WhatsApp (icône circulaire + flèche directionnelle).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubbleMenuChevron } from '../components/messages/MessageContextMenu';
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
  onMenuPress?: () => void;
  showMenuChevron?: boolean;
  onHighlight?: () => void;
  /** Sortie du survol (web) — le parent applique un délai avant de masquer le chevron. */
  onHoverLeave?: () => void;
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
  const iconColor = isMissed ? '#F15C6D' : isMine ? '#1DAA61' : '#54656F';

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
  onMenuPress,
  showMenuChevron = false,
  onHighlight,
  onHoverLeave,
}: CallLogBubbleProps) {
  const titleIsAlert = callLogTitleIsAlert(callLog, viewerUserId);
  const canCallBack = titleIsAlert;

  return (
    <Pressable
      style={[styles.messageRow, isMine && styles.messageRowMine]}
      onHoverIn={onHighlight}
      onHoverOut={onHoverLeave}
    >
      {/* Conteneur positionné : le chevron est un FRÈRE de la bulle (pas un <button> imbriqué). */}
      <View style={styles.callLogBubbleWrap}>
        <Pressable
          style={[
            styles.messageBubble,
            styles.callLogBubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            showTail && (isMine ? styles.tailMine : styles.tailTheirs),
            showMenuChevron && styles.callLogBubbleMenuActive,
          ]}
          onPress={() => {
            onHighlight?.();
            onPress?.();
          }}
          onLongPress={onMenuPress}
          delayLongPress={300}
          accessibilityRole="button"
          accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
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
        </Pressable>
        {onMenuPress ? (
          <MessageBubbleMenuChevron
            isMine={isMine}
            visible={showMenuChevron}
            onPress={onMenuPress}
            onPointerDown={onHighlight}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messageRow: { flexDirection: 'row', marginBottom: 2 },
  messageRowMine: { justifyContent: 'flex-end' },
  callLogBubbleWrap: { position: 'relative', maxWidth: '72%' },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
    position: 'relative',
  },
  bubbleMine: { backgroundColor: '#D9FDD3', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderTopRightRadius: 8, borderTopLeftRadius: 8 },
  tailMine: { borderTopRightRadius: 0 },
  tailTheirs: { borderTopLeftRadius: 0 },
  callLogBubble: { minWidth: 168, maxWidth: 280, paddingBottom: 6 },
  callLogBubbleMenuActive: { paddingRight: 28 },
  callLogBubbleInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCircleMine: { backgroundColor: 'rgba(0,92,75,0.1)' },
  iconCircleTheirs: { backgroundColor: 'rgba(0,0,0,0.06)' },
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
  callLogTitle: { fontSize: 15, fontWeight: '600', color: '#111B21', letterSpacing: 0.1 },
  callLogTitleAlert: { color: '#F15C6D' },
  callLogSubtitle: { color: '#667781', fontSize: 14, marginTop: 3, fontWeight: '400' },
  callLogSubtitleAction: { color: '#00A884' },
  msgTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    marginBottom: 2,
  },
  msgTimeText: { color: '#667781', fontSize: 11 },
});
