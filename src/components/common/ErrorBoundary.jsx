import { Component } from 'react';

/**
 * Error boundary global : affiche une UI de repli en cas d'erreur React non gérée.
 * Production-ready : évite écran blanc et permet rechargement.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
          <h1 className="text-xl font-semibold mb-2">Une erreur est survenue</h1>
          <p className="text-slate-600 text-center mb-6 max-w-md">
            Rechargez la page pour réessayer. Si le problème persiste, contactez le support.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
