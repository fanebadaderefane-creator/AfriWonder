import React from 'react';
import { Stack } from 'expo-router';

/**
 * Layout du module Paid Video Calls (User ↔ Star).
 * Feature isolée — elle vit sous `/stars/*` et n'est PAS déclarée dans les
 * tabs principaux. On y accède depuis le Menu Plus / l'écran de découverte.
 * Le kill-switch `featureFlags.starCalls` décide si ces écrans sont listés.
 */
export default function StarsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
