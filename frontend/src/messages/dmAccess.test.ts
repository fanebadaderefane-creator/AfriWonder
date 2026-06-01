import { describe, it, expect } from 'vitest';
import axios from 'axios';
import { parseDmAccessDenial, getDmAccessDeniedMessage } from './dmAccess';

function axios403(message: string) {
  return new axios.AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 403,
    statusText: 'Forbidden',
    headers: {},
    config: {} as never,
    data: { success: false, error: { message } },
  });
}

describe('dmAccess', () => {
  it('detects friends-only DM rule', () => {
    expect(parseDmAccessDenial(axios403('Messages autorisés uniquement entre amis.'))).toBe('friends_required');
  });

  it('detects no_one DM rule', () => {
    expect(
      parseDmAccessDenial(axios403("Cet utilisateur n'accepte pas les messages privés.")),
    ).toBe('no_one');
  });

  it('suggests Wonder when not following yet', () => {
    const msg = getDmAccessDeniedMessage('friends_required', {
      peerName: 'Awa',
      isFollowing: false,
      isFollowingMe: false,
    });
    expect(msg).toContain('Wonder');
    expect(msg).toContain('Awa');
  });

  it('suggests peer follow-back when only viewer follows', () => {
    const msg = getDmAccessDeniedMessage('friends_required', {
      peerName: 'Moussa',
      isFollowing: true,
      isFollowingMe: false,
    });
    expect(msg).toContain('suivez déjà');
    expect(msg).toContain('Moussa');
  });
});
