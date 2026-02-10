/**
 * Couverture architecture complète : chaque page (PAGES) doit se rendre sans crash.
 * Mocks génériques pour api, auth, react-query, router, composants lourds.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PAGES } from '../../pages.config';

vi.mock('@/api/expressClient', () => {
  const em = {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    filter: () => Promise.resolve([]),
    list: () => Promise.resolve([]),
    get: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
  };
  const api = {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
    auth: { me: vi.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }) },
    videos: { list: vi.fn().mockResolvedValue({ videos: [] }), getComments: vi.fn().mockResolvedValue({ comments: [] }) },
    users: { getFollowing: vi.fn().mockResolvedValue({ following: [] }), getProfile: vi.fn().mockResolvedValue({}) },
    saves: { list: vi.fn().mockResolvedValue({ videos: [] }) },
    payments: { getWallet: vi.fn().mockResolvedValue({ balance: 0 }) },
    entities: new Proxy({}, { get: () => em }),
  };
  return { __esModule: true, default: api, api };
});

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoadingAuth: false,
    authError: null,
    user: { id: '1', email: 'test@test.com', username: 'test' },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useInfiniteQuery: vi.fn().mockReturnValue({
    data: { pages: [[]], pageParams: [] },
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
  }),
  useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isLoading: false }),
  useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ id: '1', token: 'test', videoId: '1', eventId: '1', campaignId: '1', petitionId: '1', jobId: '1', courseId: '1', productId: '1', serviceId: '1', communityId: '1', orderId: '1', bookingId: '1' }),
    useSearchParams: vi.fn().mockReturnValue([new URLSearchParams(), vi.fn()]),
  };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Popup: () => null,
  useMap: () => ({}),
}));

vi.mock('@/components/navigation/BottomNav', () => ({ default: () => <div data-testid="bottom-nav">Nav</div> }));
vi.mock('@/components/navigation/TopHeader', () => ({ default: () => <div data-testid="top-header">Header</div> }));
vi.mock('@/components/navigation/MenuPlus', () => ({ default: () => <div>MenuPlus</div> }));
vi.mock('@/components/common/PerformanceOptimizer', () => ({ useNetworkStatus: () => ({ isSlowConnection: false }), getCacheStrategy: () => ({}), scheduleTask: async (cb) => cb && (await cb()) }));
vi.mock('@/components/profile/ProfileHeader', () => ({ default: () => <div>ProfileHeader</div> }));
vi.mock('@/components/profile/StatsModal', () => ({ default: () => null }));
vi.mock('@/components/profile/FollowersModal', () => ({ default: () => null }));
vi.mock('@/components/video/FeaturedVideoSelector', () => ({ default: () => null }));
vi.mock('@/components/creator/SubscriptionTiers', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/common/useTranslation', () => ({ useTranslation: () => ({ t: (k) => k, language: 'fr', setLanguage: () => {} }) }));
vi.mock('@/components/common/TranslationProvider', () => ({ default: ({ children }) => children }));

// Pages qui nécessitent des données spécifiques ou des deps lourdes en unit test (couverts par E2E full-architecture-routes.spec.ts)
const SKIP_SMOKE_PAGES = new Set([
  'CommunityDetails', 'CourseDetails', 'CreatorTools', 'Language', 'LiveView',
  'OrderTracking', 'Referrals', 'SellerWallet', 'RideHistory', 'Offline', 'Analytics',
  'Services', 'Providers', 'BecomeProvider', 'Settings', 'VideoView', 'Wishlist',
  'Transport', 'FoodDelivery', 'Utilities', 'Telemedicine', 'RealEstate', 'Insurance', 'Ticketing',
]);

describe('Architecture complète - Smoke render de toutes les pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  Object.entries(PAGES).forEach(([pageName, PageComponent]) => {
    const skip = SKIP_SMOKE_PAGES.has(pageName);
    (skip ? it.skip : it)(`${pageName} rend sans crash`, () => {
      expect(PageComponent).toBeDefined();
      const { container } = render(
        <MemoryRouter>
          <PageComponent />
        </MemoryRouter>
      );
      expect(container).toBeTruthy();
    });
  });
});
