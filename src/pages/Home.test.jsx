import React from 'react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppMenuProvider } from '../contexts/AppMenuContext';
import Home from './Home';

let videosLoading = true;
let videosData = [];

const refetchMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const setQueryDataMock = vi.fn();
const originalPause = window.HTMLMediaElement.prototype.pause;

vi.mock('@/api/expressClient', () => ({
  api: {
    auth: {
      me: vi.fn().mockRejectedValue(new Error('not authenticated')),
    },
    me: {
      getSuggestedFollows: vi.fn().mockResolvedValue([]),
      getFeedVideoStates: vi.fn().mockResolvedValue({ likedIds: [], savedIds: [] }),
    },
    videos: {
      list: vi.fn().mockResolvedValue({ videos: [] }),
      getComments: vi.fn().mockResolvedValue({ comments: [] }),
      like: vi.fn().mockResolvedValue({ liked: true }),
      comment: vi.fn().mockResolvedValue({}),
      share: vi.fn().mockResolvedValue({}),
    },
    users: {
      getFollowing: vi.fn().mockResolvedValue({ following: [] }),
      getLikedVideos: vi.fn().mockResolvedValue([]),
      toggleFollow: vi.fn().mockResolvedValue({}),
    },
    saves: {
      list: vi.fn().mockResolvedValue({ videos: [] }),
      toggle: vi.fn().mockResolvedValue({}),
    },
    payments: {
      addToWallet: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockImplementation(({ queryKey }) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    const base = { refetch: refetchMock };
    if (key === 'videos') return { ...base, data: videosData, isLoading: videosLoading };
    if (key === 'comments') return { ...base, data: [] };
    if (key === 'user-follows') return { ...base, data: [] };
    return { ...base, data: [] };
  }),
  useInfiniteQuery: vi.fn().mockImplementation(({ queryKey }) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    const base = { refetch: refetchMock, fetchNextPage: vi.fn(), hasNextPage: false };
    if (key === 'feed') {
      return { ...base, data: { pages: [videosData] }, isLoading: videosLoading };
    }
    return { ...base, data: { pages: [[]] }, isLoading: false };
  }),
  useMutation: () => ({
    mutate: vi.fn(),
  }),
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
    setQueryData: setQueryDataMock,
  }),
}));

vi.mock('../components/common/PerformanceOptimizer', () => ({
  useNetworkStatus: () => ({ isOnline: true, isSlowConnection: false }),
  getCacheStrategy: () => ({}),
  scheduleTask: async (cb) => cb(),
}));

vi.mock('../components/video/VideoCard', () => ({
  default: () => <div>VideoCard</div>,
}));
vi.mock('../components/video/CommentSheet', () => ({
  default: () => <div>CommentSheet</div>,
}));
vi.mock('../components/video/TipModal', () => ({
  default: () => <div>TipModal</div>,
}));
vi.mock('../components/video/ShareSheet', () => ({
  default: () => <div>ShareSheet</div>,
}));
vi.mock('../components/live/GiftPurchaseModal', () => ({
  default: () => <div>GiftPurchaseModal</div>,
}));
vi.mock('../components/navigation/TopHeader', () => ({
  default: () => <div>TopHeader</div>,
}));
vi.mock('../components/navigation/BottomNav', () => ({
  default: () => <div>BottomNav</div>,
}));
vi.mock('../components/navigation/MenuPlus', () => ({
  default: () => <div>MenuPlus</div>,
}));
vi.mock('../components/common/AfriWonderLogo', () => ({
  default: () => <div>Logo</div>,
}));
vi.mock('../components/notifications/NotificationService', () => ({
  default: {
    notifyVideoLike: vi.fn(),
    notifyVideoComment: vi.fn(),
    extractMentions: vi.fn().mockReturnValue([]),
    getUserIdsFromMentions: vi.fn().mockResolvedValue([]),
    notifyTipReceived: vi.fn(),
    notifyNewFollower: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Home page', () => {
  beforeEach(() => {
    videosLoading = true;
    videosData = [];
    vi.clearAllMocks();
    window.sessionStorage.clear();
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterAll(() => {
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      writable: true,
      value: originalPause,
    });
  });

  it('affiche le rideau de chargement pendant le chargement du feed', () => {
    render(
      <MemoryRouter>
        <AppMenuProvider>
          <Home />
        </AppMenuProvider>
      </MemoryRouter>
    );
    // Plus de spinner `.animate-spin` : splash plein écran (BrandedLaunchSplash / FeedStartupCurtain).
    expect(screen.getByLabelText('Chargement AfriWonder')).toBeInTheDocument();
  });

  it('affiche l’état vide et le CTA inscription quand aucune vidéo', async () => {
    videosLoading = false;
    videosData = [];

    render(
      <MemoryRouter>
        <AppMenuProvider>
          <Home />
        </AppMenuProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/aucune video pour l'instant/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /s'inscrire pour commencer/i })).toBeInTheDocument();
  });
});
