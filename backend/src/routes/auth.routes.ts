// AfriWonder full review PR - CodeRabbit
import { Router } from 'express';
import { authService } from '../services/auth.service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password, full_name, referral_code } = req.body;

    const result = await authService.register({
      email,
      username,
      password,
      full_name,
      referral_code,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, twoFactorCode, otpCode, backupCode } = req.body;

    // Validation basique avant d'appeler le service
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email et mot de passe sont requis' },
      });
    }

    const result = await authService.login(
      email,
      password,
      twoFactorCode || otpCode,
      backupCode
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    // Logger l'erreur pour debug
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
    });

    // Si c'est une erreur connue avec statusCode, la passer au handler
    if (error.statusCode) {
      const msg = error.message || '';
      const isConfigError = msg.includes('JWT_SECRET') || msg.includes('JWT_REFRESH_SECRET');
      return res.status(error.statusCode).json({
        success: false,
        error: {
          message: isConfigError
            ? 'Configuration serveur manquante (JWT). Vérifiez backend/.env avec JWT_SECRET et JWT_REFRESH_SECRET.'
            : error.message,
          code: error.code,
        },
      });
    }

    // Sinon, passer à l'error handler global
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken, refresh_token } = req.body;
    const token = refreshToken || refresh_token;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token requis' },
      });
    }

    const result = await authService.refreshToken(token);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/google - Initiate Google OAuth
router.get('/google', async (req, res, next) => {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').replace(/^["']|["']$/g, '');
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback').replace(/^["']|["']$/g, '');
    
    if (!clientId) {
      logger.error('Google OAuth - GOOGLE_CLIENT_ID manquant');
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_config_missing`);
    }
    
    logger.info('Google OAuth - Redirection vers Google', { redirectUri, hasClientId: !!clientId });
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile email`;
    res.redirect(googleAuthUrl);
  } catch (error) {
    logger.error('Google OAuth - Erreur lors de l\'initiation', error);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
  }
});

// GET /api/auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, error: oauthError } = req.query;
    
    if (oauthError) {
      logger.error('Google OAuth Error', { error: oauthError });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed&reason=${oauthError}`);
    }
    
    if (!code) {
      logger.warn('Google OAuth Callback - Pas de code reçu');
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
    }

    // Nettoyer les variables d'environnement (enlever les guillemets si présents)
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').replace(/^["']|["']$/g, '');
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').replace(/^["']|["']$/g, '');
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback').replace(/^["']|["']$/g, '');

    if (!clientId || !clientSecret) {
      logger.error('Google OAuth - Credentials manquants');
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_config_missing`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json() as any;
    if (!tokens.access_token) {
      logger.error('Google OAuth - Impossible d\'obtenir le token', { error: tokens });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    
    if (!userResponse.ok) {
      logger.error('Google OAuth - Erreur lors de la récupération des infos utilisateur', { status: userResponse.status });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
    }
    
    const googleUser = await userResponse.json() as any;

    if (!googleUser.email) {
      logger.error('Google OAuth - Email non disponible', { googleUser });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_email_required`);
    }

    // Create or login user
    const result = await authService.socialLogin({
      email: googleUser.email,
      full_name: googleUser.name,
      profile_image: googleUser.picture,
      provider: 'google',
      provider_id: googleUser.id,
    });

    logger.info('Google OAuth - Connexion réussie', { userId: result.user?.id, email: result.user?.email });

    // Set tokens in cookies
    res.cookie('access_token', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.cookie('refresh_token', result.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    
    // IMPORTANT: Rediriger vers /Landing avec les tokens, qui redirigera ensuite vers / (AfriWonder)
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const redirectUrl = new URL(`${frontendUrl}/Landing`);
    redirectUrl.searchParams.set('token', result.accessToken);
    redirectUrl.searchParams.set('refresh', result.refreshToken);
    
    logger.info('Google OAuth - Redirection vers AfriWonder', { redirectUrl: redirectUrl.toString() });
    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Google OAuth - Erreur inattendue', error);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
  }
});

// GET /api/auth/facebook - Initiate Facebook OAuth
router.get('/facebook', async (req, res, next) => {
  try {
    const redirectUri = (process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback').replace(/^["']|["']$/g, '');
    const appId = (process.env.FACEBOOK_APP_ID || '').replace(/^["']|["']$/g, '');
    
    if (!appId) {
      logger.error('Facebook OAuth - FACEBOOK_APP_ID manquant');
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_config_missing`);
    }
    
    logger.info('Facebook OAuth - Redirection vers Facebook', { redirectUri, hasAppId: !!appId });
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile`;
    res.redirect(facebookAuthUrl);
  } catch (error) {
    logger.error('Facebook OAuth - Erreur lors de l\'initiation', error);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
  }
});

// GET /api/auth/facebook/callback - Handle Facebook OAuth callback
router.get('/facebook/callback', async (req, res, next) => {
  try {
    logger.info('Facebook OAuth Callback reçu', { query: req.query });
    const { code, error: oauthError, error_description } = req.query;
    
    if (oauthError) {
      logger.error('Facebook OAuth Error', { error: oauthError, error_description });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed&reason=${oauthError}`);
    }
    
    if (!code) {
      logger.warn('Facebook OAuth Callback - Pas de code reçu');
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
    }

    // Nettoyer les variables d'environnement (enlever les guillemets si présents)
    const appId = (process.env.FACEBOOK_APP_ID || '').replace(/^["']|["']$/g, '');
    const appSecret = (process.env.FACEBOOK_APP_SECRET || '').replace(/^["']|["']$/g, '');
    const redirectUri = (process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback').replace(/^["']|["']$/g, '');

    if (!appId || !appSecret) {
      logger.error('Facebook OAuth - Credentials manquants');
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_config_missing`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logger.error('Facebook OAuth - Erreur lors de l\'échange du code', { status: tokenResponse.status, error: errorData });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
    }
    
    const tokenData = await tokenResponse.json() as { access_token?: string };
    
    if (!tokenData.access_token) {
      logger.error('Facebook OAuth - Impossible d\'obtenir le token', { tokenData });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
    }

    // Get user info from Facebook
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`);
    
    if (!userResponse.ok) {
      logger.error('Facebook OAuth - Erreur lors de la récupération des infos utilisateur', { status: userResponse.status });
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
    }
    
    const facebookUser = await userResponse.json() as any;

    // Create or login user
    const result = await authService.socialLogin({
      email: facebookUser.email || `${facebookUser.id}@facebook.com`,
      full_name: facebookUser.name,
      profile_image: facebookUser.picture?.data?.url,
      provider: 'facebook',
      provider_id: facebookUser.id,
    });

    logger.info('Facebook OAuth - Connexion réussie', { userId: result.user?.id, email: result.user?.email });

    // Set tokens in cookies
    res.cookie('access_token', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.cookie('refresh_token', result.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    
    // IMPORTANT: Rediriger vers /Landing avec les tokens, qui redirigera ensuite vers / (AfriWonder)
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const redirectUrl = new URL(`${frontendUrl}/Landing`);
    redirectUrl.searchParams.set('token', result.accessToken);
    redirectUrl.searchParams.set('refresh', result.refreshToken);
    
    logger.info('Facebook OAuth - Redirection vers AfriWonder', { redirectUrl: redirectUrl.toString() });
    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Facebook OAuth - Erreur inattendue', error);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Landing?error=oauth_failed`);
  }
});

export default router;
