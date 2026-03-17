import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api/client';

export default function SupportScreen({ route, navigation }) {
  const { videoId, creatorId, creatorName } = route.params || {};
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await api.creatorSupport.support(creatorId, {
        amount_fcfa: amt,
        message,
      });
      navigation.goBack();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-down" size={22} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soutenir le créateur</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.content}>
          {creatorName ? (
            <Text style={styles.creatorName}>{creatorName}</Text>
          ) : null}
          <Text style={styles.label}>Montant (FCFA)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="500"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />

          <Text style={styles.label}>Message (optionnel)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Merci pour ton contenu !"
            placeholderTextColor="#6B7280"
            style={[styles.input, styles.textarea]}
            multiline
          />

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.button, submitting && styles.buttonDisabled]}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? 'Envoi…' : 'Envoyer le soutien'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  creatorName: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0B1120',
    color: '#F9FAFB',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

