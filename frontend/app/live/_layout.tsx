import { Stack } from 'expo-router';

export default function LiveLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="stream" />
      <Stack.Screen name="replay" />
    </Stack>
  );
}
