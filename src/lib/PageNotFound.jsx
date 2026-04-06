import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/api/expressClient';
import { useQuery } from '@tanstack/react-query';

export default function PageNotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = location.pathname.substring(1) || '…';

  const { data: authData, isFetched } = useQuery({
    queryKey: ['auth-me-404'],
    queryFn: async () => {
      try {
        const user = await api.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Code 404 */}
        <div className="space-y-2">
          <p className="text-7xl font-light text-slate-600">404</p>
          <div className="h-px w-16 bg-slate-700 mx-auto" />
        </div>

        {/* Message principal */}
        <div className="space-y-3">
          <h1 className="text-2xl font-medium text-white">
            Page introuvable
          </h1>
          <p className="text-slate-400 leading-relaxed">
            La page{' '}
            <span className="font-medium text-slate-300">"{pageName}"</span>{' '}
            n&apos;existe pas dans cette application.
          </p>
        </div>

        {/* Note admin (DEV + admin uniquement) */}
        {isFetched && authData?.isAuthenticated && authData?.user?.role === 'admin' && import.meta.env.DEV && (
          <div className="p-4 bg-orange-950/40 rounded-lg border border-orange-800/40 text-left">
            <p className="text-sm font-medium text-orange-300 mb-1">Note admin</p>
            <p className="text-sm text-orange-200/70 leading-relaxed">
              Cette page n&apos;a peut-être pas encore été implémentée. Vérifiez la configuration des routes dans <code className="text-orange-300">src/App.jsx</code>.
            </p>
          </div>
        )}

        {/* Action */}
        <div className="pt-4">
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    </div>
  );
}
