import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureSentryException } from '../../lib/sentryMobile';
import { goBackOrFallback } from '../../utils/goBack';
import { Colors } from '../../theme/colors';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Menu+ : erreur de rendu → retour accueil sans fermer AfriWonder. */
export class MenuPlusErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureSentryException(error, {
      source: 'MenuPlusErrorBoundary',
      componentStack: String(info.componentStack || '').slice(0, 2000),
    });
  }

  private goBack = (): void => {
    this.setState({ hasError: false });
    goBackOrFallback('/(tabs)');
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Ionicons name="grid-outline" size={44} color={Colors.primary} />
          <Text style={styles.title}>Menu indisponible</Text>
          <Text style={styles.body}>
            Une erreur est survenue. L’application reste ouverte — revenez à l’accueil.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.goBack} accessibilityLabel="Retour">
            <Text style={styles.btnText}>Retour</Text>
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
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 16 },
  body: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center', marginTop: 10 },
  btn: {
    marginTop: 22,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
