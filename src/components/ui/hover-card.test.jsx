import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';

describe('HoverCard', () => {
  it('renders trigger', () => {
    render(
      <HoverCard>
        <HoverCardTrigger asChild>
          <button type="button">Hover me</button>
        </HoverCardTrigger>
        <HoverCardContent>Card content</HoverCardContent>
      </HoverCard>
    );
    expect(screen.getByRole('button', { name: /Hover me/i })).toBeInTheDocument();
  });
});
