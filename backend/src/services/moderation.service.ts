import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class ModerationService {
  async listReports(page: number = 1, limit: number = 20, filters?: {
    status?: string;
    severity?: string;
    contentType?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.contentType) where.content_type = filters.contentType;

    const [reports, total] = await Promise.all([
      prisma.moderation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.moderation.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createReport(reporterId: string, data: {
    contentType: string;
    contentId: string;
    reason: string;
    description?: string;
    evidence?: string[];
    severity?: string;
  }) {
    const report = await prisma.moderation.create({
      data: {
        content_type: data.contentType,
        content_id: data.contentId,
        reason: data.reason,
        description: data.description,
        evidence: data.evidence || [],
        severity: data.severity || 'low',
        reporter_id: reporterId,
        status: 'pending',
      },
    });

    logger.info('Moderation report created', { reporterId, reportId: report.id });
    return report;
  }

  async reviewReport(reportId: string, reviewerId: string, decision: {
    status: string;
    notes?: string;
  }) {
    const existing = await prisma.moderation.findUnique({ where: { id: reportId } });
    if (!existing) throw new Error('Report not found');
    const report = await prisma.moderation.update({
      where: { id: reportId },
      data: {
        status: decision.status,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        description: decision.notes ? `${existing.description ?? ''}\n\nReview: ${decision.notes}` : existing.description,
      },
    });

    logger.info('Report reviewed', { reportId, reviewerId, status: decision.status });
    return report;
  }
}

export default new ModerationService();

