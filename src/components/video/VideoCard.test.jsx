/* cspell:disable-file */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VideoCard from './VideoCard';

// --- Mocks ---

vi.mock('hls.js', () => {
  const Hls = vi.fn(() => ({
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }));
  Hls.isSupported = vi.fn().mockReturnValue(false); // force MP4 path in tests
  Hls.Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError', MEDIA_ATTACHED: 'hlsMediaAttached' };
  return { default: Hls };
});

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    motion: new Proxy({}, {
      get: (_, tag) => {
        const Tag = tag;
        return ({ children, ...props }) => {
          const { animate, initial, exit, transition, whileTap, whileHover, ...rest } = props;
          return React.createElement(Tag, rest, children);
        };
      }
    }),
    AnimatePresence: ({ children }) => children,
  };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/common/useTranslation', () => ({
  useTranslation: () => ({ t: (k) => k, language: 'fr', setLanguage: vi.fn() }),
}));

vi.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: () => ({ isMuted: false, setMuted: vi.fn(), dataSaverMode: false }),
}));


vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getVideoPlaybackUrl: (u) => u || '',
    isValidThumbnailUrl: () => true,
    getAbsoluteImageUrl: (u) => u || '',
  };
});

vi.mock('@/api/expressClient', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: {
      videos: { view: vi.fn(), like: vi.fn(), save: vi.fn(), deleteReaction: vi.fn() },
      users: { follow: vi.fn(), unfollow: vi.fn() },
    },
  };
});

vi.mock('@/components/common/PerformanceOptimizer', () => ({
  useNetworkStatus: () => ({ isOnline: true, isSlowConnection: false }),
  getCacheStrategy: () => ({}),
}));

vi.mock('../notifications/NotificationService', () => ({
  default: { notifyVideoLike: vi.fn() },
}));

// --- Test helpers ---

const baseVideo = {
  id: 'vid-1',
  title: 'Test video',
  description: 'A test video #tag',
  video_url: 'https://cdn.test/video.mp4',
  playback_url: 'https://cdn.test/video.mp4',
  hls_playback_url: null,
  thumbnail_url: 'https://cdn.test/thumb.jpg',
  creator_id: 'user-1',
  creator_name: 'Creator Test',
  creator_username: 'creator',
  creator_avatar: null,
  likes_count: 10,
  views: 100,
  comments_count: 5,
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <VideoCard
        video={baseVideo}
        isActive={false}
        isMuted={false}
        onMuteToggle={vi.fn()}
        onLike={vi.fn()}
        onComment={vi.fn()}
        onShare={vi.fn()}
        onSave={vi.fn()}
        onProfileClick={vi.fn()}
        onTip={vi.fn()}
        onSubscribe={vi.fn()}
        isLiked={false}
        isSaved={false}
        isFollowing={false}
        {...props}
      />
    </MemoryRouter>
  );
}

// --- Tests ---

describe('VideoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom: mock HTMLMediaElement play/pause (not implemented)
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it('renders without crashing', () => {
    const { container } = renderCard();
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the video element', () => {
    renderCard();
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
  });

  it('shows sound-off icon when isMuted=true', () => {
    renderCard({ isMuted: true });
    const muteBtn = screen.getByLabelText('Activer le son');
    expect(muteBtn).toBeTruthy();
  });

  it('shows sound-on icon when isMuted=false', () => {
    renderCard({ isMuted: false });
    const muteBtn = screen.getByLabelText('Couper le son');
    expect(muteBtn).toBeTruthy();
  });

  it('calls onMuteToggle when mute button is clicked', () => {
    const onMuteToggle = vi.fn();
    renderCard({ onMuteToggle, isMuted: false });
    fireEvent.click(screen.getByLabelText('Couper le son'));
    expect(onMuteToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onComment when comment button is clicked', () => {
    const onComment = vi.fn();
    renderCard({ onComment });
    fireEvent.click(screen.getByLabelText('Commenter'));
    expect(onComment).toHaveBeenCalledTimes(1);
  });

  it('calls onShare when share button is clicked', () => {
    const onShare = vi.fn();
    renderCard({ onShare });
    fireEvent.click(screen.getByLabelText('Partager'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when save button is clicked', () => {
    const onSave = vi.fn();
    renderCard({ onSave });
    fireEvent.click(screen.getByLabelText('Sauvegarder'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does NOT autoplay when isActive=false', () => {
    renderCard({ isActive: false });
    const video = document.querySelector('video');
    // play() should not be called on inactive card
    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(video?.getAttribute('autoplay')).toBeFalsy();
  });

  it('shows creator name in profile link', () => {
    renderCard();
    // Creator name appears in the aria-label of the profile button
    const profileBtn = screen.getByLabelText(/Voir le profil de Creator Test/i);
    expect(profileBtn).toBeTruthy();
  });

  it('renders action buttons as pointer-events-none when hideActions=true', () => {
    const { container } = renderCard({ hideActions: true });
    // hideActions applies pointer-events-none to the actions overlay
    const overlay = container.querySelector('.pointer-events-none');
    expect(overlay).toBeTruthy();
  });
});
