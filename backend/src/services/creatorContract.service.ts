/**
 * CPO 7.19 — Contrats et droits musicaux (créateur)
 */
import prisma from '../config/database.js';

export async function list(creatorId: string) {
  return prisma.creatorContract.findMany({
    where: { creator_id: creatorId },
    orderBy: { created_at: 'desc' },
  });
}

export async function create(creatorId: string, data: {
  type: string;
  provider?: string;
  reference?: string;
  start_at?: Date;
  end_at?: Date;
  notes?: string;
  attachment_url?: string;
}) {
  if (!data.type?.trim()) {
    const err: any = new Error('Type de contrat requis');
    err.statusCode = 400;
    throw err;
  }
  return prisma.creatorContract.create({
    data: {
      creator_id: creatorId,
      type: data.type.trim(),
      provider: data.provider?.trim() || null,
      reference: data.reference?.trim() || null,
      start_at: data.start_at || null,
      end_at: data.end_at || null,
      notes: data.notes?.trim() || null,
      attachment_url: data.attachment_url?.trim() || null,
    },
  });
}

export async function update(contractId: string, creatorId: string, data: Partial<{
  type: string;
  provider: string;
  reference: string;
  start_at: Date;
  end_at: Date;
  notes: string;
  attachment_url: string;
}>) {
  const c = await prisma.creatorContract.findFirst({ where: { id: contractId, creator_id: creatorId } });
  if (!c) {
    const err: any = new Error('Contrat introuvable');
    err.statusCode = 404;
    throw err;
  }
  const updateData: any = {};
  if (data.type !== undefined) updateData.type = data.type.trim();
  if (data.provider !== undefined) updateData.provider = data.provider?.trim() || null;
  if (data.reference !== undefined) updateData.reference = data.reference?.trim() || null;
  if (data.start_at !== undefined) updateData.start_at = data.start_at;
  if (data.end_at !== undefined) updateData.end_at = data.end_at;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.attachment_url !== undefined) updateData.attachment_url = data.attachment_url?.trim() || null;
  updateData.updated_at = new Date();
  return prisma.creatorContract.update({
    where: { id: contractId },
    data: updateData,
  });
}

export async function remove(contractId: string, creatorId: string) {
  const c = await prisma.creatorContract.findFirst({ where: { id: contractId, creator_id: creatorId } });
  if (!c) {
    const err: any = new Error('Contrat introuvable');
    err.statusCode = 404;
    throw err;
  }
  await prisma.creatorContract.delete({ where: { id: contractId } });
  return { success: true };
}
