import React, { useState } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsScreen } from '../../../src/components/settings/SettingsScreen';
import { AudiencePicker } from '../../../src/components/settings/AudiencePicker';
import { SettingsSection } from '../../../src/components/settings/SettingsRow';
import usePrivacySettings, { type Audience } from '../../../src/hooks/usePrivacySettings';

export default function CommentsSettingsScreen() {
  const { settings, update } = usePrivacySettings();
  const [keyword, setKeyword] = useState('');

  const addKeyword = () => {
    const v = keyword.trim().toLowerCase();
    if (!v) return;
    if (settings.comments.filter_keywords.includes(v)) {
      setKeyword('');
      return;
    }
    void update({
      comments: {
        ...settings.comments,
        filter_keywords: [...settings.comments.filter_keywords, v].slice(0, 50),
      },
    });
    setKeyword('');
  };

  const removeKeyword = (v: string) => {
    void update({
      comments: {
        ...settings.comments,
        filter_keywords: settings.comments.filter_keywords.filter((k) => k !== v),
      },
    });
  };

  return (
    <SettingsScreen title="Comments">
      <Text style={styles.intro}>Choose who can comment on your videos.</Text>
      <AudiencePicker<Audience>
        value={settings.comments.who}
        onChange={(v) => void update({ comments: { ...settings.comments, who: v } })}
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'friends', label: 'Friends' },
          { value: 'no_one', label: 'No one', description: 'Comments will be disabled.' },
        ]}
      />

      <SettingsSection title="Filter keywords">
        <View style={styles.inputRow}>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Add a keyword to filter"
            placeholderTextColor="#8C8C8C"
            style={styles.input}
            onSubmitEditing={addKeyword}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={addKeyword} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
          {settings.comments.filter_keywords.length === 0 ? (
            <Text style={styles.empty}>No filtered keywords yet.</Text>
          ) : (
            settings.comments.filter_keywords.map((k) => (
              <TouchableOpacity key={k} style={styles.tag} onPress={() => removeKeyword(k)}>
                <Text style={styles.tagText}>{k}</Text>
                <Ionicons name="close" size={14} color="#FFF" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <Text style={styles.help}>Comments containing these words will be hidden automatically.</Text>
      </SettingsSection>

      <View style={{ height: 30 }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F1F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  empty: { color: '#8C8C8C', fontSize: 13, paddingHorizontal: 6 },
  help: { color: '#8C8C8C', fontSize: 12, paddingHorizontal: 16, paddingBottom: 12 },
});
