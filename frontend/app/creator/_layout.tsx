import { Stack } from 'expo-router';

export default function CreatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="earnings" />
      <Stack.Screen name="withdraw" />
      <Stack.Screen name="ads" />
    </Stack>
  );
}
