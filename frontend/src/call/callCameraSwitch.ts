/** Bascule caméra avant/arrière (mobile) ou cycle des webcams (web / PC). */

export type FacingMode = 'user' | 'environment';

export type CameraSelection = {
  deviceId: string | null;
  facing: FacingMode;
};

export function filterVideoInputs(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
  return devices.filter((d) => d.kind === 'videoinput' && Boolean(d.deviceId));
}

/** Prochaine caméra : cycle `deviceId` si plusieurs entrées, sinon toggle `facingMode`. */
export function pickNextCameraSelection(input: {
  videoInputs: MediaDeviceInfo[];
  currentDeviceId: string | null;
  currentFacing: FacingMode;
  /** Android/iOS : `facingMode` via `applyConstraints` (évite `deviceId` + 2ᵉ getUserMedia). */
  preferFacingMode?: boolean;
}): CameraSelection {
  if (input.preferFacingMode) {
    return {
      deviceId: null,
      facing: input.currentFacing === 'user' ? 'environment' : 'user',
    };
  }
  const inputs = filterVideoInputs(input.videoInputs);
  if (inputs.length >= 2) {
    const idx = inputs.findIndex((d) => d.deviceId === input.currentDeviceId);
    const next = inputs[(Math.max(0, idx) + 1) % inputs.length];
    return { deviceId: next.deviceId, facing: input.currentFacing };
  }
  return {
    deviceId: null,
    facing: input.currentFacing === 'user' ? 'environment' : 'user',
  };
}

export function buildCameraVideoConstraints(
  selection: CameraSelection,
  opts?: { isWeb?: boolean },
): MediaTrackConstraints {
  if (selection.deviceId) {
    return {
      deviceId: { exact: selection.deviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }
  if (opts?.isWeb) {
    return { facingMode: selection.facing };
  }
  return {
    facingMode: selection.facing,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
}

export function readVideoDeviceIdFromStream(stream: MediaStream | null | undefined): string | null {
  const track = stream?.getVideoTracks?.()[0];
  if (!track) return null;
  try {
    const settings = track.getSettings?.();
    return settings?.deviceId ? String(settings.deviceId) : null;
  } catch {
    return null;
  }
}

export function hasMultipleVideoInputs(devices: MediaDeviceInfo[]): boolean {
  return filterVideoInputs(devices).length >= 2;
}

type NativeVideoTrack = {
  getSettings?: () => { facingMode?: string; deviceId?: string };
  applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
  _switchCamera?: () => void;
};

function readFacingFromTrack(track: NativeVideoTrack | undefined): FacingMode {
  const raw = String(track?.getSettings?.()?.facingMode || 'user').toLowerCase();
  return raw === 'environment' ? 'environment' : 'user';
}

/**
 * Bascule avant/arrière sur Android/iOS sans 2ᵉ getUserMedia (API react-native-webrtc).
 * Retourne le nouveau `facingMode` ou `null` si indisponible.
 */
export async function switchNativeVideoCameraFacing(
  stream: MediaStream | null | undefined,
): Promise<FacingMode | null> {
  const track = stream?.getVideoTracks?.()[0] as NativeVideoTrack | undefined;
  if (!track) return null;
  const current = readFacingFromTrack(track);
  const next: FacingMode = current === 'user' ? 'environment' : 'user';
  try {
    if (typeof track.applyConstraints === 'function') {
      await track.applyConstraints({ facingMode: next });
      const after = readFacingFromTrack(track);
      return after !== current ? after : next;
    }
    if (typeof track._switchCamera === 'function') {
      /** `_switchCamera` appelle `applyConstraints` sans await — on retourne `next` directement. */
      track._switchCamera();
      return next;
    }
    return null;
  } catch {
    return null;
  }
}

export type CameraFlipResult =
  | { ok: true; facing: FacingMode; method: 'native-track' | 'replace-track' }
  | { ok: false; reason: 'unavailable' | 'single_camera' | 'failed' };

/**
 * Orchestration flip (web + natif) — testable sans écran React.
 */
export async function executeCameraFlip(input: {
  isWeb: boolean;
  stream: MediaStream | null | undefined;
  mediaDevices: Pick<MediaDevices, 'enumerateDevices' | 'getUserMedia'>;
  currentFacing: FacingMode;
  currentDeviceId: string | null;
  replaceVideoTrack: (constraints: MediaTrackConstraints) => Promise<boolean>;
}): Promise<CameraFlipResult> {
  if (!input.stream || !input.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'unavailable' };
  }

  if (!input.isWeb) {
    const nativeFacing = await switchNativeVideoCameraFacing(input.stream);
    if (nativeFacing) {
      return { ok: true, facing: nativeFacing, method: 'native-track' };
    }
  }

  let devices: MediaDeviceInfo[] = [];
  try {
    devices = await input.mediaDevices.enumerateDevices();
  } catch {
    devices = [];
  }

  const selection = pickNextCameraSelection({
    videoInputs: devices,
    currentDeviceId: input.currentDeviceId,
    currentFacing: input.currentFacing,
    preferFacingMode: !input.isWeb,
  });

  try {
    const replaced = await input.replaceVideoTrack(
      buildCameraVideoConstraints(selection, { isWeb: input.isWeb }),
    );
    if (replaced) {
      return { ok: true, facing: selection.facing, method: 'replace-track' };
    }
  } catch {
    /* fallthrough */
  }

  const inputs = filterVideoInputs(devices);
  if (inputs.length <= 1 && input.isWeb) {
    return { ok: false, reason: 'single_camera' };
  }
  return { ok: false, reason: 'failed' };
}

export function nativeLocalVideoMirror(facing: FacingMode): boolean {
  return facing === 'user';
}
