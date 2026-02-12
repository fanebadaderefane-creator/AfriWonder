import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './toast';

describe('Toast', () => {
  it('renders ToastProvider and ToastViewport', () => {
    const { container } = render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders Toast with title and description', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Title</ToastTitle>
          <ToastDescription>Description</ToastDescription>
          <ToastClose />
        </Toast>
      </ToastProvider>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders Toast with destructive variant', () => {
    const { container } = render(
      <ToastProvider>
        <Toast variant="destructive">
          <ToastTitle>Error</ToastTitle>
        </Toast>
      </ToastProvider>
    );
    expect(container.querySelector('.destructive')).toBeInTheDocument();
  });

  it('renders ToastAction', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Title</ToastTitle>
          <ToastAction asChild>
            <button type="button">Undo</button>
          </ToastAction>
        </Toast>
      </ToastProvider>
    );
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });
});
