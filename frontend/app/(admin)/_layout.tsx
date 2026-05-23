import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { isAdminUser } from '../../src/utils/adminAccess';

export default function AdminGroupLayout() {
  const user = useAuthStore((s) => s.user);

  if (!isAdminUser(user)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
