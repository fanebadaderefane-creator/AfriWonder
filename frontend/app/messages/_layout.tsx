import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';

export default function MessagesLayout() {
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
      <Stack.Screen name="call" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
      <Stack.Screen name="new-group" />
    </Stack>
  );
}
