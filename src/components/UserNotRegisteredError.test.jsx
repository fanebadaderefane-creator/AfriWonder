import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserNotRegisteredError from './UserNotRegisteredError';

describe('UserNotRegisteredError', () => {
  it('renders Access Restricted title', () => {
    render(<UserNotRegisteredError />);
    expect(screen.getByRole('heading', { name: /Access Restricted/i })).toBeInTheDocument();
  });

  it('renders contact administrator message', () => {
    render(<UserNotRegisteredError />);
    expect(screen.getByText(/not registered to use this application/i)).toBeInTheDocument();
  });

  it('renders list of actions', () => {
    render(<UserNotRegisteredError />);
    expect(screen.getByText(/Verify you are logged in with the correct account/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact the app administrator for access/i)).toBeInTheDocument();
  });
});
