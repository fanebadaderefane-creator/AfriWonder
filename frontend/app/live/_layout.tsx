import { Stack } from 'expo-router';

export default function LiveLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="feed" />
      <Stack.Screen name="start" />
      <Stack.Screen name="stream" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="replay" />
      <Stack.Screen name="gifts" />
      <Stack.Screen name="coin-recharge-mm" />
      <Stack.Screen name="analytics/[id]" />
    </Stack>
  );
}
