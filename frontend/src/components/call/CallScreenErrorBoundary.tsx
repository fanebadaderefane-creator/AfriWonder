import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { captureSentryException } from '../../lib/sentryMobile';

import { logAfwCall } from '../../call/callDiagnosticLog';

import { requestAgoraDmCallHangup } from '../../call/agoraDmCallHangupRegistry';

import { forceAgoraDmCallHangup } from '../../call/agoraDmForceHangup';

import { stopEveryCallRingAlert } from '../../call/callRingStop';

import {

  shouldSuppressCallInterruptedUi,

  peekCallMediaAliveSnapshot,

} from '../../call/callMediaAliveRegistry';

import {

  logCallUiState,

  logWhyCallInterrupted,

  snapshotFromMediaAlive,

} from '../../call/callUiInterruptLog';

import { safeRouterBack } from '../../utils/safeRouter';

import { markCallScreenRecovering } from '../../call/callErrorRecoveryGate';

import { Colors } from '../../theme/colors';



type Props = { children: ReactNode };



type State = { hasError: boolean; leaving: boolean; recovering: boolean };



/**

 * Si l’écran d’appel plante (RTCView, rendu), l’app reste ouverte avec sortie propre.

 * Tant que le média est encore actif (WebRTC connecté / canal Agora), on tente de

 * réafficher l’écran d’appel au lieu de « Appel interrompu ».

 */

export class CallScreenErrorBoundary extends Component<Props, State> {

  state: State = { hasError: false, leaving: false, recovering: false };



  private recoverTimer: ReturnType<typeof setTimeout> | null = null;



  static getDerivedStateFromError(): Partial<State> {
    if (shouldSuppressCallInterruptedUi()) {
      markCallScreenRecovering(true);
      return { hasError: true, recovering: true };
    }
    return { hasError: true };
  }



  componentDidCatch(error: Error, info: ErrorInfo): void {

    const mediaAlive = shouldSuppressCallInterruptedUi();

    const aliveSnap = peekCallMediaAliveSnapshot();

    logCallUiState({
      ...snapshotFromMediaAlive(aliveSnap),
      phase: 'error_boundary_catch',
    });

    logWhyCallInterrupted({

      reason: mediaAlive ? 'error_boundary_media_alive' : 'error_boundary_fatal',

      error,

      componentStack: info.componentStack,

      fileHint: 'CallScreenErrorBoundary',

    });



    if (mediaAlive) {

      markCallScreenRecovering(true);

      logAfwCall('error_boundary_recover_scheduled', {

        callId: aliveSnap.callId ?? null,

        engine: aliveSnap.engine ?? null,

      });

      if (!this.recoverTimer) {

        this.setState({ recovering: true });

        this.recoverTimer = setTimeout(() => {

          this.recoverTimer = null;

          markCallScreenRecovering(false);

          this.setState({ hasError: false, recovering: false });

        }, 0);

      }

      return;

    }



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



  componentWillUnmount(): void {

    markCallScreenRecovering(false);

    if (this.recoverTimer) {

      clearTimeout(this.recoverTimer);

      this.recoverTimer = null;

    }

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

      } catch {

        await forceAgoraDmCallHangup('error_boundary_catch');

      } finally {

        await stopEveryCallRingAlert();

        try {

          safeRouterBack('/messages');

        } catch {

          /* ignore */

        }

        this.setState({ hasError: false, leaving: false, recovering: false });

      }

    })();

  };



  render(): ReactNode {

    if (this.state.hasError) {

      if (shouldSuppressCallInterruptedUi() || this.state.recovering) {

        return this.props.children;

      }

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


