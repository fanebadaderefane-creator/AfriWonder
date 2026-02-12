import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('@/api/expressClient', () => ({
  api: {
    auth: {
      me: vi.fn().mockRejectedValue(new Error('unauthorized')),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    },
  },
}));

vi.mock('axios', () => ({ default: { post: vi.fn().mockRejectedValue(new Error('refresh failed')) } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

function Consumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoadingAuth)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user">{auth.user ? auth.user.id : 'null'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders children and provides auth state', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
  });

});
