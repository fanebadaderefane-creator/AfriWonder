import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('./mobileClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

import mobileApiClient from './mobileClient';
import { authApi } from './auth';

type MockedResponse = {
  data: {
    success: boolean;
    data: {
      user: {
        id: string;
        email: string;
        username: string;
      };
      accessToken: string;
      refreshToken: string;
    };
  };
};

function makeLoginOkResponse(): MockedResponse {
  return {
    data: {
      success: true,
      data: {
        user: {
          id: 'u-1',
          email: 'user@example.com',
          username: 'user',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    },
  };
}

function make401Error(message = 'Email ou mot de passe incorrect') {
  return {
    response: {
      status: 401,
      data: {
        error: { message },
      },
    },
  };
}

describe('authApi.login (mobile hardening)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('normalise identifier (trim + lower-case email + chars invisibles retirés)', async () => {
    const postMock = mobileApiClient.post as unknown as Mock;
    postMock.mockResolvedValue(makeLoginOkResponse());

    await authApi.login({
      identifier: '  USER@Example.COM\u200B  ',
      password: 'secret123',
    });

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/proxy/auth/login', {
      identifier: 'user@example.com',
      password: 'secret123',
    });
  });

  it('retente une fois avec password trim si 401 et espaces en bord', async () => {
    const postMock = mobileApiClient.post as unknown as Mock;
    postMock
      .mockRejectedValueOnce(make401Error())
      .mockResolvedValueOnce(makeLoginOkResponse());

    await authApi.login({
      identifier: 'test@afriwonder.com',
      password: '  afriwonder2026  ',
    });

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock.mock.calls[0][0]).toBe('/proxy/auth/login');
    expect(postMock.mock.calls[0][1]).toEqual({
      identifier: 'test@afriwonder.com',
      password: '  afriwonder2026  ',
    });
    expect(postMock.mock.calls[1][0]).toBe('/proxy/auth/login');
    expect(postMock.mock.calls[1][1]).toEqual({
      identifier: 'test@afriwonder.com',
      password: 'afriwonder2026',
    });
  });

  it('ne retente pas si 401 sans espaces en bord de password', async () => {
    const postMock = mobileApiClient.post as unknown as Mock;
    postMock.mockRejectedValue(make401Error());

    await expect(
      authApi.login({
        identifier: 'test@afriwonder.com',
        password: 'afriwonder2026',
      })
    ).rejects.toBeDefined();

    expect(postMock).toHaveBeenCalledTimes(1);
  });
});
