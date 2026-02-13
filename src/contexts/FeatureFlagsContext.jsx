import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/expressClient';
import { DEFAULT_FEATURE_FLAGS } from '@/config/featureFlags';

const FeatureFlagsContext = createContext({
  flags: DEFAULT_FEATURE_FLAGS,
  isLoading: true,
  isEnabled: () => false,
});

export function FeatureFlagsProvider({ children }) {
  const { data = {}, isLoading } = useQuery({
    queryKey: ['platform-feature-flags'],
    queryFn: async () => {
      try {
        const flags = await api.platform.getFeatureFlags();
        return flags && typeof flags === 'object' ? flags : DEFAULT_FEATURE_FLAGS;
      } catch {
        return DEFAULT_FEATURE_FLAGS;
      }
    },
    staleTime: 60_000,
    placeholderData: DEFAULT_FEATURE_FLAGS,
  });

  const flags = { ...DEFAULT_FEATURE_FLAGS, ...data };
  const isEnabled = (key) => !!flags[key];

  return (
    <FeatureFlagsContext.Provider value={{ flags, isLoading, isEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    return { flags: DEFAULT_FEATURE_FLAGS, isLoading: false, isEnabled: () => false };
  }
  return ctx;
}
