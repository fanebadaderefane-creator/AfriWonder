import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import {
  exportSrt,
  msToSrtTimestamp,
  parseSrt,
  validateChunks,
  type SubtitleChunk,
} from './subtitles';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialChunks: SubtitleChunk[];
  onSave: (chunks: SubtitleChunk[]) => void;
  totalDurationMs?: number | null;
};

function reindex(list: SubtitleChunk[]): SubtitleChunk[] {
  return [...list]
    .sort((a, b) => a.startMs - b.startMs)
    .map((c, i) => ({ ...c, index: i + 1 }));
}

export default function SubtitlesEditor({ visible, onClose, initialChunks, onSave, totalDurationMs }: Props) {
  const [chunks, setChunks] = useState<SubtitleChunk[]>(initialChunks);
  const [importing, setImporting] = useState(false);

  React.useEffect(() => {
    if (visible) setChunks(initialChunks);
  }, [visible, initialChunks]);

  const errors = useMemo(() => validateChunks(chunks), [chunks]);

  const addChunk = useCallback(() => {
    setChunks((prev) => {
      const last = prev[prev.length - 1];
      const startMs = last ? last.endMs + 200 : 0;
      const endMs = startMs + 1500;
      const next: SubtitleChunk = {
        index: prev.length + 1,
        startMs,
        endMs,
        text: 'Nouveau sous-titre',
      };
      return reindex([...prev, next]);
    });
  }, []);

  const updateChunk = useCallback((index: number, patch: Partial<SubtitleChunk>) => {
    setChunks((prev) =>
      reindex(prev.map((c) => (c.index === index ? { ...c, ...patch } : c))),
    );
  }, []);

  const removeChunk = useCallback((index: number) => {
    setChunks((prev) => reindex(prev.filter((c) => c.index !== index)));
  }, []);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/x-subrip', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      let text = '';
      if (Platform.OS === 'web') {
        const r = await fetch(uri);
        text = await r.text();
      } else {
        const fs = await import('expo-file-system/legacy');
        text = await fs.readAsStringAsync(uri);
      }
      const parsed = parseSrt(text);
      if (parsed.length === 0) {
        Alert.alert('Import SRT', 'Aucun sous-titre valide dans ce fichier.');
        return;
      }
      setChunks(reindex(parsed));
    } catch {
      Alert.alert('Import SRT', 'Impossible de lire ce fichier.');
    } finally {
      setImporting(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    const srt = exportSrt(chunks);
    try {
      await Clipboard.setStringAsync(srt);
      Alert.alert('Export SRT', 'Sous-titres copiés dans le presse-papier (format SRT).');
    } catch {
      Alert.alert('Export SRT', 'Copie impossible. Vérifiez les permissions.');
    }
  }, [chunks]);

  const handleSave = useCallback(() => {
    if (errors.length > 0) {
      Alert.alert(
        'Sous-titres',
        `Corrigez les ${errors.length} problème(s) avant de valider (chevauchements, temps invalides, texte vide).`,
      );
      return;
    }
    onSave(reindex(chunks));
  }, [chunks, errors.length, onSave]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
            <Ionicons name="close" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Sous-titres</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={handleImport} disabled={importing} style={styles.actionBtn}>
            <Ionicons name="document-attach-outline" size={18} color={Colors.text} />
            <Text style={styles.actionBtnText}>{importing ? 'Import…' : 'Importer SRT'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} style={styles.actionBtn}>
            <Ionicons name="copy-outline" size={18} color={Colors.text} />
            <Text style={styles.actionBtnText}>Copier SRT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addChunk} style={[styles.actionBtn, styles.actionBtnPrimary]}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Nouveau</Text>
          </TouchableOpacity>
        </View>

        {totalDurationMs ? (
          <Text style={styles.durationHint}>{`Durée vidéo : ${msToSrtTimestamp(totalDurationMs)}`}</Text>
        ) : null}

        {errors.length > 0 ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#FFB199" />
            <Text style={styles.errorText}>
              {`${errors.length} problème(s) — chaque chunk doit avoir un texte, début < fin, et ne pas chevaucher le suivant.`}
            </Text>
          </View>
        ) : null}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
          {chunks.length === 0 ? (
            <Text style={styles.emptyHint}>
              Aucun sous-titre. Ajoutez un chunk manuel ou importez un fichier SRT existant.
            </Text>
          ) : null}
          {chunks.map((c) => (
            <View key={`sub-${c.index}`} style={styles.chunkCard}>
              <View style={styles.chunkHeader}>
                <Text style={styles.chunkIdx}>{`#${c.index}`}</Text>
                <TouchableOpacity onPress={() => removeChunk(c.index)} hitSlop={10} accessibilityLabel="Supprimer">
                  <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Début (ms)</Text>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    value={String(c.startMs)}
                    onChangeText={(v) => updateChunk(c.index, { startMs: Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0) })}
                  />
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Fin (ms)</Text>
                  <TextInput
                    style={styles.timeInput}
                    keyboardType="numeric"
                    value={String(c.endMs)}
                    onChangeText={(v) => updateChunk(c.index, { endMs: Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0) })}
                  />
                </View>
              </View>
              <TextInput
                multiline
                style={styles.textInput}
                value={c.text}
                onChangeText={(v) => updateChunk(c.index, { text: v.slice(0, 240) })}
                placeholder="Texte affiché à l'écran"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.charCount}>{`${c.text.length}/240`}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800' },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
  },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionBtnText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
  durationHint: { color: Colors.textMuted, fontSize: FontSizes.xs, paddingHorizontal: Spacing.md },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,59,48,0.18)', borderColor: 'rgba(255,59,48,0.6)', borderWidth: 1,
    borderRadius: BorderRadius.md, padding: 10,
  },
  errorText: { color: '#FFB199', flex: 1, fontSize: FontSizes.xs },
  emptyHint: { color: Colors.textMuted, padding: Spacing.lg, textAlign: 'center' },
  chunkCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  chunkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chunkIdx: { color: Colors.primary, fontWeight: '900' },
  timeRow: { flexDirection: 'row', gap: Spacing.sm },
  timeCol: { flex: 1, gap: 4 },
  timeLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  timeInput: {
    backgroundColor: Colors.background, color: Colors.text,
    borderRadius: BorderRadius.md, padding: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  textInput: {
    backgroundColor: Colors.background, color: Colors.text,
    borderRadius: BorderRadius.md, padding: 10, minHeight: 60, textAlignVertical: 'top',
    borderWidth: 1, borderColor: Colors.border,
  },
  charCount: { color: Colors.textMuted, fontSize: 11, textAlign: 'right' },
});
