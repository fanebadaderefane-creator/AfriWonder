import { createRequire } from 'module';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const BASE_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

/**
 * Service pour gérer les certificats vérifiés (payants)
 * Frais : 100% pour la plateforme
 */
class CertificateService {
  // Frais de certification vérifiée : 2000 FCFA (100% pour la plateforme)
  private readonly VERIFIED_CERTIFICATE_FEE = 2000;

  /**
   * Liste des certificats de l'utilisateur connecté (pour page "Mes certificats").
   */
  async listByUser(userId: string) {
    const certs = await prisma.certificate.findMany({
      where: { user_id: userId },
      orderBy: { issued_at: 'desc' },
      include: {
        course: {
          select: { id: true, title: true, creator: { select: { full_name: true, username: true } } },
        },
      },
    });
    return certs.map((c) => ({
      id: c.id,
      verification_token: c.verification_token,
      certificate_url: c.certificate_url,
      issued_at: c.issued_at,
      course_title: c.course.title,
      instructor_name: c.course.creator?.full_name || c.course.creator?.username || '—',
    }));
  }

  /**
   * Vérifier un certificat par son token (public, pas d'auth).
   */
  async verifyByToken(token: string) {
    if (!token?.trim()) return null;
    const cert = await prisma.certificate.findUnique({
      where: { verification_token: token.trim() },
      include: {
        course: { select: { id: true, title: true, creator_id: true } },
        user: { select: { id: true, full_name: true, username: true } },
      },
    });
    if (!cert) return null;
    return {
      id: cert.id,
      verification_token: cert.verification_token,
      issued_at: cert.issued_at,
      course: cert.course,
      user: cert.user,
    };
  }

  /**
   * Demander un certificat vérifié (payant)
   */
  async requestVerifiedCertificate(certificateId: string, userId: string, data: {
    phone: string;
  }) {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        course: true,
      },
    });

    if (!certificate || certificate.user_id !== userId) {
      throw new Error('Certificate not found or unauthorized');
    }

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'certificate_verification',
        amount: this.VERIFIED_CERTIFICATE_FEE,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Certificat vérifié - ${certificate.course.title}`,
        reference_id: certificateId,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        userId,
        transaction.id,
        {
          amount: this.VERIFIED_CERTIFICATE_FEE,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/certificates/${certificateId}?verification=success`,
        }
      );

      logger.info('Verified certificate request created and Orange Money payment initiated', {
        certificateId,
        userId,
        amount: this.VERIFIED_CERTIFICATE_FEE,
      });

      return {
        certificateId,
        transactionId: transaction.id,
        paymentUrl: paymentResult.paymentUrl,
      };
    } catch (error: any) {
      await prisma.transaction.delete({ where: { id: transaction.id } });
      throw error;
    }
  }

  /**
   * Confirmer le paiement d'un certificat vérifié
   */
  async confirmVerificationPayment(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'certificate_verification') {
      throw new Error('Transaction not found or invalid type');
    }

    // Mettre à jour la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'completed',
      },
    });

    // Créditer la plateforme (100% des frais)
    await platformRevenueService.addRevenue(
      transaction.amount,
      'certificates',
      `Frais certificat vérifié - ${transaction.reference_id}`,
      transactionId
    );

    // Marquer le certificat comme vérifié (ajouter un champ si nécessaire)
    // Pour l'instant, on peut utiliser un champ dans Certificate ou créer une table séparée

    logger.info('Verified certificate payment confirmed', {
      transactionId,
      certificateId: transaction.reference_id,
    });

    return transaction;
  }

  /**
   * Génère le PDF du certificat (nom, titre cours, date, QR code vérification, signature).
   */
  async generateCertificatePdf(certificateId: string, userId: string): Promise<Buffer> {
    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        course: { select: { title: true } },
        user: { select: { full_name: true, username: true } },
      },
    });
    if (!cert || cert.user_id !== userId) throw new Error('Certificat non trouvé ou non autorisé');

    const verifyUrl = `${BASE_ORIGIN}/verify-certificate/${cert.verification_token}`;
    const userName = cert.user?.full_name || cert.user?.username || 'Récipiendaire';
    const courseTitle = cert.course?.title || 'Cours';
    const issuedDate = new Date(cert.issued_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const qrBuffer = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 120, margin: 1 });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(24).text('Certificat de réussite', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(10).text('Ceci certifie que', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).text(userName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text('a suivi et réussi le cours', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text(courseTitle, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Délivré le ${issuedDate}`, { align: 'center' });
      doc.moveDown(2);

      doc.image(qrBuffer, doc.page.width / 2 - 60, doc.y, { width: 120, height: 120 });
      doc.y += 130;
      doc.fontSize(8).fillColor('#666').text('Vérifier ce certificat:', { align: 'center' });
      doc.text(verifyUrl, { align: 'center', width: 400 });
      doc.moveDown(2);

      doc.moveTo(50, doc.page.height - 100);
      doc.lineTo(doc.page.width - 50, doc.page.height - 100);
      doc.stroke();
      doc.fontSize(8).fillColor('#333').text('Signature digitale — AfriWonder', 50, doc.page.height - 90, {
        width: doc.page.width - 100,
        align: 'center',
      });
      doc.text(`Token: ${cert.verification_token}`, { align: 'center' });

      doc.end();
    });
  }
}

export const certificateService = new CertificateService();
export default certificateService;

