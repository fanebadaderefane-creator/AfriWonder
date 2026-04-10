import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/colors';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="microcredit" />
      <Stack.Screen name="recharge" />
      <Stack.Screen name="transfer" />
    </Stack>
  );
}
