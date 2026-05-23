import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AspectRatio } from './aspect-ratio';

describe('AspectRatio', () => {
  it('renders children', () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <img src="/test.jpg" alt="Test" />
      </AspectRatio>
    );
    expect(screen.getByRole('img', { name: 'Test' })).toBeInTheDocument();
  });
});
