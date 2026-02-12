import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import NavigationTracker from './NavigationTracker';

vi.mock('./AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const { pagesConfigMock } = vi.hoisted(() => {
  const config = { Pages: { Home: {}, Discover: {} }, mainPage: 'Home' };
  return { pagesConfigMock: config };
});
vi.mock('@/pages.config', () => ({ pagesConfig: pagesConfigMock }));

describe('NavigationTracker', () => {
  it('renders nothing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <NavigationTracker />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not throw when pathname has segment', () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/discover']}>
          <NavigationTracker />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it('uses first Page key when mainPage is undefined', () => {
    const origMainPage = pagesConfigMock.mainPage;
    pagesConfigMock.mainPage = undefined;
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavigationTracker />
        </MemoryRouter>
      )
    ).not.toThrow();
    pagesConfigMock.mainPage = origMainPage;
  });

  it('handles pathname that matches no page (pageName null)', () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/UnknownPageX']}>
          <NavigationTracker />
        </MemoryRouter>
      )
    ).not.toThrow();
  });
});
