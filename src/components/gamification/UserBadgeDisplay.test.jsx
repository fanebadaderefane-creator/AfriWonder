import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserBadgeDisplay from './UserBadgeDisplay';

describe('UserBadgeDisplay', () => {
  it('renders nothing when badges empty', () => {
    const { container } = render(<UserBadgeDisplay />);
    expect(container.querySelector('.flex.flex-wrap')).toBeInTheDocument();
    expect(container.querySelector('.text-2xl')).not.toBeInTheDocument();
  });

  it('renders up to 5 badges', () => {
    const badges = [
      { id: '1', badge_icon: '🏆', badge_description: 'First' },
      { id: '2', badge_icon: '⭐', badge_description: 'Star' },
    ];
    render(<UserBadgeDisplay badges={badges} />);
    expect(screen.getByTitle('First')).toBeInTheDocument();
    expect(screen.getByTitle('Star')).toBeInTheDocument();
  });

  it('shows +N when more than 5 badges', () => {
    const badges = Array.from({ length: 7 }, (_, i) => ({
      id: String(i),
      badge_icon: 'x',
      badge_description: `Badge ${i}`,
    }));
    render(<UserBadgeDisplay badges={badges} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
