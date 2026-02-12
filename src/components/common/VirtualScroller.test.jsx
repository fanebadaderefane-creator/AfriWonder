import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VirtualScroller from './VirtualScroller';

describe('VirtualScroller', () => {
  it('renders container and visible items', () => {
    const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
    const renderItem = (item) => <span>{item.name}</span>;
    render(
      <VirtualScroller items={items} itemHeight={100} renderItem={renderItem} />
    );
    const container = document.querySelector('.overflow-y-scroll');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('calls renderItem for each visible item', () => {
    const renderItem = vi.fn((item) => <span key={item.id}>{item.id}</span>);
    render(
      <VirtualScroller items={[{ id: 1 }, { id: 2 }]} itemHeight={100} renderItem={renderItem} />
    );
    expect(renderItem).toHaveBeenCalled();
  });

  it('renders with empty items', () => {
    const { container } = render(
      <VirtualScroller items={[]} renderItem={() => null} />
    );
    expect(container.querySelector('.overflow-y-scroll')).toBeInTheDocument();
  });
});
