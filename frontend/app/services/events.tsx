import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const EVENTS = [
  {
    id: 'e1',
    title: 'Festival du Desert',
    image: 'https://picsum.photos/400/250?random=70',
    date: '15-17 Juillet 2025',
    location: 'Tombouctou, Mali',
    price: 10000,
    category: 'Festival',
    attendees: 2500,
  },
  {
    id: 'e2',
    title: 'AfroBeats Night Bamako',
    image: 'https://picsum.photos/400/250?random=71',
    date: '22 Juillet 2025',
    location: 'Palais de la Culture, Bamako',
    price: 5000,
    category: 'Concert',
    attendees: 800,
  },
  {
    id: 'e3',
    title: 'Salon de la Mode Africaine',
    image: 'https://picsum.photos/400/250?random=72',
    date: '1-3 Aout 2025',
    location: 'CICB, Bamako',
    price: 3000,
    category: 'Exposition',
    attendees: 1200,
  },
  {
    id: 'e4',
    title: 'Tech Meetup Mali',
    image: 'https://picsum.photos/400/250?random=73',
    date: '10 Aout 2025',
    location: 'Jigiya Bon, Bamako',
    price: 0,
    category: 'Tech',
    attendees: 150,
  },
];

export default function EventsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Evenements</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {EVENTS.map((event) => (
          <TouchableOpacity key={event.id} style={styles.eventCard}>
            <Image source={{ uri: event.image }} style={styles.eventImage} />
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.eventMeta}>
                <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                <Text style={styles.eventDate}>{event.date}</Text>
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.eventLocation}>{event.location}</Text>
              </View>
              <View style={styles.eventFooter}>
                <Text style={styles.eventPrice}>
                  {event.price === 0 ? 'Gratuit' : `${event.price.toLocaleString()} FCFA`}
                </Text>
                <View style={styles.attendeesContainer}>
                  <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.attendeesText}>{event.attendees}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  eventImage: {
    width: '100%',
    height: 180,
  },
  categoryBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  eventInfo: {
    padding: Spacing.lg,
  },
  eventTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  eventDate: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  eventLocation: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  eventPrice: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
});
