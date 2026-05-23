import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import axios from 'axios';
import PDFDocument from 'pdfkit';

class CivicService {
  async list(page: number = 1, limit: number = 20, filters?: {
    status?: string;
    search?: string;
    country?: string;
    region?: string;
    category?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.country) where.country = filters.country;
    if (filters?.region) where.region = filters.region;
    if (filters?.category) where.category = filters.category;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [petitions, total] = await Promise.all([
      prisma.civicPetition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { current_signatures: 'desc' },
        include: {
          creator: { select: { id: true, full_name: true, profile_image: true } },
        },
      }),
      prisma.civicPetition.count({ where }),
    ]);

    return {
      petitions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(petitionId: string) {
    const petition = await prisma.civicPetition.findUnique({
      where: { id: petitionId },
      include: {
        creator: { select: { id: true, full_name: true, profile_image: true, email: true } },
        signatures: {
          take: 20,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    return petition;
  }

  async create(creatorId: string, data: {
    title: string;
    description: string;
    goalSignatures: number;
    endDate?: Date;
    category?: string;
    country?: string;
    region?: string;
    city?: string;
    isNational?: boolean;
    targetAuthorityEmail?: string;
    isBoosted?: boolean;
    isFeatured?: boolean;
    featuredUntil?: Date;
  }) {
    const petition = await prisma.civicPetition.create({
      data: {
        creator_id: creatorId,
        title: data.title,
        description: data.description,
        goal_signatures: data.goalSignatures,
        end_date: data.endDate,
        status: 'active',
        category: data.category,
        country: data.country,
        region: data.region,
        city: data.city,
        is_national: data.isNational ?? true,
        target_authority_email: data.targetAuthorityEmail,
        is_boosted: data.isBoosted ?? false,
        is_featured: data.isFeatured ?? false,
        featured_until: data.featuredUntil ?? undefined,
      },
    });

    logger.info('Petition created', { creatorId, petitionId: petition.id });
    return petition;
  }

  /** Vérification reCAPTCHA (optionnel si RECAPTCHA_SECRET non défini) */
  private async verifyRecaptcha(token: string | undefined): Promise<void> {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) return;
    if (!token) {
      const err: any = new Error('Vérification anti-robot requise (reCAPTCHA).');
      err.statusCode = 400;
      throw err;
    }
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({ secret, response: token }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 5000 }
    ).catch(() => ({ data: { success: false } }));
    if (!data?.success) {
      const err: any = new Error('Vérification anti-robot échouée.');
      err.statusCode = 400;
      throw err;
    }
  }

  /** Signature sécurisée : 1 par user, email vérifié requis, IP + geo stockés, reCAPTCHA optionnel */
  async sign(petitionId: string, signerId: string, options?: {
    comment?: string;
    ipAddress?: string;
    signerCity?: string;
    signerCountry?: string;
    recaptchaToken?: string;
  }) {
    await this.verifyRecaptcha(options?.recaptchaToken);
    const petition = await prisma.civicPetition.findUnique({
      where: { id: petitionId },
    });

    if (!petition || petition.status !== 'active') {
      throw new Error('Petition not found or not active');
    }

    const user = await prisma.user.findUnique({
      where: { id: signerId },
      select: { is_verified: true, email: true },
    });
    if (!user) throw new Error('User not found');
    if (!user.is_verified) {
      const err: any = new Error('Vérification email obligatoire avant de signer. Vérifiez votre boîte mail.');
      err.statusCode = 403;
      throw err;
    }

    const existing = await prisma.petitionSignature.findFirst({
      where: {
        petition_id: petitionId,
        signer_id: signerId,
      },
    });

    if (existing) {
      throw new Error('Already signed');
    }

    const signature = await prisma.petitionSignature.create({
      data: {
        petition_id: petitionId,
        signer_id: signerId,
        comment: options?.comment,
        is_verified: true,
        ip_address: options?.ipAddress?.slice(0, 45),
        signer_city: options?.signerCity?.slice(0, 100),
        signer_country: options?.signerCountry?.slice(0, 100),
      },
    });

    await prisma.civicPetition.update({
      where: { id: petitionId },
      data: { current_signatures: { increment: 1 } },
    });

    const newCount = petition.current_signatures + 1;
    if (petition.target_authority_email && newCount >= petition.goal_signatures) {
      this.notifyAuthorityWhenGoalReached(petitionId).catch((e) => logger.error('Notify authority failed', e));
    }

    logger.info('Petition signed', { petitionId, signerId });
    return signature;
  }

  /** Commentaires sur pétition */
  async addComment(petitionId: string, userId: string, content: string, parentId?: string) {
    const petition = await prisma.civicPetition.findUnique({ where: { id: petitionId } });
    if (!petition || petition.status !== 'active') throw new Error('Petition not found or not active');
    const comment = await prisma.petitionComment.create({
      data: {
        petition_id: petitionId,
        user_id: userId,
        parent_id: parentId || null,
        content: content.slice(0, 2000),
      },
      include: {
        user: { select: { id: true, full_name: true, profile_image: true } },
      },
    });
    return comment;
  }

  async listComments(petitionId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      prisma.petitionComment.findMany({
        where: { petition_id: petitionId, parent_id: null },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, full_name: true, profile_image: true } },
          replies: {
            take: 10,
            orderBy: { created_at: 'asc' },
            include: { user: { select: { id: true, full_name: true, profile_image: true } } },
          },
          _count: { select: { likes: true } },
        },
      }),
      prisma.petitionComment.count({ where: { petition_id: petitionId, parent_id: null } }),
    ]);
    return { comments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await prisma.petitionComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Comment not found');
    const existing = await prisma.petitionCommentLike.findFirst({
      where: { comment_id: commentId, user_id: userId },
    });
    if (existing) {
      await prisma.petitionCommentLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await prisma.petitionCommentLike.create({
      data: { comment_id: commentId, user_id: userId },
    });
    return { liked: true };
  }

  /** Dashboard créateur : signatures/jour, évolution 30j, villes, partages, conversion */
  async getCreatorDashboard(creatorId: string, petitionId?: string) {
    const where: any = { creator_id: creatorId };
    if (petitionId) where.id = petitionId;
    const petitions = await prisma.civicPetition.findMany({
      where,
      include: {
        signatures: {
          select: {
            created_at: true,
            signer_city: true,
            signer_country: true,
          },
        },
      },
    });

    const byPetition = petitions.map((p) => {
      const sigs = p.signatures as { created_at: Date; signer_city: string | null; signer_country: string | null }[];
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const signaturesLast24h = sigs.filter((s) => s.created_at >= dayAgo).length;
      const cities = sigs.reduce((acc: Record<string, number>, s) => {
        const city = s.signer_city || s.signer_country || 'Non renseigné';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {});
      const topCities = Object.entries(cities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      // Signatures par jour (30 derniers jours) pour graphique
      const days: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days[key] = 0;
      }
      sigs.forEach((s) => {
        const key = new Date(s.created_at).toISOString().slice(0, 10);
        if (days[key] !== undefined) days[key]++;
      });
      const signaturesPerDay = Object.entries(days)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));
      return {
        petitionId: p.id,
        title: p.title,
        current_signatures: p.current_signatures,
        goal_signatures: p.goal_signatures,
        conversionRate: p.goal_signatures > 0 ? Math.round((p.current_signatures / p.goal_signatures) * 100) : 0,
        signaturesLast24h,
        signaturesPerDay,
        shares_count: p.shares_count ?? 0,
        topCities,
      };
    });

    return petitionId ? byPetition[0] ?? null : byPetition;
  }

  /** Recommandation pétitions : par pays/région utilisateur, actives, tri par engagement */
  async getRecommendedPetitions(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    });
    const where: any = { status: 'active' };
    if (user?.country) {
      where.OR = [
        { is_national: true },
        { country: user.country },
      ];
    }
    const petitions = await prisma.civicPetition.findMany({
      where,
      take: limit,
      orderBy: [{ current_signatures: 'desc' }, { created_at: 'desc' }],
      include: {
        creator: { select: { id: true, full_name: true, profile_image: true } },
      },
    });
    return petitions;
  }

  async recordShare(petitionId: string) {
    await prisma.civicPetition.update({
      where: { id: petitionId },
      data: { shares_count: { increment: 1 } },
    });
    return { ok: true };
  }

  async savePetition(petitionId: string, userId: string) {
    await prisma.savedPetition.upsert({
      where: {
        petition_id_user_id: { petition_id: petitionId, user_id: userId },
      },
      create: { petition_id: petitionId, user_id: userId },
      update: {},
    });
    return { saved: true };
  }

  async unsavePetition(petitionId: string, userId: string) {
    await prisma.savedPetition.deleteMany({
      where: { petition_id: petitionId, user_id: userId },
    });
    return { saved: false };
  }

  async getSavedPetitions(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [saved, total] = await Promise.all([
      prisma.savedPetition.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { petition: true },
      }),
      prisma.savedPetition.count({ where: { user_id: userId } }),
    ]);
    return {
      petitions: saved.map((s) => s.petition),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Génère un PDF résumé de la pétition + liste signataires (ville, pays, date) */
  private async buildPetitionPdfBuffer(petitionId: string): Promise<Buffer> {
    const petition = await prisma.civicPetition.findUnique({
      where: { id: petitionId },
      include: {
        creator: { select: { full_name: true, email: true } },
        signatures: {
          orderBy: { created_at: 'asc' },
          take: 5000,
          include: { signer: { select: { full_name: true } } },
        },
      },
    });
    if (!petition) return Buffer.alloc(0);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });
      doc.on('data', (chunk) => { chunks.push(chunk as Buffer); });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text(petition.title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Objectif: ${petition.goal_signatures} signatures | Atteint: ${petition.current_signatures}`, { align: 'center' });
      doc.moveDown();
      doc.text(`Résumé: ${petition.description.slice(0, 800)}${petition.description.length > 800 ? '...' : ''}`);
      doc.moveDown();
      doc.text(`Créateur: ${petition.creator?.full_name || '—'} | Date: ${petition.created_at.toISOString().slice(0, 10)}`);
      doc.moveDown(2);
      doc.fontSize(12).text('Liste des signataires', { underline: true });
      doc.moveDown(0.5);
      petition.signatures.forEach((s, i) => {
        const name = (s as { signer?: { full_name: string | null } }).signer?.full_name || 'Anonyme';
        const city = (s as { signer_city: string | null }).signer_city || '—';
        const country = (s as { signer_country: string | null }).signer_country || '—';
        const date = (s as { created_at: Date }).created_at.toISOString().slice(0, 10);
        doc.fontSize(9).text(`${i + 1}. ${name} | ${city} (${country}) | ${date}`);
      });
      doc.end();
    });
  }

  /** Quand objectif atteint : notifier autorité (email + PDF en pièce jointe) */
  private async notifyAuthorityWhenGoalReached(petitionId: string) {
    const petition = await prisma.civicPetition.findUnique({
      where: { id: petitionId },
      include: { creator: { select: { full_name: true, email: true } } },
    });
    if (!petition?.target_authority_email) return;
    const count = await prisma.petitionSignature.count({ where: { petition_id: petitionId } });
    if (count < petition.goal_signatures) return;

    const subject = `[Pétition atteinte] ${petition.title}`;
    const body = `La pétition "${petition.title}" a atteint son objectif de ${petition.goal_signatures} signatures (${count} au total).\n\nCréateur: ${petition.creator?.full_name}\n\nRésumé: ${petition.description.slice(0, 500)}...\n\nVoir le fichier PDF en pièce jointe pour la liste des signataires.`;
    try {
      const pdfBuffer = await this.buildPetitionPdfBuffer(petitionId);
      const { sendViaResend } = await import('../utils/transactionalEmail.js');
      if (process.env.RESEND_API_KEY?.trim()) {
        const ok = await sendViaResend({
          to: petition.target_authority_email,
          subject,
          text: body,
          html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</pre>`,
          attachments:
            pdfBuffer.length > 0
              ? [{ filename: `petition-${petitionId}-signataires.pdf`, content: pdfBuffer }]
              : undefined,
        });
        if (ok) {
          logger.info('Authority notified via Resend', { petitionId, to: petition.target_authority_email });
          return;
        }
        logger.warn('Resend authority mail failed, fallback SMTP', { petitionId });
      }
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      const attachments = pdfBuffer.length > 0
        ? [{ filename: `petition-${petitionId}-signataires.pdf`, content: pdfBuffer }]
        : [];
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@afriwonder.app',
        to: petition.target_authority_email,
        subject,
        text: body,
        attachments,
      });
      logger.info('Authority notified with PDF (SMTP)', { petitionId, to: petition.target_authority_email });
    } catch (e) {
      logger.error('Authority email failed', { petitionId, error: e });
    }
  }

  // Commission plateforme : 5% sur les dons
  private readonly PLATFORM_COMMISSION_RATE = 0.05;

  /**
   * Faire un don à une pétition
   */
  async donate(petitionId: string, donorId: string, data: {
    amount: number;
    phone: string;
    message?: string;
  }) {
    const petition = await prisma.civicPetition.findUnique({
      where: { id: petitionId },
      include: {
        creator: true,
      },
    });

    if (!petition || petition.status !== 'active') {
      throw new Error('Petition not found or not active');
    }

    // Calculer les montants
    const platformFee = data.amount * this.PLATFORM_COMMISSION_RATE;
    const creatorAmount = data.amount - platformFee;

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: donorId,
        type: 'petition_donation',
        amount: data.amount,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Don pétition - ${petition.title}${data.message ? ` - ${data.message}` : ''}`,
        reference_id: petitionId,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        donorId,
        transaction.id,
        {
          amount: data.amount,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/civic/${petitionId}?donation=success`,
        }
      );

      logger.info('Petition donation created and Orange Money payment initiated', {
        petitionId,
        donorId,
        amount: data.amount,
      });

      return {
        transactionId: transaction.id,
        petitionId,
        paymentUrl: paymentResult.paymentUrl,
      };
    } catch (error: any) {
      await prisma.transaction.delete({ where: { id: transaction.id } });
      throw error;
    }
  }

  /**
   * Confirmer un don à une pétition
   */
  async confirmDonation(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'petition_donation') {
      throw new Error('Transaction not found or invalid type');
    }

    const petition = await prisma.civicPetition.findUnique({
      where: { id: transaction.reference_id! },
      include: {
        creator: true,
      },
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    // Calculer les montants
    const platformFee = transaction.amount * this.PLATFORM_COMMISSION_RATE;
    const creatorAmount = transaction.amount - platformFee;

    // Mettre à jour la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'completed',
      },
    });

    // Créditer le wallet du créateur (ou organiser le don)
    const withdrawalService = (await import('./withdrawal.service.js')).default;
    const sellerWallet = await withdrawalService.getSellerWallet(petition.creator_id);
    
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: {
        balance: {
          increment: creatorAmount,
        },
      },
    });

    // Créer transaction pour le créateur
    await prisma.transaction.create({
      data: {
        user_id: petition.creator_id,
        type: 'petition_received',
        amount: creatorAmount,
        currency: 'XOF',
        status: 'completed',
        description: `Don reçu - Pétition ${petition.title} (${transaction.amount} FCFA - commission: ${platformFee} FCFA)`,
        reference_id: transactionId,
        payment_method: 'internal',
      },
    });

    // Créditer la plateforme (commission 5%)
    await platformRevenueService.addRevenue(
      platformFee,
      'petitions',
      `Commission pétition - ${petition.title} (${transaction.amount} FCFA)`,
      transactionId
    );

    // Note: Le modèle CivicPetition n'a pas de champ current_donations
    // Les dons sont trackés via les transactions
    // On peut ajouter un champ plus tard si nécessaire

    logger.info('Petition donation confirmed', {
      transactionId,
      petitionId: petition.id,
      creatorAmount,
      platformFee,
    });

    return {
      transaction,
      petition,
    };
  }
}

export default new CivicService();

