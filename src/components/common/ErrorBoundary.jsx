import { Component } from 'react';

/**
 * Error boundary global : évite écran blanc, permet réessai sans rechargement complet.
 * Production-ready : l'app reste utilisable après une erreur transitoire.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
          <h1 className="text-xl font-semibold mb-2">Oups, quelque chose s&apos;est mal passé.</h1>
          <p className="text-slate-600 text-center mb-6 max-w-md">
            Rafraîchir la page ou réessayer. Si le problème persiste, contactez le support.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
