import React, { useState } from 'react';
import { Text, StyleSheet, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import usePrivacySettings from '../../src/hooks/usePrivacySettings';

export default function ContentPreferencesScreen() {
  const { settings, update } = usePrivacySettings();
  const tags = settings.content_preferences.disliked_tags;
  const [tag, setTag] = useState('');

  const addTag = () => {
    const v = tag.trim().toLowerCase().replace(/^#+/, '');
    if (!v || tags.includes(v)) {
      setTag('');
      return;
    }
    void update({ content_preferences: { disliked_tags: [...tags, v].slice(0, 50) } });
    setTag('');
  };

  const removeTag = (v: string) => {
    void update({ content_preferences: { disliked_tags: tags.filter((t) => t !== v) } });
  };

  return (
    <SettingsScreen title="Content preferences">
      <Text style={styles.intro}>
        Tell us what you’d rather see less of. We’ll downrank these topics in your feed.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Topics to see less</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={tag}
            onChangeText={setTag}
            placeholder="e.g. politics"
            placeholderTextColor="#8C8C8C"
            style={styles.input}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={addTag} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
          {tags.length === 0 ? (
            <Text style={styles.empty}>No topics added yet.</Text>
          ) : (
            tags.map((t) => (
              <TouchableOpacity key={t} style={styles.tag} onPress={() => removeTag(t)}>
                <Text style={styles.tagText}>#{t}</Text>
                <Ionicons name="close" size={14} color="#FFF" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
  card: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 18, borderRadius: 12, paddingTop: 14, paddingBottom: 4 },
  cardTitle: { color: '#161616', fontSize: 15, fontWeight: '700', paddingHorizontal: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  input: { flex: 1, backgroundColor: '#F1F1F2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#111' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF2D55', alignItems: 'center', justifyContent: 'center' },
  tagsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF2D55', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  tagText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  empty: { color: '#8C8C8C', fontSize: 13, paddingHorizontal: 6 },
});
