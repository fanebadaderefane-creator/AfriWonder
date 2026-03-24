import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class SupportTicketService {
  async create(userId: string, subject: string, initialMessage?: string) {
    const ticket = await prisma.supportTicket.create({
      data: {
        user_id: userId,
        subject,
        status: 'open',
      },
    });
    if (initialMessage && initialMessage.trim()) {
      await prisma.supportMessage.create({
        data: {
          ticket_id: ticket.id,
          user_id: userId,
          message: initialMessage.trim(),
          is_staff: false,
        },
      });
    }
    logger.info('Ticket support créé', { ticketId: ticket.id, userId });
    return this.getById(ticket.id, userId, false);
  }

  async listByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: { user_id: userId },
        orderBy: { updated_at: 'desc' },
        skip,
        take: limit,
        include: {
          messages: { orderBy: { created_at: 'asc' }, take: 1 },
        },
      }),
      prisma.supportTicket.count({ where: { user_id: userId } }),
    ]);
    return {
      tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(ticketId: string, userId: string, isAdmin = false) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: { id: true, username: true, full_name: true, profile_image: true } },
          },
        },
        user: { select: { id: true, username: true, full_name: true, email: true } },
      },
    });
    if (!ticket) {
      const err: any = new Error('Ticket non trouvé');
      err.statusCode = 404;
      throw err;
    }
    if (!isAdmin && ticket.user_id !== userId) {
      const err: any = new Error('Non autorisé');
      err.statusCode = 403;
      throw err;
    }
    return ticket;
  }

  async addMessage(ticketId: string, userId: string, message: string, isStaff = false) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      const err: any = new Error('Ticket non trouvé');
      err.statusCode = 404;
      throw err;
    }
    if (!isStaff && ticket.user_id !== userId) {
      const err: any = new Error('Non autorisé');
      err.statusCode = 403;
      throw err;
    }
    const msg = await prisma.supportMessage.create({
      data: {
        ticket_id: ticketId,
        user_id: userId,
        message: message.trim(),
        is_staff: isStaff,
      },
      include: {
        user: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updated_at: new Date(), status: isStaff ? 'in_progress' : ticket.status },
    });
    return msg;
  }

  async updateStatus(ticketId: string, status: string) {
    const valid = ['open', 'in_progress', 'resolved', 'closed'];
    if (!valid.includes(status)) {
      const err: any = new Error('Statut invalide');
      err.statusCode = 400;
      throw err;
    }
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }

  async listAll(page: number = 1, limit: number = 20, status?: string, category?: string) {
    const skip = (page - 1) * limit;
    const normalizedCategory = String(category || '').trim().toLowerCase();
    const where: any = {};
    if (status) where.status = status;
    if (normalizedCategory === 'e2ee_diagnostic') {
      where.subject = { contains: 'Diagnostic E2EE', mode: 'insensitive' };
    }
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    return { tickets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}

export default new SupportTicketService();
