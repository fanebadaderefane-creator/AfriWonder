import { Router } from 'express';
import { authenticate, optionalAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { param } from '../utils/params.js';
import legalService from '../services/legal.service.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES - Documents légaux
// ==========================================

// GET /api/legal/documents/:type - Obtenir le document actif d'un type
router.get('/documents/:type', async (req, res, next) => {
  try {
    const type = param(req, 'type');
    const language = (req.query.language as string) || 'fr';
    const document = await legalService.getActiveDocument(type, language);
    res.json({ success: true, data: document });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/legal/documents/:type/history - Historique des versions
router.get('/documents/:type/history', async (req, res, next) => {
  try {
    const type = param(req, 'type');
    const language = (req.query.language as string) || 'fr';
    const documents = await legalService.getDocumentHistory(type, language);
    res.json({ success: true, data: documents });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/legal/documents/:id - Obtenir un document spécifique
router.get('/documents/version/:id', async (req, res, next) => {
  try {
    const documentId = param(req, 'id');
    const document = await legalService.getDocumentById(documentId);
    res.json({ success: true, data: document });
  } catch (error: any) {
    next(error);
  }
});

// ==========================================
// USER ROUTES - Acceptations
// ==========================================

// POST /api/legal/accept - Accepter un document légal
router.post('/accept', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { document_id, document_type } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress || 'unknown';
    const user_agent = req.get('user-agent') || 'unknown';

    const acceptance = await legalService.acceptDocument({
      userId,
      documentId: document_id,
      documentType: document_type,
      ipAddress: ip_address,
      userAgent: user_agent,
    });

    res.json({ success: true, data: acceptance });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/legal/my-acceptances - Mes acceptations
router.get('/my-acceptances', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const acceptances = await legalService.getUserAcceptances(userId);
    res.json({ success: true, data: acceptances });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/legal/check-required - Vérifier si nouvelle acceptation requise
router.get('/check-required', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const required = await legalService.checkRequiredAcceptances(userId);
    res.json({ success: true, data: required });
  } catch (error: any) {
    next(error);
  }
});

// ==========================================
// ADMIN ROUTES - Gestion des documents
// ==========================================

// POST /api/legal/admin/documents - Créer un nouveau document
router.post('/admin/documents', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const adminId = req.user!.id;
    const { type, version, language, title, content, effective_date } = req.body;

    const document = await legalService.createDocument({
      type,
      version,
      language: language || 'fr',
      title,
      content,
      effectiveDate: new Date(effective_date),
      createdBy: adminId,
    });

    res.json({ success: true, data: document });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/legal/admin/documents/:id/activate - Activer un document
router.put('/admin/documents/:id/activate', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const documentId = param(req, 'id');
    const document = await legalService.activateDocument(documentId);
    res.json({ success: true, data: document });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/legal/admin/documents/:id/deactivate - Désactiver un document
router.put('/admin/documents/:id/deactivate', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const documentId = param(req, 'id');
    const document = await legalService.deactivateDocument(documentId);
    res.json({ success: true, data: document });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/legal/admin/documents - Liste tous les documents
router.get('/admin/documents', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const documents = await legalService.getAllDocuments();
    res.json({ success: true, data: documents });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/legal/admin/acceptances/stats - Statistiques d'acceptation
router.get('/admin/acceptances/stats', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const stats = await legalService.getAcceptanceStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    next(error);
  }
});

// ==========================================
// LEGAL ENTITY INFO
// ==========================================

// GET /api/legal/entity-info - Informations légales de l'entreprise
router.get('/entity-info', async (req, res, next) => {
  try {
    const info = await legalService.getLegalEntityInfo();
    res.json({ success: true, data: info });
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/legal/admin/entity-info - Mettre à jour les infos légales
router.put('/admin/entity-info', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const info = await legalService.updateLegalEntityInfo(req.body);
    res.json({ success: true, data: info });
  } catch (error: any) {
    next(error);
  }
});

export default router;
