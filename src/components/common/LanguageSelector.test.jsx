import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LanguageSelector from './LanguageSelector';

vi.mock('./useTranslation', () => ({
  useTranslation: () => ({
    language: 'fr',
    changeLanguage: vi.fn(),
    availableLanguages: ['fr', 'en', 'ar'],
  }),
}));

describe('LanguageSelector', () => {
  it('renders trigger button', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens dropdown and shows language options', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });
});
