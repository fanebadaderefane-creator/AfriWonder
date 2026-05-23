import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../api/client';
import { submitPlatformFeedback } from './platformFeedbackApi';

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}));

describe('submitPlatformFeedback', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it('envoie le corps attendu', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { id: '1', message: 'Merci' } },
    });
    const out = await submitPlatformFeedback({
      type: 'bug',
      content: '  Crash au login  ',
      email: 'a@b.co',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/platform-feedback', {
      type: 'bug',
      content: 'Crash au login',
      email: 'a@b.co',
      join_whatsapp: false,
      join_mailing: false,
    });
    expect(out.success).toBe(true);
  });
});
