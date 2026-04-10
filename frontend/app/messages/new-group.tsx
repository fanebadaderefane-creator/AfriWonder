import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../src/theme/colors';

const CONTACTS = [
  { id: 'u1', name: 'Aminata Diallo', avatar: 'https://i.pravatar.cc/80?img=1', selected: false },
  { id: 'u2', name: 'Moussa Ndiaye', avatar: 'https://i.pravatar.cc/80?img=2', selected: false },
  { id: 'u3', name: 'Awa Kone', avatar: 'https://i.pravatar.cc/80?img=3', selected: false },
  { id: 'u4', name: 'Ibrahim Toure', avatar: 'https://i.pravatar.cc/80?img=4', selected: false },
  { id: 'u5', name: 'Mariam Sangare', avatar: 'https://i.pravatar.cc/80?img=5', selected: false },
  { id: 'u6', name: 'Fatoumata Diarra', avatar: 'https://i.pravatar.cc/80?img=9', selected: false },
  { id: 'u7', name: 'Boubacar Diallo', avatar: 'https://i.pravatar.cc/80?img=7', selected: false },
  { id: 'u8', name: 'Seydou Keita', avatar: 'https://i.pravatar.cc/80?img=30', selected: false },
  { id: 'u9', name: 'Kadiatou Toure', avatar: 'https://i.pravatar.cc/80?img=25', selected: false },
  { id: 'u10', name: 'Oumar Coulibaly', avatar: 'https://i.pravatar.cc/80?img=12', selected: false },
];

export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  const toggleContact = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredContacts = searchQuery
    ? CONTACTS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : CONTACTS;

  const selectedContacts = CONTACTS.filter(c => selectedIds.includes(c.id));

  const handleCreate = () => {
    Alert.alert('Groupe cree !', `Le groupe "${groupName}" a ete cree avec ${selectedIds.length} membres.`, [
      { text: 'Super', onPress: () => router.replace('/messages' as any) },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{step === 1 ? 'Nouveau groupe' : 'Infos du groupe'}</Text>
            <Text style={styles.headerSubtitle}>
              {step === 1 ? `${selectedIds.length} selectionne(s)` : 'Etape 2/2'}
            </Text>
          </View>
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.nextBtn, selectedIds.length < 2 && { opacity: 0.3 }]}
              onPress={() => selectedIds.length >= 2 && setStep(2)}
              disabled={selectedIds.length < 2}
            >
              <Text style={styles.nextBtnText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createBtn, !groupName && { opacity: 0.3 }]}
              onPress={groupName ? handleCreate : undefined}
              disabled={!groupName}
            >
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {step === 1 ? (
          <View style={{ flex: 1 }}>
            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color="#888" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un contact..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Selected contacts chips */}
            {selectedContacts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {selectedContacts.map(c => (
                  <TouchableOpacity key={c.id} style={styles.chip} onPress={() => toggleContact(c.id)}>
                    <Image source={{ uri: c.avatar }} style={styles.chipAvatar} />
                    <Text style={styles.chipName}>{c.name.split(' ')[0]}</Text>
                    <Ionicons name="close" size={14} color="#888" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Contacts list */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredContacts.map(contact => {
                const isSelected = selectedIds.includes(contact.id);
                return (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactRow}
                    onPress={() => toggleContact(contact.id)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: contact.avatar }} style={styles.contactAvatar} />
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.stepTwoContent} keyboardShouldPersistTaps="handled">
            {/* Group avatar */}
            <TouchableOpacity style={styles.groupAvatarPicker}>
              <LinearGradient colors={['#FF6B00', '#FF3D00']} style={styles.groupAvatarGradient}>
                <Ionicons name="camera" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={styles.groupAvatarHint}>Ajouter une photo</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Nom du groupe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Famille Bamako"
              placeholderTextColor="#555"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />

            <Text style={styles.label}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Decrivez ce groupe..."
              placeholderTextColor="#555"
              value={groupDesc}
              onChangeText={setGroupDesc}
              multiline
              maxLength={200}
            />

            {/* Members preview */}
            <Text style={styles.label}>Membres ({selectedIds.length})</Text>
            <View style={styles.membersPreview}>
              {selectedContacts.map(c => (
                <View key={c.id} style={styles.memberChip}>
                  <Image source={{ uri: c.avatar }} style={styles.memberAvatar} />
                  <Text style={styles.memberName}>{c.name.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: '#888', fontSize: 11, marginTop: 1 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  nextBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  createBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 6,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

  chipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A1A1A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  chipAvatar: { width: 24, height: 24, borderRadius: 12 },
  chipName: { color: '#CCC', fontSize: 12, fontWeight: '500' },

  contactRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, gap: 12,
  },
  contactAvatar: { width: 44, height: 44, borderRadius: 22 },
  contactName: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '500' },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#444',
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  stepTwoContent: { paddingHorizontal: 16, paddingTop: 16 },
  groupAvatarPicker: { alignItems: 'center', marginBottom: 24 },
  groupAvatarGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  groupAvatarHint: { color: Colors.primary, fontSize: 13, fontWeight: '600', marginTop: 8 },

  label: { color: '#CCC', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#111', borderRadius: 12, padding: 14, color: '#FFF',
    fontSize: 15, borderWidth: 1, borderColor: '#222',
  },

  membersPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  memberChip: { alignItems: 'center', width: 60 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, marginBottom: 4 },
  memberName: { color: '#AAA', fontSize: 10, textAlign: 'center' },
});
