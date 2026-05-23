/**
 * Smoke render pages 4/4 (Services -> DeveloperGuide) pour limiter la mémoire par worker.
 */
import React from 'react';
import { describe, vi, beforeEach } from 'vitest';
import { PAGES } from '../../pages.config';
import { runSmokeTestsForEntries } from './all-pages-smoke-runner';

vi.mock('@/api/expressClient', () => {
  const em = { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null), filter: () => Promise.resolve([]), list: () => Promise.resolve([]), get: () => Promise.resolve(null), create: () => Promise.resolve({}), update: () => Promise.resolve({}) };
  const api = {
    get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn().mockResolvedValue({ data: {} }), put: vi.fn().mockResolvedValue({ data: {} }), patch: vi.fn().mockResolvedValue({ data: {} }), delete: vi.fn().mockResolvedValue({}),
    auth: { me: vi.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }) },
    videos: { list: vi.fn().mockResolvedValue({ videos: [] }), getComments: vi.fn().mockResolvedValue({ comments: [] }), getById: vi.fn().mockResolvedValue({ id: '1', video_likes: [], video_saves: [] }) },
    users: { getFollowing: vi.fn().mockResolvedValue({ following: [] }), getProfile: vi.fn().mockResolvedValue({}), getLikedVideos: vi.fn().mockResolvedValue({ videos: [] }) },
    saves: { list: vi.fn().mockResolvedValue({ videos: [] }) },
    payments: { getWallet: vi.fn().mockResolvedValue({ balance: 0 }) },
    orders: { getById: vi.fn().mockResolvedValue({ id: '1', status: 'pending', items: [], shipping: {} }) },
    refunds: { listMy: vi.fn().mockResolvedValue({ refunds: [] }) },
    providers: { list: vi.fn().mockResolvedValue({ providers: [] }) },
    support: { listTickets: vi.fn().mockResolvedValue({ tickets: [] }), getTicket: vi.fn().mockResolvedValue(null), createTicket: vi.fn().mockResolvedValue({}), addMessage: vi.fn().mockResolvedValue({}) },
    transport: { drivers: { listNearby: vi.fn().mockResolvedValue({ drivers: [] }), updateProfile: vi.fn().mockResolvedValue({}) }, rides: { list: vi.fn().mockResolvedValue({ rides: [] }) } },
    food: { restaurants: { list: vi.fn().mockResolvedValue({ restaurants: [] }), getById: vi.fn().mockResolvedValue(null) }, menuItems: { listByRestaurant: vi.fn().mockResolvedValue([]) } },
    tickets: { getMyTickets: vi.fn().mockResolvedValue([]), getById: vi.fn().mockResolvedValue(null) },
    utilities: { airtime: { listMy: vi.fn().mockResolvedValue({ recharges: [] }) }, bills: { listMy: vi.fn().mockResolvedValue({ payments: [] }) } },
    health: { doctors: { list: vi.fn().mockResolvedValue({ doctors: [] }) } },
    properties: { list: vi.fn().mockResolvedValue({ properties: [] }) },
    insurance: { policies: { listMy: vi.fn().mockResolvedValue([]) } },
    entities: new Proxy({}, { get: () => em }),
  };
  return { __esModule: true, default: api, api };
});
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, isLoadingAuth: false, authError: null, user: { id: '1', email: 'test@test.com', username: 'test' }, login: vi.fn(), register: vi.fn(), logout: vi.fn() }) }));

const { mockRefetch, getSafeQueryData } = vi.hoisted(() => {
  const mockRefetch = vi.fn();
  function getSafeQueryData(queryKey) {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (key === 'videosAnalytics' || key === 'followersAnalytics') return { totalViews: 0, totalLikes: 0, totalComments: 0, totalFollowers: 0, avgViewsPerVideo: 0, engagementRate: 0 };
    if (key === 'course' || key === 'community') return { modules: [], lessons: [], title: '', id: '1' };
    if (key === 'creatorAnalytics' || key === 'analytics') return { total_views: 0, total_likes: 0, total_followers: 0 };
    if (key === 'creatorDashboard') return { stats: { total_views: 0, total_engagement: 0, total_videos: 0, avg_watch_time: 0, avg_engagement_rate: '0', total_revenue: 0 }, topVideos: [], trendData: [] };
    if (['languages', 'language', 'referrals', 'wishlist', 'saves', 'comments'].includes(key) || (typeof key === 'string' && key.includes('service'))) return [];
    if (['wallet', 'sellerWallet', 'seller-wallet'].includes(key)) return { balance: 0, pending_balance: 0, total_earned: 0, total_withdrawn: 0 };
    if (['order', 'orderTracking'].includes(key)) return { id: '1', status: 'pending' };
    if (key === 'transport') return { drivers: [] };
    if (key === 'foodDelivery') return { restaurants: [] };
    if (key === 'utilities') return { airtime: [] };
    if (key === 'telemedicine') return { doctors: [] };
    if (key === 'realEstate') return { list: [] };
    if (key === 'insurance') return { policies: [] };
    if (key === 'providers') return { providers: [] };
    if (key === 'video') return { id: '1', video_likes: [], video_saves: [] };
    if (key === 'ads-campaigns') return { campaigns: [], pagination: { page: 1, totalPages: 1, total: 0 } };
    return [];
  }
  return { mockRefetch, getSafeQueryData };
});
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn().mockImplementation((opts) => ({ data: getSafeQueryData(opts?.queryKey), isLoading: false, isError: false, refetch: mockRefetch })), useInfiniteQuery: vi.fn().mockReturnValue({ data: { pages: [[]], pageParams: [] }, isLoading: false, fetchNextPage: vi.fn(), hasNextPage: false }), useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isLoading: false }), useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }) }));
vi.mock('react-router-dom', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, useParams: vi.fn().mockReturnValue({ id: '1', token: 'test', videoId: '1', eventId: '1', campaignId: '1', petitionId: '1', jobId: '1', courseId: '1', productId: '1', serviceId: '1', communityId: '1', orderId: '1', bookingId: '1' }), useSearchParams: vi.fn().mockReturnValue([new URLSearchParams(), vi.fn()]) }; });
vi.mock('react-leaflet', () => ({ MapContainer: ({ children }) => <div data-testid="map">{children}</div>, TileLayer: () => null, Marker: () => null, Popup: () => null, useMap: () => ({}) }));
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
vi.mock('@/components/common/TranslationProvider', () => ({ default: ({ children }) => children, useTranslation: () => ({ t: (k) => k, language: 'fr', setLanguage: () => {} }) }));
vi.mock('@/services/offlineCache.service.js', () => ({ default: { isCacheSupported: () => false, getCachedVideos: () => Promise.resolve([]), downloadMedia: () => Promise.resolve({ success: false }), listCachedDownloads: () => Promise.resolve([]), getTotalUsedBytes: () => Promise.resolve(0), getQuota: () => Promise.resolve({ quota: null, usage: null }), removeMedia: () => Promise.resolve() } }));
vi.mock('react-player', () => ({ default: () => null }));
vi.mock('react-player/lazy', () => ({ default: () => null }));
vi.mock('@/hooks/useAgora', () => ({
  useAgoraHost: () => ({ localVideoTrack: null, localAudioTrack: null, error: null, leave: vi.fn() }),
  useAgoraAudience: () => ({ remoteVideoRef: { current: null }, join: vi.fn(), leave: vi.fn() }),
  useAgoraGroupCall: () => ({
    error: null,
    leave: vi.fn(async () => {}),
    remoteUsers: [],
    micOn: true,
    camOn: true,
    toggleMic: vi.fn(),
    toggleCam: vi.fn(),
    hasCameraTrack: false,
  }),
}));

const entries = Object.entries(PAGES);
const SLICE = entries.slice(96, 125);

describe('Smoke render pages (partie 4/4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype) HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });
  runSmokeTestsForEntries(SLICE);
});
