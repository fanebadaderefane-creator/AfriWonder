import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';

export type AdminActionType =
  | 'ban_user'
  | 'unban_user'
  | 'update_user_role'
  | 'resolve_dispute'
  | 'export_data'
  | 'change_commission'
  | 'freeze_wallet'
  | 'unfreeze_wallet'
  | 'refund_transaction'
  | 'cancel_transaction'
  | 'kill_switch'
  | 'maintenance_mode'
  | 'update_seller_status'
  | 'update_product_status'
  | 'broadcast_send'
  | 'verification_approve'
  | 'verification_reject'
  | 'shadow_ban'
  | 'escalate_to_super_admin';

export interface CreateAdminLogParams {
  admin_id: string;
  action_type: AdminActionType | string;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

class AdminAuditService {
  async log(params: CreateAdminLogParams) {
    return prisma.adminLog.create({
      data: {
        admin_id: params.admin_id,
        action_type: params.action_type,
        target_type: params.target_type ?? null,
        target_id: params.target_id ?? null,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
        ip_address: params.ip_address ?? null,
        user_agent: params.user_agent ?? null,
      },
    });
  }

  async list(params: { page?: number; limit?: number; admin_id?: string; action_type?: string; from?: string; to?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.admin_id) where.admin_id = params.admin_id;
    if (params.action_type) where.action_type = params.action_type;
    if (params.from || params.to) {
      where.created_at = {};
      if (params.from) (where.created_at as Record<string, Date>).gte = new Date(params.from);
      if (params.to) (where.created_at as Record<string, Date>).lte = new Date(params.to);
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.adminLog.count({ where }),
    ]);

    return {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default new AdminAuditService();
