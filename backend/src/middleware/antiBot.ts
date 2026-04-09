import { Request, Response, NextFunction } from 'express';

// Headers suspects = bots
const BOT_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests'
];

// IPs blacklist (à enrichir avec des services externes)
const BLACKLISTED_IPS: Set<string> = new Set([
  // Ajouter IPs malveillantes connues
]);

export const antiBotMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  const ip = req.ip || req.socket.remoteAddress || '';

  // Bloquer bots connus
  if (BOT_USER_AGENTS.some(bot => userAgent.includes(bot))) {
    return res.status(403).json({ 
      success: false, 
      error: 'Accès refusé - bot détecté' 
    });
  }

  // Bloquer IPs blacklistées
  if (BLACKLISTED_IPS.has(ip)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Accès refusé - IP blacklistée' 
    });
  }

  // POST sans Referer/Origin = normal pour webhooks paiement (Orange, Stripe, etc.) — ne pas bruit alertes.
  const path = req.path || req.url || '';
  const isPaymentWebhook =
    (path.includes('/payments/') && path.includes('/webhook')) || path === '/api/payment/webhook';
  const isSuspicious =
    !isPaymentWebhook &&
    !req.headers.referer &&
    !req.headers.origin &&
    req.method === 'POST';

  if (isSuspicious && process.env.NODE_ENV === 'production') {
    // Log pour analyse
    console.warn('[ANTI-BOT] Requête suspecte:', {
      ip,
      userAgent,
      method: req.method,
      path: req.path
    });
  }

  next();
};

// Middleware anti-spam commentaires/messages
export const antiSpamMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  
  if (!userId) return next();

  // Vérifier le contenu pour spam patterns
  const content = req.body.content || req.body.text || req.body.message || '';
  
  const SPAM_PATTERNS = [
    /\b(viagra|cialis|casino|lottery|winner)\b/i,
    /\b(click here|buy now|limited offer)\b/i,
    /(https?:\/\/[^\s]+){3,}/, // 3+ liens = spam probable
    /(.)\1{10,}/, // Caractère répété 10+ fois
  ];

  const isSpam = SPAM_PATTERNS.some(pattern => pattern.test(content));

  if (isSpam) {
    return res.status(400).json({ 
      success: false, 
      error: 'Contenu identifié comme spam' 
    });
  }

  next();
};
