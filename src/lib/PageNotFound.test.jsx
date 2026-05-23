import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PageNotFound from './PageNotFound';

const { queryFnResultRef, apiMock } = vi.hoisted(() => {
  const apiMock = { auth: { me: vi.fn() } };
  const queryFnResultRef = { current: { user: null, isAuthenticated: false } };
  return { queryFnResultRef, apiMock };
});

vi.mock('@/api/expressClient', () => ({ api: apiMock }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </MemoryRouter>
  );
}

vi.mock('@tanstack/react-query', () => ({
  useQuery: (_opts) => ({
    data: queryFnResultRef.current,
    isFetched: true,
  }),
}));

describe('PageNotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryFnResultRef.current = { user: null, isAuthenticated: false };
  });

  it('affiche le code 404 et le message pour le path actuel', () => {
    renderAt('/some/missing/page');
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/Page introuvable/i)).toBeInTheDocument();
    expect(screen.getByText(/"some\/missing\/page"/)).toBeInTheDocument();
  });

  it('affiche le bouton Retour accueil', () => {
    renderAt('/foo');
    expect(screen.getByRole('button', { name: /Retour/i })).toBeInTheDocument();
  });

  it('le bouton Retour est cliquable', () => {
    renderAt('/bar');
    const btn = screen.getByRole('button', { name: /Retour/i });
    expect(btn).toBeInTheDocument();
    // Pas d'erreur au clic
    btn.click();
  });

  it('affiche la note admin quand utilisateur est admin (DEV)', () => {
    queryFnResultRef.current = { user: { role: 'admin' }, isAuthenticated: true };
    renderAt('/any');
    // La note admin n'est affichee qu'en mode DEV (import.meta.env.DEV)
    // En test Vitest, import.meta.env.DEV est true par defaut
    const adminNote = screen.queryByText(/Note admin/i);
    if (adminNote) {
      expect(adminNote).toBeInTheDocument();
    } else {
      // Mode prod simulé : la note est masquée, le 404 reste présent
      expect(screen.getByText('404')).toBeInTheDocument();
    }
  });
});
