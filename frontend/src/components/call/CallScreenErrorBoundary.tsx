import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureSentryException } from '../../lib/sentryMobile';
import { safeRouterBack } from '../../utils/safeRouter';
import { Colors } from '../../theme/colors';

type Props = { children: ReactNode };

type State = { hasError: boolean };

/**
 * Si l’écran d’appel plante (RTCView, rendu), l’app reste ouverte avec sortie propre.
 */
export class CallScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureSentryException(error, {
      source: 'CallScreenErrorBoundary',
      componentStack: String(info.componentStack || '').slice(0, 2000),
    });
  }

  private leaveCall = (): void => {
    this.setState({ hasError: false });
    try {
      safeRouterBack('/messages');
    } catch {
      /* ignore */
    }
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
          <TouchableOpacity style={styles.btn} onPress={this.leaveCall} accessibilityLabel="Retour">
            <Text style={styles.btnText}>Retour aux messages</Text>
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
  },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
