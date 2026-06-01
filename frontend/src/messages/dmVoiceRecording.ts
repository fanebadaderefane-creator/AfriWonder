import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';
import { ensureMicPermissionForDm } from './dmNativePermissions';

/** Options vocaux DM — AAC/m4a explicite (Android + iOS), évite webm/opus rejetés par le backend. */
export const DM_VOICE_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44_100,
    numberOfChannels: 1,
    bitRate: 128_000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44_100,
    numberOfChannels: 1,
    bitRate: 128_000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: Audio.RecordingOptionsPresets.HIGH_QUALITY.web,
};

export async function prepareDmVoiceRecordingSession(): Promise<void> {
  if (Platform.OS === 'web') return;
  /**
   * Un appel WebRTC précédent (react-native-webrtc / InCallManager) peut laisser la session
   * audio désactivée → `createAsync` lève « Impossible de démarrer l’enregistrement ».
   */
  await Audio.setIsEnabledAsync(true);
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: false,
    staysActiveInBackground: false,
    playThroughEarpieceAndroid: false,
  });
}

/**
 * `expo-av` n’autorise qu’un seul `Recording` préparé à la fois. Un enregistrement annulé
 * sans `stopAndUnloadAsync()` (ou interrompu par un crash) bloque le suivant. On crée le
 * Recording manuellement pour pouvoir l’unload proprement si la préparation échoue, puis on
 * réessaie une fois.
 */
async function createRecordingWithReset(): Promise<Audio.Recording> {
  try {
    const created = await Audio.Recording.createAsync(DM_VOICE_RECORDING_OPTIONS);
    return created.recording;
  } catch (firstError) {
    const recording = new Audio.Recording();
    try {
      await recording.prepareToRecordAsync(DM_VOICE_RECORDING_OPTIONS);
      await recording.startAsync();
      return recording;
    } catch {
      try {
        await recording.stopAndUnloadAsync();
      } catch {
        /* ignore */
      }
      throw firstError;
    }
  }
}

export async function startDmVoiceRecording(): Promise<Audio.Recording> {
  const granted = await ensureMicPermissionForDm();
  if (!granted) {
    throw new Error('DM_MIC_PERMISSION_DENIED');
  }
  await prepareDmVoiceRecordingSession();
  return createRecordingWithReset();
}

export async function stopDmVoiceRecording(recording: Audio.Recording): Promise<string | null> {
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    /* ignore */
  }
  const uri = recording.getURI();
  if (Platform.OS !== 'web') {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
  }
  return uri;
}
