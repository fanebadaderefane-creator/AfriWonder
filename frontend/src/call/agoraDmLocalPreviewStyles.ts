import { Platform, StyleSheet } from 'react-native';

/** Android RtcTextureView : overflow:hidden sur le parent = PiP noir (coins arrondis via bordure). */
const pipOverflowClip = Platform.OS === 'android' ? undefined : ('hidden' as const);

/** Styles partagés — une seule surface locale (overlay root + écran d’appel). */
export const agoraDmLocalPreviewStyles = StyleSheet.create({
  pipBase: {
    borderRadius: 12,
    ...(pipOverflowClip ? { overflow: pipOverflowClip } : null),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 5,
    ...(Platform.OS === 'android' ? { elevation: 24 } : null),
  },
  pip: {
    position: 'absolute',
    bottom: 108,
    right: 16,
    width: 110,
    height: 156,
    borderRadius: 12,
    ...(pipOverflowClip ? { overflow: pipOverflowClip } : null),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 5,
  },
  full: {
    ...StyleSheet.absoluteFillObject,
  },
  hidden: {
    position: 'absolute',
    bottom: 108,
    right: 16,
    width: 110,
    height: 156,
    opacity: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  invisible: {
    opacity: 0,
  },
  /** Caméra off — garder la surface montée sans opacity (Android coupe le rendu sinon). */
  hiddenCam: {
    opacity: 0.01,
  },
  fill: { flex: 1, width: '100%', height: '100%' },
  pipFlipBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
