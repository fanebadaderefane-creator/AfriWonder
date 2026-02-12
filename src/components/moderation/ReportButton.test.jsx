import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportButton from './ReportButton';

const mockMe = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/api/expressClient', () => ({
  api: {
    auth: { me: (...args) => mockMe(...args) },
    entities: { Moderation: { create: (...args) => mockCreate(...args) } },
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('ReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMe.mockResolvedValue({ id: 'u1', full_name: 'Test User', email: 'test@test.com' });
  });

  it('renders Signaler button', () => {
    render(<ReportButton contentType="video" contentId="v1" />);
    expect(screen.getByRole('button', { name: /Signaler/i })).toBeInTheDocument();
  });

  it('opens dialog with title and reason select', async () => {
    const user = userEvent.setup();
    render(<ReportButton contentType="video" contentId="v1" />);
    await user.click(screen.getByRole('button', { name: /Signaler/i }));
    expect(screen.getByText('Signaler ce contenu')).toBeInTheDocument();
    expect(screen.getByText(/Raison du signalement/i)).toBeInTheDocument();
    expect(screen.getByText(/Sélectionnez une raison/i)).toBeInTheDocument();
  });

  it('shows Annuler and Signaler in dialog', async () => {
    const user = userEvent.setup();
    render(<ReportButton contentType="video" contentId="v1" />);
    await user.click(screen.getByRole('button', { name: /Signaler/i }));
    expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
    const submitBtn = screen.getAllByRole('button', { name: /Signaler/i });
    expect(submitBtn.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onSearch when closing with Annuler', async () => {
    const user = userEvent.setup();
    render(<ReportButton contentType="video" contentId="v1" />);
    await user.click(screen.getByRole('button', { name: /Signaler/i }));
    await user.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(screen.queryByText('Signaler ce contenu')).not.toBeInTheDocument();
  });
});
