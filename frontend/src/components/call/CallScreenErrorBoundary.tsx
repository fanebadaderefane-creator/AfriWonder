import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureSentryException } from '../../lib/sentryMobile';
import { logAfwCall } from '../../call/callDiagnosticLog';
import { requestAgoraDmCallHangup } from '../../call/agoraDmCallHangupRegistry';
import { forceAgoraDmCallHangup } from '../../call/agoraDmForceHangup';
import { stopEveryCallRingAlert } from '../../call/callRingStop';
import { safeRouterBack } from '../../utils/safeRouter';
import { Colors } from '../../theme/colors';

type Props = { children: ReactNode };

type State = { hasError: boolean; leaving: boolean };

/**
 * Si l’écran d’appel plante (RTCView, rendu), l’app reste ouverte avec sortie propre.
 */
export class CallScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, leaving: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[VIDEO_SCREEN_CRASH]', error?.message ?? String(error));
    logAfwCall('video_screen_crash', {
      message: error?.message ?? String(error),
      stack: String(error?.stack ?? '').slice(0, 500),
    });
    captureSentryException(error, {
      source: 'CallScreenErrorBoundary',
      componentStack: String(info.componentStack || '').slice(0, 2000),
    });
  }

  private leaveCall = (): void => {
    if (this.state.leaving) return;
    this.setState({ leaving: true });
    void (async () => {
      try {
        const hungUp = await requestAgoraDmCallHangup();
        if (!hungUp) {
          await forceAgoraDmCallHangup('error_boundary');
        }
      } finally {
        await stopEveryCallRingAlert();
        this.setState({ hasError: false, leaving: false });
        try {
          safeRouterBack('/messages');
        } catch {
          /* ignore */
        }
      }
    })();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Ionicons name="call-outline" size={48} color="#FFF" />
          <Text style={styles.title}>Appel interrompu</Text>
          <Text style={styles.body}>
            Une erreur technique a arrêté l’appel. Réessayez dans un instant.
          </Text>
          <TouchableOpacity
            style={[styles.btn, this.state.leaving ? styles.btnDisabled : null]}
            onPress={this.leaveCall}
            disabled={this.state.leaving}
            accessibilityLabel="Retour"
          >
            {this.state.leaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Retour aux messages</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#0b111d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 16 },
  body: { color: 'rgba(255,255,255,0.75)', fontSize: 15, textAlign: 'center', marginTop: 10 },
  btn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 220,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
