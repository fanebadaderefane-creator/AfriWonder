/**
 * CreateGroupScreen — Créer un groupe (nom + sélection des membres)
 * Parité CDC avec le modal "Créer un groupe" de la PWA.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CreateGroupScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await api.messages.getConversations(1, 100);
      const list = data?.conversations ?? (Array.isArray(data) ? data : []);
      const seen = new Set();
      const users = [];
      for (const c of list) {
        const other = c.other || c.participants?.find((p) => p.id !== user.id);
        if (other?.id && !seen.has(other.id)) {
          seen.add(other.id);
          users.push({
            id: other.id,
            full_name: other.full_name || other.username || 'Utilisateur',
            username: other.username,
            profile_image: other.profile_image,
          });
        }
      }
      setContacts(users);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const toggleMember = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createGroup = useCallback(async () => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      Alert.alert('Nom requis', 'Donnez un nom au groupe.');
      return;
    }
    if (!user?.id) return;
    setCreating(true);
    try {
      const result = await api.messages.createGroup(trimmed, Array.from(selectedIds));
      const groupId = result?.id || result?.group?.id;
      if (groupId) {
        navigation.replace('GroupChat', { groupId });
      } else {
        Alert.alert('Erreur', 'Le groupe n\'a pas pu être créé.');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Erreur lors de la création';
      Alert.alert('Erreur', msg);
    } finally {
      setCreating(false);
    }
  }, [name, selectedIds, user?.id, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau groupe</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nom du groupe</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Équipe projet"
          placeholderTextColor="#6B7280"
          value={name}
          onChangeText={setName}
          maxLength={100}
        />
        <Text style={styles.label}>Ajouter des membres</Text>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun contact. Démarrez des conversations pour les ajouter ici.</Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              const displayName = item.full_name || item.username || 'Utilisateur';
              return (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => toggleMember(item.id)}
                  activeOpacity={0.7}
                >
                  {item.profile_image ? (
                    <Image source={{ uri: item.profile_image }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarLetter}>{displayName[0]?.toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <Text style={styles.contactName} numberOfLines={1}>{displayName}</Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, (!name.trim() || creating) && styles.createBtnDisabled]}
          onPress={createGroup}
          disabled={!name.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.createBtnText}>Créer le groupe</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#F9FAFB', flex: 1 },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F9FAFB',
    marginBottom: 24,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  contactName: { flex: 1, fontSize: 16, color: '#E5E7EB' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  centered: { paddingVertical: 32, alignItems: 'center' },
  empty: { paddingVertical: 24 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  footer: { padding: 16, paddingBottom: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1F2937' },
  createBtn: { backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
