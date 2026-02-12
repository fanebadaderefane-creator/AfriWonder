import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from './drawer';

describe('Drawer', () => {
  it('renders trigger', () => {
    render(
      <Drawer>
        <DrawerTrigger asChild>
          <button type="button">Open drawer</button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
    expect(screen.getByRole('button', { name: /Open drawer/i })).toBeInTheDocument();
  });
});
