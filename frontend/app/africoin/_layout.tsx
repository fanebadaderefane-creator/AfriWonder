import { Stack } from 'expo-router';

export default function AfricoinLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#f3f4f6' },
      }}
    />
  );
}
