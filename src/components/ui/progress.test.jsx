import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders with value', () => {
    const { container } = render(<Progress value={50} />);
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('renders with 0 value', () => {
    render(<Progress value={0} />);
    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('renders with 100 value', () => {
    const { container } = render(<Progress value={100} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
