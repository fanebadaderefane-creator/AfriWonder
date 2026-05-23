import { queryClientInstance, queryPersister } from '@/lib/query-client.js';

export const queryClient = queryClientInstance;
export { queryPersister };

/**
 * Précharge un petit lot offline du feed si la query existe déjà dans le projet.
 * Cette fonction reste "best effort" pour éviter d'introduire des dépendances
 * fortes à des clés de cache qui peuvent évoluer.
 */
export async function prefetchFeedForOffline(queryKey = ['feed']) {
  try {
    await queryClient.prefetchQuery({
      queryKey,
      staleTime: 5 * 60 * 1000,
      gcTime: 48 * 60 * 60 * 1000,
      networkMode: 'offlineFirst',
      queryFn: async () => {
        // La plupart des écrans feed utilisent ensuite leur propre fetcher/queryFn.
        // Ici on évite tout couplage direct : retourne le cache existant si présent.
        return queryClient.getQueryData(queryKey) ?? null;
      },
    });
  } catch {
    // Hors ligne ou clé inconnue: ignorer silencieusement.
  }
}
