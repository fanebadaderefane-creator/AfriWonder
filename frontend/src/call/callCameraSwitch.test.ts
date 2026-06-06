import { describe, expect, it, vi } from 'vitest';
import {
  buildCameraVideoConstraints,
  executeCameraFlip,
  filterVideoInputs,
  hasMultipleVideoInputs,
  nativeLocalVideoMirror,
  pickNextCameraSelection,
  switchNativeVideoCameraFacing,
} from './callCameraSwitch';

describe('callCameraSwitch', () => {
  const camA = { kind: 'videoinput', deviceId: 'cam-a', label: 'Front' } as MediaDeviceInfo;
  const camB = { kind: 'videoinput', deviceId: 'cam-b', label: 'Back' } as MediaDeviceInfo;

  it('cycle deviceId quand plusieurs webcams', () => {
    const next = pickNextCameraSelection({
      videoInputs: [camA, camB],
      currentDeviceId: 'cam-a',
      currentFacing: 'user',
    });
    expect(next.deviceId).toBe('cam-b');
    expect(buildCameraVideoConstraints(next).deviceId).toEqual({ exact: 'cam-b' });
  });

  it('toggle facingMode sur mobile (une seule entrée listée)', () => {
    const next = pickNextCameraSelection({
      videoInputs: [camA],
      currentDeviceId: 'cam-a',
      currentFacing: 'user',
    });
    expect(next.deviceId).toBeNull();
    expect(next.facing).toBe('environment');
    expect(buildCameraVideoConstraints(next, { isWeb: true })).toEqual({ facingMode: 'environment' });
  });

  it('filterVideoInputs ignore les entrées sans deviceId', () => {
    expect(filterVideoInputs([camA, { kind: 'videoinput', deviceId: '', label: '' } as MediaDeviceInfo])).toEqual([
      camA,
    ]);
    expect(hasMultipleVideoInputs([camA, camB])).toBe(true);
  });

  it('preferFacingMode force le toggle avant/arrière (Android/iOS)', () => {
    const next = pickNextCameraSelection({
      videoInputs: [camA, camB],
      currentDeviceId: 'cam-a',
      currentFacing: 'user',
      preferFacingMode: true,
    });
    expect(next.deviceId).toBeNull();
    expect(next.facing).toBe('environment');
  });

  it('switchNativeVideoCameraFacing via applyConstraints', async () => {
    let facing = 'user';
    const stream = {
      getVideoTracks: () => [
        {
          getSettings: () => ({ facingMode: facing }),
          applyConstraints: async (c: MediaTrackConstraints) => {
            facing = String(c.facingMode || 'user');
          },
        },
      ],
    } as unknown as MediaStream;
    const next = await switchNativeVideoCameraFacing(stream);
    expect(next).toBe('environment');
    expect(nativeLocalVideoMirror('user')).toBe(true);
    expect(nativeLocalVideoMirror('environment')).toBe(false);
  });

  it('switchNativeVideoCameraFacing via _switchCamera (fallback RN)', async () => {
    let switched = false;
    const stream = {
      getVideoTracks: () => [
        {
          getSettings: () => ({ facingMode: 'user' }),
          _switchCamera: () => {
            switched = true;
          },
        },
      ],
    } as unknown as MediaStream;
    const next = await switchNativeVideoCameraFacing(stream);
    expect(switched).toBe(true);
    expect(next).toBe('environment');
  });

  it('executeCameraFlip Android : applyConstraints natif (sans replaceTrack)', async () => {
    let facing = 'user';
    const stream = {
      getVideoTracks: () => [
        {
          getSettings: () => ({ facingMode: facing }),
          applyConstraints: async (c: MediaTrackConstraints) => {
            facing = String(c.facingMode || 'user');
          },
        },
      ],
    } as unknown as MediaStream;

    const replaceVideoTrack = vi.fn().mockResolvedValue(false);
    const result = await executeCameraFlip({
      isWeb: false,
      stream,
      mediaDevices: { enumerateDevices: async () => [], getUserMedia: vi.fn() },
      currentFacing: 'user',
      currentDeviceId: null,
      replaceVideoTrack,
    });

    expect(result).toEqual({ ok: true, facing: 'environment', method: 'native-track' });
    expect(replaceVideoTrack).not.toHaveBeenCalled();
  });

  it('executeCameraFlip iOS : fallback replaceTrack si applyConstraints absent', async () => {
    const stream = {
      getVideoTracks: () => [{ getSettings: () => ({ facingMode: 'user' }) }],
    } as unknown as MediaStream;

    const replaceVideoTrack = vi.fn().mockResolvedValue(true);
    const result = await executeCameraFlip({
      isWeb: false,
      stream,
      mediaDevices: {
        enumerateDevices: async () => [
          { kind: 'videoinput', deviceId: 'front', label: 'Front' } as MediaDeviceInfo,
          { kind: 'videoinput', deviceId: 'back', label: 'Back' } as MediaDeviceInfo,
        ],
        getUserMedia: vi.fn(),
      },
      currentFacing: 'user',
      currentDeviceId: 'front',
      replaceVideoTrack,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.method).toBe('replace-track');
      expect(result.facing).toBe('environment');
    }
    expect(replaceVideoTrack).toHaveBeenCalledWith({
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    });
  });

  it('executeCameraFlip web : une seule webcam → single_camera', async () => {
    const stream = { getVideoTracks: () => [] } as unknown as MediaStream;
    const result = await executeCameraFlip({
      isWeb: true,
      stream,
      mediaDevices: {
        enumerateDevices: async () => [
          { kind: 'videoinput', deviceId: 'cam0', label: 'Webcam' } as MediaDeviceInfo,
        ],
        getUserMedia: vi.fn(),
      },
      currentFacing: 'user',
      currentDeviceId: 'cam0',
      replaceVideoTrack: vi.fn().mockResolvedValue(false),
    });
    expect(result).toEqual({ ok: false, reason: 'single_camera' });
  });
});
