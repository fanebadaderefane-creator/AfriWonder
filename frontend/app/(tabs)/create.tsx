import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../src/components/common/Button';
import { useAuthStore } from '../../src/store/authStore';
import { router } from 'expo-router';

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const handlePickVideo = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour publier une vid\u00e9o',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refus\u00e9e', 'Nous avons besoin de la permission pour acc\u00e9der \u00e0 votre galerie');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedVideo(result.assets[0].uri);
    }
  };

  const handleRecordVideo = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour enregistrer une vid\u00e9o',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refus\u00e9e', 'Nous avons besoin de la permission pour acc\u00e9der \u00e0 votre cam\u00e9ra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedVideo(result.assets[0].uri);
    }
  };

  const handleStartLive = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour d\u00e9marrer un live',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    Alert.alert('Live', 'Fonctionnalit\u00e9 live bient\u00f4t disponible!');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Cr\u00e9er</Text>
      </View>

      <View style={styles.content}>
        {/* Camera/Gallery options */}
        <View style={styles.optionsGrid}>
          <TouchableOpacity style={styles.optionCard} onPress={handleRecordVideo}>
            <View style={[styles.optionIcon, { backgroundColor: Colors.primary }]}>
              <Ionicons name="videocam" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Enregistrer</Text>
            <Text style={styles.optionSubtitle}>Capturer une vid\u00e9o</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handlePickVideo}>
            <View style={[styles.optionIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="images" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Galerie</Text>
            <Text style={styles.optionSubtitle}>Choisir une vid\u00e9o</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleStartLive}>
            <View style={[styles.optionIcon, { backgroundColor: Colors.live }]}>
              <Ionicons name="radio" size={40} color={Colors.text} />
            </View>
            <Text style={styles.optionTitle}>Live</Text>
            <Text style={styles.optionSubtitle}>D\u00e9marrer un stream</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Conseils pour de bonnes vid\u00e9os</Text>
          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={20} color={Colors.accent} />
            <Text style={styles.tipText}>Utilisez une bonne lumi\u00e8re naturelle</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="time" size={20} color={Colors.accent} />
            <Text style={styles.tipText}>Vid\u00e9os courtes (15-60 secondes)</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="musical-notes" size={20} color={Colors.accent} />
            <Text style={styles.tipText}>Ajoutez de la musique tendance</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="pricetag" size={20} color={Colors.accent} />
            <Text style={styles.tipText}>Utilisez des hashtags populaires</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  optionCard: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  optionIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  optionTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    textAlign: 'center',
  },
  tipsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  tipsTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  tipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    flex: 1,
  },
});
