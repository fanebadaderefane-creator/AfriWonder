import React from 'react';

/**
 * Boundary React (hors React Router errorElement) — attrape les erreurs de rendu
 * dans l'arbre sous-jacent. Recommandation audits Complet + Senior v2.
 */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('AppErrorBoundary:', error, errorInfo);
    }
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold">Une erreur est survenue</h1>
          <p className="mb-6 max-w-sm text-center text-sm text-white/60">
            L&apos;application a rencontré un problème inattendu. Rechargez la page ou revenez à l&apos;accueil.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mb-6 max-w-sm overflow-auto rounded-lg bg-red-950/40 p-3 text-left text-xs text-red-300">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              Accueil
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 active:scale-95 transition-all"
            >
              Recharger
            </button>
          </div>
          <a
            href="mailto:support@afriwonder.com"
            className="mt-6 text-xs text-white/30 underline-offset-2 hover:text-white/60 hover:underline"
          >
            Contacter le support
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
