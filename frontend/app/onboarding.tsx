import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing } from '../src/theme/colors';
import { Button } from '../src/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../src/utils/secureStorage';
import { Image } from 'expo-image';

/** Même ressource que l’icône PWA / notifications. */
const AFW_BRAND_LOGO = require('../assets/images/pwa-icon-192.png');

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    useBrandLogo: true as const,
    title: 'Découvrez des Vidéos',
    description: 'Regardez des vidéos passionnantes de créateurs africains. Partagez, commentez et suivez vos favoris.',
    color: Colors.primary,
  },
  {
    id: '2',
    useBrandLogo: false as const,
    icon: 'cart',
    title: 'Marketplace Africain',
    description: 'Achetez et vendez des produits locaux. Mode, électronique, alimentation et plus encore.',
    color: '#4CAF50',
  },
  {
    id: '3',
    useBrandLogo: false as const,
    icon: 'wallet',
    title: 'Paiements Mobiles',
    description: 'Payez facilement avec Orange Money, Wave, MTN MoMo ou carte bancaire.',
    color: Colors.accent,
  },
  {
    id: '4',
    useBrandLogo: false as const,
    icon: 'people',
    title: 'Communauté & Lives',
    description: 'Suivez vos créateurs préférés, envoyez des cadeaux en direct et rejoignez la scène africaine.',
    color: '#9C27B0',
  },
  {
    id: '5',
    useBrandLogo: false as const,
    icon: 'sparkles',
    title: 'Pour vous',
    description: 'Un fil personnalisé selon vos goûts. Activez les notifications pour ne rien manquer.',
    color: '#00BCD4',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await secureStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    await secureStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(tabs)');
  };

  const renderSlide = ({ item }: { item: (typeof slides)[number] }) => (
    <View style={styles.slide}>
      {item.useBrandLogo ? (
        <View style={styles.logoWrap}>
          <Image
            source={AFW_BRAND_LOGO}
            style={styles.brandLogo}
            contentFit="contain"
            accessibilityLabel="AfriWonder"
          />
        </View>
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon as any} size={80} color={Colors.text} />
        </View>
      )}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Passer</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <Button
          title={currentIndex === slides.length - 1 ? 'Commencer' : 'Suivant'}
          onPress={handleNext}
          size="large"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.xl,
    zIndex: 10,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  logoWrap: {
    marginBottom: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 168,
    height: 168,
    borderRadius: 84,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxxl,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  activeDot: {
    backgroundColor: Colors.primary,
    width: 30,
  },
  button: {
    width: '100%',
  },
});
