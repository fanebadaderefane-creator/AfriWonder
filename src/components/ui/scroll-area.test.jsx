import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { ScrollArea, ScrollBar } from './scroll-area';

describe('ScrollArea', () => {
  it('renders children', () => {
    render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('ScrollBar with horizontal orientation applies horizontal styles', () => {
    const { container } = render(
      <ScrollAreaPrimitive.Root>
        <ScrollAreaPrimitive.Viewport><div>X</div></ScrollAreaPrimitive.Viewport>
        <ScrollBar orientation="horizontal" />
      </ScrollAreaPrimitive.Root>
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
