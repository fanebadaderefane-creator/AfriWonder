import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import privacyService from '../services/privacy.service.js';

const router = Router();

// ==========================================
// COOKIES & CONSENT
// ==========================================

// POST /api/privacy/cookies/consent - Enregistrer les préférences de cookies
router.post('/cookies/consent', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { essential, analytics, marketing, functional, social_media } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress || 'unknown';
    const user_agent = req.get('user-agent') || 'unknown';

    const preferences = await privacyService.saveCookiePreferences({
      userId,
      essential: essential ?? true,
      analytics: analytics ?? false,
      marketing: marketing ?? false,
      functional: functional ?? false,
      socialMedia: social_media ?? false,
      ipAddress: ip_address,
      userAgent: user_agent,
    });

    res.json({ success: true, data: preferences });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/privacy/cookies/preferences - Obtenir mes préférences de cookies
router.get('/cookies/preferences', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const preferences = await privacyService.getCookiePreferences(userId);
    res.json({ success: true, data: preferences });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/privacy/cookies/guest-consent - Consentement cookies pour invités
router.post('/cookies/guest-consent', async (req, res, next) => {
  try {
    const { session_id, essential, analytics, marketing, functional, social_media } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress || 'unknown';

    const consent = await privacyService.saveGuestCookieConsent({
      sessionId: session_id,
      essential: essential ?? true,
      analytics: analytics ?? false,
      marketing: marketing ?? false,
      functional: functional ?? false,
      socialMedia: social_media ?? false,
      ipAddress: ip_address,
    });

    res.json({ success: true, data: consent });
  } catch (error: any) {
    next(error);
  }
});

// ==========================================
// DATA EXPORT (RGPD Article 20)
// ==========================================

// POST /api/privacy/export-data - Demander l'export de données
router.post('/export-data', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const format = (req.body.format as string) || 'json';
    const ip_address = req.ip || req.connection.remoteAddress || 'unknown';

    const exportRequest = await privacyService.createExportRequest({
      userId,
      format,
      ipAddress: ip_address,
    });

    res.json({ 
      success: true, 
      data: exportRequest,
      message: 'Votre demande d\'export a été enregistrée. Vous recevrez un email quand elle sera prête.' 
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/privacy/export-data/requests - Mes demandes d'export
router.get('/export-data/requests', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const requests = await privacyService.getExportRequests(userId);
    res.json({ success: true, data: requests });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/privacy/export-data/download/:id - Télécharger l'export
router.get('/export-data/download/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const requestId = req.params.id;
    
    const { url, fileName } = await privacyService.getExportDownloadUrl(userId, requestId);
    
    // Rediriger vers l'URL de téléchargement ou renvoyer le fichier
    res.json({ success: true, data: { download_url: url, file_name: fileName } });
  } catch (error: any) {
    next(error);
  }
});

// ==========================================
// ACCOUNT DELETION (RGPD Article 17)
// ==========================================

// POST /api/privacy/delete-account - Demander la suppression du compte
router.post('/delete-account', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { reason } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress || 'unknown';

    const deletionRequest = await privacyService.requestAccountDeletion({
      userId,
      reason,
      ipAddress: ip_address,
    });

    res.json({ 
      success: true, 
      data: deletionRequest,
      message: 'Votre demande de suppression a été enregistrée. Votre compte sera définitivement supprimé dans 30 jours. Vous pouvez annuler cette demande avant cette date.' 
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/privacy/cancel-deletion/:token - Annuler la suppression
router.post('/cancel-deletion/:token', async (req, res, next) => {
  try {
    const token = req.params.token;
    const result = await privacyService.cancelAccountDeletion(token);
    res.json({ 
      success: true, 
      data: result,
      message: 'La demande de suppression de votre compte a été annulée avec succès.' 
    });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/privacy/deletion-status - Statut de ma demande de suppression
router.get('/deletion-status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const status = await privacyService.getAccountDeletionStatus(userId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    next(error);
  }
});

// ==========================================
// SECURITY LOGS
// ==========================================

// GET /api/privacy/security-logs - Mes logs de sécurité
router.get('/security-logs', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const logs = await privacyService.getSecurityLogs(userId, page, limit);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/privacy/suspicious-activities - Mes alertes d'activités suspectes
router.get('/suspicious-activities', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const alerts = await privacyService.getSuspiciousActivities(userId);
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    next(error);
  }
});

// ==========================================
// 2FA MANAGEMENT
// ==========================================

// POST /api/privacy/2fa/enable - Activer 2FA
router.post('/2fa/enable', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { method, phone_number } = req.body;
    
    const result = await privacyService.enable2FA({
      userId,
      method,
      phoneNumber: phone_number,
    });
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/privacy/2fa/verify - Vérifier et activer 2FA
router.post('/2fa/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;
    
    const result = await privacyService.verify2FA(userId, code);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/privacy/2fa/disable - Désactiver 2FA
router.post('/2fa/disable', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;
    
    await privacyService.disable2FA(userId, password);
    res.json({ success: true, message: 'Authentification à deux facteurs désactivée' });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/privacy/2fa/status - Statut 2FA
router.get('/2fa/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const status = await privacyService.get2FAStatus(userId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    next(error);
  }
});

export default router;
