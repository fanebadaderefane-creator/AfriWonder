import { Alert } from 'react-native';
import apiClient from '../api/client';

export async function probeAgoraLiveReady(): Promise<void> {
  try {
    const res = await apiClient.get('/live/agora-status');
    const d = (res.data?.data ?? res.data) as Record<string, unknown> | null;
    const configured = Boolean(d?.configured ?? d?.agoraConfigured ?? d?.ok);
    const tokenOk = Boolean(d?.tokenTestOk ?? d?.token_ok);
    if (configured && tokenOk) {
      Alert.alert('Agora OK', 'Connexion live prête — vous pouvez démarrer en confiance.');
      return;
    }
    if (configured) {
      Alert.alert(
        'Agora partiel',
        'AGORA_APP_ID configuré. Vérifiez AGORA_APP_CERTIFICATE sur le serveur si le test token échoue.',
      );
      return;
    }
    Alert.alert(
      'Agora non configuré',
      'Le serveur n’a pas AGORA_APP_ID. Configurez Agora sur Render avant un live vidéo réel.',
    );
  } catch {
    Alert.alert('Test Agora', 'Impossible de joindre le serveur. Vérifiez votre connexion.');
  }
}
