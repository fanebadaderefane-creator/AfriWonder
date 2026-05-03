import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { RouteErrorFallback } from './RouteErrorFallback';
import { captureSentryException } from '../../lib/sentryMobile';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Barrière au-dessus du graphe principal (providers + stack) : les erreurs de rendu React
 * ne font pas sortir l’utilisateur sur l’écran d’accueil OS ; écran de récupération + rapport Sentry.
 */
export class AppRootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const stack = info.componentStack ? String(info.componentStack).slice(0, 2000) : '';
    captureSentryException(error, { componentStack: stack, source: 'AppRootErrorBoundary' });
  }

  retry = async (): Promise<void> => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return <RouteErrorFallback error={this.state.error} retry={this.retry} />;
    }
    return this.props.children;
  }
}
