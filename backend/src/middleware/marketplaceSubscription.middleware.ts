import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth.js';
import marketplaceSubscriptionService, { MarketplaceFeature } from '../services/marketplaceSubscription.service.js';

export const requireMarketplaceFeature = (feature: MarketplaceFeature) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise',
        });
      }

      const access = await marketplaceSubscriptionService.checkAccess(req.user.id, feature);
      (req as any).marketplace_access = access;

      if (!access.allowed) {
        return res.status(403).json({
          success: false,
          message: "Abonnement insuffisant pour cette fonctionnalité",
          data: {
            required_feature: feature,
            plan_type: access.plan_type,
            permissions: access.permissions,
            upgrade_required: true,
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

