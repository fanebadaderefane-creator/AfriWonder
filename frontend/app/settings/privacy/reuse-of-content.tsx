import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../../src/components/settings/SettingsRow';
import usePrivacySettings from '../../../src/hooks/usePrivacySettings';

/**
 * Réutilisation de contenu — gouverne la création de vidéos dérivées :
 *  - Duet : enregistrer une réaction côte à côte,
 *  - Stitch : couper un extrait dans une nouvelle vidéo,
 *  - Remix : reprendre l'audio / un effet.
 *
 * Côté backend, la création (`POST /videos` avec `parent_video_id`) doit vérifier
 * la valeur correspondante du créateur d'origine.
 */
export default function ReuseOfContentScreen() {
  const { settings, update } = usePrivacySettings();
  const reuse = settings.reuse_of_content;

  return (
    <SettingsScreen title="Reuse of content">
      <Text style={styles.intro}>
        Choose how others can re-use your videos. These rules apply to videos you publish.
      </Text>
      <SettingsSection>
        <SettingsRow
          variant="toggle"
          label="Duet"
          icon="film-outline"
          value={reuse.duet}
          onValueChange={(v) => void update({ reuse_of_content: { ...reuse, duet: v } })}
        />
        <SettingsRow
          variant="toggle"
          label="Stitch"
          icon="cut-outline"
          value={reuse.stitch}
          onValueChange={(v) => void update({ reuse_of_content: { ...reuse, stitch: v } })}
        />
        <SettingsRow
          variant="toggle"
          label="Remix"
          icon="musical-notes-outline"
          value={reuse.remix}
          onValueChange={(v) => void update({ reuse_of_content: { ...reuse, remix: v } })}
        />
      </SettingsSection>
      <View style={{ height: 24 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
});
