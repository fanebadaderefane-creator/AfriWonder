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
      <Stack.Screen name="my-food-orders" />
      <Stack.Screen name="transport" />
      <Stack.Screen name="health" />
      <Stack.Screen name="doctor/[id]" />
      <Stack.Screen name="realestate" />
      <Stack.Screen name="events" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="property/[id]" />
      <Stack.Screen name="restaurant/[id]" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="job/[id]" />
      <Stack.Screen name="provider/[id]" />
      <Stack.Screen name="covoiturage" />
      <Stack.Screen name="vehicle-rental" />
      <Stack.Screen name="childcare" />
      <Stack.Screen name="voyage" />
      <Stack.Screen name="insurance" />
    </Stack>
  );
}
