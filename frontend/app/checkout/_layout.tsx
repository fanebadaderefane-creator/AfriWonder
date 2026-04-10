import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';

export default function CheckoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
