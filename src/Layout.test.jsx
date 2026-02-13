import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from './Layout';

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => <div data-testid="sonner-toaster" />,
}));

vi.mock('@/components/common/TranslationProvider', () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock('@/contexts/MarketplaceCurrencyContext', () => ({
  MarketplaceCurrencyProvider: ({ children }) => <>{children}</>,
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', email: 'test@test.com' } }),
}));

vi.mock('@/components/navigation/MenuPlus', () => ({
  default: () => null,
}));

vi.mock('@/components/navigation/GlobalMenuButton', () => ({
  default: () => null,
}));

vi.mock('@/components/common/OfflineIndicator', () => ({
  default: () => <div data-testid="offline-indicator" />,
}));

describe('Layout', () => {
  beforeEach(() => {
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
  });

  it('rend les enfants et les composants globaux', () => {
    render(
      <Layout currentPageName="Home">
        <div>Page Content</div>
      </Layout>
    );

    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
    expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('applique padding quand currentPageName n\'est pas fullScreen', () => {
    const { container } = render(
      <Layout currentPageName="About">
        <div>About Content</div>
      </Layout>
    );
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main?.className).not.toMatch(/pt-0|pb-0/);
  });

  it('applique et nettoie les styles de protection du scroll', () => {
    const { unmount } = render(
      <Layout currentPageName="Create">
        <div>Another Content</div>
      </Layout>
    );

    expect(document.body.style.overscrollBehavior).toBe('none');
    expect(document.documentElement.style.overscrollBehavior).toBe('none');

    unmount();

    expect(document.body.style.overscrollBehavior).toBe('');
    expect(document.documentElement.style.overscrollBehavior).toBe('');
  });

  it('touchstart au top enregistre data-start-y', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const touch = { clientY: 100 };
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], bubbles: true }));
    expect(document.body.getAttribute('data-start-y')).toBe('100');
  });

  it('touchmove au top avec currentY > startY appelle preventDefault', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    document.body.setAttribute('data-start-y', '50');
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const e = new TouchEvent('touchmove', {
      touches: [{ clientY: 80 }],
      bubbles: true,
      cancelable: true,
    });
    const spy = vi.spyOn(e, 'preventDefault');
    document.body.dispatchEvent(e);
    expect(spy).toHaveBeenCalled();
  });

  it('wheel overscroll top appelle preventDefault', () => {
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const el = document.createElement('div');
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, configurable: true });
    const e = new WheelEvent('wheel', { deltaY: -10, bubbles: true, cancelable: true });
    const spy = vi.spyOn(e, 'preventDefault');
    el.dispatchEvent(e);
    expect(spy).toHaveBeenCalled();
    el.remove();
  });

  it('wheel overscroll bottom appelle preventDefault', () => {
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const el = document.createElement('div');
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollTop', { value: 100, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 100, configurable: true });
    const e = new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true });
    const spy = vi.spyOn(e, 'preventDefault');
    el.dispatchEvent(e);
    expect(spy).toHaveBeenCalled();
    el.remove();
  });

  it('scroll container interne ne bloque pas wheel', () => {
    const scrollDiv = document.createElement('div');
    scrollDiv.classList.add('overflow-y-scroll');
    scrollDiv.scrollTop = 0;
    document.body.appendChild(scrollDiv);
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const e = new WheelEvent('wheel', { deltaY: -10, bubbles: true, cancelable: true });
    const spy = vi.spyOn(e, 'preventDefault');
    scrollDiv.dispatchEvent(e);
    expect(spy).not.toHaveBeenCalled();
    scrollDiv.remove();
  });

  it('touchmove sur conteneur de scroll interne ne appelle pas preventDefault', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    document.body.setAttribute('data-start-y', '50');
    const scrollDiv = document.createElement('div');
    scrollDiv.classList.add('overflow-y-scroll');
    document.body.appendChild(scrollDiv);
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const e = new TouchEvent('touchmove', {
      touches: [{ clientY: 80 }],
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(e, 'target', { value: scrollDiv, configurable: true });
    const spy = vi.spyOn(e, 'preventDefault');
    scrollDiv.dispatchEvent(e);
    expect(spy).not.toHaveBeenCalled();
    scrollDiv.remove();
  });

  it('wheel uses window.innerHeight when target.clientHeight is 0', () => {
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const el = document.createElement('div');
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollTop', { value: 0, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 0, configurable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 100, configurable: true });
    const e = new WheelEvent('wheel', { deltaY: -10, bubbles: true, cancelable: true });
    const spy = vi.spyOn(e, 'preventDefault');
    el.dispatchEvent(e);
    expect(spy).toHaveBeenCalled();
    el.remove();
  });

  it('wheel uses target.clientHeight when present for overscroll bottom', () => {
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const el = document.createElement('div');
    document.body.appendChild(el);
    Object.defineProperty(el, 'scrollTop', { value: 40, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 60, configurable: true });
    const e = new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true });
    const spy = vi.spyOn(e, 'preventDefault');
    el.dispatchEvent(e);
    expect(spy).toHaveBeenCalled();
    el.remove();
  });

  it('touchmove sans data-start-y utilise 0 comme startY', () => {
    document.body.removeAttribute('data-start-y');
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    render(<Layout currentPageName="About"><div>Content</div></Layout>);
    const e = new TouchEvent('touchmove', {
      touches: [{ clientY: 80 }],
      bubbles: true,
      cancelable: true,
    });
    const spy = vi.spyOn(e, 'preventDefault');
    document.body.dispatchEvent(e);
    expect(spy).toHaveBeenCalled();
  });
});
