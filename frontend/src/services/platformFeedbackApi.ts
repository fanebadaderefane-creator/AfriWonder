import apiClient from '../api/client';

export type PlatformFeedbackType = 'bug' | 'suggestion' | 'comment';

export type SubmitPlatformFeedbackInput = {
  type?: PlatformFeedbackType;
  content: string;
  email?: string;
  join_whatsapp?: boolean;
  join_mailing?: boolean;
};

/**
 * POST /api/proxy/platform-feedback — retours utilisateurs (manuel durabilité ch.10).
 */
export async function submitPlatformFeedback(
  input: SubmitPlatformFeedbackInput
): Promise<{ success: boolean; data?: { id: string; message: string }; message?: string }> {
  const res = await apiClient.post('/platform-feedback', {
    type: input.type ?? 'comment',
    content: input.content.trim(),
    email: input.email?.trim() || undefined,
    join_whatsapp: Boolean(input.join_whatsapp),
    join_mailing: Boolean(input.join_mailing),
  });
  return res.data;
}
