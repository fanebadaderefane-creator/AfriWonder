import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { isValidNativeRtcStreamUrl } from '../../call/callRtcStreamUrl';
import { tryLoadReactNativeWebRtc } from '../../call/tryLoadReactNativeWebRtc';
import { captureSentryException } from '../../lib/sentryMobile';
import { devWarn } from '../../utils/devLog';

type RtcViewProps = {
  streamURL: string;
  style?: ViewStyle;
  objectFit?: 'cover' | 'contain';
  mirror?: boolean;
  zOrder?: number;
  zOrderMediaOverlay?: boolean;
};

type Props = RtcViewProps & {
  /** Identifiant stable pour Sentry si le rendu natif plante. */
  debugLabel?: string;
};

type State = { renderFailed: boolean };

const RTCViewComponent = tryLoadReactNativeWebRtc()?.RTCView as
  | React.ComponentType<RtcViewProps>
  | undefined;

/**
 * RTCView encapsulé : URL validée + error boundary — évite le crash process Android/iOS.
 */
class SafeNativeRtcViewInner extends Component<Props, State> {
  state: State = { renderFailed: false };

  static getDerivedStateFromError(): State {
    return { renderFailed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    devWarn('[SafeNativeRtcView]', this.props.debugLabel, error.message);
    captureSentryException(error, {
      source: 'SafeNativeRtcView',
      label: this.props.debugLabel || 'rtc',
      componentStack: String(info.componentStack || '').slice(0, 1500),
    });
  }

  render(): ReactNode {
    if (this.state.renderFailed) return <View style={this.props.style} />;
    if (Platform.OS === 'web' || !RTCViewComponent) return null;

    const { debugLabel: _label, ...rtcProps } = this.props;
    if (!isValidNativeRtcStreamUrl(rtcProps.streamURL)) return null;

    try {
      return <RTCViewComponent {...rtcProps} />;
    } catch (error) {
      captureSentryException(error, { source: 'SafeNativeRtcView.render', label: _label });
      return <View style={this.props.style} />;
    }
  }
}

export function SafeNativeRtcView(props: Props): ReactNode {
  if (Platform.OS === 'web' || !RTCViewComponent) return null;
  if (!isValidNativeRtcStreamUrl(props.streamURL)) return null;
  return <SafeNativeRtcViewInner {...props} />;
}
