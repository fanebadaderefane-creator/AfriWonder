import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppMenuProvider } from '../contexts/AppMenuContext';
import Home from './Home';

let videosLoading = true;
let videosData = [];

const refetchMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const setQueryDataMock = vi.fn();

vi.mock('@/api/expressClient', () => ({
  api: {
    auth: {
      me: vi.fn().mockRejectedValue(new Error('not authenticated')),
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
    if (key === 'videos') {
      return { ...base, data: videosData, isLoading: videosLoading };
    }
    if (key === 'feed') {
      return { ...base, data: videosData, isLoading: videosLoading };
    }
    if (key === 'comments') {
      return { ...base, data: [] };
    }
    if (key === 'user-follows') {
      return { ...base, data: [] };
    }
    return { ...base, data: [] };
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
  useNetworkStatus: () => ({ isSlowConnection: false }),
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
  });

  it('affiche le loader pendant le chargement des vidéos', () => {
    render(
      <MemoryRouter>
        <AppMenuProvider>
          <Home />
        </AppMenuProvider>
      </MemoryRouter>
    );
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('affiche l’état vide et le CTA inscription quand aucune vidéo', () => {
    videosLoading = false;
    videosData = [];

    render(
      <MemoryRouter>
        <AppMenuProvider>
          <Home />
        </AppMenuProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/aucune vidéo pour l'instant/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /s'inscrire pour commencer/i })).toBeInTheDocument();
  });
});
