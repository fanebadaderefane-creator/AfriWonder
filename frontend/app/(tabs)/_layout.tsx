import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MIN_TOUCH_TARGET } from '../../src/theme/designSystem';
import { Colors } from '../../src/theme/colors';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { isAdminUser } from '../../src/utils/adminAccess';
import apiClient from '../../src/api/client';

function useInboxUnreadTotal() {
  const token = useAuthStore((s) => s.accessToken);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setTotal(0);
      return;
    }
    try {
      const res = await apiClient.get('/messages/conversations', { params: { page: 1, limit: 50 } });
      const data = res.data?.data || res.data;
      const convos = data?.conversations || [];
      const sum = (Array.isArray(convos) ? convos : []).reduce(
        (acc: number, c: { unread_count?: number }) => acc + (Number(c.unread_count) || 0),
        0
      );
      setTotal(sum);
    } catch {
      setTotal(0);
    }
  }, [token]);

  /** Pas de `refresh` ici : évite double appel au montage (useFocusEffect suffit) + moins de charge sur le thread JS. */
  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, 120_000);
    return () => clearInterval(id);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return total;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminUser(user);
  const inboxUnread = useInboxUnreadTotal();

  const activeTint = mode === 'light' ? colors.primary : '#FFFFFF';
  const inactiveTint = mode === 'light' ? colors.textSecondary : 'rgba(255,255,255,0.55)';

  const tabScreenOptions = useMemo(
    () => ({
      lazy: true,
      freezeOnBlur: false,
      detachInactiveScreens: true,
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.tabBar,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        height: 65 + insets.bottom,
        paddingBottom: insets.bottom,
        paddingTop: 6,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarActiveTintColor: activeTint,
      tabBarInactiveTintColor: inactiveTint,
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600' as const,
        marginTop: 2,
      },
    }),
    [colors.tabBar, colors.border, insets.bottom, activeTint, inactiveTint]
  );

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={focused ? activeTint : inactiveTint} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={26} color={focused ? activeTint : inactiveTint} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          href: null,
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name={focused ? 'telescope' : 'telescope-outline'} size={26} color={focused ? activeTint : inactiveTint} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.createWrapper}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createOuterRing}
              >
                <Ionicons name="add" size={30} color="#FFFFFF" />
              </LinearGradient>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons
                name={focused ? 'file-tray' : 'file-tray-outline'}
                size={26}
                color={focused ? Colors.primary : inactiveTint}
              />
              {inboxUnread > 0 ? (
                <View style={[styles.inboxBadge, { borderColor: colors.border }]}>
                  <Text style={styles.inboxBadgeText}>{inboxUnread > 99 ? '99+' : String(inboxUnread)}</Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={focused ? activeTint : inactiveTint} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          href: null,
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={focused ? activeTint : inactiveTint} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          href: null,
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name={focused ? 'bag' : 'bag-outline'} size={24} color={focused ? activeTint : inactiveTint} />
              <View style={[styles.badgeDot, { borderColor: colors.tabBar }]} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? '/(tabs)/admin' : null,
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
                size={24}
                color={focused ? activeTint : inactiveTint}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
  },
  inboxBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  inboxBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  createWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    marginTop: Platform.OS === 'web' ? 0 : 6,
  },
  createOuterRing: {
    width: 50,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3D00',
    borderWidth: 1.5,
  },
});
