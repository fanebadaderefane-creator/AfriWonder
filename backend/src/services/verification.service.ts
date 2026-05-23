import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';

class VerificationService {
  async isKycApproved(userId: string): Promise<boolean> {
    const v = await prisma.userVerification.findUnique({
      where: { user_id: userId },
      select: { status: true },
    });
    return v?.status === 'approved';
  }

  async getMyStatus(userId: string) {
    return prisma.userVerification.findUnique({
      where: { user_id: userId },
    });
  }

  async submit(userId: string, data: { document_type: string; document_url: string }) {
    if (!data.document_type || !data.document_url) {
      const err: any = new Error('document_type et document_url sont requis');
      err.statusCode = 400;
      throw err;
    }
    const existing = await prisma.userVerification.findUnique({
      where: { user_id: userId },
    });
    if (existing) {
      if (existing.status === 'pending') {
        const err: any = new Error('Une demande est déjà en cours');
        err.statusCode = 400;
        throw err;
      }
      const updated = await prisma.userVerification.update({
        where: { user_id: userId },
        data: {
          document_type: data.document_type,
          document_url: data.document_url,
          status: 'pending',
          verified_at: null,
          verified_by: null,
        },
      });
      logger.info('Vérification resoumise', { userId });
      return updated;
    }
    const verification = await prisma.userVerification.create({
      data: {
        user_id: userId,
        document_type: data.document_type,
        document_url: data.document_url,
        status: 'pending',
      },
    });
    logger.info('Vérification soumise', { userId, verificationId: verification.id });
    return verification;
  }

  async listForAdmin(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [verifications, total] = await Promise.all([
      prisma.userVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              full_name: true,
              seller_profile: { select: { id: true, store_name: true } },
            },
          },
        },
      }),
      prisma.userVerification.count({ where }),
    ]);
    return {
      verifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatusByAdmin(
    verificationId: string,
    adminId: string,
    data: { status: 'approved' | 'rejected'; set_seller_verified?: boolean }
  ) {
    const verification = await prisma.userVerification.findUnique({
      where: { id: verificationId },
      include: { user: true },
    });
    if (!verification) {
      const err: any = new Error('Demande de vérification non trouvée');
      err.statusCode = 404;
      throw err;
    }
    const updated = await prisma.userVerification.update({
      where: { id: verificationId },
      data: {
        status: data.status,
        verified_at: data.status === 'approved' ? new Date() : null,
        verified_by: data.status === 'approved' ? adminId : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            seller_profile: { select: { id: true } },
          },
        },
      },
    });
    if (data.status === 'approved' && (data.set_seller_verified === true || data.set_seller_verified === undefined)) {
      await prisma.sellerProfile.updateMany({
        where: { user_id: verification.user_id },
        data: { is_verified: true },
      });
      await prisma.user.update({
        where: { id: verification.user_id },
        data: { is_verified: true },
      });
      await notificationService.create(verification.user_id, {
        type: 'account_verified',
        title: 'Compte vérifié',
        message: 'Félicitations ! Votre compte a été vérifié. Vous pouvez maintenant profiter de tous les avantages.',
        reference_type: 'verification',
        reference_id: verificationId,
      });
    }
    logger.info('Vérification KYC traitée par admin', { verificationId, status: data.status });
    return updated;
  }
}

export default new VerificationService();
