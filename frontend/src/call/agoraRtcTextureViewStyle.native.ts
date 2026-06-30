/**
 * Android RtcTextureView + Fabric : pas de background sur la vue Agora (crash natif).
 */
import { type StyleProp, type ViewStyle } from 'react-native';

export const AGORA_RTC_TEXTURE_LAYOUT: ViewStyle = {
  flex: 1,
  width: '100%',
  height: '100%',
};

/** Fond sur le conteneur View parent — jamais sur RtcTextureView. */
export const AGORA_RTC_SURFACE_HOST_BG: ViewStyle = {
  backgroundColor: '#0a0a0a',
};

function flattenViewStyle(style?: StyleProp<ViewStyle>): ViewStyle {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<ViewStyle>((acc, item) => ({ ...acc, ...flattenViewStyle(item) }), {});
  }
  return { ...(style as ViewStyle) };
}

export function agoraRtcTextureViewSafeStyle(style?: StyleProp<ViewStyle>): ViewStyle {
  const flat = flattenViewStyle([AGORA_RTC_TEXTURE_LAYOUT, style]);
  const {
    backgroundColor: _backgroundColor,
    background: _background,
    ...layoutOnly
  } = flat as ViewStyle & { background?: unknown };
  return layoutOnly as ViewStyle;
}
