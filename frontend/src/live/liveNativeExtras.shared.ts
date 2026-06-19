import { Alert } from 'react-native';
import { router } from 'expo-router';

export function openWalletForCoins(): void {
  router.push('/wallet/coins' as never);
}

export function openMobileMoneyInfo(): void {
  Alert.alert(
    'Achat de coins',
    'Rechargez via Mobile Money depuis l’écran Wallet (Orange Money, etc.). Les IAP App Store / Play Store sont à configurer selon votre compte marchand.',
    [{ text: 'Ouvrir Wallet', onPress: () => router.push('/wallet/coins' as never) }],
  );
}
