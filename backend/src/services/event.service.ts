/**
 * Service Événements — billetterie, check-in, paiement, dashboard organisateur
 */
import { createRequire } from 'module';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import notificationService from './notification.service.js';
import crypto from 'crypto';
import { signQr, verifyQr } from '../utils/ticketingQr.js';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

const PLATFORM_FEE_PCT = 0.12;
const FEATURED_EVENT_PRICE = 5000; // XOF
const FEATURED_EVENT_DAYS = 7;

function generateQrToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

class EventService {
  async list(page: number = 1, limit: number = 20, filters?: {
    category?: string;
    location?: string;
    event_type?: string;
    startDate?: Date;
    search?: string;
    status?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = { status: filters?.status ?? 'published' };

    if (filters?.category) where.category = filters.category;
    if (filters?.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters?.event_type) where.event_type = filters.event_type;
    if (filters?.startDate) where.start_date = { gte: filters.startDate };
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { organizer_name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: { select: { id: true, username: true, full_name: true, profile_image: true } },
        },
        orderBy: [
          { is_featured: 'desc' },
          { start_date: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    const eventIds = events.map((e: any) => e.id);
    const soldByEvent = eventIds.length > 0
      ? await prisma.eventTicket.groupBy({
          by: ['event_id'],
          where: { event_id: { in: eventIds }, payment_status: 'paid' },
          _count: { id: true },
        })
      : [];
    const soldMap = Object.fromEntries(soldByEvent.map((s: any) => [s.event_id, s._count.id]));

    const withCapacity = events.map((e: any) => {
      const sold = soldMap[e.id] ?? 0;
      const cap = e.capacity ?? null;
      const remaining = cap == null ? null : Math.max(0, cap - sold);
      return { ...e, tickets_sold: sold, capacity_remaining: remaining };
    });

    return {
      events: withCapacity,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, userId?: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, username: true, full_name: true, profile_image: true } },
        _count: { select: { tickets: true, likes: true, comments: true } },
      },
    });
    if (!event) throw new Error('Événement non trouvé');

    const paidCount = await prisma.eventTicket.count({
      where: { event_id: id, payment_status: 'paid' },
    });
    const cap = (event as any).capacity ?? null;
    const capacity_remaining = cap == null ? null : Math.max(0, cap - paidCount);

    let userTicket: any = null;
    let userLiked = false;
    if (userId) {
      userTicket = await prisma.eventTicket.findFirst({
        where: { event_id: id, user_id: userId, payment_status: 'paid' },
      });
      const like = await prisma.eventLike.findUnique({
        where: { 
          event_id_user_id: {
            event_id: id,
            user_id: userId
          }
        },
      });
      userLiked = !!like;
    }

    const e = event as any;
    const { _count, ...rest } = e;
    return {
      ...rest,
      tickets_sold: paidCount,
      capacity_remaining,
      user_has_ticket: !!userTicket,
      user_liked: userLiked,
      likes_count: _count?.likes ?? 0,
      comments_count: _count?.comments ?? 0,
    };
  }

  async create(organizerId: string, data: {
    title: string;
    description?: string;
    location?: string;
    startDate: Date;
    endDate: Date;
    price?: number;
    category?: string;
    image?: string;
    event_type?: string;
    capacity?: number;
    currency?: string;
    is_free?: boolean;
    is_featured?: boolean;
    virtual_url?: string;
    refund_policy?: string;
    speakers?: Array<{ name: string; role?: string; photo?: string }>;
    sponsors?: Array<{ name: string; logo_url?: string; link?: string }>;
    ticket_types?: Array<{ name: string; description?: string; price?: number; quantity_available: number; currency?: string; max_per_user?: number; sale_start?: Date; sale_end?: Date }>;
  }) {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
      select: { full_name: true, username: true },
    });
    const event = await prisma.event.create({
      data: {
        organizer_id: organizerId,
        organizer_name: organizer?.full_name || organizer?.username || 'Organisateur',
        title: data.title,
        description: data.description,
        location: data.location,
        image: data.image,
        start_date: data.startDate,
        end_date: data.endDate,
        price: data.price ?? 0,
        category: data.category,
        event_type: data.event_type || 'physical',
        capacity: data.capacity,
        currency: data.currency || 'XOF',
        is_free: data.is_free ?? (data.price == null || data.price === 0),
        is_featured: data.is_featured ?? false,
        status: 'pending', // Événement en attente d'approbation admin
        virtual_url: data.virtual_url,
        refund_policy: data.refund_policy,
        speakers: data.speakers ? (data.speakers as any) : undefined,
        sponsors: data.sponsors ? (data.sponsors as any) : undefined,
      },
    });

    if (data.ticket_types?.length) {
      const ticketTypeModel = (prisma as any).eventTicketType;
      if (ticketTypeModel) {
        for (const tt of data.ticket_types) {
          await ticketTypeModel.create({
            data: {
              event_id: event.id,
              name: tt.name,
              description: tt.description ?? undefined,
              price: tt.price ?? 0,
              currency: tt.currency ?? data.currency ?? 'XOF',
              quantity_available: Math.max(0, tt.quantity_available ?? 0),
              max_per_user: tt.max_per_user ?? undefined,
              sale_start: tt.sale_start ? new Date(tt.sale_start) : undefined,
              sale_end: tt.sale_end ? new Date(tt.sale_end) : undefined,
            },
          });
        }
      }
    }

    // Notifier les admins pour approbation
    try {
      const admins = await prisma.user.findMany({
        where: { 
          role: { in: ['super_admin', 'admin', 'moderation_admin'] } 
        },
        select: { id: true },
      });
      
      const organizerName = organizer?.full_name || organizer?.username || 'Un organisateur';
      
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            user_id: admin.id,
            type: 'event_pending_approval',
            title: 'Nouvel événement en attente d\'approbation',
            message: `${organizerName} a créé un nouvel événement "${data.title}". Veuillez l'examiner et l'approuver.`,
            reference_type: 'event',
            reference_id: event.id,
          },
        });
      }
    } catch (notifErr) {
      logger.warn('Notification admin événement', { err: (notifErr as Error).message });
    }

    logger.info('Event created (pending approval)', { organizerId, eventId: event.id });
    return event;
  }

  /**
   * Approuver un événement (Admin seulement)
   */
  async approveEvent(eventId: string, adminId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizer: { select: { id: true, username: true, full_name: true } } },
    });
    if (!event) throw new Error('Événement non trouvé');
    if (event.status !== 'pending') {
      throw new Error(`L'événement est déjà ${event.status}`);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'published' },
    });

    // Notifier l'organisateur
    try {
      await prisma.notification.create({
        data: {
          user_id: event.organizer_id,
          type: 'event_approved',
          title: 'Événement approuvé',
          message: `Votre événement "${event.title}" a été approuvé et est maintenant visible par tous.`,
          reference_type: 'event',
          reference_id: eventId,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification organisateur événement approuvé', { err: (notifErr as Error).message });
    }

    logger.info('Event approved', { eventId, adminId });
    return updated;
  }

  /**
   * Rejeter un événement (Admin seulement)
   */
  async rejectEvent(eventId: string, adminId: string, reason?: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new Error('Événement non trouvé');
    if (event.status !== 'pending') {
      throw new Error(`L'événement est déjà ${event.status}`);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'draft' }, // Retour en brouillon
    });

    // Notifier l'organisateur
    try {
      await prisma.notification.create({
        data: {
          user_id: event.organizer_id,
          type: 'event_rejected',
          title: 'Événement rejeté',
          message: reason 
            ? `Votre événement "${event.title}" a été rejeté. Raison: ${reason}`
            : `Votre événement "${event.title}" a été rejeté. Veuillez vérifier les informations et réessayer.`,
          reference_type: 'event',
          reference_id: eventId,
        },
      });
    } catch (notifErr) {
      logger.warn('Notification organisateur événement rejeté', { err: (notifErr as Error).message });
    }

    logger.info('Event rejected', { eventId, adminId, reason });
    return updated;
  }

  /**
   * Obtenir les événements en attente d'approbation (Admin seulement)
   */
  async getPendingEvents() {
    return await prisma.event.findMany({
      where: { status: 'pending' },
      include: {
        organizer: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async update(eventId: string, organizerId: string, data: Record<string, any>) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new Error('Événement non trouvé ou non autorisé');

    const updateData: Record<string, any> = {};
    const allowed = ['title', 'description', 'category', 'image', 'location', 'start_date', 'end_date', 'event_type', 'capacity', 'price', 'currency', 'is_free', 'is_featured', 'featured_until', 'status', 'virtual_url', 'replay_url', 'refund_policy', 'speakers', 'sponsors'];
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (data.startDate) updateData.start_date = data.startDate;
    if (data.endDate) updateData.end_date = data.endDate;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });
    logger.info('Event updated', { eventId, organizerId });
    return updated;
  }

  async getRemainingCapacity(eventId: string): Promise<number | null> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { capacity: true },
    });
    if (!event || event.capacity == null) return null;
    const sold = await prisma.eventTicket.count({
      where: { event_id: eventId, payment_status: 'paid' },
    });
    return Math.max(0, event.capacity - sold);
  }

  /**
   * Réserver / acheter des billets (gratuit ou payant)
   */
  async bookTicket(eventId: string, userId: string, data: {
    phone?: string;
    quantity?: number;
    ticket_type?: string;
    payment_method?: string;
    city?: string;
    source?: string;
  }) {
    const quantity = Math.max(1, data.quantity ?? 1);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { organizer: true, ticket_types: true },
    });
    if (!event) throw new Error('Événement non trouvé');
    if (event.status !== 'published') throw new Error('Événement non ouvert aux réservations');

    const ticketTypeName = data.ticket_type || 'standard';
    const eventWithTypes = event as any;
    const ticketTypes = eventWithTypes.ticket_types ?? [];

    let unitPrice: number;
    let eventTicketTypeId: string | null = null;

    if (ticketTypes.length > 0) {
      const tt = ticketTypes.find((t: any) => t.name === ticketTypeName);
      if (!tt) throw new Error(`Type de billet "${ticketTypeName}" inconnu. Types: ${ticketTypes.map((t: any) => t.name).join(', ')}`);
      const remaining = tt.quantity_available - (tt.quantity_sold ?? 0);
      if (remaining < quantity) throw new Error(`Plus que ${remaining} place(s) pour ce type.`);
      unitPrice = tt.price ?? 0;
      eventTicketTypeId = tt.id;
    } else {
      const remaining = await this.getRemainingCapacity(eventId);
      if (remaining !== null && remaining < quantity) {
        throw new Error(`Plus que ${remaining} place(s) restante(s).`);
      }
      unitPrice = event.price ?? 0;
    }

    const isFree = event.is_free || unitPrice === 0;
    const totalAmount = unitPrice * quantity;

    if (!isFree && totalAmount > 0) {
      const payment = await prisma.eventPayment.create({
        data: {
          event_id: eventId,
          user_id: userId,
          amount: totalAmount,
          currency: event.currency || 'XOF',
          provider: data.payment_method || 'orange_money',
          status: 'pending',
          city: data.city || undefined,
          source: data.source || undefined,
        },
      });

      const returnUrl = `${process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:5173'}/events/${eventId}?booking=success&paymentId=${payment.id}`;
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(userId, payment.id, {
        amount: totalAmount,
        phone: data.phone || '',
        returnUrl,
      });

      return {
        payment_id: payment.id,
        event_id: eventId,
        quantity,
        total_amount: totalAmount,
        payment_url: paymentResult.paymentUrl,
        message: 'Redirigez vers payment_url pour payer.',
      };
    }

    const city = data.city || undefined;
    const source = data.source || undefined;
    const tickets: any[] = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await prisma.eventTicket.create({
        data: {
          event_id: eventId,
          user_id: userId,
          ticket_type: ticketTypeName,
          event_ticket_type_id: eventTicketTypeId ?? undefined,
          price: unitPrice,
          currency: event.currency || 'XOF',
          payment_status: 'paid',
          qr_code: generateQrToken(),
          city,
          source,
        } as any,
      });
      const sig = signQr(ticket.id, eventId);
      await prisma.eventTicket.update({ where: { id: ticket.id }, data: { qr_signature: sig } as any });
      tickets.push({ ...ticket, qr_signature: sig });
    }

    if (eventTicketTypeId) {
      await (prisma as any).eventTicketType?.update({
        where: { id: eventTicketTypeId },
        data: { quantity_sold: { increment: quantity } },
      });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { attendees_count: { increment: quantity } },
    });

    await prisma.eventAttendance.upsert({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } },
      create: { event_id: eventId, user_id: userId, status: 'registered' },
      update: {},
    });

    try {
      await notificationService.create(userId, {
        type: 'event_ticket',
        title: 'Inscription confirmée',
        message: `Vous êtes inscrit à "${event.title}".`,
        reference_type: 'event',
        reference_id: eventId,
      });
    } catch (e) {
      logger.warn('Event notification skip', { eventId, userId });
    }

    logger.info('Event tickets booked (free)', { eventId, userId, quantity, ticketIds: tickets.map((t: any) => t.id) });
    return {
      tickets,
      event_id: eventId,
      quantity,
      total_amount: 0,
      message: 'Inscription gratuite confirmée.',
    };
  }

  /** Confirmer paiement billet (webhook ou callback) */
  async confirmTicketPayment(paymentId: string, transactionId?: string) {
    const payment = await prisma.eventPayment.findUnique({
      where: { id: paymentId },
      include: { event: { include: { ticket_types: true } } },
    });
    if (!payment || payment.status === 'completed') {
      throw new Error('Paiement non trouvé ou déjà traité');
    }

    const event = payment.event as any;
    const ticketTypes = event?.ticket_types ?? [];
    let ticketTypeName = 'standard';
    let eventTicketTypeId: string | null = null;
    let pricePerTicket = event.price ?? 0;
    if (ticketTypes.length > 0) {
      const tt = ticketTypes.find((t: any) => (t.price ?? 0) > 0) || ticketTypes[0];
      ticketTypeName = tt.name;
      eventTicketTypeId = tt.id;
      pricePerTicket = tt.price ?? 0;
    }
    const quantity = pricePerTicket > 0 ? Math.round(payment.amount / pricePerTicket) : 1;

    const city = (payment as any).city ?? undefined;
    const source = (payment as any).source ?? undefined;
    const tickets: any[] = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await prisma.eventTicket.create({
        data: {
          event_id: payment.event_id,
          user_id: payment.user_id,
          ticket_type: ticketTypeName,
          event_ticket_type_id: eventTicketTypeId ?? undefined,
          price: pricePerTicket,
          currency: payment.event.currency || 'XOF',
          payment_status: 'paid',
          payment_method: payment.provider,
          transaction_id: transactionId || paymentId,
          qr_code: generateQrToken(),
          city,
          source,
        } as any,
      });
      const sig = signQr(ticket.id, payment.event_id);
      await prisma.eventTicket.update({ where: { id: ticket.id }, data: { qr_signature: sig } as any });
      tickets.push({ ...ticket, qr_signature: sig });
    }
    if (eventTicketTypeId) {
      await (prisma as any).eventTicketType?.update({
        where: { id: eventTicketTypeId },
        data: { quantity_sold: { increment: quantity } },
      });
    }

    await prisma.eventPayment.update({
      where: { id: paymentId },
      data: { status: 'completed', paid_at: new Date() },
    });

    // Billetterie AfriWonder : 10-15% commission ticket (défaut 12.5%)
    const commissionService = (await import('./commission.service.js')).default;
    const feePct = payment.event.platform_fee_pct ?? undefined;
    const { platform: platformFee, organizer: organizerEarnings } = commissionService.ticketingTicket(payment.amount, feePct ? feePct / 100 : undefined);

    await platformRevenueService.addRevenue(
      platformFee,
      'events',
      `Commission événement - ${payment.event.title}`,
      paymentId
    );

    const sellerWallet = await withdrawalService.getSellerWallet(payment.event.organizer_id);
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: { balance: { increment: organizerEarnings } },
    });

    await prisma.event.update({
      where: { id: payment.event_id },
      data: { attendees_count: { increment: quantity } },
    });

    await prisma.eventAttendance.upsert({
      where: { event_id_user_id: { event_id: payment.event_id, user_id: payment.user_id } },
      create: { event_id: payment.event_id, user_id: payment.user_id, status: 'registered' },
      update: {},
    });

    try {
      await notificationService.create(payment.user_id, {
        type: 'event_ticket',
        title: 'Paiement confirmé',
        message: `Votre billet pour "${payment.event.title}" est confirmé.`,
        reference_type: 'event',
        reference_id: payment.event_id,
      });
    } catch (e) {
      logger.warn('Event notification skip', { eventId: payment.event_id });
    }

    logger.info('Event ticket payment confirmed', { paymentId, eventId: payment.event_id, quantity });
    return { payment, tickets };
  }

  /** Check-in par QR code — QR signé + anti-double scan */
  async checkIn(qrCode: string) {
    const ticket = await prisma.eventTicket.findUnique({
      where: { qr_code: qrCode },
      include: { event: true, user: { select: { id: true, full_name: true, username: true } } },
    });
    if (!ticket) throw new Error('Billet non trouvé');
    if (ticket.payment_status !== 'paid') throw new Error('Billet non payé');
    if (ticket.checked_in) throw new Error('Déjà check-in (double scan bloqué)');
    const sig = (ticket as any).qr_signature;
    if (sig && !verifyQr(sig, ticket.id, ticket.event_id)) throw new Error('QR invalide (signature)');

    const updated = await prisma.eventTicket.updateMany({
      where: { id: ticket.id, checked_in: false },
      data: { checked_in: true, checked_in_at: new Date(), scan_count: { increment: 1 } } as any,
    });
    if (updated.count === 0) throw new Error('Déjà check-in (double scan bloqué)');

    await prisma.eventAttendance.updateMany({
      where: { event_id: ticket.event_id, user_id: ticket.user_id },
      data: { status: 'attended' },
    });

    logger.info('Event check-in', { ticketId: ticket.id, eventId: ticket.event_id });
    return {
      success: true,
      ticket_id: ticket.id,
      attendee_name: (ticket.user as any)?.full_name || (ticket.user as any)?.username,
      event_title: ticket.event.title,
    };
  }

  /** Remboursement billet — payment_status = refunded */
  async refundTicket(ticketId: string, userId?: string) {
    const ticket = await prisma.eventTicket.findUnique({
      where: { id: ticketId },
      include: { event: true },
    });
    if (!ticket) throw new Error('Billet non trouvé');
    if (ticket.payment_status !== 'paid') throw new Error('Billet non payé ou déjà remboursé');
    if (userId && ticket.user_id !== userId) throw new Error('Non autorisé');
    const tid = (ticket as any).event_ticket_type_id;
    await prisma.eventTicket.update({
      where: { id: ticketId },
      data: { payment_status: 'refunded' },
    });
    if (tid) {
      await (prisma as any).eventTicketType?.update({
        where: { id: tid },
        data: { quantity_sold: { decrement: 1 } },
      }).catch(() => {});
    }
    logger.info('Event ticket refunded', { ticketId, eventId: ticket.event_id });
    return { success: true, ticket_id: ticketId };
  }

  /** Lock temporaire (2 min) pour checkout — évite survente */
  async createLock(eventId: string, ticketType: string, userId: string, quantity: number) {
    const { getLockExpiry } = await import('../utils/ticketingQr.js');
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticket_types: true },
    });
    if (!event) throw new Error('Événement non trouvé');
    const ev = event as any;
    if (ev.ticket_types?.length > 0) {
      const tt = ev.ticket_types.find((t: any) => t.name === ticketType);
      if (!tt) throw new Error(`Type de billet "${ticketType}" inconnu`);
      const remaining = (tt.quantity_available ?? 0) - (tt.quantity_sold ?? 0);
      if (remaining < quantity) throw new Error('Stock insuffisant pour ce type');
    } else {
      const remaining = await this.getRemainingCapacity(eventId);
      if (remaining !== null && remaining < quantity) throw new Error('Stock insuffisant');
    }
    try {
      await (prisma as any).ticketLock?.deleteMany?.({ where: { expires_at: { lt: new Date() } } });
    } catch (_) {}
    try {
      const ticketLock = (prisma as any).ticketLock;
      if (!ticketLock) return { lock_id: null, expires_at: getLockExpiry(), message: 'Lock non disponible' };
      const lock = await ticketLock.create({
        data: {
          event_id: eventId,
          ticket_type: ticketType,
          user_id: userId,
          quantity,
          expires_at: getLockExpiry(),
        },
      });
      return { lock_id: lock.id, expires_at: lock.expires_at };
    } catch (e) {
      logger.warn('Ticket lock create failed', { eventId, e });
      return { lock_id: null, expires_at: getLockExpiry(), message: 'Lock non disponible' };
    }
  }

  async listMyTickets(userId: string) {
    return prisma.eventTicket.findMany({
      where: { user_id: userId, payment_status: 'paid' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            image: true,
            start_date: true,
            end_date: true,
            location: true,
            event_type: true,
            virtual_url: true,
            status: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getOrganizerDashboard(eventId: string, organizerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new Error('Événement non trouvé ou non autorisé');

    const paidTickets = await prisma.eventTicket.findMany({
      where: { event_id: eventId, payment_status: 'paid' },
      include: { user: { select: { id: true, full_name: true, username: true, email: true } } },
    });

    const payments = await prisma.eventPayment.findMany({
      where: { event_id: eventId, status: 'completed' },
    });
    const revenue = payments.reduce((s, p) => s + p.amount, 0);
    const checkedIn = await prisma.eventTicket.count({
      where: { event_id: eventId, payment_status: 'paid', checked_in: true },
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        capacity: event.capacity,
        status: event.status,
        is_featured: (event as any).is_featured ?? false,
        featured_until: (event as any).featured_until ?? null,
      },
      tickets_sold: paidTickets.length,
      capacity_remaining: event.capacity == null ? null : Math.max(0, event.capacity - paidTickets.length),
      revenue,
      checked_in_count: checkedIn,
      participants: paidTickets.map((t) => ({
        ticket_id: t.id,
        qr_code: t.qr_code,
        checked_in: t.checked_in,
        checked_in_at: t.checked_in_at,
        user: t.user,
      })),
    };
  }

  async like(eventId: string, userId: string) {
    const existing = await prisma.eventLike.findUnique({
      where: { 
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      },
    });
    if (existing) {
      await prisma.eventLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await prisma.eventLike.create({
      data: { event_id: eventId, user_id: userId },
    });
    return { liked: true };
  }

  async addComment(eventId: string, userId: string, content: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Événement non trouvé');
    return prisma.eventComment.create({
      data: { event_id: eventId, user_id: userId, content },
      include: { user: { select: { id: true, full_name: true, username: true, profile_image: true } } },
    });
  }

  async listComments(eventId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      prisma.eventComment.findMany({
        where: { event_id: eventId },
        include: { user: { select: { id: true, full_name: true, username: true, profile_image: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.eventComment.count({ where: { event_id: eventId } }),
    ]);
    return { comments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async cancelTicket(ticketId: string, userId: string) {
    const ticket = await prisma.eventTicket.findFirst({
      where: { id: ticketId, user_id: userId },
      include: { event: true },
    });
    if (!ticket) throw new Error('Billet non trouvé');
    if (ticket.payment_status === 'refunded') throw new Error('Billet déjà remboursé');

    await prisma.eventTicket.update({
      where: { id: ticketId },
      data: { payment_status: 'refunded' },
    });

    await prisma.event.update({
      where: { id: ticket.event_id },
      data: { attendees_count: { decrement: 1 } },
    });

    await prisma.eventPayment.updateMany({
      where: { event_id: ticket.event_id, user_id: userId, status: 'completed' },
      data: { status: 'refunded', refunded_at: new Date() },
    });

    logger.info('Event ticket cancelled', { ticketId, userId, eventId: ticket.event_id });
    return { success: true, message: 'Billet annulé.' };
  }

  /** Export CSV des participants (organisateur) */
  async exportParticipantsCsv(eventId: string, organizerId: string): Promise<string> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new Error('Événement non trouvé ou non autorisé');

    const tickets = await prisma.eventTicket.findMany({
      where: { event_id: eventId, payment_status: 'paid' },
      include: { user: { select: { full_name: true, username: true, email: true } } },
    });

    const header = 'Email;Nom;Username;QR Code;Check-in;Date check-in\n';
    const rows = tickets.map((t) => {
      const u = t.user as any;
      const email = (u?.email || '').replace(/;/g, ',');
      const name = (u?.full_name || u?.username || '').replace(/;/g, ',');
      const username = (u?.username || '').replace(/;/g, ',');
      const qr = (t.qr_code || '').replace(/;/g, ',');
      const checked = t.checked_in ? 'Oui' : 'Non';
      const checkedAt = t.checked_in_at ? new Date(t.checked_in_at).toISOString() : '';
      return `${email};${name};${username};${qr};${checked};${checkedAt}`;
    });
    return '\uFEFF' + header + rows.join('\n'); // BOM for Excel UTF-8
  }

  /** Envoyer une notification à tous les inscrits (organisateur) */
  async notifyAllParticipants(eventId: string, organizerId: string, message: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new Error('Événement non trouvé ou non autorisé');

    const tickets = await prisma.eventTicket.findMany({
      where: { event_id: eventId, payment_status: 'paid' },
      select: { user_id: true },
    });
    const userIds = [...new Set(tickets.map((t) => t.user_id))];

    for (const uid of userIds) {
      try {
        await notificationService.create(uid, {
          type: 'event_message',
          title: `Message de l'organisateur — ${event.title}`,
          message,
          reference_type: 'event',
          reference_id: eventId,
        });
      } catch (e) {
        logger.warn('Event notify participant skip', { userId: uid, eventId });
      }
    }
    logger.info('Event notify all participants', { eventId, count: userIds.length });
    return { sent: userIds.length };
  }

  /** Clôturer l'événement (organisateur) */
  async closeEvent(eventId: string, organizerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new Error('Événement non trouvé ou non autorisé');
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'completed' },
    });
    logger.info('Event closed', { eventId, organizerId });
    return updated;
  }

  /** Générer le PDF du billet (titulaire du billet uniquement) */
  async generateTicketPdf(ticketId: string, userId: string): Promise<Buffer> {
    const ticket = await prisma.eventTicket.findFirst({
      where: { id: ticketId, user_id: userId, payment_status: 'paid' },
      include: {
        event: true,
        user: { select: { full_name: true, username: true, email: true } },
      },
    });
    if (!ticket) throw new Error('Billet non trouvé ou non autorisé');

    const event = ticket.event;
    const user = ticket.user as any;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A5' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Billet d\'entrée', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(event.title, { align: 'center' });
      doc.fontSize(10)
        .text(`${new Date(event.start_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { align: 'center' })
        .text(event.location || 'Lieu communiqué ultérieurement', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).text('Participant', { continued: false });
      doc.fontSize(10).text(user?.full_name || user?.username || 'Participant');
      doc.text(`Code check-in (QR) : ${ticket.qr_code || ticket.id}`);
      doc.moveDown(2);

      doc.rect(50, doc.y, doc.page.width - 100, 80).stroke();
      doc.fontSize(9).text(`Présentez ce code à l'entrée : ${ticket.qr_code || ticket.id}`, 55, doc.y + 10, { width: doc.page.width - 110 });
      doc.moveDown(3);

      doc.fontSize(8).fillColor('gray')
        .text('AfriWonder — Billet généré automatiquement. Merci de votre confiance.', 50, doc.page.height - 40);

      doc.end();
    });
  }

  /** Envoyer les rappels 24h et 1h avant le début des événements (à appeler par cron) */
  async sendUpcomingReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 55 * 60 * 1000);
    const in1hEnd = new Date(now.getTime() + 65 * 60 * 1000);

    const events24h = await prisma.event.findMany({
      where: {
        status: 'published',
        start_date: { gte: in24h, lte: in24hEnd },
      },
      select: { id: true, title: true, start_date: true, location: true },
    });
    const events1h = await prisma.event.findMany({
      where: {
        status: 'published',
        start_date: { gte: in1h, lte: in1hEnd },
      },
      select: { id: true, title: true, start_date: true, location: true },
    });

    let sent24 = 0;
    let sent1h = 0;

    for (const ev of events24h) {
      const tickets = await prisma.eventTicket.findMany({
        where: { event_id: ev.id, payment_status: 'paid' },
        select: { user_id: true },
      });
      const userIds = [...new Set(tickets.map((t) => t.user_id))];
      const dateStr = new Date(ev.start_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      for (const uid of userIds) {
        try {
          await notificationService.create(uid, {
            type: 'event_reminder_24h',
            title: 'Rappel : demain !',
            message: `"${ev.title}" a lieu demain à ${dateStr}${ev.location ? ` — ${ev.location}` : ''}. À bientôt !`,
            reference_type: 'event',
            reference_id: ev.id,
          });
          sent24++;
        } catch (e) {
          logger.warn('Event reminder 24h skip', { userId: uid, eventId: ev.id });
        }
      }
    }

    for (const ev of events1h) {
      const tickets = await prisma.eventTicket.findMany({
        where: { event_id: ev.id, payment_status: 'paid' },
        select: { user_id: true },
      });
      const userIds = [...new Set(tickets.map((t) => t.user_id))];
      const dateStr = new Date(ev.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      for (const uid of userIds) {
        try {
          await notificationService.create(uid, {
            type: 'event_reminder_1h',
            title: 'C\'est dans 1 heure !',
            message: `"${ev.title}" commence à ${dateStr}${ev.location ? ` — ${ev.location}` : ''}. Préparez-vous !`,
            reference_type: 'event',
            reference_id: ev.id,
          });
          sent1h++;
        } catch (e) {
          logger.warn('Event reminder 1h skip', { userId: uid, eventId: ev.id });
        }
      }
    }

    logger.info('Event reminders sent', { reminders_24h: sent24, reminders_1h: sent1h });
    return { reminders_24h: sent24, reminders_1h: sent1h };
  }

  /** Mise en avant payante : initier le paiement (organisateur uniquement) */
  async payForFeature(eventId: string, userId: string, data: { phone?: string }) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizer_id: userId },
    });
    if (!event) throw new Error('Événement non trouvé ou non autorisé');
    const now = new Date();
    if (event.featured_until && new Date(event.featured_until) > now) {
      throw new Error(`Mise en avant active jusqu'au ${new Date(event.featured_until).toLocaleDateString('fr-FR')}`);
    }

    const fp = await prisma.eventFeaturedPayment.create({
      data: {
        event_id: eventId,
        user_id: userId,
        amount: FEATURED_EVENT_PRICE,
        currency: 'XOF',
        provider: 'orange_money',
        status: 'pending',
      },
    });

    const baseUrl = process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:5173';
    const returnUrl = `${baseUrl}/events/dashboard?id=${eventId}&feature=success&featurePaymentId=${fp.id}`;
    const paymentResult = await paymentService.initiateOrangeMoneyPayment(userId, fp.id, {
      amount: FEATURED_EVENT_PRICE,
      phone: data.phone || '',
      returnUrl,
    });

    logger.info('Event feature payment initiated', { eventId, featurePaymentId: fp.id });
    return {
      feature_payment_id: fp.id,
      amount: FEATURED_EVENT_PRICE,
      payment_url: paymentResult.paymentUrl,
      message: 'Redirigez vers payment_url pour payer la mise en avant.',
    };
  }

  /** Confirmer le paiement mise en avant (callback après paiement) */
  async confirmFeaturePayment(featurePaymentId: string, transactionId?: string) {
    const fp = await prisma.eventFeaturedPayment.findUnique({
      where: { id: featurePaymentId },
      include: { event: true },
    });
    if (!fp || fp.status === 'completed') throw new Error('Paiement non trouvé ou déjà traité');

    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + FEATURED_EVENT_DAYS);

    await prisma.$transaction([
      prisma.eventFeaturedPayment.update({
        where: { id: featurePaymentId },
        data: { status: 'completed', paid_at: new Date(), featured_until: featuredUntil },
      }),
      prisma.event.update({
        where: { id: fp.event_id },
        data: { is_featured: true, featured_until: featuredUntil },
      }),
    ]);

    logger.info('Event feature payment confirmed', { eventId: fp.event_id, featurePaymentId });
    return { success: true, featured_until: featuredUntil };
  }

  /** Analytics : par ville, par jour, par source (organisateur) */
  async getAnalytics(eventId: string, organizerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizer_id: organizerId },
    });
    if (!event) throw new Error('Événement non trouvé ou non autorisé');

    const tickets = await prisma.eventTicket.findMany({
      where: { event_id: eventId, payment_status: 'paid' },
      select: { city: true, source: true, created_at: true },
    });

    const byCity: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const t of tickets) {
      const city = (t.city || 'Non renseigné').trim();
      byCity[city] = (byCity[city] || 0) + 1;
      const src = (t.source || 'direct').trim();
      bySource[src] = (bySource[src] || 0) + 1;
      const day = new Date(t.created_at).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return {
      by_city: Object.entries(byCity).map(([city, count]) => ({ city, count })),
      by_source: Object.entries(bySource).map(([source, count]) => ({ source, count })),
      by_day: Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /** Liste des amis (follow/following) inscrits à l'événement */
  async getFriendsAttending(eventId: string, userId: string) {
    const ticketHolderIds = await prisma.eventTicket.findMany({
      where: { event_id: eventId, payment_status: 'paid' },
      select: { user_id: true },
    }).then((t) => [...new Set(t.map((x) => x.user_id))]);

    const [following, followers] = await Promise.all([
      prisma.follow.findMany({ where: { follower_id: userId }, select: { following_id: true } }),
      prisma.follow.findMany({ where: { following_id: userId }, select: { follower_id: true } }),
    ]);
    const friendIds = new Set([
      ...following.map((f) => f.following_id),
      ...followers.map((f) => f.follower_id),
    ]);
    const attendingFriendIds = ticketHolderIds.filter((id) => friendIds.has(id) && id !== userId);

    if (attendingFriendIds.length === 0) return { friends: [] };

    const users = await prisma.user.findMany({
      where: { id: { in: attendingFriendIds } },
      select: { id: true, username: true, full_name: true, profile_image: true },
    });
    return { friends: users };
  }

  /** Chat : liste des messages (inscrits uniquement, pendant la plage événement -1h / +fin) */
  async listChatMessages(eventId: string, userId: string, page = 1, limit = 50) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Événement non trouvé');

    const hasTicket = await prisma.eventTicket.findFirst({
      where: { event_id: eventId, user_id: userId, payment_status: 'paid' },
    });
    if (!hasTicket) throw new Error('Réservation requise pour accéder au chat');

    const now = new Date();
    const windowStart = new Date(event.start_date.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(event.end_date);
    if (now < windowStart) throw new Error('Le chat ouvre 1 heure avant le début de l\'événement');
    if (now > windowEnd) throw new Error('Le chat est fermé après la fin de l\'événement');

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      prisma.eventChatMessage.findMany({
        where: { event_id: eventId },
        include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
      }),
      prisma.eventChatMessage.count({ where: { event_id: eventId } }),
    ]);
    return {
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Chat : envoyer un message (mêmes conditions d'accès) */
  async addChatMessage(eventId: string, userId: string, content: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Événement non trouvé');

    const hasTicket = await prisma.eventTicket.findFirst({
      where: { event_id: eventId, user_id: userId, payment_status: 'paid' },
    });
    if (!hasTicket) throw new Error('Réservation requise pour participer au chat');

    const now = new Date();
    const windowStart = new Date(event.start_date.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(event.end_date);
    if (now < windowStart) throw new Error('Le chat ouvre 1 heure avant le début');
    if (now > windowEnd) throw new Error('Le chat est fermé');

    const trimmed = (content || '').trim().slice(0, 2000);
    if (!trimmed) throw new Error('Message vide');

    return prisma.eventChatMessage.create({
      data: { event_id: eventId, user_id: userId, content: trimmed },
      include: { user: { select: { id: true, username: true, full_name: true, profile_image: true } } },
    });
  }
}

export default new EventService();

