import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeaturedVideoSelector from './FeaturedVideoSelector';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/api/expressClient', () => ({
  api: {
    videos: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

const defaultVideos = [
  { id: 'v1', title: 'First', thumbnail_url: 'https://a.com/1.jpg', video_url: '', views: 10 },
  { id: 'v2', title: 'Second', thumbnail_url: 'https://a.com/2.jpg', video_url: '', views: 20 },
];

describe('FeaturedVideoSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open with title and videos', () => {
    render(
      <FeaturedVideoSelector
        isOpen
        onClose={vi.fn()}
        videos={defaultVideos}
        currentFeaturedId={null}
      />
    );
    expect(screen.getByText(/Choisir une vidéo mise en avant/i)).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('calls onClose when Annuler clicked', async () => {
    const onClose = vi.fn();
    render(
      <FeaturedVideoSelector
        isOpen
        onClose={onClose}
        videos={defaultVideos}
        currentFeaturedId={null}
      />
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /Annuler/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
