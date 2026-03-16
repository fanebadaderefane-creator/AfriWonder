import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import prisma from '../config/database.js';

const router = Router();

// GET /api/chatbot - Liste des bots actifs
router.get('/', async (_req, res, next) => {
  try {
    const bots = await prisma.chatBot.findMany({
      where: { is_active: true },
      select: { id: true, name: true, username: true, avatar_url: true, welcome_message: true },
    });
    res.json({ success: true, data: bots });
  } catch (error) {
    next(error);
  }
});

// GET /api/chatbot/:username - Infos d'un bot (pour démarrer une conversation)
router.get('/:username', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const bot = await prisma.chatBot.findFirst({
      where: { username: req.params.username, is_active: true },
    });
    if (!bot) return res.status(404).json({ success: false, error: { message: 'Bot non trouvé' } });
    res.json({
      success: true,
      data: {
        id: bot.id,
        name: bot.name,
        username: bot.username,
        avatar_url: bot.avatar_url,
        welcome_message: bot.welcome_message,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
