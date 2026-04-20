import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Lignes de réglages style TikTok ("Settings and privacy") :
 *  - libellé à gauche,
 *  - valeur courte (ex. "Everyone", "Off") OU `Switch` à droite,
 *  - chevron + handler `onPress` pour les sous-pages.
 *
 * Réutilisé par tout le module `settings/privacy/*`.
 */

type Common = {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Pastille rouge (ex. "Time and well-being" sur la capture). */
  notificationDot?: boolean;
  disabled?: boolean;
};

type NavigateRow = Common & {
  variant: 'navigate';
  /** Valeur affichée à droite avant le chevron (ex. "Everyone"). */
  value?: string | null;
  onPress: () => void;
};

type ToggleRow = Common & {
  variant: 'toggle';
  value: boolean;
  onValueChange: (next: boolean) => void;
};

type ActionRow = Common & {
  variant: 'action';
  /** Couleur destructive optionnelle. */
  destructive?: boolean;
  onPress: () => void;
};

export type SettingsRowProps = NavigateRow | ToggleRow | ActionRow;

export function SettingsRow(props: SettingsRowProps) {
  const inner = (
    <View style={styles.row}>
      <View style={styles.left}>
        {props.icon ? (
          <Ionicons name={props.icon} size={20} color="#373737" style={styles.icon} />
        ) : null}
        <Text
          style={[
            styles.label,
            props.variant === 'action' && (props as ActionRow).destructive && styles.destructive,
          ]}
          numberOfLines={1}
        >
          {props.label}
        </Text>
        {props.notificationDot ? <View style={styles.dot} /> : null}
      </View>
      {renderRight(props)}
    </View>
  );

  if (props.variant === 'toggle') {
    return <View style={styles.touchable}>{inner}</View>;
  }
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={props.onPress}
      disabled={props.disabled}
      style={styles.touchable}
    >
      {inner}
    </TouchableOpacity>
  );
}

function renderRight(props: SettingsRowProps): React.ReactElement | null {
  if (props.variant === 'toggle') {
    return (
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        trackColor={{ false: '#D9D9D9', true: '#FF2D55' }}
        thumbColor="#FFF"
      />
    );
  }
  if (props.variant === 'navigate') {
    return (
      <View style={styles.right}>
        {props.value ? <Text style={styles.value} numberOfLines={1}>{props.value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color="#B5B5B5" />
      </View>
    );
  }
  return null;
}

export function SettingsSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18 },
  sectionTitle: {
    color: '#8C8C8C',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  touchable: {
    paddingHorizontal: 14,
  },
  row: {
    minHeight: 50,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  icon: { marginRight: 14, width: 22 },
  label: { flexShrink: 1, color: '#161616', fontSize: 16, fontWeight: '600' },
  destructive: { color: '#FF2D55' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2D55',
    marginLeft: 6,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { color: '#8C8C8C', fontSize: 15, marginRight: 6, maxWidth: 160 },
});

export default SettingsRow;
