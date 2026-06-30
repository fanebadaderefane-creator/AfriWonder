import { describe, expect, it } from 'vitest';



import {
  clampAgoraDmPipDrag,
  resolveAgoraDmCanvasStartPreview,
  shouldAgoraDmPreviewStartPreview,
} from './agoraDmPipPosition';



describe('agoraDmPipPosition', () => {

  it('clamp garde le PiP dans la fenêtre', () => {

    expect(

      clampAgoraDmPipDrag({ x: 5000, y: 5000, windowWidth: 400, windowHeight: 800 }),

    ).toEqual({ x: 282, y: 636 });

    expect(

      clampAgoraDmPipDrag({ x: 0, y: 0, windowWidth: 400, windowHeight: 800 }),

    ).toEqual({ x: 8, y: 8 });

  });



  it('startPreview ciblé — chat / premier plan / flip overlay / layout surface', () => {

    expect(shouldAgoraDmPreviewStartPreview('minimized')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('app_foreground')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('overlay_flip')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('overlay_layout_pip_call')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('surface_layout_110x156')).toBe(true);
    expect(shouldAgoraDmPreviewStartPreview('feeds_swapped')).toBe(true);
    expect(shouldAgoraDmPreviewStartPreview('resume_minimized')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('remote_ever_joined')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('resume_call')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('overlay_layout_full_call')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('canvas_after_overlay_flip')).toBe(true);

    expect(shouldAgoraDmPreviewStartPreview('join_ok')).toBe(false);

  });

  it('en canal — pas de startPreview (TextureView PiP)', () => {
    expect(resolveAgoraDmCanvasStartPreview('surface_layout_106x152', true)).toBe(false);
    expect(resolveAgoraDmCanvasStartPreview('remote_ever_joined', true)).toBe(false);
    expect(resolveAgoraDmCanvasStartPreview('overlay_layout_pip_call', true)).toBe(false);
    expect(resolveAgoraDmCanvasStartPreview('overlay_layout_full_call', false)).toBe(true);
    expect(resolveAgoraDmCanvasStartPreview('minimized', false)).toBe(true);
  });

});

