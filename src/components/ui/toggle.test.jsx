import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Toggle } from './toggle';

describe('Toggle', () => {
  it('renders toggle button', () => {
    render(<Toggle aria-label="Toggle">On</Toggle>);
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('calls onPressedChange when clicked', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle aria-label="Toggle" onPressedChange={onPressedChange}>
        Click
      </Toggle>
    );
    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(onPressedChange).toHaveBeenCalled();
  });

  it('renders with outline variant', () => {
    const { container } = render(
      <Toggle variant="outline" aria-label="Outlined">
        Outlined
      </Toggle>
    );
    expect(container.firstChild).toHaveClass('border');
  });
});
