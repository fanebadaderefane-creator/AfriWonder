import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';

export default function ServicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="food" />
      <Stack.Screen name="transport" />
      <Stack.Screen name="health" />
      <Stack.Screen name="realestate" />
      <Stack.Screen name="events" />
      <Stack.Screen name="jobs" />
    </Stack>
  );
}
