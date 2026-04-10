import { Stack } from 'expo-router';
import React from 'react';
import { Colors } from '../../src/theme/colors';

export default function CrowdfundingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="create" />
      <Stack.Screen name="contribute" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
