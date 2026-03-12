import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabProvider } from '../context/TabContext';
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import CreateScreen from '../screens/CreateScreen';
import LivesScreen from '../screens/LivesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const TABS = [
  { id: 'home', label: 'Accueil', icon: 'home-outline' },
  { id: 'discover', label: 'Découvrir', icon: 'compass-outline' },
  { id: 'create', label: '', icon: 'add-circle-outline', isPrimary: true },
  { id: 'lives', label: 'Live', icon: 'radio-outline' },
  { id: 'profile', label: 'Profil', icon: 'person-outline' },
];

// Marge minimale sous la barre d'onglets pour éviter le chevauchement avec la barre du navigateur mobile / barre d'accueil
const MIN_BOTTOM_INSET = Platform.OS === 'web' ? 32 : 0;

export default function MainTabs() {
  const [activeTab, setActiveTab] = useState('home');
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, MIN_BOTTOM_INSET);

  const renderScreen = () => {
    switch (activeTab) {
      case 'discover':
        return <DiscoverScreen />;
      case 'create':
        return <CreateScreen />;
      case 'lives':
        return <LivesScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'home':
      default:
        return <HomeScreen />;
    }
  };

  return (
    <TabProvider activeTab={activeTab} setActiveTab={setActiveTab}>
    <View style={styles.root}>
      <View style={styles.content}>{renderScreen()}</View>
      <View style={[styles.tabBarSafe, { paddingBottom: bottomPadding }]}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const color = active ? '#F9FAFB' : '#9CA3AF';
            const size = tab.isPrimary ? 28 : 24;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.id)}
              >
                {tab.isPrimary ? (
                  <View style={styles.primaryIcon}>
                    <Ionicons name="add" size={28} color="#F9FAFB" />
                  </View>
                ) : (
                  <Ionicons name={tab.icon} size={size} color={color} />
                )}
                {!tab.isPrimary && (
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
    </TabProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
  },
  tabBarSafe: {
    backgroundColor: '#0a0a0a',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: Math.max(8, Platform.OS === 'ios' ? 24 : 8),
    backgroundColor: '#0a0a0a',
    minHeight: 56,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  primaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


