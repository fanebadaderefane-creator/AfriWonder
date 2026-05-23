import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserLevelBadge from './UserLevelBadge';

describe('UserLevelBadge', () => {
  it('renders level and Niveau label', () => {
    render(<UserLevelBadge level={5} points={100} nextLevelPoints={200} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Niveau')).toBeInTheDocument();
  });

  it('uses green gradient for level < 10', () => {
    const { container } = render(<UserLevelBadge level={5} />);
    expect(container.firstChild).toHaveClass('from-green-500');
  });

  it('uses orange gradient for level 10-19', () => {
    const { container } = render(<UserLevelBadge level={15} />);
    expect(container.firstChild).toHaveClass('from-orange-500');
  });

  it('uses blue gradient for level 20-29', () => {
    const { container } = render(<UserLevelBadge level={25} />);
    expect(container.firstChild).toHaveClass('from-blue-500');
  });

  it('uses purple gradient for level 30-49', () => {
    const { container } = render(<UserLevelBadge level={40} />);
    expect(container.firstChild).toHaveClass('from-purple-500');
  });

  it('uses yellow gradient for level >= 50', () => {
    const { container } = render(<UserLevelBadge level={50} />);
    expect(container.firstChild).toHaveClass('from-yellow-500');
  });
});
