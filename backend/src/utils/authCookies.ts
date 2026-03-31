import type { Response } from 'express';

const secure = process.env.NODE_ENV === 'production';

const cookieBase = {
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, cookieBase);
  res.cookie('refresh_token', refreshToken, cookieBase);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}
