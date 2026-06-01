import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureMicPermissionForDm(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  if (Platform.OS === 'android') {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  const mic = await Audio.requestPermissionsAsync();
  return mic.granted;
}

export async function ensureCameraPermissionForDm(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  return perm.granted;
}

export async function ensureMediaLibraryPermissionForDm(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return perm.granted;
}
